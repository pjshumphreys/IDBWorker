define([], function() {
  return function(object, JSON) { 
    return function(messageType, data) {
      object.postMessage(JSON.stringify({
        messageType:  messageType,
        data:         data
      });
    }
  }
});