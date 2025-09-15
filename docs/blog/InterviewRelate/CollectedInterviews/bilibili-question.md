## B 站直播前端实习一面

1. 跨域
   要了解跨域首先要了解同源协议，同源协议是指协议、域名、端口号都相同，否则就是跨域。
   跨域的原因是浏览器的同源策略，同源策略是指浏览器只允许当前域名下的资源进行交互，不允许跨域。
   跨域的解决方法有很多种，比如 jsonp、cors、postMessage、nginx 反向代理等。

   1. jsonp
      1. 原理：利用 script 标签不受同源策略所影响
      2. 实现示例
      ```js
      function jsonp(url, callback) {
        const script = document.createElement("script");
        script.src = `${url}?callback=${callback}`;
        document.body.appendChild(script);
        script.onload = () => {
          document.body.removeChild(script);
        };
      }
      jsonp("http://localhost:3000/jsonp", (data) => {
        console.log(data);
      });
      ```
      - 缺点：
        1. 只支持 get 请求
        2. 不安全
        3. 可能会导致 XSS 攻击
   2. cors
      1. 原理：利用服务器设置响应头，允许跨域
      2. 实现示例
      ```js
      // 服务器端设置响应头
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type"); // 允许的请求头
      ```
   3. 代理
      1. 原理：服务器之间的请求，不经过浏览器，直接请求服务器，服务器之间的请求是没有跨域问题的。
      2. 示例：
         1. 利用 nginx 反向代理
         2. 利用 node 中间件代理
            ```js
            const express = require("express");
            const app = express();
            const port = 3000;
            app.get("/", (req, res) => {
              res.send("Hello, World!");
            });
            app.listen(port, () => {
              console.log(`Example app listening at http://localhost:${port}`);
            });
            ```
            - 缺点：
              1. 性能问题
              2. 配置复杂
   4. postMessage
      1. 原理：利用 postMessage 方法，实现跨域通信
      2. 实现示例
         ```js
         // 发送方
         window.postMessage("hello", "http://localhost:3000");
         // 接收方
         window.addEventListener("message", (e) => {
           console.log(e.data);
         });
         ```

2. cors
   原理：利用服务器设置响应头，允许跨域。
   流程：简单请求直接验证；复杂请求（如带自定义头）会先发送 OPTIONS 预检请求，通过后才发起实际请求。
   > 简单请求：
   >
   > 1. 请求方法为：GET、POST、HEAD
   > 2. 请求头：Accept、Accept-Language、Content-Language、Content-Type（只限于 application/x-www-form-urlencoded、multipart/form-data、text/plain）
   > 3. 请求体：无
   >    复杂请求：
   >    对于非简单请求都是复杂请求，复杂请求会发起 option 预见请求，option 的返回值为 204，才会发起实际请求。
3. 大量数据进行复杂运算，如何一边计算一边渲染？
   1. 使用 webWorker 将复杂计算迁移到其他线程去执行
      - 缺点：
        1. 不能直接操作 DOM
        2. 通信成本高
        3. 不能实时更新 UI
      - 使用示例
        ```js
        //这里不直接使用文件，根据方法创建一个临时的buffer然后供worker使用
        const worker = new Worker(
          URL.createObjectURL(
            new Blob(
              [
                `
        self.onmessage = function (e) {
            console.log('worker 收到消息:', e.data);
            // 进行复杂计算
            const result = e.data * 2;
            // 发送结果回主线程
            self.postMessage(result);
        };
        `,
              ],
              { type: "application/javascript" }
            )
          )
        );
        // 向 worker 发送消息
        worker.postMessage(100);
        // 接收 worker 发送的消息
        worker.onmessage = function (e) {
          console.log("主线程收到 worker 消息:", e.data);
        };
        ```
   2. 分批次计算，将大任务拆分，然后放在 requestAnimationFrame 中去执行
      1. 示例：
      ```js
      const total = 100000;
      const batchSize = 1000;
      const batches = Math.ceil(total / batchSize);
      let currentBatch = 0;
      function processBatch() {
        if (currentBatch < batches) {
          const start = currentBatch * batchSize;
          const end = start + batchSize;
          // 处理当前批次的数据
          for (let i = start; i < end; i++) {
            // 进行复杂计算
          }
          currentBatch++;
          // 继续下一个批次
          requestAnimationFrame(processBatch);
        }
      }
      // 启动处理
      processBatch();
      ```
   3. 虚拟列表
4. 虚拟列表原理
   虚拟列表的原理是 **虚拟滚动**：即只渲染当前可见区域的列表项，而不是全部渲染。
   实现类型有 定高和不定高两种类型
   1. 对于定高的虚拟列表而言
      1. 原理：利用 css 中的 `overflow: auto` 实现滚动，利用 `calc` 计算出当前可见区域的列表项，然后渲染。
      2. 实现步骤：
         1. 计算可见区域能容纳的项数：`visibleCount = Math.ceil(容器高度 / 项高度)`
         2. 根据滚动位置计算起始索引：`startIndex = Math.floor(滚动距离 / 项高度)`
         3. 计算结束索引：`endIndex = startIndex + visibleCount`
         4. 计算偏移量：`offsetY = startIndex * 项高度`
         5. 只渲染可见项，通过`transform: translateY`定位到正确位置
      3. 实现示例：https://chichengl.github.io/blog/FrontEnd/PerformanceOptimization/virtualList.html
   2. 对于不定高的虚拟列表而言
      1. 原理：利用 css 中的 `overflow: auto` 实现滚动，利用 `calc` 计算出当前可见区域的列表项，然后渲染。
      2. 实现步骤：
         1. 初始化高度数组（初始使用估计值）
         2. 动态测量实际高度并更新数组
         3. 生成位置数组（累计高度）
         4. 使用二分查找定位起始索引
         5. 计算结束索引（累加高度直到超过容器高度）
         6. 通过`transform`定位可见项
      3. 实现示例：https://chichengl.github.io/blog/FrontEnd/PerformanceOptimization/virtualList.html#%E4%B8%8D%E5%AE%9A%E9%AB%98%E8%99%9A%E6%8B%9F%E5%88%97%E8%A1%A8
5. 多线程使用

   - 对于浏览器
     - 可以使用 webWorker 实现多线程
     ```js
     //这里不直接使用文件，根据方法创建一个临时的buffer然后供worker使用
     const worker = new Worker(
       URL.createObjectURL(
         new Blob(
           [
             `
        self.onmessage = function (e) {
            console.log('worker 收到消息:', e.data);
            // 进行复杂计算
            const result = e.data * 2;
            // 发送结果回主线程
            self.postMessage(result);
        };
        `,
           ],
           { type: "application/javascript" }
         )
       )
     );
     // 向 worker 发送消息
     worker.postMessage(100);
     // 接收 worker 发送的消息
     worker.onmessage = function (e) {
       console.log("主线程收到 worker 消息:", e.data);
     };
     // 终止 worker
     worker.terminate();
     // 监听 worker 错误
     worker.onerror = function (e) {
       console.error("Worker 发生错误:", e);
     };
     ```
     - 可以使用 sharedWorker 实现多线程
     ```js
     const sharedWorker = new SharedWorker(
       URL.createObjectURL(
         new Blob(
           [
             `
        self.onmessage = function (e) {
            console.log('worker 收到消息:', e.data);
            // 进行复杂计算
            const result = e.data * 2;
            // 发送结果回主线程
            self.postMessage(result);
        };
        `,
           ],
           { type: "application/javascript" }
         )
       )
     );
     // 向 sharedWorker 发送消息
     sharedWorker.port.postMessage(100);
     // 接收 sharedWorker 发送的消息
     sharedWorker.port.onmessage = function (e) {
       console.log("主线程收到 sharedWorker 消息:", e.data);
     };
     ```
   - 对于 node 环境
     - 可以使用 child_process 实现多线程
     ```js
     const { spawn } = require("child_process");
     const ls = spawn("ls", ["-lh", "/usr"]);
     ls.stdout.on("data", (data) => {
       console.log(`stdout: ${data}`);
     });
     ls.stderr.on("data", (data) => {
       console.error(`stderr: ${data}`);
     });
     ls.on("close", (code) => {
       console.log(`child process exited with code ${code}`);
     });
     ```
     - 可以使用 cluster 实现多线程
     ```js
     const cluster = require("cluster");
     const os = require("os");
     if (cluster.isMaster) {
       console.log(`主进程 ${process.pid} 正在运行`);
       //  fork 出 worker 进程
       for (let i = 0; i < os.cpus().length; i++) {
         cluster.fork();
       }
     } else {
       console.log(`子进程 ${process.pid} 已启动`);
     }
     ```

6. 项目的实时监测怎么实现

- 方案选择：
  - WebSocket：全双工通信，服务器可主动推送数据（适合高频更新）。
  - 长轮询：客户端定期发送请求，服务器有新数据时才响应（兼容性好）。
  - Server-Sent Events (SSE)：服务器单向推送，基于 HTTP（轻量，适合日志 / 通知）。
- 应用场景：实时聊天、监控面板、在线协作工具。

7. BFC 块级作用域
   块级格式化上下文。一般可以用于清除浮动、防止 margin 塌陷等副作用
   - 触发条件：
     1. float 不为 none
     2. overflow 不为 visible
     3. display: flex/grid/inline-block
     4. position: absolute/fixed
   - 应用场景：
     1. 清除浮动
     2. 防止 margin 塌陷
8. 垂直居中

   - 对于文字垂直居中：
     - 行高等于高度 `line-height=40px;height=40px;`
     - 文字垂直居中 `text-align:center;`
   - 对于正常元素来说

     - 父元素使用 flex、grid 布局

     ```css
     .parent {
       display: flex;
       align-items: center;
     }
     .child {
     }

     .parent {
       display: grid;
       place-items: center;
     }
     ```

     - 父元素使用绝对定位，子元素使用相对定位

     ```css
     .parent {
       position: absolute;
     }
     .child {
       position: relative;
       top: 50%;
       left: 50%;
       transform: translate(-50%, -50%);
     }
     ```

     - 父元素使用表格布局

     ```css
     .parent {
       display: table;
     }
     .child {
       display: table-cell;
       vertical-align: middle;
     }
     ```

9. cookie 常用字段
   - `name=value`：键值对（核心数据）。
   - `expires`/`max-age`：过期时间（`expires` 是绝对时间，`max-age` 是秒数，`0` 表示立即删除）。
   - `domain`：指定 cookie 生效的域名（子域名可继承）。
   - `path`：指定生效路径（`/` 表示全站）。
   - `secure`：仅在 HTTPS 协议下传输。
   - `HttpOnly`：禁止 JS 访问（防 XSS 攻击）。
   - `SameSite`：限制跨站请求携带 cookie（`Strict`/`Lax`/`None`，防 CSRF 攻击）。

## b 站直播前端 csb

1. 自我介绍
2. 实习过程中做过最难的需求是什么有什么收益
3. 性能优化是怎么做的，FCP 为什么下降了这么多，而 LCP 只下降了这么点
4. promise

```js
const promise1 = new Promise((resolve) => {
  setTimeout(() => {
    resolve("success");
  }, 1000);
});
const promise2 = promise1.then(() => {
  throw new Error("error");
});

