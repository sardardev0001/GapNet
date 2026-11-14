import uuid
from django.contrib.auth import authenticate
from django.core.cache import cache
from django.core.signing import TimestampSigner
from django.db import IntegrityError, transaction
from django.db.models import Q
from django.http import FileResponse, Http404, JsonResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, parser_classes, throttle_classes
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from .models import User, Conversation, Membership, Message
from .serializers import RegisterSerializer, UserSerializer, ProfileSerializer, ConversationSerializer, MessageSerializer


def health(request):
    return JsonResponse({'status': 'ok', 'service': 'gapnet'})


def tokens_for(user):
    refresh = RefreshToken.for_user(user)
    return {'access': str(refresh.access_token), 'refresh': str(refresh), 'user': UserSerializer(user).data}


def broadcast(group, event):
    """Send after commit so consumers never request an uncommitted record."""
    layer = get_channel_layer()
    if layer:
        transaction.on_commit(lambda: async_to_sync(layer.group_send)(group, {'type': 'chat.event', 'payload': event}))


@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    serializer = RegisterSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    try:
        with transaction.atomic():
            user = serializer.save()
    except IntegrityError:
        raise ValidationError({'username': 'این آیدی قبلاً ثبت شده است.'})
    return Response(tokens_for(user), status=201)


@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    username = str(request.data.get('username', '')).strip().lower().removeprefix('@')
    user = authenticate(request, username=username, password=request.data.get('password', ''))
    if not user:
        return Response({'detail': 'آیدی یا رمز عبور اشتباه است.'}, status=401)
    return Response(tokens_for(user))


@api_view(['GET', 'PATCH'])
def profile(request):
    if request.method == 'GET':
        return Response(UserSerializer(request.user).data)
    s = ProfileSerializer(request.user, data=request.data, partial=True)
    s.is_valid(raise_exception=True)
    s.save()
    return Response(UserSerializer(request.user).data)


@api_view(['GET'])
def users(request):
    q = str(request.query_params.get('q', '')).strip().removeprefix('@')[:80]
    if not q:
        return Response([])
    qs = User.objects.filter(Q(username__icontains=q) | Q(display_name__icontains=q)).exclude(
        pk=request.user.pk).order_by('username')[:30]
    return Response(UserSerializer(qs, many=True).data)


@api_view(['GET', 'POST'])
def conversations(request):
    if request.method == 'GET':
        qs = Conversation.objects.filter(members=request.user).prefetch_related('members', 'memberships').distinct()
        return Response(ConversationSerializer(qs, many=True, context={'request': request}).data)

    kind = request.data.get('kind', 'direct')
    if kind not in ('direct', 'group'):
        raise ValidationError({'kind': 'نوع گفتگو معتبر نیست.'})
    if kind == 'direct':
        handle = str(request.data.get('username', '')).strip().lower().removeprefix('@')
        other = get_object_or_404(User, username=handle)
        if other.pk == request.user.pk:
            raise ValidationError({'username': 'نمی‌توانید با خودتان گفتگو بسازید.'})
        pair_key = '-'.join(map(str, sorted((request.user.pk, other.pk))))
        # Unique database constraint is the concurrency guard.
        try:
            with transaction.atomic():
                obj, created = Conversation.objects.get_or_create(pair_key=pair_key, defaults={
                    'kind': 'direct', 'created_by': request.user})
                if created:
                    Membership.objects.bulk_create([Membership(conversation=obj, user=request.user),
                                                    Membership(conversation=obj, user=other)])
                    for user in (request.user, other):
                        broadcast(f'user_{user.pk}', {'type': 'conversation.created', 'id': str(obj.id)})
        except IntegrityError:
            obj = Conversation.objects.get(pair_key=pair_key)
            created = False
    else:
        title = str(request.data.get('title', '')).strip()
        members = request.data.get('member_ids', [])
        if not title or len(title) > 100:
            raise ValidationError({'title': 'نام گروه الزامی و حداکثر ۱۰۰ کاراکتر است.'})
        if not isinstance(members, list) or len(members) > 99:
            raise ValidationError({'member_ids': 'فهرست اعضا معتبر نیست.'})
        try:
            ids = {int(x) for x in members}
        except (ValueError, TypeError):
            raise ValidationError({'member_ids': 'شناسه اعضا معتبر نیست.'})
        ids.discard(request.user.pk)
        if not ids:
            raise ValidationError({'member_ids': 'حداقل یک عضو دیگر انتخاب کنید.'})
        if User.objects.filter(pk__in=ids).count() != len(ids):
            raise ValidationError({'member_ids': 'برخی کاربران پیدا نشدند.'})
        with transaction.atomic():
            obj = Conversation.objects.create(kind='group', title=title, created_by=request.user)
            all_ids = ids | {request.user.pk}
            Membership.objects.bulk_create([Membership(conversation=obj, user_id=id_) for id_ in all_ids])
            for id_ in all_ids:
                broadcast(f'user_{id_}', {'type': 'conversation.created', 'id': str(obj.id)})
        created = True
    return Response(ConversationSerializer(obj, context={'request': request}).data,
                    status=201 if created else 200)


def member_conversation(user, conversation_id):
    return get_object_or_404(Conversation.objects.filter(members=user), pk=conversation_id)


