# Vue-Router vs. React-Router: The Complete Analysis

## Section 1: High-Level Comparison

# Vue-Router vs. React-Router: 横向对比分析

本报告对 `vue-router` 和 `react-router` 在核心路由机制、关键实现细节及性能方面进行直接的技术对比。

### 1. 核心路由机制对比

| 特性               | Vue-Router                                                                                                                                                                      | React-Router                                                                                                                                     |
| :----------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :----------------------------------------------------------------------------------------------------------------------------------------------- |
| **路由匹配算法**   | - 基于配置数组的`match`方法<br>- 规则集中定义                                                                                                                                   | - 基于组件或对象配置<br>- v6+ 使用`useRoutes` Hook<br>- 内部`matchRoutes`函数计算权重并排序                                                      |
| **导航守卫/Hooks** | - 提供全面的导航守卫 API<br>- 全局守卫: `beforeEach`, `afterEach`<br>- 路由独享守卫: `beforeEnter`<br>- 组件内守卫: `beforeRouteEnter`, `beforeRouteUpdate`, `beforeRouteLeave` | - v6+ 无内置导航守卫 API<br>- 通过组合组件和 Hooks (如 `useEffect`) 实现<br>- 使用 `<Navigate>` 进行条件重定向<br>- v5- 使用 `<Prompt>` 阻止转换 |
| **路由状态管理**   | - 通过 `this.$router` 和 `this.$route` 访问<br>- 状态由 Vue 的响应式系统管理                                                                                                    | - 通过 Hooks (`useLocation`, `useParams`, `useNavigate`) 访问<br>- 状态通过 React Context API 向下传递                                           |

### 2. 关键实现细节对比

| 特性                 | Vue-Router                                                                               | React-Router                                                                                                         |
| :------------------- | :--------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------- |
| **History API 管理** | - 内置 Hash 和 History 模式<br>- 直接与浏览器 API 交互<br>- v4+ 统一使用 `popstate` 事件 | - 依赖 `history` 库进行抽象<br>- 通过 `<BrowserRouter>` 和 `<HashRouter>` 组件选择模式<br>- `history` 库提供统一 API |
| **懒加载机制**       | - 使用动态 `import()` 函数<br>- `component: () => import(...)`                           | - 使用 `React.lazy()` 和 `<Suspense>` 组件<br>- `<Route>` 组件在 v6+ 也支持 `lazy` 属性                              |
| **嵌套路由**         | - 在路由配置中使用 `children` 数组<br>- 在父组件模板中使用 `<router-view>` 作为出口      | - 嵌套 `<Route>` 组件或使用 `children` 属性<br>- 在父组件元素中使用 `<Outlet>` 作为出口                              |

### 3. 性能指标对比

| 特性           | Vue-Router                               | React-Router                                                                                    |
| :------------- | :--------------------------------------- | :---------------------------------------------------------------------------------------------- |
| **包体积**     | - （无具体数据）                         | - v6 版本相较于 v5 在包体积上有显著优化                                                         |
| **运行时开销** | - （无具体数据）                         | - （无具体数据）                                                                                |
| **内存消耗**   | - （无具体数据）                         | - （无具体数据）                                                                                |
| **优化策略**   | - 懒加载和异步组件<br>- 优化导航守卫逻辑 | - `React.memo` / `PureComponent` 避免重渲染<br>- `React.lazy` 和 `<Suspense>`<br>- 支持资源预取 |

### 总结

`vue-router` 和 `react-router` 虽然都为 SPA 提供了强大的路由功能，但它们的设计哲学和实现方式反映了各自框架的特点。

- **`vue-router`** 更倾向于**集中式配置**和**显式的导航控制**。它通过全局配置和丰富的导航守卫 API，为开发者提供了对导航流程精细控制的能力，这与 Vue “渐进式框架”和数据驱动的理念相契合。

- **`react-router`** 则遵循**组件化**和**声明式**的原则。它将路由本身视为组件，通过组合和嵌套组件来构建路由逻辑，这与 React “一切皆组件”的哲学一脉相承。其基于 Hooks 的 API 设计也更符合现代 React 的开发模式。

两者的选择通常取决于所在的生态系统和开发者的偏好。`vue-router` 的集成更为无缝和直接，而 `react-router` 提供了更高的灵活性和组合性。

## Section 2: Vue-Router Deep Dive & Implementation

### 2.1: Core Principles

# Vue-Router 核心模式深度剖析：Hash vs. History

作为一名资深前端工程师，我将带你深入 `vue-router` 的心脏，剖析其最核心的两种工作模式：`hash` 模式和 `history` 模式。理解它们的底层原理，不仅能让你在面试中脱颖而出，更能帮助你在日常开发中游刃有余地解决路由问题，甚至为手写一个简易路由器打下坚实基础。

---

## 一、Hash 模式 (`createWebHashHistory`)

`hash` 模式是最早也是最简单的单页应用（SPA）路由实现方式。它的 URL 看起来像这样：`https://example.com/#/user/profile`。URL 中 `#` 后面的部分（即 `#/user/profile`）就是所谓的“哈希”或“锚点”。

### 1. 核心浏览器 API

`hash` 模式的实现完全依赖于浏览器提供的两个基本特性：

- **`window.location.hash`**: 这是一个可读写的属性，用于获取或设置 URL 中的哈希部分。

  - **读取**: `console.log(window.location.hash)` 会输出 `#` 及其之后的所有字符。
  - **写入**: `window.location.hash = '/about'` 会立即改变浏览器地址栏的 URL，而**不会触发页面刷新**。这是 `hash` 模式能够实现无刷新跳转的根本原因。

- **`hashchange` 事件**: 这是一个全局 `window` 事件。当 URL 的哈希部分（`location.hash`）发生变化时，浏览器会触发此事件。
  - **监听**: `window.addEventListener('hashchange', callback)`。我们可以通过监听这个事件，来响应 URL 的变化。

### 2. 内部工作流程

`vue-router` 在 `hash` 模式下的工作流程可以概括为以下几个步骤：

