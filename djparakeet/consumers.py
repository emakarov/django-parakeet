import json

from django.http import HttpResponse

from channels import Channel, Group
from channels.handler import AsgiHandler
from channels.sessions import channel_session
from channels.auth import http_session_user, channel_session_user, channel_session_user_from_http

from .models import Topic, Message
from .api import TopicResource, MessageResource

DEFAULT_CONNECT_GROUPS = ['topic_change', 'topic_message', 'ping']

def group_add(topics, message):
    [Group(t).add(message.reply_channel) for t in topics]

def channel_send(channel, data):
    channel.send({
        'text': json.dumps(data)
    })

def group_send(kind, data):
    data = {
        'kind': kind,
        'data': data
    }
    channel_send(Group(kind), data)    

@channel_session_user_from_http
def ws_connect(message):
    group_add(DEFAULT_CONNECT_GROUPS, message)
    channel_send(message.reply_channel, {'msg': 'server message'})

@channel_session_user
def ws_disconnect(message):
    # Remove from reader group on clean disconnect
    #Group("").discard(message.reply_channel)
    print('disconnected')

@channel_session_user
def ws_message(message):
    '''Message processing
    message text (json encoded) with following keys:
       topic_id: topic_id
       kind: message_kind
       msg: message
    '''
    # ASGI WebSocket packet-received and send-packet message types
    # both have a "text" key for their textual data.
    data = json.loads(message.content['text'])
    #channel_send(message.reply_channel, data)
    if data['kind'] == 'post':
        msg = Message.objects.create(
            topic_id=data['topic_id'],
            text=data['msg'],
            author=message.user
        )
        tr = MessageResource()
        bundle = tr.build_bundle(obj=msg)
        data_bundle = tr.full_dehydrate(bundle)
        data_json = tr.serialize(None, data_bundle, 'application/json')
        data_to_send = {
           'topic_id': data['topic_id'],
           'message': data_json
        }
        group_send('topic_message', data_to_send)
    elif data['kind'] == 'topic_create':
        print( 'topic_create', data)
        t = Topic.objects.create(
            name=data['msg']['name'],
            is_public=data['msg']['is_public']
        )
        tr = TopicResource()
        bundle = tr.build_bundle(obj=t)
        data_bundle = tr.full_dehydrate(bundle)
        data_json = tr.serialize(None, data_bundle, 'application/json')
        data_to_send = {
            'topic_id': 0,
            'message': data_json
        }
        group_send('topic_change', data_to_send)
    elif data['kind'] == 'ping':
        group_send('ping', message.user.username)
