'use strict';
var EventEmitter, Model,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

EventEmitter = require('microemitter');

module.exports = Model = (function(_super) {
  var JsPath, MongoOp, Traverse, createId, extend;

  __extends(Model, _super);

  function Model() {
    return Model.__super__.constructor.apply(this, arguments);
  }

  MongoOp = require('mongoop');

  JsPath = require('jspath');

  createId = Model.createId = require('hat');

  Traverse = require('traverse');

  extend = require('./util').extend;

  Model.isOpaque = function() {
    return false;
  };

  Model.streamModels = function(selector, options, callback) {
    var ids;
    if (!('each' in this)) {
      throw new Error("streamModels depends on Model#each, but cursor was not found!\n(Hint: it may not be whitelisted)");
    }
    ids = [];
    return this.each(selector, options, function(err, model) {
      if (err) {
        return callback(err);
      } else if (model != null) {
        ids.push(typeof model.getId === "function" ? model.getId() : void 0);
        return callback(err, [model]);
      } else {
        return callback(null, null, ids);
      }
    });
  };

  Model.prototype.mixin = Model.mixin = function(source) {
    var key, val, _results;
    _results = [];
    for (key in source) {
      val = source[key];
      if (key !== 'constructor') {
        _results.push(this[key] = val);
      }
    }
    return _results;
  };

  Model.prototype.watch = function(field, watcher) {
    var _base;
    (_base = this.watchers)[field] || (_base[field] = []);
    return this.watchers[field].push(watcher);
  };

  Model.prototype.unwatch = function(field, watcher) {
    var index;
    if (!watcher) {
      return delete this.watchers[field];
    } else {
      index = this.watchers.indexOf(watcher);
      if (~index) {
        return this.watchers.splice(index, 1);
      }
    }
  };

  Model.prototype.init = function(data) {
    var model;
    model = this;
    model.watchers = {};
    model.bongo_ || (model.bongo_ = {});
    if (data != null) {
      model.set(data);
    }
    if (!('instanceId' in model.bongo_)) {
      model.bongo_.instanceId = createId();
    }
    this.emit('init');
    return this.on('updateInstance', (function(_this) {
      return function(data) {
        if ((typeof Encoder !== "undefined" && Encoder !== null ? Encoder.XSSEncode : void 0) != null) {
          data = new Traverse(data).map(function(node) {
            if ('string' === typeof node) {
              return Encoder.XSSEncode(node);
            }
            return node;
          });
        }
        return _this.update_(data);
      };
    })(this));
  };

  Model.prototype.set = function(data) {
    var model;
    if (data == null) {
      data = {};
    }
    model = this;
    delete data.data;
    extend(model, data);
    return model;
  };

  Model.prototype.getFlagValue = function(flagName) {
    var _ref;
    return (_ref = this.flags_) != null ? _ref[flagName] : void 0;
  };

  Model.prototype.watchFlagValue = function(flagName, callback) {
    return this.watch("flags_." + flagName, callback);
  };

  Model.prototype.unwatchFlagValue = function(flagName) {
    return this.unwatch("flags_." + flagName);
  };

  Model.prototype.decoded = typeof Encoder !== "undefined" && Encoder !== null ? function(path) {
    return Encoder.htmlDecode(this.getAt(path));
  } : Model.prototype.getAt;

  Model.prototype.getAt = function(path) {
    return JsPath.getAt(this, path);
  };

  Model.prototype.setAt = function(path, value) {
    JsPath.setAt(this, path, value);
    return this.emit('update', [path]);
  };

  Model.prototype.getId = function() {
    return this._id;
  };

  Model.prototype.getToken = function() {
    return this.token || this.getId();
  };

  Model.prototype.getSubscribable = function() {
    var subscribable;
    subscribable = this.bongo_.subscribable;
    if (subscribable != null) {
      return subscribable;
    }
    return true;
  };

  Model.prototype.equals = function(model) {
    if (this.getId && (model != null ? model.getId : void 0)) {
      return this.getId() === model.getId();
    } else {
      return this === model;
    }
  };

  Model.prototype.valueOf = function() {
    var _ref;
    return (_ref = typeof this.getValue === "function" ? this.getValue() : void 0) != null ? _ref : this;
  };

  Model.prototype.save = function(callback) {
    var model;
    model = this;
    return model.save_(function(err, docs) {
      if (err) {
        return callback(err);
      } else {
        extend(model, docs[0]);
        bongo.addReferences(model);
        return callback(null, docs);
      }
    });
  };

  Model.prototype.update_ = function(data) {
    var fields;
    fields = new MongoOp(data).applyTo(this);
    Object.keys(fields).forEach((function(_this) {
      return function(field) {
        var _ref;
        return (_ref = _this.watchers[field]) != null ? _ref.forEach(function(watcher) {
          return watcher.call(_this, fields[field]);
        }) : void 0;
      };
    })(this));
    return this.emit('update', Object.keys(fields.result));
  };

  Model.prototype.addListener = Model.prototype.on;

  Model.prototype.removeListener = Model.prototype.off;

  return Model;

})(EventEmitter);
