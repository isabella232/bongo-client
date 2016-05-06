var OpaqueType,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

module.exports = OpaqueType = (function() {
  function OpaqueType(type) {
    var konstructor;
    konstructor = Function("return function " + type + "() {}")();
    extend(konstructor, OpaqueType);
    return konstructor;
  }

  OpaqueType.isOpaque = function() {
    return true;
  };

  return OpaqueType;

})();
