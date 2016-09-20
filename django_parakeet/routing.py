from channels.routing import route
from channels import include

channel_routing = [
    include('djparakeet.routing.websocket_routing', path=r'^/chat/')
]
