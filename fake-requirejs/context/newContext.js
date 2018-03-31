const Context = require('./context')
const Module = require('./module')
function newContext(contextName) {
    var inCheckLoaded
    var handlers
    var checkLoadedTimeoutId
    var config = {
        //Defaults. Do not set a default for map
        //config to speed up normalize(), which
        //will run faster if there is no default.
        waitSeconds: 7,
        baseUrl: './',
        paths: {},
        bundles: {},
        pkgs: {},
        shim: {},
        config: {}
    }
    var registry = {}
    //registry of just enabled modules, to speed
    //cycle breaking code when lots of modules
    //are registered, but not activated.
    var enabledRegistry = {}
    var undefEvents = {}
    var defQueue = []
    var defined = {}
    var urlFetched = {}
    var bundlesMap = {}
    var requireCounter = 1
    var unnormalizedCounter = 1

    
    const context = new Context(config, contextName, registry, defined, urlFetched, defQueue, bundlesMap, Module)

    context.require = context.makeRequire();
    return context;
}


module.exports = newContext