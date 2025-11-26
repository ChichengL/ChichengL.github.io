## 一面问题

1. 拷问实习，广告的变现是如何做到的
2. 问 prefetch 和 preload 的区别
   1. prefetch 优先级更高，会立即加载，preload 是空闲时候加载
3. esm 和 commonjs 的区别
4. 优化库——tree-shaking 的条件是啥
   1. esm
   2. **package.json 的 sideEffects 标记**
   3. 构建工具支持
5. position 的取值作用和区别
   1. static 正常文档流
   2. relative，定位基准是自身的原始位置
   3. absolute，定位基准：最近的定位祖先元素`非 static` 脱离文档流
   4. fixed：根据视口定位，脱离文档流
   5. sticky: 开始表现为 relative 达到阈值之后表现为 fixed
6. http 状态码
   1. 100 200 300 400 500 （301 和 302 说反了）
      1. 301 是永久重定向，302 是临时重定向
      2. 304 协商缓存
      3. 101 http->websocket
      4. 200 资源正常返回包含强缓存
7. 协商缓存的过程
   1. if-modified-since 做对比，强缓存的话是 max-age
8. 回流和重绘，之间还有什么流程（图层合并）
   1. 浏览器渲染流程
      1. html 解析为 dom 树，css 解析为 cssom，构建出 dom & cssom 树
      2. 根据 dom 和 cssom 构建出来渲染树
      3. 布局：渲染树构建完成之后，元素位置和应用样式确定了，需要计算出所有元素的大小和绝对位置
      4. 绘制：将布局结果转化为屏幕上的像素点，多个图层分层绘制
      5. 合成：将不同图层合并为最终图像，这个可以使用 GPU 加速处理，跳过布局和绘制阶段
   2. 回流(reflow):计算元素的几何属性（位置、尺寸），重新构建页面布局。
      1. 改变元素的几何信息：width，height，top，position 等
      2. 内容变化（也会引起布局变化）
   3. 重绘(repaint):更新元素的可见样式（颜色、背景等），不改变布局。
      1. 颜色，背景，阴影，轮廓变化，不改变布局的情况下
   4. 合成：GPU 直接处理图层的变换，跳过布局和绘制阶段。
      1. gpu 加速属性:transform
      2. 透明度
      3. 滤镜 filter
      4. 图层提升：will-change:transform 或者 transform:translateZ(0)强制提升到合成层
9. 宽度不定如何实现居中
   1. 定位布局，relative 和 absolute，然后 top,left:50%,translate:()
   2. 父元素 display:flex;align-items:center;justify-content:center;
   3. 父元素:display:grid;place-items:center;(单个元素) 如果对于多个元素，需要`grid-template-columns:repeat(auto-fit,1fr);justify-content:center;`
10. 实现过虚拟列表吗，虚拟列表解决了什么问题
    1. 解决的问题：
       1. **性能瓶颈**：传统长列表一次性渲染所有元素会导致 DOM 节点过多，内存占用高，页面卡顿。
       2. **用户体验**：滚动卡顿、白屏等问题，尤其在低端设备或大数据量场景下。
       3. **资源浪费**：不可见区域的元素无需渲染，避免无意义的计算和内存消耗。
11. css 盒子模型
    1. **标准模型**：`box-sizing: content-box`（宽高=内容）
    2. **IE 模型**：`box-sizing: border-box`（宽高=内容+内边距+边框）
12. 浏览器有哪些进程
    1. 主进程、渲染进程、GPU 进程、插件进程、网络进程
       渲染进程会执行页面内的 js 代码
       主进程可以执行一些与浏览器自身功能相关的 JavaScript 脚本，比如 autofill
13. 渲染进程会做什么事情
    1. HTML/CSS 解析 → DOM 树/CSSOM 树 → 渲染树 → 布局 → 绘制 → 合成
    2. 执行页面内的 js 代码，因此造成无限循环的话会导致页面卡死
