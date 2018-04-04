// data start
// TODO
// 1. path.dirname
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
        
        this.events = {}
        this.fetchedList = Module.fetchedList
        this.cid = cid
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