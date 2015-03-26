var BongoScrubber, Scrubber,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  __slice = [].slice;

Scrubber = require('dnode-protocol').Scrubber;

module.exports = BongoScrubber = (function(_super) {
  var compensateForLatency, createFailHandler, error, noop;

  __extends(BongoScrubber, _super);

  noop = function() {};

  error = function(message) {
    throw new Error(message);
  };

  createFailHandler = function(fn) {
    return function() {
      var err, rest;
      rest = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      err = rest[0];
      if (err != null) {
        return fn.apply(null, rest);
      }
    };
  };

  compensateForLatency = function(cursor) {
    var hasFailMethod, hasFinalizeMethod, node;
    node = cursor.node;
    if (node && 'object' === typeof node && 'compensate' in node) {
      node.compensate();
      hasFailMethod = 'fail' in node;
      hasFinalizeMethod = 'finalize' in node;
      if (hasFinalizeMethod && hasFailMethod) {
        error('Provide a handler only for finalize, or fail, not both');
      }
      if (hasFailMethod) {
        return cursor.update(createFailHandler(node.fail));
      } else if (hasFinalizeMethod) {
        return cursor.update(node.finalize);
      } else {
        return cursor.update(noop);
      }
    }
  };

  function BongoScrubber() {
    BongoScrubber.__super__.constructor.apply(this, arguments);
    this.unshift(compensateForLatency);
  }

  return BongoScrubber;

})(Scrubber);
