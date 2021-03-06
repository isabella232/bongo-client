{Scrubber} = require 'dnode-protocol'

module.exports = class BongoScrubber extends Scrubber

  noop = ->

  error =(message)-> throw new Error message

  createFailHandler =(fn)->
    (rest...)->
      [err] = rest
      fn rest...  if err?

  compensateForLatency =(cursor)->
    {node} = cursor
    if node and 'object' is typeof node and 'compensate' of node
      node.compensate()
      hasFailMethod       = 'fail' of node
      hasFinalizeMethod   = 'finalize' of node
      if hasFinalizeMethod and hasFailMethod
        error 'Provide a handler only for finalize, or fail, not both'
      if hasFailMethod
        cursor.update createFailHandler node.fail
      else if hasFinalizeMethod
        cursor.update node.finalize
      else
        cursor.update noop

  constructor:->
    super
    @unshift compensateForLatency