#### (1) 初始化

当你通过 `createRouter({ history: createWebHashHistory(), ... })` 创建路由实例时，`vue-router` 内部会：

1.  **设置初始状态**: 读取当前 URL 的 `location.hash` 值作为初始路由地址。如果 `hash` 为空，则默认为 `/`。
2.  **注册监听器**: 调用 `window.addEventListener('hashchange', ...)`，将一个内部的回调函数绑定到 `hashchange` 事件上。这个回调函数是路由更新的核心驱动力。

#### (2) 导航触发（点击 `<router-link>`）

当用户点击一个 `<router-link to="/about">` 组件时：

1.  **拦截默认行为**: `<router-link>` 组件内部会监听点击事件，并调用 `event.preventDefault()` 来阻止 `<a>` 标签的默认页面跳转行为。
2.  **调用 `router.push()`**: 接着，它会调用 `router.push('/about')` 或 `router.replace('/about')`。
3.  **更新 Hash**: 在 `hash` 模式下，`router.push('/about')` 的核心操作就是**修改 `window.location.hash` 的值**：`window.location.hash = '/about'`。

#### (3) 变更监听与视图更新

1.  **触发 `hashchange`**: 上一步对 `location.hash` 的修改，会立即触发 `hashchange` 事件。
2.  **执行回调**: 初始化时注册的 `hashchange` 事件监听器被执行。
3.  **匹配与渲染**: 在回调函数中，`vue-router` 会：
    - 获取最新的 `hash` 值。
    - 根据这个新的 `hash` 值去路由表（`routes` 数组）中查找匹配的组件。
    - 找到匹配的组件后，更新内部的当前路由状态（一个响应式对象）。
    - 由于路由状态是响应式的，Vue 的渲染系统会侦测到变化，从而自动将新的组件渲染到 `<router-view>` 的位置。

#### 流程图

```mermaid
graph TD
    A[用户点击 <router-link to="/about">] --> B{调用 event.preventDefault()};
    B --> C{调用 router.push('/about')};
    C --> D[设置 window.location.hash = '/about'];
    D --> E{浏览器触发 hashchange 事件};
    E --> F[vue-router 的监听器被调用];
    F --> G{获取新 hash, 匹配路由规则};
    G --> H[更新内部响应式路由状态];
    H --> I[Vue 自动更新 <router-view>];
```

### 3. 优缺点

- **优点**:
  - 实现简单，兼容性好（兼容到 IE8）。
  - 无需服务器端额外配置。因为 `#` 之后的内容不会被发送到服务器，服务器始终认为请求的是根目录的 `index.html`。
- **缺点**:
  - URL 中带有 `#`，不够美观。
  - 对 SEO (搜索引擎优化) 不友好，因为搜索引擎可能会忽略 `#` 之后的内容。

---

## 二、History 模式 (`createWebHistory`)

`history` 模式利用了 HTML5 History API，使得 URL 看起来像传统的网站 URL，例如 `https://example.com/user/profile`。这是目前推荐的模式。

### 1. 核心浏览器 API

`history` 模式主要依赖以下 API：

- **`history.pushState(state, title, url)`**: 向浏览器历史记录栈中**添加**一个新的记录。这个方法会改变地址栏的 URL，但**同样不会触发页面刷新**。

  - `state`: 一个与新历史记录相关的状态对象，可以在 `popstate` 事件中获取。`vue-router` 内部用它来存储导航信息。
  - `title`: 标题，目前大部分浏览器会忽略此参数。
  - `url`: 新的 URL，必须与当前 URL 同源。

- **`history.replaceState(state, title, url)`**: **修改**当前的历史记录，而不是添加新的。同样不会刷新页面。

- **`popstate` 事件**: 当用户通过**浏览器行为**（如点击前进/后退按钮，或在 JS 中调用 `history.back()` / `history.forward()` / `history.go()`）导致活动历史记录条目发生变化时，会触发此事件。
  - **关键区别**: **直接调用 `history.pushState()` 或 `history.replaceState()` 不会触发 `popstate` 事件**。这是 `history` 模式实现比 `hash` 模式更复杂的核心原因。

### 2. 内部工作流程

#### (1) 初始化

当你通过 `createRouter({ history: createWebHistory(), ... })` 创建路由实例时：

1.  **设置初始状态**: 读取当前页面的 `location.pathname` 作为初始路由。
2.  **注册监听器**: 调用 `window.addEventListener('popstate', ...)`，监听浏览器的前进后退操作。

#### (2) 导航触发（点击 `<router-link>`）

当用户点击 `<router-link to="/about">` 时：

1.  **拦截默认行为**: 与 `hash` 模式相同，阻止 `<a>` 标签的默认跳转。
2.  **调用 `router.push()`**: 同样调用 `router.push('/about')`。
3.  **更新 URL 并手动触发更新**: 在 `history` 模式下，`router.push('/about')` 的核心操作是：
    a. 调用 `history.pushState(state, '', '/about')` 来改变 URL。
    b. 因为 `pushState` 不会触发 `popstate`，所以 `vue-router` 必须**手动执行**一次与 `popstate` 回调中相同的路由更新逻辑（匹配路由、更新状态、渲染视图）。

#### (3) 变更监听与视图更新（前进/后退）

1.  **触发 `popstate`**: 当用户点击浏览器的后退按钮时，浏览器会触发 `popstate` 事件。
2.  **执行回调**: 初始化时注册的 `popstate` 监听器被执行。
3.  **匹配与渲染**: 在回调函数中，`vue-router` 会执行与 `hashchange` 回调类似的逻辑：获取新 URL (`location.pathname`)，匹配组件，更新状态，触发 Vue 的重新渲染。

#### 流程图

```mermaid
graph TD
    subgraph "主动导航 (router.push)"
        A[用户点击 <router-link>] --> B{调用 router.push()};
        B --> C[调用 history.pushState()];
        C --> D[手动执行路由更新逻辑];
    end

    subgraph "浏览器导航 (前进/后退)"
        E[用户点击浏览器前进/后退] --> F{浏览器触发 popstate 事件};
        F --> G[vue-router 的监听器被调用];
    end

    D --> H{匹配路由 -> 更新状态 -> 渲染视图};
    G --> H;
```

