// Module start
// Module 类
import Type from './Type'

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

export default Module