import uuid
from django.contrib.auth.models import AbstractUser
from django.core.validators import RegexValidator
from django.db import models
from django.db.models import Q

handle_validator = RegexValidator(r'^[a-zA-Z0-9_]{3,30}$', 'آیدی باید ۳ تا ۳۰ کاراکتر انگلیسی، عدد یا _ باشد.')

class User(AbstractUser):
    username = models.CharField(max_length=30, unique=True, validators=[handle_validator])
    display_name = models.CharField(max_length=80)
    bio = models.CharField(max_length=160, blank=True)
    avatar_url = models.URLField(blank=True)
    last_seen = models.DateTimeField(null=True, blank=True)

    def save(self, *args, **kwargs):
        self.username = self.username.strip().lower()
        super().save(*args, **kwargs)

    def __str__(self):
        return '@' + self.username

class Conversation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    KIND_CHOICES = [('direct', 'Private'), ('group', 'Group')]
    kind = models.CharField(max_length=6, choices=KIND_CHOICES, default='direct')
    title = models.CharField(max_length=100, blank=True)
    # For direct conversations, sorted user IDs prevent duplicate threads even under concurrency.
    pair_key = models.CharField(max_length=90, null=True, blank=True, unique=True)
    created_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name='created_conversations')
    members = models.ManyToManyField(User, through='Membership', related_name='conversations')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return self.title or f'{self.kind}:{self.id}'

class Membership(models.Model):
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='memberships')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='memberships')
    joined_at = models.DateTimeField(auto_now_add=True)
    last_read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['conversation', 'user'], name='unique_membership')]

class Message(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(User, on_delete=models.PROTECT, related_name='sent_messages')
    text = models.TextField(blank=True, max_length=4000)
    attachment = models.FileField(upload_to='attachments/%Y/%m/', blank=True)
    attachment_name = models.CharField(max_length=220, blank=True)
    client_nonce = models.UUIDField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    edited_at = models.DateTimeField(null=True, blank=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['created_at', 'id']
        constraints = [models.UniqueConstraint(fields=['sender', 'client_nonce'],
                         condition=Q(client_nonce__isnull=False), name='unique_client_nonce')]
        indexes = [models.Index(fields=['conversation', '-created_at'], name='chat_messag_convers_9d9fc3_idx')]
