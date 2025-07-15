## webpack 简易实现

https://github.com/ChichengL/mini-webpack

## Webpack 主要流程详解

### 一、概述

Webpack 是一个强大的模块打包工具，它可以将各种类型的模块打包成一个或多个文件。本仓库（https://github.com/ChichengL/mini-webpack ）实现了一个简易版的 Webpack，下面将结合仓库代码详细介绍 Webpack 的主要流程。

### 二、Webpack 主要流程

#### 1. 初始化参数

Webpack 会从配置文件（如 `webpack.config.js`）和 Shell 语句中读取并合并参数，得出最终的参数。

##### 代码示例

在 `webpack.config.js` 中定义了各种配置信息，包括入口文件、输出文件、Loader 规则和插件等。

```javascript
// webpack.config.js
const path = require("path");
const RunPlugin = require("./plugins/RunPlugin");
const DonePlugin = require("./plugins/DonePlugin");
const BuildModulePlugin = require("./plugins/BuildModulePlugin");

module.exports = {
  context: process.cwd(), // 当前的根目录
  mode: "development", // 工作模式
  entry: path.join(__dirname, "src/index.js"), // 入口文件
  output: {
    // 出口文件
    filename: "bundle.js",
    path: path.join(__dirname, "./dist"),
  },
  module: {
    // 要加载模块转化loader
    rules: [
      {
        test: /\.js$/,
        use: [
          {
            loader: path.join(__dirname, "./loaders/babel-loader.js"),
            options: {
              presets: ["@babel/preset-env"],
            },
          },
        ],
      },
      {
        test: /\.(png|jpe?g|gif|svg)$/i, // 匹配图片文件
        use: [
          {
            loader: path.join(__dirname, "./loaders/image-loader.js"), // 使用图片 Loader
          },
        ],
      },
    ],
  },
  plugins: [new RunPlugin(), new DonePlugin(), new BuildModulePlugin()], // 插件
};
```

#### 2. 开始编译

用上一步得到的参数初始化 `Compiler` 类，加载所有配置的插件，执行对象的 `run` 方法开始执行编译。

##### 代码示例

在 `lib/Compiler.js` 中，`Compiler` 类的构造函数接收配置参数，并初始化各种钩子。

```javascript
class Compiler {
  constructor(options) {
    this.options = options;
    this.hooks = {
      initialize: new SyncHook(), // 初始化完成
      run: new SyncHook(), // 开始编译
      compile: new SyncHook(), // 开始编译模块
      buildModule: new SyncHook(["modulePath"]), // 编译单个模块
      emit: new SyncHook(), // 生成资源
      afterEmit: new SyncHook(), // 写入文件完成
      done: new SyncHook(), // 打包完成
    };
    this.modules = {};
    this.root = process.cwd(); // 确保 root 被正确设置
    this.extensions = this.options.resolve?.extensions || [".js", ".json"]; // 设置默认扩展名
    console.log("extensions", this.extensions);
    console.log(
      "simple-webpack ------------------> 实例化 Compiler",
      this.root
    );
    this.hooks.initialize.call(); // 触发初始化钩子
  }

  run() {
    this.hooks.run.call();
    // 出发run钩子，执行对应挂载的函数
    let entry = this.options.entry;
    console.log("entry", entry);

    this.entryPath = "./" + path.relative(this.root, entry).replace(/\\/g, "/"); // 设置 entryPath 为相对路径

    this.hooks.compile.call(); // 触发 compile 钩子

    this.buildModule(entry, true);

    const outputPath = path.resolve(this.root, this.options.output.path);
    const filePath = path.resolve(outputPath, this.options.output.filename);
    this.mkdirP(outputPath, filePath);
  }
}
```

#### 3. 确定入口

根据配置中的 `entry` 找出所有的入口文件。

##### 代码示例

在 `lib/Compiler.js` 的 `run` 方法中，通过 `this.options.entry` 获取入口文件路径。

```javascript
let entry = this.options.entry;
this.entryPath = "./" + path.relative(this.root, entry).replace(/\\/g, "/"); // 设置 entryPath 为相对路径
```

#### 4. 编译模块

从入口文件出发，调用所有配置的 Loader 对模块进行编译，再找出该模块依赖的模块，再递归本步骤直到所有入口依赖的文件都经过了本步骤的处理。

##### 代码示例

在 `lib/Compiler.js` 的 `buildModule` 方法中，首先处理模块路径，然后获取模块源码，使用 Loader 进行处理，最后解析模块的依赖并递归编译。

