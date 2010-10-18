
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
    crypto      = require('crypto'),
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

// TODO: MOVE THIS TO ANOTHER PLACE
OAuth.prototype.getAuthHeader= function(url, oauth_token, oauth_token_secret, callback) {
  // return this._performSecureRequest( oauth_token, oauth_token_secret, "GET", url, null, "", null, callback );

  var method = "GET";
  var extra_params = null;
  var post_body = "";
  var post_content_type = null;

  var oauthParameters= {
      "oauth_timestamp":        this._getTimestamp(),
      "oauth_nonce":            this._getNonce(this._nonceSize),
      "oauth_version":          this._version,
      "oauth_signature_method": this._signatureMethod,
      "oauth_consumer_key":     this._consumerKey
  };

  if( oauth_token ) {
    oauthParameters["oauth_token"]= oauth_token;
  }
  if( extra_params ) {
    for( var key in extra_params ) {
         oauthParameters[key]= extra_params[key];
    }
  }
  if( !post_content_type ) {
    post_content_type= "application/x-www-form-urlencoded";
  }

  var parsedUrl= URL.parse( url, false );
  if( parsedUrl.protocol == "http:" && !parsedUrl.port ) parsedUrl.port= 80;
  if( parsedUrl.protocol == "https:" && !parsedUrl.port ) parsedUrl.port= 443;

  if( parsedUrl.query ) {
   var extraParameters= querystring.parse(parsedUrl.query);
   for(var key in extraParameters ) {
     oauthParameters[key]= extraParameters[key];
   }
  }

  var sig= this._getSignature( method,  url,  this._normaliseRequestParams(oauthParameters), oauth_token_secret);
  var orderedParameters= this._sortRequestParams( oauthParameters );
  orderedParameters[orderedParameters.length]= ["oauth_signature", sig];

  var query="";
  for( var i= 0 ; i < orderedParameters.length; i++) {
    query+= this._encodeData(orderedParameters[i][0])+"="+ this._encodeData(orderedParameters[i][1]) + "&";
  }
  query= query.substring(0, query.length-1);


  var oauthProvider;
  if( parsedUrl.protocol == "https:" ) {
    oauthProvider= this._createClient(parsedUrl.port, parsedUrl.hostname, true, crypto.createCredentials({}));
  }
  else {
    oauthProvider= this._createClient(parsedUrl.port, parsedUrl.hostname);
  }

  var headers= {};

  // build request authorization header
  var authHeader="OAuth ";
  for( var i= 0 ; i < orderedParameters.length; i++) {
     // Whilst the all the parameters should be included within the signature, only the oauth_ arguments
     // should appear within the authorization header.
     if( orderedParameters[i][0].match('^oauth_') == "oauth_") {
      authHeader+= this._encodeData(orderedParameters[i][0])+"=\""+ this._encodeData(orderedParameters[i][1])+"\",";
     }
  }
  authHeader= authHeader.substring(0, authHeader.length-1);
  return authHeader;
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


app.post('/send', function(req, res){
  var user = users[req.session.user.username];
  console.dir(req.rawBody);
  var requestString = oa.getAuthHeader('https://api.twitter.com/1/account/verify_credentials.json',
                                        user.oauth_token,
                                        user.oauth_secret);
  console.log('authHeader: ' + requestString);

  var echoServer = http.createClient(8889, '127.0.0.1');
  var echoRequest = echoServer.request('POST', '/message',
    {
      'host': '127.0.0.1',
      'X-Auth-Service-Provider': 'https://api.twitter.com/1/account/verify_credentials.json',
      'X-Verify-Credentials-Authorization': requestString
    });
  echoRequest.end(req.rawBody);
  echoRequest.on('response', function (response) {
    console.log('FIRST STATUS: ' + response.statusCode);
    console.log('FIRST HEADERS: ' + JSON.stringify(response.headers));
    response.setEncoding('utf8');
    response.on('data', function (chunk) {
      console.log('BODY: ' + chunk);
    });
  });
});

app.listen(PORT);
console.log('OAuth Echo Consumer App running at http://'+HOST+':' + app.address().port);