### 3. 服务器配置

`history` 模式有一个重要的前提：**需要服务器端支持**。
当用户直接访问 `https://example.com/user/profile` (而不是从首页导航过去) 或在 `/user/profile` 页面刷新时，浏览器会向服务器请求这个地址。由于这是一个单页应用，服务器上并没有 `/user/profile` 这个文件或目录，会导致 404 错误。

**解决方案**: 配置服务器，对于所有未匹配到静态资源的请求，都返回应用的入口文件 `index.html`。这样，`vue-router` 就能接管路由，并正确显示页面。

**Nginx 示例配置**:

```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

### 4. 优缺点

- **优点**:
  - URL 美观，符合用户习惯。
  - 对 SEO 更友好。
- **缺点**:
  - 需要服务器端进行额外的重定向配置。
  - 兼容性不如 `hash` 模式（需要 HTML5 History API 支持，但现代浏览器已全部支持）。

---

## 总结对比

| 特性           | Hash 模式 (`createWebHashHistory`)     | History 模式 (`createWebHistory`)                     |
| :------------- | :------------------------------------- | :---------------------------------------------------- |
| **URL 外观**   | `example.com/#/user` (带 `#`)          | `example.com/user` (不带 `#`)                         |
| **核心 API**   | `location.hash`, `hashchange` 事件     | `history.pushState`, `popstate` 事件                  |
| **URL 变更**   | 修改 `location.hash`                   | 调用 `history.pushState`                              |
| **变更监听**   | `hashchange` 事件自动触发              | `popstate` 仅由浏览器行为触发，`pushState` 需手动处理 |
| **服务器配置** | **无需**额外配置                       | **必须**配置重定向到 `index.html`                     |
| **SEO**        | 不友好                                 | 友好                                                  |
| **推荐度**     | 适用于快速原型或无服务器配置权限的场景 | **推荐**，现代 Web 应用首选                           |

### 2.2: From-Scratch Implementation

```javascript
// 全局的 Vue 实例，将在 install 方法中被赋值
let _Vue;

class VueRouter {
  /**
   * 构造函数
   * @param {object} options - 路由配置
   * @param {string} options.mode - 路由模式 ('hash' or 'history')
   * @param {Array<object>} options.routes - 路由规则数组
   */
  constructor(options) {
    this.options = options;
    this.mode = this.options.mode || "hash";
    this.routeMap = this.createRouteMap(options.routes);

    // 使用 Vue.observable 创建一个响应式的对象来存储当前路由信息
    // 这样当 current 更新时，依赖它的组件（如 router-view）就会自动重新渲染
    this.current = _Vue.observable({
      path: "/",
    });

    this.init();
  }

  /**
   * 初始化路由器，根据模式设置事件监听
   */
  init() {
    if (this.mode === "hash") {
      // Hash 模式
      // 1. 确保初始 URL 有 #，如果没有则添加
      if (!window.location.hash) {
        window.location.hash = "#/";
      }
      // 2. 设置初始 current.path
      this.current.path = window.location.hash.slice(1);
      // 3. 监听 hashchange 事件
      window.addEventListener("hashchange", () => {
        this.current.path = window.location.hash.slice(1);
      });
    } else if (this.mode === "history") {
      // History 模式
      // 1. 设置初始 current.path
      this.current.path = window.location.pathname;
      // 2. 监听 popstate 事件 (处理浏览器前进/后退)
      window.addEventListener("popstate", () => {
        this.current.path = window.location.pathname;
      });
    }
  }

  /**
   * 将路由配置数组转换为更易于查找的映射表
   * @param {Array<object>} routes - 路由规则数组
   * @returns {object} - 路由映射表 { path: component }
   */
  createRouteMap(routes) {
    return routes.reduce((map, route) => {
      map[route.path] = route.component;
      return map;
    }, {});
  }

  /**
   * 编程式导航 push 方法
   * @param {string} path - 目标路径
   */
  push(path) {
    if (this.mode === "hash") {
      // 对于 hash 模式，直接修改 hash 值即可触发 hashchange 事件
      window.location.hash = "#" + path;
    } else if (this.mode === "history") {
      // 对于 history 模式，使用 pushState 修改 URL
      // 注意：pushState 不会触发 popstate 事件，所以需要手动更新 current.path
      window.history.pushState({}, "", path);
      this.current.path = path;
    }
  }
}

/**
 * Vue 插件的 install 方法
 * @param {object} Vue - Vue 构造函数
 */
VueRouter.install = function (Vue) {
  _Vue = Vue;

  // 1. 混入 beforeCreate 钩子，将 router 实例挂载到所有组件的 this.$router 上
  Vue.mixin({
    beforeCreate() {
      // 只有根组件在创建时会传入 router 实例
      // 我们将其挂载到 Vue 原型上，以便所有子组件都能通过 this.$router 访问
      if (this.$options.router) {
        Vue.prototype.$router = this.$options.router;
      }
    },
  });

  // 2. 注册 <router-link> 组件
  Vue.component("router-link", {
    props: {
      to: {
        type: String,
        required: true,
      },
    },
    render(h) {
      // <router-link to="/foo"> 会被渲染成 <a href="/foo"> (history模式) 或 <a href="#/foo"> (hash模式)
      // 我们需要拦截点击事件，阻止默认跳转，并调用 router.push()
      return h(
        "a",
        {
          attrs: {
            href: this.$router.mode === "history" ? this.to : "#" + this.to,
          },
          on: {
            click: (e) => {
              e.preventDefault(); // 阻止默认的页面刷新行为
              this.$router.push(this.to); // 使用 router 的 push 方法进行导航
            },
          },
        },
        this.$slots.default // 渲染子节点，即链接的文本
      );
    },
  });

  // 3. 注册 <router-view> 组件
  Vue.component("router-view", {
    render(h) {
      // this.$router.current 是一个响应式对象
      // 当它的 path 改变时，render 函数会重新执行
      const currentPath = this.$router.current.path;
      const component = this.$router.routeMap[currentPath];

      // 根据当前路径从路由表中找到对应的组件并渲染
      return h(component);
    },
  });
};

export default VueRouter;
```

