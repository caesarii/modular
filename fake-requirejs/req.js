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

const requirejs = function (deps, callback, errback, optional) {

    //Find the right context, use default
    var context
    var config
    var contextName = defContextName

    // 映射实参与形参
    // 第一个参数如果是 对象, 则该对象是 config
    // 第二个参数如果是 数组, 则是依赖数组
    // TODO 不应该这样
    if (!isArray(deps) && typeof deps !== 'string') {
        // deps is a config object
        config = deps;
        if (isArray(callback)) {
            // Adjust args if there are dependencies
            deps = callback;
            callback = errback;
            errback = optional;
        } else {
            deps = [];
        }
    }
    
    // 处理 config
    // config ={
    //   context
    //
    // }
    // context name
    if (config && config.context) {
        contextName = config.context;
    }

    context = getOwn(contexts, contextName);
    if (!context) {
        context = contexts[contextName] = req.s.newContext(contextName);
    }

    if (config) {
        context.configure(config);
    }

    return context.requirejs(deps, callback, errback);
};

/**
 * Support require.config() to make it easier to cooperate with other
 * AMD loaders on globally agreed names.
 */
requirejs.config = function (config) {
    return requirejs(config);
};

/**
 * Execute something after the current tick
 * of the event loop. Override for other envs
 * that have a better solution than setTimeout.
 * @param  {Function} fn function to execute later.
 */
requirejs.nextTick = typeof setTimeout !== 'undefined' ? function (fn) {
    setTimeout(fn, 4);
} : function (fn) { fn(); };

requirejs.version = version;

//Used to filter out dependencies that are already paths.
requirejs.jsExtRegExp = /^\/|:|\?|\.js$/;
requirejs.isBrowser = isBrowser;


/**
 * Any errors that require explicitly generates will be passed to this
 * function. Intercept/override it if you want custom error handling.
 * @param {Error} err the error object.
 */
requirejs.onError = defaultOnError;

/**
 * Creates the node for the load command. Only used in browser envs.
 */
requirejs.createNode = function (config, moduleName, url) {
    var node = config.xhtml ?
            document.createElementNS('http://www.w3.org/1999/xhtml', 'html:script') :
            document.createElement('script');
    node.type = config.scriptType || 'text/javascript';
    node.charset = 'utf-8';
    node.async = true;
    return node;
};


/**
 * Does the request to load a module for the browser case.
 * Make this a separate function to allow other environments
 * to override it.
 *
 * @param {Object} context the require context to find state.
 * @param {String} moduleName the name of the module.
 * @param {Object} url the URL to the module.
 */
requirejs.load = function (context, moduleName, url) {
    var config = (context && context.config) || {},
        node;
    if (isBrowser) {
        //In the browser so use a script tag
        node = requirejs.createNode(config, moduleName, url);

        node.setAttribute('data-requirecontext', context.contextName);
        node.setAttribute('data-requiremodule', moduleName);

        //Set up load listener. Test attachEvent first because IE9 has
        //a subtle issue in its addEventListener and script onload firings
        //that do not match the behavior of all other browsers with
        //addEventListener support, which fire the onload event for a
        //script right after the script execution. See:
        //https://connect.microsoft.com/IE/feedback/details/648057/script-onload-event-is-not-fired-immediately-after-script-execution
        //UNFORTUNATELY Opera implements attachEvent but does not follow the script
        //script execution mode.
        if (node.attachEvent &&
                //Check if node.attachEvent is artificially added by custom script or
                //natively supported by browser
                //read https://github.com/requirejs/requirejs/issues/187
                //if we can NOT find [native code] then it must NOT natively supported.
                //in IE8, node.attachEvent does not have toString()
                //Note the test for "[native code" with no closing brace, see:
                //https://github.com/requirejs/requirejs/issues/273
                !(node.attachEvent.toString && node.attachEvent.toString().indexOf('[native code') < 0) &&
                !isOpera) {
            //Probably IE. IE (at least 6-8) do not fire
            //script onload right after executing the script, so
            //we cannot tie the anonymous define call to a name.
            //However, IE reports the script as being in 'interactive'
            //readyState at the time of the define call.
            useInteractive = true;

            node.attachEvent('onreadystatechange', context.onScriptLoad);
            //It would be great to add an error handler here to catch
            //404s in IE9+. However, onreadystatechange will fire before
            //the error handler, so that does not help. If addEventListener
            //is used, then IE will fire error before load, but we cannot
            //use that pathway given the connect.microsoft.com issue
            //mentioned above about not doing the 'script execute,
            //then fire the script load event listener before execute
            //next script' that other browsers do.
            //Best hope: IE10 fixes the issues,
            //and then destroys all installs of IE 6-9.
            //node.attachEvent('onerror', context.onScriptError);
        } else {
            node.addEventListener('load', context.onScriptLoad, false);
            node.addEventListener('error', context.onScriptError, false);
        }
        node.src = url;

        //Calling onNodeCreated after all properties on the node have been
        //set, but before it is placed in the DOM.
        if (config.onNodeCreated) {
            config.onNodeCreated(node, config, moduleName, url);
        }

        //For some cache cases in IE 6-8, the script executes before the end
        //of the appendChild execution, so to tie an anonymous define
        //call to the module name (which is stored on the node), hold on
        //to a reference to this node, but clear after the DOM insertion.
        currentlyAddingScript = node;
        if (baseElement) {
            head.insertBefore(node, baseElement);
        } else {
            head.appendChild(node);
        }
        currentlyAddingScript = null;

        return node;
    } else if (isWebWorker) {
        try {
            //In a web worker, use importScripts. This is not a very
            //efficient use of importScripts, importScripts will block until
            //its script is downloaded and evaluated. However, if web workers
            //are in play, the expectation is that a build has been done so
            //that only one script needs to be loaded anyway. This may need
            //to be reevaluated if other use cases become common.

            // Post a task to the event loop to work around a bug in WebKit
            // where the worker gets garbage-collected after calling
            // importScripts(): https://webkit.org/b/153317
            setTimeout(function() {}, 0);
            importScripts(url);

            //Account for anonymous modules
            context.completeLoad(moduleName);
        } catch (e) {
            context.onError(makeError('importscripts',
                            'importScripts failed for ' +
                                moduleName + ' at ' + url,
                            e,
                            [moduleName]));
        }
    }
};

/**
 * Executes the text. Normally just uses eval, but can be modified
 * to use a better, environment-specific call. Only used for transpiling
 * loader plugins, not for plain JS modules.
 * @param {String} text the text to execute/evaluate.
 */
requirejs.exec = function (text) {
    /*jslint evil: true */
    return eval(text);
};


module.exports = requirejs