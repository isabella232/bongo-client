'use strict'

module.exports = do->
  getPusherEvent =(event)->
    if Array.isArray(event)
      event = event.join ':'
    else event
  
  {defineProperty} = Object

  afterInit:do ->
    channels = {}
    ->
      {broadcastable} = @constructor
      id = @getId?() or @bongo_?.instanceId
      if broadcastable and id?
        name = "object-#{id}"
        defineProperty @, 'channel'
          value: channels[name] or= @mq.subscribe name
        @channel.bind 'updateInstance', (data)=> @update_(data)
  
  destroy:->
    @mq.unsubscribe "object-#{id}"
  
  on:(event, listener)->
    {constructor} = @
    event = getPusherEvent(event) 
    multiplex = @multiplexer.on event, ->
      constructor.wrapArgs [].slice.call(arguments), (args)-> listener args...
    @channel.bind event, multiplex if multiplex

  off:(event, listener)->
    # event = getPusherEvent(event)
    # listenerCount = @multiplexer.off event, listener
    # if listenerCount is 0
    #   @channel.unbind event, @multiplexer.events[event]