### 2.3: Usage Guide

# Mini-Vue-Router 使用指南

这是一个关于如何使用 `mini-vue-router.js` 的简单指南。`mini-vue-router` 是一个为了教学目的而创建的 `vue-router` 简化版，旨在清晰地展示其核心工作原理。

---

## 核心概念

- **`VueRouter`**: 路由器的主类。
- **`router-link`**: 用于声明式导航的组件，会被渲染成 `<a>` 标签。
- **`router-view`**: 路由出口，用于渲染与当前 URL 匹配的组件。

---

## 快速上手

下面是一个完整的 HTML 文件示例，展示了如何在一个简单的 Vue 应用中集成并使用 `mini-vue-router`。

### 1. 文件结构

为了运行这个示例，你需要以下两个文件在同一个目录下：

```
.
├── index.html         # 你的主 HTML 文件
└── mini-vue-router.js # 我们编写的迷你路由器
```

### 2. 完整示例 (`index.html`)

你可以直接复制下面的代码到 `index.html` 文件中，然后用浏览器打开它。

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Mini Vue Router Demo</title>
    <!-- 引入 Vue.js -->
    <script src="https://cdn.jsdelivr.net/npm/vue@2.6.14/dist/vue.js"></script>
    <!-- 引入我们的迷你 Vue Router -->
    <script type="module" src="./main.js"></script>
  </head>
  <body>
    <div id="app">
      <h1>Hello, Mini Vue Router!</h1>
      <p>
        <!-- 使用 router-link 进行导航 -->
        <router-link to="/">Home</router-link> |
        <router-link to="/about">About</router-link>
      </p>

      <!-- 路由匹配的组件将在这里渲染 -->
      <router-view></router-view>
    </div>

    <script type="module">
      // 这是一个 hack，因为我们不能直接在 HTML 中 import ES Module
      // 所以我们创建一个 main.js 来组织代码
      import Vue from "https://cdn.jsdelivr.net/npm/vue@2.6.14/dist/vue.esm.browser.js";
      import VueRouter from "./mini-vue-router.js";

      // 1. 安装插件
      // 这会全局注册 router-link 和 router-view 组件，并混入一个 beforeCreate 钩子
      Vue.use(VueRouter);

      // 2. 定义路由组件
      const HomeComponent = { template: "<div>This is the Home Page</div>" };
      const AboutComponent = { template: "<div>This is the About Page</div>" };

      // 3. 定义路由规则
      const routes = [
        { path: "/", component: HomeComponent },
        { path: "/about", component: AboutComponent },
      ];

      // 4. 创建 router 实例
      // 你可以在这里切换 'hash' 或 'history' 模式
      const router = new VueRouter({
        mode: "hash", // or 'history'
        routes,
      });

      // 5. 创建和挂载 Vue 根实例
      new Vue({
        el: "#app",
        router, // 将 router 实例注入到 Vue 根实例中
      });
    </script>
  </body>
</html>
```

### 3. 如何运行

1.  将上面的代码保存为 `index.html`。
2.  确保 `mini-vue-router.js` 和 `index.html` 在同一个文件夹下。
3.  由于我们使用了 ES Modules (`type="module"`)，你不能直接通过 `file://` 协议在浏览器中打开它。你需要一个简单的本地服务器来运行它。
    - 如果你安装了 Node.js，可以在该目录下运行 `npx serve`。
    - 如果你使用 VS Code，可以安装 "Live Server" 插件并右键点击 `index.html` 选择 "Open with Live Server"。
4.  在浏览器中打开服务地址，你就可以看到一个可以工作的迷你单页应用了！点击 "Home" 和 "About" 链接，观察地址栏和页面内容的变化。

---

## 模式切换

要切换路由模式，只需在创建 `VueRouter` 实例时更改 `mode` 选项即可。

### Hash 模式 (默认)

URL 会像这样：`http://localhost:8080/#/about`

```javascript
const router = new VueRouter({
  mode: "hash",
  routes,
});
```

### History 模式

URL 会像这样：`http://localhost:8080/about`

```javascript
const router = new VueRouter({
  mode: "history",
  routes,
});
```

**重要提示**：当使用 `history` 模式时，你的服务器需要被正确配置。对于任何未匹配到静态文件的请求，都应该返回 `index.html`。否则，当用户直接访问 `http://localhost:8080/about` 或刷新该页面时，会得到一个 404 错误。上面提到的 `npx serve` 工具已经内置了这种重定向支持。

## Section 3: React-Router Deep Dive & Implementation

### 3.1: Core Principles

# React Router 深度实现原理剖析

本文旨在深入剖析 `react-router` 的核心实现原理，为理解其工作机制乃至手写一个简易版 `react-router` 提供坚实的理论基础。`react-router` 的设计精妙之处在于，它并非一个大而全的单体库，而是将复杂的路由功能分解为几个协同工作的核心原则。

---

## 1. 核心基石：`history` 库

`react-router` 本身不直接处理浏览器历史记录的底层操作（如 URL 的变更、前进、后退事件的监听）。相反，它将这项复杂且与环境紧密相关的工作完全委托给了一个专门的库：`history`。可以说，**`react-router` 是 `history` 库在 React 环境下的一个高级封装和应用**。

### 1.1 `history` 的角色：抽象差异

浏览器有两种主流的单页应用（SPA）路由模式：

- **HTML5 History 模式**：使用 `pushState`、`replaceState` 和 `popstate` 事件。URL 看起来很“正常”（如 `https://example.com/users/123`），但需要服务器端配置支持，以避免在用户直接访问子路径时出现 404。
- **Hash 模式**：使用 URL 的 hash 部分（`#`）和 `hashchange` 事件。URL 中带有 `#`（如 `https://example.com/index.html#/users/123`），兼容性好，无需服务器特殊配置。

