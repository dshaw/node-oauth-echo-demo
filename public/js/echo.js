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

  var username = $("#username").text();
  var chatform = document.getElementById("chatform");
  var message = document.getElementById("message");

  if (chatform.addEventListener) {
    chatform.addEventListener("submit", submitHandler, "false");
  } else if (chatform.attachEvent) {
    chatform.attachEvent("onsubmit", submitHandler);
  }

  function submitHandler(event) {
    event.preventDefault();
    $.post('/send',
        JSON.stringify({ username: username, message: message.value }),
        function(response){
          var rsp = "response: " + response
          console.log(rsp);
          $('#echo-delegate').append(rsp);
        });
    message.value = '';
    this.blur();
    return false;
  }

})(this);
