define(function(require, exports, module) {

  var $ = require('jquery');

  // 通过 exports 对外提供接口
  // exports.doSomething = ...

  // 或者通过 module.exports 提供整个接口
  module.exports = function() {
      console.log('hello')
  }

});