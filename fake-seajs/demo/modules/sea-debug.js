/**
 * Sea.js 2.2.3 | seajs.org/LICENSE.md
 */
(function (global, undefined) {
    // Avoid conflicting when `sea.js` is loaded multiple times
    if (global.seajs) {
        return
    }
    
    // Extract the directory portion of a path
    // _dirname("a/b/c.js?t=123#xx/zz") ==> "a/b/"
    // ref: http://jsperf.com/regex-vs-split/2
    function dirname (path) {
        const DIRNAME_RE = /[^?#]*\//
        return path.match(DIRNAME_RE)[0]
    }
    
    class Type {
        static isType (type) {
            return function (obj) {
                return {}.toString.call(obj) === '[object ' + type + ']'
            }
        }
        static isObject(obj) {
            return Type.isType('Object')(obj)
        }
        
        static isString(obj) {
            return Type.isType('String')(obj)
        }
        static isArray(obj) {
            return Array.isArray(obj) || (Type.isType('Array')(obj))
        }
        static isFunction(obj) {
            return Type.isType('Function')(obj)
        }
        static isUndefined(obj) {
            return Type.isType('Undefined')(obj)
        }
    }
    
    // seajs start
    class Seajs {
        constructor() {
            // The current version of Sea.js being used
            this.version = '2.2.3'
            this.head = document.head || document.getElementsByTagName('head')[0] || document.documentElement
            this.currentlyAddingScript = null
            
            this._events = {}


        }
        
        // Bind event
        on (name, callback) {
            var list = this._events[name] || (this._events[name] = [])
            list.push(callback)
            return this
        }
        
        // Remove event. If `callback` is undefined, remove all callbacks for the
        // event. If `event` and `callback` are both undefined, remove all callbacks
        // for all events
        off (name, callback) {
            // Remove *all* events
            if (!(name || callback)) {
                this._events = {}
                this._events = {}
                return this
            }
            
            var list = this._events[name]
            if (list) {
                if (callback) {
                    for (var i = list.length - 1; i >= 0; i--) {
                        if (list[i] === callback) {
                            list.splice(i, 1)
                        }
                    }
                }
                else {
                    delete this._events[name]
                }
            }
            
            return this
        }
        
        // Emit event, firing all bound callbacks. Callbacks receive the same
        // arguments as `emit` does, apart from the event name
        emit (name, configData) {
            var list = this._events[name]
            let fn
            
            if (list) {
                // Copy callback lists to prevent modification
                list = list.slice()
                
                // Execute event callbacks
                while ((fn = list.shift())) {
                    fn(configData)
                }
            }
            
            return this
        }
        
        static _addBase (id, refUri) {
            var ABSOLUTE_RE = /^\/\/.|:\//
            var ROOT_DIR_RE = /^.*?\/\/.*?\//
            // Canonicalize a path
            // realpath("http://test.com/a//./b/../c") ==> "http://test.com/a/c"
            function realpath (path) {
            const DOT_RE = /\/\.\//g
            const DOUBLE_DOT_RE = /\/[^/]+\/\.\.\//
            const DOUBLE_SLASH_RE = /([^:/])\/\//g
    
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
        resolve (id, refUri) {
            
            function parsePaths (id) {
            var PATHS_RE = /^([^/:]+)(\/.+)$/
            var paths = data.paths
            var m
            
            if (paths && (m = id.match(PATHS_RE)) && Type.isString(paths[m[1]])) {
                id = paths[m[1]] + m[2]
            }
            
            return id
        }
        
            function parseVars (id) {
                var VARS_RE = /{([^{]+)}/g
                var vars = data.vars
                
                if (vars && id.indexOf('{') > -1) {
                    id = id.replace(VARS_RE, function (m, key) {
                        return Type.isString(vars[key]) ? vars[key] : m
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
                        
                        ret = Type.isFunction(rule) ? (rule(uri) || uri) : uri.replace(rule[0], rule[1])
                        
                        // Only apply the first matched rule
                        if (ret !== uri) break
                    }
                }
                
                return ret
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
            
            function parseAlias (id) {
                var alias = data.alias
                return alias && Type.isString(alias[id]) ? alias[id] : id
            }
            
            if (!id) return ''
            
            id = parseAlias(id)
            id = parsePaths(id)
            id = parseVars(id)
            id = normalize(id)
            
            var uri = Seajs._addBase(id, refUri)
            uri = parseMap(uri)
            
            return uri
        }
        
        // 请求模块
        request (url, callback, charset, crossorigin) {
            const self = this
            const IS_CSS_RE = /\.css(?:\?|$)/i
            const baseElement = this.head.getElementsByTagName('base')[0]
    
            function addOnload (node, callback, isCSS, url) {
                // `onload` event is not supported in WebKit < 535.23 and Firefox < 9.0
                // ref:
                //  - https://bugs.webkit.org/show_activity.cgi?id=38995
                //  - https://bugzilla.mozilla.org/show_bug.cgi?id=185236
                //  - https://developer.mozilla.org/en/HTML/Element/link#Stylesheet_load_events
                const isOldWebKit = +navigator.userAgent
                  .replace(/.*(?:AppleWebKit|AndroidWebKit)\/(\d+).*/, '$1') < 536
                const supportOnload = 'onload' in node
                
                // 加载 css
                // for Old WebKit and Old Firefox
                if (isCSS && (isOldWebKit || !supportOnload)) {
                    setTimeout(function () {
                        pollCss(node, callback)
                    }, 1) // Begin after node insertion
                    return
                }
                
                // 注册 onload
                if (supportOnload) {
                    node.onload = onload
                    node.onerror = function () {
                        seajs.emit('error', { uri: url, node: node })
                        onload()
                    }
                } else {
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
                        self.head.removeChild(node)
                    }
                    
                    // Dereference the node
                    node = null
                    
                    callback()
                }
            }
        
            // 加载 css
            function pollCss (node, callback) {
                const sheet = node.sheet
                let isLoaded
                
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
            // 是否是 css
            const isCSS = IS_CSS_RE.test(url)
            // 根据脚本类型创建 元素
            const node = document.createElement(isCSS ? 'link' : 'script')
            
            if (charset) {
                node.charset = charset
            }
            
            // crossorigin default value is `false`.
            if (!Type.isUndefined(crossorigin)) {
                node.setAttribute('crossorigin', crossorigin)
            }
            
            // 将 callback 注册到 onload
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
            this.currentlyAddingScript = node
            
            // ref: #185 & http://dev.jquery.com/ticket/2709
            baseElement ? this.head.insertBefore(node, baseElement) : this.head.appendChild(node)
            
            this.currentlyAddingScript = null
        }
        
        
        require (id) {
            var mod = Module.get(Module.resolve(id))
            if (mod.status < Module.STATUS.EXECUTING) {
                mod.onload()
                mod.exec()
            }
            return mod.exports
        }
        
        // config api
        // 依赖 addBase 方法, 必须在 data 初始化之后
        config (configData) {
            console.log('step1; seajs.config')
            
            // 对 config 对象进行遍历, 将数据复制到 data
            for (let key in configData) {
                // 新配置项
                let curr = configData[key]
                // 之前的配置项
                let prev = data[key]
                
                // 合并对象类型的新旧配置项
                if (prev && Type.isObject(prev)) {
                    for (var k in curr) {
                        prev[k] = curr[k]
                    }
                } else {
                    // 合并数组类型的配置项
                    if (Type.isArray(prev)) {
                        curr = prev.concat(curr)
                    } else if (key === 'base') {
                        // 处理 base 配置项, 确保 base 是绝对路径
    
                        // 确保 base 以 / 结尾
                        if (curr.slice(-1) !== '/') {
                            curr += '/'
                        }
                        // 生成真实 url
                        curr = Seajs._addBase(curr)
                    }
                    
                    // Set config
                    data[key] = curr
                }
            }
            
            // 触发 config 事件
            seajs.emit('config', configData)
            return seajs
        }
        
        
        getCurrentScript() {
                    let interactiveScript
                    if (this.currentlyAddingScript) {
                        return this.currentlyAddingScript
                    }
                    
                    // For IE6-9 browsers, the script onload event may not fire right
                    // after the script is evaluated. Kris Zyp found that it
                    // could query the script nodes and the one that is in "interactive"
                    // mode indicates the current script
                    // ref: http://goo.gl/JHfFW
                    if (interactiveScript && interactiveScript.readyState === 'interactive') {
                        return interactiveScript
                    }
                    
                    var scripts = this.head.getElementsByTagName('script')
                    
                    for (var i = scripts.length - 1; i >= 0; i--) {
                        var script = scripts[i]
                        if (script.readyState === 'interactive') {
                            interactiveScript = script
                            return interactiveScript
                        }
                    }
                }

    }

    const seajs = new Seajs()
    
    
    // seajs end
    
    
    // Module start
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
            const {cachedMods, } = Module
            const self = this
        
            // 如果模块已经加载, 只需要等待 onload 调用
            if (self.status >= Module.STATUS.LOADING) {
                return
            }
        
            // 更新为 loading 状态
            self.status = Module.STATUS.LOADING
        
            // 获取当前模块的依赖列表
            const uris = self.resolve()
            // Emit `load` event for plugins such as combo plugin
            seajs.emit('load', uris)
        
            self._remain = uris.length
            const len = uris.length
            let mod
        
            // Initialize modules and register waitings
            // 处理所有依赖模块
            for (let i = 0; i < len; i++) {
                mod = Module.get(uris[i])
                if (mod.status < Module.STATUS.LOADED) {
                    //TODO  如果模块未加载, 说明该模块依赖当前模块 ?
                    // Maybe duplicate: When module has dupliate dependency, it should be it's count, not 1
                    mod._waitings[self.uri] = (mod._waitings[self.uri] || 0) + 1
                } else {
                    // 如果模块已加载
                    self._remain--
                }
            }
            
            // 加载依赖
            if (self._remain === 0) {
                console.log('step4.2 load all dependancies')

                // 如果全部依赖已加载, 则调用 onload
                self.onload()
                return
            } else {
                // 加载未加载的依赖
                // Begin parallel loading
                const requestCache = {}
    
                for (let i = 0; i < len; i++) {
                    mod = cachedMods[uris[i]]
                
                    if (mod.status < Module.STATUS.FETCHING) {
                        // fetch
                        // fetch 会修改 requestCache
                        mod.fetch(requestCache)
                    } else if (mod.status === Module.STATUS.SAVED) {
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
        
        // 模块加载后的回调
        onload() {
            const {cachedMods, } = Module
            const self = this
            
            console.log('step4.3 module loaded')
            
            // 更新状态模块已加载
            self.status = Module.STATUS.LOADED
            
            // 调用模块的回调
            if (self.callback) {
                self.callback()
            }
            
            // 加载依赖于当前模块的模块
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
            console.log('step 4.5 load who deps on me ')
            
            // Reduce memory taken
            delete self._waitings
            delete self._remain
        }
        
        // 从服务端拉取模块
        // fetch 实际上只是创建了请求, 保存在 requestCache, 请求是在 load 从 中发送的
        fetch(requestCache) {
            let {anonymousMeta, fetchingList, fetchedList, callbackList, } = Module
            const self = this
            const uri = self.uri
            
            // 更新状态
            self.status = Module.STATUS.FETCHING
            
            // Emit `fetch` event for plugins such as combo plugin
            let emitData = { uri: uri }
            seajs.emit('fetch', emitData)
            
            const requestUri = emitData.requestUri || uri
            
            // Empty uri or a non-CMD module
            // 空 uri 或者 非 CMD 模块, 或者 模块已 fetch
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
                charset: Type.isFunction(data.charset) ? data.charset(requestUri) : data.charset,
                crossorigin: Type.isFunction(data.crossorigin) ? data.crossorigin(requestUri) : data.crossorigin
            }
            
            // Emit `request` event for plugins such as text plugin
            seajs.emit('request', emitData)
            
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
        
        // 执行一个模块
        exec() {
            const self = this
            
            // When module is executed, DO NOT execute it again. When module
            // is being executed, just return `module.exports` too, for avoiding
            // circularly calling
            if (self.status >= Module.STATUS.EXECUTING) {
                return self.exports
            }
            
            self.status = Module.STATUS.EXECUTING
            
            // Create require
            const uri = self.uri
            
            function require (id) {
                return Module.get(require.resolve(id)).exec()
            }
            
            require.resolve = function (id) {
                return Module.resolve(id, uri)
            }
            
            require.async = function (ids, callback) {
                Module.use(ids, callback, uri + '_async_' + data.cid())
                return require
            }
            
            // 执行 factory
            const factory = self.factory
            
            let exports = factory
            if(Type.isFunction(factory)) {
                exports = factory(require, self.exports = {}, self)
            }
            
            if (exports === undefined) {
                exports = self.exports
            }
            
            // Reduce memory leak
            delete self.factory
            
            self.exports = exports
            self.status = Module.STATUS.EXECUTED
            
            // Emit `exec` event
            seajs.emit('exec', self)
            
            return exports
        }
        
        // 将 模块的 id 转换为 uri
        static resolve(id, refUri) {
            // Emit `resolve` event for plugins such as text plugin
            const emitData = { id: id, refUri: refUri }
            seajs.emit('resolve', emitData)
            
            return emitData.uri || seajs.resolve(emitData.id, refUri)
        }
        
        // Define a module
        static define(id, deps, factory) {
            let anonymousMeta = Module.anonymousMeta
            const argsLen = arguments.length
            
            
    
            /**
             * util-deps.js - The parser for dependencies
             * ref: tests/research/parse-dependencies/test.html
             */
            
            function parseDependencies (code) {
                const REQUIRE_RE = /"(?:\\"|[^"])*"|'(?:\\'|[^'])*'|\/\*[\S\s]*?\*\/|\/(?:\\\/|[^\/\r\n])+\/(?=[^\/])|\/\/.*|\.\s*require|(?:^|[^$])\brequire\s*\(\s*(["'])(.+?)\1\s*\)/g
                const SLASH_RE = /\\\\/g
                const ret = []
                
                code.replace(SLASH_RE, '')
                  .replace(REQUIRE_RE, function (m, m1, m2) {
                      if (m2) {
                          ret.push(m2)
                      }
                  })
                
                return ret
            }
            
            // 处理参数
            if (argsLen === 1) {
                // 只有一个参数, 这个参数就是 模块的 factory define(factory)
                factory = id
                id = undefined
            } else if (argsLen === 2) {
                // 有两个参数, 第二个参数一定是 模块的 factory
                factory = deps
                // 第一个参数可能是 id 或 deps
                if (Type.isArray(id)) {
                    // define(deps, factory)
                    deps = id
                    id = undefined
                } else {
                    // define(id, factory)
                    deps = undefined
                }
            }
            
            // Parse dependencies according to the module factory code
            if (!Type.isArray(deps) && Type.isFunction(factory)) {
                deps = parseDependencies(factory.toString())
            }
            
            const meta = {
                id: id,
                uri: Module.resolve(id),
                deps: deps,
                factory: factory
            }
            
            // Try to derive uri in IE6-9 for anonymous modules
            if (!meta.uri && document.attachEvent) {
                var script = seajs.getCurrentScript()
                
                if (script) {
                    meta.uri = script.src
                }
                
                // NOTE: If the id-deriving methods above is failed, then falls back
                // to use onload event to get the uri
            }
            
            // Emit `define` event, used in nocache plugin, seajs node version etc
            seajs.emit('define', meta)
            
            // save module
            meta.uri ? Module.save(meta.uri, meta) : anonymousMeta = meta// Save information for "saving" work in the script onload event
            
        }
        
        // Save meta data to cachedMods
        static save(uri, meta) {
            // 利用 get 将模块报错到 cacheMods
            var mod = Module.get(uri)
            
            // Do NOT override already saved modules
            if (mod.status < Module.STATUS.SAVED) {
                mod.id = meta.id || uri
                mod.dependencies = meta.deps || []
                mod.factory = meta.factory
                mod.status = Module.STATUS.SAVED
            }
        }
        
        // 获取已存在的模块, 如果模块不存在则创建新模块
        // deps 是数组
        static get(uri, deps) {
            const {cachedMods, } = Module
            const mod = cachedMods[uri]
            if(mod) {
                return mod
            } else {
                const newMod = new Module(uri, deps)
                cachedMods[uri] = newMod
                return newMod
            }
        }
        
        // 创建 main module, 以及 onload 回调
        // Use function is equal to load a anonymous module
        static use(ids, callback, uri) {
            
            const {cachedMods, } = Module
            // 获取模块
            const mod = Module.get(uri, Type.isArray(ids) ? ids : [ids])
            
            console.log('step4.1 create main module')
            
            // 在 onload 中调用
            mod.callback = function () {
                console.log('step 4.4 exec loaded module and exports')
                const exports = []
                const uris = mod.resolve()
                
                // 执行已加载模块, 并将其接口暴露
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
                this.use(preloadMods, function () {
                    // Remove the loaded preload modules
                    preloadMods.splice(0, len)
                    
                    // Allow preload modules to add new preload modules
                    Module.preload(callback)
                }, data.cwd + '_preload_' + data.cid())
            } else {
                callback()
            }
        }
    }
    
    Module.anonymousMeta = null
    // 正在 fetch 的模块
    Module.fetchingList = {}
    // 已经 fetch 的模块
    Module.fetchedList = {}
    // 待加载的模块
    Module.callbackList = {}
    // 已创建的模块 new Module 处于 saved 状态
    Module.cachedMods = {}
    // 模块的状态
    Module.STATUS = {
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
    
    Module.define.cmd = {}
    // Module end
    
    // data start
    class Data {
        constructor() {
            // The current working directory
            this.cwd = dirname(document.URL)
            
            // The root path to use for id2uri parsing
            // If loaderUri is `http://test.com/libs/seajs/[??][seajs/1.2.3/]sea.js`, the
            // baseUri should be `http://test.com/libs/`
            this.base = null
            
            // The loader directory
            this.dir = null
            
            this.fetchedList = Module.fetchedList
            this._cid = 0
            
            // The charset for requesting files
            this.charset = 'utf-8'
            
            // The CORS options, Do't set CORS on default.
            this.crossorigin = undefined
            
            // Modules that are needed to load before all other modules
            this.preload = []
            
            // data.alias - An object containing shorthands of module id
            this.alias = {}
            // data.paths - An object containing path shorthands in module id
            this.paths = {}
            // data.vars - The {xxx} variables in module id
            this.vars = {}
            // data.map - An array containing rules to map module uri
            this.map = []
            // data.debug - Debug mode. The default value is false
            this.debug = false
        
            this.init()
        }
        
        init() {
            const scripts = document.scripts
            // Recommend to add `seajsnode` id for the `sea.js` script element
            const loaderScript = document.getElementById('seajsnode') || scripts[scripts.length - 1]
            // When `sea.js` is inline, set loaderDir to current working directory
            const loaderDir = dirname(Data._getScriptAbsoluteSrc(loaderScript) || this.cwd)
            const BASE_RE = /^(.+?\/)(\?\?)?(seajs\/)+/
            this.dir = loaderDir
            this.base = (loaderDir.match(BASE_RE) || ['', loaderDir])[1]
            
            this.initPreload()
            
        }
        
        // 初始化的结果是 preload 是一个空数组
        initPreload () {
            console.log('step0: 初始化 data.preload')
            const plugins = []
            
            // Convert `seajs-xxx` to `seajs-xxx=1`
            // NOTE: use `seajs-xxx=1` flag in uri or cookie to preload `seajs-xxx`
            let str = location.search.replace(/(seajs-\w+)(&|$)/g, '$1=1$2')
            
            // Add cookie string
            str += ' ' + document.cookie
            
            // Exclude seajs-xxx=0
            str.replace(/(seajs-\w+)=1/g, function (m, name) {
                plugins.push(name)
            })
            this.preload = plugins
        }
        
        cid() {
            return this. _cid++
        }
        
        static _getScriptAbsoluteSrc (node) {
            return node.hasAttribute ? // non-IE6/7
              node.src : // see http://msdn.microsoft.com/en-us/library/ms536429(VS.85).aspx
              node.getAttribute('src', 4)
        }
    }
    const data =  new Data
    // data end
    
    seajs.cache = Module.cachedMods
    seajs.data = data
    seajs.Module = Module
    seajs.use = function (ids, callback) {
        console.log('step2: seajs.use', data.cwd, data.cid())
        
        Module.preload(function () {
            console.log('step4: load main script')
            Module.use(ids, callback, data.cwd + '_use_' + data.cid())
        })
        return seajs
    }
    
    /**
     * util-lang.js - The minimal language enhancement
     */
    
    global.define = Module.define
    global.seajs = seajs
    
})(this)
