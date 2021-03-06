async = require 'async'

ModelLoader = require './modelloader'


module.exports = ->
  switch arguments.length
    when 2
      handleBatch.apply this, arguments
    when 3
      handleSingle.apply this, arguments
    else
      throw new Error 'Bongo#cacheable expects either 2 or 3 arguments.'


getModelLoader = do ->
  loading_ = {}
  (constructor, id)->
    loading_[constructor.name] or= {}
    loader = loading_[constructor.name][id] or= new ModelLoader(constructor, id)


handleByName =(strName, callback)->
  if 'function' is typeof @fetchName then @fetchName strName, callback
  else callback new Error 'Client must provide an implementation of fetchName!'


handleSingle =(constructorName, _id, callback)->
  # TODO: this implementation sucks; reimplement.
  constructor =
    if 'string' is typeof constructorName
      @api[constructorName]
    else if 'function' is typeof constructorName
      constructorName
  unless constructor
    callback new Error "Unknown type #{constructorName}"
  else
    constructor.cache or= {}
    if model = constructor.cache[_id]
      callback null, model
    else getModelLoader(constructor, _id).load (err, model)->
      return callback err  if err?
      return callback new Error """
        Cacheable error: Not found:
          constructor: #{ constructor.name }
          id: #{ _id }
        """ unless model?
      constructor.cache[_id] = model
      callback null, model
  return


handleBatch = (batch, callback) ->
  return handleByName.call this, batch, callback  if 'string' is typeof batch

  models = []

  queue = batch.map (single, i) => (done) =>
    {name, type, constructorName, id} = single
    handleSingle.call this, type or name or constructorName, id, (err, model) ->
      if err then callback err
      else
        models[i] = model
        done()

  async.parallel queue, -> callback null, models
