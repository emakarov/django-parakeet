var Backbone = require('backbone');
var $ = require('jquery');
var moment   = require('moment');
var _ = require('underscore');
var Handlebars = require('handlebars');

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
   url: function(){}
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
        this.getHolder().prepend(this.element);
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

    this.postRender();
    return this
  },
  remove: function () {
    this.grid.holder.remove(this.element)
  },
  postRender: function(){
  }
});

Parakeet.ConnectedCell = Parakeet.Cell.extend({

  getHolder: function(){
    return $(this.grid.holder_id);
  },
  postRender: function(){
    var hol = $( this.getHolder() );
    var h = hol.height();
    hol.animate({scrollTop: h});
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
  },
  onAdd: function (m) {
    var v = new this.cell(m, {
      grid: this,
      prepend: false
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
  }
});

Parakeet.ConnectedGrid = Parakeet.Grid.extend({
  initialize: function (model, options) {
    this.model = model;
    this.options = options;
    this.collection = model.connectedCollection;
    console.log(options.holder_id({id: this.model.attributes.id}));
    this.holder_id = options.holder_id({id: this.model.attributes.id});
    this.cell = options.cell;
    this.cellTemplate = options.cellTemplate;
    this.listenTo(this.collection, 'add', this.onAdd);
    this.listenTo(this.collection, 'remove', this.onRemove);
    this.views = new Backbone.Collection();
  }
});

module.exports = Parakeet;
