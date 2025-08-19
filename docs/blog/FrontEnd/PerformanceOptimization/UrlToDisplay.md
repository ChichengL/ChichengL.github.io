# 浏览器输入 URL 之后发生了什么

1. 浏览器先在地址栏（omnibox）解析用户输入：判断是“导航到 URL”还是“搜索”。
   1. 若输入包含协议（如 http:// 或 https://）或明显的主机名（通常含点且无空格），浏览器倾向于作为 URL 导航。
   2. 若输入含空格、被识别为查询，或浏览器策略/用户设置决定使用搜索引擎，则作为搜索请求发送给默认搜索引擎。
2. 规范化与补全
   1. 若缺少协议，浏览器可能补全默认协议（常为 http://），但会先检查安全策略（如 HSTS）。
   2. 处理 IDN（punycode）、百分号编码等 URL 规范化工作。
3. 安全与策略检查
   1. 检查 HSTS 列表或浏览器内存储的策略，必要时将 http 升级为 https。
   2. 应用代理设置、企业策略或扩展对请求的改写／拦截。
4. 主机名解析（DNS）与优先级

   1. 本地优先
      - 首先检查 hosts 文件（用户/管理员配置的静态映射）、浏览器内置的 DNS 缓存与操作系统的解析缓存（包括负缓存，即对 NXDOMAIN 的缓存）。这些本地条目最快且可用于覆盖网络解析结果。
   2. 并行与优先策略
      - 浏览器/系统可能并行或按策略查询 A（IPv4）和 AAAA（IPv6）记录，并结合“Happy Eyeballs”策略决定使用 IPv4 还是 IPv6 建立连接以减少延迟。
   3. 网络解析器（递归解析器 / 本地解析器）

      - 若本地未命中，客户端将向配置的 DNS 解析器发起查询（通常是本地路由器、ISP 或第三方解析器）。解析器会执行递归查询、跟随 CNAME 链并返回最终 A/AAAA 记录与 TTL。

   4. 性能与优化点
      - DNS TTL、解析器缓存命中率、DoH/DoT 的延迟、CNAME 链长度与并发解析策略都会显著影响首字节时间（TTFB）与页面加载延迟。

5. 建立连接
   1. 根据最终 URL 协议发起网络连接：TCP（三次握手）+ TLS（若 HTTPS）或 QUIC（基于 UDP）。
   2. 完成 TLS 握手并验证证书（若适用）。
6. 发送请求并处理响应
   1. 发送 HTTP 请求，可能被 Service Worker、代理或缓存拦截或命中。
   2. 处理重定向、认证、响应缓存策略、压缩等。
7. 渲染与后续资源加载
   1. HTML 解析与 DOM 构建
   - 浏览器解析 HTML 生成节点流并逐步构建 DOM 树。遇到同步 `<script>`（未加 async/defer）会暂停解析并行脚本。
   2. CSS 解析与 CSSOM / 样式计算
      - 浏览器下载并解析 CSS，生成 CSSOM。DOM + CSSOM 合并生成渲染树（render tree），并进行样式计算（style）。
      - CSS 是渲染阻塞资源：未加载的样式会阻止首次绘制（first paint）。
        常见性能指标：
        - 核心（Core Web Vitals）
          LCP（Largest Contentful Paint）：最大可见元素渲染时间，衡量首屏主要内容加载速度。
          INP（Interaction to Next Paint）：交互体验指标，替代 FID，衡量交互响应质量。
          CLS（Cumulative Layout Shift）：累计布局偏移，衡量视觉稳定性。
        - 加载/首包相关
          TTFB（Time To First Byte）：服务器响应首字节时间，常反映后端/网络延迟。
          FP（First Paint）、FCP（First Contentful Paint）：首次绘制 / 首次内容绘制，感知首屏开始。
          Speed Index：页面内容感知完成的速率，侧重视觉体验。
          TTI（Time To Interactive）：页面可交互时间（可能受 JS 阻塞影响）。
        - 阻塞与主线程
          TBT（Total Blocking Time）：页面加载期间被长任务阻塞的总时长（与 TTI 相关）。
          Long Tasks / 最长任务：主线程上 >50ms 的任务，影响交互和帧率。
          主线程占用 / JS 执行时间：影响帧率与响应性。
        - 资源与网络
          请求数（Number of Requests）与总流量（Total Page Size）：直接影响下载时间与连接开销。
          DNS / TCP / TLS 时延（分段度量）：定位网络链路瓶颈。
          缓存命中率（Cache Hit Ratio）、资源压缩与子资源优先级（critical request chains）。
        - 渲染细节与可感知指标
          First Meaningful Paint（已弱化/不稳定，但在老文档中常见）
          First CPU Idle：首次 CPU 处于空闲可处理交互的时间点。
          Visually Complete / Perceptual metrics：视觉上页面“看起来完成”的时间。
   3. 布局（reflow / layout）
      - 在渲染树基础上计算每个节点的几何位置与大小。布局开销高，读取 layout 相关属性（offsetWidth/height 等）可能触发强制回流（forced reflow）。
   4. 绘制（paint）
      - 将布局结果转为绘制命令（绘制文本、边框、背景等）。绘制会产生像素级的工作（CPU/GPU）。
   5. 分层与合成（layers / compositing / rasterization）
      - 浏览器将部分内容分入图层（layer），每层可单独合成（composite）。合成线程/GPU 可对各层进行 rasterization（光栅化）并在 GPU 上合成以减少主线程负担。
      - 创建图层有成本（内存、GPU 上传），不应滥用（如过度使用 will-change、复杂 CSS 过滤器、过多的 fixed/transform 元素）。。
   6. 后续资源加载与优先级
      - 图片、字体、脚本、样式等按优先级加载。可通过 rel=preload/preconnect、resource hints、HTTP/2 优先级、lazy-loading 等优化关键渲染路径（critical rendering path）。

