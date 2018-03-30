
var MODULE = (function() {
    var my = {}
    var privateVar = 1
    function privateMethod = function() {
        privateVar ++
    }
    
    my.moduleProperty = 1
    my.moduleMethod = function() {
        this.moduleProperty += 2
    }
    return my
})()