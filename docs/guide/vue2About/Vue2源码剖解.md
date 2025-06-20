# 从零手写 Vue2 部分

## 实际搭建

### 使用 Rollup 搭建开发环境

```
npm init -y
```

进行一个初始化

```
npm install rollup  rollup-plugin-babel @babel/core @babel/preset-env --save-dev
```

安装 rollup，babel，然后让其在保存在本地，并且只在调试中运行

创建`rollup.config.js`，以便通过 rollup 进行打包。

将 package.json 里面的 script 配置项中的 test 配置项，名字换为 dev，内容变为 rollup -cw -c 指定配置文件，-w 监视文件变化!
创建 src 入口文件夹，里面创建 index.js 作为入口文件

配置 rollup.config.js 文件

```js
import babel from "rollup-plugin-babel";
//rollup默认可以导出一个对象 作为打包的配置文件
export default {
  input: "./src/index.js", //入口
  output: {
    file: "./dist/vue.js", //出口
    format: "umd", //打包模式  常见有esm  es6模块  commonjs模块    iife自执行函数  umd统一模块规范(commonjs && amd)
    name: "Vue", // global.Vue
    sourcemap: true, //希望可以调试代码
  },
  plugins: [
    babel({
      exclude: "node_modules/**", //排除node_modules所有的文件
    }),
  ], //插件
};
```

配置 babel 文件 .babelrc 预设引入插件

```
{
  "presets":[
    "@babel/preset-env"
  ]
}
```

### 初始化数据

Vue 没有使用 class 进行创建，而是使用的构造函数，通过构造函数来扩建方法，这样扩建的方法可以放在不同文件中，而类必须放在一个类声明中，非常臃肿

index.js

```js
//将所有的方法耦合在一起
import { initMixin } from "./init";

function Vue(options) {
  //options就是用户的选项
  this._init(options); //初始化操作
}

initMixin(Vue); //扩展了init方法

export default Vue;
```

init.js

```js
import { initState } from "./state";

export function initMixin(Vue) {
  //给Vue 增加init方法
  Vue.prototype._init = function (options) {
    //用于初始化操作
    //vue vm.$options 就是获取用户的配置
    const vm = this; //
    vm.$options = options; //把用户配置赋值给vm.,挂载到vm身上 使用$标识表示这是vue里面的

    //初始化状态
    initState(vm);
  };
}
```

像这样，然后不同添加的方法可以放在某某文件中，然后进行导入添加上就 OK。

比较多的方法可以放在其他文件里面

比如需要 initState 函数

state.js

```js
import { observe } from "./observe/index";
export function initState(vm) {
  const opts = vm.$options; //获取所有的选项
  if (opts.data) {
    //如果有data选项那么初始化data
    initData(vm);
  }
}

function initData(vm) {
  let data = vm.$options.data; //data可能是函数，可能是对象
  // debugger;
  data = typeof data === "function" ? data.call(vm) : data; //call进行执行函数\
  vm._data = data; //将data挂载到vm._data
  //对数据进行劫持，Vue2使用defineProperty
  observe(data);
}
```

### 实现对象响应式原理

对对象进行深度劫持

Vue2 使用的 api defineProperty

`/observe/index.js`

```js
class Observer {
  constructor(data) {
    //Object.defineProperty只能劫持已经存在的
    this.walk(data);
  }
  walk(data) {
    //循环对象   对属性依次劫持
    //  "重新定义"属性
    Object.keys(data).forEach((key) => defineReactive(data, key, data[key]));
  }
}

export function defineReactive(data, key, val) {
  //形成闭包，值不会消失
  observe(val); //这里是递归处理对象，如果data的属性中存在对象，那么就会继续递归下去处理，因此Vue2的数据劫持性能较低，但是数组还没有处理
  Object.defineProperty(data, key, {
    get() {
      //取值会执行get
      return val;
    },
    set(newVal) {
      if (newVal !== val) {
        val = newVal;
        console.log("数据被修改了");
      }
    },
  });
}
export function observe(data) {
  if (typeof data !== "object" || data === null) return; //只对对象劫持
  //如果一个对象被劫持了，那么就不需要再被劫持了（判断一个对象是否被劫持过，可以添加一个实例，用实例进行判定）
  return new Observer(data);
}
```

像上面完成了代理，但是比较阴间，因为每次需要 data 中的 xxx 属性`都需要vm._data.xxx`

因此可以将 vm.\_data 进行代理，放在 vm 上，这是`state.js`补充的内容

```js
function proxy(vm, target, key) {
  Object.defineProperty(vm, key, {
    get() {
      return vm[target][key];
    },
    set(newVal) {
      vm[target][key] = newVal;
    },
  });
}

//.....省略了一些东西
function initData(vm) {
  //...
  observe(data);

  for (let key in data) {
    //将vm._data用vm进行代理
    proxy(vm, "_data", key);
  }
}
```

或者写成另一种情况

```js
function initData(vm) {
  //...
  observe(data);
  proxy(vm, "_data");
}

function proxy(vm, target) {
  Object.keys(target).forEach((key) => {
    Object.defineProperty(vm, key, {
      get() {
        return vm[target][key];
      },
      set(newVal) {
        vm[target][key] = newVal;
      },
    });
  });
}
```

### 实现数组的数据劫持

数组如果仍然是用对象的方式去添加，虽然能添加上，但是改动一个，又要全部重新更新，非常不方便。

修改数组很少使用索引进行直接操作，因为类似于 a[9999] = 0，内部进行劫持非常消耗性能。

而且大多数时候是通过 shift，unshift，push，pop 这些操作进行操作的

不可枚举 enumerabel:false，是指不可循环、不可以取值。

`observe/index.js`

```js
class Observe {
  constructor(data) {
    //数组单独处理
    data.__ob__ = this; //这里可以给data添加一个__ob__属性，这个属性指向Observer实例，这样就可以通过__ob__属性访问Observer实例了
    Object.defineProperty(data, "__ob__", {
      value: this,
      enumerable: false, //将ob变为不可枚举否则会陷入死循环，因为进入data后枚举到其__ob__属性（实际回到了本身），那么就会出现问题
    });
    // 同时给数据加了标识，数据上有ob那么对象被代理过，但是也需要其变成不可枚举属性
    if (Array.isArray(data)) {
      //这里我们可以重写数组中的七个编译方法，可以修改数组本身的。除此之外还有数组内的引用方法也应该劫持，比如一个对象作为数组的内容
      //同时保留其他的方法，因此需要在array.js里面重写
      data.__proto__ = newArrayProto;
      this.observeArray(data); //观测数组
    } else {
      this.walk(data);
    }
  }
  walk(data) {
    Object.keys(data).forEach((key) => defineReactive(data, key, data[key]));
  }
  observeArray() {
    data.forEach((item) => observe(item));
  }
  //剩下的和之前一样
}
//.....
export function observe(data) {
  if (typeof data !== "object" || data === null) return; //只对对象劫持
  //如果一个对象被劫持了，那么就不需要再被劫持了（判断一个对象是否被劫持过，可以添加一个实例，用实例进行判定）

  if (data.__ob__ instanceof Observer) {
    //说明被代理过 就不需要再次代理
    return data.__ob__;
  }
  return new Observer(data);
}
```

`observe/array.js`

```js
//重写数组的部分方法

let oldArrayProto = Array.prototype; //获取数组的原型
export let newArrayProto = Object.create(oldArrayProto); //将原有的原型加在新数组原型上

//找到所有的变异方法

let methods = ["push", "pop", "shift", "unshift", "splice", "sort", "reverse"];
methods.forEach((method) => {
  //arr.push(1,2,3)
  newArrayProto[method] = function (...args) {
    //调用原来的方法修改数组，函数的劫持，切片编程
    const result = oldArrayProto[method].call(this, ...args);
    // console.log('method',method);
    //对新增的数据再次进行劫持
    let inserted;
    let ob = this.__ob__;
    switch (method) {
      case "push":
      case "unshift":
        inserted = args;
        break;
      case "splice": //arr.splice(0,1,{a:1})//第一个是删除的位置，第二个是个数
        inserted = args.slice(2);
        break;
      default:
        break;
    }
    if (inserted) {
      //对新增内容再次进行观测,这是新的数组，可以使用observeArray进行观测，那么可以将Observer的实例对象，放在data的某一个值上
      ob.observeArray(inserted);
    }
    return result;
  };
});
```

