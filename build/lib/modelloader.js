'use strict';
var EventEmitter, ModelLoader,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty,
  slice = [].slice;

EventEmitter = require('microemitter');

module.exports = ModelLoader = (function(superClass) {
  var load_;

  extend(ModelLoader, superClass);

  function ModelLoader(konstructor, _id) {
    this._id = _id;
    this.konstructor = konstructor;
  }

  load_ = function() {
    return this.konstructor.one({
      _id: this._id
    }, (function(_this) {
      return function(err, model) {
        return _this.emit('load', err, model);
      };
    })(this));
  };

  ModelLoader.prototype.load = function(listener) {
    this.once('load', (function(_this) {
      return function() {
        var rest;
        rest = 1 <= arguments.length ? slice.call(arguments, 0) : [];
        _this.isLoading = false;
        return listener.apply(null, rest);
      };
    })(this));
    if (!this.isLoading) {
      this.isLoading = true;
      return load_.call(this);
    }
  };

  return ModelLoader;

})(EventEmitter);
