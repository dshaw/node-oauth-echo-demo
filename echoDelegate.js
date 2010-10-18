var http        = require('http'),
    sys         = require('sys'),
    URL         = require('url'),
    querystring = require('querystring');

http.createServer(function (req, res) {

  var reqURL = URL.parse(req.url);
  switch (req.method) {

    // We only provide a single 'GET' path... the root
    case 'GET':

      if (reqURL['pathname'] === '/') {
        var responseMessage = 'At some point, something interesting will be here';
        res.writeHead(200, {'Content-Type': 'text/plain', 'Content-Length': responseMessage.length});
        res.end(responseMessage);

      } else {
        var errMessage = 'The answer you\'re looking for is not here.';
        res.writeHead(404, {'Content-Type': 'text/plain', 'Content-Length': errMessage.length});
        res.end(errMessage);
      }
      break;

    case 'POST':

      if (reqURL['pathname'] === '/message') {
        if (!req.headers['x-auth-service-provider'] || !req.headers['x-verify-credentials-authorization']) {

          console.log('INCORRECT HEADERS: ' + sys.inspect(req.headers));
          var errResponse = 'x-auth-service-provider and x-verify-credentials-authorization headers not present';
          res.writeHead(400, {'Content-Type': 'text/plain', 'Content-Length': errResponse.length});
          res.end(errResponse);
          break;
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

        twitterRequest.on('response', function (response) {
          switch (response.statusCode) {

            // Twitter didn't authorize the caller
            case 401:
              var errResponse = 'Twitter verification failed';
              res.writeHead(401, {'Content-Type': 'text/plain', 'Content-Length': errResponse.length});
              res.end(errResponse);
              break;

            // Twitter DID authorize the caller
            case 200:
              res.writeHead(201, {'Content-Type': 'text/plain', 'Content-Length': 0});
              res.end();
              break;

            // Something strange happened....
            default:
              var teapotResponse = 'I\'m a little teapot? I think something went wrong...';
              res.writeHead(418, {'Content-Type': 'text/plain', 'Content-Length': teapotResponse.length});
              res.end(teapotResponse);
              break;
          }

          console.log('TWITTER STATUS: ' + response.statusCode);
          console.log('TWITTER HEADERS: ' + JSON.stringify(response.headers));
          response.setEncoding('utf8');
          response.on('data', function (chunk) {
            console.log('BODY: ' + chunk);
          });
        });
      }
      break;

    default:
      var errResponse = 'Method not supported';
      res.writeHead(405, {'Content-Type': 'text/plain', 'Content-Length': errResponse.length});
      res.end(errResponse);
      break;
  }
}).listen(8889, '127.0.0.1');
console.log('Server running at http://127.0.0.1:8889/');