'use strict';
module.exports = (function() {
  var defineProperty, getPusherEvent;
  getPusherEvent = function(event) {
    if (Array.isArray(event)) {
      return event = event.join(':');
    } else {
      return event;
    }
  };
  defineProperty = Object.defineProperty;
  return {
    destroy: function() {
      if (this.channel == null) {
        return;
      }
      return this.mq.unsubscribe(this.channel);
    },
    removeListener: function(event, listener) {
      return this.emit('listenerRemoved', event, listener);
    }
  };
})();
