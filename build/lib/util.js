'use strict';
var asynchronizeOwnMethods, extend,
  __slice = [].slice;

extend = function() {
  var key, obj, rest, source, val, _i, _len;
  obj = arguments[0], rest = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
  for (_i = 0, _len = rest.length; _i < _len; _i++) {
    source = rest[_i];
    for (key in source) {
      val = source[key];
      obj[key] = val;
    }
  }
  return obj;
};

asynchronizeOwnMethods = function(ofObject) {
  var result;
  result = {};
  Object.keys(ofObject).forEach(function(key) {
    var fn;
    if ('function' === typeof (fn = ofObject[key])) {
      return result[key] = function() {
        var callback, rest, _i;
        rest = 2 <= arguments.length ? __slice.call(arguments, 0, _i = arguments.length - 1) : (_i = 0, []), callback = arguments[_i++];
        return callback(fn.apply(null, rest));
      };
    }
  });
  return result;
};

module.exports = {
  extend: extend,
  asynchronizeOwnMethods: asynchronizeOwnMethods
};
