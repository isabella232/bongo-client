'use strict';
var ListenerTree,
  slice = [].slice;

module.exports = ListenerTree = (function() {
  var assureAt, deleteAt, getAt, pushAt, ref;

  ref = require('jspath'), assureAt = ref.assureAt, pushAt = ref.pushAt, deleteAt = ref.deleteAt, getAt = ref.getAt;

  function ListenerTree() {
    this.tree = Object.create(null);
  }

  ListenerTree.prototype.on = function(routingKey, listener) {
    assureAt(this.tree, routingKey, []);
    pushAt(this.tree, routingKey, listener);
    return this;
  };

  ListenerTree.prototype.off = function(routingKey, listener) {
    deleteAt(this.tree, routingKey);
    return this;
  };

  ListenerTree.prototype.emit = function() {
    var i, len, listener, listeners, params, rest, routingKey;
    routingKey = arguments[0], rest = 2 <= arguments.length ? slice.call(arguments, 1) : [];
    listeners = getAt(this.tree, routingKey);
    params = rest.map(function(param) {
      var e, error;
      try {
        return JSON.parse(param);
      } catch (error) {
        e = error;
        return param;
      }
    });
    if (listeners != null ? listeners.length : void 0) {
      for (i = 0, len = listeners.length; i < len; i++) {
        listener = listeners[i];
        listener.apply(null, params);
      }
    }
    return this;
  };

  return ListenerTree;

})();
