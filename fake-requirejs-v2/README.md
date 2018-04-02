# fake-requirejs
模块化的 requirejs

### 实现
1. 找到 data-main 属性并设置为 baseUrl;
2. req(cfg): 创建 context, 将 config 传入 context
3. context.require(config)