# 回答

## xhs 腾讯前端一面（贼难）

1. 这段代码的执行顺序是什么样的?

```js
console.log("start");
setTimeout(() => {
  console.log("timeout");
}, 0);
Promise.resolve().then(() => {
  console.log("promise 1");
});
Promise.resolve().then(() => {
  console.log("promise 2");
});
console.log("end");
```

start、end、promise 1、promise 2、timeout
先执行同步任务也就是打印 start end，然后查看微任务队列，微任务队列存在打印 promise1、promise2，微任务队列清空之后，等待浏览器的渲染（浏览器环境下），定时器计时结束之后将任务塞入宏任务队列，然后再执行宏任务

2. 实现一个工具类型 DeepReadonly，能将对象及其所有嵌套属性变为只读。

```ts
type DeepReadonly<T> = {
  readonly [K in keyof T]: T[K] extends object ? DeepReadonly<T[K]> : T[K];
};
```

3. 如果写一个非嵌套的 Readonly 类型，将对象里面所有字段都变成只读，该如何实现?

```ts
type Readonly<T> = {
    readonly [K in keyog T]:T[K];
}
```

4. TypeScript 声明接口如何保证类型的安全?请结合一个请求 API 的场景进行说明。
   通过声明请求参数接口和响应参数接口来保障类型安全，因为当类型不匹配时执行 ts 会进行报错
5. 使用 Lodash 根据 id 字段去除数组中重复的对象，实现一个函数。

```js
// 原生实现
function run(arr) {
  const s = new Set();
  const res = [];
  for (const i of arr) {
    if (s.has(i.id)) continue;
    res.push(i);
    s.add(i.id);
  }
  return res;
}
//lodash实现
import _ from "lodash";
function run(arr) {
  return _.uniqBy(arr, "id");
}
```

