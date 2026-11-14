from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

urlpatterns = [
    path('auth/register/', views.register),
    path('auth/login/', views.login),
    path('auth/refresh/', TokenRefreshView.as_view()),
    path('me/', views.profile),
    path('users/', views.users),
    path('conversations/', views.conversations),
    path('conversations/<uuid:conversation_id>/', views.conversation_detail),
    path('conversations/<uuid:conversation_id>/messages/', views.messages),
    path('conversations/<uuid:conversation_id>/read/', views.mark_read),
    path('messages/<uuid:message_id>/', views.message_detail),
    path('messages/<uuid:message_id>/attachment/', views.download_attachment),
    path('ws-ticket/', views.websocket_ticket),
]
