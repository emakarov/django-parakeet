from channels import route
from .consumers import ws_message

websocket_routing = [
    route("websocket.receive", ws_message),
]