```javascript
buildModule(modulePath, isEntry) {
    // 统一处理为相对路径
    modulePath =
        "./" + path.relative(this.root, modulePath).replace(/\\/g, "/");
    // 补全文件名
    modulePath = this.resolveModulePath(modulePath);
    if (this.modules[modulePath]) {
        return; // 解决循环依赖问题
    }

    this.hooks.buildModule.call(modulePath);
    const source = this.getSource(modulePath);

    const { sourceCode, dependencies } = this.parse(source, modulePath);
    this.modules[modulePath] = JSON.stringify(sourceCode);
    console.log(
        "simple-webpack ------------------> 解析模块",
        modulePath,
        dependencies
    );

    dependencies.forEach((d) => {
        const dependencyPath = path.resolve(this.root, d);
        this.buildModule(dependencyPath, false); // 递归构建依赖
    });
}

getSource(modulePath) {
    let content = fs.readFileSync(modulePath, "utf-8");
    const rules = this.options.module.rules;

    for (const rule of rules) {
        const { test, use } = rule;
        if (test.test(modulePath)) {
            // 匹配上了
            let length = use.length - 1;
            const loopLoader = () => {
                // 使用箭头函数
                const { loader, options } = use[length--];
                let loaderFunc = require(loader); // loader是一个函数

                // 手动绑定 Loader 上下文
                const loaderContext = {
                    resourcePath: modulePath, // 设置 resourcePath
                    options: this.options, // 传递 Webpack 配置
                };

                // 调用 Loader，并绑定上下文
                content = loaderFunc.call(loaderContext, content, options);

                if (length >= 0) {
                    loopLoader();
                }
            };
            if (length >= 0) {
                // 启动
                loopLoader();
            }
        }
    }
    return content;
}
```

#### 5. 完成模块编译

在经过第 4 步使用 Loader 翻译完所有模块后，得到了每个模块被翻译后的最终内容以及它们之间的依赖关系。

##### 代码示例

在 `lib/Compiler.js` 的 `parse` 方法中，使用 Babel 对模块源码进行转换，并解析模块的依赖。

```javascript
parse(source, moduleName) {
    let dependencies = [];
    const dirname = path.dirname(moduleName);
    const requirePlugin = {
        visitor: {
            // 替换源码中的require为__webpack_require__
            CallExpression(p) {
                const node = p.node;
                if (node.callee.name === "require") {
                    node.callee.name = "__webpack_require__";
                    // 路径替换
                    let modulePath = node.arguments[0].value;
                    modulePath =
                        "./" + path.join(dirname, modulePath).replace(/\\/g, "/");
                    node.arguments = [t.stringLiteral(modulePath)];
                    dependencies.push(modulePath);
                }
            },
        },
    };
    let result = babel.transform(source, {
        plugins: [requirePlugin],
    });
    return {
        sourceCode: result.code,
        dependencies,
    };
}
```

#### 6. 输出资源

根据入口和模块之间的依赖关系，组装成一个个包含多个模块的 Chunk，再把每个 Chunk 转换成一个单独的文件加入到输出列表，这步是可以修改输出内容的最后机会。

##### 代码示例

在 `lib/Compiler.js` 的 `mkdirP` 方法中，使用 EJS 模板生成最终的打包文件。

```javascript
mkdirP(outputPath, filePath) {
    console.log("simple-webpack ------------------> 文件输出");
    const { modules, entryPath } = this;
    // 创建文件夹
    if (!fs.existsSync(outputPath)) {
        fs.mkdirSync(outputPath);
    }
    this.hooks.emit.call(); // 触发 emit 钩子
    ejs
      .renderFile(path.join(__dirname, "Template.ejs"), { modules, entryPath })
      .then((code) => {
            fs.writeFileSync(filePath, code);
            console.log("simple-webpack ------------------> 打包完成");
        });
}
```

#### 7. 输出完成

在确定好输出内容后，根据配置确定输出的路径和文件名，把文件内容写入到文件系统。

##### 代码示例

在 `lib/Compiler.js` 的 `mkdirP` 方法中，使用 `fs.writeFileSync` 将生成的代码写入到指定的文件中。

```javascript
ejs
  .renderFile(path.join(__dirname, "Template.ejs"), { modules, entryPath })
  .then((code) => {
    fs.writeFileSync(filePath, code);
    console.log("simple-webpack ------------------> 打包完成");
  });
```

### 三、插件的运行

Webpack 插件通过钩子机制来实现，在不同的阶段执行相应的操作。

#### 代码示例

在 `webpack.config.js` 中配置了多个插件，这些插件会在不同的钩子中执行。

```javascript
// webpack.config.js
const RunPlugin = require("./plugins/RunPlugin");
const DonePlugin = require("./plugins/DonePlugin");
const BuildModulePlugin = require("./plugins/BuildModulePlugin");

module.exports = {
  // ...
  plugins: [new RunPlugin(), new DonePlugin(), new BuildModulePlugin()], // 插件
};
```

在 `lib/Compiler.js` 中定义了各种钩子，插件可以在这些钩子中注册回调函数。

```javascript
class Compiler {
  constructor(options) {
    this.options = options;
    this.hooks = {
      initialize: new SyncHook(), // 初始化完成
      run: new SyncHook(), // 开始编译
      compile: new SyncHook(), // 开始编译模块
      buildModule: new SyncHook(["modulePath"]), // 编译单个模块
      emit: new SyncHook(), // 生成资源
      afterEmit: new SyncHook(), // 写入文件完成
      done: new SyncHook(), // 打包完成
    };
    // ...
  }
}
```

以 `RunPlugin` 为例，它会在 `run` 钩子中执行。

```javascript
// plugins/RunPlugin.js
module.exports = class RunPlugin {
  apply(compiler) {
    compiler.hooks.run.tap("RunPlugin", () => {
      console.log("runPlugin");
    });
  }
};
```
