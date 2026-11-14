"""Safe local-only sample data for previewing the approved GapNet layout."""
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.contrib.auth import get_user_model
from chat.models import Conversation, Membership, Message

User = get_user_model()

class Command(BaseCommand):
    help = 'Create demo users and one chat (DEBUG mode only; do not use on a public server).'

    def handle(self, *args, **kwargs):
        if not settings.DEBUG:
            raise CommandError('seed_demo is disabled outside DEBUG mode')
        with transaction.atomic():
            me, _ = User.objects.get_or_create(username='mohammad_demo', defaults={'display_name': 'محمد احمدی'})
            sarah, _ = User.objects.get_or_create(username='hossein_demo', defaults={'display_name': 'حسین'})
            me.set_password('DemoPass@123456'); me.save(update_fields=['password'])
            sarah.set_password('DemoPass@123456'); sarah.save(update_fields=['password'])
            key = '-'.join(map(str, sorted((me.pk, sarah.pk))))
            chat, created = Conversation.objects.get_or_create(pair_key=key, defaults={'kind': 'direct', 'created_by': me})
            Membership.objects.get_or_create(conversation=chat, user=me)
            Membership.objects.get_or_create(conversation=chat, user=sarah)
            if not chat.messages.exists():
                Message.objects.create(conversation=chat, sender=sarah, text='سلام، امروز جلسه رو یادتون نره...')
        self.stdout.write(self.style.SUCCESS('DEMO ONLY: @mohammad_demo / DemoPass@123456'))