### 解析模版参数

比如插值语法等等

模版引擎 性能比较差需要正则匹配 1.0 的时候，没有引入虚拟 DOM 的改变

2.采用虚拟 DOM，数据变化后比较虚拟 DOM 的差异 最后渲染到页面

3.核心：我们需要将模版变成我们的 js 语法，通过 js 语法生成虚拟 DOM

从一个东西变成一个东西，语法之间的转化，es6=>es5

css 压缩 我们需要先变成语法树再重新组装代码成为新的语法 将 template 语法换成 render 函数

渲染优先顺序，render 函数>template>el

需要安装新插件

```
npm install @rollup/plugin-node-resolve
```

这样可以导入的时候自动找寻 index 文件，就只用写`import xxx from './compiler'`实际上是`import xxx from './compiler/index.js'`

#### 转译

比如使用正则去匹配，正则的规则如下（Vue3 不是使用正则）

```js
const startTagOpen = new RegExp(`^<${qnameCapture}`); //它匹配到的分组是一个标签名<xxx> 匹配开始标签名
const endTag = new RegExp(`^<\\/${qnameCapture}[^>]*>`); //匹配的是</xxx> 最终匹配到结束标签名
const attribute =
  /^\s*([^\s"'<>\/=]+)(?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?/; //匹配属性 a="xxxx" b  =  'xxx' c = xxx
//第一个分组是属性的key，value是分组3或分组4或者分组5
const startTagClose = /^\s*(\/?)>/; //可以匹配<div>或者<br/>
const defaultTagRE = /\{\{((?:.|\n)+?)\}\}/g; //匹配双括号，内容是表达式的变量
```

首先在 init 里面进行修改，因为初始化完毕，那么就需要解析模版进行渲染了

`init.js`

```js
import { initState } from "./state";
import { compileToFunction } from "./compiler/index";
export function initMixin(Vue) {
  //给Vue 增加init方法
  Vue.prototype._init = function (options) {
    //用于初始化操作
    //vue vm.$options 就是获取用户的配置
    const vm = this; //
    vm.$options = options; //把用户配置赋值给vm.,挂载到vm身上 使用$标识表示这是vue里面的
    //初始化状态
    initState(vm);
    //判断是否由el属性
    if (options.el) {
      vm.$mount(options.el); //挂载
    }
  };
  Vue.prototype.$mount = function (el) {
    const vm = this;
    el = document.querySelector(el);
    let op = vm.$options;
    if (!op.render) {
      //如果没有render函数
      let template; //没有render看是否写了template。没有写template采用外部的template
      if (!op.template && el) {
        //没有模版但是有el
        template = el.outerHTML;
      } else {
        template = op.template; //如果有el则采用模版
      }
      // console.log(template);
      if (template) {
        //存在模版就对模版进行编译
        const render = compileToFunction(template);
        op.render = render; //把编译后的render函数赋值给render
      }
    }
    op.render;
    //script标签引用的vue.global.js这个编译过程是在浏览器进行的，runtime是不包含模版编译的，整个编译是打包的时候通过loader来转义.vue文件的
    //用runtime的时候不能使用template模版的
  };
}
```

转化为 ast（抽象语法树），可以使用栈结构。 遇到开始标签扔进去标签名，遇到结束标签弹出，这样就可以逐步得到，该标签的父结构和子结构分别是什么

<strong style="color:red">主结构</strong>：`compiler/index.js`

```js
import { parseHTML } from "./parse";
export function compileToFunction(template) {
  //1.将template转化为ast语法树
  let ast = parseHTML(template);
  // 2.生成render函数（render方法执行后返回的结果是虚拟DOM）
}
```

`compiler/parse.js`将得到的字符串转化为 html 结构，DOM 树

```js
const ncname = `[a-zA-Z_][\\-\\.0-9_a-zA-Z]*`;
const qnameCapture = `((?:${ncname}\\:)?${ncname})`;

const startTagOpen = new RegExp(`^<${qnameCapture}`); //它匹配到的分组是一个标签名<xxx> 匹配开始标签名
const endTag = new RegExp(`^<\\/${qnameCapture}[^>]*>`); //匹配的是</xxx> 最终匹配到结束标签名 分组1是标签名
const attribute =
  /^\s*([^\s"'<>\/=]+)(?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?/; //匹配属性 a="xxxx" b  =  'xxx' c = xxx
//第一个分组是属性的key，value是分组3或分组4或者分组5
const startTagClose = /^\s*(\/?)>/; //可以匹配<div>或者<br/>
const defaultTagRE = /\{\{((?:.|\n)+?)\}\}/g; //匹配双括号，内容是表达式的变量

export function parseHTML(html) {
  // html最开始肯定是一个<
  //最终需要转化为一颗抽象的语法树

  const ELEMENT_TYPE = 1; //元素类型1
  const TEXT_TYPE = 3; //文本类型3
  const stack = []; //存放标签的栈
  let currentParent = null; //指向栈中的最后一个
  let root = null; //根节点

  function createASTElement(tag, attrs) {
    return {
      tag: tag,
      type: ELEMENT_TYPE,
      children: [],
      attrs,
      parent: null,
    };
  }

  function start(tag, attrs) {
    //给标签名和属性
    const node = createASTElement(tag, attrs); //创造ast结点
    if (!root) {
      root = node; //如果树为空，则为根节点
    }
    if (currentParent) {
      node.parent = currentParent; //当前结点的父节点是当前的父节点
      currentParent.children.push(node); //把它父亲结点的儿子指向它；
    }
    stack.push(node); //把当前的标签名压入栈中
    currentParent = node;
  }
  function chars(text) {
    //文本放在当前结点中
    text = text.replace(/\s/g, ""); //如果空格超过两个以上就删除两个以上
    text &&
      currentParent.children.push({
        type: TEXT_TYPE,
        text,
        parent: currentParent,
      });
  }
  function end(tag) {
    stack.pop(); //弹出最后一个
    currentParent = stack[stack.length - 1];
  }
  function advance(len) {
    html = html.substring(len);
  }
  function parseStartTag() {
    const start = html.match(startTagOpen); //
    if (start) {
      const match = {
        tagName: start[1],
        attrs: [],
        // start: index
      };
      advance(start[0].length); //匹配上了就进行截取
      // console.log(match,html);
      let attr, end;
      while (
        !(end = html.match(startTagClose)) &&
        (attr = html.match(attribute))
      ) {
        advance(attr[0].length);
        match.attrs.push({
          name: attr[1],
          value: attr[3] || attr[4] || attr[5] || true,
        }); //true是为了弄disabled
      }
      if (end) advance(end[0].length); //结束的尖角号
      return match;
    }
    //如果不是开始标签的结束就一直匹配

    // console.log(html);
    return false;
  }
  while (html) {
    //如果textEnd为0，说明是一个开始标签或者结束标签   如果textEnd>0说明就是文本的结束位置
    let textEnd = html.indexOf("<"); //如果indexOf中的索引是0，则说明是个标签
    if (textEnd === 0) {
      const startTagMatch = parseStartTag(); //开始标签的匹配结果
      if (startTagMatch) {
        //解析到开始标签
        start(startTagMatch.tagName, startTagMatch.attrs);
        continue;
      }
      let endTagMatch = html.match(endTag); //匹配结束标签
      if (endTagMatch) {
        advance(endTagMatch[0].length);
        end(endTagMatch[1]);
        // console.log(endTagMatch);
        continue;
      }
    }
    if (textEnd > 0) {
      let text = html.substring(0, textEnd); //文本内容
      if (text) {
        chars(text); //将文本内容传递给chars
        advance(text.length);
      }
    }
  }
  // console.log(root);
  return root;
}
```

#### 代码生成

`compiler/index.js`

这里面就是生成字符串以便后面的生成,`_c是标签,_v是文本,_s是插值语法`