@api_view(['GET', 'PATCH'])
def conversation_detail(request, conversation_id):
    obj = member_conversation(request.user, conversation_id)
    if request.method == 'PATCH':
        if obj.kind != 'group' or obj.created_by_id != request.user.pk:
            return Response({'detail': 'اجازه تغییر گروه را ندارید.'}, status=403)
        name = str(request.data.get('title', '')).strip()
        if not name or len(name) > 100:
            raise ValidationError({'title': 'نام گروه معتبر نیست.'})
        obj.title = name
        obj.save(update_fields=['title', 'updated_at'])
        broadcast(f'chat_{obj.id}', {'type': 'conversation.updated', 'id': str(obj.id), 'title': name})
    return Response(ConversationSerializer(obj, context={'request': request}).data)


@api_view(['GET', 'POST'])
@parser_classes([JSONParser, MultiPartParser, FormParser])
def messages(request, conversation_id):
    conv = member_conversation(request.user, conversation_id)
    if request.method == 'GET':
        qs = Message.objects.filter(conversation=conv).select_related('sender').order_by('-created_at', '-id')
        before = request.query_params.get('before')
        if before:
            try:
                ref = Message.objects.get(pk=before, conversation=conv)
            except (Message.DoesNotExist, ValueError):
                raise ValidationError({'before': 'نشانگر صفحه معتبر نیست.'})
            qs = qs.filter(Q(created_at__lt=ref.created_at) |
                           Q(created_at=ref.created_at, id__lt=ref.id))
        records = list(qs[:51])
        has_more = len(records) > 50
        records = records[:50]
        return Response({'items': MessageSerializer(reversed(records), many=True).data,
                         'has_more': has_more, 'next_cursor': str(records[-1].id) if has_more else None})

    nonce = request.data.get('client_nonce')
    if nonce:
        try:
            nonce = str(uuid.UUID(str(nonce)))
        except (TypeError, ValueError, AttributeError):
            raise ValidationError({'client_nonce': 'شناسه درخواست معتبر نیست.'})
        existing = Message.objects.filter(sender=request.user, client_nonce=nonce).first()
        if existing:
            if existing.conversation_id != conv.id:
                raise ValidationError({'client_nonce': 'شناسه درخواست تکراری است.'})
            return Response(MessageSerializer(existing).data, status=200)
    serializer = MessageSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    with transaction.atomic():
        try:
            msg = serializer.save(conversation=conv, sender=request.user)
        except IntegrityError:
            if not nonce:
                raise
            msg = Message.objects.get(sender=request.user, client_nonce=nonce, conversation=conv)
            return Response(MessageSerializer(msg).data)
        conv.save(update_fields=['updated_at'])
        payload = MessageSerializer(msg).data
        broadcast(f'chat_{conv.id}', {'type': 'message.created', 'conversation_id': str(conv.id), 'message': payload})
    return Response(payload, status=201)


@api_view(['PATCH', 'DELETE'])
def message_detail(request, message_id):
    msg = get_object_or_404(Message, pk=message_id, conversation__members=request.user)
    if msg.sender_id != request.user.pk:
        return Response({'detail': 'فقط فرستنده می‌تواند پیام را ویرایش کند.'}, status=403)
    if msg.deleted_at:
        return Response({'detail': 'این پیام حذف شده است.'}, status=409)
    if request.method == 'PATCH':
        if msg.attachment:
            return Response({'detail': 'ویرایش پیام دارای فایل مجاز نیست.'}, status=400)
        text = str(request.data.get('text', '')).strip()
        if not text or len(text) > 4000:
            raise ValidationError({'text': 'متن پیام باید بین ۱ تا ۴۰۰۰ کاراکتر باشد.'})
        msg.text, msg.edited_at = text, timezone.now()
        msg.save(update_fields=['text', 'edited_at'])
    else:
        msg.deleted_at = timezone.now()
        msg.save(update_fields=['deleted_at'])
    payload = MessageSerializer(msg).data
    broadcast(f'chat_{msg.conversation_id}', {'type': 'message.updated',
            'conversation_id': str(msg.conversation_id), 'message': payload})
    return Response(payload)


@api_view(['GET'])
def download_attachment(request, message_id):
    msg = get_object_or_404(Message, pk=message_id, conversation__members=request.user)
    if not msg.attachment or msg.deleted_at:
        raise Http404
    try:
        handle = msg.attachment.open('rb')
    except FileNotFoundError:
        raise Http404
    response = FileResponse(handle, as_attachment=True, filename=msg.attachment_name)
    response['Cache-Control'] = 'private, no-store'
    response['X-Content-Type-Options'] = 'nosniff'
    return response


@api_view(['POST'])
def mark_read(request, conversation_id):
    conv = member_conversation(request.user, conversation_id)
    Membership.objects.filter(conversation=conv, user=request.user).update(last_read_at=timezone.now())
    broadcast(f'chat_{conv.id}', {'type': 'conversation.read', 'conversation_id': str(conv.id),
                                   'user_id': request.user.pk})
    return Response({'ok': True})


@api_view(['POST'])
def websocket_ticket(request):
    # Short-lived, signed one-minute ticket instead of JWT in the websocket URL.
    ticket = TimestampSigner(salt='gapnet-websocket').sign(str(request.user.pk))
    return Response({'ticket': ticket, 'expires_in': 60})
