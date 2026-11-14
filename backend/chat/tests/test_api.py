import uuid
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken
from chat.models import Conversation, Membership, Message

User = get_user_model()

class GapNetAPITests(TestCase):
    def setUp(self):
        self.a = User.objects.create_user(username='amir_1', display_name='امیر', password='SafePass@123456')
        self.b = User.objects.create_user(username='sara_2', display_name='سارا', password='SafePass@123456')
        self.c = User.objects.create_user(username='reza_3', display_name='رضا', password='SafePass@123456')
        self.client = APIClient()
        self.auth(self.a)

    def auth(self, user):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {AccessToken.for_user(user)}')

    def make_thread(self):
        response = self.client.post('/api/conversations/', {'username': 'sara_2'}, format='json')
        self.assertEqual(response.status_code, 201, response.data)
        return response.data['id']

    def test_registration_normalizes_handle(self):
        self.client.credentials()
        r = self.client.post('/api/auth/register/', {'username': 'FOO_123', 'display_name': 'Foo',
            'password': 'SecurePass@98345', 'password_confirm': 'SecurePass@98345'}, format='json')
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(r.data['user']['username'], 'foo_123')
        self.assertTrue(r.data['access'])

    def test_registration_duplicate_case_insensitive(self):
        self.client.credentials()
        r = self.client.post('/api/auth/register/', {'username': 'AMIR_1', 'display_name': 'new',
            'password': 'SecurePass@98345', 'password_confirm': 'SecurePass@98345'}, format='json')
        self.assertEqual(r.status_code, 400)

    def test_login_success_and_failure(self):
        self.client.credentials()
        okay = self.client.post('/api/auth/login/', {'username': '@AMIR_1', 'password': 'SafePass@123456'})
        bad = self.client.post('/api/auth/login/', {'username': 'amir_1', 'password': 'wrong'})
        self.assertEqual(okay.status_code, 200)
        self.assertEqual(bad.status_code, 401)

    def test_search_excludes_self(self):
        r = self.client.get('/api/users/?q=a')
        self.assertEqual(r.status_code, 200)
        self.assertNotIn('amir_1', [x['username'] for x in r.data])

    def test_private_chat_is_idempotent(self):
        id_ = self.make_thread()
        again = self.client.post('/api/conversations/', {'username': 'sara_2'}, format='json')
        self.assertEqual(again.status_code, 200)
        self.assertEqual(again.data['id'], id_)
        self.auth(self.b)
        reverse = self.client.post('/api/conversations/', {'username': 'amir_1'}, format='json')
        self.assertEqual(reverse.data['id'], id_)
        self.assertEqual(Conversation.objects.filter(kind='direct').count(), 1)

    def test_message_post_201_and_message_history(self):
        id_ = self.make_thread()
        sent = self.client.post(f'/api/conversations/{id_}/messages/', {'text': 'سلام سارا!'}, format='json')
        self.assertEqual(sent.status_code, 201, sent.data)
        self.assertEqual(sent.data['sender']['username'], 'amir_1')
        history = self.client.get(f'/api/conversations/{id_}/messages/')
        self.assertEqual(history.data['items'][0]['text'], 'سلام سارا!')

    def test_message_nonce_prevents_duplicate(self):
        id_ = self.make_thread()
        nonce = str(uuid.uuid4())
        path = f'/api/conversations/{id_}/messages/'
        first = self.client.post(path, {'text': 'test', 'client_nonce': nonce}, format='json')
        again = self.client.post(path, {'text': 'test', 'client_nonce': nonce}, format='json')
        self.assertEqual(first.status_code, 201)
        self.assertEqual(again.status_code, 200)
        self.assertEqual(Message.objects.count(), 1)

    def test_uninvited_user_cannot_read_or_post(self):
        id_ = self.make_thread()
        self.auth(self.c)
        self.assertEqual(self.client.get(f'/api/conversations/{id_}/messages/').status_code, 404)
        self.assertEqual(self.client.post(f'/api/conversations/{id_}/messages/', {'text': 'x'}).status_code, 404)

    def test_group_creation_membership_and_title(self):
        group = self.client.post('/api/conversations/', {'kind': 'group', 'title': 'پروژه',
            'member_ids': [self.b.id, self.c.id]}, format='json')
        self.assertEqual(group.status_code, 201, group.data)
        self.assertEqual(len(group.data['participants']), 3)
        self.auth(self.b)
        self.assertEqual(self.client.patch(f"/api/conversations/{group.data['id']}/", {'title': 'test'}).status_code, 403)

    def test_read_receipt_clears_unread(self):
        id_ = self.make_thread()
        self.client.post(f'/api/conversations/{id_}/messages/', {'text': 'hi'})
        self.auth(self.b)
        listing = self.client.get('/api/conversations/')
        self.assertEqual(listing.data[0]['unread_count'], 1)
        self.assertEqual(self.client.post(f'/api/conversations/{id_}/read/').status_code, 200)
        self.assertEqual(self.client.get('/api/conversations/').data[0]['unread_count'], 0)

    def test_unauthorized_cannot_edit(self):
        id_ = self.make_thread()
        sent = self.client.post(f'/api/conversations/{id_}/messages/', {'text': 'hi'})
        self.auth(self.b)
        self.assertEqual(self.client.patch(f"/api/messages/{sent.data['id']}/", {'text': 'evil'}).status_code, 403)

    def test_sender_can_edit_and_soft_delete(self):
        id_ = self.make_thread()
        sent = self.client.post(f'/api/conversations/{id_}/messages/', {'text': 'before'})
        path = f"/api/messages/{sent.data['id']}/"
        self.assertEqual(self.client.patch(path, {'text': 'after'}).data['text'], 'after')
        self.assertEqual(self.client.delete(path).status_code, 200)
        self.assertEqual(self.client.get(f'/api/conversations/{id_}/messages/').data['items'][0]['text'], '')

    def test_ws_ticket_is_authenticated(self):
        self.assertEqual(self.client.post('/api/ws-ticket/').status_code, 200)
        self.client.credentials()
        self.assertEqual(self.client.post('/api/ws-ticket/').status_code, 401)

    def test_empty_message_rejected(self):
        id_ = self.make_thread()
        self.assertEqual(self.client.post(f'/api/conversations/{id_}/messages/', {'text': '  '}).status_code, 400)

    def test_cannot_start_chat_with_self(self):
        self.assertEqual(self.client.post('/api/conversations/', {'username': self.a.username}).status_code, 400)
