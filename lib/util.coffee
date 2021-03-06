'use strict'

extend = (obj, rest...)->
  for source in rest
    obj[key] = val for key, val of source
  obj

asynchronizeOwnMethods = (ofObject)->
  result = {}
  Object.keys(ofObject).forEach (key)->
    if 'function' is typeof fn = ofObject[key]
      result[key] = (rest..., callback)->
        callback fn rest...
  result

module.exports = { extend, asynchronizeOwnMethods }
