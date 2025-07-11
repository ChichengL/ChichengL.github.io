# NApi

作用：NAPI 的核心作用是让你用 C/C++ 编写可被 Node.js 调用的原生插件，从而扩展 Node.js 的能力（如处理高性能计算、调用底层库等），且具备跨 Node.js 版本兼容性

## 基础结构

**C/C++ 编写函数 → 注册为 Node 模块 →JS 调用**

可以理解为跨语言方法，利用高性能语言如 c、c++、rust、go 等实现高性能，类似于 WebAssembly(WASM)。
适用场景：系统级操作、高性能原生模块

```graph
    A[Node.js 主进程] --> B[N-API 模块]
    A --> C[Wasm 模块]
    B --> D{系统调用}
    C --> E[计算密集型任务]
    B --> C[数据交换]
```

项目基础结构
示例

```
├───src
│   ├───c # C 代码
│   └───cpp # C++ 代码
│
├───binding.gyp    # node-gyp的构建配置 或者使用Cmake
└───index.js       # JS调用入
```

hello.cc

```cpp
#include <napi.h>

Napi::String Method(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  return Napi::String::New(env, "world");
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
  exports.Set(Napi::String::New(env, "hello"),
              Napi::Function::New(env, Method));
  return exports;
}

NODE_API_MODULE(hello, Init)
```

binding.gyp

```gyp
{
  "targets": [
    {
      "target_name": "hello",
      "sources": [ "hello.cc" ],
      'include_dirs': [
        "<!@(node -p \"require('node-addon-api').include\")"
      ],
      'dependencies': [
        "<!(node -p \"require('node-addon-api').gyp\")"
      ],
      'defines': [ 'NAPI_DISABLE_CPP_EXCEPTIONS' ]
    }
  ]
}
```

index.js

```js
const addon = require("./build/Release/hello.node");

console.log("addon.hello()", addon.hello());
```
