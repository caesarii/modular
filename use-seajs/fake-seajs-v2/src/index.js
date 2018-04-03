import seajs from './sea'
import Module from './module'

const __main = () => {
    seajs.use = function (ids, callback) {
    Module.preload(function () {
        Module.use(ids, callback, data.cwd + '_use_' + cid())
    })
    return seajs
}
}

__main()