```js
import { parseHTML } from "./parse";

function genProps(attrs) {
  let str = "";
  for (let i = 0; i < attrs.length; i++) {
    let attr = attrs[i];
    if (attr.name === "style") {
      //  color:red ==> {color:'red'}
      let obj = {};
      attr.value.split(";").forEach((item) => {
        //qs库
        let [key, value] = item.split(":");
        obj[key] = value;
      });
      attr.value = obj;
    }
    str += `${attr.name}:${JSON.stringify(attr.value)},`;
  }
  return `{${str.slice(0, -1)}}`; //去掉最后一个逗号
}

const defaultTagRE = /\{\{((?:.|\r?\n)+?)\}\}/g; //匹配双括号，内容是表达式的变量
function gen(node) {
  if (node.type === 1) {
    //说明是元素
    return codegen(node);
  } else {
    //文本两种情况
    let text = node.text;
    if (!defaultTagRE.test(text)) {
      //纯文本
      return `_v(${JSON.stringify(text)})`;
    } else {
      //_v(_s(name)+'hello'+_s(age))
      let tokens = [];
      let match;
      defaultTagRE.lastIndex = 0; //从文本开头执行匹配,每次exec后,lastIndex都会更新为下一次匹配开始的位置
      let lastIndex = 0; //最后匹配的位置
      while ((match = defaultTagRE.exec(text))) {
        //使用正则来捕获文本
        let index = match.index; //匹配的位置
        if (index > lastIndex) {
          //比如 {{name}} hello {{age}},取得就是 hello 这段
          tokens.push(JSON.stringify(text.slice(lastIndex, index)));
        }
        tokens.push(`_s(${match[1].trim()})`);
        lastIndex = index + match[0].length; //更新最后匹配的位置
      }
      // 防止插入语法后面还存在一些文本
      if (lastIndex < text.length) {
        tokens.push(JSON.stringify(text.slice(lastIndex)));
      }
      return `_v(${tokens.join("+")})`;
    }
  }
}

function genChildren(children) {
  return children.map((item) => gen(item));
}

function codegen(ast) {
  let children = genChildren(ast.children);
  let code = `_c('${ast.tag}',${
    ast.attrs.length > 0 ? genProps(ast.attrs) : "null"
  }${ast.children.length > 0 ? `,${children}` : ",null"})`;
  return code;
}

export function compileToFunction(template) {
  //1.将template转化为ast语法树
  let ast = parseHTML(template);
  // console.log(ast);
  // 2.生成render函数（render方法执行后返回的结果是虚拟DOM）
  //将ast树生成为类似于下面的字符串
  //  _c('div',{id:'app'},_c('div',{style:{color:'red'}},_v(_s(name)+'hello'),_c('span',undefine,_v(_s(age)))))
  //
  let code = codegen(ast);
  code = `with(this){return ${code}}`;
  let render = new Function(code); //根据代码生成render函数
  return render;
}
```

#### render 函数准备

模版引擎的实现原理就是 with + new Function

即在`compiler/index.js`里面的这个

```js
export function compileToFunction(template) {
  //1.将template转化为ast语法树
  let ast = parseHTML(template);
  // console.log(ast);
  // 2.生成render函数（render方法执行后返回的结果是虚拟DOM）
  //将ast树生成为类似于下面的字符串
  //  _c('div',{id:'app'},_c('div',{style:{color:'red'}},_v(_s(name)+'hello'),_c('span',undefine,_v(_s(age)))))
  //
  let code = codegen(ast);
  code = `with(this){return ${code}}`;
  let render = new Function(code); //根据代码生成render函数
  return render;
}
```

完成之后需要在`init.js`里面去执行挂载

```js
import { mountComponent } from "./lifeCycle";
//...
Vue.prototype.$mount = function (el) {
  //....
  mountComponent(vm, el);
};
```

`lifeCycle.js`

```js
export function initLifeCycle(Vue) {
  Vue.prototype._updata = function (vnode) {};
  Vue.prototype._render = function () {};
}

export function mountComponent(vm, el) {
  //调用render方法产生虚拟DOM
  vm._updata(vm._render()); //vm.$options.render()渲染虚拟结点,vm._update()生成真实DOM
  // 根据虚拟DOM产生真实DOM
  // 3.插入到el元素中
}
```

Vue 核心流程 1)创造了响应式 2)模版转化为 ast 语法树 3)将 ast 语法树转换为 render 函数 4)后续每次数据更新可以只执行 render 函数(无需再次执行 ast 转化过程)

render 函数会产生虚拟节点(使用响应式数据)

再根据虚拟节点创造真实的 DOM

当渲染函数 render 执行时,会执行`_c,_v,_s`等函数

当渲染时,会在事例中取值,我们就可以将属性和视图绑定在一起

`_update`函数就是将虚拟的 DOM 结点转化为真实的 DOM 节点

`lifyCycle.js`

```js
import { createElementVNode } from "./vdom/index";
import { createTextNodeVNode } from "./vdom/index";

export function initLifeCycle(Vue) {
  Vue.prototype._updata = function (vnode) {
    //将虚拟DOM转化为真实DOM
    const vm = this;
    const el = vm.$el;
    //这里vnode是虚拟节点,是真实节点
    patch(el, vnode); //使用vnode,更新出真正的dom
    //patch既有初始化的功能,又有更新的功能
  };
  Vue.prototype._c = function () {
    return createElementVNode(this, ...arguments);
  };
  // _c('div',{},...children)
  Vue.prototype._v = function () {
    return createTextNodeVNode(this, ...arguments);
  };
  // _v(text)
  Vue.prototype._s = function (value) {
    if (typeof value !== "object") return value;
    return JSON.stringify(value);
  };
  Vue.prototype._render = function () {
    const vm = this;
    // 让with中的this指向vm
    // console.log(vm.name,vm.age);
    return vm.$options.render.call(vm); //通过ast语法转义后生成的render方法
  };
}

export function mountComponent(vm, el) {
  //这里的el是通过querySelector处理过的
  vm.$el = el;
  //调用render方法产生虚拟DOM
  vm._updata(vm._render()); //vm.$options.render()渲染虚拟结点,vm._update()生成真实DOM
  // 根据虚拟DOM产生真实DOM
  // 3.插入到el元素中
}
```

然后在

`vdom/index.js中`进行创建虚拟结点

```js
// h函数,_c函数都是调用这些
export function createElementVNode(vm, tag, data, ...children) {
  if (data == null) {
    data = {};
  }
  let key = data.key || null;
  if (key) {
    delete data.key;
  }
  return VNode(vm, tag, key, data, children);
}

// _v
export function createTextNodeVNode(vm, text) {
  return VNode(vm, undefined, undefined, undefined, undefined, text);
}
// 创建虚拟DOM,和ast一样吗?
// ast是做的语法上的转化,他描述的是语法本身(可以描述js css html)
// 虚拟DOM是描述的dom元素,可以增加一些自定义属性(描述dom)
function VNode(vm, tag, key, data, children, text) {
  return {
    vm,
    tag,
    key,
    data,
    children,
    text,
  };
}
```

### 虚拟 DOM 转化为真实 DOM

转化是发生在更新时，初始化也会有更新操作。

只不过初始化的更新，是从旧的 DOM 转化为由虚拟 DOM 产生的真实 DOM。

后续的更新是 diff 算法进行比较进而更新

通过`xxx.nodeType`，如果这个 xxx 是元素节点上截取下来的那么，其值为`1`否则就是 undefined

新的 DOM 产生时需要`先`将新的 DOM 放在旧 DOM 之后,再将其删除

`lifeCycle.js`

```js
function createElm(vnode) {
  let { tag, data, children, text } = vnode;
  if (typeof tag === "string") {
    //标签
    vnode.el = document.createElement(tag); // 这里将真实节点和虚拟节点对应起来，后续如果修改属性了
    patchProps(vnode.el, data); // 处理data
    children.forEach((child) => {
      vnode.el.appendChild(createElm(child));
    });
  } else {
    //就是创建文本
    vnode.el = document.createTextNode(text);
  }
  return vnode.el;
}

function patchProps(el, props) {
  for (let key in props) {
    //styly{color:'red'}
    if (key === "style") {
      for (let styleName in props.style) {
        el.style[styleName] = props.style[styleName];
      }
    } else {
      el.setAttribute(key, props[key]); //这里将属性都设置到真实dom上
    }
  }
}

function patch(oldVNode, vnode) {
  //初渲染和后面的diff渲染一样的
  const isRealElement = oldVNode.nodeType; //nodeType是js原生属性,如果是元素节点的那么值就是1
  if (isRealElement) {
    const elm = oldVNode; //这里oldVNode是真实dom
    const parentElm = elm.parentNode; //拿到真实元素

    let newElm = createElm(vnode);
    parentElm.insertBefore(newElm, elm); //将新节点插入到老节点后面
    parentElm.removeChild(elm); //删除老节点
    return newElm;
  } else {
    // diff算法
  }
}
```

