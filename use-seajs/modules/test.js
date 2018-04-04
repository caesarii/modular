// data start

class Data {
    constructor() {
    
    }
}

// new end
const data =  {}

const cwd = dirname(doc.URL)
const scripts = doc.scripts

// Recommend to add `seajsnode` id for the `sea.js` script element
const loaderScript = doc.getElementById('seajsnode') ||
  scripts[scripts.length - 1]

// When `sea.js` is inline, set loaderDir to current working directory
const loaderDir = dirname(getScriptAbsoluteSrc(loaderScript) || cwd)

function getScriptAbsoluteSrc (node) {
    return node.hasAttribute ? // non-IE6/7
      node.src : // see http://msdn.microsoft.com/en-us/library/ms536429(VS.85).aspx
      node.getAttribute('src', 4)
}

    // TODO
data.events = {}
data.fetchedList = Module.fetchedList
data.cid = cid
/**
 * config.js - The configuration for the loader
 */

// 初始化 data
const BASE_RE = /^(.+?\/)(\?\?)?(seajs\/)+/

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
// data end