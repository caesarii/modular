
const {
    op,
    ostring,
    hasOwn,
    commentReplace,
    isFunction,
    isArray,
    each,
    hasProp,
    getOwn,
    eachProp,
    mixin,
    bind,
    scripts,
    defaultOnError,
    getGlobal,
    makeError,
} = require('./utils')

const newContext = require('./context/newContext')
const isBrowser = require('./initial')



// 进行封装, 核心在 newContext
let requirejs = require('./req')
const define = require('./define')



(function (global, setTimeout) {
    let s
    let head
    let baseElement
    let dataMain
    let src
    let interactiveScript
    let currentlyAddingScript
    let mainScript
    let subPath
    
    let commentRegExp = /\/\*[\s\S]*?\*\/|([^:"'=]|^)\/\/.*$/mg
    let cjsRequireRegExp = /[^.]\s*requirejs\s*\(\s*["']([^'"\s]+)["']\s*\)/g
    let jsSuffixRegExp = /\.js$/
    let currDirRegExp = /^\.\//
    let op = Object.prototype
    let ostring = op.toString
    let hasOwn = op.hasOwnProperty
    let isWebWorker = !isBrowser && typeof importScripts !== 'undefined'
    //PS3 indicates loaded and complete, but need to wait for complete
    //specifically. Sequence is 'loading', 'loaded', execution,
    // then 'complete'. The UA check is unfortunate, but not sure how
    //to feature test w/o causing perf issues.
    let readyRegExp = isBrowser && navigator.platform === 'PLAYSTATION 3' ?
                  /^complete$/ : /^(complete|loaded)$/
    
    //Oh the tragedy, detecting opera. See the usage of isOpera for reason.
    let isOpera = typeof opera !== 'undefined' && opera.toString() === '[object Opera]'
    let cfg = {}
    let globalDefQueue = []
    let useInteractive = false
    
    
    // define 已定义
    if (typeof define !== 'undefined') {
        //If a define is already in play via another AMD loader,
        //do not overwrite.
        return;
    }

    // requirejs 已定义
    if (typeof requirejs !== 'undefined') {
        if (isFunction(requirejs)) {
            //Do not overwrite an existing requirejs instance.
            return;
        }
        cfg = requirejs;
        requirejsjs = undefined;
    }

    //Allow for a require config object
    if (typeof requirejs !== 'undefined' && !isFunction(requirejs)) {
        //assume it is a config object.
        cfg = requirejs;
        requirejs = undefined;
    }
    /**
     * Main entry point.
     *
     * If the only argument to require is a string, then the module that
     * is represented by that string is fetched for the appropriate context.
     *
     * If the first argument is an array, then it will be treated as an array
     * of dependency string names to fetch. An optional function callback can
     * be specified to execute when all of those dependencies are available.
     *
     * Make a local req variable to help Caja compliance (it assumes things
     * on a require that are not standardized), and to give a short
     * name for minification/local scope use.
     */
    var defContextName = '_'
    var contexts = {}
    var req = requirejs.requirejs

    /**
     * Export require as a global, but only if it does not already exist.
     */
    if (!requirejs) {
        requirejs = req;
    }

    
    s = req.s = {
        contexts: contexts,
        newContext: newContext
    };

    //Create default context.
    req({});

    //Exports some context-sensitive methods on global require.
    each([
        'toUrl',
        'undef',

        'defined',
        'specified'
    ], function (prop) {
        //Reference from contexts instead of early binding to default context,
        //so that during builds, the latest instance of the default context
        //with its config gets used.
        req[prop] = function () {
            var ctx = contexts[defContextName];
            return ctx.requirejs[prop].apply(ctx, arguments);
        };
    });

    if (isBrowser) {
        head = s.head = document.getElementsByTagName('head')[0];
        //If BASE tag is in play, using appendChild is a problem for IE6.
        //When that browser dies, this can be removed. Details in this jQuery bug:
        //http://dev.jquery.com/ticket/2709
        baseElement = document.getElementsByTagName('base')[0];
        if (baseElement) {
            head = s.head = baseElement.parentNode;
        }
    }

    //Look for a data-main script attribute, which could also adjust the baseUrl.
    if (isBrowser && !cfg.skipDataMain) {
        //Figure out baseUrl. Get it from the script tag with require.js in it.
        eachReverse(scripts(), function (script) {
            //Set the 'head' where we can append children by
            //using the script's parent.
            if (!head) {
                head = script.parentNode;
            }

            //Look for a data-main attribute to set main script for the page
            //to load. If it is there, the path to data main becomes the
            //baseUrl, if it is not already set.
            dataMain = script.getAttribute('data-main');
            if (dataMain) {
                //Preserve dataMain in case it is a path (i.e. contains '?')
                mainScript = dataMain;

                //Set final baseUrl if there is not already an explicit one,
                //but only do so if the data-main value is not a loader plugin
                //module ID.
                if (!cfg.baseUrl && mainScript.indexOf('!') === -1) {
                    //Pull off the directory of data-main for use as the
                    //baseUrl.
                    src = mainScript.split('/');
                    mainScript = src.pop();
                    subPath = src.length ? src.join('/')  + '/' : './';

                    cfg.baseUrl = subPath;
                }

                //Strip off any trailing .js since mainScript is now
                //like a module name.
                mainScript = mainScript.replace(jsSuffixRegExp, '');

                //If mainScript is still a path, fall back to dataMain
                if (req.jsExtRegExp.test(mainScript)) {
                    mainScript = dataMain;
                }

                //Put the data-main script in the files to load.
                cfg.deps = cfg.deps ? cfg.deps.concat(mainScript) : [mainScript];

                return true;
            }
        });
    }
    
    //Set up with config info.
    req(cfg);
}(this, (typeof setTimeout === 'undefined' ? undefined : setTimeout)))