生成节点操作

### 依赖收集

dependency collection

我们更新后节点需要自动去完成修改节点的操作,而非人为。即是观察者模式，在该模式下，会监听到数据变化从而更新视图

1.将数据处理为响应式,initState（针对对象来说主要是增加 defineProperty，针对数组就是重写方法）

2.模板编译：将模板转为 ast 语法树，将 ast 语法树生成**render**方法

3.调用 render 函数会进行取值操作产生对应的虚拟 DOM render(){\_c(‘div’,null,-v(name))}

4.将虚拟 DOM 转化为真实 DOM

一个属性对应一个 dep，在一个视图中，一个 watcher 对应多个 dep。（dep 是监视属性的东西）

Vue 里面是否是在使用数据的地方对应着一个 watcher，一个属性对应着处使用，因此一个 dep 对应多个 watcher

每个属性、对象、数组上都有一个 Dep 类型，Dep 类主要就是收集用于渲染的 watcher，`Dep相当于发布者，如果有数据变动就调用发布者的更新方法`

一个属性可能被多个组件用到，那么一个 dep 就对应着多个 watcher。dep 和 watcher 是多对多的关系

封装一个 watcher 类,监视数据变化

在挂载组件的的时候就需要给组件一个监视器，那么需要在`lifeCycle那里改改`

```js
export function mountComponent(vm, el) {
  //这里的el是通过querySelector处理过的
  vm.$el = el;
  //调用render方法产生虚拟DOM
  const updateComponent = vm._updata(vm._render()); //vm.$options.render()渲染虚拟结点,vm._update()生成真实DOM
  // 根据虚拟DOM产生真实DOM
  // 3.插入到el元素中
  new Watcher(vm, updateComponent, true); //这里的true标识着一个渲染过程
}
```

这里传入 true 是为了判定是挂载还是更新

通过 dep 依赖对象和 watcher 监视属性和组件,那么在修改时就会非常方便

`observe/dep.js`

```js
let id = 0;
class Dep {
  constructor() {
    this.id = id++; //属性的dep需要收集watcher
    this.subs = []; //存放着当前属性对应的watcher有哪些
  }
  depend() {
    //为了避免一个模板中使用两个数据导致重复收集,除了dep->watcher还希望watcher->dep
    // this.subs.push(Dep.target);//收集watcher这样写会重复

    Dep.target.addDep(this); //收集dep,先让watcher收集到dep,再让dep存储watcher
    // 一个组件中由多个属性组成(那么对应一个watcher监视多个dep)
  }
  addSub(watcher) {
    this.subs.push(watcher);
  }
  notify() {
    this.subs.forEach((watcher) => watcher.update()); //让视图去更新
  }
}

Dep.target = null;

export default Dep;
```

`observe/watcher.js`

```js
import Dep from "./dep";

let id = 0;

// 1)当我们创建渲染watcher的时候我们会把当前的渲染watcher放在Dep.target上
// 2)调用_render()会取值走到get上

class Watcher {
  //不同组件有不同的watcher
  constructor(vm, fn, options) {
    this.id = id++;
    this.renderWatcher = options;
    this.getter = fn; //getter意味调用这个函数可以发生取值操作
    this.deps = []; //收集依赖
    this.depsId = new Set(); //收集依赖的id
    this.get();
  }
  get() {
    Dep.target = this; //静态属性只有一份
    this.getter(); //会去vm上取值,当渲染时就会有取值操作触发getter,然后在getter里面操作
    Dep.target = null; //渲染完成就清空,只是在模板中收集的时候才会做依赖收集
  }
  addDep(dep) {
    //一个组件对应多个属性,重复的属性无需记录
    let id = dep.id;
    if (!this.depsId.has(id)) {
      this.deps.push(dep);
      this.depsId.add(id);
      dep.addSub(this);
    }
  }
  update() {
    this.get(); //重新更新
  }
}

//需要给每个属性添加一个dep,目的是收集watcher
// n个dep对应一个视图(一个watcher)
// 一个属性对应多个组件,一个dep对应多个watcher    所以两者关系是多对多

export default Watcher;
```

dep 监视属性，watcher 监视一个组件。

在修改属性时，调用 dep.notify()方法,这个方法的添加可以在循环给每个值添加监视器的 set 里面（这样就能在更新后去对应的更新视图）

比如在`observe/index.js`中的 defineProperty 函数中

```js
export function defineReactive(data, key, val) {
  //形成闭包，值不会消失
  //如果数据是对象那么再次递归处理进行劫持
  observe(val);
  let dep = new Dep(); //每一个属性都有dep
  Object.defineProperty(data, key, {
    get() {
      //取值会执行get
      if (Dep.target) {
        dep.depend(); //让这个属性的收集器记住当前的watcher
      }
      return val;
    },
    set(newVal) {
      if (newVal !== val) {
        val = newVal;
        dep.notify(); //值更新了，通知更新视图
      }
    },
  });
}
```

当值更新，调用 set 方法，里面调用 dep 的 notify 方法，在此方法中遍历循环 subs 数组，每个里面的 watcher（也就是使用到该属性的组件 ）都调用 update 方法，在 update 里面调用 this.get()，进行更新渲染

每个属性都有一个 dep 监视（属性就是被观察者），watcher 是观察者（属性变化了会通知观察者来更新） ====》观察者模式

但是这个有缺陷，每次更新数据就立即更新页面，应该等待数据更新完毕再更新页面，这样性能更高。

### 实现异步更新

目的：为了减少渲染次数，期望数据更新完毕，再进行渲染操作

那么可以考虑浏览器对于事件循环的操作。

浏览器都是先处理同步任务，然后执行异步任务，异步任务分为`宏任务和微任务`，浏览器优先清空微任务队列，再执行定时器等宏任务

`同步任务>微任务>宏任务`,那么可以利用这个进行更新

渲染放在一个异步任务中，那么只能等所有同步任务执行完毕才会去更新页面。使用 watcher 里面的更新

在`observe/watcher.js`里面添加一些东西

```js
//.....以前的都一样,下面是改变内容
class Watcher {
  //.....
  update() {
    queueWatcher(this); //将该监视器放入调度队列中
  }
  run() {
    this.get(); //真正执行渲染操作
  }
}

let queue = []; //因为可能更新同一属性多次，那么需要去重，只保留最后一个
let has = {}; //使用对象去重，或者set去重
let pending = false; //进行防抖操作，无论调用多少次，只执行一次

function flushSchedulerQueue() {
  let flushQueue = queue.slice(0); //拷贝一下queue
  flushQueue.forEach((q) => q.run()); //在刷新过程中可能存在新的watcher，重新被放回在队列中
  queue = [];
  has = {};
  pending = false;
}

function queueWatcher(watcher) {
  let id = watcher.id; //取出每个监视器的唯一标识id
  if (has[id] == null) {
    queue.push(watcher);
    has[id] = true;
    //可能有多个组件不管update多少次，最终只执行一次刷新操作
    if (!pending) {
      nextTick(flushSchedulerQueue, 0); //刷新调度队列
      pending = true;
    }
  }
}

let callbacks = [];
let waiting = false;
function flushCallbacks() {
  waiting = false;
  let cbs = callbacks.slice(0);
  callbacks = [];
  cbs.forEach((cb) => cb());
}

let timerFunc;
if (Promise) {
  timerFunc = (flushCallbacks) => {
    Promise.resolve().then(flushCallbacks);
  };
} else if (MutationObserver) {
  let observer = new MutationObserver(flushCallbacks); //这里传入的回调是异步执行的
  let textNode = document.createTextNode(1);
  observer.observe(textNode, {
    characterData: true,
  }); //让observer监控文本,如果数据变化,那么就执行cb任务
  timerFunc = () => {
    textNode.textContent = 2;
  };
} else if (setImmediate) {
  timerFunc = () => {
    setImmediate(flushCallbacks);
  };
} else {
  timerFunc = () => {
    setTimeout(flushCallbacks, 0);
  };
}

//nextTick中没有直接使用某个api,而是采用优雅降级的方式
// 内部采用promise(ie不兼容)降级为MutationObserver(h5的api) 可以再降级为ie专享setImmediate   降级为 setTimeout
export function nextTick(cb) {
  //先内部还是先用户
  callbacks.push(cb); //维护nextTick中的callback方法,同步操作
  if (!waiting) {
    // debugger;
    timerFunc();
    waiting = true;
  }
}
```

