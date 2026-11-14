from django.contrib import admin
from django.urls import include, path
from chat.views import health

urlpatterns = [
    path('health/', health),
    path('api/', include('chat.urls')),
    path('admin/', admin.site.urls),
]
