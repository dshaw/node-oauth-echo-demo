#OAuth Echo Proof of Concept in Node.js

Concept
Attempt to implement oAuth echo. Evolve in baby steps as we go.

Setup
Node Dependencies
TODO: Fill this out later..

Currently, server.js depends on some environment variables being set. Since
we're evolving this, it currently depends on Twitter. You must set the
environment variables

ECHO_TEST_CONSUMER_KEY - The consumer key for your twitter application
ECHO_TEST_CONSUMER_SECRET - The consumer secret for your twitter application

I recommend placing the following in a startup.sh file for launching the
applications:

#!/bin/sh

# Application private information
export ECHO_TEST_CONSUMER_KEY=YOUR APP KEY HERE
export ECHO_TEST_CONSUMER_SECRET=YOUR APP SECRET HERE
node server.js

Twitter application setup
Since this is entirely a test rig, you'll need to configure your Twitter
application to point back to your local machine. I just change the callback
to point to 127.0.0.1.

Also, in server.js you'll want to change 'callbackUrl' to be whatever your
callback path is configured as in the application.

Created by Daniel Shaw.