var Rest, Signature,
  __slice = [].slice;

Rest = require('./rest');

module.exports = Signature = (function() {
  var arrayRe, interpretType, restRe;

  arrayRe = /^\[(.)\]$/;

  restRe = /^R\((.)\)$/;

  function Signature(signatureStr) {
    var i, rest, type, _i, _len, _ref;
    if (!(this instanceof Signature)) {
      return new Signature(signatureStr);
    }
    this.paramTypes = (signatureStr.split(',')).map(interpretType);
    _ref = this.paramTypes;
    for (i = _i = 0, _len = _ref.length; _i < _len; i = ++_i) {
      type = _ref[i];
      if (!type.isRest) {
        continue;
      }
      if (rest) {
        throw new Error("Multiple rest parameters are not allowed.");
      }
      this.restParamType = type;
      this.restParamIndex = i;
      this.paramTypesBefore = this.paramTypes.slice(0, i);
      this.paramTypesAfter = this.paramTypes.slice(i + 1, +this.paramTypes.length + 1 || 9e9);
      rest = true;
    }
  }

  Signature.prototype.hasCallback = function() {
    return this.paramTypes[this.paramTypes.length - 1] === Function;
  };

  Signature.prototype.spread = function() {
    var rest;
    rest = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
    return this.test(rest);
  };

  Signature.prototype.test = function(params) {
    if (!this.testLength(params)) {
      return false;
    }
    if (this.restParamType != null) {
      return this.testWithRest(params);
    } else {
      return this.testEach(params);
    }
  };

  Signature.prototype.testEach = function(params, types) {
    var i, param, _i, _len, _ref;
    if (types == null) {
      types = this.paramTypes;
    }
    for (i = _i = 0, _len = params.length; _i < _len; i = ++_i) {
      param = params[i];
      if (!this.testType(param, (_ref = types[i]) != null ? _ref : types.tag)) {
        return false;
      }
    }
    return true;
  };

  Signature.prototype.testWithRest = function(params) {
    var after, i, paramsAfter, paramsBefore, restParam;
    i = this.restParamIndex;
    after = params.length - this.paramTypesAfter.length;
    paramsBefore = params.slice(0, i);
    restParam = params.slice(i, after);
    paramsAfter = params.slice(after, params.length);
    if (!this.testEach(paramsBefore, this.paramTypesBefore)) {
      return false;
    }
    if (!this.testEach(restParam, this.restParamType)) {
      return false;
    }
    if (!this.testEach(paramsAfter, this.paramTypesAfter)) {
      return false;
    }
    return true;
  };

  Signature.prototype.testLength = function(params) {
    if (this.restParamType != null) {
      return this.paramTypesBefore.length + this.paramTypesAfter.length <= params.length;
    } else {
      return this.paramTypes.length === params.length;
    }
  };

  Signature.prototype.testType = function(param, type) {
    var p, _i, _len;
    switch (false) {
      case !(param === null || param === void 0):
        return true;
      case type !== Boolean:
        return 'boolean' === typeof param;
      case type !== Number:
        return 'number' === typeof param;
      case type !== String:
        return 'string' === typeof param;
      case type !== Function:
        return 'function' === typeof param;
      case type !== Object:
        return (Object(param)) === param;
      case !Array.isArray(type):
        if (!Array.isArray(param)) {
          return false;
        }
        for (_i = 0, _len = param.length; _i < _len; _i++) {
          p = param[_i];
          if (!this.testType(p, type[0])) {
            return false;
          }
        }
        return true;
      default:
        return false;
    }
  };

  interpretType = function(typeStr) {
    var arrType, m, restType, _;
    switch (false) {
      case typeStr !== 'O':
        return Object;
      case typeStr !== 'F':
        return Function;
      case typeStr !== 'B':
        return Boolean;
      case typeStr !== 'N':
        return Number;
      case typeStr !== 'S':
        return String;
      case !(m = typeStr.match(arrayRe)):
        _ = m[0], arrType = m[1];
        return [interpretType(arrType)];
      case !(m = typeStr.match(restRe)):
        _ = m[0], restType = m[1];
        return new Rest(interpretType(restType));
      default:
        throw new Error("Couldn't interpret type: type");
    }
  };

  return Signature;

})();
