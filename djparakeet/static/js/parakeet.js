var Backbone = require('backbone');
var $ = require('jquery');
var moment   = require('moment');
var _ = require('underscore');
var Handlebars = require('handlebars');
var inview     = require('./plugins/jquery.inview.js')

    // Helper function from Backbone to get a value from a Backbone
    // object as a property or as a function.
    var getValue = function(object, prop) {
        if ((object && object[prop]))
            return _.isFunction(object[prop]) ? object[prop]() : object[prop];
    };

    // Helper function from Backbone that raises error when a model's
    // url cannot be determined.
    var urlError = function() {
        throw new Error('A "url" property or function must be specified');
    };


var Parakeet = {
  defaultLimit: 20
}

Parakeet.LocalModel = Backbone.Model.extend({
   fetch: function(){},
   sync: function(){},
   url: function(){}
});

Parakeet.LocalCollection = Backbone.Collection.extend({
   fetch: function(){},
   sync: function(){},
   url: function(){},
   addToBottom: function(m) {
     this.add(m);
     this.trigger('scrollLast', this);
   },
   addToTop: function(m) {
     this.add(m, {prepend:true});
     if (this.models.length == 1){
      this.trigger('scrollLast', this);
     }
   },
   addToTopObjects: function(c){
     console.log('add to top objects');
     this.trigger('addObjects', {objects: c, prepend: true});
   }
});

Parakeet.Model = Backbone.Model.extend({
  idAttribute: 'resource_uri',

  url: function () {
    var url = getValue(this, 'urlRoot') || getValue(this.collection, 'urlRoot') || urlError();
    if (this.isNew()) {
      return url;
    }
    return this.get('resource_uri');
  },

  _getId: function () {
    if (this.has('id')) {
      return this.get('id');
    }
    return _.chain(this.get('resource_uri').split('/')).compact().last().value();
  }
});

Parakeet.ModelWithConnectedCollection = Parakeet.Model.extend({
  initialize: function (options) {
    Parakeet.Model.prototype.initialize.apply(this, arguments);
    this.connectedCollection = new Parakeet.LocalCollection();
    this.connectedViews = this.collection.connectedViews;
    this.grids = {};
    for (var i=0 in this.connectedViews) {
        this.grids[i] = new this.connectedViews[i].grid(this, this.connectedViews[i].config);
    }
  }
});

Parakeet.TopicModel = Parakeet.ModelWithConnectedCollection.extend({
  loadPrevHistory: function(){
    var that = this;
    var mid = '';
    var postrender = true;
    if (this.connectedCollection.models.length > 0) {
      var model = this.connectedCollection.min(function(m){
         return m.get('id');
      });
      mid = '&id__lt=' + model.attributes.id;
      postrender = false;
    } 
    $.get('/parakeet/api/v1/djparakeet/message/?format=json&limit=20'+mid+'&topic='+this.attributes.id, function(data) {
       that.connectedCollection.addToTopObjects(data.objects);
       if (postrender) {
         that.connectedCollection.trigger('postRender');
       }
    });
  }
});

