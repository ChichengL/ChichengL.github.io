
## 一面问题
1. 拷问实习，广告的变现是如何做到的
2. 问prefetch和preload的区别
	1. prefetch优先级更高，会立即加载，preload是空闲时候加载
3. esm和commonjs的区别
4. 优化库——tree-shaking的条件是啥
	1. esm
	2. **package.json的sideEffects标记**
	3. 构建工具支持
5. position的取值作用和区别
	1. static正常文档流
	2. relative，定位基准是自身的原始位置
	3. absolute，定位基准：最近的定位祖先元素（非static) 脱离文档流
	4. fixed：根据视口定位，脱离文档流
	5. sticky: 开始表现为relative达到阈值之后表现为fixed
6. http状态码
	1. 100 200 300 400 500 （301和302说反了）
		1. 301是永久重定向，302是临时重定向
		2. 304协商缓存
		3. 101  http->websocket
		4. 200资源正常返回包含强缓存
7. 协商缓存的过程
	1. if-modified-since做对比，强缓存的话是max-age
8. 回流和重绘，之间还有什么流程（图层合并）
	1. 浏览器渲染流程
		1. html解析为dom树，css解析为cssom，构建出dom & cssom树
		2. 根据dom和cssom构建出来渲染树
		3. 布局：渲染树构建完成之后，元素位置和应用样式确定了，需要计算出所有元素的大小和绝对位置
		4. 绘制：将布局结果转化为屏幕上的像素点，多个图层分层绘制
		5. 合成：将不同图层合并为最终图像，这个可以使用GPU加速处理，跳过布局和绘制阶段
	2. 回流(reflow):计算元素的几何属性（位置、尺寸），重新构建页面布局。
		1. 改变元素的几何信息：width，height，top，position等
		2. 内容变化（也会引起布局变化）
	3. 重绘(repaint):更新元素的可见样式（颜色、背景等），不改变布局。
		1. 颜色，背景，阴影，轮廓变化，不改变布局的情况下
	4. 合成：GPU 直接处理图层的变换，跳过布局和绘制阶段。
		1. gpu加速属性:transform
		2. 透明度
		3. 滤镜filter
		4. 图层提升：will-change:transform或者transform:translateZ(0)强制提升到合成层
9. 宽度不定如何实现居中
	1. 定位布局，relative和absolute，然后top,left:50%,translate:()
	2. 父元素display:flex;align-items:center;justify-content:center;
	3. 父元素:display:grid;place-items:center;(单个元素) 如果对于多个元素，需要`grid-template-columns:repeat(auto-fit,1fr);justify-content:center;`
10. 实现过虚拟列表吗，虚拟列表解决了什么问题
	1. 解决的问题：
		1.  **性能瓶颈**：传统长列表一次性渲染所有元素会导致 DOM 节点过多，内存占用高，页面卡顿。
		2. **用户体验**：滚动卡顿、白屏等问题，尤其在低端设备或大数据量场景下。
		3. **资源浪费**：不可见区域的元素无需渲染，避免无意义的计算和内存消耗。
11. css盒子模型
	1.  **标准模型**：`box-sizing: content-box`（宽高=内容）
	2. **IE模型**：`box-sizing: border-box`（宽高=内容+内边距+边框）
12. 浏览器有哪些进程
	1. 主进程、渲染进程、GPU进程、插件进程、网络进程
	   渲染进程会执行页面内的js代码
	   主进程可以执行一些与浏览器自身功能相关的 JavaScript 脚本，比如autofill
13. 渲染进程会做什么事情
	1.  HTML/CSS解析 → DOM树/CSSOM树 → 渲染树 → 布局 → 绘制 → 合成
	2. 执行页面内的js代码，因此造成无限循环的话会导致页面卡死
