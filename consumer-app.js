
/*!
 * Node OAuth Echo Demo
 * Copyright(c) 2010 Daniel Shaw <daniel.shaw@dshaw.com>
 * MIT Licensed
 */


/**
 * Module dependencies.
 */

var http        = require('http'),
    sys         = require('sys'),
    URL         = require('url'),
    querystring = require('querystring'),
    // npm
    connect = require('connect'),
    express = require('express'),
    OAuth   = require('oauth').OAuth;


/**
 * Quick and dirty user object
 */

function User(id, username, oauth_token, oauth_secret) {
  this.id = id;
  this.username = username;
  this.oauth_token = oauth_token;
  this.oauth_secret = oauth_secret;

  this.__defineGetter__('sessionUser', function(){
    return {
      id: this.id,
      username: this.username,
      oauth_token: this.oauth_token
    };
  });
}


/**
 * Configuration
 */

var HOST            = process.env.ECHO_TEST_CONSUMER_HOST || '127.0.0.1',
    PORT            = parseInt(process.env.ECHO_TEST_CONSUMER_PORT) || 8888,
    CONSUMER_KEY    = process.env.ECHO_TEST_CONSUMER_KEY || null,
    CONSUMER_SECRET = process.env.ECHO_TEST_CONSUMER_SECRET || null,
    public          = __dirname + '/public',
    authCallback    = '/twitterCallback',

    users           = {};

/**
 * Usage
 */

if (!CONSUMER_KEY || !CONSUMER_SECRET) {
  console.log('OAuth Echo Consumer App exiting: ECHO_TEST_CONSUMER_KEY and/or ECHO_TEST_CONSUMER_SECRET environment variables not set');
  process.exit(0);
}

/**
 * OAuth Configuration
 */

var oa = new OAuth('https://api.twitter.com/oauth/request_token',
    'https://api.twitter.com/oauth/access_token',
    CONSUMER_KEY,
    CONSUMER_SECRET,
    '1.0',
    null,
    'HMAC-SHA1');
var global_secret_lookup = {};


/**
 * Express Server
 */
//
//express.logger(),
//  express.staticProvider(public)
//
var app = express.createServer();

app.configure(function(){
  app.use(connect.cookieDecoder());
  app.use(connect.session());
  app.use(connect.logger());
  app.use(connect.methodOverride());
  app.use(connect.bodyDecoder());
  app.use(app.router);
  app.use(connect.staticProvider(__dirname + '/public'));
});

// Set the default template engine to "jade"
app.set('view engine', 'jade');

app.get('/', function(req, res){
  res.render('index');
});

app.get('/auth', function(req, res){
  oa.getOAuthRequestToken(function(error, oauth_token, oauth_token_secret, results){
    if (error) {
      console.error('error :' + sys.inspect(error));
      var errResponse = 'Unable to retrieve request token';
      res.writeHead(200, {'Content-Type': 'text/plain', 'Content-Length': errResponse.length});
      res.end(errResponse);
    } else {
      console.log('oauth_token: ' + oauth_token);
      console.log('oauth_token_secret: ' + oauth_token_secret);
      console.log('requestoken results: ' + sys.inspect(results));

      // I'm sure there's a better way than storing in a single
      // global variable (it's not threadsafe, but works for illustrations)
      console.log('global_secret_lookup BEFORE storage: ' + sys.inspect(global_secret_lookup));
      global_secret_lookup[oauth_token] = oauth_token_secret;
      console.log('global_secret_lookup AFTER storage: ' + sys.inspect(global_secret_lookup));

      // NOTE: we use the AUTHENTICATE, not the AUTHORIZE URL here
      var twitterAuthEndpoint = 'https://api.twitter.com/oauth/authorize?oauth_token=' + oauth_token;
      console.log('Redirecting to ' + twitterAuthEndpoint);
      res.writeHead(301, {'Content-Type': 'text/plain', 'Location': twitterAuthEndpoint});
      res.end('Redirecting...\n');
    }
  });
});

app.get(authCallback, function(req, res){
  var parsedURL = URL.parse(req.url);
  var parsedQuery = querystring.parse(parsedURL.query);
  var oauth_token = parsedQuery['oauth_token'];

  // !IMPORTANT!
  // Grab an access token. Twitter won't remember that the user authorized
  // the application for authentication unless we grab an access token
  oa.getOAuthAccessToken(oauth_token, global_secret_lookup[oauth_token],
      function(error, oauth_access_token, oauth_access_token_secret, results) {
    console.log('Requested access token');
    console.log('oauth_access_token: ' + oauth_access_token);
    console.log('oauth_token_secret: ' + oauth_access_token_secret);
    console.log('accesstoken results: ' + sys.inspect(results));

    if (results.user_id && results.screen_name &&
        oauth_access_token && oauth_access_token_secret) {
      // Regenerate session when signing in
      // to prevent fixation
      var user = new User(results.user_id, results.screen_name, oauth_access_token, oauth_access_token_secret);
      console.dir(user);
      users[user.username] = user;
      req.session.regenerate(function(){
        req.session.user = user.sessionUser;
        console.dir(req.session);
      });
      res.redirect('/users/' + user.username);
    }

    res.render('status', {
      locals: {
        response: JSON.stringify(results)
      }
    });
  });

  console.log('global_secret_lookup BEFORE delete: ' + sys.inspect(global_secret_lookup));
  delete global_secret_lookup[oauth_token];
  console.log('global_secret_lookup AFTER delete: ' + sys.inspect(global_secret_lookup));
});

app.get('/users/:user', function(req, res){
  if (req.session.user) {
    console.dir(users);
    res.render('user', {
      locals: {
        user: req.session.user
      }
    });
  } else {
    res.redirect('home');
  }
});

app.get('/logout', function(req, res){
  // destroy the user's session to log them out
  // will be re-created next request
  req.session.destroy(function(){
    res.redirect('home');
  });
});

app.listen(PORT);
console.log('OAuth Echo Consumer App running at http://'+HOST+':' + app.address().port);