`history` 库的核心价值在于，它通过提供 `createBrowserHistory` 和 `createHashHistory` 两个工厂函数，**为上层应用屏蔽了这两种模式的底层实现差异**。无论使用哪种模式，`react-router` 拿到的 `history` 对象都拥有一套完全一致的 API。

### 1.2 `history` 对象的核心 API

由 `history` 库创建的实例，通常包含以下关键属性和方法：

- **`location` (Object)**: 一个描述当前位置的对象，包含了 `pathname`、`search`、`hash`、`state` 等关键信息。这是路由匹配的**数据来源**。
- **`action` (String)**: 最近一次导航的动作类型。主要有三种：
  - `PUSH`: 通过 `history.push()` 导航，向历史记录栈中添加一个新条目。
  - `REPLACE`: 通过 `history.replace()` 导航，替换历史记录栈中的当前条目。
  - `POP`: 用户通过浏览器的“前进”或“后退”按钮触发的导航。
- **`listen(listener)` (Function)**: **这是 `history` 库的响应式核心**。它允许你注册一个监听器函数。每当 `location` 或 `action` 发生变化时，所有监听器都会被调用，并传入新的 `location` 和 `action`。`react-router` 正是利用此方法来感知 URL 变化并触发 React 组件树的更新。
- **`push(path, [state])` (Function)**: 以 `PUSH` 动作导航到新的 `path`。
- **`replace(path, [state])` (Function)**: 以 `REPLACE` 动作导航到新的 `path`。
- **`go(n)`、`goBack()`、`goForward()`**: 用于在历史记录中前后移动。

---

## 2. 声明式核心：组件与 Context

`react-router` 将路由的概念完美融入了 React 的组件化和声明式编程模型中。它没有一个集中的路由配置文件，而是通过组件的嵌套来定义路由结构。这一切的背后，都离不开 React Context API。

### 2.1 `React.createContext`：路由的“全局总线”

为了避免将 `history` 对象和当前的 `location` 信息通过 props 层层传递给深层嵌套的组件（即“prop drilling”），`react-router` 创建了一个全局的 `Context`。

```javascript
// 概念性代码
const RouterContext = React.createContext(null);
```

这个 `RouterContext` 就像一个全局的“消息总线”，任何包裹在 `RouterContext.Provider` 内的组件，都可以通过 `useContext` Hook 或 `Context.Consumer` 来访问共享的路由信息。

### 2.2 `<Router>` 组件：Context 的提供者 (Provider)

当你使用 `<BrowserRouter>` 或 `<HashRouter>` 时，它们的内部实际上都渲染了一个核心的 `<Router>` 组件。这个 `<Router>` 组件的职责是：

1.  **创建 `history` 实例**：在组件首次挂载时，根据是 `<BrowserRouter>` 还是 `<HashRouter>`，调用 `createBrowserHistory()` 或 `createHashHistory()` 创建一个 `history` 对象。
2.  **管理 `location` 状态**：在组件内部，使用 `React.useState` 来存储当前的 `location` 对象。
3.  **监听 `history` 变化**：在 `React.useEffect` 中，调用 `history.listen()` 注册一个监听器。当 `history` 通知 URL 变化时，这个监听器会**调用 `useState` 的 `setter` 函数来更新组件内部的 `location` 状态**。这正是触发 React 重新渲染的关键！
4.  **提供 `Context`**：将 `history` 实例和当前 `location` 状态作为 `value`，通过 `RouterContext.Provider` 提供给其所有子组件。

```javascript
// <Router> 组件的简化版实现概念
function Router({ children }) {
  const history = createBrowserHistory(); // 或 createHashHistory
  const [location, setLocation] = React.useState(history.location);

  React.useLayoutEffect(() => {
    // 监听 history 变化，并在变化时更新 state，从而触发 re-render
    const unlisten = history.listen(({ location }) => {
      setLocation(location);
    });
    // 组件卸载时取消监听
    return unlisten;
  }, [history]);

  const contextValue = { history, location };

  return (
    <RouterContext.Provider value={contextValue}>
      {children}
    </RouterContext.Provider>
  );
}
```

### 2.3 `<Route>` 组件：Context 的消费者 (Consumer)

`<Route>` 组件是路由规则的声明者。它的核心工作是：

1.  **消费 `Context`**：从 `RouterContext` 中获取当前的 `location` 对象。
2.  **路径匹配**：将自身的 `path` prop 与 `location.pathname` 进行匹配。如果匹配成功，则渲染其内容。
3.  **渲染内容**：根据匹配结果和传入的 `component`、`render` 或 `children` props 来决定渲染什么。

```javascript
// <Route> 组件的简化版实现概念
function Route({ path, children }) {
  const { location } = React.useContext(RouterContext);

  // 使用一些库（如 path-to-regexp）来匹配路径
  const match = matchPath(location.pathname, { path });

  if (!match) {
    return null; // 不匹配则不渲染任何东西
  }

  // 匹配成功，渲染子组件
  return children;
}
```

---

## 3. 现代化 API：Hooks

基于上述的 Context 机制，`react-router` v5+ 引入了一套简洁的 Hooks API，极大地简化了在函数组件中访问路由信息的方式。

### 3.1 `useHistory`, `useLocation`, `useParams` 的实现

这些 Hooks 本质上都是对 `React.useContext(RouterContext)` 的一层简单封装，使其更具语义化。

- **`useHistory()`**: `const { history } = useContext(RouterContext); return history;`
- **`useLocation()`**: `const { location } = useContext(RouterContext); return location;`
- **`useParams()`**: 这个稍微复杂一点，它会先从 Context 获取 `location`，然后像 `<Route>` 一样进行路径匹配，最后返回匹配到的动态参数（如 `/users/:id` 中的 `id`）。

### 3.2 路由变化如何触发组件重渲染？

现在我们可以完整地串联起整个流程：

