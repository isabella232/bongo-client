var Bongo, Encoder, EventBus, EventEmitter, JsPath, ListenerTree, Model, OpaqueType, Promise, Signature, Traverse, bound, createBongoName, createId,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  __slice = [].slice,
  __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

Promise = require('bluebird');

EventEmitter = require('microemitter');

Encoder = require('htmlencode');

Traverse = require('traverse');

createId = require('hat');

JsPath = require('jspath');

Model = require('./model');

ListenerTree = require('./listenertree');

EventBus = require('./eventbus');

OpaqueType = require('./opaquetype');

Signature = require('./signature');

bound = require('./bound');

createBongoName = function(resourceName) {
  return "" + (createId(128)) + ".unknown.bongo-" + resourceName;
};

(function() {
  Model.prototype.mixin(require('./eventemitter/broker'));
  Model.prototype.off = Model.prototype.removeListener;
  return Model.prototype.addGlobalListener = Model.prototype.on;
})();

module.exports = Bongo = (function(_super) {
  var BATCH_CHUNK_MS, CONNECTED, CONNECTING, DISCONNECTED, NOTCONNECTED, Scrubber, Store, addGlobalListener, getEventChannelName, getRevivingListener, guardMethod, slice, _ref, _ref1;

  __extends(Bongo, _super);

  _ref = [0, 1, 2, 3], NOTCONNECTED = _ref[0], CONNECTING = _ref[1], CONNECTED = _ref[2], DISCONNECTED = _ref[3];

  BATCH_CHUNK_MS = 300;

  Bongo.dnodeProtocol = require('dnode-protocol');

  Bongo.dnodeProtocol.Scrubber = require('./scrubber');

  Bongo.promibackify = require('./promibackify');

  _ref1 = Bongo.dnodeProtocol, Store = _ref1.Store, Scrubber = _ref1.Scrubber;

  slice = [].slice;

  function Bongo(options) {
    console.log("bongo/constructor", options);
    EventEmitter(this);
    this.mq = options.mq, this.getSessionToken = options.getSessionToken, this.getUserArea = options.getUserArea, this.fetchName = options.fetchName, this.resourceName = options.resourceName, this.apiEndpoint = options.apiEndpoint, this.useWebsockets = options.useWebsockets, this.batchRequests = options.batchRequests, this.apiDescriptor = options.apiDescriptor;
    if (this.useWebsockets == null) {
      this.useWebsockets = false;
    }
    if (this.batchRequests == null) {
      this.batchRequests = true;
    }
    if (this.getUserArea == null) {
      this.getUserArea = function() {};
    }
    this.localStore = new Store;
    this.remoteStore = new Store;
    this.readyState = NOTCONNECTED;
    this.stack = [];
    this.opaqueTypes = {};
    this.on('newListener', (function(_this) {
      return function(event, listener) {
        if (event === 'ready' && _this.readyState === CONNECTED) {
          return process.nextTick(function() {
            _this.emit('ready');
            return _this.off('ready');
          });
        }
      };
    })(this));
    if (this.batchRequests) {
      this.setOutboundTimer();
    }
    if (!this.useWebsockets) {
      this.xhrHandshake();
    }
    this.api = this.createRemoteApiShims(this.apiDescriptor);
    if (this.mq != null) {
      console.log("bongo/constructor @api");
      this.eventBus = new EventBus(this.mq);
      this.mq.on('disconnected', (function(_this) {
        return function() {
          console.log("bongo/disconnected @api");
          _this.disconnectedAt = Date.now();
          _this.emit('disconnected');
          return _this.readyState = DISCONNECTED;
        };
      })(this));
    }
  }

  Bongo.prototype.bound = bound;

  Bongo.prototype.isConnected = function() {
    return this.readyState === CONNECTED;
  };

  Bongo.prototype.cacheable = require('./cacheable');

  Bongo.prototype.cacheableAsync = function() {
    var rest;
    rest = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
    return new Promise((function(_this) {
      return function(resolve, reject) {
        return _this.cacheable.apply(_this, __slice.call(rest).concat([function(err, model) {
          if (err) {
            return reject(err);
          }
          return resolve(model);
        }]));
      };
    })(this));
  };

  Bongo.prototype.createRemoteApiShims = function(api) {
    var attributes, instance, name, shimmedApi, statik, _ref2;
    console.log("bongo/createRemoteApiShims api");
    shimmedApi = {};
    for (name in api) {
      if (!__hasProp.call(api, name)) continue;
      _ref2 = api[name], statik = _ref2.statik, instance = _ref2.instance, attributes = _ref2.attributes;
      shimmedApi[name] = this.createConstructor(name, statik, instance, attributes);
    }
    return shimmedApi;
  };

  guardMethod = function(signatures, fn) {
    return function() {
      var rest, signature, _i, _len;
      rest = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      console.log("bongo/guardMethod");
      for (_i = 0, _len = signatures.length; _i < _len; _i++) {
        signature = signatures[_i];
        if (signature.test(rest)) {
          return fn.apply(this, rest);
        }
      }
      throw new Error("Unrecognized signature!");
    };
  };

  Bongo.prototype.wrapStaticMethods = (function() {
    var optimizeThese;
    optimizeThese = ['on', 'off'];
    return function(constructor, constructorName, methods) {
      var bongo;
      bongo = this;
      return (Object.keys(methods)).forEach(function(method) {
        var signatures, wrapper;
        signatures = methods[method].map(Signature);
        if (__indexOf.call(optimizeThese, method) >= 0) {
          method += '_';
        }
        wrapper = guardMethod(signatures, function() {
          var rest, rpc;
          rest = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
          rpc = {
            type: 'static',
            constructorName: constructorName,
            method: method
          };
          return bongo.send(rpc, rest);
        });
        wrapper.signatures = signatures;
        return constructor[method] = Bongo.promibackify(wrapper);
      });
    };
  })();

  Bongo.prototype.wrapInstanceMethods = (function() {
    var optimizeThese;
    optimizeThese = ['on', 'addListener', 'off', 'removeListener', 'save'];
    return function(constructor, constructorName, methods) {
      var bongo;
      bongo = this;
      return (Object.keys(methods)).forEach(function(method) {
        var signatures, wrapper;
        signatures = methods[method].map(Signature);
        if (__indexOf.call(optimizeThese, method) >= 0) {
          method += '_';
        }
        wrapper = guardMethod(signatures, function() {
          var data, id, rest, rpc;
          rest = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
          id = this.getId();
          if (id == null) {
            data = this.data;
          }
          rpc = {
            type: 'instance',
            constructorName: constructorName,
            method: method,
            id: id,
            data: data
          };
          return bongo.send(rpc, rest);
        });
        wrapper.signatures = signatures;
        return constructor.prototype[method] = Bongo.promibackify(wrapper);
      });
    };
  })();

  Bongo.prototype.registerInstance = function(inst) {
    console.log("bongo/registerInstance");
    inst.on('listenerRemoved', (function(_this) {
      return function(event, listener) {
        var _ref2;
        console.log("bongo/registerInstance/listenerRemoved");
        return (_ref2 = _this.eventBus) != null ? _ref2.off(inst, event, listener.bind(inst)) : void 0;
      };
    })(this));
    return inst.on('newListener', (function(_this) {
      return function(event, listener) {
        var _ref2;
        console.log("bongo/registerInstance/newListener");
        return (_ref2 = _this.eventBus) != null ? _ref2.on(inst, event, listener.bind(inst)) : void 0;
      };
    })(this));
  };

  getEventChannelName = function(name) {
    return "event-" + name;
  };

  getRevivingListener = function(bongo, ctx, listener) {
    return function() {
      var rest;
      rest = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      return listener.apply(ctx, bongo.revive(rest));
    };
  };

  addGlobalListener = function(konstructor, event, listener) {
    var _ref2;
    return (_ref2 = this.eventBus) != null ? _ref2.staticOn(konstructor, event, (function(_this) {
      return function() {
        var rest, revived;
        rest = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
        revived = _this.revive(rest);
        return listener.apply(konstructor, revived);
      };
    })(this)) : void 0;
  };

  Bongo.prototype.reviveType = function(type, shouldWrap) {
    var revived, _base, _ref2, _ref3;
    console.log("bongo/reviveType");
    if (Array.isArray(type)) {
      return this.reviveType(type[0], true);
    }
    if ('string' !== typeof type) {
      return type;
    }
    revived = (_ref2 = (_ref3 = this.api[type]) != null ? _ref3 : window[type]) != null ? _ref2 : (_base = this.opaqueTypes)[type] != null ? _base[type] : _base[type] = new OpaqueType(type);
    if (shouldWrap) {
      return [revived];
    } else {
      return revived;
    }
  };

  Bongo.prototype.reviveSchema = (function() {
    var isArray, keys, reviveSchema, reviveSchemaRecursively;
    console.log("bongo/reviveSchema");
    keys = Object.keys;
    isArray = Array.isArray;
    reviveSchemaRecursively = function(bongo, schema) {
      return (keys(schema)).map(function(slot) {
        var type;
        type = schema[slot];
        if ((type && 'object' === typeof type) && !isArray(type)) {
          type = reviveSchemaRecursively(bongo, type);
        }
        return [slot, type];
      }).reduce(function(acc, _arg) {
        var slot, type;
        slot = _arg[0], type = _arg[1];
        acc[slot] = bongo.reviveType(type);
        return acc;
      }, {});
    };
    return reviveSchema = function(schema) {
      return reviveSchemaRecursively(this, schema);
    };
  })();

  Bongo.prototype.createConstructor = function(name, staticMethods, instanceMethods, attributes) {
    var konstructor;
    console.log("bongo/createConstructor");
    konstructor = Function('bongo', "return function " + name + " () {\n  bongo.registerInstance(this);\n  this.init.apply(this, [].slice.call(arguments));\n  this.bongo_.constructorName = '" + name + "';\n}")(this);
    EventEmitter(konstructor);
    this.wrapStaticMethods(konstructor, name, staticMethods);
    __extends(konstructor, Model);
    konstructor.prototype.updateInstanceChannel = this.updateInstanceChannel;
    konstructor.on('newListener', addGlobalListener.bind(this, konstructor));
    konstructor.attributes = attributes;
    this.wrapInstanceMethods(konstructor, name, instanceMethods);
    return konstructor;
  };

  Bongo.prototype.getInstancesById = function() {};

  Bongo.prototype.getInstanceMethods = function() {
    return ['changeLoggedInState', 'updateSessionToken'];
  };

  Bongo.prototype.revive = function(obj) {
    var bongo, hasEncoder;
    console.log("bongo/revive");
    bongo = this;
    hasEncoder = (Encoder != null ? Encoder.XSSEncode : void 0) != null;
    return new Traverse(obj).map(function(node) {
      var constructorName, instance, instanceId, konstructor, _ref2;
      if ((node != null ? node.bongo_ : void 0) != null) {
        _ref2 = node.bongo_, constructorName = _ref2.constructorName, instanceId = _ref2.instanceId;
        instance = bongo.getInstancesById(instanceId);
        if (instance != null) {
          return this.update(instance, true);
        }
        konstructor = bongo.api[node.bongo_.constructorName];
        if (konstructor == null) {
          return this.update(node);
        } else {
          return this.update(new konstructor(node));
        }
      } else if (hasEncoder && 'string' === typeof node) {
        return this.update(Encoder.XSSEncode(node));
      } else {
        return this.update(node);
      }
    });
  };

  Bongo.prototype.reviveFromSnapshots = (function() {
    var snapshotReviver;
    snapshotReviver = function(k, v) {
      if (k === '_events') {
        return;
      }
      return v;
    };
    return function(instances, callback) {
      var results;
      results = instances.map((function(_this) {
        return function(instance) {
          var e, revivee;
          revivee = null;
          try {
            if (instance.snapshot != null) {
              revivee = JSON.parse(instance.snapshot, snapshotReviver);
            }
          } catch (_error) {
            e = _error;
            console.warn("couldn't revive snapshot! " + instance._id);
            revivee = null;
          }
          if (!revivee) {
            return null;
          }
          return _this.revive(revivee);
        };
      })(this));
      results = results.filter(Boolean);
      return callback(null, results);
    };
  })();

  Bongo.prototype.handleRequest = function(message) {
    var callback, context, method, revived, scrubber, unscrubbed;
    console.log("bongo/handleRequest", message);
    if ((message != null ? message.method : void 0) === 'defineApi' && (this.api == null)) {
      console.log("bongo/handleRequest/defineApi");
      return this.defineApi(message["arguments"][0]);
    } else if ((message != null ? message.method : void 0) === 'handshakeDone') {
      console.log("bongo/handleRequest/handshakeDone");
      return this.handshakeDone();
    } else {
      console.log("bongo/handleRequest/else");
      method = message.method, context = message.context;
      scrubber = new Scrubber(this.localStore);
      unscrubbed = scrubber.unscrub(message, (function(_this) {
        return function(callbackId) {
          if (!_this.remoteStore.has(callbackId)) {
            _this.remoteStore.add(callbackId, function() {
              var args;
              args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
              return _this.send(callbackId, args);
            });
          }
          return _this.remoteStore.get(callbackId);
        };
      })(this));
      revived = this.revive(unscrubbed);
      if (__indexOf.call(this.getInstanceMethods(), method) >= 0) {
        return this[method].apply(this, revived);
      } else if (!isNaN(+method)) {
        callback = this.localStore.get(method);
        return callback != null ? callback.apply(null, revived) : void 0;
      } else if (method !== 'auth.authOk') {
        return console.warn('Unhandleable message; dropping it on the floor.');
      }
    }
  };

  Bongo.prototype.reconnectHelper = function() {
    console.log("bongo/reconnectHelper");
    return this.mq.ready((function(_this) {
      return function() {
        console.log("bongo/reconnectHelper/ready");
        _this.readyState = CONNECTED;
        _this.emit('ready');
        return _this.authenticateUser();
      };
    })(this));
  };

  Bongo.prototype.connectHelper = function(callback) {
    console.log("bongo/connectHelper");
    if (callback) {
      this.mq.once('connected', callback);
    }
    this.channelName = createBongoName(this.resourceName);
    this.channel = this.mq.subscribe(this.channelName, {
      connectDirectly: true
    });
    this.channel.exchange = this.resourceName;
    this.channel.setAuthenticationInfo({
      serviceType: 'bongo',
      name: this.resourceName,
      clientId: this.getSessionToken()
    });
    this.channel.off('message', this.bound('handleRequest'));
    this.channel.on('message', this.bound('handleRequest'));
    this.reconnectHelper();
    this.channel.once('broker.subscribed', (function(_this) {
      return function() {
        console.log("bongo/connectHelper/broker.subscribed/once");
        return _this.stack.forEach(function(fn) {
          return fn.call(_this);
        });
      };
    })(this));
    return this.channel.on('broker.subscribed', (function(_this) {
      return function() {
        console.log("bongo/connectHelper/broker.subscribed/on");
        _this.emit('connected');
        if (_this.disconnectedAt) {
          console.log("bongo/connectHelper/@disconnectedAt");
          _this.emit('reconnected', {
            disconnectedFor: Date.now() - _this.disconnectedAt
          });
          _this.disconnectedAt = null;
        }
        if (_this.lastMessage) {
          console.log("bongo/connectHelper/@lastMessage");
          _this.channel.publish(_this.lastMessage);
          return _this.lastMessage = null;
        }
      };
    })(this));
  };

  Bongo.prototype.connect = function(callback) {
    console.log("bongo/connect");
    this.emit('ready');
    this.readyState = CONNECTED;
    return typeof callback === "function" ? callback(new Error("not supported anymore")) : void 0;
    if (this.mq == null) {
      throw new Error("no broker client");
    }
    switch (this.readyState) {
      case CONNECTED:
      case CONNECTING:
        return "already connected";
      case DISCONNECTED:
        this.readyState = CONNECTING;
        this.reconnectHelper();
        if (callback) {
          this.mq.once('connected', callback);
        }
        this.mq.connect();
        break;
      default:
        this.readyState = CONNECTING;
        this.connectHelper(callback);
    }
    if (this.mq.autoReconnect) {
      return this.bindAutoreconnect();
    }
  };

  Bongo.prototype.bindAutoreconnect = function() {
    console.log("bongo/bindAutoreconnect");
    return this.mq.on('disconnected', (function(_this) {
      return function() {
        console.log("bongo/bindAutoreconnect/disconnected");
        return _this.mq.once('connected', _this.bound('reconnectHelper'));
      };
    })(this));
  };

  Bongo.prototype.disconnect = function(shouldReconnect, callback) {
    console.log("bongo/disconnect");
    if (this.mq == null) {
      throw new Error("no broker client");
    }
    if ('function' === typeof shouldReconnect) {
      console.log("bongo/disconnect", shouldReconnect);
      callback = shouldReconnect;
      shouldReconnect = false;
    }
    if (this.readyState === NOTCONNECTED || this.readyState === DISCONNECTED) {
      return "already disconnected";
    }
    console.log("bongo/disconnect $");
    if (callback != null) {
      this.mq.once('disconnected', callback.bind(this));
    }
    this.mq.disconnect(shouldReconnect);
    return this.readyState = DISCONNECTED;
  };

  Bongo.prototype.messageFailed = function(message) {
    return console.log('MESSAGE FAILED', message);
  };

  Bongo.prototype.getTimeout = function(message, clientTimeout) {
    if (clientTimeout == null) {
      clientTimeout = 5000;
    }
    return setTimeout(this.messageFailed.bind(this, message), clientTimeout);
  };

  Bongo.prototype.ping = function(callback) {
    console.log("bongo/ping $");
    if (this.readyState === CONNECTED && this.useWebsockets) {
      return this.send('ping', callback);
    }
  };

  Bongo.prototype.send = function(method, args) {
    var scrubber;
    console.log("bongo/send $");
    if (!Array.isArray(args)) {
      args = [args];
    }
    scrubber = new Scrubber(this.localStore);
    return scrubber.scrub(args, (function(_this) {
      return function() {
        var message;
        console.log("bongo/scrubber.scrub $");
        message = scrubber.toDnodeProtocol();
        message.method = method;
        return _this.sendHelper(message);
      };
    })(this));
  };

  Bongo.prototype.sendHelper = function(message) {
    var konstructor, messageString;
    console.log("bongo/sendHelper $");
    if (this.useWebsockets) {
      console.log("bongo/sendHelper/@useWebsockets $");
      if ((this.mq != null) && !this.channel) {
        throw new Error('No channel!');
      }
      messageString = JSON.stringify(message);
      if (this.channel.isOpen) {
        console.log("bongo/sendHelper/isOpen $");
        return this.channel.publish(messageString);
      } else {
        console.log("bongo/sendHelper/isOpen else");
        this.lastMessage = messageString;
        return this.connect();
      }
    } else if (this.apiEndpoint) {
      console.log("bongo/sendHelper/@apiEndpoint");
      konstructor = this.api[message.method.constructorName];
      if (this.batchRequests && !(konstructor != null ? konstructor.attributes.bypassBatch : void 0)) {
        return this.enqueueMessage(message);
      } else {
        return this.sendXhr(this.apiEndpoint, 'POST', [message]);
      }
    }
  };

  Bongo.prototype.setOutboundTimer = function() {
    this.outboundQueue = [];
    return this.outboundTimer = setInterval((function(_this) {
      return function() {
        var messages;
        if ((messages = _this.outboundQueue.splice(0)).length) {
          _this.sendXhr(_this.apiEndpoint, 'POST', messages);
        }
        return _this.outboundQueue.length = 0;
      };
    })(this), BATCH_CHUNK_MS);
  };

  Bongo.prototype.enqueueMessage = function(message) {
    return this.outboundQueue.push(message);
  };

  Bongo.prototype.sendXhr = function(url, method, queue) {
    var payload, xhr;
    console.log("bongo/sendHelper/sendXhr", url, method, queue);
    xhr = new XMLHttpRequest;
    xhr.open(method, url);
    xhr.setRequestHeader("Content-type", "application/json;charset=UTF-8");
    xhr.onreadystatechange = (function(_this) {
      return function() {
        var e, message, request, requests, _i, _len, _ref2, _results;
        if (xhr.readyState === 0) {
          return;
        }
        if (xhr.readyState !== 4) {
          return;
        }
        if (xhr.status >= 400) {
          return console.error("XHR Error: " + (JSON.stringify(xhr.status)), queue);
        }
        if ((_ref2 = xhr.status) !== 200 && _ref2 !== 304) {
          return;
        }
        try {
          requests = JSON.parse(xhr.response);
        } catch (_error) {
          e = _error;
          message = "XHR Error: could not parse response " + xhr.response;
          _this.emit('error', new Error(message));
          return;
        }
        _results = [];
        for (_i = 0, _len = requests.length; _i < _len; _i++) {
          request = requests[_i];
          if (request) {
            _results.push(_this.handleRequest(request));
          }
        }
        return _results;
      };
    })(this);
    payload = JSON.stringify({
      channelName: this.channelName,
      queue: queue,
      sessionToken: this.getSessionToken(),
      userArea: this.getUserArea()
    });
    return xhr.send(payload);
  };

  Bongo.prototype.authenticateUser = function() {
    var clientId;
    console.log("bongo/authenticateUser");
    clientId = this.getSessionToken();
    return this.send('authenticateUser', [clientId, this.bound('changeLoggedInState')]);
  };

  Bongo.prototype.handshakeDone = function() {
    console.log("bongo/handshakeDone");
    if (this.readyState === CONNECTED) {
      return;
    }
    this.readyState = CONNECTED;
    console.log("bongo/handshakeDone/ready");
    this.emit('ready');
    return this.authenticateUser();
  };

  Bongo.prototype.defineApi = function(api) {
    console.log("bongo/defineApi");
    if (api != null) {
      this.api || (this.api = this.createRemoteApiShims(api));
    }
    return this.handshakeDone();
  };

  Bongo.prototype.changeLoggedInState = function(state) {
    console.log("bongo/changeLoggedInState/state", state);
    return this.emit('loggedInStateChanged', state);
  };

  Bongo.prototype.updateSessionToken = function(token) {
    console.log("bongo/updateSessionToken/token", token);
    return this.emit('sessionTokenChanged', token);
  };

  Bongo.prototype.fetchChannel = function(channelName, callback) {
    var channel;
    console.log("bongo/fetchChannel/channelName", channelName);
    return typeof callback === "function" ? callback(new Error("not supported anymore")) : void 0;
    if (this.mq == null) {
      throw new Error("no broker client");
    }
    channel = this.mq.subscribe(channelName);
    return channel.once('broker.subscribed', function() {
      return callback(channel);
    });
  };

  Bongo.prototype.use = function(fn) {
    return this.stack.push(fn);
  };

  Bongo.prototype.monitorPresence = function(callbacks) {
    return this.send('monitorPresence', callbacks);
  };

  Bongo.prototype.subscribe = function(name, options, callback) {
    var channel;
    if (options == null) {
      options = {};
    }
    console.log("bongo/subscribe", name, options);
    return typeof callback === "function" ? callback(new Error("not supported anymore")) : void 0;
    if (this.mq == null) {
      throw new Error("no broker client");
    }
    if (options.serviceType == null) {
      options.serviceType = 'application';
    }
    channel = this.mq.subscribe(name, options);
    options.name = name;
    options.clientId = this.getSessionToken();
    channel.setAuthenticationInfo(options);
    if (callback != null) {
      channel.once('broker.subscribed', function() {
        return callback(channel);
      });
    }
    return channel;
  };

  Bongo.prototype.xhrHandshake = function() {
    console.log("bongo/xhrHandshake");
    return this.handshakeDone();
    return this.send('xhrHandshake', (function(_this) {
      return function(api) {
        if (_this.api) {
          return _this.handshakeDone();
        } else {
          return _this.defineApi(api);
        }
      };
    })(this));
  };

  return Bongo;

})(EventEmitter);
