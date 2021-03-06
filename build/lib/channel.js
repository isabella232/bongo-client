'use strict';
var Channel;

module.exports = Channel = (function() {
  function Channel(channel) {
    var fn, method;
    this.channel = channel;
    for (method in channel) {
      fn = channel[method];
      if ('function' === typeof fn) {
        this[method] = fn.bind(channel);
      }
    }
    this.on = this.bind;
    this.emit = this.trigger;
  }

  return Channel;

})();