这里面就相当于是对应一个 watcher 执行一次 run

但是这个有个问题,当一个属性被多个组件使用时,更改这个属性,那么还是要执行多次 run，而且当使用 promise.resolve.then 或者同步`来获取`更新后的数据得到的却得到是`更新前的`（因为在获取时，页面并没有进行更新）

此时可以定义一个 nextTick 方法。同时在 vue 原型上添加。

Vue2 在异步更新时是采取的降级方法，Promise => Mutation => setImmediate =>setTimeout

### 监视数组

上面我们的代码只是重写了数组的方法,没有探究通过数组下标进行改变值是否能监视到

答案是不能

但是如果直接像这样 arr = []是可以更新的,因为劫持到了数组,但是数组内的元素变化没有劫持

给数组和对象本身都增加 dep,当他们修改时就可以触发更新了

深层次嵌套会递归处理，递归的话性能就比较差

不存在的属性监控不到，存在的属性要重写方法

`observe/index.js`

```js
//...在其中的改变一些东西
class Observer{
    constructor(data){
        //添加一个依赖收集器,其他和上面一样
        this.dep = new Dep();
    }
}
//然后再defineProperty里面进行一些改变
export default defineProperty(date,key,val){
    let childOb = observe(val);//observe函数返回的Observer对象
    let dep = new Dep();//每一个属性都有dep
  Object.defineProperty(data,key,{
    get(){//取值会执行get
      if(Dep.target){
        dep.depend();//让这个属性的收集器记住当前的watcher
        if(childOb){//比如对象,数组类
          childOb.dep.depend();//让数组或者对象本身进行依赖收集
          if(Array.isArray(val)){//如果值还是数组
              dependArray(val);
          }
        }
      }
      return val;
    }//set这些和之前一样
  })
}
//多一个函数
function dependArray(val){
    for(let i = 0; i < val.length; i ++){
        let current = val[i];
        current.__ob__.dep.depend();//__ob__是Observer的实例对象，上面有dep收集器，调用其依赖收集的方法
        if(Array.isArray(current)){
            dependArray(current);//如果对象里面套对象再套对象
        }
    }
}
```

`observe/array.js`

在这里面添加通知,数组改变了需要重新渲染模版

```js
methods.forEach((method) => {
  newArrayProto[method] = function (...args) {
    //上面和之前一样
    ob.dep.notify(); //ob是数组的实例对象,然后在上面添加了dep属性
    return result;
  };
});
```

### 实现计算属性

如果是

```js
new Vue({
  el: "#app",
  data: {
    firstname: "赤",
    lastname: "橙",
  },
  computed: {
    fullname() {
      return this.firstname + this.lastname;
    },
  },
});
```

那么就是 defineProperty 中的 get 方法

如果是对象写法,那就需要再写

计算属性 依赖的值发生变化才会重新执行用户的方法 那么需要维持一个 dirty 属性， 默认计算属性不会立刻执行

计算属性就是一个 defineProperty

计算属性也是一个 watcher，默认渲染会创造 一个渲染 watcher,放入队列中,先有渲染 watcher,然后是计算属性 watcher（使用到数据的地方就是会有 watcher，管理每一个 watcher 的就是 dep）

`observe/dep.js`

```js
//添加一些方法,在暴露之前
let stack = [];
export function pushTarget(watcher){
    let stack = [];
export function pushTarget(watcher){
  stack.push(watcher);
  Dep.target = watcher;
  // 渲染时会将watcher入栈，渲染完就出栈
}

export function popTarget(){
  stack.pop();
  Dep.target = stack[stack.length - 1];
}
export default Dep;
```

然后在 watcher 里面也需要修改

```js
class Watcher{
    constructor(vm,fn,options){
        //和之前一样
        this.lazy = options.lazy;
        this.dirty = this.lazy;//缓存值
        this.lazy?undefined:this.get();
        this.vm = vm;//防止在计算属性取得getter时,调用的this不是对应的this
    }
  	//方法只是修改了get和update,其他没有改变,添加了evaluate
    get(){
        pushTarget();
        let val = this.getter().call(this.vm);//因为调用this.firstname时不使用回调,this会丢失
        popTarget();
        return value;
    }
    evaluate(){
        this.value = this.get();//缓存存储值,多次用到而没有修改的计算属性时,就是拿到的缓存值
        this.dirty = false;
    }
    update(){
        if(this.lazy){//如果是计算属性,依赖属性变化了,就标识是脏值
          this.dirty = true;
        }else{
          queueWatcher(this);//暂存watcher
        // this.get();//重新更新
     }
     depend(){
         let i = this.deps.length;
         while(i--){
             this.deps[i].depend();//让计算属性watcher也收集渲染watcher
         }
     }
  }
}
```

然后在初始化文件中去修改内容,因为初始化还包括初始化计算属性

计算属性根本不会收集依赖，只会让自己的依赖属性去收集依赖

`state.js`

```js
export function initState(vm){
  const opts = vm.$options;//获取所有的选项
  if(opts.data){//如果有data选项那么初始化data
    initData(vm);
  }
  if(opts.computed){
    initComputed(vm);
  }
}
//剩下的和之前一样除了我在下面声明的函数


}function initComputed(vm){
    // debugger;
    const computed = vm.$options.computed;
    const watchers = vm._computedWatchers ={};//将计算属性watcher保存到vm上
    //循环对象
    for(let key in computed){
        let userDef = computed[key];
        //userDef 可能是对象可能是函数
        //需要监控计算属性中get的变化,传入值,监视的实例,方法,配置项
        let fn = typeof userDef === 'function' ? userDef :userDef.get;
        watchers[key] = new Watcher(vm,fn,{lazy:true});
        defineComputed(vm,key,userDef);
    }
}
function defineComputed(target,key,userDef){
//   const getter = typeof userDef === 'function' ? userDef :userDef.get;
    const setter = userDef.set || (()=>{});
    Object.defineProperty(target,key,{
        get:createComputedGetter(key),//希望当重复取值时不会调用getter
        set:setter
    })
}

function createComputedGetter(key){
    //我们需要检测是否执行这个getter
    return function(){
        const watcher = this._computedWatchers[key];//获取到对应属性的watcher
        if(watcher.dirty){
            //如果是脏的就去执行用户传入的函数
            watcher.evalaute();//求值后 dirty变为false,下次取值,就不求值了
        }
        if(Dep.target){//计算属性出栈后还有渲染 watcher,应该也让计算属性中的watcher去收集上一层watcher
            watcher.depend();
        }
        return watcher.value;//这样就不用每次取值都是get来取,可以从缓存中来取
    }
}

```

### watch 的实现原理

watch 写法：１函数，２数组写法

底层最终调用的是$watch 写法

在 Vue 原型链上添加`$watch`方法

`index.js`

```js
Vue.prototype.$watch = function (exprOrFn, cb) {
  //还有deep:true,immediate等
  // firstname
  // ()=>{}
  new Watcher(this, exprOrFn, { user: true }, cb);
};
```

因为这里调用了 watcher,而且与之前不同,所以要进行修改

`observe/watcher.js`

```js
class Watcher {
  constructor(vm, exprOrFn, options, cb) {
    this.cb = cb; //对于watch
    if (typeof exprOrFn === "string") {
      this.getter = function () {
        return vm[exprOrFn];
      }; //将字符串变为函数
    } else {
      this.getter = exprOrFn; //getter意味调用这个函数可以发生取值操作
    }
    this.user = options.user; //标识是否是用户自己的watcher
  }
  run() {
    this.get();
    if (this.user) {
      this.cb();
    }
  }
}
```

然后因为 watch 在一开始就要判断有无,那么在`state.js`里面要进行修改