14. 用过那些ts内置类型，有什么作用
	1. `Partial<T>`所有的参数变为可选
	2. `Required<T>`:把所有参数变为必选
	3. `Omit<T,K>`排除参数K
	4. `Pick<T,K>`:挑选T中的参数K
	5. `Record<K,V>`:定义键的类型为K，值为V的对象
	6. `Exclude<T,K>`:从类型`T`中排除可以赋值给类型`K`的类型。 这个和Omit的区别是，Omit主要针对对象，排除对象中的某些属性，而Exclude是针对联合类型
	7. `Readonly<T>`:把所有参数变为只读
	8. **`Extract<T, U>`**：从类型`T`中提取可以赋值给类型`U`的类型。
	9. **`NonNullable<T>`**：从类型`T`中排除`null`和`undefined`。
	10. **`Parameters<T>`**：获取函数类型`T`的参数类型组成的元组类型。
	11. **`ReturnType<T>`**：获取函数类型`T`的返回值类型。
	12. **`InstanceType<T>`**：获取构造函数类型`T`的实例类型
	13. **`Awaited<T>`**：递归展开 `Promise` 的返回值类型（类似 `await` 的行为）
	   ```ts
// 1. MyPartial: 把所有参数变为可选
type MyPartial<T> = {
    [P in keyof T]?: T[P];
};

// 2. MyRequired: 把所有参数变为必选
type MyRequired<T> = {
    [P in keyof T]-?: T[P];
};

// 3. MyOmit: 排除参数 K
type MyOmit<T, K extends keyof any> = Pick<T, Exclude<keyof T, K>>;

// 4. MyPick: 挑选 T 中的参数 K
type MyPick<T, K extends keyof T> = {
    [P in K]: T[P];
};

// 5. MyRecord: 定义键的类型为 K，值为 V 的对象
type MyRecord<K extends keyof any, V> = {
    [P in K]: V;
};

// 6. MyExclude: 从类型 T 中排除可以赋值给类型 K 的类型
type MyExclude<T, K> = T extends K ? never : T;

// 7. MyReadonly: 把所有参数变为只读
type MyReadonly<T> = {
    readonly [P in keyof T]: T[P];
};

// 8. MyExtract: 从类型 T 中提取可以赋值给类型 U 的类型
type MyExtract<T, U> = T extends U ? T : never;

// 9. MyNonNullable: 从类型 T 中排除 null 和 undefined
type MyNonNullable<T> = T extends null | undefined ? never : T;

// 10. MyParameters: 获取函数类型 T 的参数类型组成的元组类型
type MyParameters<T extends (...args: any[]) => any> = T extends (...args: infer P) => any ? P : never;

// 11. MyReturnType: 获取函数类型 T 的返回值类型
type MyReturnType<T extends (...args: any[]) => any> = T extends (...args: any[]) => infer R ? R : never;

// 12. MyInstanceType: 获取构造函数类型 T 的实例类型
type MyInstanceType<T extends new (...args: any[]) => any> = T extends new (...args: any[]) => infer R ? R : never;

// 13. MyAwaited: 递归展开 Promise 的返回值类型（类似 await 的行为）
type MyAwaited<T> = T extends Promise<infer U> ? MyAwaited<U> : T;

		```
15. 浏览器创建一个tab有什么进程
	1.  默认每个Tab一个独立渲染进程（同站点可能共享）
	2. 如果是第一次打开浏览器，会出现主进程，渲染进程，GPU进程，插件进程，网络进程
16. js有哪些基本数据类型
	1. null,undefined,string,number,boolean,bigint,symbol
17. absolute父元素条件
	1. 最近的非static元素
18. map和obj的区别
	1. map的key和obj的key
		1. map的key可以为任意东西，obj的key只能为string或者symbol
	2. weakmap的key，以及和map的区别
		1. weakmap的 Key必须是对象，不会阻止垃圾回收
19. 如何进行多人协作
20. git merge有偏向吗
	1. `git merge` 本身并没有所谓的 “偏向”。不过，当合并操作碰到冲突时，处理冲突的过程可能会受到开发者的主观影响。
21. git merge和git rebase 的区别
	1. git merge 会创建一个新的的合并提交，这个提交包含两个分支的修改记录，提交历史会出现分叉的情况。适合保留完整的分支历史，让团队成员清晰地看到每个分支的发展过程。常用于将多个开发者的工作合并到主分支。
	2. git rebae会把一个分支的修改应用到另一个分支的末尾。适合保持提交历史的线性和简洁，让提交历史更加直观。常用于个人开发过程中，将自己的工作同步到最新的主分支上。
