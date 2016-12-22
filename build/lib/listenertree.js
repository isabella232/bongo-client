'use strict';
var ListenerTree,
  __slice = [].slice;

module.exports = ListenerTree = (function() {
  var assureAt, deleteAt, getAt, pushAt, _ref;

  _ref = require('jspath'), assureAt = _ref.assureAt, pushAt = _ref.pushAt, deleteAt = _ref.deleteAt, getAt = _ref.getAt;

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
    var listener, listeners, params, rest, routingKey, _i, _len;
    routingKey = arguments[0], rest = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
    listeners = getAt(this.tree, routingKey);
    params = rest.map(function(param) {
      var e;
      try {
        return JSON.parse(param);
      } catch (_error) {
        e = _error;
        return param;
      }
    });
    if (listeners != null ? listeners.length : void 0) {
      for (_i = 0, _len = listeners.length; _i < _len; _i++) {
        listener = listeners[_i];
        listener.apply(null, params);
      }
    }
    return this;
  };

  return ListenerTree;

})();
