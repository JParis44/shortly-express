var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');

var User = db.Model.extend({
  tableName: 'users',
  initialize: function () {
    this.on('creating', function(model, attrs, options) {
      bcrypt.hash(model.get('password'), null, null, function (err, result) {
        model.set('password', result);
      });
    });
  }
});

module.exports = User;
