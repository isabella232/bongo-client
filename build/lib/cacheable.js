var ModelLoader, async, getModelLoader, handleBatch, handleByName, handleSingle;

async = require('async');

ModelLoader = require('./modelloader');

module.exports = function() {
  switch (arguments.length) {
    case 2:
      return handleBatch.apply(this, arguments);
    case 3:
      return handleSingle.apply(this, arguments);
    default:
      throw new Error('Bongo#cacheable expects either 2 or 3 arguments.');
  }
};

getModelLoader = (function() {
  var loading_;
  loading_ = {};
  return function(constructor, id) {
    var base, loader, name1;
    loading_[name1 = constructor.name] || (loading_[name1] = {});
    return loader = (base = loading_[constructor.name])[id] || (base[id] = new ModelLoader(constructor, id));
  };
})();

handleByName = function(strName, callback) {
  if ('function' === typeof this.fetchName) {
    return this.fetchName(strName, callback);
  } else {
    return callback(new Error('Client must provide an implementation of fetchName!'));
  }
};

handleSingle = function(constructorName, _id, callback) {
  var constructor, model;
  constructor = 'string' === typeof constructorName ? this.api[constructorName] : 'function' === typeof constructorName ? constructorName : void 0;
  if (!constructor) {
    callback(new Error("Unknown type " + constructorName));
  } else {
    constructor.cache || (constructor.cache = {});
    if (model = constructor.cache[_id]) {
      callback(null, model);
    } else {
      getModelLoader(constructor, _id).load(function(err, model) {
        if (err != null) {
          return callback(err);
        }
        if (model == null) {
          return callback(new Error("Cacheable error: Not found:\n  constructor: " + constructor.name + "\n  id: " + _id));
        }
        constructor.cache[_id] = model;
        return callback(null, model);
      });
    }
  }
};

handleBatch = function(batch, callback) {
  var models, queue;
  if ('string' === typeof batch) {
    return handleByName.call(this, batch, callback);
  }
  models = [];
  queue = batch.map((function(_this) {
    return function(single, i) {
      return function(done) {
        var constructorName, id, name, type;
        name = single.name, type = single.type, constructorName = single.constructorName, id = single.id;
        return handleSingle.call(_this, type || name || constructorName, id, function(err, model) {
          if (err) {
            return callback(err);
          } else {
            models[i] = model;
            return done();
          }
        });
      };
    };
  })(this));
  return async.parallel(queue, function() {
    return callback(null, models);
  });
};
