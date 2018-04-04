/**
 * Sea.js 2.2.3 | seajs.org/LICENSE.md
 */

(function (global, undefined) {
    // global 即 window
    window.log = console.log
    
    // 避免重复加载 seajs
    if (global.seajs) {
        return
    }
    
    /**
     * util-lang.js - The minimal language enhancement
     */

    
    
    // seajs class
    class Seajs {
        constructor() {
            // The current version of Sea.js being used
            this.version = '2.2.3'
            this.data = {
                events: {},
                 _cid: 0,
                cid: function() {
                    return this._cid++
                }
            }
        }
        
        // 注册事件
        // events 形如 {eventName: [callback, ...,]}
        on(name, callback) {
            const {events} = this.data
            // 回调列表
            let list
            if(events[name] === undefined) {
                events[name] = []
            } else {
                list = events[name]
    
            }
            // 注册回调
            list.push(callback)
            return this
        }
        
        // 移除事件
        off(name, callback) {
            const {events} = this.data
            // 如果 name 和 callback 都不指定, 则移除所有事件的所有回调
            if (name === undefined && callback === undefined) {
                this.data.events = {}
                return this
            }
            
            let list = events[name]
            if (list) {
                if (callback) {
                    // 指定 name 和 callback
                    for (let i = list.length - 1; i >= 0; i--) {
                        if (list[i] === callback) {
                            list.splice(i, 1)
                        }
                    }
                } else {
                    // 如果只指定 name, 则移除该事件的所有回调
                    delete events[name]
                }
            }
            
            return this
        }
        
        // 触发事件调用回调
        emit(name, data) {
            const {events} = this.data
            // 回调列表
            let list = events[name]
            let fn
            
            if (list) {
                // 复制列表
                list = list.slice()
                // 执行所有回调
                while ((fn = list.shift())) {
                    fn(data)
                }
            }
            
            return this
        }
        
        _parseAlias(id) {
            // TODO
            
            var {alias} = this.data
            return alias && Type.isString(alias[id]) ? alias[id] : id
        }
    
        _parsePaths (id) {
            var PATHS_RE = /^([^/:]+)(\/.+)$/
            var paths = this.data.paths
            var m
            
            if (paths && (m = id.match(PATHS_RE)) && Type.isString(paths[m[1]])) {
                id = paths[m[1]] + m[2]
            }
            
            return id
        }
        
        _parseVars (id) {
            var vars = this.data.vars
            var VARS_RE = /{([^{]+)}/g
            if (vars && id.indexOf('{') > -1) {
                id = id.replace(VARS_RE, function (m, key) {
                    return Type.isString(vars[key]) ? vars[key] : m
                })
            }
            
            return id
        }
        
        _parseMap (uri) {
            var map = this.data.map
            var ret = uri
            
            if (map) {
                for (var i = 0, len = map.length; i < len; i++) {
                    var rule = map[i]
                    
                    ret = Type.isFunction(rule) ? (rule(uri) || uri) : uri.replace(rule[0], rule[1])
                    
                    // Only apply the first matched rule
                    if (ret !== uri) break
                }
            }
            
            return ret
        }
        
        // Canonicalize a path
        // realpath("http://test.com/a//./b/../c") ==> "http://test.com/a/c"
        _realpath (path) {
            var DOT_RE = /\/\.\//g
            var DOUBLE_DOT_RE = /\/[^/]+\/\.\.\//
            var DOUBLE_SLASH_RE = /([^:/])\/\//g
    
    
            // /a/b/./c/./d ==> /a/b/c/d
            path = path.replace(DOT_RE, '/')
            
            // a/b/c/../../d  ==>  a/b/../d  ==>  a/d
            while (path.match(DOUBLE_DOT_RE)) {
                path = path.replace(DOUBLE_DOT_RE, '/')
            }
            
            // a//b/c  ==>  a/b/c
            path = path.replace(DOUBLE_SLASH_RE, '$1/')
            
            return path
        }
        
        _addBase (id, refUri) {
            var ABSOLUTE_RE = /^\/\/.|:\//
            var ROOT_DIR_RE = /^.*?\/\/.*?\//
            var ret
            var first = id.charAt(0)
            const {data }= this
            
            // Absolute
            if (ABSOLUTE_RE.test(id)) {
                ret = id
            }
            // Relative
            else if (first === '.') {
                ret = this._realpath((refUri ? this._dirname(refUri) : data.cwd) + id)
            }
            // Root
            else if (first === '/') {
                var m = data.cwd.match(ROOT_DIR_RE)
                ret = m ? m[0] + id.substring(1) : id
            }
            // Top-level
            else {
                ret = data.base + id
            }
            
            // Add default protocol when uri begins with "//"
            if (ret.indexOf('//') === 0) {
                ret = location.protocol + ret
            }
            
            return ret
        }
        
        
        // Normalize an id
        // normalize("path/to/a") ==> "path/to/a.js"
        // NOTICE: substring is faster than negative slice and RegExp
        _normalize (path) {
            var last = path.length - 1
            var lastC = path.charAt(last)
            
            // If the uri ends with `#`, just return it without '#'
            if (lastC === '#') {
                return path.substring(0, last)
            }
            
            return (path.substring(last - 2) === '.js' ||
              path.indexOf('?') > 0 ||
              path.substring(last - 3) === '.css' ||
              lastC === '/') ? path : path + '.js'
        }
        
        // For Developers
        resolve (id, refUri) {
            // const {_parseAlias, _parsePaths, _parseVars, _addBase, _parseMap, } = this
            if (!id) return ''
            
            id = this._parseAlias(id)
            id = this._parsePaths(id)
            id = this._parseVars(id)
            id = this._normalize(id)
            
            var uri = this._addBase(id, refUri)
            uri = this._parseMap(uri)
            
            return uri
        }
        
        addOnload (node, callback, isCSS, url) {
            var supportOnload = 'onload' in node
            
            // for Old WebKit and Old Firefox
            if (isCSS && (isOldWebKit || !supportOnload)) {
                setTimeout(function () {
                    pollCss(node, callback)
                }, 1) // Begin after node insertion
                return
            }
            
            if (supportOnload) {
                node.onload = onload
                node.onerror = function () {
                    this.emit('error', { uri: url, node: node })
                    onload()
                }
            }
            else {
                node.onreadystatechange = function () {
                    if (/loaded|complete/.test(node.readyState)) {
                        onload()
                    }
                }
            }
            
            function onload () {
                // Ensure only run once and handle memory leak in IE
                node.onload = node.onerror = node.onreadystatechange = null
                
                // Remove the script to reduce memory leak
                if (!isCSS && !seajs.data.debug) {
                    head.removeChild(node)
                }
                
                // Dereference the node
                node = null
                
                callback()
            }
        }
        
        // For Developers
        request (url, callback, charset, crossorigin) {
            var IS_CSS_RE = /\.css(?:\?|$)/i
            var isCSS = IS_CSS_RE.test(url)
            var node = document.createElement(isCSS ? 'link' : 'script')
            var head = document.head || document.getElementsByTagName('head')[0] || document.documentElement
            var baseElement = head.getElementsByTagName('base')[0]
            
            if (charset) {
                node.charset = charset
            }
            
            // crossorigin default value is `false`.
            if (!Type.isUndefined(crossorigin)) {
                node.setAttribute('crossorigin', crossorigin)
            }
            
            this.addOnload(node, callback, isCSS, url)
            
            if (isCSS) {
                node.rel = 'stylesheet'
                node.href = url
            }
            else {
                node.async = true
                node.src = url
            }
            
            // For some cache cases in IE 6-8, the script executes IMMEDIATELY after
            // the end of the insert execution, so use `currentlyAddingScript` to
            // hold current node, for deriving url in `define` call
            currentlyAddingScript = node
            
            // ref: #185 & http://dev.jquery.com/ticket/2709
            baseElement ? head.insertBefore(node, baseElement) : head.appendChild(node)
            
            currentlyAddingScript = null
        }
    
        use (ids, callback) {
            const self = this
            Module.preload(function () {
                Module.use(ids, callback, seajs.data.cwd + '_use_' + self.data.cid())
            })
            return seajs
        }
        
        
        setData() {
            var BASE_RE = /^(.+?\/)(\?\?)?(seajs\/)+/
            var cwd = this._dirname(document.URL)
            var scripts = document.scripts
            
            // Recommend to add `seajsnode` id for the `sea.js` script element
            var loaderScript = document.getElementById('seajsnode') || scripts[scripts.length - 1]
            
            // When `sea.js` is inline, set loaderDir to current working directory
            var loaderDir = this._dirname(getScriptAbsoluteSrc(loaderScript) || cwd)
            
            function getScriptAbsoluteSrc (node) {
                return node.hasAttribute ? // non-IE6/7
                  node.src : // see http://msdn.microsoft.com/en-us/library/ms536429(VS.85).aspx
                  node.getAttribute('src', 4)
            }
            
            
            // The root path to use for id2uri parsing
            // If loaderUri is `http://test.com/libs/seajs/[??][seajs/1.2.3/]sea.js`, the
            // baseUri should be `http://test.com/libs/`
            seajs.data.base = (loaderDir.match(BASE_RE) || ['', loaderDir])[1]
            
            // The loader directory
            seajs.data.dir = loaderDir
            
            // The current working directory
            seajs.data.cwd = cwd
            
            // The charset for requesting files
            seajs.data.charset = 'utf-8'
            
            // The CORS options, Do't set CORS on default.
            //data.crossorigin = undefined
            
            // Modules that are needed to load before all other modules
            seajs.data.preload = (function () {
                var plugins = []
                
                // Convert `seajs-xxx` to `seajs-xxx=1`
                // NOTE: use `seajs-xxx=1` flag in uri or cookie to preload `seajs-xxx`
                var str = location.search.replace(/(seajs-\w+)(&|$)/g, '$1=1$2')
                
                // Add cookie string
                str += ' ' + document.cookie
                
                // Exclude seajs-xxx=0
                str.replace(/(seajs-\w+)=1/g, function (m, name) {
                    plugins.push(name)
                })
                
                return plugins
            })()
            
            // data.alias - An object containing shorthands of module id
            // data.paths - An object containing path shorthands in module id
            // data.vars - The {xxx} variables in module id
            // data.map - An array containing rules to map module uri
            // data.debug - Debug mode. The default value is false
        }
        
        
        // Extract the directory portion of a path
        // _dirname("a/b/c.js?t=123#xx/zz") ==> "a/b/"
        // ref: http://jsperf.com/regex-vs-split/2
        _dirname (path) {
            var DIRNAME_RE = /[^?#]*\//
            return path.match(DIRNAME_RE)[0]
        }
        
        config (configData) {
        
            for (var key in configData) {
                var curr = configData[key]
                var prev = seajs.data[key]
                
                // Merge object config such as alias, vars
                if (prev && Type.isObject(prev)) {
                    for (var k in curr) {
                        prev[k] = curr[k]
                    }
                }
                else {
                    // Concat array config such as map, preload
                    if (Type.isArray(prev)) {
                        curr = prev.concat(curr)
                    }
                    // Make sure that `data.base` is an absolute path
                    else if (key === 'base') {
                        // Make sure end with "/"
                        if (curr.slice(-1) !== '/') {
                            curr += '/'
                        }
                        curr = this._addBase(curr)
                    }
                    
                    // Set config
                    seajs.data[key] = curr
                }
            }
            
            this.emit('config', configData)
            return seajs
        }
    }
    
    const seajs = new Seajs()
    
    
    /**
     * util-path.js - The utilities for operating path such as id, uri
     */
    
    
    /**
     * util-request.js - The utilities for requesting script and style files
     * ref: tests/research/load-js-css/test.html
     */
    
    var head = document.head || document.getElementsByTagName('head')[0] || document.documentElement
    
    var currentlyAddingScript
    var interactiveScript
    
    // `onload` event is not supported in WebKit < 535.23 and Firefox < 9.0
    // ref:
    //  - https://bugs.webkit.org/show_activity.cgi?id=38995
    //  - https://bugzilla.mozilla.org/show_bug.cgi?id=185236
    //  - https://developer.mozilla.org/en/HTML/Element/link#Stylesheet_load_events
    var isOldWebKit = +navigator.userAgent
      .replace(/.*(?:AppleWebKit|AndroidWebKit)\/(\d+).*/, '$1') < 536
    
    function pollCss (node, callback) {
        var sheet = node.sheet
        var isLoaded
        
        // for WebKit < 536
        if (isOldWebKit) {
            if (sheet) {
                isLoaded = true
            }
        }
        // for Firefox < 9.0
        else if (sheet) {
            try {
                if (sheet.cssRules) {
                    isLoaded = true
                }
            } catch (ex) {
                // The value of `ex.name` is changed from "NS_ERROR_DOM_SECURITY_ERR"
                // to "SecurityError" since Firefox 13.0. But Firefox is less than 9.0
                // in here, So it is ok to just rely on "NS_ERROR_DOM_SECURITY_ERR"
                if (ex.name === 'NS_ERROR_DOM_SECURITY_ERR') {
                    isLoaded = true
                }
            }
        }
        
        setTimeout(function () {
            if (isLoaded) {
                // Place callback here to give time for style rendering
                callback()
            }
            else {
                pollCss(node, callback)
            }
        }, 20)
    }
    
    function getCurrentScript () {
        if (currentlyAddingScript) {
            return currentlyAddingScript
        }
        
        // For IE6-9 browsers, the script onload event may not fire right
        // after the script is evaluated. Kris Zyp found that it
        // could query the script nodes and the one that is in "interactive"
        // mode indicates the current script
        // ref: http://goo.gl/JHfFW
        if (interactiveScript && interactiveScript.readyState === 'interactive') {
            return interactiveScript
        }
        
        var scripts = head.getElementsByTagName('script')
        
        for (var i = scripts.length - 1; i >= 0; i--) {
            var script = scripts[i]
            if (script.readyState === 'interactive') {
                interactiveScript = script
                return interactiveScript
            }
        }
    }
    
    // For Developers
    // seajs.request = request
    
    /**
     * util-deps.js - The parser for dependencies
     * ref: tests/research/parse-dependencies/test.html
     */
    
    var REQUIRE_RE = /"(?:\\"|[^"])*"|'(?:\\'|[^'])*'|\/\*[\S\s]*?\*\/|\/(?:\\\/|[^\/\r\n])+\/(?=[^\/])|\/\/.*|\.\s*require|(?:^|[^$])\brequire\s*\(\s*(["'])(.+?)\1\s*\)/g
    var SLASH_RE = /\\\\/g
    
    function parseDependencies (code) {
        var ret = []
        
        code.replace(SLASH_RE, '')
          .replace(REQUIRE_RE, function (m, m1, m2) {
              if (m2) {
                  ret.push(m2)
              }
          })
        
        return ret
    }
    
    /**
     * module.js - The core of module loader
     */
    
    var cachedMods = seajs.cache = {}
    var anonymousMeta
    
    var fetchingList = {}
    var fetchedList = {}
    var callbackList = {}
    
    
    class Module {
        constructor(uri, deps) {
            this.uri = uri
            this.dependencies = deps || []
            this.exports = null
            this.status = 0
            
            // Who depends on me
            this._waitings = {}
            
            // The number of unloaded dependencies
            this._remain = 0
        }
        
        
        // Resolve module.dependencies
        resolve() {
            var mod = this
            var ids = mod.dependencies
            var uris = []
            
            for (var i = 0, len = ids.length; i < len; i++) {
                uris[i] = Module.resolve(ids[i], mod.uri)
            }
            return uris
        }
        
         // Load module.dependencies and fire onload when all done
        load() {
            var mod = this
            
            // If the module is being loaded, just wait it onload call
            if (mod.status >= STATUS.LOADING) {
                return
            }
            
            mod.status = STATUS.LOADING
            
            // Emit `load` event for plugins such as combo plugin
            var uris = mod.resolve()
            seajs.emit('load', uris)
            
            var len = mod._remain = uris.length
            var m
            
            // Initialize modules and register waitings
            for (var i = 0; i < len; i++) {
                m = Module.get(uris[i])
                
                if (m.status < STATUS.LOADED) {
                    // Maybe duplicate: When module has dupliate dependency, it should be it's count, not 1
                    m._waitings[mod.uri] = (m._waitings[mod.uri] || 0) + 1
                }
                else {
                    mod._remain--
                }
            }
            
            if (mod._remain === 0) {
                mod.onload()
                return
            }
            
            // Begin parallel loading
            var requestCache = {}
            
            for (i = 0; i < len; i++) {
                m = cachedMods[uris[i]]
                
                if (m.status < STATUS.FETCHING) {
                    m.fetch(requestCache)
                }
                else if (m.status === STATUS.SAVED) {
                    m.load()
                }
            }
            
            // Send all requests at last to avoid cache bug in IE6-9. Issues#808
            for (var requestUri in requestCache) {
                if (requestCache.hasOwnProperty(requestUri)) {
                    requestCache[requestUri]()
                }
            }
        }
        
        // Call this method when module is loaded
        onload() {
            var mod = this
            mod.status = STATUS.LOADED
            
            if (mod.callback) {
                mod.callback()
            }
            
            // Notify waiting modules to fire onload
            var waitings = mod._waitings
            var uri, m
            
            for (uri in waitings) {
                if (waitings.hasOwnProperty(uri)) {
                    m = cachedMods[uri]
                    m._remain -= waitings[uri]
                    if (m._remain === 0) {
                        m.onload()
                    }
                }
            }
            
            // Reduce memory taken
            delete mod._waitings
            delete mod._remain
        }
        
        // Fetch a module
        fetch(requestCache) {
            var mod = this
            var uri = mod.uri
            
            mod.status = STATUS.FETCHING
            
            // Emit `fetch` event for plugins such as combo plugin
            var emitData = { uri: uri }
            seajs.emit('fetch', emitData)
            var requestUri = emitData.requestUri || uri
            
            // Empty uri or a non-CMD module
            if (!requestUri || fetchedList[requestUri]) {
                mod.load()
                return
            }
            
            if (fetchingList[requestUri]) {
                callbackList[requestUri].push(mod)
                return
            }
            
            fetchingList[requestUri] = true
            callbackList[requestUri] = [mod]
            
            // Emit `request` event for plugins such as text plugin
            seajs.emit('request', emitData = {
                uri: uri,
                requestUri: requestUri,
                onRequest: onRequest,
                charset: Type.isFunction(seajs.data.charset) ? seajs.data.charset(requestUri) : seajs.data.charset,
                crossorigin: Type.isFunction(seajs.data.crossorigin) ? seajs.data.crossorigin(requestUri) : seajs.data.crossorigin
            })
            
            if (!emitData.requested) {
                requestCache ? requestCache[emitData.requestUri] = sendRequest : sendRequest()
            }
            
            function sendRequest () {
                seajs.request(emitData.requestUri, emitData.onRequest, emitData.charset, emitData.crossorigin)
            }
            
            function onRequest () {
                delete fetchingList[requestUri]
                fetchedList[requestUri] = true
                
                // Save meta data of anonymous module
                if (anonymousMeta) {
                    Module.save(uri, anonymousMeta)
                    anonymousMeta = null
                }
                
                // Call callbacks
                var m, mods = callbackList[requestUri]
                delete callbackList[requestUri]
                while ((m = mods.shift())) m.load()
            }
        }
        
        // Execute a module
        exec() {
            var mod = this
            
            // When module is executed, DO NOT execute it again. When module
            // is being executed, just return `module.exports` too, for avoiding
            // circularly calling
            if (mod.status >= STATUS.EXECUTING) {
                return mod.exports
            }
            
            mod.status = STATUS.EXECUTING
            
            // Create require
            var uri = mod.uri
            
            function require (id) {
                return Module.get(require.resolve(id)).exec()
            }
            
            require.resolve = function (id) {
                return Module.resolve(id, uri)
            }
            
            require.async = function (ids, callback) {
                Module.use(ids, callback, uri + '_async_' + seajs.data.cid())
                return require
            }
            
            // Exec factory
            var factory = mod.factory
            
            var exports = Type.isFunction(factory) ? factory(require, mod.exports = {}, mod) : factory
            
            if (exports === undefined) {
                exports = mod.exports
            }
            
            // Reduce memory leak
            delete mod.factory
            
            mod.exports = exports
            mod.status = STATUS.EXECUTED
            
            // Emit `exec` event
            seajs.emit('exec', mod)
            
            return exports
        }
        
        // Resolve id to uri
        static resolve(id, refUri) {
            // Emit `resolve` event for plugins such as text plugin
            var emitData = { id: id, refUri: refUri }
            seajs.emit('resolve', emitData)
            
            return emitData.uri || seajs.resolve(emitData.id, refUri)
        }
        
        // Define a module
        static define(id, deps, factory) {
            var argsLen = arguments.length
            
            // define(factory)
            if (argsLen === 1) {
                factory = id
                id = undefined
            }
            else if (argsLen === 2) {
                factory = deps
                
                // define(deps, factory)
                if (Type.isArray(id)) {
                    deps = id
                    id = undefined
                }
                // define(id, factory)
                else {
                    deps = undefined
                }
            }
            
            // Parse dependencies according to the module factory code
            if (!Type.isArray(deps) && Type.isFunction(factory)) {
                deps = parseDependencies(factory.toString())
            }
            
            var meta = {
                id: id,
                uri: Module.resolve(id),
                deps: deps,
                factory: factory
            }
            
            // Try to derive uri in IE6-9 for anonymous modules
            if (!meta.uri && document.attachEvent) {
                var script = getCurrentScript()
                
                if (script) {
                    meta.uri = script.src
                }
                
                // NOTE: If the id-deriving methods above is failed, then falls back
                // to use onload event to get the uri
            }
            
            // Emit `define` event, used in nocache plugin, seajs node version etc
            seajs.emit('define', meta)
            
            meta.uri ? Module.save(meta.uri, meta) : // Save information for "saving" work in the script onload event
              anonymousMeta = meta
        }
        
        // Save meta data to cachedMods
        static save(uri, meta) {
            var mod = Module.get(uri)
            
            // Do NOT override already saved modules
            if (mod.status < STATUS.SAVED) {
                mod.id = meta.id || uri
                mod.dependencies = meta.deps || []
                mod.factory = meta.factory
                mod.status = STATUS.SAVED
            }
        }
        
        // Get an existed module or create a new one
        static get(uri, deps) {
            return cachedMods[uri] || (cachedMods[uri] = new Module(uri, deps))
        }
        
        // Use function is equal to load a anonymous module
        static use(ids, callback, uri) {
            var mod = Module.get(uri, Type.isArray(ids) ? ids : [ids])
            
            mod.callback = function () {
                var exports = []
                var uris = mod.resolve()
                
                for (var i = 0, len = uris.length; i < len; i++) {
                    exports[i] = cachedMods[uris[i]].exec()
                }
                
                if (callback) {
                    callback.apply(global, exports)
                }
                
                delete mod.callback
            }
            
            mod.load()
        }
        
        // Load preload modules before all other modules
        static preload(callback) {
            const cid = seajs.data.cid
            var preloadMods = seajs.data.preload
            var len = preloadMods.length
            
            if (len) {
                Module.use(preloadMods, function () {
                    // Remove the loaded preload modules
                    preloadMods.splice(0, len)
                    
                    // Allow preload modules to add new preload modules
                    Module.preload(callback)
                }, seajs.data.cwd + '_preload_' + cid())
            }
            else {
                callback()
            }
        }
    
        
    }
    Module.STATUS = {
        // 1 - The `module.uri` is being fetched
        FETCHING: 1,
        // 2 - The meta data has been saved to cachedMods
        SAVED: 2,
        // 3 - The `module.dependencies` are being loaded
        LOADING: 3,
        // 4 - The module are ready to execute
        LOADED: 4,
        // 5 - The module is being executed
        EXECUTING: 5,
        // 6 - The `module.exports` is available
        EXECUTED: 6
    }
    
    var STATUS = Module.STATUS

    // Public API
    

    
    Module.define.cmd = {}
    global.define = Module.define
    
    // For Developers
    
    seajs.Module = Module
    seajs.data.fetchedList = fetchedList
    
    seajs.require = function (id) {
        var mod = Module.get(Module.resolve(id))
        if (mod.status < STATUS.EXECUTING) {
            mod.onload()
            mod.exec()
        }
        return mod.exports
    }
    
    /**
     * config.js - The configuration for the loader
     */
    
    
    
    
    
    seajs.setData()
    
    
    
    // seajs 定义为全局变量
    // 另一个全局变量是 define, 其他 api 都在 seajs 命名空间下
    global.seajs = seajs
})(this)
