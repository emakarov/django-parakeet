from django.conf import settings
from django.conf.urls import url

from .views import index
from .api import urlpatterns as api_patterns

urlpatterns = [
  url(r'', index),
]

urlpatterns = api_patterns + urlpatterns
