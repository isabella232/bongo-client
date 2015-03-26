'use strict';
var EventBus;

module.exports = EventBus = (function() {
  var ListenerTree, getGenericInstanceRoutingKey, getGenericStaticRoutingKey, getInstanceRoutingKey, getStaticRoutingKey;

  ListenerTree = require('./listenertree');

  function EventBus(mq) {
    this.mq = mq;
    this.tree = new ListenerTree;
    this.channels = {};
    this.counts = {};
  }

  EventBus.prototype.bound = require('./bound');

  EventBus.prototype.dispatch = function(routingKey, payload) {
    return this.tree.emit(routingKey, payload);
  };

  EventBus.prototype.addListener = function(getGenericRoutingKey, getRoutingKey, name, event, listener) {
    var channel, genericRoutingKey;
    if (this.channels[name] == null) {
      this.counts[name] = 0;
      genericRoutingKey = getGenericRoutingKey(name);
      channel = this.channels[name] = this.mq.subscribe(genericRoutingKey, {
        isReadOnly: true,
        mustAuthenticate: false
      });
    } else {
      channel = this.channels[name];
    }
    if (!channel.isListeningTo(event)) {
      channel.on(event, this.dispatch.bind(this, getRoutingKey(name, event)));
    }
    this.counts[name]++;
    return this.tree.on(getRoutingKey(name, event), listener);
  };

  EventBus.prototype.removeListener = function(getRoutingKey, name, event, listener) {
    var channel;
    if (0 === --this.counts[name]) {
      channel = this.channels[name];
      channel.close();
      delete this.channels[name];
    }
    return this.tree.off(getRoutingKey(name, event), listener);
  };

  getStaticRoutingKey = function(constructorName, event) {
    return "constructor." + constructorName + ".event." + event;
  };

  getGenericStaticRoutingKey = function(constructorName) {
    return "constructor." + constructorName + ".event";
  };

  EventBus.prototype.staticOn = function(konstructor, event, listener) {
    return this.addListener(getGenericStaticRoutingKey, getStaticRoutingKey, konstructor.name, event, listener);
  };

  EventBus.prototype.staticOff = function(konstructor, event, listener) {
    return this.removeListener(getStaticRoutingKey, konstructor.name, event, listener);
  };

  getInstanceRoutingKey = function(oid, event) {
    return "oid." + oid + ".event." + event;
  };

  getGenericInstanceRoutingKey = function(oid) {
    return "oid." + oid + ".event";
  };

  EventBus.prototype.on = function(inst, event, listener) {
    if (inst.getSubscribable()) {
      return this.addListener(getGenericInstanceRoutingKey, getInstanceRoutingKey, inst.getToken(), event, listener);
    }
  };

  EventBus.prototype.off = function(inst, event, listener) {
    return this.removeListener(getInstanceRoutingKey, inst.getToken(), event, listener);
  };

  return EventBus;

})();
