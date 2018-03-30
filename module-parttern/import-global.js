// 这里必须加分号
var glocalVar = '123';

// 通过参数, 可以传入全局变量, 这也是使用其他模块的方式
(function() {
    console.log('global var', glocalVar)
})(glocalVar)