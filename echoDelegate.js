var http        = require('http'),
    sys         = require('sys'),
    URL         = require('url'),
    querystring = require('querystring');

http.createServer(function (req, res) {

  var reqURL = URL.parse(req.url);
  if (!req.headers['x-auth-service-provider'] || !req.headers['x-verify-credentials-authorization']) {

    console.log('INCORRECT HEADERS: ' + sys.inspect(req.headers));
    var errResponse = 'x-auth-service-provider and x-verify-credentials-authorization headers not present';
    res.writeHead(400, {'Content-Type': 'text/plain', 'Content-Length': errResponse.length});
    res.end(errResponse);
    return;
  }

  console.log('Should be making a call to Twitter here...');
  var twitterServer = http.createClient(443, 'api.twitter.com', true);
  var twitterRequest = twitterServer.request('GET', '/1/account/verify_credentials.json', 
    {'Host': 'api.twitter.com',
    'Accept': '*/*',
    'Connection': 'close',
    'User-Agent': 'Node authentication',
    'Authorization': req.headers['x-verify-credentials-authorization']});
  twitterRequest.end();

  var errResponse = 'Go check your console logs...';
  res.writeHead(200, {'Content-Type': 'text/plain', 'Content-Length': errResponse.length});
  res.end(errResponse);

  twitterRequest.on('response', function (response) {
    console.log('TWITTER STATUS: ' + response.statusCode);
    console.log('TWITTER HEADERS: ' + JSON.stringify(response.headers));
    response.setEncoding('utf8');
    response.on('data', function (chunk) {
      console.log('BODY: ' + chunk);
    });
  });
}).listen(8889, '127.0.0.1');
console.log('Server running at http://127.0.0.1:8889/');