Parakeet.Collection = Backbone.Collection.extend({
  constructor: function (models, options) {
    Backbone.Collection.prototype.constructor.apply(this, arguments);

    this.meta = {};
    this.filters = {
      limit: Parakeet.defaultLimit,
      offset: 0
    }
    if (options && options.filters) {
      _.extend(this.filters, options.filters);
    }
  },

  url: function (models) {
    var url = this.urlRoot;

    if (this.filters.q && this.filters.q.length > 3) {
      return url + 'search/?limit=20&offset=0&q=' + this.filters.q;
    }

    if (models) {
      var ids = _.map(models, function (model) { return model._getId(); })
      url += 'set/' + ids.join(';') + '/';
    }
    return url + this._getQueryString();
  },

  parse: function (response) {
    if (response && response.meta) {
      this.meta = response.meta;
    }
    return response && response.objects;
  },

  fetch: function (settings) {
    try {
      if (settings && settings.reset) {
        this.remove(this.models)
      }
    } catch (e) {
      console.log(e)
    }
    var that = this
    that.trigger('fetch_started')

    return $.get(this.url()).done(function (data) {
      var parsed_data = that.parse(data)
      for (var i in parsed_data) {
        that.add(parsed_data[i])
      }
      that.trigger('fetch_completed')
    })
  },

  fetchNext: function (options) {
    options = options || {}
    options.add = true
    this.filters.limit = this.meta.limit
    this.filters.offset = this.meta.offset + this.meta.limit
    if (this.filters.offset > this.meta.total_count) {
      this.filters.offset = this.meta.total_count
    }
    return this.fetch.call(this, options)
  },

  fetchPrevious: function (options) {
    options = options || {}
    options.add = true
    options.at = 0

    this.filters.limit = this.meta.limit
    this.filters.offset = this.meta.offset - this.meta.limit

    if (this.filters.offset < 0) {
      this.filters.limit += this.filters.offset
      this.filters.offset = 0
    }

    return this.fetch.call(this, options)
  },

  _getQueryString: function () {
    if (!this.filters) {
      return ''
    }
    return '?' + $.param(this.filters)
  },

  matchstring: function (str, m, client_search_fields) {
    var medata = m.attributes
    if (str.replace(' ', '').length == 0) {
      return true
    }
    for (ind in client_search_fields) {
      var c = String(medata[client_search_fields[ind]])
      c = c.toLowerCase()
      var c2 = str.toLowerCase()
      if (c.indexOf(c2) != -1) {
        return true
      }
    }
    return false
  },

  check_model_for_validity: function (m, client_search_fields) {
    if (typeof this.filters.q == 'undefined') {
      var matched = 1
    } else {
      if (this.filters.q.length == 0) {
        matched = 1
      } else {
        if (this.matchstring(this.filters.q, m, client_search_fields)) {
          matched = 1
        } else {
          matched = 0
        }
      }
      m.attributes.matched_by_search = matched
      m.trigger('change', m)
    }
  },

  search: function (s, client_search_fields) {
    // console.log("collection search", s)
    this.filters.q = s

    for (m in this.models) {
      var mod = this.models[m]
      this.check_model_for_validity(mod, client_search_fields)
    }

    if (s.length > 3) {
      this.fetch({
        remove: false
      })
    }
  },

  load_recently_created_objects: function () {
    if (this.models.length > 0) {
      var n = _.max(this.models, function (x) {
        return x.attributes.id
      })
      var url = this.urlRoot + '?limit=0&offset=0&format=json&id__gt=' + n.attributes.id
      var that = this
      $.ajax({
        url: url,
        async: true
      }).done(
        function (data) {
          var o = data.objects
          for (var i = o.length - 1; i > -1; i--) {
            var d = o[i]
            var c = { attributes: d }
            that.add(d)
            that.trigger('recently', that.where({ id: d.id })[0])
          }
        })
    }
  },

  receive_sock_data: function (data, tag) {
    console.log('sock data received', data, tag)
  }
})

Parakeet.Cell = Backbone.View.extend({
  initialize: function (model, options) {
    this.model = model;
    this.grid = options.grid;
    this.template = options.grid.cellTemplate;
    this.listenTo(this.model, 'change', this.render)
    this.render(options);
    this.listenTo(this.model.collection, 'postRender', this.postRender);
    this.listenTo(this.model.collection, 'scrollLast', this.scrollLast);
  },

  getHtml: function () {
    return this.template(this.model.attributes)
  },

  getHolder: function(){
    return this.grid.holder;
  },

  render: function (options) {
    if (this.element === undefined){
      this.element = $(this.getHtml());
      if (!options.prepend) {
        this.getHolder().append(this.element);
      } else {
        var firstMsg = this.getHolder().find('div:first')
        this.getHolder().prepend(this.element);
        try {
        console.log('top', firstMsg.offset().top);
        this.getWrapper().scrollTop(firstMsg.offset().top - 800 - 22);
        } catch (e) {}
      }
    } else {
      var h = this.getHtml()
      var elem = $(h)
      this.element.replaceWith(h);
      this.element = elem;
    }

    try {
      if (this.model.attributes.matched_by_search == 1) {
        this.element.highlight(this.model.collection.filters.q);
      }
    } catch (e) {}

    return this;
  },
  scrollLast: function(){
    console.log('scrolling bottom');
    var firstMsg = this.getHolder().find('div:last')
    this.getWrapper().scrollTop(firstMsg.offset().top + 1500);
  },
  remove: function () {
    this.grid.holder.remove(this.element)
  },
  postRender: function(){
  }
});

