// seajs start

import Type from './Type'
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

export default Seajs
