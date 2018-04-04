require.config({
    paths: {
        'jquery': ['http://libs.baidu.com/jquery/2.0.3/jquery']
    }
})
require(['jquery', 'object', 'functionWithoutDep', 'scripts/hello.js'], function($, object, functionWithoutDep) {
    log('success')
})
