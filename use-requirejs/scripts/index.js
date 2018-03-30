require.config({
    paths: {
        'jquery': ['http://libs.baidu.com/jquery/2.0.3/jquery']
    }
})
require(['jquery', 'scripts/hello.js'], function($) {
    console.log('$', $)
})