from channels.routing import route
from djparakeet.consumers import ws_message
from channels import include

channel_routing = [
    include('djparakeet.routing.websocket_routing', path=r'^/chat/')
]
