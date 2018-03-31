const {
    trimDots,
    normalize,
    removeScript,
    hasPathFallback,
    splitPrefix,
    makeModuleMap,
    getModule,
    on,
    onError,
    takeGlobalQueue,
    cleanRegistry,
    callGetModule,
    removeListener,
    getScriptData,
    intakeDefines,
} = require('./utils')

// TODO
const isBrowser = null
const undefEvents = null

const handlers = require('./handlers')

const commentRegExp = /\/\*[\s\S]*?\*\/|([^:"'=]|^)\/\/.*$/mg
const cjsRequireRegExp = /[^.]\s*requirejs\s*\(\s*["']([^'"\s]+)["']\s*\)/g
const jsSuffixRegExp = /\.js$/
const currDirRegExp = /^\.\//
const readyRegExp = isBrowser && navigator.platform === 'PLAYSTATION 3' ?
                      /^complete$/ : /^(complete|loaded)$/

class Context {
    constructor(config, contextName, registry, defined, urlFetched, defQueue, bundlesMap, module) {
        this.config = config
        this.contextName = contextName
        this.registry = registry
        this.defined = defined
        this.urlFetched = urlFetched
        this.defQueue = defQueue
        this.defQueueMap = {}
        this.Module = module
        // TODO
        this.req = req
        this.nextTick = req.nextTick
        this.onError = onError
        
        // add
        this.bundlesMap = bundlesMap
    }
    
    /**
     * Set a configuration for the context.
     * @param {Object} cfg config object to integrate.
     */
    configure(cfg) {
        const {config, bundlesMap, registry, } = this
        //Make sure the baseUrl ends in a slash.
        if (cfg.baseUrl) {
            if (cfg.baseUrl.charAt(cfg.baseUrl.length - 1) !== '/') {
                cfg.baseUrl += '/';
            }
        }

        // Convert old style urlArgs string to a function.
        if (typeof cfg.urlArgs === 'string') {
            var urlArgs = cfg.urlArgs;
            cfg.urlArgs = function(id, url) {
                return (url.indexOf('?') === -1 ? '?' : '&') + urlArgs;
            };
        }

        //Save off the paths since they require special processing,
        //they are additive.
        var shim = config.shim,
            objs = {
                paths: true,
                bundles: true,
                config: true,
                map: true
            };

        eachProp(cfg, function (value, prop) {
            if (objs[prop]) {
                if (!config[prop]) {
                    config[prop] = {};
                }
                mixin(config[prop], value, true, true);
            } else {
                config[prop] = value;
            }
        });

        //Reverse map the bundles
        if (cfg.bundles) {
            eachProp(cfg.bundles, function (value, prop) {
                each(value, function (v) {
                    if (v !== prop) {
                        bundlesMap[v] = prop;
                    }
                });
            });
        }

        //Merge shim
        if (cfg.shim) {
            eachProp(cfg.shim, function (value, id) {
                //Normalize the structure
                if (isArray(value)) {
                    value = {
                        deps: value
                    };
                }
                if ((value.exports || value.init) && !value.exportsFn) {
                    value.exportsFn = context.makeShimExports(value);
                }
                shim[id] = value;
            });
            config.shim = shim;
        }

        //Adjust packages if necessary.
        if (cfg.packages) {
            each(cfg.packages, function (pkgObj) {
                var location, name;

                pkgObj = typeof pkgObj === 'string' ? {name: pkgObj} : pkgObj;

                name = pkgObj.name;
                location = pkgObj.location;
                if (location) {
                    config.paths[name] = pkgObj.location;
                }

                //Save pointer to main module ID for pkg name.
                //Remove leading dot in main, so main paths are normalized,
                //and remove any trailing .js, since different package
                //envs have different conventions: some use a module name,
                //some use a file name.
                config.pkgs[name] = pkgObj.name + '/' + (pkgObj.main || 'main')
                             .replace(currDirRegExp, '')
                             .replace(jsSuffixRegExp, '');
            });
        }

        //If there are any "waiting to execute" modules in the registry,
        //update the maps for them, since their info, like URLs to load,
        //may have changed.
        eachProp(registry, function (mod, id) {
            //If module already has init called, since it is too
            //late to modify them, and ignore unnormalized ones
            //since they are transient.
            if (!mod.inited && !mod.map.unnormalized) {
                mod.map = makeModuleMap(id, null, true);
            }
        });

        //If a deps array or a config callback is specified, then call
        //require with those args. This is useful when require is defined as a
        //config object before require.js is loaded.
        if (cfg.deps || cfg.callback) {
            context.require(cfg.deps || [], cfg.callback);
        }
    }
    
    makeShimExports(value) {
        function fn() {
            var ret;
            if (value.init) {
                ret = value.init.apply(global, arguments);
            }
            return ret || (value.exports && getGlobal(value.exports));
        }
        return fn;
    }

    makeRequire(relMap, options) {
        const {req, contextName, defined, registry, urlFetched, defQueue} = this
        options = options || {};

        function localRequire(deps, callback, errback) {
            var id, map, requireMod;

            if (options.enableBuildCallback && callback && isFunction(callback)) {
                callback.__requireJsBuild = true;
            }

            if (typeof deps === 'string') {
                if (isFunction(callback)) {
                    //Invalid call
                    return onError(makeError('requireargs', 'Invalid require call'), errback);
                }

                //If require|exports|module are requested, get the
                //value for them from the special handlers. Caveat:
                //this only works while module is being defined.
                if (relMap && hasProp(handlers, deps)) {
                    return handlers[deps](registry[relMap.id]);
                }

                //Synchronous access to one module. If require.get is
                //available (as in the Node adapter), prefer that.
                if (req.get) {
                    return req.get(context, deps, relMap, localRequire);
                }

                //Normalize module name, if it contains . or ..
                map = makeModuleMap(deps, relMap, false, true);
                id = map.id;

                if (!hasProp(defined, id)) {
                    return onError(makeError('notloaded', 'Module name "' +
                                id +
                                '" has not been loaded yet for context: ' +
                                contextName +
                                (relMap ? '' : '. Use require([])')));
                }
                return defined[id];
            }

            //Grab defines waiting in the global queue.
            intakeDefines();

            //Mark all the dependencies as needing to be loaded.
            context.nextTick(function () {
                //Some defines could have been added since the
                //require call, collect them.
                intakeDefines();

                requireMod = getModule(makeModuleMap(null, relMap));

                //Store if map config should be applied to this require
                //call for dependencies.
                requireMod.skipMap = options.skipMap;

                requireMod.init(deps, callback, errback, {
                    enabled: true
                });

                checkLoaded();
            });

            return localRequire;
        }

        mixin(localRequire, {
            isBrowser: isBrowser,

            /**
             * Converts a module name + .extension into an URL path.
             * *Requires* the use of a module name. It does not support using
             * plain URLs like nameToUrl.
             */
            toUrl: function (moduleNamePlusExt) {
                var ext,
                    index = moduleNamePlusExt.lastIndexOf('.'),
                    segment = moduleNamePlusExt.split('/')[0],
                    isRelative = segment === '.' || segment === '..';

                //Have a file extension alias, and it is not the
                //dots from a relative path.
                if (index !== -1 && (!isRelative || index > 1)) {
                    ext = moduleNamePlusExt.substring(index, moduleNamePlusExt.length);
                    moduleNamePlusExt = moduleNamePlusExt.substring(0, index);
                }

                return context.nameToUrl(normalize(moduleNamePlusExt,
                                        relMap && relMap.id, true), ext,  true);
            },

            defined: function (id) {
                return hasProp(defined, makeModuleMap(id, relMap, false, true).id);
            },

            specified: function (id) {
                id = makeModuleMap(id, relMap, false, true).id;
                return hasProp(defined, id) || hasProp(registry, id);
            }
        });

        //Only allow undef on top level require calls
        if (!relMap) {
            localRequire.undef = function (id) {
                //Bind any waiting define() calls to this context,
                //fix for #408
                takeGlobalQueue();

                var map = makeModuleMap(id, relMap, true),
                    mod = getOwn(registry, id);

                mod.undefed = true;
                removeScript(id);

                delete defined[id];
                delete urlFetched[map.url];
                delete undefEvents[id];

                //Clean queued defines too. Go backwards
                //in array so that the splices do not
                //mess up the iteration.
                eachReverse(defQueue, function(args, i) {
                    if (args[0] === id) {
                        defQueue.splice(i, 1);
                    }
                });
                delete context.defQueueMap[id];

                if (mod) {
                    //Hold on to listeners in case the
                    //module will be attempted to be reloaded
                    //using a different config.
                    if (mod.events.defined) {
                        undefEvents[id] = mod.events;
                    }

                    cleanRegistry(id);
                }
            };
        }

        return localRequire;
    }

    /**
     * Called to enable a module if it is still in the registry
     * awaiting enablement. A second arg, parent, the parent module,
     * is passed in for context, when this method is overridden by
     * the optimizer. Not shown here to keep code compact.
     */
    enable(depMap) {
        const {registry, } = this
        var mod = getOwn(registry, depMap.id);
        if (mod) {
            getModule(depMap).enable();
        }
    }

    /**
     * Internal method used by environment adapters to complete a load event.
     * A load event could be a script load or just a load pass from a synchronous
     * load call.
     * @param {String} moduleName the name of the module to potentially complete.
     */
    completeLoad(moduleName) {
        const {config, defQueue, registry, defined, } = this
        var found, args, mod,
            shim = getOwn(config.shim, moduleName) || {},
            shExports = shim.exports;

        takeGlobalQueue();

        while (defQueue.length) {
            args = defQueue.shift();
            if (args[0] === null) {
                args[0] = moduleName;
                //If already found an anonymous module and bound it
                //to this name, then this is some other anon module
                //waiting for its completeLoad to fire.
                if (found) {
                    break;
                }
                found = true;
            } else if (args[0] === moduleName) {
                //Found matching define call for this script!
                found = true;
            }

            callGetModule(args);
        }
        context.defQueueMap = {};

        //Do this after the cycle of callGetModule in case the result
        //of those calls/init calls changes the registry.
        mod = getOwn(registry, moduleName);

        if (!found && !hasProp(defined, moduleName) && mod && !mod.inited) {
            if (config.enforceDefine && (!shExports || !getGlobal(shExports))) {
                if (hasPathFallback(moduleName)) {
                    return;
                } else {
                    return onError(makeError('nodefine',
                                     'No define call for ' + moduleName,
                                     null,
                                     [moduleName]));
                }
            } else {
                //A script that does not call define(), so just simulate
                //the call for it.
                callGetModule([moduleName, (shim.deps || []), shim.exportsFn]);
            }
        }

        checkLoaded();
    }

    /**
     * Converts a module name to a file path. Supports cases where
     * moduleName may actually be just an URL.
     * Note that it **does not** call normalize on the moduleName,
     * it is assumed to have already been normalized. This is an
     * internal API, not a public one. Use toUrl for the public API.
     */
    nameToUrl(moduleName, ext, skipExt) {
        const {config, bundlesMap, req, } = this
        var paths, syms, i, parentModule, url,
            parentPath, bundleId,
            pkgMain = getOwn(config.pkgs, moduleName);

        if (pkgMain) {
            moduleName = pkgMain;
        }

        bundleId = getOwn(bundlesMap, moduleName);

        if (bundleId) {
            return context.nameToUrl(bundleId, ext, skipExt);
        }

        //If a colon is in the URL, it indicates a protocol is used and it is just
        //an URL to a file, or if it starts with a slash, contains a query arg (i.e. ?)
        //or ends with .js, then assume the user meant to use an url and not a module id.
        //The slash is important for protocol-less URLs as well as full paths.
        if (req.jsExtRegExp.test(moduleName)) {
            //Just a plain path, not module name lookup, so just return it.
            //Add extension if it is included. This is a bit wonky, only non-.js things pass
            //an extension, this method probably needs to be reworked.
            url = moduleName + (ext || '');
        } else {
            //A module that needs to be converted to a path.
            paths = config.paths;

            syms = moduleName.split('/');
            //For each module name segment, see if there is a path
            //registered for it. Start with most specific name
            //and work up from it.
            for (i = syms.length; i > 0; i -= 1) {
                parentModule = syms.slice(0, i).join('/');

                parentPath = getOwn(paths, parentModule);
                if (parentPath) {
                    //If an array, it means there are a few choices,
                    //Choose the one that is desired
                    if (isArray(parentPath)) {
                        parentPath = parentPath[0];
                    }
                    syms.splice(0, i, parentPath);
                    break;
                }
            }

            //Join the path parts together, then figure out if baseUrl is needed.
            url = syms.join('/');
            url += (ext || (/^data\:|^blob\:|\?/.test(url) || skipExt ? '' : '.js'));
            url = (url.charAt(0) === '/' || url.match(/^[\w\+\.\-]+:/) ? '' : config.baseUrl) + url;
        }

        return config.urlArgs && !/^blob\:/.test(url) ?
               url + config.urlArgs(moduleName, url) : url;
    }

    //Delegates to req.load. Broken out as a separate function to
    //allow overriding in the optimizer.
    load(id, url) {
        const {req, } = this
        req.load(context, id, url);
    }

    /**
     * Executes a module callback function. Broken out as a separate function
     * solely to allow the build system to sequence the files in the built
     * layer in the right sequence.
     *
     * @private
     */
    execCb(name, callback, args, exports) {
        return callback.apply(exports, args);
    }

    /**
     * callback for script loads, used to check status of loading.
     *
     * @param {Event} evt the event from the browser for the script
     * that was loaded.
     */
    onScriptLoad(evt) {
        //Using currentTarget instead of target for Firefox 2.0's sake. Not
        //all old browsers will be supported, but this one was easy enough
        //to support and still makes sense.
        if (evt.type === 'load' ||
                (readyRegExp.test((evt.currentTarget || evt.srcElement).readyState))) {
            //Reset interactive script so a script node is not held onto for
            //to long.
            interactiveScript = null;

            //Pull out the name of the module and the context.
            var data = getScriptData(evt);
            context.completeLoad(data.id);
        }
    }

    /**
     * Callback for script errors.
     */
    onScriptError(evt) {
        const {registry, } = this
        var data = getScriptData(evt);
        if (!hasPathFallback(data.id)) {
            var parents = [];
            eachProp(registry, function(value, key) {
                if (key.indexOf('_@r') !== 0) {
                    each(value.depMaps, function(depMap) {
                        if (depMap.id === data.id) {
                            parents.push(key);
                            return true;
                        }
                    });
                }
            });
            return onError(makeError('scripterror', 'Script error for "' + data.id +
                                     (parents.length ?
                                     '", needed by: ' + parents.join(', ') :
                                     '"'), evt, [data.id]));
        }
    }
    
}


module.exports = Context