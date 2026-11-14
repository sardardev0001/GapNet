from pathlib import Path
from django.contrib.auth.password_validation import validate_password
from django.core.cache import cache
from rest_framework import serializers
from .models import User, Message, Conversation

ALLOWED_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.webp', '.gif', '.pdf', '.txt', '.zip'}
MAX_ATTACHMENT = 10 * 1024 * 1024

class UserSerializer(serializers.ModelSerializer):
    online = serializers.SerializerMethodField()
    class Meta:
        model = User
        fields = ['id', 'username', 'display_name', 'bio', 'avatar_url', 'online', 'last_seen']
    def get_online(self, obj):
        return bool(cache.get(f'presence:{obj.pk}'))

class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'display_name', 'bio', 'avatar_url']
        read_only_fields = ['id', 'username']

class RegisterSerializer(serializers.Serializer):
    username = serializers.RegexField(regex=r'^[a-zA-Z0-9_]{3,30}$', max_length=30)
    display_name = serializers.CharField(max_length=80)
    password = serializers.CharField(write_only=True, trim_whitespace=False)
    password_confirm = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate_username(self, username):
        username = username.lower()
        if User.objects.filter(username__iexact=username).exists():
            raise serializers.ValidationError('این آیدی قبلاً ثبت شده است.')
        return username

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({'password_confirm': 'رمزهای عبور یکسان نیستند.'})
        prospective = User(username=attrs['username'], display_name=attrs['display_name'])
        validate_password(attrs['password'], user=prospective)
        return attrs

    def create(self, validated):
        validated.pop('password_confirm')
        return User.objects.create_user(**validated)

class MessageSerializer(serializers.ModelSerializer):
    sender = UserSerializer(read_only=True)
    attachment_url = serializers.SerializerMethodField()
    attachment = serializers.FileField(write_only=True, required=False, allow_empty_file=False)
    client_nonce = serializers.UUIDField(required=False, allow_null=True)
    class Meta:
        model = Message
        fields = ['id', 'sender', 'text', 'attachment', 'attachment_name', 'attachment_url',
                  'client_nonce', 'created_at', 'edited_at', 'deleted_at']
        read_only_fields = ['id', 'attachment_name', 'created_at', 'edited_at', 'deleted_at']

    def get_attachment_url(self, obj):
        return f'/api/messages/{obj.id}/attachment/' if obj.attachment and not obj.deleted_at else None

    def validate_attachment(self, attachment):
        if attachment.size > MAX_ATTACHMENT:
            raise serializers.ValidationError('حداکثر حجم فایل ۱۰ مگابایت است.')
        if Path(attachment.name).suffix.lower() not in ALLOWED_EXTENSIONS:
            raise serializers.ValidationError('فرمت فایل مجاز نیست.')
        return attachment

    def validate(self, attrs):
        text = attrs.get('text', '')
        if not text.strip() and not attrs.get('attachment'):
            raise serializers.ValidationError('پیام نمی‌تواند خالی باشد.')
        return attrs

    def create(self, validated):
        attachment = validated.get('attachment')
        if attachment:
            validated['attachment_name'] = Path(attachment.name).name[:220]
        return super().create(validated)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if instance.deleted_at:
            data['text'] = ''
            data['attachment_name'] = ''
            data['attachment_url'] = None
        return data

class ConversationSerializer(serializers.ModelSerializer):
    participants = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    read_states = serializers.SerializerMethodField()
    display_title = serializers.SerializerMethodField()
    class Meta:
        model = Conversation
        fields = ['id', 'kind', 'title', 'display_title', 'participants', 'last_message',
                  'unread_count', 'read_states', 'created_at', 'updated_at']

    def get_participants(self, obj):
        return UserSerializer(obj.members.all(), many=True).data

    def get_read_states(self, obj):
        return [{'user_id': m.user_id, 'last_read_at': m.last_read_at} for m in obj.memberships.all()]

    def get_display_title(self, obj):
        if obj.kind == 'group':
            return obj.title or 'گروه بدون نام'
        request = self.context.get('request')
        other = next((user for user in obj.members.all()
                      if request and user.pk != request.user.pk), None)
        return other.display_name or other.username if other else 'گفتگوی خصوصی'

    def get_last_message(self, obj):
        msg = obj.messages.order_by('-created_at').first()
        return MessageSerializer(msg).data if msg else None

    def get_unread_count(self, obj):
        request = self.context.get('request')
        if not request:
            return 0
        membership = obj.memberships.filter(user=request.user).first()
        if not membership:
            return 0
        qs = obj.messages.filter(deleted_at__isnull=True).exclude(sender=request.user)
        if membership.last_read_at:
            qs = qs.filter(created_at__gt=membership.last_read_at)
        return qs.count()
