var Backbone = require('backbone')
var app = {}
app.collections = {}
var Parakeet = require('./parakeet.js')
var $ = require('jquery')
Handlebars = require('handlebars');

var topicurl = '/parakeet/api/v1/djparakeet/topic/';
var settings = {}

settings.collections = {
  'topics': {
    model: Parakeet.Model,
    urlRoot: topicurl,
    collection:  Parakeet.Collection,
    events_tag: 'topics',
    views: {
      0: {
        grid: Parakeet.Grid,
        config: {
          cell: Parakeet.Cell,
          cellTemplate: Handlebars.compile('{{name}}'),
          typical: true,
          name: 'topics_left_table',
          holder: $('#topics_holder')
        }
      }
    }
  }
}

for (var i in settings.collections) {
    var cs = settings.collections[i];
    var collection = new (cs.collection.extend({
      urlRoot: cs.urlRoot,
      model: cs.model
    }))();
    app.collections[i] = collection;
    app.collections[i].views = {};
    for (var v in cs.views) {
        app.collections[i].views[v] = new cs.views[v].grid(collection, cs.views[v].config)
    }
}

for (var i in app.collections){
    app.collections[i].fetch();
}

app.settings = settings;
window.app = app;