6. 实现一个 parseQuery 函数，输入一个 query 字符串(例如:?name=Alice&age=20&city=Beijing)，返回一个对象{name: 'Alice', age: '20', city:'Beijing’}。如果 query 参数中出现重复的 key，value 变成数组。

```js
function parseUrl(query) {
  const res = {};
  if (!query || !query.startWith("?")) return {};
  const params = query.slice(1).split("&") || [];
  for (const param of params) {
    let [key, val = ""] = param.split("=");
    key = decodeURIComponent(key);
    val = decodeURIComponent(val);
    if (res[key]) {
      if (!Array.isArray(res[key])) {
        res[key] = [res[key]];
      }
      res[key].push(val);
    } else {
      res[key] = val;
    }
  }
  return res;
}
```

7. React 18 有个新特性叫做 ConcurrentFeatures，有了解吗?
   Concurrent Features 是 并发性质，在 react18 中有以下特性

   1. 渲染不再是不可中断的，渲染可以是可中断、可暂停的、可恢复的
   2. 默认所有的 setState 都是批量更新，也就是多个更新会合并为一个更新，减少渲染次数
   3. 区分紧急更新和非紧急更新
   4. 服务端渲染可以流式返回

8. 如果在 React 的主线程中使用了 useEffect 更新之后，紧接着去访问这个 state，但拿到的值还是旧值，你怎么去解决这个问题?
   1. 这个是闭包问题，拿到的 state 为旧值，这里可以存储一个 ref 保存 state 的变量，然后每次执行 effect 读取 ref 的值
   2. 可以让 useEffect 依赖这一个 state 这样子就能拿到最新值
9. 你使用过 React Query 吗?
   react-query 是一个请求管理库其特点有：

   1. 自动发起
   2. 缓存请求
   3. 手动控制新鲜度（是否失效）
   4. 自动的状态管理
   5. 自动的重试与终端

10. 如果说你要从服务端拉取分页列表，你会怎么设计 React Query 的 querykey
    queryKey 要包含当前能够影响请求的所有参数，例如 page，pageSize，apiPath 等等

11. 如果你是 React Query 的开发者或设计者，你怎么去理解 queryKey 的这种 API 的设计?为什么要设计这个 API?

    1. queryKey 作为缓存定位的唯一标识
    2. 通过 queryKey 区分是否为同一个请求，如果是那么可以直接服用
    3. 可以让部分 queryKey 失效，从而重新获取新鲜数据

12. 假设有一个渲染大量数据的列表，每一项都支持复杂的拖拽排序和编辑，你怎么去优化

    1. 数据请求，对于大量数据首先考虑是否可以分页，分片请求。如果可以那么采用 requestIdleCallback 来进行少量多次的请求
    2. 首先正对于大量数据的展示，可以考虑虚拟列表，如 react-virtualized
    3. 其次对于列表项可以缓存，比如使用 memo 减少重渲染
    4. 对于每一项的事件，可以集成在列表容器上，也就是事件代理
    5. 拖拽时使用 fixed 定位元素，然后通过 transform 来改变渲染，这样子可以减少布局的改变导致的非相关元素渲染问题

13. 你刚刚提到触发重排这件事情，有哪些 CSS 属性会引起重排?
    只要布局的属性变更，就会引起重排，比如 width，height，top，left 等，如果是 transform、opacity 这些只会引起重绘，同时 opacity（值非 1）会让当前的渲染层变为合成层，合成层会使用 GPU 进行绘制
    布局的属性改变会引起重排：width、height、margin 等等
    定位的属性改变会引起重排：top、left、position、display 等
    内容相关的属性改变会引起重排：font-size、line-height 等

14. 如果在一个多人协作的项目当中，每个人的 ESLint 和 Prettier 习惯不太一样，怎么办

    1. 首先在项目中写入一份公共的.eslintrc.js、.prettierrc.js 文件
    2. 项目安装 eslint、prettier 插件并锁定版本
    3. 在项目中的 README 写入，使用 IDE 插件，让成员在保存文件时自动格式化
    4. 在 commit 前使用 eslint --fix / prettier --fix 进行修复，这个可以使用 husky 写入脚本执行

15. 怎么解决 ESLint 的规则和 Prettier 的规则的桥接工作的?
    1. eslint-config-prettier 禁止两个冲突的规则起作用
    2. eslint-plugin-prettier 将 prettier 格式化规则作为 eslint 规则运行
       使用方法`.eslintrc.js`
    ```js
    module.exports = {
      extends: [
        "eslint:recommended",
        "plugin:prettier/recommended", // 同时启用上述两个工具
      ],
    };
    ```

## tencent 广告(CDG)

腾讯广告前端一面 1h

1. es6 有哪些新特性
   1. 箭头函数、class
   2. 拓展运算符...、模版字符串\`\`
   3. let、const
   4. promise
   5. 解构赋值
   6. for of
   7. esm import/export
   8. 剩余参数，默认参数
   9. set/map
2. promise, await, async 的使用与区别
   async、await 可以理解为 promise 的语法糖，async 修饰的 function 返回的都是 Promise，await 会暂停当前 async 函数的执行，等待后续表达式（若为 Promise 则等其 resolve），await 之后的代码会被放入微任务队列（而非 “所有后续代码”），而非 await 本身让代码变微任务。
   async await 还解决了 promise 多层嵌套的地狱问题，同时让错误可以通过 try catch 捕获
3. promise 有哪些 api
   promise 静态方法:
   all、allSettle、any、race、try、resolve、reject、withResolvers
   实例方法：then，catch，finally
4. promise 的底层原理
   promise 底层是一个类，这个类中存在上述方法，同时也存在 Promise 内部维护的是 “成功回调队列（onFulfilled）” 和 “失败回调队列（onRejected）”，而非 “异步任务队列”；且回调不是直接执行，而是在 resolve/reject 触发后，将回调放入微任务队列（由事件循环调度），你未提及 “微任务调度” 和 “回调队列分类”。
   ，当状态敲定后，根据状态执行对应的任务队列
5. 为什么要使用 redux，有没有其他的方案
   除开 redux 还有 zustand、mobx 等等优秀的方案
6. react 虚拟 dom 作用
   最为主要的是跨平台作用，比如虚拟 dom 使用 react-dom 即在浏览器环境时是渲染为 dom 元素，如果是 react native 这种平台，会将虚拟 dom 转化为原生的渲染内容
7. JS 的执行原理和过程
   js 执行有多种，对于浏览器环境而言，通常是，浏览器读取 js 文件，然后立即执行（这里可以设置 script 为 defer 或者 async，不进行立即执行），执行完成之后，会区分出两大类，同步任务和异步任务，异步任务存在宏任务和微任务之分，执行完同步任务之后，清空当前微任务队列，然后再执行下一个宏任务，如果不存在宏任务，那么浏览器就是空闲的。
   通常 js 执行是在 v8 引擎中执行，分为几步
   1. 词法分析、语法分析->生成 AST 语法树，这里存在 jit 可以优化编译
   2. 将 ast 转化为字节码执行
   3. 标记热点代码
   4. 编译器缓存热点代码并直接执行机器码
8. 任务队列如何处理异步请求
   任务队列处理异步请求主要是通过回调执行的，因为 js 本身单线程的设计，通常执行同步任务，对于异步任务是非阻塞执行的，当异步任务执行之后会产生回调，通过回调的函数可以拿到执行结果，比如 i/o，网络等操作都是
   这里网络是通过网络进程，如浏览器的网络进程，node 自带的网络进程（16+的版本更新了 fetch）
9. 事件循环机制是什么
   事件循环分为主要的两类：浏览器环境和 node 环境（目前也有其他的 js 环境比如 bun，这些的事件循环机制我暂时还不清楚）
   浏览器的事件循环为 一个宏任务执行->清空微任务队列->渲染->执行下一个宏任务->微任务.....这样子循环往复
   node 的事件循环分为更多，因为可以理解为是系统层面的，timer\(setTimeout/setInterval\)->i/o->idle(内部处理)->poll->check\(处理 setImmediate 事件\)->close\(处理关闭事件\)->timer->....
10. 遇到过的网络问题，跨域及解决方案，JOSNP 的原理
    跨域，xss，csrf
    跨域是因为，浏览器的同源策略，同源指的是协议、域名、端口这些必须一致才算同源，对于非同源的请求浏览器会拦截这样子可以减少 csrf（跨站请求伪造）的攻击
    跨域的解决方案有如下几种：
    1. jsonp 只适合 get 请求，服务端需要兼容（原理：获取资源是不受浏览器同源策略影响的）`<script src="跨域接口?callback=fn">`
    2. cors：设置 ACCESS-（这里不太清楚设置的什么响应头了），然后就可以允许哪些请求可以正常被返回，同时这个 cors 要去获取内容是不能携带 cookie 的
       此外这里还有简单请求和复杂请求，复杂请求会发起预检请求，简单请求包含 GET/HEAD/POST 等方法，但是需要一定的限制，比如不能存在自定义 head 等才能视为简单请求，其余请求都视为复杂请求
    3. iframe
    4. 代理服务器 nginx webpack devServer
    5. websocket
11. 介绍一下 tcp 三次握手
    tcp 三次握手：sync->sync+ack->ack 分别由客户端、服务端、客服端发起
12. 介绍一下 tcp 四次握手
    四次挥手 fin->ack->fin->ack 这里分别由客户端、服务端、服务端、客户端发起
13. TCP 四次挥手，可以变成三次吗？
    变为三次要看是少哪一次：
    如果是少了最后一个 fin，那么可能导致数据传输不完整，所以这个是可能合并为三次握手的，只要当接收方没有数据发送时
    如果是少了最后一个 ack 那么，服务端就无法确定它的 FIN 是否到达，可能会反复重传 FIN。直到超时连接才会强制关闭
14. tcp 和 udp 的区别
    tcp 是面向连接的可靠的传输，udp 是面向无连接的不可靠传输
    tcp 存在流量控制和拥塞控制，而 udp 不存在
    tcp 是字节流，而 udp 是保温
    tcp 适用于文件传输等需要可靠传输的场景 udp 适用于通话、直播等低延迟场景
    实际生活中 udp 更多，为了让 udp“可靠”，一般是基于 udp 进行封装，比如 http3 的 quic
15. tcp 如何保证可靠性
    tcp 保障可靠性有多种方式：
    1. ack 确认
    2. 滑动窗口
    3. 超时、失败重传
16. 算法题： 1. 移除出现次数最少的字符 2. 合法的括号

```js
function removeMin(s) {
  const m = new Map();
  for (const char of s) {
    m.set(char, (m.get(char) ?? 0) + 1);
  }
  let min = Math.min(...Object.values(m));
  let removeMap = {};
  for (const [key, val] of m) {
    if (val === min) {
      removeMap[key] = true;
    }
  }
  const res = "";
  for (const char of s) {
    if (removeMap[char]) continue;
    res += char;
  }
  return res ?? s;
}

function validBrackets(str) {
  const stk = [];
  const map = {
    "{": "}",
    "[": "]",
    "(": ")",
  };
  const keys = Object.keys(map);
  for (const char of str) {
    if (keys.includes(char)) {
      stk.push(char);
    } else {
      if (stk.length === 0 || map[stk[stk.length - 1]] !== char) return false;
      stk.pop();
    }
  }
  return stk.length === 0;
}
```

## 腾讯 wxg3 面

1. 开局 3 个算法，30mins
   1. 循环递增的数组找最小值，时间最优
   2. 二叉树的深度
   3. 合并有序链表

```js
//循环递增的数组找最小值也就是本身是 [1,2,3,4]->[3,4,1,2]
function findMin(nums) {
  let l = 0,
    r = nums.length - 1;
  while (l < r) {
    let mid = (l + r) >> 1;
    if (nums[mid] < nums[r]) {
      //说明是递增序列最小值在mid左侧
      r = mid;
    } else {
      l = mid + 1;
    }
  }
  return nums[l];
}

function findDeep(root) {
  const dfs = (node, d) => {
    if (!node) return d;
    return Math.max(dfs(node.left, d + 1), dfs(node.right, d + 1));
  };
  return dfs(root, 0);
}
function mergeOrderList(list1, list2) {
  let pre = new ListNode(),
    cur = pre;
  let [h1, h2] = [list1, list2];
  while (h1 && h2) {
    if (h1.val < h2.val) {
      pre.next = h1;
      h1 = h1.next;
    } else {
      pre.next = h2;
      h2 = h2.next;
    }
  }
  if (h1) pre.next = h1;
  if (h2) pre.next = h2;
  return cur.next;
}
```

4. 进程中的内存是怎么分布的

   1. 进程中的内存会根据当前线程的需要进行分配，往往是进程去向计算机请求资源，然后分配给线程，

5. 进程和线程的区别

6. 进程间的通信手段

7. 二进制如何上传给服务端

   1. **表单提交（传统方式）**

      1. 前端表单需设置 `enctype="multipart/form-data"`（默认是`application/x-www-form-urlencoded`，不支持二进制）。
      2. 表单中通过 `<input type="file">` 选择文件，提交时浏览器会自动将文件二进制数据按多部分格式（multipart）封装到请求体中。

      html

   ```html
   <form action="/upload" method="post" enctype="multipart/form-data">
     <input type="file" name="file" />
     <button type="submit">上传</button>
   </form>
   ```

   2. AJAX/ Fetch 上传\*\*

   - 使用 `FormData` 对象包装二进制数据（支持文件、Blob 等），通过 AJAX 或 Fetch 发送，浏览器会自动处理 `Content-Type: multipart/form-data`。

   ```javascript
   const fileInput = document.querySelector('input[type="file"]');
   const formData = new FormData();
   formData.append("file", fileInput.files[0]); // 追加文件二进制数据

   fetch("/upload", {
     method: "POST",
     body: formData, // 自动设置正确的Content-Type
   });
   ```

   - 也可直接发送 `Blob` 或 `ArrayBuffer`（二进制原始数据），需手动指定 `Content-Type`（如 `application/octet-stream`）。

   3. **服务端处理**

   - 服务端需解析多部分请求体，提取二进制数据。例如：
     - Node.js：使用 `multer`、`busboy` 中间件。
     - Java：通过 `MultipartFile` 接口。
     - Python（Django）：通过 `request.FILES` 获取。

8. String() 和 toString() 底层是如何实现的

   1. string

      1. **本质**：全局函数（也可作为构造函数，但通常用作转换函数）。
      2. 底层逻辑

         1. 若输入是原始值（number/boolean/null/undefined）：

            1. `null` → `"null"`，`undefined` → `"undefined"`；
            2. 数字转字符串（如 `String(123)` → `"123"`，`String(NaN)` → `"NaN"`）；
            3. 布尔值 → `"true"` 或 `"false"`。

         2. 若输入是对象：

            - 先调用对象的 `valueOf()` 方法，若结果不是原始值，再调用 `toString()`；

            - 最终将得到的原始值转为字符串（如 `String({a:1})` → `"[object Object]"`）。

      3. toString () 方法
         1. **本质**：对象的原型方法（`Object.prototype.toString()`），所有对象（除 `null`/`undefined`）都继承此方法。
         2. **底层逻辑**:
            1. 原始值（需先装箱为对象）：
            - 数字：`(123).toString()` → `"123"`，支持基数参数（如 `(255).toString(16)` → `"ff"`）；
            - 布尔值：`true.toString()` → `"true"`。
            2. 对象：
            - 普通对象默认返回 `"[object Type]"`（`Type` 为对象类型，如 `{}.toString()` → `"[object Object]"`）；
            - 数组、日期等内置对象重写了 `toString()`（如 `[1,2].toString()` → `"1,2"`，`new Date().toString()` 返回可读日期字符串）。
         3. 限制：`null` 和 `undefined` 没有 `toString()` 方法，直接调用会报错（如 `null.toString()` → TypeError）

9. 如何实现客户端与服务端的长连接

   1. websocket
   2. 长轮训
   3. sse

10. URL 有长度限制吗
    1.
11. 如何优化网页加载
12. 讲讲 base64
13. gbk 和 utf-8 的区别