```js
export function initState(vm) {
  const opts = vm.$options;
  if (opts.watch) {
    initWatch(vm);
  }
}
function initWatch(vm) {
  let watch = vm.$options.watch;
  for (let key in watch) {
    //字符串,数组,函数
    const handler = watch[key];

    if (Array.isArray(handler)) {
      for (let i = 0; i < handler.length; i++) {
        createWatcher(vm, key, handler[i]);
      }
    } else {
      createWatcher(vm, key, handler);
    }
  }
}

function createWatcher(vm, key, handler) {
  //字符串,数组,函数(还有可能是对象)
  if (typeof handler === "string") {
    handler = vm[handler];
  }
  return vm.$watch(key, handler);
}
//这些上面部分是改变内容
```

### 实现基本的 diff 算法

我们之前的更新非常的暴力，直接生成新的虚拟结点，通过新的虚拟姐弟那生成真实节点，生成后替换掉老的节点

但是这样子性能消耗非常大

第一次渲染的时候，我们会产生虚拟节点，第二次更新会调用 render 方法产生新的虚拟节点。比对出需要更新的内容更新部分内容

先将一些方法从`lifeCycle.js`放在`state.js`里面

```js
export function initStateMixin(Vue) {
  Vue.prototype.$nextTick = nextTick;
  Vue.prototype.$watch = function (exprOrFn, cb) {
    //还有deep:true,immediate等
    // firstname
    // ()=>{}
    new Watcher(this, exprOrFn, { user: true }, cb);
  };
}
```

将之前渲染节点的函数放在`vdom/patch.js`里面，顺便更新内容

`vdom/patch.js`

```js
export function createElm(vnode) {
  //内容省略，除了以下函数改变
  patchProps(vnode.el, {}, data);
}

export function patchProps(el, oldProps = {}, props = {}) {
  //可能老的属性有而新的属性没有的情况需要去除老的
  let oldStyle = oldProps.style || {};
  let newStyle = props.style || {};
  for (let key in oldStyle) {
    //老的样式中有而新的样式中没有，则删除
    if (!newStyle[key]) {
      el.style[key] = "";
    }
  }

  for (let key in oldProps) {
    if (!props[key]) {
      el.removeAttribute(key); //老的属性中有而新的没有，则删除属性
    }
  }

  //剩下内容省略（和之前相同）
}

export function patch(oldVNode, vnode) {
  //初渲染和后面的diff渲染一样的
  const isRealElement = oldVNode.nodeType; //nodeType是js原生属性,如果是元素节点的那么值就是1
  if (isRealElement) {
    const elm = oldVNode; //这里oldVNode是真实dom
    const parentElm = elm.parentNode; //拿到真实元素

    let newElm = createElm(vnode);
    parentElm.insertBefore(newElm, elm); //将新节点插入到老节点后面
    parentElm.removeChild(elm); //删除老节点
    return newElm;
  } else {
    // diff算法
    patchVnode(oldVNode, vnode);
  }
}
function patchVnode(oldVNode, vnode) {
  if (!isSameVnode(oldVNode, vnode)) {
    //使用老节点的父亲进行替换
    let el = createElm(vnode);
    oldVNode.el.parentNode.replaceChild(el, oldVNode.el);
    return el;
  }
  //文本情况,期望对文本内容进行比较
  let el = (vnode.el = oldVNode.el); //复用老节点的元素
  if (!oldVNode.tag) {
    //是文本
    if (oldVNode.text !== vnode.text) {
      el.textContent = vnode.text; //用新的文本覆盖掉老的
    }
  }
  //是标签        需要比对标签的属性
  patchProps(el, oldVNode.data, vnode.data);

  //比较儿子节点      比较一方有儿子，一方没有儿子        两方都有儿子

  let oldChildren = oldVNode.children || []; //防止取到的是一个值
  let newChildren = vnode.children || [];

  if (oldChildren.length > 0 && newChildren.length > 0) {
    //完整的diff算法（需要比较两个人的儿子）
    updateChildren(el, oldChildren, newChildren);
  } else if (newChildren.length > 0) {
    //没有老的儿子直接插入
    mountChildren(el, newChildren);
  } else if (oldChildren.length > 0) {
    //新的没有，老的有，需要删除
    el.innerHTML = ""; //也可以循环删除
  }

  return el;
}

function mountChildren(el, newChildren) {
  for (let i = 0; i < newChildren.length; i++) {
    let child = newChildren[i];
    el.appendChild(createElm(child));
  }
}
function updateChildren(el, oldChildren, newChildren) {
  //比较两个儿子的时候，为了增高性能会有优化手段
  let oldStartIndex = 0; //老儿子开始的位置
  let newStartIndex = 0; //新儿子开始的位置
  let oldEndIndex = oldChildren.length - 1; //老儿子结束的位置
  let newEndIndex = newChildren.length - 1; //新儿子结束的位置
  let oldStartVnode = oldChildren[oldStartIndex];
  let oldEndVnode = oldChildren[oldEndIndex];
  let newStartVnode = newChildren[newStartIndex];
  let newEndVnode = newChildren[newEndIndex];

  function makeIndexByKey() {
    let map = {};
    children.forEach((child, index) => {
      map[child.key] = index;
    });
    return map;
  }
  let map = makeIndexByKey(oldChildren);

  while (oldStartIndex <= oldEndIndex && newStartIndex <= newEndIndex) {
    if (!oldStartVnode) {
      oldStartVnode = oldChildren[++oldStartIndex];
    } else if (!oldEndVnode) {
      oldEndVnode = oldChildren[--oldEndIndex];
    }
    //有一方大于尾指针就停止
    else if (isSameVnode(oldStartVnode, newStartVnode)) {
      patchVnode(oldStartVnode, newStartVnode); // 如果是相同节点，则递归比较子节点
      oldStartVnode = oldChildren[++oldStartIndex];
      newStartVnode = newChildren[++newStartIndex];
    } else if (isSameVnode(oldEndVnode, newEndVnode)) {
      //比较尾节点
      patchVnode(oldStartVnode, newStartVnode); // 如果是相同节点，则递归比较子节点
      oldEndVnode = oldChildren[--oldEndIndex];
      newEndVnode = newChildren[--newEndIndex];
    }

    // 交叉比较 abcd -> dabc
    // 头尾比对和尾头比对,同时处理的倒序的情况
    else if (isSameVnode(oldEndVnode, newStartVnode)) {
      patchVnode(oldEndVnode, newStartVnode);
      el.insertBefore(oldEndVnode.el, oldStartVnode.el); //将老的后面的节点插入到开头节点的前面

      oldEndVnode = oldChildren[--oldEndIndex];
      newStartVnode = newChildren[++newStartIndex];
    } else if (isSameVnode(oldStartVnode, newEndVnode)) {
      patchVnode(oldStartVnode, newEndVnode);
      el.insertBefore(oldStartVnode.el, oldEndVnode.el.nextSibling); //将老头节点放在尾节点之后
      oldStartVnode = oldChildren[++oldStartIndex];
      newEndVnode = newChildren[--newEndIndex];
    }
    // 在给动态列表添加key时,尽可能避免使用索引,无论你怎么改变索引都是从0开始非常容易错乱
    else {
      // 乱序比对
      let moveIndex = map[newStartVnode.key]; //如果拿到则说明是要移动的索引
      if (moveIndex !== undefined) {
        let moveVnode = oldChildren[moveIndex]; //找到对应的虚拟节点 ,复用
        el.insertBefore(moveVnode.el, oldStartVnode.el);
        oldChildren[moveIndex] = undefined; //标识这个节点清空了
        patch(moveVnode, newStartVnode);
      } else {
        //找不到的情况
        el.insertBefore(createElm(newStartVnode), oldStartVnode.el);
      }
    }
  }
  if (newStartIndex <= newEndIndex) {
    //多余的塞进去
    for (let i = newStartIndex; i <= newEndIndex; i++) {
      let childEl = createElm(newChildren[i]);
      // 可能像后追加,可能向前追加
      // el.appendChild(childEl)
      let anchor = newChildren[newEndIndex + 1]
        ? newChildren[newEndIndex + 1].el
        : null; //获取下一个元素
      el.insertBefore(childEl, anchor); //当anchor为null的时候,就会认为是appendChild
    }
  }
  if (oldStartIndex <= oldEndIndex) {
    for (let i = oldStartIndex; i <= oldEndIndex; i++) {
      if (oldChildren[i]) {
        el.removeChild(oldChildren[i].el);
      }
    }
  }
}
```