Parakeet.TopicFeedCell = Parakeet.Cell.extend({
  initialize: function (model, options) {
    this.model = model;
    this.grid = options.grid;
    this.template = options.grid.cellTemplate;
    this.listenTo(this.model, 'change', this.render)
    this.render(options);
    this.listenTo(this.model.collection, 'postRender', this.postRender);
    this.postRender();
  },
  postRender: function(){
    this.bindNewLoad();  
  },
  bindNewLoad: function() {
    console.log('bindnewload');
    if (this.newpage_element === undefined){
      this.newpage_element = $("#topic-"+this.model.attributes.id+"-premessage");
    }
    var that = this;
    this.newpage_element.on('inview', function (event, isInView) {
      console.log('innview',isInView);
      if (isInView) {
        that.model.loadPrevHistory();
      }
    });
  }
});

Parakeet.ConnectedCell = Parakeet.Cell.extend({
  getHolder: function(){
    return $(this.grid.holder_id);
  },
  getWrapper: function(){
    return $(this.grid.wrapper_id);
  },
  postRender: function(){
    var hol = $( this.getHolder() );
    var h = hol.height();
  //  hol.animate({scrollTop: h});
  }
});


Parakeet.Grid = Backbone.View.extend({
  el: 'div',
  initialize: function (collection, options) {
    this.collection = collection;
    this.holder = options.holder;
    this.cell = options.cell;
    this.cellTemplate = options.cellTemplate;
    this.listenTo(this.collection, 'add', this.onAdd);
    this.listenTo(this.collection, 'remove', this.onRemove);
    this.views = new Backbone.Collection();
    this.afterInit();
    this.listenTo(this.collection, 'addObjects', this.onAddObjects);
  },
  onAdd: function (m, collection, attrs) {
    console.log('onadd', m, attrs);
    var prepend = false;
    if (attrs.prepend != undefined) {
      prepend = attrs.prepend;
    }
    var v = new this.cell(m, {
      grid: this,
      prepend: prepend
    })
    this.views.add(v);
  },
  onRemove: function (m) {
    try {
      var v = this.views.where({id: m.id})[0];
      v.attributes.element.remove();
    } catch(e) {
      var v = this.views.where({mcid: m.cid})[0];
      v.attributes.element.remove();
    }
    this.views.remove(v);
  },
  afterInit: function(){},
  getWrapper: function(){
    return $(this.wrapper_id);
  },
  getHolder: function(){
    return $(this.holder_id);
  },
  onAddObjects: function(attrs){
      console.log('onaddobj', attrs)
      var firstMsg = this.getHolder().find('div:first')
      for (m in attrs.objects){
        this.collection.addToTop(attrs.objects[m]);
      }
      try {
      console.log('onaddobj tcml', this.collection.models.length);
        if (this.collection.models.length > Parakeet.defaultLimit) {
            console.log('top', firstMsg.offset().top);
            this.getWrapper().scrollTop(firstMsg.offset().top);
        } else {
            this.collection.trigger('scrollLast', this.collection);
        }
      } catch (e) {}
  }
});

Parakeet.ConnectedGrid = Parakeet.Grid.extend({
  initialize: function (model, options) {
    this.model = model;
    this.options = options;
    this.collection = model.connectedCollection;
    this.holder_id = options.holder_id({id: this.model.attributes.id});
    this.wrapper_id = options.wrapper_id({id: this.model.attributes.id});
    this.cell = options.cell;
    this.cellTemplate = options.cellTemplate;
    this.listenTo(this.collection, 'add', this.onAdd);
    this.listenTo(this.collection, 'remove', this.onRemove);
    this.listenTo(this.collection, 'addObjects', this.onAddObjects);
    this.views = new Backbone.Collection();
  }
});

module.exports = Parakeet;