## 相关八股

### FCP、FP、FMP 的区别

- FP（First Paint）
  浏览器第一次把非空白像素画到屏幕上（背景色、边框等最早的绘制）。
- FCP（First Contentful Paint）
  浏览器第一次绘制“有内容”的像素（文本、图片、svg、canvas 等）。比 FP 更能反映用户感知到“有内容”的时刻。
- FMP（First Meaningful Paint）
  试图度量“对用户有意义的主要内容首次渲染”，但该指标定义主观且不稳定，已在实践中被 LCP（Largest Contentful Paint）等更稳定指标取代。若需要 FMP，可用 LCP 或自定义页面关键元素的可见性作为近似。
  如何在浏览器中实现（推荐与回退方案）

1. 使用标准 API（首选）
   FP / FCP：PerformanceObserver 的 paint 条目
   推荐替代 FMP：使用 LCP（largest-contentful-paint）

```js
// 监听 FP / FCP
try {
  const po = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (
        entry.name === "first-paint" ||
        entry.name === "first-contentful-paint"
      ) {
        // entry.startTime 单位 ms，相对 navigationStart / timeOrigin
        console.log(entry.name, Math.round(entry.startTime));
      }
    }
  });
  po.observe({ type: "paint", buffered: true });
} catch (e) {
  console.warn("PerformanceObserver(paint) not supported", e);
}

// 监听 LCP（作为更稳定的“有意义内容”指标）
try {
  const lcpObs = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    const last = entries[entries.length - 1];
    if (last) {
      console.log("LCP", Math.round(last.startTime), last.element);
    }
  });
  lcpObs.observe({ type: "largest-contentful-paint", buffered: true });
} catch (e) {
  console.warn(
    "PerformanceObserver(largest-contentful-paint) not supported",
    e
  );
}
```

#### round、floor、ceil 的区别

- Math.round（四舍五入，round to nearest）  
  将数值四舍五入到最接近的整数。注意不同语言/实现对 `.5` 的处理不同：在 JavaScript 中，Math.round 在 `.5` 的情况下会向 +∞ 取整（Math.round(0.5) === 1；Math.round(-0.5) === 0）。

- Math.floor（向下取整，向 -∞）  
  返回小于或等于给定数的最大整数。例如：Math.floor(1.9) === 1；Math.floor(-1.1) === -2。

- Math.ceil（向上取整，向 +∞）  
  返回大于或等于给定数的最小整数。例如：Math.ceil(1.1) === 2；Math.ceil(-1.9) === -1。

- Math.trunc（向零取整）  
  去掉小数部分，直接截断。例如：Math.trunc(1.9) === 1；Math.trunc(-1.9) === -1。

```js
Math.round(1.5); // 2
Math.round(-1.5); // -1? 在 JS 是 -1 的情况下 Math.round(-1.5) === -1 表示 .5 时向 +∞
Math.floor(-1.1); // -2
Math.ceil(-1.9); // -1
Math.trunc(-1.9); // -1
```