22. react有哪些常用的hooks
	1. useState,useContext,useEffect,useLayoutEffect,useMemo,useCallback,useReducer,useRef,forWardRef,useImperativeHandle
	2. useLayoutEffect是在浏览器绘制完成之前,DOM更新之后执行，useEffect会在浏览器绘制完成之后执行。
	   他们俩返回的函数是清除副作用的函数，也就是会在每次dispatch改变之后执行
	   ```jsx
import React, { useRef, forwardRef, useImperativeHandle } from 'react';

// 最底层组件
const BottomComponent = forwardRef((props, ref) => {
    const bottomRef = useRef(null);

    // 自定义暴露给父组件的实例值
    useImperativeHandle(ref, () => ({
        getBottomNode: () => bottomRef.current
    }));

    return (
        <div ref={bottomRef}>
            这是最底层节点
        </div>
    );
});

// 中间层组件
const MiddleComponent = forwardRef((props, ref) => {
    const middleRef = useRef(null);

    // 自定义暴露给父组件的实例值
    useImperativeHandle(ref, () => ({
        getBottomNode: () => middleRef.current.getBottomNode()
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
            bottomNode.style.color = 'red';
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
23. useState是同步还是异步
	1. 大部分情况下是异步的，少部分情况下是同步的，同步的情况下包括,flushSync和setTimeout造成的撕裂——在setTimeout的回调函数中，setState是同步的
24. react执行顺序
	1. layoutEffect和effect的区别
	2. 为什么不能在if-else中调用hook
		1. 不要在循环、条件语句或者嵌套函数中调用 Hook，只能在 React 函数组件的顶层或者自定义 Hook 里调用 Hook。
		2. React 依靠调用顺序来追踪 Hooks hooks在react中是放在fiber的属性上面以链表的形式存在的，如果放在循环或者分支里面可能会导致hook的调用顺序出问题
	3. hook的结构是什么样子的。
	   ```js
function App() {
  console.log('App')
  const [state, setState] = useState(0)
  useEffect(() => {
    setState(state => state + 1)
    setState(state => state + 2)
  }, [])

  useEffect(() => {
    console.log('useEffect 1')
    return () => {
      console.log('useEffect 1 cleanup')
    }
  }, [state])

  useEffect(() => {
    console.log('useEffect 2')
    return () => {
      console.log('useEffect 2 cleanup')
    }
  }, [state])

  useLayoutEffect(() => {
    console.log('useLayoutEffect')
    return () => {
      console.log('useLayoutEffect cleanup')
    }
  }, [state])

  return <Sub state={state} />
}

function Sub({ state }) {
  console.log('Sub')

  useEffect(() => {
    console.log('sub useEffect')
    return () => {
      console.log('sub useEffect cleanup')
    }
  }, [state])

  return null
}


<App/>
```


-----
21. 算法题：实现一个 TS`Await<T>`或者 最近公共祖先
```ts

type MyAwait<T> = T extends Promise<infer U> ? MyAwait<U> : T;

