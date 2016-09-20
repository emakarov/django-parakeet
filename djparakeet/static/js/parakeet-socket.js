var ReconnectingWebSocket = require('reconnecting-websocket');


// Tiny wrapper to ReconnectingWebsocket
var ParakeetSocket = function(settings){
    var socket = new ReconnectingWebSocket(settings.uri) ; 

    socket.onmessage = function(e) {
        settings.onmessage(e.data);
    }

    socket.onopen = function() {
        settings.onopen();
    }

    this.send = function(x){
        //SENDS JAVASCRIPT OBJECT AS JSON TO SOCKET
        console.log('sending via ws', JSON.stringify(x));
        socket.send(JSON.stringify(x));
    }

    this.close = function(){
      socket.close();
    }

    // Call onopen directly if socket is already open
    if (socket.readyState == WebSocket.OPEN) socket.onopen();
    this.socket = socket;

    return this;
}

module.exports = ParakeetSocket;
