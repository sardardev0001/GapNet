from urllib.parse import parse_qs
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from django.core.signing import TimestampSigner, BadSignature, SignatureExpired
from .models import User

@database_sync_to_async
def resolve_user(ticket):
    try:
        pk = TimestampSigner(salt='gapnet-websocket').unsign(ticket, max_age=60)
        return User.objects.get(pk=pk, is_active=True)
    except (BadSignature, SignatureExpired, User.DoesNotExist, ValueError):
        return AnonymousUser()

class TicketAuthMiddleware:
    def __init__(self, inner):
        self.inner = inner
    async def __call__(self, scope, receive, send):
        scope = dict(scope)
        args = parse_qs(scope.get('query_string', b'').decode('ascii', errors='ignore'))
        ticket = args.get('ticket', [''])[0]
        scope['user'] = await resolve_user(ticket)
        return await self.inner(scope, receive, send)
