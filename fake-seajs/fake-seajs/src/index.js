/**
 * Sea.js 2.2.3 | seajs.org/LICENSE.md
 */

import Seajs from './Seajs'
import Module from './Module'
import Data from './Data'

const __main = function(global, undefine) {
    console.log(global)
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
    
    const seajs = new Seajs()
    const data =  new Data
    seajs.Module = Module
    seajs.cache = Module.cachedMods
    seajs.data = data

    seajs.use = function (ids, callback) {
        console.log('step2: seajs.use', data.cwd, data.cid())
        
        Module.preload(function () {
            console.log('step4: load main script')
            Module.use(ids, callback, data.cwd + '_use_' + data.cid())
        })
        return seajs
    }
    
    global.define = Module.define
    global.seajs = seajs
    
}

__main(this)

