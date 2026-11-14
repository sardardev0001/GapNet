from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, Conversation, Membership, Message

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (('GapNet', {'fields': ('display_name', 'bio', 'avatar_url', 'last_seen')}),)

admin.site.register(Conversation)
admin.site.register(Membership)
admin.site.register(Message)
