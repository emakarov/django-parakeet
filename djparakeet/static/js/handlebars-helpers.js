var Handlebars = require('handlebars');
var moment     = require('moment-timezone');

Handlebars.registerHelper('fromnow_text', function (t) {
  var res = new moment(t).from(new moment());
  return new Handlebars.SafeString(res);
});

Handlebars.registerHelper('moment', require('helper-moment'));

module.exports = Handlebars;
