var handlers = {
        'require': function (mod) {
            if (mod.require) {
                return mod.require;
            } else {
                return (mod.require = context.makeRequire(mod.map));
            }
        },
        'exports': function (mod) {
            mod.usingExports = true;
            if (mod.map.isDefine) {
                if (mod.exports) {
                    return (defined[mod.map.id] = mod.exports);
                } else {
                    return (mod.exports = defined[mod.map.id] = {});
                }
            }
        },
        'module': function (mod) {
            if (mod.module) {
                return mod.module;
            } else {
                return (mod.module = {
                    id: mod.map.id,
                    uri: mod.map.url,
                    config: function () {
                        return getOwn(config.config, mod.map.id) || {};
                    },
                    exports: mod.exports || (mod.exports = {})
                });
            }
        }
    };