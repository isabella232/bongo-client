Promise = require 'bluebird'

module.exports = (fn) ->
  # if any signature takes a callback, the callback is mandatory:
  hasMandatoryCallback = fn.signatures[0].hasCallback()

  (args...) ->
    if 'function' is typeof args[args.length - 1]
      # save the provided callback.  we'll pass a shim callback regardless
      callback = args.pop()

    new Promise (resolve, reject) =>
      if hasMandatoryCallback
        fn.call this, args..., (err, result, rest...) -> switch
          when err?
            reject err
          when rest.length
            warn new Error "Trailing callback parameters detected!"
            resolve result
          else
            resolve result
      else # fire and forget
        fn.apply this, args
        resolve()
    .nodeify callback
