var app = {}
app.collections = {}
var Parakeet = require('./parakeet.js')
var $ = require('jquery');
window.jQuery = $;
Handlebars = require('handlebars');
require('bootstrap');

var base_api_url = '/parakeet/api/v1';
var topicurl = base_api_url + '/djparakeet/topic/';
var messageurl = base_api_url + '/djparakeet/message/';

var settings = {}
var PSocket = require('./parakeet-socket.js');

app.socket = PSocket({
    uri: "ws://" + window.location.host + "/chat/?session_key="+window.django.session_key,
    onmessage: function(data) {
        console.log('received from ws clean', data);
        var json_data = JSON.parse(data);
        if (json_data.kind == "topic_message"){
            var m = JSON.parse(json_data.data.message);
            console.log(m);
            console.log(json_data);
            var t = app.collections['topics'].where({id: json_data.data.topic_id})[0];
            t.connectedCollection.addToBottom(m);
           // t.connectedCollection.trigger('postRender');
        }
    },
    onopen: function(data){
        console.log('socket is opened', data);
    } 
});

settings.collections = {
  'topics': {
    model: Parakeet.TopicModel,
    urlRoot: topicurl,
    collection:  Parakeet.Collection,
    views: {
      0: {
        grid: Parakeet.Grid,
        config: {
          cell: Parakeet.Cell,
          cellTemplate: Handlebars.compile( $('#topics_list_item').html() ),
          name: 'topics_list',
          holder: $('#topics_holder')
        }
      },
      1: {
        grid: Parakeet.Grid,
        config: {
          cell: Parakeet.TopicFeedCell,
          cellTemplate: Handlebars.compile( $('#topics_feeds_tabs_item').html() ),
          name: 'topics_feeds_tabs',
          holder: $('#topics_feeds_holder')
        }
      }
    },
    connectedViews: {
      0: {
         grid: Parakeet.ConnectedGrid,
         config: {
           cell: Parakeet.ConnectedCell,
           cellTemplate: Handlebars.compile( $('#message_content').html() ),
           holder_id: Handlebars.compile("#topic-{{id}}-messages"),
           wrapper_id: Handlebars.compile("#topic-{{id}}-messages-wrapper")
         }
      }
    }
  },
  'messages': {
    model: Parakeet.Model,
    urlRoot: messageurl,
    collection:  Parakeet.Collection
  }
}

for (var i in settings.collections) {
    var cs = settings.collections[i];
    var collection = new (cs.collection.extend({
        urlRoot: cs.urlRoot,
        model: cs.model,
        connectedViews: cs.connectedViews
    }))();
    app.collections[i] = collection;
    app.collections[i].views = {};
    for (let v in cs.views) {
        app.collections[i].views[v] = new cs.views[v].grid(collection, cs.views[v].config)
    }
}

app.collections['topics'].listenTo(app.collections['topics'], 'fetch_completed', function() {
    $("#topics_holder").find('li:first>a').trigger('click');
})


for (let i in app.collections){
    app.collections[i].fetch();
}

app.checkinputtext = function (elem, e, topic_id){
  if(e.keyCode == 13){
    var val = $(elem).val();
    var data = {
       topic_id: topic_id,
       kind: 'post',
       msg: val
    }
    app.socket.send(data);
  }
}

app.changetab = function(e) {
  $(e).tab('show');
}

$(document).ready( function() {
  $("#add_channel_button").on('click', function() {
    $("#add_channel_modal").modal();
  });
});

app.settings = settings;
window.app = app;
window.$ = $;
