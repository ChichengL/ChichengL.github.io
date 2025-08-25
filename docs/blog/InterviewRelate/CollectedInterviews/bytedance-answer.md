# 回答

## 牛客字节 电商一面

1. 谈谈对网络的理解：5 层网络模型/发送请求的具体过程/同源限制/跨域问题
   1. **网络模型**：
      - **7 层 OSI 模型**：物理层（比特传输）、数据链路层（帧传输，如 MAC 地址）、网络层（IP 路由）、传输层（TCP/UDP 端口）、会话层（建立 / 维护会话）、表示层（数据格式转换，如加密）、应用层（HTTP/FTP 等协议）。
      - **5 层模型**（实际常用）：合并会话层和表示层到应用层，即物理层、数据链路层、网络层、传输层、应用层。
      - **4 层 TCP/IP 模型**：数据链路层、网络层、传输层、应用层（更简洁的工程划分）。
   2. **发送请求的具体过程**：
      - **DNS 解析**：本地 hosts 文件 → 浏览器 DNS 缓存 → 本地 DNS 服务器 → 根域名服务器（递归查询 IP）。
      - 建立连
        - TCP 三次握手（确保双向通信可达）：客户端发 SYN → 服务器回 SYN+ACK → 客户端回 ACK。
        - 若为 HTTPS：TLS 握手（交换证书、协商加密算法、生成会话密钥）。
      - **发送请求**：构造 HTTP 请求（方法、URL、头信息、body），通过 TCP 分段传输。
      - **接收响应**：服务器处理后返回 HTTP 响应（状态码、头信息、body），TCP 确认接收。
      - **断开连接**：TCP 四次挥手（双方确认无数据传输后关闭连接）。
   3. **同源限制**：
      浏览器的安全策略，要求**协议、域名、端口完全一致**才视为同源。限制内容包括：
      - 无法读取非同源的 Cookie、LocalStorage、DOM。
      - 无法向非同源发送 AJAX/fetch 请求（默认被拦截）。
        目的：防止 CSRF（跨站请求伪造）、XSS（跨站脚本）等攻击。
   4. **跨域问题及解决**：
      非同源请求被浏览器拦截的现象。解决方式：
      - **CORS**：服务器设置`Access-Control-Allow-Origin`等响应头。
      - **JSONP**：利用`<script>`标签不受同源限制，仅支持 GET。
      - **代理服务器**：前端请求同源代理，代理转发到目标服务器（如 Webpack Dev Server）。
      - **iframe/postMessage**：跨域页面间通信。
2. React 更新流程

   1. **调度阶段（Scheduler）**：
      - `setState`/`useState`触发更新，React 将更新任务加入调度队列。
      - 调度器根据任务优先级（如用户输入＞渲染）决定执行时机（可中断）。
   2. **协调阶段（Reconciliation）**：
      - 从根节点开始遍历 Fiber 树，对比新旧虚拟 DOM（Diff 算法），标记需要更新的节点（`effectTag`）。
      - 此阶段可中断（为高优先级任务让步），通过链表结构实现恢复。
   3. **提交阶段（Commit）**：
      - 不可中断，执行真正的 DOM 操作（根据`effectTag`添加 / 删除 / 更新节点）。
      - 分三步：
        - **Before mutation**：执行`getSnapshotBeforeUpdate`（类组件）。
        - **Mutation**：操作 DOM。
        - **Layout**：执行`useLayoutEffect`回调及清理函数，更新 refs，触发`componentDidMount`/`componentDidUpdate`。
      - 最后执行`useEffect`回调及清理函数（异步，不阻塞浏览器渲染）。

3. 快速触发两次 setState 页面最终渲染几次？

   - **React 18 之前**：
     - 同步场景（如函数组件顶层、类组件`componentDidMount`）：两次`setState`会合并，最终渲染 1 次。
     - 异步场景（如`setTimeout`、Promise 回调）：两次更新不合并，渲染 2 次。
   - **React 18 之后**：

     - 引入**自动批处理（Auto Batching）**，无论同步 / 异步场景（包括`setTimeout`、Promise），默认合并更新，最终渲染 1 次。
     - 若需强制立即更新，可使用`flushSync`包裹（如`flushSync(() => {setState(1); setState(2);})`，会渲染 2 次）。

