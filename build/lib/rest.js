var Rest;

module.exports = Rest = (function() {
  function Rest(paramType) {
    this.paramType = paramType;
  }

  Rest.prototype.isRest = true;

  return Rest;

})();
