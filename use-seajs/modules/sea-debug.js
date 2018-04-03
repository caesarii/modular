/**
 * Sea.js 2.2.3 | seajs.org/LICENSE.md
 */
(function (global, undefined) {
    // Avoid conflicting when `sea.js` is loaded multiple times
    if (global.seajs) {
        return
    }
    
    var seajs = global.seajs = {
        // The current version of Sea.js being used
        version: '2.2.3'
    }
    
    var data = seajs.data = {}
    
    /**
     * util-lang.js - The minimal language enhancement
     */
    
    function isType (type) {
        return function (obj) {
            return {}.toString.call(obj) == '[object ' + type + ']'
        }
    }
    
    var isObject = isType('Object')
    var isString = isType('String')
    var isArray = Array.isArray || isType('Array')
    var isFunction = isType('Function')
    var isUndefined = isType('Undefined')
    
    var _cid = 0
    function cid () {
        return _cid++
    }
    
    /**
     * util-events.js - The minimal events support
     */
    
    var events = data.events = {}
    
    // Bind event
    seajs.on = function (name, callback) {
        var list = events[name] || (events[name] = [])
        list.push(callback)
        return seajs
    }
    
    // Remove event. If `callback` is undefined, remove all callbacks for the
    // event. If `event` and `callback` are both undefined, remove all callbacks
    // for all events
    seajs.off = function (name, callback) {
        // Remove *all* events
        if (!(name || callback)) {
            events = data.events = {}
            return seajs
        }
        
        var list = events[name]
        if (list) {
            if (callback) {
                for (var i = list.length - 1; i >= 0; i--) {
                    if (list[i] === callback) {
                        list.splice(i, 1)
                    }
                }
            }
            else {
                delete events[name]
            }
        }
        
        return seajs
    }
    
    // Emit event, firing all bound callbacks. Callbacks receive the same
    // arguments as `emit` does, apart from the event name
    var emit = seajs.emit = function (name, data) {
        var list = events[name], fn
        
        if (list) {
            // Copy callback lists to prevent modification
            list = list.slice()
            
            // Execute event callbacks
            while ((fn = list.shift())) {
                fn(data)
            }
        }
        
        return seajs
    }
    
    /**
     * util-path.js - The utilities for operating path such as id, uri
     */
    
    var DIRNAME_RE = /[^?#]*\//
    
    var DOT_RE = /\/\.\//g
    var DOUBLE_DOT_RE = /\/[^/]+\/\.\.\//
    var DOUBLE_SLASH_RE = /([^:/])\/\//g
    
    // Extract the directory portion of a path
    // _dirname("a/b/c.js?t=123#xx/zz") ==> "a/b/"
    // ref: http://jsperf.com/regex-vs-split/2
    function dirname (path) {
        return path.match(DIRNAME_RE)[0]
    }
    
    // Canonicalize a path
    // realpath("http://test.com/a//./b/../c") ==> "http://test.com/a/c"
    function realpath (path) {
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
    
    // Normalize an id
    // normalize("path/to/a") ==> "path/to/a.js"
    // NOTICE: substring is faster than negative slice and RegExp
    function normalize (path) {
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
    
    var PATHS_RE = /^([^/:]+)(\/.+)$/
    var VARS_RE = /{([^{]+)}/g
    
    function parseAlias (id) {
        var alias = data.alias
        return alias && isString(alias[id]) ? alias[id] : id
    }
    
    function parsePaths (id) {
        var paths = data.paths
        var m
        
        if (paths && (m = id.match(PATHS_RE)) && isString(paths[m[1]])) {
            id = paths[m[1]] + m[2]
        }
        
        return id
    }
    
    function parseVars (id) {
        var vars = data.vars
        
        if (vars && id.indexOf('{') > -1) {
            id = id.replace(VARS_RE, function (m, key) {
                return isString(vars[key]) ? vars[key] : m
            })
        }
        
        return id
    }
    
    function parseMap (uri) {
        var map = data.map
        var ret = uri
        
        if (map) {
            for (var i = 0, len = map.length; i < len; i++) {
                var rule = map[i]
                
                ret = isFunction(rule) ? (rule(uri) || uri) : uri.replace(rule[0], rule[1])
                
                // Only apply the first matched rule
                if (ret !== uri) break
            }
        }
        
        return ret
    }
    
    var ABSOLUTE_RE = /^\/\/.|:\//
    var ROOT_DIR_RE = /^.*?\/\/.*?\//
    
    function addBase (id, refUri) {
        var ret
        var first = id.charAt(0)
        
        // Absolute
        if (ABSOLUTE_RE.test(id)) {
            ret = id
        }
        // Relative
        else if (first === '.') {
            ret = realpath((refUri ? dirname(refUri) : data.cwd) + id)
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
    
    // 将模块的 id 转换为 uri, 调用 data 的方法完成
    function id2Uri (id, refUri) {
        if (!id) return ''
        
        id = parseAlias(id)
        id = parsePaths(id)
        id = parseVars(id)
        id = normalize(id)
        
        var uri = addBase(id, refUri)
        uri = parseMap(uri)
        
        return uri
    }
    
    var doc = document
    var cwd = dirname(doc.URL)
    var scripts = doc.scripts
    
    // Recommend to add `seajsnode` id for the `sea.js` script element
    var loaderScript = doc.getElementById('seajsnode') ||
      scripts[scripts.length - 1]
    
    // When `sea.js` is inline, set loaderDir to current working directory
    var loaderDir = dirname(getScriptAbsoluteSrc(loaderScript) || cwd)
    
    function getScriptAbsoluteSrc (node) {
        return node.hasAttribute ? // non-IE6/7
          node.src : // see http://msdn.microsoft.com/en-us/library/ms536429(VS.85).aspx
          node.getAttribute('src', 4)
    }
    
    // For Developers
    seajs.resolve = id2Uri
    
    /**
     * util-request.js - The utilities for requesting script and style files
     * ref: tests/research/load-js-css/test.html
     */
    
    var head = doc.head || doc.getElementsByTagName('head')[0] || doc.documentElement
    var baseElement = head.getElementsByTagName('base')[0]
    
    var IS_CSS_RE = /\.css(?:\?|$)/i
    var currentlyAddingScript
    var interactiveScript
    
    // `onload` event is not supported in WebKit < 535.23 and Firefox < 9.0
    // ref:
    //  - https://bugs.webkit.org/show_activity.cgi?id=38995
    //  - https://bugzilla.mozilla.org/show_bug.cgi?id=185236
    //  - https://developer.mozilla.org/en/HTML/Element/link#Stylesheet_load_events
    var isOldWebKit = +navigator.userAgent
      .replace(/.*(?:AppleWebKit|AndroidWebKit)\/(\d+).*/, '$1') < 536
    
    // 请求模块
    // For Developers
    seajs.request = function (url, callback, charset, crossorigin) {
        const isCSS = IS_CSS_RE.test(url)
        const node = document.createElement(isCSS ? 'link' : 'script')
        
        if (charset) {
            node.charset = charset
        }
        
        // crossorigin default value is `false`.
        if (!isUndefined(crossorigin)) {
            node.setAttribute('crossorigin', crossorigin)
        }
        
        addOnload(node, callback, isCSS, url)
        
        if (isCSS) {
            node.rel = 'stylesheet'
            node.href = url
        } else {
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
    
    function addOnload (node, callback, isCSS, url) {
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
                emit('error', { uri: url, node: node })
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
            if (!isCSS && !data.debug) {
                head.removeChild(node)
            }
            
            // Dereference the node
            node = null
            
            callback()
        }
    }
    
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
    
    // 以创建的模块 new Module
    var cachedMods = seajs.cache = {}
    var anonymousMeta
    
    // 正在 fetch 的模块
    var fetchingList = {}
    // 已经 fetch 的模块
    var fetchedList = {}
    // 待加载的模块
    var callbackList = {}
    
    
    
    // Module 类
    
    class Module {
        constructor(uri, deps) {
            this.uri = uri
            this.dependencies = deps || []
            this.exports = null
            this.status = 0
            
            // 依赖当前模块的模块
            this._waitings = {}
            
            // 未加载的依赖数
            this._remain = 0
            
            // 加载完成后的回调
            this.callback = null
        }
        
        // 获取模块的依赖列表
        resolve() {
            const self = this
            const ids = self.dependencies
            const uris = []
            
            for (let i = 0, len = ids.length; i < len; i++) {
                uris[i] = Module.resolve(ids[i], self.uri)
            }
            return uris
        }
        
        // Load module.dependencies and fire onload when all done
        load() {
            const self = this
        
            // 如果模块已经加载, 只需要等待 onload 调用
            if (self.status >= STATUS.LOADING) {
                return
            }
        
            // 更新为 loading 状态
            self.status = STATUS.LOADING
        
            // 获取当前模块的依赖列表
            const uris = self.resolve()
            // Emit `load` event for plugins such as combo plugin
            emit('load', uris)
        
            self._remain = uris.length
            const len = uris.length
            let mod
        
            // Initialize modules and register waitings
            // 处理所有依赖模块
            for (let i = 0; i < len; i++) {
                mod = Module.get(uris[i])
                if (mod.status < STATUS.LOADED) {
                    //TODO  如果模块未加载, 说明该模块依赖当前模块 ?
                    // Maybe duplicate: When module has dupliate dependency, it should be it's count, not 1
                    mod._waitings[self.uri] = (mod._waitings[self.uri] || 0) + 1
                } else {
                    // 如果模块已加载
                    self._remain--
                }
            }
            
            
            if (self._remain === 0) {
                // 如果全部依赖已加载, 则调用 onload
                self.onload()
                return
            } else {
                // 加载未加载的依赖
                // Begin parallel loading
                const requestCache = {}
    
                for (let i = 0; i < len; i++) {
                    mod = cachedMods[uris[i]]
                
                    if (mod.status < STATUS.FETCHING) {
                        // fetch
                        // fetch 会修改 requestCache
                        mod.fetch(requestCache)
                    } else if (mod.status === STATUS.SAVED) {
                        // load
                        mod.load()
                    }
                }
                
                // Send all requests at last to avoid cache bug in IE6-9. Issues#808
                // 发送请求
                for (let requestUri in requestCache) {
                    if (requestCache.hasOwnProperty(requestUri)) {
                        requestCache[requestUri]()
                    }
                }
                
            }
            
        
        }
        
        // Call this method when module is loaded
        onload() {
            const self = this
            self.status = STATUS.LOADED
            
            if (self.callback) {
                self.callback()
            }
            
            // Notify waiting modules to fire onload
            const waitings = self._waitings
            
            for (let uri in waitings) {
                if (waitings.hasOwnProperty(uri)) {
                    const m = cachedMods[uri]
                    m._remain -= waitings[uri]
                    if (m._remain === 0) {
                        m.onload()
                    }
                }
            }
            
            // Reduce memory taken
            delete self._waitings
            delete self._remain
        }
        
        // Fetch a module
        // fetch 实际上只是创建了请求, 保存在 requestCache, 请求是在 load 从 中发送的
        fetch(requestCache) {
            const self = this
            const uri = self.uri
            
            // 更新状态
            self.status = STATUS.FETCHING
            
            // Emit `fetch` event for plugins such as combo plugin
            let emitData = { uri: uri }
            emit('fetch', emitData)
            
            const requestUri = emitData.requestUri || uri
            
            // Empty uri or a non-CMD module
            // 空 uri 或者 非 cmd 模块, 或者 模块已 fetch
            if (!requestUri || fetchedList[requestUri]) {
                self.load()
                return
            }
            
            // 正在 fetch
            if (fetchingList[requestUri]) {
                callbackList[requestUri].push(self)
                return
            }
            
            // fetch
            fetchingList[requestUri] = true
            callbackList[requestUri] = [self]
            
            emitData = {
                uri: uri,
                requestUri: requestUri,
                onRequest: onRequest,
                charset: isFunction(data.charset) ? data.charset(requestUri) : data.charset,
                crossorigin: isFunction(data.crossorigin) ? data.crossorigin(requestUri) : data.crossorigin
            }
            
            // Emit `request` event for plugins such as text plugin
            emit('request', emitData)
            
            // 创建请求, 保存在 requestCache 中, 实际上在 load 中调用
            if (!emitData.requested) {
                // requestCache 第一次是 {}
                if(requestCache) {
                    requestCache[emitData.requestUri] = sendRequest
                } else {
                    sendRequest()
                }
            }
            
            function sendRequest () {
                seajs.request(emitData.requestUri, emitData.onRequest, emitData.charset, emitData.crossorigin)
            }
            
            // fetch 完成的回调
            function onRequest () {
                delete fetchingList[requestUri]
                fetchedList[requestUri] = true
                
                // Save meta data of anonymous module
                if (anonymousMeta) {
                    Module.save(uri, anonymousMeta)
                    anonymousMeta = null
                }
                
                // 依赖模块加载完成, 加载当前模块
                var m, mods = callbackList[requestUri]
                delete callbackList[requestUri]
                while ((m = mods.shift())) {
                    m.load()
                }
            }
        }
        
        // Execute a module
        exec() {
            const self = this
            
            // When module is executed, DO NOT execute it again. When module
            // is being executed, just return `module.exports` too, for avoiding
            // circularly calling
            if (self.status >= STATUS.EXECUTING) {
                return self.exports
            }
            
            self.status = STATUS.EXECUTING
            
            // Create require
            const uri = self.uri
            
            function require (id) {
                return Module.get(require.resolve(id)).exec()
            }
            
            require.resolve = function (id) {
                return Module.resolve(id, uri)
            }
            
            require.async = function (ids, callback) {
                Module.use(ids, callback, uri + '_async_' + cid())
                return require
            }
            
            // Exec factory
            const factory = self.factory
            
            let exports = isFunction(factory) ? factory(require, self.exports = {}, self) : factory
            
            if (exports === undefined) {
                exports = self.exports
            }
            
            // Reduce memory leak
            delete self.factory
            
            self.exports = exports
            self.status = STATUS.EXECUTED
            
            // Emit `exec` event
            emit('exec', self)
            
            return exports
        }
        
        // 将 模块的 id 转换为 uri
        static resolve(id, refUri) {
            // Emit `resolve` event for plugins such as text plugin
            const emitData = { id: id, refUri: refUri }
            emit('resolve', emitData)
            
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
                if (isArray(id)) {
                    deps = id
                    id = undefined
                }
                // define(id, factory)
                else {
                    deps = undefined
                }
            }
            
            // Parse dependencies according to the module factory code
            if (!isArray(deps) && isFunction(factory)) {
                deps = parseDependencies(factory.toString())
            }
            
            var meta = {
                id: id,
                uri: Module.resolve(id),
                deps: deps,
                factory: factory
            }
            
            // Try to derive uri in IE6-9 for anonymous modules
            if (!meta.uri && doc.attachEvent) {
                var script = getCurrentScript()
                
                if (script) {
                    meta.uri = script.src
                }
                
                // NOTE: If the id-deriving methods above is failed, then falls back
                // to use onload event to get the uri
            }
            
            // Emit `define` event, used in nocache plugin, seajs node version etc
            emit('define', meta)
            
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
        
        // 获取已存在的数组, 如果模块不存在则创建新模块
        // deps 是数组
        static get(uri, deps) {
            const mod = cachedMods[uri]
            if(mod) {
                return mod
            } else {
                const newMod = new Module(uri, deps)
                cachedMods[uri] = newMod
                return newMod
            }
        }
        
        // Use function is equal to load a anonymous module
        static use(ids, callback, uri) {
            // 获取模块
            const mod = Module.get(uri, isArray(ids) ? ids : [ids])
            
            // 在 onload 中调用
            mod.callback = function () {
                const exports = []
                const uris = mod.resolve()
                
                for (let i = 0, len = uris.length; i < len; i++) {
                    exports[i] = cachedMods[uris[i]].exec()
                }
                
                if (callback) {
                    callback.apply(global, exports)
                }
                
                delete mod.callback
            }
            
            mod.load()
        }
        
        // 加载所有预加载模块
        static preload(callback) {
            console.log('step3: preload')
            
            const preloadMods = data.preload
            const len = preloadMods.length
            
            if (len) {
                Module.use(preloadMods, function () {
                    // Remove the loaded preload modules
                    preloadMods.splice(0, len)
                    
                    // Allow preload modules to add new preload modules
                    Module.preload(callback)
                }, data.cwd + '_preload_' + cid())
            } else {
                callback()
            }
        }
    }
    
    // 模块的状态
    const STATUS = Module.STATUS = {
        // 开始从服务端加载模块, module.uri 指定 url
        FETCHING: 1,
        // 模块加载完成, 保存到 cachedMods
        SAVED: 2,

        // 加载依赖模块 module.dependencies
        LOADING: 3,
        // 依赖模块加载完成, 准备执行
        LOADED: 4,
        // 模块执行中
        EXECUTING: 5,
        // 模块执行完成
        EXECUTED: 6
    }
    // function Module (uri, deps) {
    //     this.uri = uri
    //     this.dependencies = deps || []
    //     this.exports = null
    //     this.status = 0
    //
    //     // 依赖当前模块的模块
    //     this._waitings = {}
    //
    //     // 未加载的依赖数
    //     this._remain = 0
    // }
    //
    // // 获取模块的依赖列表
    // Module.prototype.resolve = function () {
    //     const mod = this
    //     const ids = mod.dependencies
    //     const uris = []
    //
    //     for (let i = 0, len = ids.length; i < len; i++) {
    //         uris[i] = Module.resolve(ids[i], mod.uri)
    //     }
    //     return uris
    // }
    //
    // // Load module.dependencies and fire onload when all done
    // Module.prototype.load = function () {
    //
    //     const mod = this
    //
    //     // 如果模块已经加载, 只需要等待 onload 调用
    //     if (mod.status >= STATUS.LOADING) {
    //         return
    //     }
    //
    //     // 更新为 loading 状态
    //     mod.status = STATUS.LOADING
    //
    //     // 获取当前模块的依赖列表
    //     var uris = mod.resolve()
    //     // Emit `load` event for plugins such as combo plugin
    //     emit('load', uris)
    //
    //     mod._remain = uris.length
    //     var len = uris.length
    //     var m
    //
    //     // Initialize modules and register waitings
    //     // 处理所有依赖模块
    //     for (let i = 0; i < len; i++) {
    //         m = Module.get(uris[i])
    //         if (m.status < STATUS.LOADED) {
    //             //TODO  如果模块未加载, 说明该模块依赖当前模块 ?
    //             // Maybe duplicate: When module has dupliate dependency, it should be it's count, not 1
    //             m._waitings[mod.uri] = (m._waitings[mod.uri] || 0) + 1
    //         } else {
    //             // 如果模块已加载
    //             mod._remain--
    //         }
    //     }
    //
    //
    //     if (mod._remain === 0) {
    //         // 如果全部依赖已加载, 则调用 onload
    //         mod.onload()
    //         return
    //     } else {
    //         // 加载未加载的依赖
    //         // Begin parallel loading
    //         var requestCache = {}
    //
    //         for (let i = 0; i < len; i++) {
    //             m = cachedMods[uris[i]]
    //
    //             if (m.status < STATUS.FETCHING) {
    //                 // fetch
    //                 // fetch 会修改 requestCache
    //                 m.fetch(requestCache)
    //             } else if (m.status === STATUS.SAVED) {
    //                 // load
    //                 m.load()
    //             }
    //         }
    //
    //         // Send all requests at last to avoid cache bug in IE6-9. Issues#808
    //         // 发送请求
    //         for (var requestUri in requestCache) {
    //             if (requestCache.hasOwnProperty(requestUri)) {
    //                 requestCache[requestUri]()
    //             }
    //         }
    //
    //     }
    //
    //
    // }
    //
    // // Call this method when module is loaded
    // Module.prototype.onload = function () {
    //     var mod = this
    //     mod.status = STATUS.LOADED
    //
    //     if (mod.callback) {
    //         mod.callback()
    //     }
    //
    //     // Notify waiting modules to fire onload
    //     var waitings = mod._waitings
    //     var uri, m
    //
    //     for (uri in waitings) {
    //         if (waitings.hasOwnProperty(uri)) {
    //             m = cachedMods[uri]
    //             m._remain -= waitings[uri]
    //             if (m._remain === 0) {
    //                 m.onload()
    //             }
    //         }
    //     }
    //
    //     // Reduce memory taken
    //     delete mod._waitings
    //     delete mod._remain
    // }
    //
    // // Fetch a module
    // // fetch 实际上只是创建了请求, 保存在 requestCache, 请求是在 load 从 中发送的
    // Module.prototype.fetch = function (requestCache) {
    //     var mod = this
    //     var uri = mod.uri
    //
    //     // 更新状态
    //     mod.status = STATUS.FETCHING
    //
    //     // Emit `fetch` event for plugins such as combo plugin
    //     var emitData = { uri: uri }
    //     emit('fetch', emitData)
    //
    //     var requestUri = emitData.requestUri || uri
    //
    //     // Empty uri or a non-CMD module
    //     // 空 uri 或者 非 cmd 模块, 或者 模块已 fetch
    //     if (!requestUri || fetchedList[requestUri]) {
    //         mod.load()
    //         return
    //     }
    //
    //     // 正在 fetch
    //     if (fetchingList[requestUri]) {
    //         callbackList[requestUri].push(mod)
    //         return
    //     }
    //
    //     // fetch
    //     fetchingList[requestUri] = true
    //     callbackList[requestUri] = [mod]
    //
    //     emitData = {
    //         uri: uri,
    //         requestUri: requestUri,
    //         onRequest: onRequest,
    //         charset: isFunction(data.charset) ? data.charset(requestUri) : data.charset,
    //         crossorigin: isFunction(data.crossorigin) ? data.crossorigin(requestUri) : data.crossorigin
    //     }
    //
    //     // Emit `request` event for plugins such as text plugin
    //     emit('request', emitData)
    //
    //     //
    //     if (!emitData.requested) {
    //         // requestCache 第一次是 {}
    //         if(requestCache) {
    //             requestCache[emitData.requestUri] = sendRequest
    //         } else {
    //             sendRequest()
    //         }
    //     }
    //
    //     function sendRequest () {
    //         seajs.request(emitData.requestUri, emitData.onRequest, emitData.charset, emitData.crossorigin)
    //     }
    //
    //     // fetch 完成的回调
    //     function onRequest () {
    //         delete fetchingList[requestUri]
    //         fetchedList[requestUri] = true
    //
    //         // Save meta data of anonymous module
    //         if (anonymousMeta) {
    //             Module.save(uri, anonymousMeta)
    //             anonymousMeta = null
    //         }
    //
    //         // 依赖模块加载完成, 加载当前模块
    //         var m, mods = callbackList[requestUri]
    //         delete callbackList[requestUri]
    //         while ((m = mods.shift())) {
    //             m.load()
    //         }
    //     }
    // }
    //
    // // Execute a module
    // Module.prototype.exec = function () {
    //     var mod = this
    //
    //     // When module is executed, DO NOT execute it again. When module
    //     // is being executed, just return `module.exports` too, for avoiding
    //     // circularly calling
    //     if (mod.status >= STATUS.EXECUTING) {
    //         return mod.exports
    //     }
    //
    //     mod.status = STATUS.EXECUTING
    //
    //     // Create require
    //     var uri = mod.uri
    //
    //     function require (id) {
    //         return Module.get(require.resolve(id)).exec()
    //     }
    //
    //     require.resolve = function (id) {
    //         return Module.resolve(id, uri)
    //     }
    //
    //     require.async = function (ids, callback) {
    //         Module.use(ids, callback, uri + '_async_' + cid())
    //         return require
    //     }
    //
    //     // Exec factory
    //     var factory = mod.factory
    //
    //     var exports = isFunction(factory) ? factory(require, mod.exports = {}, mod) : factory
    //
    //     if (exports === undefined) {
    //         exports = mod.exports
    //     }
    //
    //     // Reduce memory leak
    //     delete mod.factory
    //
    //     mod.exports = exports
    //     mod.status = STATUS.EXECUTED
    //
    //     // Emit `exec` event
    //     emit('exec', mod)
    //
    //     return exports
    // }
    //
    // // 将 模块的 id 转换为 uri
    // Module.resolve = function (id, refUri) {
    //     // Emit `resolve` event for plugins such as text plugin
    //     var emitData = { id: id, refUri: refUri }
    //     emit('resolve', emitData)
    //
    //     return emitData.uri || seajs.resolve(emitData.id, refUri)
    // }
    //
    // // Define a module
    // Module.define = function (id, deps, factory) {
    //     var argsLen = arguments.length
    //
    //     // define(factory)
    //     if (argsLen === 1) {
    //         factory = id
    //         id = undefined
    //     }
    //     else if (argsLen === 2) {
    //         factory = deps
    //
    //         // define(deps, factory)
    //         if (isArray(id)) {
    //             deps = id
    //             id = undefined
    //         }
    //         // define(id, factory)
    //         else {
    //             deps = undefined
    //         }
    //     }
    //
    //     // Parse dependencies according to the module factory code
    //     if (!isArray(deps) && isFunction(factory)) {
    //         deps = parseDependencies(factory.toString())
    //     }
    //
    //     var meta = {
    //         id: id,
    //         uri: Module.resolve(id),
    //         deps: deps,
    //         factory: factory
    //     }
    //
    //     // Try to derive uri in IE6-9 for anonymous modules
    //     if (!meta.uri && doc.attachEvent) {
    //         var script = getCurrentScript()
    //
    //         if (script) {
    //             meta.uri = script.src
    //         }
    //
    //         // NOTE: If the id-deriving methods above is failed, then falls back
    //         // to use onload event to get the uri
    //     }
    //
    //     // Emit `define` event, used in nocache plugin, seajs node version etc
    //     emit('define', meta)
    //
    //     meta.uri ? Module.save(meta.uri, meta) : // Save information for "saving" work in the script onload event
    //       anonymousMeta = meta
    // }
    //
    // // Save meta data to cachedMods
    // Module.save = function (uri, meta) {
    //     var mod = Module.get(uri)
    //
    //     // Do NOT override already saved modules
    //     if (mod.status < STATUS.SAVED) {
    //         mod.id = meta.id || uri
    //         mod.dependencies = meta.deps || []
    //         mod.factory = meta.factory
    //         mod.status = STATUS.SAVED
    //     }
    // }
    //
    // // 获取已存在的数组, 如果模块不存在则创建新模块
    // // deps 是数组
    // Module.get = function (uri, deps) {
    //     const mod = cachedMods[uri]
    //     if(mod) {
    //         return mod
    //     } else {
    //         const newMod = new Module(uri, deps)
    //         cachedMods[uri] = newMod
    //         return newMod
    //     }
    // }
    //
    // // Use function is equal to load a anonymous module
    // Module.use = function (ids, callback, uri) {
    //     // 获取模块
    //     const mod = Module.get(uri, isArray(ids) ? ids : [ids])
    //
    //     // 在 onload 中调用
    //     mod.callback = function () {
    //         var exports = []
    //         var uris = mod.resolve()
    //
    //         for (var i = 0, len = uris.length; i < len; i++) {
    //             exports[i] = cachedMods[uris[i]].exec()
    //         }
    //
    //         if (callback) {
    //             callback.apply(global, exports)
    //         }
    //
    //         delete mod.callback
    //     }
    //
    //     mod.load()
    // }
    //
    // // 加载所有预加载模块
    // Module.preload = function (callback) {
    //     console.log('step3: preload')
    //
    //     var preloadMods = data.preload
    //     var len = preloadMods.length
    //
    //     if (len) {
    //         Module.use(preloadMods, function () {
    //             // Remove the loaded preload modules
    //             preloadMods.splice(0, len)
    //
    //             // Allow preload modules to add new preload modules
    //             Module.preload(callback)
    //         }, data.cwd + '_preload_' + cid())
    //     } else {
    //         callback()
    //     }
    // }
    
    // Public API
    seajs.use = function (ids, callback) {
        console.log('step2: seajs.use', data.cwd, cid())
        
        Module.preload(function () {
            console.log('step4: load main script')
            Module.use(ids, callback, data.cwd + '_use_' + cid())
        })
        return seajs
    }
    
    Module.define.cmd = {}
    
    global.define = Module.define
    
    // For Developers
    
    seajs.Module = Module
    data.fetchedList = fetchedList
    data.cid = cid
    
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
    
    // 初始化 data
    var BASE_RE = /^(.+?\/)(\?\?)?(seajs\/)+/
    
    // The root path to use for id2uri parsing
    // If loaderUri is `http://test.com/libs/seajs/[??][seajs/1.2.3/]sea.js`, the
    // baseUri should be `http://test.com/libs/`
    data.base = (loaderDir.match(BASE_RE) || ['', loaderDir])[1]
    
    // The loader directory
    data.dir = loaderDir
    
    // The current working directory
    data.cwd = cwd
    
    // The charset for requesting files
    data.charset = 'utf-8'
    
    // The CORS options, Do't set CORS on default.
    //data.crossorigin = undefined
    
    // Modules that are needed to load before all other modules
    // 初始化的结果是 preload 是一个空数组
    data.preload = (function () {
        console.log('step0: 初始化 data.preload')
        var plugins = []
        
        // Convert `seajs-xxx` to `seajs-xxx=1`
        // NOTE: use `seajs-xxx=1` flag in uri or cookie to preload `seajs-xxx`
        var str = location.search.replace(/(seajs-\w+)(&|$)/g, '$1=1$2')
        
        // Add cookie string
        str += ' ' + doc.cookie
        
        // Exclude seajs-xxx=0
        str.replace(/(seajs-\w+)=1/g, function (m, name) {
            plugins.push(name)
        })
        console.log('plugins', plugins)
        return plugins
    })()
    
    // data.alias - An object containing shorthands of module id
    data.alias = {}
    // data.paths - An object containing path shorthands in module id
    data.paths = {}
    // data.vars - The {xxx} variables in module id
    data.vars = {}
    // data.map - An array containing rules to map module uri
    data.map = []
    // data.debug - Debug mode. The default value is false
    data.debug = false
    // 初始化 data 结束
    
    
    // config api
    // 依赖 addBase 方法, 必须在 data 初始化之后
    seajs.config = function (configData) {
        console.log('step1; seajs.config')
        
        // 对 config 对象进行遍历, 将数据复制到 data
        for (let key in configData) {
            // 新配置项
            let curr = configData[key]
            // 之前的配置项
            let prev = data[key]
            
            // 合并对象类型的新旧配置项
            if (prev && isObject(prev)) {
                for (var k in curr) {
                    prev[k] = curr[k]
                }
            } else {
                // 合并数组类型的配置项
                if (isArray(prev)) {
                    curr = prev.concat(curr)
                } else if (key === 'base') {
                    // 处理 base 配置项, 确保 base 是绝对路径

                    // 确保 base 以 / 结尾
                    if (curr.slice(-1) !== '/') {
                        curr += '/'
                    }
                    // 生成真实 url
                    curr = addBase(curr)
                }
                
                // Set config
                data[key] = curr
            }
        }
        
        // 触发 config 事件
        emit('config', configData)
        return seajs
    }
    
})(this)