1.  用户点击一个 `<Link>` 组件（其内部调用 `history.push()`），或者点击浏览器“后退”按钮。
2.  `history` 库捕获到这个动作，更新了内部的 `location`，然后**调用所有通过 `history.listen()` 注册的监听器**。
3.  顶层的 `<Router>` 组件中的监听器被触发。
4.  该监听器调用 `setLocation(newLocation)`，更新了 `<Router>` 组件的内部 state。
5.  **`<Router>` 组件因为 state 变化而重新渲染**。
6.  由于 `<Router>` 是 `RouterContext.Provider`，它会将新的 `location` 对象通过 `value` prop 传递下去。
7.  所有消费了此 `Context` 的子组件（如 `<Route>` 或使用了 `useLocation` Hook 的组件）都会接收到新的 `location` 值，并因此触发自身的重新渲染。
8.  `<Route>` 组件根据新的 `location` 重新进行路径匹配，决定是否渲染其内容。

**这个从 `history.listen` 到 `useState` 再到 `Context` 更新的链条，是 `react-router` 实现响应式路由的核心机制。**

### 3.2: From-Scratch Implementation

```jsx
/**
 * mini-react-router.js
 * A simplified, educational implementation of React Router.
 *
 * It relies on the 'history' library, which must be available.
 * In a real project: npm install history
 * In the usage guide, we'll use a CDN.
 */

// We assume React is available in the global scope.
const React = window.React;
const { useState, useContext, useLayoutEffect, createContext } = React;

// We assume the 'history' library's createBrowserHistory is available.
const { createBrowserHistory } = window.HistoryLibrary;

// --- 1. The Context: Our "Global Bus" for Routing Info ---
// This context will hold the history instance and the current location.
// Any component within the Router can subscribe to changes here.
const RouterContext = createContext(null);

/**
 * A simple path matching function.
 * Supports dynamic segments like /users/:id
 * @param {string} routePath - The path pattern from the <Route> component (e.g., "/users/:id").
 * @param {string} currentPathname - The current URL pathname from location (e.g., "/users/123").
 * @returns {object|null} - An object with matched params if successful, otherwise null.
 */
function matchPath(routePath, currentPathname) {
  const routeParts = routePath.split("/").filter((p) => p);
  const currentParts = currentPathname.split("/").filter((p) => p);

  if (routeParts.length !== currentParts.length && !routePath.endsWith("*")) {
    return null;
  }

  const params = {};

  for (let i = 0; i < routeParts.length; i++) {
    const routePart = routeParts[i];
    const currentPart = currentParts[i];

    if (routePart.startsWith(":")) {
      const paramName = routePart.slice(1);
      params[paramName] = currentPart;
    } else if (routePart === "*") {
      // Wildcard match, matches the rest of the path
      return { params };
    } else if (routePart !== currentPart) {
      return null;
    }
  }

  return { params };
}

// --- 2. Core Components ---

/**
 * The main Router component. In a real library, this would be <BrowserRouter>.
 * Its job is to:
 *   1. Create a history object.
 *   2. Listen for URL changes.
 *   3. Keep the current `location` in a state variable.
 *   4. Provide `history` and `location` to all descendants via Context.
 */
export function BrowserRouter({ children }) {
  // We use a ref to hold the history object because it's mutable and
  // shouldn't trigger re-renders on its own.
  const historyRef = React.useRef(createBrowserHistory());
  const history = historyRef.current;

  // The current location is stored in state. When it changes, React re-renders.
  // This is the core of the reactive routing mechanism.
  const [location, setLocation] = useState(history.location);

  // useLayoutEffect runs synchronously after all DOM mutations.
  // We use it here to ensure that we subscribe to history changes
  // before the browser has a chance to paint. This prevents visual tearing.
  useLayoutEffect(() => {
    // Listen for changes in the history stack (e.g., back/forward buttons).
    const unlisten = history.listen(({ location }) => {
      // When the URL changes, update our state.
      setLocation(location);
    });

    // Cleanup function: Unsubscribe when the component unmounts.
    return unlisten;
  }, [history]); // Dependency array ensures this effect runs only once.

  const contextValue = {
    history,
    location,
  };

  return (
    <RouterContext.Provider value={contextValue}>
      {children}
    </RouterContext.Provider>
  );
}

/**
 * The <Route> component.
 * It consumes the location from context and renders its children
 * only if its `path` prop matches the current URL.
 */
export function Route({ path, children }) {
  const { location } = useContext(RouterContext);

  // Use our simple matching function.
  const match = matchPath(path, location.pathname);

  // If the path doesn't match, render nothing.
  if (!match) {
    return null;
  }

  // If it matches, we need to provide the params to the children.
  // We create a new context for just the params.
  const ParamsContext = createContext(null);
  return (
    <RouterContext.Provider
      value={{ ...useContext(RouterContext), params: match.params }}
    >
      {children}
    </RouterContext.Provider>
  );
}

/**
 * The <Link> component.
 * Renders an `<a>` tag but overrides its default behavior.
 * On click, it uses `history.push` to navigate programmatically.
 */
export function Link({ to, children }) {
  const { history } = useContext(RouterContext);

  const handleClick = (event) => {
    // Prevent the browser's default behavior of a full page reload.
    event.preventDefault();
    // Use the history object to navigate.
    history.push(to);
  };

  return (
    <a href={to} onClick={handleClick}>
      {children}
    </a>
  );
}

// --- 3. Core Hooks ---

/**
 * A hook to get the `history` object.
 * It's just a convenient wrapper around `useContext`.
 */
export function useHistory() {
  const { history } = useContext(RouterContext);
  return history;
}

/**
 * A hook to get the current `location` object.
 * Components using this hook will re-render whenever the URL changes.
 */
export function useLocation() {
  const { location } = useContext(RouterContext);
  return location;
}

/**
 * A hook to get the matched URL parameters (e.g., from /users/:id).
 */
export function useParams() {
  const { params } = useContext(RouterContext);
  const route = useContext(RouterContext);
  const match = matchPath(route.path, route.location.pathname);
  return match ? match.params : {};
}
```