14. 用过那些 ts 内置类型，有什么作用
    1. `Partial<T>`所有的参数变为可选
    2. `Required<T>`:把所有参数变为必选
    3. `Omit<T,K>`排除参数 K
    4. `Pick<T,K>`:挑选 T 中的参数 K
    5. `Record<K,V>`:定义键的类型为 K，值为 V 的对象
    6. `Exclude<T,K>`:从类型`T`中排除可以赋值给类型`K`的类型。 这个和 Omit 的区别是，Omit 主要针对对象，排除对象中的某些属性，而 Exclude 是针对联合类型
    7. `Readonly<T>`:把所有参数变为只读
    8. **`Extract<T, U>`**：从类型`T`中提取可以赋值给类型`U`的类型。
    9. **`NonNullable<T>`**：从类型`T`中排除`null`和`undefined`。
    10. **`Parameters<T>`**：获取函数类型`T`的参数类型组成的元组类型。
    11. **`ReturnType<T>`**：获取函数类型`T`的返回值类型。
    12. **`InstanceType<T>`**：获取构造函数类型`T`的实例类型
    13. **`Awaited<T>`**：递归展开  `Promise`  的返回值类型（类似  `await`  的行为）
    14. 浏览器创建一个 tab 有什么进程
        1. 默认每个 Tab 一个独立渲染进程（同站点可能共享）
        2. 如果是第一次打开浏览器，会出现主进程，渲染进程，GPU 进程，插件进程，网络进程
    15. js 有哪些基本数据类型
        1. null,undefined,string,number,boolean,bigint,symbol
    16. absolute 父元素条件
        1. 最近的非 static 元素
    17. map 和 obj 的区别
        1. map 的 key 和 obj 的 key
           1. map 的 key 可以为任意东西，obj 的 key 只能为 string 或者 symbol
        2. weakmap 的 key，以及和 map 的区别
           1. weakmap 的 Key 必须是对象，不会阻止垃圾回收
    18. 如何进行多人协作
    19. git merge 有偏向吗
        1. `git merge`  本身并没有所谓的 “偏向”。不过，当合并操作碰到冲突时，处理冲突的过程可能会受到开发者的主观影响。
    20. git merge 和 git rebase 的区别
        1. git merge 会创建一个新的的合并提交，这个提交包含两个分支的修改记录，提交历史会出现分叉的情况。适合保留完整的分支历史，让团队成员清晰地看到每个分支的发展过程。常用于将多个开发者的工作合并到主分支。
        2. git rebae 会把一个分支的修改应用到另一个分支的末尾。适合保持提交历史的线性和简洁，让提交历史更加直观。常用于个人开发过程中，将自己的工作同步到最新的主分支上。
    21. react 有哪些常用的 hooks 1. useState,useContext,useEffect,useLayoutEffect,useMemo,useCallback,useReducer,useRef,forWardRef,useImperativeHandle 2. useLayoutEffect 是在浏览器绘制完成之前,DOM 更新之后执行，useEffect 会在浏览器绘制完成之后执行。
        他们俩返回的函数是清除副作用的函数，也就是会在每次 dispatch 改变之后执行

```jsx
import React, { useRef, forwardRef, useImperativeHandle } from "react";

// 最底层组件
const BottomComponent = forwardRef((props, ref) => {
  const bottomRef = useRef(null);

  // 自定义暴露给父组件的实例值
  useImperativeHandle(ref, () => ({
    getBottomNode: () => bottomRef.current,
  }));

  return <div ref={bottomRef}>这是最底层节点</div>;
});

// 中间层组件
const MiddleComponent = forwardRef((props, ref) => {
  const middleRef = useRef(null);

  // 自定义暴露给父组件的实例值
  useImperativeHandle(ref, () => ({
    getBottomNode: () => middleRef.current.getBottomNode(),
  }));

  return (
    <div>
      这是中间层节点
      <BottomComponent ref={middleRef} />
    </div>
  );
});

// 顶层组件
const TopComponent = () => {
  const topRef = useRef(null);

  const handleClick = () => {
    // 获取最底层节点
    const bottomNode = topRef.current.getBottomNode();
    if (bottomNode) {
      bottomNode.style.color = "red";
    }
  };

  return (
    <div>
      <button onClick={handleClick}>获取最底层节点并修改样式</button>
      <MiddleComponent ref={topRef} />
    </div>
  );
};

export default TopComponent;
```



