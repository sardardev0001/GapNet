import uuid
from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.core.cache import cache
from django.utils import timezone
from .models import Conversation, Membership, User

@database_sync_to_async
def chat_ids_for(user_id):
    return [str(id_) for id_ in Conversation.objects.filter(members__id=user_id).values_list('id', flat=True)]

@database_sync_to_async
def is_member(user_id, conversation_id):
    return Membership.objects.filter(user_id=user_id, conversation_id=conversation_id).exists()

@database_sync_to_async
def presence(user_id, action):
    """Keep multiple tabs online and renew liveness with a client heartbeat."""
    key = f'presence_count:{user_id}'
    online_key = f'presence:{user_id}'
    if action == 'connect':
        cache.add(key, 0, timeout=180)
        try:
            count = cache.incr(key)
        except ValueError:
            cache.set(key, 1, timeout=180)
            count = 1
        cache.touch(key, timeout=180)
        cache.set(online_key, True, timeout=180)
        return count == 1
    if action == 'heartbeat':
        cache.touch(key, timeout=180)
        cache.set(online_key, True, timeout=180)
        return False
    if action == 'disconnect':
        try:
            count = cache.decr(key)
        except ValueError:
            count = 0
        if count <= 0:
            cache.delete(key)
            cache.delete(online_key)
            User.objects.filter(pk=user_id).update(last_seen=timezone.now())
            return True
        cache.touch(key, timeout=180)
        return False
    return False

class ChatConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        user = self.scope['user']
        if not user.is_authenticated:
            await self.close(code=4401)
            return
        self.user_id = user.pk
        self.chat_ids = set(await chat_ids_for(user.pk))
        await self.channel_layer.group_add(f'user_{user.pk}', self.channel_name)
        for cid in self.chat_ids:
            await self.channel_layer.group_add(f'chat_{cid}', self.channel_name)
        await self.accept()
        first_online = await presence(self.user_id, 'connect')
        await self.send_json({'type': 'connected', 'user_id': self.user_id})
        if first_online:
            for cid in self.chat_ids:
                await self.channel_layer.group_send(f'chat_{cid}', {'type': 'chat.event',
                    'payload': {'type': 'presence', 'user_id': self.user_id, 'online': True}})

    async def disconnect(self, close_code):
        if not hasattr(self, 'user_id'):
            return
        await self.channel_layer.group_discard(f'user_{self.user_id}', self.channel_name)
        for cid in self.chat_ids:
            await self.channel_layer.group_discard(f'chat_{cid}', self.channel_name)
        last_offline = await presence(self.user_id, 'disconnect')
        if last_offline:
            for cid in self.chat_ids:
                await self.channel_layer.group_send(f'chat_{cid}', {'type': 'chat.event',
                    'payload': {'type': 'presence', 'user_id': self.user_id, 'online': False}})

    async def receive_json(self, content, **kwargs):
        if not isinstance(content, dict):
            return
        kind = content.get('type')
        if kind == 'ping':
            await presence(self.user_id, 'heartbeat')
            await self.send_json({'type': 'pong'})
            return
        cid = str(content.get('conversation_id', ''))
        if kind not in ('typing', 'typing.stop'):
            return
        try:
            uuid.UUID(cid)
        except (ValueError, TypeError, AttributeError):
            return
        if not await is_member(self.user_id, cid):
            await self.send_json({'type': 'error', 'detail': 'Not a conversation member'})
            return
        await self.channel_layer.group_send(f'chat_{cid}', {'type': 'chat.event', 'payload': {
            'type': kind, 'conversation_id': cid, 'user_id': self.user_id}})

    async def chat_event(self, event):
        payload = event['payload']
        if payload.get('type') == 'conversation.created':
            cid = payload.get('id')
            if cid and cid not in self.chat_ids and await is_member(self.user_id, cid):
                await self.channel_layer.group_add(f'chat_{cid}', self.channel_name)
                self.chat_ids.add(cid)
        await self.send_json(payload)