### 3.3: Usage Guide

# 如何使用 Mini React Router

这份指南将向你展示如何在一个简单的 HTML 文件中，使用我们刚刚创建的 `mini-react-router.js`。

## 最终目标

我们将创建一个拥有三个页面的简单单页应用 (SPA):

- 一个主页 (`/`)
- 一个关于页面 (`/about`)
- 一个可以接受动态参数的用户页面 (`/user/:name`)

## 步骤

### 1. 准备文件

1.  将下面的 HTML 代码完整地复制并保存为一个名为 `index.html` 的文件。
2.  确保你已经将我们之前创建的 `mini-react-router.js` 文件放在与 `index.html` **相同的目录**下。

### 2. `index.html` 的完整代码

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Mini React Router Demo</title>
    <style>
      body {
        font-family: sans-serif;
        padding: 20px;
      }
      nav {
        margin-bottom: 20px;
        border-bottom: 1px solid #ccc;
        padding-bottom: 10px;
      }
      nav a {
        margin-right: 15px;
        text-decoration: none;
        color: #007bff;
        font-size: 18px;
      }
      nav a:hover {
        text-decoration: underline;
      }
      .page {
        padding: 20px;
        border: 1px solid #eee;
        border-radius: 5px;
      }
      h1 {
        color: #333;
      }
    </style>
  </head>
  <body>
    <div id="root"></div>

    <!-- 1. 引入依赖：React, ReactDOM, 和 history 库 -->
    <script src="https://unpkg.com/react@17/umd/react.development.js"></script>
    <script src="https://unpkg.com/react-dom@17/umd/react-dom.development.js"></script>
    <!-- 注意：我们将 history 库挂载到 window.HistoryLibrary 以便在模块中访问 -->
    <script src="https://unpkg.com/history@5/umd/history.development.js"></script>

    <!-- 2. 引入我们自己的迷你路由库 -->
    <!-- 必须使用 type="module" 来支持 import/export 语法 -->
    <script type="module">
      // 将 React 和 history 库挂载到 window，以便在模块中访问
      window.React = React;
      window.HistoryLibrary = History;

      // 导入我们自己的迷你路由库
      import {
        BrowserRouter,
        Route,
        Link,
        useParams,
        useLocation,
      } from "./mini-react-router.js";

      // --- 页面组件 ---
      const HomePage = () => <h1>主页</h1>;
      const AboutPage = () => <h1>关于我们</h1>;

      // 这个组件将使用 useParams hook 来获取动态路由参数
      const UserProfilePage = () => {
        const params = useParams();
        const location = useLocation();

        console.log("Current Location:", location);

        return (
          <div>
            <h1>用户个人资料</h1>
            <p>
              当前用户是: <strong>{params.name}</strong>
            </p>
          </div>
        );
      };

      // --- App 根组件 ---
      const App = () => {
        return (
          // 3. 使用 BrowserRouter 包裹整个应用
          <BrowserRouter>
            <nav>
              {/* 4. 使用 Link 组件创建导航链接 */}
              <Link to="/">主页</Link>
              <Link to="/about">关于</Link>
              <Link to="/user/Aime">Aime 的主页</Link>
              <Link to="/user/chenshuangbin">陈双彬的主页</Link>
            </nav>

            <div className="page">
              {/* 5. 使用 Route 组件定义路由规则 */}
              <Route path="/">
                <HomePage />
              </Route>
              <Route path="/about">
                <AboutPage />
              </Route>
              <Route path="/user/:name">
                <UserProfilePage />
              </Route>
            </div>
          </BrowserRouter>
        );
      };

      // --- 渲染应用 ---
      ReactDOM.render(<App />, document.getElementById("root"));
    </script>
  </body>
</html>
```

### 3. 如何运行

1.  在你的电脑上创建一个文件夹。
2.  将 `index.html` 和 `mini-react-router.js` 放在这个文件夹里。
3.  由于我们使用了 ES Modules (`import`/`export`)，你不能直接通过双击 `index.html` 文件在浏览器中打开它（这会因为 `file://` 协议的限制导致 CORS 错误）。
4.  你需要在该文件夹中启动一个本地的 HTTP 服务器。最简单的方式是：
    - 如果你安装了 Node.js，可以在文件夹的根目录打开终端，然后运行 `npx serve`。
    - 如果你安装了 Python 3, 运行 `python -m http.server`。
5.  打开浏览器，访问服务器提供的地址（通常是 `http://localhost:8000` 或 `http://localhost:3000`）。

现在，你应该能看到一个可以正常工作的单页应用了！点击不同的链接，注意观察浏览器地址栏的变化，页面内容会随之更新，但整个页面并不会刷新。

## Section 4: Final Hands-On Comparison

通过从零开始实现 `mini-vue-router.js` 和 `mini-react-router.js`，我们得以超越文档和 API 的表层，直接洞察这两个库最核心的设计思想差异。这次实践性的对比，将揭示它们的实现哲学是如何根植于其宿主框架的基因之中的。

---

### The Vue-Router Way: The Centralized Instance

`mini-vue-router.js` 的实现清晰地展示了一个**中心化、插件式**的架构。

#### 1. 框架集成: `Vue.use()` 与原型注入

Vue-Router 通过标准的 Vue 插件机制 (`install` 方法) 与框架集成。这是它与 Vue 生态无缝融合的第一步。

```javascript
// mini-vue-router.js
VueRouter.install = function (Vue) {
  _Vue = Vue;

  // 使用 mixin 在所有组件的 beforeCreate 生命周期中注入 $router
  Vue.mixin({
    beforeCreate() {
      if (this.$options.router) {
        // 将根实例的 router 挂载到 Vue 原型上
        Vue.prototype.$router = this.$options.router;
      }
    },
  });
  // ...
};
```

这种方式将 `router` 实例变成了一个所有组件都可以通过 `this.$router` 访问的**单例**。整个应用的路由逻辑由这一个中心实例来驱动和管理。