4. 浏览器渲染过程？

   1. **解析 HTML 生成 DOM 树**：
      - 词法分析（将 HTML 字符转为标签）→ 语法分析（构建父子关系的 DOM 树）。
      - 遇到`<script>`标签（同步）会暂停 DOM 解析，优先下载并执行 JS（因 JS 可能修改 DOM）。
   2. **解析 CSS 生成 CSSOM 树**：
      - 解析 CSS 规则（选择器、样式值），构建层级关系的 CSSOM（含继承 / 层叠规则）。
      - CSSOM 会阻塞 JS 执行（JS 可能读取样式）和渲染。
   3. **生成布局树（Layout Tree）**：
      - 结合 DOM 和 CSSOM，过滤不可见节点（如`display: none`），计算每个节点的几何位置（宽高、坐标）。
   4. **分层与生成绘制列表**：
      - 浏览器将布局树按层级拆分（如固定定位元素单独分层），减少重排范围。
      - 为每层生成绘制指令（如 “绘制背景色 → 绘制文字”）。
   5. **光栅化（Rasterization）**：
      - 将绘制指令转换为像素（GPU 加速处理，尤其大图层）。
   6. **合成（Composition）**：
      - 合并所有层的像素，显示到屏幕上。

5. 浏览器缓存有哪些？cookie 了解吗？

   1. **浏览器缓存分类**：

      - 本地存储

        - localStorage`：永久存储（除非手动删除），同源共享，容量约 5MB。
        - `sessionStorage`：仅当前会话（标签页）有效，关闭标签即删除。
        - `IndexedDB`：大型结构化数据存储，异步 API，容量无严格限制。

      - HTTP 缓存

        （针对请求资源，如 JS/CSS/ 图片）：

        - **强缓存**：直接从缓存读取，不发请求。由`Cache-Control`（如`max-age=3600`）或`Expires`（绝对时间）控制。
        - **协商缓存**：需发请求验证资源是否更新。通过`Last-Modified/If-Modified-Since`（时间戳）或`ETag/If-None-Match`（哈希值）验证，未更新则返回 304。

   2. **Cookie**：

      - 服务器通过`Set-Cookie`头设置，浏览器自动存储，每次请求同源资源时携带。
      - 核心属性：
        - `HttpOnly`：禁止 JS 读取（防 XSS）。
        - `Secure`：仅 HTTPS 传输。
        - `SameSite`：限制跨站发送（防 CSRF，如`SameSite=Lax`）。
        - `Max-Age`：存活时间（秒），默认会话结束失效。
      - 与 Session 的关系：Session 通常基于 Cookie 存储`sessionID`，服务器通过`sessionID`查询用户状态。

6. 进程了解吗？浏览器进程有哪些？

   - **进程**：操作系统分配资源（内存、CPU 等）的基本单位，拥有独立内存空间，一个进程可包含多个线程。

   - 浏览器进程

     （以 Chrome 为例）：

     1. **主进程（Browser Process）**：管理窗口、标签页，处理导航、文件下载，协调其他进程。
     2. 渲染进程（Renderer Process）：每个标签页一个（隔离性），负责页面渲染（DOM/CSSOM/JS 执行），含：
        - GUI 渲染线程（绘制页面）。
        - JS 引擎线程（执行 JS），与 GUI 线程互斥（防止渲染冲突）。
        - 事件触发线程、定时器线程、网络请求线程等。
     3. **网络进程（Network Process）**：处理所有网络请求（DNS、TCP 连接等）。
     4. **GPU 进程**：负责 3D 渲染、图层合成，提升渲染性能。
     5. **插件进程（Plugin Process）**：管理浏览器插件（如 Flash），独立进程避免插件崩溃影响全局。

7. 线程和进程的区别？
   进程可以拥有多个线程，进程崩溃不会影响其他进程，线程崩溃可能会导致其他线程崩溃，进程是计算机分配资源的基本单位，线程是计算机接受调度的基本单位，类似于一个工厂向外采购材料，再有工厂内部多个流水线合作共同生成产品

   | 维度            | 进程                       | 线程                     |
   | --------------- | -------------------------- | ------------------------ |
   | 资源分配        | 独立内存空间、文件描述符等 | 共享所属进程的资源       |
   | 调度单位        | 操作系统分配资源的基本单位 | CPU 调度和执行的基本单位 |
   | 通信成本        | 高（需 IPC 机制，如管道）  | 低（直接读写共享内存）   |
   | 稳定性          | 崩溃不影响其他进程         | 崩溃可能导致整个进程崩溃 |
   | 创建 / 销毁开销 | 大（需分配资源）           | 小（共享资源）           |

8. 进程间通信有了解吗？

   1. **管道（Pipe）**：半双工，适用于父子进程（如`|`命令）。
   2. **消息队列**：独立于进程的消息链表，可实现异步通信。
   3. **共享内存**：多个进程共享同一块内存，效率最高（需同步机制如信号量）。线程通信往往使用共享内存
   4. **信号量（Semaphore）**：用于进程同步（控制资源访问）。
   5. **套接字（Socket）**：可跨网络通信（如客户端 - 服务器模型）。

9. 聊聊事件循环？

   1. **浏览器事件循环**：

   - 任务队列：
     - **宏任务（Macrotask）**：`setTimeout`、`setInterval`、`DOM事件`、`fetch`等。
     - **微任务（Microtask）**：`Promise.then/catch/finally`、`queueMicrotask`、`MutationObserver`等。
   - 执行流程：
     1. 执行同步代码，将宏 / 微任务加入对应队列。
     2. 同步代码执行完，清空**所有微任务**（按顺序）。
     3. 执行一次 UI 渲染（可选，浏览器决定）。
     4. 从宏任务队列取一个任务执行，重复步骤 2-4。

   1. **Node 事件循环**：

   - 阶段划分（Node 10 前）：`timers`（处理`setTimeout`）→ `pending callbacks`（延迟回调）→ `idle, prepare`（内部）→ `poll`（等待 I/O）→ `check`（`setImmediate`）→ `close callbacks`。
   - Node 11 + 后：与浏览器一致（执行完一个宏任务后立即清空微任务）。

10. JS 引擎执行过程？内存泄露？自动回收机制？

    1. **JS 引擎执行过程**（以 V8 为例）：

    - **词法分析**：将代码拆分为令牌（如变量、关键字）。
    - **语法分析**：生成抽象语法树（AST）。
    - **字节码生成**：AST 转换为字节码（而非直接生成机器码，平衡速度与内存）。
    - **执行与优化**：解释器（Ignition）执行字节码，编译器（Turbofan）将高频代码编译为机器码并缓存。

    1. **内存泄露**：不再使用的内存未释放，导致内存占用持续增加。常见场景：

    - 未清理的定时器 / 事件监听器。
    - 意外的全局变量（`var`声明或未声明的变量）。
    - 闭包引用大对象未释放。
    - DOM 元素被 JS 引用但已从 DOM 树移除。

    1. **垃圾回收机制**（V8）：

       - **标记 - 清除**：标记可达对象（从根对象出发可访问），清除未标记对象（解决循环引用）。
       - 分代回收

         - 新生代（短期对象）：用 Scavenge 算法（复制存活对象到新空间，清空旧空间）。
         - 老生代（长期对象）：用标记 - 清除 + 标记 - 整理（压缩内存碎片）。

11. 讲讲 React 的调度器

    1. **优先级分类**：
       - 高优先级：用户输入（如点击）、动画（需 60fps）。
       - 低优先级：列表渲染、数据计算（可延迟）。
    2. **实现原理**：

       - 基于**优先队列**（最小堆）存储任务，优先级高的任务先执行。
       - 利用浏览器 API 判断是否有剩余时间：

         - 高优先级任务：用`setTimeout`/`postMessage`模拟（精度更高）。
         - 低优先级任务：用`requestIdleCallback`（利用浏览器空闲时间）。

12. hooks 是什么
    聊下 hooksHooks 是 React 16.8 引入的特性，让函数组件拥有状态和生命周期能力，解决类组件的痛点（如逻辑复用复杂、生命周期碎片化）：

    1. **核心 Hooks**：
       - `useState`：管理组件状态。
       - `useEffect`：处理副作用（如请求、事件监听），替代类组件生命周期。
       - `useContext`：访问上下文。
       - `useReducer`：复杂状态管理（类似 Redux）。
    2. **规则**：
       - 只能在函数组件或自定义 Hook 顶层调用（不能在条件 / 循环中，确保调用顺序稳定）。
       - 只能在 React 函数中调用（防止在非 React 环境误用）。
    3. **自定义 Hook**：封装可复用逻辑（如`useFetch`、`useLocalStorage`），命名需以`use`开头。

13. 手撕一个同时请求 n 个的 request

```js
function batchRequest(requests, n) {}
class Concurrency {
  constructor(limit) {
    this.limit = limit;
    this.running = 0;
    this.restCbs = [];
  }
  async add(task) {
    if (this.running >= this.limit) {
      await new Promise((resolve) => this.restCbs.push(resolve));
      this.runTask(task);
    } else {
      this.runTask(task);
    }
  }
  async runTask(task) {
    this.running++;
    task().then(() => {
      this.running--;
      if (this.restCbs.length > 0) {
        const next = this.restCbs.shift();
        next();
      }
    });
  }
}
```

15. 深度比较两个对象是否相同

```js
function deepCompare(obj1, obj2) {
  const seen = new Map();
  function _deep(a, b) {
    if (a === b) return true;
    if (a == null || b == null) return a === b;
    const ta = Object.prototype.toString.call(a);
    const tb = Object.prototype.toString.call(b);
    if (ta !== tb) return false;

    // 函数比较：比较源码（可选），否则按引用比较会失败
    if (ta === "[object Function]") return a.toString() === b.toString();

    // 非对象类型直接比较
    if (
      ta !== "[object Object]" &&
      ta !== "[object Array]" &&
      ta !== "[object Map]" &&
      ta !== "[object Set]"
    )
      return a === b;

    // 循环引用检测
    if (seen.get(a) === b) return true;
    seen.set(a, b);

    if (ta === "[object Array]") {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) if (!_deep(a[i], b[i])) return false;
      return true;
    }

    if (ta === "[object Date]") return a.getTime() === b.getTime();
    if (ta === "[object RegExp]") return a.toString() === b.toString();

    // 对象（包括 symbol 属性）
    const keysA = Reflect.ownKeys(a);
    const keysB = Reflect.ownKeys(b);
    if (keysA.length !== keysB.length) return false;
    for (const key of keysA) {
      if (!keysB.includes(key)) return false;
      if (!_deep(a[key], b[key])) return false;
    }
    return true;
  }
  return _deep(obj1, obj2);
}
const findType = (val) => Object.prototype.toString.call(val);

