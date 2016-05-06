var Promise,
  slice = [].slice;

Promise = require('bluebird');

module.exports = function(fn) {
  var hasMandatoryCallback;
  hasMandatoryCallback = fn.signatures[0].hasCallback();
  return function() {
    var args, callback;
    args = 1 <= arguments.length ? slice.call(arguments, 0) : [];
    if ('function' === typeof args[args.length - 1]) {
      callback = args.pop();
    }
    return new Promise((function(_this) {
      return function(resolve, reject) {
        if (hasMandatoryCallback) {
          return fn.call.apply(fn, [_this].concat(slice.call(args), [function() {
            var err, rest, result;
            err = arguments[0], result = arguments[1], rest = 3 <= arguments.length ? slice.call(arguments, 2) : [];
            switch (false) {
              case err == null:
                return reject(err);
              case !rest.length:
                console.warn(new Error("Trailing callback parameters detected!"));
                return resolve(result);
              default:
                return resolve(result);
            }
          }]));
        } else {
          fn.apply(_this, args);
          return resolve();
        }
      };
    })(this)).nodeify(callback);
  };
};