每次获取 dom 需要计算位置，因此比较消耗性能。希望比较两个节点的差异之后再进行替换

diff 算法是一个评级比较的过程，父亲和父亲比，儿子和儿子比

比较节点：不是同一节点直接替换（删除老的，换上新的）。

两个节点是同一个节点（判断节点的 tag 和节点的 key），比较两个节点的属性是否由差异（复用老节点，将差异的属性更新）

文本进行特判，先判断是否有 tag 属性，文本是没有的，然后再进行比对，如果不同，那么使用新节点的内容替换掉老节点的内容

Vue2 中通过双指针的方式比较两个节点（子节点 ）

### 实现组件的虚拟节点

在`lifeCycle.js`里面将第一次产生的虚拟结点保存到\_vnode 上。更新 \_update 函数

```js
export function initLifeCycle(Vue) {
  Vue.prototype._update = function (vnode) {
    const vm = this;
    const el = vm.$el;
    //这里vnode是虚拟节点,是真实节点
    const preVnode = vm._vnode;
    vm._vnode = vnode; //把组件第一次产生的虚拟节点保存到_vnode上
    if (preVnode) {
      //之前渲染
      vm.$el = patch(preVnode, vnode);
    } else {
      vm.$el = patch(el, vnode); //使用vnode,更新出真正的dom
    }
    //patch既有初始化的功能,又有更新的功能
  };
}
```

组件的定义方式：全局注册和局部注册

```js
Vue.component("my-button", {
  template: `<button></button>`,
});

new Vue({
  el: "#app",
  component: {
    "mu-button": {
      template: `<button></button>`,
    },
  },
});
```

其查找方式类似于 JS 的原型链，先在自身找，找不到再往外找。

实际上是调用的 Vue.extend 这个 API

`Vue.component('my-button',Vue.extend({template:'<button></button>'}))`

创建组件就相当于创建一个子类

在 globalAPI 里面（改自 Vue 源码）

```js
import { observe } from "./observe/index";
import { mergeOptions } from "./utils";

export function initGlobalAPI(Vue) {
  // config
  const configDef = {};
  configDef.get = () => config;
  Object.defineProperty(Vue, "config", configDef);

  // exposed util methods.
  // NOTE: these are not considered part of the public API - avoid relying on
  // them unless you are aware of the risk.

  // 2.6 explicit observable API
  Vue.observable = function (obj) {
    observe(obj);
    return obj;
  };

  Vue.options = Object.create(null);

  // this is used to identify the "base" constructor to extend all plain-object
  // components with in Weex's multi-instance scenarios.
  Vue.options = {
    _base: Vue,
  };
  Vue.mixin = function (mixin) {
    this.options = mergeOptions(this.options, mixin);
    return this;
  };
  Vue.extend = function (options) {
    //实现根据用户的参数返回一个构造函数
    function Sub(options = {}) {
      //调用Vue的构造函数
      this._init(options);
    }
    Sub.prototype = Object.create(this.prototype); //Sub.protoytype.__proto__ = Vue.protoType
    Sub.prototype.constructor = Sub;
    //将用户传递的参数和全局的Vue.options来合并
    Sub.options = mergeOptions(Vue.options, options);
    return Sub;
  };
  Vue.options.components = {}; //全局的指令  Vue.options.directives
  Vue.components = function (id, definition) {
    //如果是函数直接返回，不是函数就进行包装
    definition =
      typeof definition === "function" ? definition : Vue.extend(definition);
    Vue.options.components[id] = definition;
  };
}
```

`utils.js`

```js
export function mergeOptions(ops = {}, mixin) {
  // 创建一个空对象作为合并后的结果
  const options = {};
  // 定义一个合并策略对象，存放不同属性名对应的合并策略函数
  const strats = {};
  // 定义一个默认的合并策略函数，如果没有找到对应的策略函数，就使用它
  const defaultStrat = function (parentVal, childVal) {
    // 如果子选项有值，就使用子选项的值，否则就使用父选项的值
    return childVal === undefined ? parentVal : childVal;
  };
  // 定义一个合并字段的函数，用于遍历属性并调用合并策略函数
  function mergeField(key) {
    // 根据属性名查找合并策略对象，如果没有找到，就使用默认的合并策略函数
    const strat = strats.hasOwnProperty(key) ? strats[key] : defaultStrat;
    // 调用合并策略函数，传入父选项和子选项的属性值，以及当前的属性名
    options[key] = strat(ops[key], mixin[key], key);
  }
  // 遍历父选项的所有属性，并调用合并字段的函数
  for (let key in ops) {
    mergeField(key);
  }
  // 遍历子选项的所有属性，并调用合并字段的函数
  for (let key in mixin) {
    // 如果父选项没有该属性，才需要调用合并字段的函数
    if (!Object.hasOwn(ops, key)) {
      mergeField(key);
    }
  }
  // 返回合并后的结果对象
  return options;
}
```

在 init.js 里面也需要做出小小的改变，因为有多个组件（多个 vue）那么就需要合并选项

```js
export function initMixin(Vue) {
  Vue.prototype._init = function (options) {
    const vm = this;
    vm.$options = mergeOptions(this.constructor.options, options);

    //其他的不变
  };
}
```

创建完之后要对组件和标签进行一个区分，那么在以前生成虚拟结点的地方就存在一些问题。

那么需要判定是否为真实的标签

那么在`vdom/index.js`里面就要进行改变

```js
const isReservedTag = (tag) => {
  return [
    "a",
    "ul",
    "ol",
    "li",
    "div",
    "span",
    "p",
    "img",
    "input",
    "button",
    "textarea",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "table",
    "tr",
    "td",
    "th",
    "tbody",
    "thead",
    "tfoot",
    "tr",
    "th",
    "td",
    "select",
    "option",
    "form",
  ].includes(tag);
};
export function createElementVNode(vm, tag, data, ...children) {
  if (data == null) {
    data = {};
  }
  let key = data.key || null;
  if (key) {
    delete data.key;
  }

  //判断是否为原生标签
  if (isReservedTag(tag)) {
    return VNode(vm, tag, key, data, children);
  } else {
    //创建组件的虚拟结点
    // 需要包含组件的构造函数
    let Ctor = vm.$options.components[tag];
    // Ctor可能是组件的定义，可能是一个Sub类，还有可能是组件的component选项
    return createComponentVnode(vm, tag, key, data, children, Ctor);
  }
}

function createComponentVnode(vm, tag, key, data, children, Ctor) {
  if (typeof Ctor === "Object") {
    Ctor = vm.$options._base.extend(Ctor); //将对象转化一下得到构造函数，_base声明于globalAPI上面的
  }
  data.hook = {
    init() {
      //稍后创造真实节点的时候，如果是组件则调用此init方法
    },
  };
  return VNode(vm, tag, key, data, children, null, { Ctor });
}
//然后VNode代码需要重构一下，因为之前没有处理component，多了一个componentOptions的选项
function VNode(vm, tag, key, data, children, text, componentOptions) {
  return {
    vm,
    tag,
    key,
    data,
    children,
    text,
    componentOptions, //组件的构造函数
  };
}
```

### 实现组件的渲染流程

在`vdom/index.js`里面继续完善

```js
function createComponentVnode(vm, tag, key, data, children, Ctor) {
  if (typeof Ctor === "object") {
    Ctor = vm.$options._base.extend(Ctor); //将对象转化一下得到构造函数，_base声明于globalAPI上面的
  }
  data.hook = {
    init(vnode) {
      //稍后创造真实节点的时候，如果是组件则调用此init方法
      //保存组件的实例到虚拟节点
      let instance = (vnode.componentInstance =
        new vnode.componentOptions.Ctor());
      instance.$mount();
    },
  };
  return VNode(vm, tag, key, data, children, null, { Ctor });
}
```

在`vdom/patch.js`里面，需要修改 createElm 函数，因为还需要判定组件和元素

