var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var session = require('express-session');
var Promise = require('bluebird');
// var bcrypt = Promise.promisifyAll(require('bcrypt-nodejs'));
var bcrypt = require('bcrypt-nodejs');

var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');

var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));
app.use('/', session({
                    secret: 'I hate Backbone!',
                    resave: false,
                    saveUninitialized: true,
                    name: 'shortly.sid'
                  }));


app.get('/',
function(req, res) {
  if(util.checkUser(req)) {
    res.render('index');
  } else {
    res.redirect('/login');
  }
});

app.get('/create',
function(req, res) {
  if(util.checkUser(req)) {
    res.render('index');
  } else {
    res.redirect('/login');
  }
});

app.get('/links',
function(req, res) {
  if(util.checkUser(req)) {
    Links.reset().fetch().then(function(links) {
      res.send(200, links.models);
    });
  } else {
    res.redirect('/login');
  }
});

app.post('/links',
function(req, res) {
 if(util.checkUser(req)) {
    var uri = req.body.url;

    if (!util.isValidUrl(uri)) {
      console.log('Not a valid url: ', uri);
      return res.send(404);
    }

    new Link({ url: uri }).fetch().then(function(found) {
      if (found) {
        res.send(200, found.attributes);
      } else {
        util.getUrlTitle(uri, function(err, title) {
          if (err) {
            console.log('Error reading URL heading: ', err);
            return res.send(404);
          }

          var link = new Link({
            url: uri,
            title: title,
            base_url: req.headers.origin
          });

          link.save().then(function(newLink) {
            Links.add(newLink);
            res.send(200, newLink);
          });
        });
      }
    });
  }
});

/************************************************************/
// Write your authentication routes here
/************************************************************/
app.get('/signup',
function(req, res) {
  res.render('signup');
});

app.post('/signup', function(req, res){
  var username = req.body.username;
  var password = req.body.password;

  new User({username: username}).fetch().then(function(found) {
     if(found) {
       //send error message
       res.redirect('/login');
     } else {
       var user = new User({
         username: username,
         password: password
       });

       user.save().then(function(newUser) {
         Users.add(newUser);
         req.session.regenerate(function(){
           req.session.userName = username;
           res.redirect('/');
         })

       })
     }
   });
});

app.get('/login',
function(req, res) {
  res.render('login');
});

app.post('/login',
  function(req, res) {
    var username = req.body.username;
    var password = req.body.password;


    new User({username: username}).fetch().then(function(user) {
      if(user) {
        bcrypt.compare(password, user.get('password'), function (err, result) {
          if(result) {
            req.session.regenerate(function () {
              req.session.userName = username;
              res.redirect('/');
            });
          } else {
            console.log('Incorrect Password');
            res.redirect('/login');
          }

        });
      } else {
        console.log('Incorrect Username');
        res.redirect('/login');
      }
    });

  });

app.get('/logout', function(req, res){
  req.session.destroy(function(err){
    if (err) {
      console.log(err);
    } else {
      res.redirect('/login');
    }
  });
});

/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        link_id: link.get('id')
      });

      click.save().then(function() {
        db.knex('urls')
          .where('code', '=', link.get('code'))
          .update({
            visits: link.get('visits') + 1,
          }).then(function() {
            return res.redirect(link.get('url'));
          });
      });
    }
  });
});

console.log('Shortly is listening on 4568');
app.listen(4568);
