
Rest = require './rest'

module.exports = class Signature

  arrayRe = /^\[(.)\]$/
  restRe = /^R\((.)\)$/

  constructor: (signatureStr) ->
    return new Signature signatureStr  unless this instanceof Signature

    @paramTypes = (signatureStr.split ',').map interpretType

    for type, i in @paramTypes when type.isRest
      throw new Error "Multiple rest parameters are not allowed."  if rest

      @restParamType    = type
      @restParamIndex   = i
      @paramTypesBefore = @paramTypes[0...i]
      @paramTypesAfter  = @paramTypes[i + 1..@paramTypes.length]

      rest = yes

  hasCallback: -> @paramTypes[@paramTypes.length - 1] is Function

  spread: (rest...) -> @test rest

  test: (params) ->
    return no  unless @testLength params

    if    @restParamType?
    then  @testWithRest params
    else  @testEach params

  testEach: (params, types = @paramTypes) ->
    for param, i in params when not @testType param, types[i] ? types.tag
      return no
    return yes

  testWithRest: (params) ->
    i             = @restParamIndex
    after         = params.length - @paramTypesAfter.length

    paramsBefore  = params[0...i]
    restParam     = params[i...after]
    paramsAfter   = params[after...params.length]

    return no  unless @testEach paramsBefore, @paramTypesBefore
    return no  unless @testEach restParam,    @restParamType
    return no  unless @testEach paramsAfter,  @paramTypesAfter
    return yes # by process of elimination...

  testLength: (params) ->
    if @restParamType?
      # rest params can be zero or more in number:
      @paramTypesBefore.length + @paramTypesAfter.length <= params.length
    else
      # otherwise, the length must match exactly:
      @paramTypes.length is params.length

  testType: (param, type) -> switch
    when param is null or param is undefined
      # NOTE: any "type" can hold the null value.
      yes

    # NOTE: I don't care about boxed primitives (number, string, boolean)
    # (don't use them). In practice, these will only be called by our own RPC
    # system, which will never use boxed primitives.
    when type is Boolean
      return 'boolean' is typeof param

    when type is Number
      return 'number' is typeof param

    when type is String
      # ObjectIds come as strings from the client
      return 'string' is typeof param

    when type is Function
      return 'function' is typeof param

    # NOTE: this is, so far as I know, the most specific check we can do.
    when type is Object
      return (Object param) is param

    when Array.isArray type
      return no  unless Array.isArray param
      return no  for p in param when not @testType p, type[0]
      # by process of elimination, we know that no element doesn't match the tag:
      return yes

    else return no

  interpretType = (typeStr) -> switch
    when typeStr is 'O' then Object
    when typeStr is 'F' then Function
    when typeStr is 'B' then Boolean
    when typeStr is 'N' then Number
    when typeStr is 'S' then String
    when (m = typeStr.match arrayRe)
      [ _, arrType ] = m
      [ interpretType arrType ]
    when (m = typeStr.match restRe)
      [ _, restType ] = m
      new Rest interpretType restType
    else throw new Error "Couldn't interpret type: type"
