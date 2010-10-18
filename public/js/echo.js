/**
 * Echo Delegage Client
 */

// nerf console
var console = console || {
  log: function(){},
  warn: function(){},
  error: function(){}
};


(function(global) {

  var chatform = document.getElementById("chatform");
  var username = document.getElementById("username");
  var message = document.getElementById("message");

  if (chatform.addEventListener) {
    chatform.addEventListener("submit", submitHandler, "false");
  } else if (chatform.attachEvent) {
    chatform.attachEvent("onsubmit", submitHandler);
  }

  function submitHandler(event) {
    event.preventDefault();
    $.post('/send',
        JSON.stringify({ username: username.value, message: message.value }),
        function(response){
          var rsp = "response: " + response
          console.log(rsp);
          $('#echo-delegate').append(rsp);
        });
    message.value = '';
    this.blur();
  }

})(this);
