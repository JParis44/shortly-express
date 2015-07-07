var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');
var util = require('../../lib/utility');

var User = db.Model.extend({
  tableName: 'users',
  initialize: function () {
    this.on('creating', function() {
// See https://github.com/tgriesser/bookshelf/issues/192#issuecomment-32554243
// for example
//----------------------------------------------------------------

      bcrypt.hash(this.get('password'), null, null, util.hashPass.bind(this));
    });
  }
});

module.exports = User;