#### 2. 状态管理: Vue 的响应式核心

路由的核心状态（即当前路径 `current.path`）被巧妙地包装成一个 Vue 的**响应式对象**。

```javascript
// mini-vue-router.js
constructor(options) {
  // ...
  // 使用 Vue.observable 创建一个响应式的对象
  this.current = _Vue.observable({
    path: '/'
  });
  // ...
}
```

这是 `vue-router` 响应式更新的关键。当 `this.current.path` 改变时，所有依赖它的组件（主要是 `<router-view>`）都会被 Vue 的响应式系统自动通知并重新渲染。它完美地利用了 Vue 框架自身的能力，而非另起炉灶。

#### 3. API 设计: 全局组件

API 以全局组件的形式提供给开发者，这符合 Vue 组件化的开发习惯。

- **`<router-view>`**: 它是一个简单的组件，其 `render` 函数直接依赖于中心实例的响应式状态 `this.$router.current.path`。

  ```javascript
  // mini-vue-router.js
  Vue.component("router-view", {
    render(h) {
      const currentPath = this.$router.current.path;
      const component = this.$router.routeMap[currentPath];
      return h(component);
    },
  });
  ```

- **`<router-link>`**: 它拦截了 `<a>` 标签的默认行为，转而调用中心实例的 `this.$router.push()` 方法来触发导航。

---

### The React-Router Way: The Component Tree

与 Vue-Router 的中心化不同，`mini-react-router.js` 的实现完美诠释了 React 的**去中心化、声明式、万物皆组件**的哲学。

#### 1. 框架集成: 组件包裹与 Context

React-Router 不依赖任何插件系统，而是通过组件包裹的方式集成。`<BrowserRouter>` 组件作为应用的顶层容器，创建了路由的上下文环境。

```jsx
// mini-react-router.js
export function BrowserRouter({ children }) {
  // ...
  // 通过 Provider 将 history 和 location 传递给所有后代组件
  return (
    <RouterContext.Provider value={contextValue}>
      {children}
    </RouterContext.Provider>
  );
}
```

路由信息不是通过一个全局实例来访问，而是通过 React 的 Context API 在组件树中自上而下地流动。

#### 2. 状态管理: `useState` 与 `history.listen`

路由状态 `location` 被存储在顶层 `<BrowserRouter>` 组件的 `state` 中。URL 的变化通过 `history` 库的 `listen` 方法来监听，并在回调中调用 `setLocation` 来更新 state，从而触发整个组件树的重新渲染。

```jsx
// mini-react-router.js
export function BrowserRouter({ children }) {
  const history = React.useRef(createBrowserHistory()).current;
  const [location, setLocation] = useState(history.location);

  useLayoutEffect(() => {
    // 监听 history 变化，并在回调中更新 state
    const unlisten = history.listen(({ location }) => {
      setLocation(location);
    });
    return unlisten;
  }, [history]);
  // ...
}
```

这是一种纯粹的 React 模式：**外部事件 (URL 变化) -> 更新 State -> 单向数据流 -> UI 更新**。

#### 3. API 设计: 可组合的组件与 Hooks

API 完全是 React-native 的：可组合的组件和 Hooks。

- **`<Route>`**: 它不是一个简单的占位符，而是一个真正的组件。它通过 `useContext` 消费来自 `<BrowserRouter>` 的 `location` 信息，并根据路径匹配结果来决定是否渲染自己的 `children`。

  ```jsx
  // mini-react-router.js
  export function Route({ path, children }) {
    const { location } = useContext(RouterContext);
    const match = matchPath(path, location.pathname);

    if (!match) return null;
    return children;
  }
  ```

- **Hooks (`useLocation`, `useParams`)**: 它们是访问路由信息的首选方式，本质上是对 `useContext` 的一层封装，使得任何函数组件都能方便地“订阅”路由状态的变化。

---

### Side-by-Side Implementation Comparison

| 特性           | The Vue-Router Way (`mini-vue-router.js`)                             | The React-Router Way (`mini-react-router.js`)                      |
| :------------- | :-------------------------------------------------------------------- | :----------------------------------------------------------------- |
| **核心架构**   | **中心化实例 (Centralized Instance)**                                 | **声明式组件树 (Declarative Component Tree)**                      |
| **框架集成**   | `Vue.use()` 插件安装, `this.$router` 原型注入                         | 组件包裹 (`<BrowserRouter>`), React Context                        |
| **状态来源**   | 单一的、全局的 `router` 实例                                          | 从顶层 Provider 流经组件树的 `context`                             |
| **响应式机制** | 依赖 **Vue 的响应式系统** (`Vue.observable`)                          | 依赖 **React 的 State 和 Context** (`useState`, `useContext`)      |
| **路由出口**   | `<router-view>` (一个根据全局状态渲染的组件)                          | `<Route>` (一个根据 context 决定是否渲染子节点的组件)              |
| **导航触发**   | `this.$router.push()` (调用中心实例的方法)                            | `history.push()` (通过 context 获取 history 对象并调用其方法)      |
| **哲学体现**   | **插件化、渐进式**。将路由作为一项可插拔的服务，与 Vue 核心紧密集成。 | **组件化、组合式**。将路由视为 UI 的一部分，通过组件的组合来表达。 |

### Conclusion

通过手写这两个迷你路由，我们得出一个深刻的结论：**路由库的设计并非凭空而来，而是其宿主框架设计哲学的直接延伸**。

- **Vue-Router** 的实现体现了 Vue 的务实与整合。它利用 Vue 强大的响应式系统和插件机制，为开发者提供了一个功能内聚、使用直观的中心化路由解决方案。
- **React-Router** 的实现则体现了 React 的纯粹与函数式。它坚持“UI 是状态的函数”这一核心理念，将路由的方方面面都解构为可组合的组件和 Hooks，将路由状态的管理完全融入 React 的单向数据流模型中。

理解了这些基于代码的根本差异，我们才能真正理解为何它们在使用体验和心智模型上如此不同，从而在技术选型和日常开发中做出更明智的决策。