```js
function createComponent(vnode) {
  let i = vnode.data;
  if ((i = i.hook) && (i = i.init)) {
    i(vnode);
  }
  if (vnode.componentInstance) {
    return true; // 说明是组件
  }
}

export function createElm(vnode) {
  let { tag, data, children, text } = vnode;
  if (typeof tag === "string") {
    //标签
    //创建真实元素也要区分组件还是元素
    if (createComponent(vnode)) {
      //组件
      return vnode.componentInstance.$el; //返回组件对应的真实元素
    }
    vnode.el = document.createElement(tag); // 这里将真实节点和虚拟节点对应起来，后续如果修改属性了
    patchProps(vnode.el, {}, data); // 处理data
    children.forEach((child) => {
      vnode.el.appendChild(createElm(child));
    });
  } else {
    //就是创建文本
    vnode.el = document.createTextNode(text);
  }
  return vnode.el;
}
```

然后再判定 createComponent 时，就会进入 data.hook 对象里面的`init()`组件渲染函数

因为 Ctor 是构造函数，那么就调用 new 方法，将实例保存下来，然后进行挂载。挂载时，因为传入的为空，那么就会进入到`mountComponent(vm,el)`方法，然后 el 仍然没有值，调用 vm.\_update，进入其中后，调用 patch 方法，因为 patch(el,vnode)，el 为空，那么就需要在`vdom/patch.js`上面修改以下 patch 方法

```js
export function patch(oldVNode, vnode) {
  if (!oldVNode) {
    //这就是组件的挂载
    return createElm(vnode); //vm.$el  对应的就是组件渲染的结果了
  }
  //后面都一样
}
```

因为 patch 的返回值就是挂载的 vm.`$el，那么在实例instance上就多了一个 `$el

组件的真实元素是 template 生成 render 之后 ， Vnode 生成的真实节点

## 源码剖解

### 找到 Vue 打包的入口

- 使用**npm install**安装依赖
- 代码的目录结构：
- bechmarks 性能测试的
- dist 最终打包的结果
- examples 官方的例子
- flow 类型检测（现在被 ts 代替了）
- packages 一些写好的包
- scripts 所有打包的脚本
- src 源代码目录
  compiler 专门做模板编译的
- core Vue2 的核心代码
- platform
- server 服务端渲染相关的
- sfc 解析单文件组件的

通过 package.json 找到打包入口

scripts/config.js (full-dev runtime-cjs-dev runtime-esm.......)

web-runtime（运行时 无法解析 new Vue 传入的 template） web-full（runtime + 模板解析） compiler（只有 compiler）

cjs esm（支持 import 和 export 导入模块） browser umd

cjs 使用的 require 导入模块，导入的模块时拷贝形式，如果修改其中的值，导入的东西并不会改变

esm 导入的是`地址`，那么进行操作修改包内的数据时，再次使用得到的是修改后的数据

cjs

```js
// cjs_module1.js
var count = 1;
function incCount() {
  count += 1;
}

module.exports = {
  count: count,
  incCount: incCount,
};

// cjs_demo.js
var { count, incCount } = require("./cjs_module1.js");

console.log(count); // 1
incCount();
console.log(count); // 1
```

esm

```js
// esm_module1.js
let count = 1;
function incCount() {
  count += 1;
}

export { count, incCount };

// esm_demo.js
import { count, incCount } from "./esm_module1.js";

console.log(count); // 1
incCount();
console.log(count); // 2
```

在 html 中使用 esm，`type=“module”`是关键

```html
<script src="./esm_main.js" type="module"></script>
```

- 打包的入口

  - src/platforms/web/entry-runtime.js

    src/platforms/web/entry-runtime-with-compiler.js（两个入口的区别是带有 compiler 的会重写$mount，将 template 变成 render 函数）

    runtime/index.js（所谓的运行时，会提供一些操作 DOM 的 API 、属性操作、元素操作，提供一些组件和指令 ）

### 分析全局 API

对于里面的方法如何执行

（1）了解核心流程，单独打开源码去看

（2）不知道流程，可以通过测试样例，或者自己写一些样例进行实现

> 指定 sourcemap 参数 可以开启代码调试
>
> 比如在 package.json 的 script 里面，scripts/config.js 后面加入 -s 或者 -sourcemap

#### vue.config

在 globalAPI 里面 `Object.defineProperty(Vue.'config',configDef)`进行配置信息

**Vue.util**装载的工具方法，比如 warn，extend，mergeOptions，defineReactive（extend 合并操作，mergeOptions 合并策略，defineReactive 定义响应式）

set，delete，nextTick 2.6 新增了 observable 让一个对象变成响应式

ASSET_TYPES 里面存入了，components，directives，filter 这些

还有 mixin，use，extend

### 响应式数组的实现原理

#### Vue2 响应式数据的理解

可以监控一个数据的修改和获取操作，针对对象格式给每个对象的属性进行劫持 使用 `Object.defineProperty`

> 源码层面：initData -> observe ->defineReactive 方法（内部对所有属性进行重写，因此存在性能问题），递归的给每个属性添加 getter 和 setter

> 我们使用 Vue 的时候如果层级过深（考虑性能），如果数据不是响应式就不要放在 data 中了。属性取值，尽可能避免多次取值。如果有些对象放在 data 中但是不是响应式的，可以使用 Object.freeze()进行冻结

#### Vue2 如何检测数组的变化

Vue2 中没有使用 defineProperty 进行检测，因为直接修改索引的情况很少，通常是使用 push,pop 等方法进行修改，那么就需要对这些方法进行重写

并且对每个数据进行检测。

注意这里重写是针对的每一个在 data 里面的数组，并没有在 Array 的原型链上直接覆盖。

还有通过索引进行修改数据无法进行实时渲染，比如`arr[1]=100;arr.length = 300`

但是`arr[0].x=100`是可以的，因为可以监视对象的每一个属性的修改和取值操作。因此会触发更新

#### Vue 如何进行依赖收集——观察者模式

- 被观察者指代的是数据（dep），观察者（Watcher，3 种，渲染 watcher，计算属性 ，用户 watcher）

- 一个 watcher 中可能有多个数据，因此 watcher 中还需要保存 dep。
- 多对多的关系，一个 dep 对应多个 watcher，一个 watcher 会有多个 dep。默认是在渲染时，进行依赖收集
- ![image-20231116143153843](./public/Vue2/image-20231116143153843.png)

计算属性和清理会用到 watcher 上的 dep。

在进行取值的时候，watcher 收集 dep（相当于粉丝`订阅`自己喜欢的人一样）

![image-20231116161449833](./public/Vue2/image-20231116161449833.png)

![image-20231116161711145](./public/Vue2/image-20231116161711145.png)

![image-20231116161753950](./public/Vue2/image-20231116161753950.png)

然后让 dep 收集 watcher（相当于`up主`得到粉丝名单），以便 up 主`更新时去通知`粉丝去看最新视频（也就是属性改变，通知相应的 watcher 进行一个更新）

取值的时候收集依赖，设置值的时候更新![image-20231116162524940](./public/Vue2/image-20231116162524940.png)

为什么要清理 watcher，比如使用 v-if 的指令第一次渲染了`name`第二次渲染的`age`那么进行清理，当 name 更新时，会通知视图进行更新，但是此时没用到这个值，也没必要更新

编译原理：用户传递的 template 属性，需要将这个 template 编译为 render 函数。

- template -> ast 语法树
- 对语法树进行标记（标记的是静态节点）
- 将 ast 语法树生成 render 函数

> 最终每次渲染可以调用 render 函数返回对应的虚拟结点（递归是先子后父）

#### 生命周期的实现原理

内部利用`发布订阅模式`，将用户写的钩子维护称了一个数组，后续一次调用 callHook

策略模式

渲染顺序：`父->子->子完->父完`那么子组件挂载了之后父组件才会挂载完毕

生命周期钩子：beforeCreate created beforeMount mounted beforeUpdate updated actived deactived beforeDestory destoryed errorCaptured

在 beforeCreate 中实现的 initEvent（初始化$ on ,off，emit 等事件 ）和 initLifecycle（因为什么事情都没有干，因此 Vue3 中直接取代了）

在 create 中实现了 initInjections（inject）和 initState（响应式数据处理），InitProvide（provide），可以拿到响应式数据而且不涉及到 dom 渲染，这个 api 可以在服务端渲染中使用

beforreUpdate 每次更新之前调用，在清空队列的时候，会去调用各个 watcher 的 beforUpdate 方法

beforDestory 手动移除能触发：销毁的时候，是销毁 watcher 而不是销毁 DOM（react 是销毁 DOM）

destroyed：触发在：路由切换，v-if 切换组件，:is 动态绑定组件