23. useState 是同步还是异步
    1.  大部分情况下是异步的，少部分情况下是同步的，同步的情况下包括,flushSync 和 setTimeout 造成的撕裂——在 setTimeout 的回调函数中，setState 是同步的
24. react 执行顺序 1. layoutEffect 和 effect 的区别 2. 为什么不能在 if-else 中调用 hook 1. 不要在循环、条件语句或者嵌套函数中调用 Hook，只能在 React 函数组件的顶层或者自定义 Hook 里调用 Hook。 2. React 依靠调用顺序来追踪 Hooks hooks 在 react 中是放在 fiber 的属性上面以链表的形式存在的，如果放在循环或者分支里面可能会导致 hook 的调用顺序出问题 3. hook 的结构是什么样子的。

```js
function App() {
  console.log("App");
  const [state, setState] = useState(0);
  useEffect(() => {
    setState((state) => state + 1);
    setState((state) => state + 2);
  }, []);

  useEffect(() => {
    console.log("useEffect 1");
    return () => {
      console.log("useEffect 1 cleanup");
    };
  }, [state]);

  useEffect(() => {
    console.log("useEffect 2");
    return () => {
      console.log("useEffect 2 cleanup");
    };
  }, [state]);

  useLayoutEffect(() => {
    console.log("useLayoutEffect");
    return () => {
      console.log("useLayoutEffect cleanup");
    };
  }, [state]);

  return <Sub state={state} />;
}

function Sub({ state }) {
  console.log("Sub");

  useEffect(() => {
    console.log("sub useEffect");
    return () => {
      console.log("sub useEffect cleanup");
    };
  }, [state]);

  return null;
}

<App />;
```

21. 算法题：实现一个 TS`Await<T>`或者 最近公共祖先

```ts
type MyAwait<T> = T extends Promise<infer U> ? MyAwait<U> : T;

/** 在二叉树中查找两个节点最近公共祖先 */
function lowestCommonAncestor(
  root: TreeNode | null,
  p: TreeNode | null,
  q: TreeNode | null
): TreeNode | null {
  // 1.当前节点和左儿子，当前节点和右儿子， 不在当前节点，但是存在左儿子和右儿子
  let parent = null;
  const dfs = (node) => {
    if (!node) return false;
    const left = dfs(node.left);
    const right = dfs(node.right);

    if ((left && right) || ((left || right) && (node === p || node === q))) {
      parent = node;
    }

    return left || right || node === p || node === q;
  };
  dfs(root);
  return parent;
}
/**
    a.left->b b.left->c         eg: p->b  q->c

*/
interface TreeNode {
  val: number;
  left: TreeNode | null;
  right: TreeNode | null;
}

class TreeNode {}
```

## 二面问题

1. 自我介绍
2. 为什么来成都发展
3. 最近做的比较有挑战的事情
4. . 前端基建相关的事情 - 埋点规范
   1. 个人独立完成整个任务流程
5. . 埋点，双端上报，T/saladar 是不是一样的东西
6. . 埋点规范具体是做什么？
7. 防控新增不规范字段
8. . 机器人解放人力
9. 埋点时候用过 saladar 吗
10. 性能数据是怎么看的
11. FCP、LCP 区别
12. FMP
13. 业务主要是做什么的
14. 业务对前端技术的增长点
15. 无限滚动优化
16. 做了虚拟列表吗？
17. 基建相关升级
18. . edenx
19. 回成都有什么期待吗？
20. 介绍大概情况
21. . 飞书在成都有四五十个人，杭州上海北京都有
22. . Meego
23. . 主要面向传统企业会用到的工具
24. . Canvas
25. . 低代码、零代码平台看板
26. 问多久下班 9:00 - 9.30
27. 问 Canvas 相关文档