console.log(promise1);
console.log(promise2);

setTimeout(() => {
  console.log(promise1); //报错
  console.log(promise2);
}, 2000);
```

5. 小数是否有循环

```js
function fraction(numerator, denominator) {
  // 如果没有循环直接返回，比如1/2 = 0.5 有循环则返回循环后的，比如2/3 = 0.(6)
  if (numerator % denominator === 0) {
    return `${numerator / denominator}`;
  }

  // 处理负数情况
  const sign = (numerator < 0) ^ (denominator < 0) ? "-" : "";
  numerator = Math.abs(numerator);
  denominator = Math.abs(denominator);

  // 整数部分
  const integerPart = Math.floor(numerator / denominator);
  let remainder = numerator % denominator;

  // 小数部分
  let decimalPart = "";
  const remainderMap = new Map(); // 记录余数和其在小数部分的位置
  let position = 0;

  // 计算小数部分，直到余数为0或者出现循环
  while (remainder !== 0 && !remainderMap.has(remainder)) {
    remainderMap.set(remainder, position++);
    remainder *= 10;
    decimalPart += Math.floor(remainder / denominator);
    remainder %= denominator;
  }

  // 如果余数为0，表示除尽了，没有循环
  if (remainder === 0) {
    return `${sign}${integerPart}.${decimalPart}`;
  } else {
    // 出现循环
    const index = remainderMap.get(remainder);
    const nonRepeating = decimalPart.substring(0, index);
    const repeating = decimalPart.substring(index);
    return `${sign}${integerPart}.${nonRepeating}(${repeating})`;
  }
}
console.log(fraction(1, 2));
console.log(fraction(2, 3));
```
