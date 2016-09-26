import sys, inspect
from django.conf.urls import url, include
from django.contrib.auth import get_user_model

from tastypie import fields
from tastypie.resources import ModelResource, ALL, ALL_WITH_RELATIONS
from tastypie.api import Api

from .models import Topic, Message

class AuthorResource(ModelResource):
    class Meta:
        queryset = get_user_model().objects.all()
        resource_name = 'djparakeet/author'

class TopicResource(ModelResource):
    class Meta:
        queryset = Topic.objects.all()
        resource_name = 'djparakeet/topic'

class MessageResource(ModelResource):
    author = fields.ForeignKey(AuthorResource, 'author', full=True)
    topic = fields.ForeignKey(TopicResource, 'topic')
    class Meta:
        queryset = Message.objects.all()
        resource_name = 'djparakeet/message'
        filtering = {
          'author': ALL_WITH_RELATIONS,
          'topic': ALL_WITH_RELATIONS,
          'id': ALL
        }

clsmembers = inspect.getmembers(sys.modules[__name__], lambda member: inspect.isclass(member) and member.__module__ == __name__)
api_v1 = Api(api_name='v1')
resources = []
resources = [c[1]() for c in clsmembers]
[api_v1.register(r) for r in resources]
urlpatterns = [
    url(r'^api/', include(api_v1.urls)),
]