/** 在二叉树中查找两个节点最近公共祖先 */
function lowestCommonAncestor(root: TreeNode | null, p: TreeNode | null, q: TreeNode | null): TreeNode | null {
  // 1.当前节点和左儿子，当前节点和右儿子， 不在当前节点，但是存在左儿子和右儿子
  let parent = null;
  const dfs = (node)=>{
     if(!node)return false;
      const left = dfs(node.left);
      const right = dfs(node.right);
      
      if((left && right) || ((left || right)&&(node === p ||node===q))){
          parent = node;
      }
      
      return left || right || node === p || node === q
   }
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

class TreeNode{}
```





二面可能会考察的
1. script标签中的type可以为什么值，有什么作用
	1. text/javascript，默认值，视为传统的js代码，不用写
	2. module，表示脚本为esm模块，可以使用import 和export导入导出
	3. application/json，表示存储json数据的容器
	4. importmap,导入映射是一个 JSON 对象，开发人员可以使用它来控制浏览器在导入 JavaScript 模块时如何解析模块说明符
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Import Map Example</title>
    <!-- 使用 type="importmap" 定义导入映射 -->
    <script type="importmap">
        {
            "imports": {
                "utils": "./utils/someModule.js",
                "lodash": "https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js"
            }
        }
    </script>
</head>
<body>
    <script type="module">
        // 使用 importmap 中定义的别名导入模块
        import { someFunction } from 'utils';
        import _ from 'lodash';

        someFunction();
        console.log(_.isEmpty({})); 
    </script>
</body>
</html>
```

2. react和vue的区别
	1. 语法和模版
		1. vue倾向于单文件组件sfc，使用基于html的模版语法，比较简洁
		2. react使用jsx(vue也可以支持jsx)
		   但是vue支持jsx的话，模版就不能静态分析了，导致更新的细粒度不够比如
		```vue
<script setup lang="jsx">
import { defineProps, defineEmits } from 'vue'

const props = defineProps({
  message: String
})
const array = [...Array(100).keys()] // 普通数组

const emit = defineEmits(['update'])

const handleClick = () => {
  emit('update', 'New Message from Child')
}

const render = () => (
  <div>
    <p>接收父组件消息: {props.message}</p>
    <button onClick={handleClick}>向父组件发送消息</button>
    <ul>
      {array.map((item, idx) => (
        <li key={idx}>{item}</li>
      ))}
    </ul>
  </div>
)
</script>

<template>
  <render />
</template>
//父组件
<script setup>
import { ref } from 'vue'
import ChildComponent from './ChildComponent.vue'

const parentMsg = ref('Hello from Parent')

const handleUpdate = (newMsg) => {
  parentMsg.value = newMsg
}
</script>

<template>
  <ChildComponent 
    :message="parentMsg" 
    @update="handleUpdate"
  />
</template>

```

		因为这个动态元素的不确定`array.map...`所以导致静态解析无法分析，因此可能出现一个ref更新整个组件更新的情况
	2. 响应式原理
		1. 对于vue，vue2采用的Object.defineProperty实现，Vue3采用Proxy+Reflect实现，性能上有优化，同时做法上不用特殊处理
		2. react:使用setState或者useState进行显示的更新
		   可以采用useMemo等手段减少不必要的更新
	3. 设计理念
		1. vue的设计理念是”渐进式和易用性“（说句题外话，vue2->vue3的升级算是破坏了渐进式的理念，所以有很多项目不选择升级vue3)而且比较轻量
		2. react设计理念是，万物都是js，推崇不可变数据和纯函数组件，比较适合大型应用，而且生态比较多
	4. 性能对比：
		1. vue采用模版语法，静态模版分析和异步渲染优化，可以实现点对点的更新。
		2. react使用虚拟DOM和fiber架构支持增量渲染

3. React和Vue的diff的差别
	1. 设计理念：
		1. vue3设计目标是减少不必要的更新，会在编译阶段对模版做静态分析，标记处静态节点，在diff阶段跳过这些节点。
		2. react采用声明式的编程，强调数据不可变性，如果数据变化可能导致整个组件数的变化，因此需要对虚拟dom树进行整个比较，即使知道某些节点是静态的，但是也没办法避免他们的更新（因此需要diff算法）
	2. 比较粒度：
		1. vue是点对点更新，即可以精确到组件中的哪一个dom更新了。（至于为什么需要diff是因为vue并非立即更新，而是把更新的函数作为副作用放入异步队列中，等待批量的更新，批量的更新是放在微任务队列中的）
		2. react更新是组件级更新，当组件的props或者state变化了就会重新渲染。
	3. 列表对比算法
		1. vue3采用了双指针+最长递增子序列来优化移动操作（找到最少移动步骤）对于有 `key` 的列表，Vue 3 会尽量复用已有的 DOM 节点，减少 DOM 的创建和销毁操作。
		2. react在处理列表时，主要依赖于 `key` 属性来识别每个列表项。当列表项的顺序发生变化时，React 会根据 `key` 来判断哪些项是新增的，哪些项是删除的，哪些项是移动的。
4. zustand如何解决了context问题
	1. 细粒度更新：zustand采用flex架构采用了发布订阅模式。当状态更新时，只有订阅了该状态变化的组件才会重新渲染，避免了不必要的重渲染，提高了性能。
	2. 简单易用：Zustand 不需要像 Context 那样进行复杂的 Provider 嵌套，只需要创建一个 store，然后在组件中使用该 store 即可。这使得状态管理更加简洁和直观。



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