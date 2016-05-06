'use strict';
var asynchronizeOwnMethods, extend,
  slice = [].slice;

extend = function() {
  var i, key, len, obj, rest, source, val;
  obj = arguments[0], rest = 2 <= arguments.length ? slice.call(arguments, 1) : [];
  for (i = 0, len = rest.length; i < len; i++) {
    source = rest[i];
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
        var callback, i, rest;
        rest = 2 <= arguments.length ? slice.call(arguments, 0, i = arguments.length - 1) : (i = 0, []), callback = arguments[i++];
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
