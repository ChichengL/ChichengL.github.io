# 问题

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

2. 实现一个工具类型 DeepReadonly，能将对象及其所有嵌套属性变为只读。
3. 如果写一个非嵌套的 Readonly 类型，将对象里面所有字段都变成只读，该如何实现?
4. TypeScript 声明接口如何保证类型的安全?请结合一个请求 API 的场景进行说明。
5. 使用 Lodash 根据 id 字段去除数组中重复的对象，实现一个函数。
6. 实现一个 parseQuery 函数，输入一个 query 字符串(例如:?name=Alice&age=20&city=Beijing)，返回一个对象{name: 'Alice', age: '20', city:'Beijing’}。如果 query 参数中出现重复的 key，value 变成数组。
7. React 18 有个新特性叫做 ConcurrentFeatures，有了解吗?
8. 如果在 React 的主线程中使用了 useEffect 更新之后，紧接着去访问这个 state，但拿到的值还是旧值，你怎么去解决这个问题?
9. 你使用过 React Query 吗?
10. 如果说你要从服务端拉取分页列表，你会怎么设计 React Query 的 querykey
11. 如果你是 React Query 的开发者或设计者，你怎么去理解 queryKey 的这种 API 的设计?为什么要设计这个 API?
12. 假设有一个渲染大量数据的列表，每一项都支持复杂的拖拽排序和编辑，你怎么去优化
13. 你刚刚提到触发重排这件事情，有哪些 CSS 属性会引起重排?
14. 如果在一个多人协作的项目当中，每个人的 ESLint 和 Prettier 习惯不太一样，怎么办
15. 怎么解决 ESLint 的规则和 Prettier 的规则的桥接工作的?

## 腾讯广告 cdg

1. es6 有哪些新特性
2. promise, await, async 的使用与区别
3. promise 有哪些 api
4. promise 的底层原理
5. 为什么要使用 redux，有没有其他的方案
6. react 虚拟 dom 作用
7. JS 的执行原理和过程
8. 任务队列如何处理异步请求
9. 事件循环机制是什么
10. 遇到过的网络问题，跨域及解决方案，JSONP 的原理
11. 介绍一下 tcp 三次握手
12. 介绍一下 tcp 四次握手
13. TCP 四次挥手，可以变成三次吗？
14. tcp 和 udp 的区别
15. tcp 如何保证可靠性
16. 算法题： 1. 移除出现次数最少的字符 2. 合法的括号

## 腾讯 wxg3 面

1. 开局 3 个算法，30mins
   1. 循环递增的数组找最小值，时间最优
   2. 二叉树的深度
   3. 合并有序链表
2. 自我介绍
3. 开始拷打
4. 进程中的内存是怎么分布的
5. 进程和线程的区别
6. 进程间的通信手段
7. 二进制如何上传给服务端
8. String() 和 toString() 底层是如何实现的
9. 如何实现客户端与服务端的长连接
10. URL 有长度限制吗
11. 如何优化网页加载
12. 讲讲 base64
13. gbk 和 utf-8 的区别