console.log(
  deepCompare(
    { a: 1, [Symbol.for("a")]() {} },
    { a: 1, [Symbol.for("a")]() {} }
  )
);
```

16. 删除链表倒数第 n 个位置

```js
function deleteNode(root, n) {
  let pre = new ListNode();
  pre.next = root;
  let slow = pre,
    fast = pre;
  while (n-- && fast) {
    fast = fast.next;
  }
  while (fast?.next) {
    fast = fast.next;
    slow = slow.next;
  }
  slow.next = slow.next.next;
  return pre.next;
}
```

## xhs 字节暑期一面

1. 讲一下 https？
   HTTP 协议运行在 TLS/SSL 之上（TLS 是 SSL 的升级版，现在主要用 TLS），TLS 负责建立安全通道，HTTP 负责应用层数据传输。这两者构成了 HTTPS
2. 为什么 https 更安全
   1. 因为 https 是握手阶段用非对称加密交换对称密钥（效率低，仅用于密钥交换），后续数据传输用对称加密（效率高）。且采用了数字证书+签名，通过 CA 签名确保 “服务器公钥” 的真实性，避免中间人替换公钥，而非单纯 “在 CA 注册”。
3. http 怎么控制缓存
   1. http 控制缓存，请求的相似去做的，比如请求同一个地址，这个结果会根据其响应的请求头中的 cache-control 这个请求头控制，如果是 max-age 字段说明只要还没到期就可以直接使用，如果过期回走协商缓存，如果协商不命中就会重新请求
      “强缓存”（Cache-Control、Expires）和 “协商缓存”（Etag/If-None-Match、Last-Modified/If-Modified-Since）的触发条件和优先级。
4. Dns 解析涉及到的协议了解吗
   DNS 解析属于应用层协议，主要使用 UDP 协议（端口 53），因为 UDP 效率高；当查询结果超过 512 字节时，会改用 TCP 协议分片传输。
5. 应用层的协议有哪些了解吗
   1. HTTP，还有 FTP（文件传输）、SMTP/POP3/IMAP（邮件）、DNS（域名解析）、Telnet（远程登录）等
6. Udp 了解吗
   1. udp 是面向无连接的传输协议，他的特点是快，低延迟，主要使用与直播等场景，就算是其他场景也是 udp 较多，可以将 udp 进行封装为 tcp-liked 形式，让其可靠
7. Tcp 三次握手
   1. 客户端发起 seq=x，SYN=1
   2. 服务端响应 seq=y,ack=x+1,SYN=1
   3. 客户端响应 ack=y+1
8. 为什么一定需要三次
   1. 为了保障连接可靠，如果是一次/两次，那么会极大的浪费服务端资源，因为网络无时无刻存在波动，倘若发起的第一个请求连接在网络中迷失之后，客户端发起第二个连接，然后传输数据后断开，后续第一个请求又到达服务端之后，服务端直接根据这个请求建立连接，结果发现客户端一直无响应，最后只能等到连接超时才能关闭连接
9. Vue 的更新的过程
   1. 改变响应式数据，触发 effect
   2. 将 effect 去重并存入批量更新队列
   3. 等待下一次微任务/宏任务，清空批量更新队列
   4. 找到这些批量更新元素的最近公共父祖先的 vnode，以此为节点进行 diff
   5. 找到变更节点
   6. 执行这些变更节点的渲染函数，得到 vnode
   7. 比对新旧 vnode，将变更应用在 dom 上
10. ref 和 reactive 区别
    1. ref 底层使用了 reactive。
    2. reactive 本质上是实现了一个 watcher 用于监听变化的数据
    3. 当 ref 传入的值为普通类型时，会创建一个简单的 get，set 拦截对象，如果是 ref 传入的一个对象类型，那么会让 ref.value 赋值为 reactive 包裹这个对象
11. ref.value 的原理？
    1. 直接取数据，然后在 get 中存在一个 track，记录这个变量在哪里使用了，然后在 set 时触发这个 effect
12. 浏览器渲染的过程
    1. 拉取 HTML 并解析，生成 DOM，期间遇见同步的 js 文件会暂停解析，等待 js 文件下载并执行
    2. 拉取外部的 css 文件生成 CSSOM
    3. 根据 DOM 和 CSSOM 生成布局树
    4. 分层并生成绘制指令
    5. 光栅化：将指令转化为像素
    6. 合成：将所有像素合并然后展示在屏幕上
13. 浏览器渲染 js 是怎么解析的
    1. 对于同步 js 也就是 script 标签不存在 async/defer 的 js，会加载对应的 js 文件，然后直接执行，执行过程中会暂停对 DOM 的生成和渲染
    2. 对于异步的 js
       1. 对于 asyncjs，会异步加载，然后加载完成立即执行
       2. 对于 deferjs，会异步加载，等待 DOM 加载完成之后在执行，也就是当触发 DOMContentLoaded 之后执行
14. 模块规范有了解吗，讲一下
    1. CSS 存在模块规范，也就是 BEM 命名规范
    2. 对于 JS 主要存在两种规范
       1. CommonJS：同步加载文件
       2. ESmodule：异步加载文件，官方支持
15. 手撕 batchFetch，没写出来，直接让讲思路，然后问了 new 是怎么创建实例的，以及对着代码问了一些 this 指向问题

```js
const batchFetch = (fetches,limit)=>{
    const c = mew Concurrency(limit);
    for(const fetch of fetches){
        c.add(fetch);
    }

}
class Concurrency{
    constructor(limit){
        this.limit = limit;
        this.running = 0;
        this.tasks = [];
        this.results = [];
    }
    async add(task){
        if(this.running<this.limit){
            this.runTask(task);
        }else{
            await new Promise(resolve=>this.tasks.push(resolve));
            this.runTask(task);
        }
    }
    runTask(task){
        this.running++;
        task().then((res)=>{
            this.running--;
            results.push(res);
            if(this.tasks.length){
                const next = this.tasks.shift();
                next();
            }
        })
    }
}
const batchFetch = (fetches,limit)=>{
    return new Promise((resolve)=>{
        if(fetches.length===0){
            resolve([]);
            return;
        }
        const results = [];
        let index = 0;
        let completed = 0;

        const run = ()=>{
            if(index >= fetches.length) return;
            const i =  index++;
            const fetch = fetches[i];

            fetch().then(res=>{
                results[i] = res;
                run();
            }).catch(error=>{
                results[i] = error;
            }).finally(()=>{
                completed++;
                if(completed===fetches.length) resolve(results)
            })
        }
        for(let i = 0; i < limit && i < fetches.length; i ++){
            run();
        }
    })
}
```

19. 反问
