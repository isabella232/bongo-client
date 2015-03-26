'use strict';
module.exports = {
  afterInit: function() {
    return typeof this.on === "function" ? this.on('updateInstance', (function(_this) {
      return function(data) {
        return _this.updateInstances(data);
      };
    })(this)) : void 0;
  },
  on: function(event, listener) {
    var multiplex;
    multiplex = this.multiplexer.on(event, listener);
    if (multiplex) {
      return typeof this.on_ === "function" ? this.on_(event, multiplex) : void 0;
    }
  },
  off: function(event, listener) {
    var listenerCount;
    listenerCount = this.multiplexer.off(event, listener);
    if (listenerCount === 0) {
      return this.off_(event, this.multiplexer.events[event]);
    }
  }
};
