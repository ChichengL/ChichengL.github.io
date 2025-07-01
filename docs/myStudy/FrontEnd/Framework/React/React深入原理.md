## 1. React Hooks 实现原理

React Hooks 是 React 16.8 引入的特性，它允许我们在函数组件中使用状态和其他 React 特性。Hooks 的出现解决了类组件中存在的问题，如状态逻辑难以复用、复杂组件难以理解以及 `this` 指向问题等。本部分将深入探讨 React Hooks 的内部实现机制。

### 1.1 Hooks 的基本原理

React Hooks 的实现并非魔法，而是基于几个关键概念：Fiber 架构、链表数据结构和 JavaScript 的闭包特性。

React Hooks 的核心原理可以概括为：

- 每个函数组件对应一个 Fiber 节点
- 每个 Fiber 节点的 memoizedState 属性以链表形式存储该组件的所有 Hooks
- Hooks 的调用顺序在组件的多次渲染之间必须保持一致
- 通过闭包机制在函数组件的多次渲染之间保存状态

#### 1.1.1 Fiber 与 Hooks 的关系

在 React 的 Fiber 架构中，每个函数组件对应一个 Fiber 节点。Fiber 节点上的 `memoizedState` 属性用于存储该组件中所有 Hooks 的信息。这些 Hooks 以链表的形式存储，通过 `next` 属性串联起来。

```ts
// Fiber 节点结构（简化版）
const fiber = {
  // ...其他属性
  memoizedState: null, // 指向第一个 Hook
  updateQueue: {
    firstEffect: null,
    lastEffect: null,
  },
};

// Hook 对象结构（简化版）
const hook = {
  memoizedState: null, // Hook 自身的状态
  baseState: null, // 基础状态
  queue: null, // 更新队列
  baseQueue: null, // 基础更新队列
  next: null, // 指向下一个 Hook
};
```

例子 🌰

存在一个组件 A，其内部如下所示

```ts
function A(ref) {
  const [state1, setState1] = useState(0);
  useEffect(() => {
    console.log(1);
    return () => {
      console.log("1 end");
    };
  }, []);
  const divRef = useRef();
  const computedState = useMemo(() => {
    // 修正拼写错误
    return state1 * 3;
  }, [state1]);
  const handleClick = useCallback(() => {
    console.log("click");
  }, []);
  const [state2, setState2] = useState("a");
  useEffect(() => {
    console.log(2);
    return () => {
      console.log("2 end");
    };
  }, [state2]);

  useImperativeHandle(
    ref,
    () => {
      return {
        handleClick,
        state: {
          state1,
          state2,
        },
        divRef,
      };
    },
    [state1, state2]
  );

  useLayoutEffect(() => {
    console.log("useLayoutEffect");
    return () => {
      console.log("useLayoutEffect deps update or A destory");
    };
  }, [state1]);
  return (
    <div ref={divRef}>
      <p>{state1}</p>
      <h3>{state2}</h3>
      <div>{computedState}</div>
    </div>
  );
}
```

其对应的 Fiber 结构应该如下所示

```ts
FiberNode {
  type: A,
  stateNode: null,
  memoizedState: { // Hooks 链表
    // 第一个 Hook: useState(0)
    memoizedState: 0, // 当前 state 值
    baseState: 0,
    queue: { pending: null, lanes: 0 },
    next: {
      // 第二个 Hook: useEffect(...)
      tag: HookPassive,
      create: () => { console.log(1); return () => console.log("1 end"); },
      destroy: null,
      deps: [],
      next: {
        // 第三个 Hook: useRef()
        memoizedState: { current: null },
        next: {
          // 第四个 Hook: useMemo(...)
          memoizedState: 0, // 初始计算值 0*3=0
		  deps: [0], // 依赖 state1，初始值为 0
          next: {
            // 第五个 Hook: useCallback(...)
            memoizedState: () => { console.log("click"); },
            deps: [], // 空依赖数组，表示不依赖任何值
            next: {
              // 第六个 Hook: useState("a")
              memoizedState: "a",
              baseState: "a",
              queue: { pending: null, lanes: 0 },
              next: {
                // 第七个 Hook: useEffect(...)
                tag: HookPassive,
                create: () => { console.log(2); return () => console.log("2 end"); },
                destroy: null,
                deps: ["a"],
                next: {
                  // 第八个 Hook: useImperativeHandle(...)
                  tag: HookLayout,
                  create: () => ({ handleClick, state: { state1: 0, state2: "a" },divRef }),
                  destroy: null,
                  deps: [0, "a"],
                  next: {
                    // 第九个 Hook: useLayoutEffect(...)
                    tag: HookLayout,
                    create: () => {
                      console.log('useLayoutEffect');
                      return () => console.log('useLayoutEffect deps update or A destory');
                    },
                    destroy: null,
                    deps: [0], // 依赖 state1
                    next: null // 链表结束
                  }
                }
              }
            }
          }
        }
      }
    }
  },

  updateQueue: {
    // 副作用链表头部（Layout 类型在前）
    firstEffect: {
      tag: HookLayout,
      create: () => ({ handleClick, state: { state1: 0, state2: "a" },divRef }),
      destroy: null,
      nextEffect: { // 指向下一个副作用节点
        tag: HookLayout,
        create: () => {
          console.log('useLayoutEffect');
          return () => console.log('useLayoutEffect deps update or A destory');
        },
        destroy: null,
        nextEffect: { // 指向第一个 Passive 副作用
          tag: HookPassive,
          create: () => { console.log(1); return () => console.log("1 end"); },
          destroy: null,
          nextEffect: { // 指向第二个 Passive 副作用
            tag: HookPassive,
            create: () => { console.log(2); return () => console.log("2 end"); },
            destroy: null,
            nextEffect: null, // 暂时为 null，实际会指向 firstEffect 形成环
            prevEffect: null  // 双向链表指针
          },
          prevEffect: null  // 双向链表指针
        },
        prevEffect: null  // 双向链表指针
      },
      prevEffect: null  // 第一个节点的 prev 为 null
    },

    // 副作用链表尾部（指向最后一个副作用节点）
    lastEffect: {
      tag: HookPassive,
      create: () => { console.log(2); return () => console.log("2 end"); },
      destroy: null,
      nextEffect: { /* 指向 firstEffect 形成环 */ },
      prevEffect: { // 指向前一个副作用节点
        tag: HookPassive,
        create: () => { console.log(1); return () => console.log("1 end"); },
        destroy: null,
        nextEffect: { /* 指向 lastEffect */ },
        prevEffect: { // 指向前一个 Layout 类型副作用
          tag: HookLayout,
          create: () => {
            console.log('useLayoutEffect');
            return () => console.log('useLayoutEffect deps update or A destory');
          },
          destroy: null,
          nextEffect: { /* 指向第一个 Passive 副作用 */ },
          prevEffect: { // 指向第一个 Layout 类型副作用
            tag: HookLayout,
            create: () => ({ handleClick, state: { state1: 0, state2: "a" },divRef }),
            destroy: null,
            nextEffect: { /* 指向第二个 Layout 副作用 */ },
            prevEffect: null  // 第一个节点的 prev 为 null
          }
        }
      }
    }
  }
}
```

![[../../Excalidraw/React深入原理 2025-05-28 11.37.18.excalidraw]]

副作用分为两类：

- **Layout 类型副作用**（同步执行）：
  - `useImperativeHandle`
  - `useLayoutEffect`
  - **执行时机**：DOM 更新后，浏览器绘制前（同步阻塞）
- **Passive 类型副作用**（异步执行）：
  - `useEffect`
  - **执行时机**：浏览器绘制后（异步非阻塞）

上面例子对于 layout 类型的副作用中，先声明的 useImperativeHandle 再声明的 useLayoutEffect，因此先将 useImperativeHandle 挂载到 firstEffect 中

create 的返回值**是当前副作用的清理函数**，用于在  **下次渲染或卸载时**  执行。
destory 的值**存储的是前一次渲染的清理函数**，用于在更新时清理旧副作用。

对于 useImpertiveHandle，它的 destory 是由 React 自动管理，负责在更新或卸载时清理旧的 ref 对象。

#### 1.1.2 Hooks 的调用顺序

React 依赖于 Hooks 的调用顺序来将状态与特定的 Hook 调用关联起来。这就是为什么 Hooks 必须在函数组件的顶层调用，**不能在条件语句、循环或嵌套函数中调用的原因**。

> 如果是下面这种情况

```tsx
function A() {
  if (true) {
    useEffect(() => {
      console.log(1);
    });
  } else {
    useEffect(() => {
      console.log(2);
    });
  }
}
```

> 那么是可以正常运行的，「不能在条件语句、循环或嵌套函数中调用」是因为这些调用可能会打破 hook 链，因此尽量避免在不能在条件语句、循环或嵌套函数中调用。

当函数组件首次渲染时，React 会为每个 Hook 调用创建一个 Hook 对象，并将其添加到链表中。在后续渲染中，React 会按照相同的顺序遍历这个链表，获取每个 Hook 的状态。

Hooks 链表结构示意图：

- Fiber 节点 → memoizedState → Hook 1 → Hook 2 → Hook 3 → Hook 4 → null
- useState Hook: memoizedState(当前状态值), queue(更新队列), next(指向下一个 Hook)
- useEffect Hook: memoizedState(effect 对象), next(指向下一个 Hook) - effect 对象同时被添加到 Fiber 节点的 updateQueue 中
- useMemo Hook: memoizedState(缓存的值), deps(依赖数组), next(指向下一个 Hook)
- useRef Hook: memoizedState({current: value}), next(指向下一个 Hook)

#### 1.1.3 闭包与状态保存

React Hooks 利用 JavaScript 的闭包特性来保存状态。在组件的多次渲染之间，通过闭包环境保留了 Hook 对象及其内部的状态值和更新队列。

```jsx
// 简化版的 useState 实现原理
function useState(initialState) {
  const currentHook = getCurrentHook(); // 获取当前 Hook

  if (isMount) {
    // 首次渲染，创建 Hook 对象
    const hook = {
      memoizedState:
        typeof initialState === "function" ? initialState() : initialState,
      queue: { pending: null },
      next: null,
    };

    // 将 Hook 添加到链表
    if (workInProgressHook === null) {
      currentlyRenderingFiber.memoizedState = workInProgressHook = hook;
    } else {
      workInProgressHook = workInProgressHook.next = hook;
    }

    return [
      hook.memoizedState,
      dispatchAction.bind(null, currentlyRenderingFiber, hook.queue),
    ];
  } else {
    // 更新阶段，获取已存在的 Hook
    const hook = workInProgressHook;
    workInProgressHook = workInProgressHook.next;

    // 处理更新队列
    let newState = hook.memoizedState;
    if (hook.queue.pending !== null) {
      // 应用更新队列中的所有更新
      // ...处理更新逻辑
      newState = processUpdateQueue(hook);
    }

    hook.memoizedState = newState;

    return [
      newState,
      dispatchAction.bind(null, currentlyRenderingFiber, hook.queue),
    ];
  }
}
```

### 1.2 useState: 状态管理的实现机制

`useState` 是最基础的 Hook，用于在函数组件中添加状态。

```tsx
function A(){
	const [count,setCount] = useState(0);
	return <div>
		<button onClick={()=>setCount(prev=>prev+1)}/>
		<div>{count}<div/>
	<div/>
}
```

#### 1.2.1 基本原理

`useState` 在内部实际上使用了 `useReducer`，只是提供了一个更简单的 API。当调用 `useState` 时，React 会：

1. 在首次渲染时，创建一个 Hook 对象，初始化 `memoizedState` 和更新队列
2. 在更新时，从 Hook 链表中找到对应的 Hook，处理更新队列中的更新操作
3. 返回当前状态和一个用于更新状态的函数

useState 工作流程：

- 组件首次渲染 → 调用 useState → mountState → 创建 Hook 对象 → 初始化 memoizedState → 创建 dispatch 函数 → 返回`[state, dispatch]`
- 组件更新 → 调用 useState → updateState → 获取 Hook 对象 → 检查更新队列 → 计算新状态 → 更新 memoizedState → 返回`[newState, dispatch]`
- 调用 setState → 创建 update 对象 → 加入更新队列 → 调度重新渲染 → 组件更新

#### 1.2.2 内部实现机制

`useState` 的内部实现可以简化为以下几个关键步骤：

1. **创建 Hook 对象**：在组件首次渲染时，为每个 `useState` 调用创建一个 Hook 对象
2. **初始化状态**：将初始值存储在 Hook 的 `memoizedState` 属性中
3. **创建 dispatch 函数**：创建一个与特定 Hook 绑定的 `setState` 函数
4. **处理更新**：当调用 `setState` 时，创建更新对象并加入更新队列，然后调度重新渲染

```jsx
// useState 的简化实现
function useState(initialState) {
  return useReducer(basicStateReducer, initialState);
}

function basicStateReducer(state, action) {
  return typeof action === "function" ? action(state) : action;
}
```

当调用 `setState` 函数时，React 会创建一个更新对象并将其添加到更新队列中：

```jsx
function dispatchAction(fiber, queue, action) {
  // 创建更新对象
  const update = {
    action,
    next: null,
  };

  // 将更新对象添加到循环链表中
  const pending = queue.pending;
  if (pending === null) {
    update.next = update;
  } else {
    update.next = pending.next;
    pending.next = update;
  }
  queue.pending = update;

  // 调度更新
  scheduleUpdateOnFiber(fiber);
}
```

#### 1.2.3 批量更新机制

React 会对状态更新进行批处理，以提高性能。在 React 18 之前，只有在 React 事件处理函数中的多次 `setState` 调用会被批处理。而在 React 18 中，所有的状态更新都会自动批处理，无论它们来自哪里（事件处理函数、Promise、setTimeout 等）。

```jsx
// React 18 之前
function handleClick() {
  setCount((c) => c + 1); // 触发重新渲染
  setFlag((f) => !f); // 触发重新渲染
}

// React 18
function handleClick() {
  setCount((c) => c + 1); // 不会立即触发重新渲染
  setFlag((f) => !f); // 不会立即触发重新渲染
  // 两次更新会被批处理，只触发一次重新渲染
}
```

注意：在某些情况下，你可能需要使用 `flushSync` 来强制同步更新并禁用批处理：

```jsx
import { flushSync } from "react-dom";

function handleClick() {
  flushSync(() => {
    setCount((c) => c + 1); // 立即触发重新渲染
  });
  // DOM 已更新
  flushSync(() => {
    setFlag((f) => !f); // 立即触发重新渲染
  });
  // DOM 已更新
}
```

#### 1.2.4 函数式更新与闭包陷阱

当使用 `setState` 更新状态时，可以传入一个值或一个函数。使用函数式更新可以避免闭包陷阱：

```jsx
// 可能存在闭包陷阱
function Counter() {
  const [count, setCount] = useState(0);

  const handleClick = () => {
    // 模拟多次异步更新（例如连续点击按钮）
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        // ❌ 闭包陷阱：每次都使用渲染时的 `count` 值（初始为 0）
        setCount(count + 1);
      }, 1000);
    }
  };

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={handleClick}>Click {count + 3} times</button>
    </div>
  );
}

// 使用函数式更新避免闭包陷阱
function Counter() {
  const [count, setCount] = useState(0);

  const handleClick = () => {
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        // ✅ 函数式更新：`prevCount` 始终是最新状态
        setCount((prevCount) => prevCount + 1);
      }, 1000);
    }
  };

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={handleClick}>Click {count + 3} times</button>
    </div>
  );
}
```

useState 闭包陷阱示意图：

- 组件渲染时捕获状态 (count = 0)
- 设置异步函数 setTimeout
- 状态更新 (count = 1) \* 3
- 组件重新渲染（新的闭包环境）

#### 1.2.5 使用场景和注意事项

**适用场景**：

- 管理组件的本地状态
- 表单控件的值
- UI 状态（如打开/关闭模态框）
- 计数器、切换状态等简单状态

**注意事项**：

- 不要在循环、条件或嵌套函数中调用 `useState`
- 如果新的状态依赖于之前的状态，使用函数式更新
- 对于复杂的状态逻辑，考虑使用 `useReducer`
- 避免在一个组件中使用过多的状态，可能导致代码难以维护
- 可以把状态抽离为一个个 hook，方便维护

### 1.3 useEffect: 副作用处理的实现机制

`useEffect` 用于处理组件中的副作用，如数据获取、订阅或手动更改 DOM 等。

#### 1.3.1 基本原理

`useEffect` 接收一个包含副作用逻辑的函数和一个依赖项数组。React 会在组件渲染到屏幕之后执行这个函数，并在下一次执行副作用之前或组件卸载时执行清理函数（如果提供了的话）。
useEffect 执行时机示意图：

- React → 渲染组件 → 返回虚拟 DOM → 提交 DOM 更新 → DOM 已更新但浏览器还未绘制 → 异步调度 useEffect → 浏览器完成绘制 → 执行 effect 函数
- 重新渲染时：React → 渲染组件 → 返回新的虚拟 DOM → 执行上一次 effect 的清理函数 → 提交 DOM 更新 → 异步调度新的 useEffect → 执行新的 effect 函数

#### 1.3.2 内部实现机制

`useEffect` 的内部实现涉及以下几个关键步骤：

1. **创建 Effect 对象**：包含 `tag`（标识 effect 类型）、`create`（副作用函数）、`destroy`（清理函数）和 `deps`（依赖项数组）
2. **添加到 Effect 链表**：将 Effect 对象添加到 Fiber 节点的 `updateQueue` 中
3. **比较依赖项**：在更新时，比较新旧依赖项数组，决定是否需要重新执行副作用
4. **执行副作用**：在 commit 阶段之后异步执行副作用函数
5. **执行清理函数**：在下一次执行副作用之前或组件卸载时执行清理函数

```jsx
// useEffect 的简化实现
function useEffect(create, deps) {
  const hook = updateWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;

  if (currentHook !== null) {
    const prevEffect = currentHook.memoizedState;
    if (nextDeps !== null) {
      const prevDeps = prevEffect.deps;
      if (areHookInputsEqual(nextDeps, prevDeps)) {
        // 依赖项没有变化，跳过这次 effect
        hook.memoizedState = pushEffect(
          HookPassive | HookHasEffect,
          create,
          prevEffect.destroy,
          nextDeps
        );
        return;
      }
    }
  }

  // 依赖项变化或首次渲染，需要执行 effect
  hook.memoizedState = pushEffect(
    HookPassive | HookHasEffect,
    create,
    undefined,
    nextDeps
  );
}

// 比较依赖项数组
function areHookInputsEqual(nextDeps, prevDeps) {
  if (prevDeps === null) {
    return false;
  }

  for (let i = 0; i < prevDeps.length && i < nextDeps.length; i++) {
    if (Object.is(nextDeps[i], prevDeps[i])) {
      continue;
    }
    return false;
  }

  return true;
}
```

#### 1.3.3 执行时机

`useEffect` 的执行时机是在组件渲染到屏幕之后（即在浏览器完成绘制之后）异步执行的。这意味着：

1. 浏览器会先完成绘制，然后再执行 `useEffect` 中的代码
2. 这种异步执行的方式不会阻塞浏览器的绘制过程，有利于提高用户体验
3. 如果需要在浏览器绘制之前执行副作用，应该使用 `useLayoutEffect`

**useEffect 示例:**

```jsx
// useEffect 示例
useEffect(() => {
  // 这里的代码会在浏览器完成绘制后异步执行
  console.log("Effect executed");

  return () => {
    // 清理函数会在下一次执行副作用之前
    // 或组件卸载时执行
    console.log("Cleanup executed");
  };
}, [dependency]);
```

**执行顺序：**
挂载

1. React 渲染组件
2. DOM 变更+浏览器绘制完成
3. 浏览器绘制
4. **然后** 执行 useEffect 回调

当依赖项变化时：

1. React 渲染组件
2. DOM 更新完成，浏览器绘制
3. 执行上一次 effect 的清理函数
4. 执行新的 effect 回调

**<mark style="background: [[ABF7F7A6]];">清理函数在执行清的 effect 之前执行</mark>**

```mermaid
sequenceDiagram
    participant React
    participant Browser
    React->>React: 生成虚拟DOM（Reconciliation）
    React->>Browser: 更新真实DOM（Commit Phase）

    alt useLayoutEffect
        React->>React: 同步执行清理函数（旧effect）
        React->>React: 同步执行新effect
        Browser->>Browser: 绘制屏幕（Paint）
    else useEffect
        Browser->>Browser: 绘制屏幕（Paint）
        Browser->>React: 异步执行清理函数（旧effect）
        Browser->>React: 异步执行新effect
    end
```

#### 1.3.4 依赖项数组的工作原理

依赖项数组是 `useEffect` 的第二个参数，它决定了何时重新执行副作用：

1. **空数组 []**：副作用只在组件挂载时执行一次，在卸载时执行清理函数
2. **有依赖项的数组 [a, b]**：当任何依赖项变化时，执行副作用
3. **不提供依赖项数组**：每次渲染后都执行副作用

React 使用 `Object.is` 算法比较依赖项是否发生变化。这是一种浅比较，对于对象和数组，只比较引用是否相同，而不比较内部属性。

依赖项数组的常见错误：

1. 遗漏依赖项：可能导致使用过时的值（闭包陷阱）
2. 过多依赖项：可能导致副作用执行过于频繁
3. 依赖项是对象或数组：每次渲染都会创建新的引用，导致副作用总是执行

解决方案：

- 使用 ESLint 插件 `eslint-plugin-react-hooks` 检查依赖项
- 使用 `useMemo` 或 `useCallback` 缓存对象或函数
- 考虑使用 `useReducer` 减少依赖项

#### 1.3.5 使用场景和注意事项

**适用场景**：

- 数据获取（API 调用）
- 订阅外部数据源
- 记录日志
- 设置和清理定时器

**注意事项**：

- 确保在清理函数中清除所有副作用（如取消订阅、清除定时器）
- 避免在没有依赖项数组的情况下执行开销大的操作
- 小心循环依赖和无限循环
- 对于需要在 DOM 更新后立即执行的操作，使用 `useLayoutEffect`

### 1.4 useLayoutEffect: 与 useEffect 的区别和实现原理

`useLayoutEffect` 与 `useEffect` 的 API 完全相同，但执行时机不同。

#### 1.4.1 基本原理

`useLayoutEffect` 会在所有 DOM 变更之后、浏览器执行绘制之前同步调用。这意味着用户不会看到中间状态，即使这会导致性能问题。
useLayoutEffect 执行时机示意图：

- React → 渲染组件 → 返回虚拟 DOM → 提交 DOM 更新 → DOM 已更新但浏览器还未绘制 → 同步执行 useLayoutEffect → 执行完成 → 浏览器完成绘制 → 异步调度 useEffect → 执行 effect 函数

```mermaid
sequenceDiagram
    participant React
    participant Browser
    React->>React: 渲染组件，生成虚拟DOM
    React->>React: 提交DOM更新（Commit Phase）
    Note right of React: DOM已更新，但浏览器尚未绘制
    React->>React: 同步执行useLayoutEffect
    React->>Browser: 通知浏览器绘制
    Browser->>Browser: 完成绘制（Paint）
    Browser->>React: 异步调度useEffect
    React->>React: 执行useEffect回调函数
```

#### 1.4.2 与 useEffect 的区别

主要区别在于执行时机：

1. **useEffect**：
   1. 在浏览器完成绘制之后异步执行
   2. 不会阻塞浏览器绘制
   3. 适用于大多数副作用
2. **useLayoutEffect**：
   1. 在 DOM 更新之后、浏览器绘制之前同步执行
   2. 会阻塞浏览器绘制
   3. 适用于需要在用户看到更新之前进行的 DOM 测量或修改

**useLayoutEffect 示例:**

```jsx
// useLayoutEffect 示例
useLayoutEffect(() => {
  // 这里的代码会在 DOM 更新后、浏览器绘制前同步执行
  // 可以读取 DOM 布局并同步修改 DOM
  const width = myRef.current.getBoundingClientRect().width;
  myRef.current.style.width = `${width * 2}px`;

  return () => {
    // 清理函数
  };
}, [dependency]);
```

**执行顺序：**

1. React 渲染组件
2. 屏幕更新（DOM 变更）
3. **立即** 执行 useLayoutEffect 回调
4. 浏览器绘制

当依赖项变化时：

1. React 渲染组件
2. 执行上一次 effect 的清理函数
3. 屏幕更新（DOM 变更）
4. 执行新的 useLayoutEffect 回调
5. 浏览器绘制

#### 1.4.3 内部实现机制

`useLayoutEffect` 的内部实现与 `useEffect` 非常相似，主要区别在于：

1. `useLayoutEffect` 使用 `HookLayout` 标记，而 `useEffect` 使用 `HookPassive` 标记
2. `useLayoutEffect` 的副作用在 commit 阶段的 `commitLayoutEffects` 函数中同步执行
3. `useEffect` 的副作用在 commit 阶段结束后通过 scheduler 异步调度执行

```jsx
// useLayoutEffect 的简化实现
function useLayoutEffect(create, deps) {
  const hook = updateWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;

  if (currentHook !== null) {
    const prevEffect = currentHook.memoizedState;
    if (nextDeps !== null) {
      const prevDeps = prevEffect.deps;
      if (areHookInputsEqual(nextDeps, prevDeps)) {
        // 依赖项没有变化，跳过这次 effect
        hook.memoizedState = pushEffect(
          HookLayout,
          create,
          prevEffect.destroy,
          nextDeps
        );
        return;
      }
    }
  }

  // 依赖项变化或首次渲染，需要执行 effect
  hook.memoizedState = pushEffect(
    HookLayout | HookHasEffect,
    create,
    undefined,
    nextDeps
  );
}
```

#### 1.4.4 使用场景和注意事项

**适用场景**：

- 需要在用户看到更新之前进行的 DOM 测量（如获取元素尺寸或位置）
- 需要根据 DOM 布局立即调整其他元素的场景
- 防止闪烁或布局跳动
- 需要同步更新 DOM 的动画

**注意事项**：

- 由于会阻塞浏览器绘制，应尽量避免在 `useLayoutEffect` 中执行耗时操作
- 大多数情况下，优先使用 `useEffect`
- 只有当 `useEffect` 导致可见的布局问题时，才考虑使用 `useLayoutEffect`

性能提示：如果你在 `useLayoutEffect` 中执行耗时操作，可能会导致页面渲染延迟，影响用户体验。如果操作不需要同步执行，请使用 `useEffect` 代替。

### 1.5 useMemo/useCallback: 缓存优化的实现原理

`useMemo` 和 `useCallback` 是用于性能优化的 Hooks，它们通过缓存值和函数来避免不必要的计算和渲染。

#### 1.5.1 基本原理

- **useMemo**：缓存计算结果（值）
- **useCallback**：缓存函数引用

这两个 Hook 都接受一个函数和一个依赖项数组作为参数。只有当依赖项发生变化时，才会重新计算值或创建新的函数引用。

#### 1.5.2 内部实现机制

`useMemo` 和 `useCallback` 的内部实现非常相似：

1. 在首次渲染时，执行函数并将结果（`useMemo`）或函数本身（`useCallback`）存储在 Hook 的 `memoizedState` 中
2. 在后续渲染时，比较依赖项数组是否变化
3. 如果依赖项没有变化，直接返回缓存的值或函数
4. 如果依赖项变化，重新执行函数并更新缓存

```jsx
// useMemo 的简化实现
function useMemo(nextCreate, deps) {
  const hook = updateWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;

  if (currentHook !== null) {
    const prevState = currentHook.memoizedState;
    if (nextDeps !== null) {
      const prevDeps = prevState[1];
      if (areHookInputsEqual(nextDeps, prevDeps)) {
        // 依赖项没有变化，返回缓存的值
        return prevState[0];
      }
    }
  }

  // 依赖项变化或首次渲染，计算新值
  const nextValue = nextCreate();
  hook.memoizedState = [nextValue, nextDeps];
  return nextValue;
}

// useCallback 的简化实现
function useCallback(callback, deps) {
  // useCallback 实际上是 useMemo 的特殊情况
  return useMemo(() => callback, deps);
}
```

#### 1.5.3 useMemo 的使用

`useMemo` 用于缓存计算结果，特别是计算成本较高的操作：

```jsx
// 不使用 useMemo
function ProductList({ products, filterText }) {
  // 每次渲染都会重新计算，即使 products 和 filterText 没有变化
  const filteredProducts = products.filter((product) =>
    product.name.includes(filterText)
  );

  return (
    <ul>
      {filteredProducts.map((product) => (
        <li key={product.id}>{product.name}</li>
      ))}
    </ul>
  );
}

// 使用 useMemo
function ProductList({ products, filterText }) {
  // 只有当 products 或 filterText 变化时才会重新计算
  const filteredProducts = useMemo(() => {
    return products.filter((product) => product.name.includes(filterText));
  }, [products, filterText]);

  return (
    <ul>
      {filteredProducts.map((product) => (
        <li key={product.id}>{product.name}</li>
      ))}
    </ul>
  );
}
```

#### 1.5.4 useCallback 的使用

`useCallback` 用于缓存函数引用，特别是当函数作为 props 传递给子组件时：

```jsx
// 不使用 useCallback
function ParentComponent({ id }) {
  // 每次渲染都会创建新的函数引用
  const handleClick = () => {
    console.log("Clicked item:", id);
  };

  return <ChildComponent onClick={handleClick} />;
}

// 使用 useCallback
function ParentComponent({ id }) {
  // 只有当 id 变化时才会创建新的函数引用
  const handleClick = useCallback(() => {
    console.log("Clicked item:", id);
  }, [id]);

  return <ChildComponent onClick={handleClick} />;
}
```

#### 1.5.5 与 React.memo 结合使用

`useMemo` 和 `useCallback` 通常与 `React.memo` 结合使用，以防止子组件不必要的重新渲染：

```jsx
// 子组件使用 React.memo 进行记忆化
const ChildComponent = React.memo(function ChildComponent({ onClick }) {
  console.log("Child component rendered");
  return <button onClick={onClick}>Click me</button>;
});

// 父组件使用 useCallback 缓存回调函数
function ParentComponent() {
  const [count, setCount] = useState(0);

  // 如果不使用 useCallback，每次 count 变化导致父组件重新渲染时，
  // 都会创建新的 handleClick 函数，导致 ChildComponent 也重新渲染
  const handleClick = useCallback(() => {
    console.log("Button clicked");
  }, []); // 空依赖数组，函数引用永远不变

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
      <ChildComponent onClick={handleClick} />
    </div>
  );
}
```

#### 1.5.6 使用场景和注意事项

**适用场景**：

- **useMemo**：
  - 计算成本高的操作（如过滤大型数组、复杂计算）
  - 创建需要引用稳定的对象（如作为其他 Hook 的依赖项）
  - 避免子组件不必要的重新渲染
- **useCallback**：
  - 将回调函数传递给使用 `React.memo` 优化的子组件
  - 回调函数作为其他 Hook 的依赖项
  - 避免不必要的副作用执行

**注意事项**：

- 不要过度使用，缓存本身也有开销
- 确保依赖项数组正确，否则可能导致缓存失效或使用过时的值
- `useCallback` 和 `useMemo` 不会阻止创建函数或计算值，只会阻止在依赖项不变时重新创建
- 对于简单的计算，使用 `useMemo` 的开销可能大于重新计算的开销

性能优化建议：

1. 先编写不带优化的代码，确保功能正确
2. 使用性能分析工具（如 React DevTools Profiler）识别性能瓶颈
3. 有针对性地应用 `useMemo` 和 `useCallback` 优化
4. 测试优化效果，确保性能确实得到提升

### 1.6 useRef: 引用持久化的实现机制

`useRef` 是一个用于创建可变引用的 Hook，它在组件的整个生命周期内保持不变。

#### 1.6.1 基本原理

`useRef` 返回一个包含 `current` 属性的可变对象，这个对象在组件的整个生命周期内保持不变。与 state 不同，修改 `ref.current` 不会导致组件重新渲染。

#### 1.6.2 内部实现机制

`useRef` 的内部实现非常简单：

1. 在首次渲染时，创建一个包含 `current` 属性的对象，并将其存储在 Hook 的 `memoizedState` 中
2. 在后续渲染时，直接返回存储的对象

```jsx
// useRef 的简化实现
function useRef(initialValue) {
  const hook = updateWorkInProgressHook();

  if (hook.memoizedState === null) {
    // 首次渲染，创建 ref 对象
    const ref = { current: initialValue };
    hook.memoizedState = ref;
    return ref;
  } else {
    // 后续渲染，返回已存在的 ref 对象
    return hook.memoizedState;
  }
}
```

#### 1.6.3 useRef 与 createRef 的区别

`useRef` 和 `React.createRef` 的主要区别在于：

- `useRef` 在组件的整个生命周期内返回同一个 ref 对象
- `React.createRef` 在每次渲染时都会创建一个新的 ref 对象

```jsx
function Component() {
  // 在组件的整个生命周期内，useRef 返回同一个对象
  const refFromUseRef = useRef(null);

  // 每次渲染都会创建一个新的 ref 对象
  const refFromCreateRef = React.createRef();

  // 日志输出
  console.log("useRef 相同吗?", refFromUseRef === Component.prevRefFromUseRef);
  console.log(
    "createRef 相同吗?",
    refFromCreateRef === Component.prevRefFromCreateRef
  );

  // 保存当前的 ref 对象以供下次比较
  Component.prevRefFromUseRef = refFromUseRef;
  Component.prevRefFromCreateRef = refFromCreateRef;

  return <div>Ref 示例</div>;
}
```

#### 1.6.4 使用场景

**1. 访问 DOM 元素**

```jsx
function TextInputWithFocusButton() {
  const inputRef = useRef(null);

  const focusInput = () => {
    // 直接访问 DOM 元素
    inputRef.current.focus();
  };

  return (
    <>
      <input ref={inputRef} type="text" />
      <button onClick={focusInput}>聚焦输入框</button>
    </>
  );
}
```

**2. 保存前一个值**

```jsx
function Counter() {
  const [count, setCount] = useState(0);
  const prevCountRef = useRef();

  useEffect(() => {
    // 在渲染后更新 ref
    prevCountRef.current = count;
  });

  const prevCount = prevCountRef.current;

  return (
    <div>
      <p>
        当前值: {count}, 前一个值: {prevCount !== undefined ? prevCount : "无"}
      </p>
      <button onClick={() => setCount(count + 1)}>增加</button>
    </div>
  );
}
```

**3. 存储不需要触发重新渲染的值**

```jsx
function IntervalCounter() {
  const [count, setCount] = useState(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    // 设置定时器并保存 ID
    intervalRef.current = setInterval(() => {
      setCount((c) => c + 1);
    }, 1000);

    return () => {
      // 清除定时器
      clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <div>
      <p>计数: {count}</p>
      <button onClick={() => clearInterval(intervalRef.current)}>停止</button>
    </div>
  );
}
```

**4. 解决闭包陷阱**

```jsx
function CounterWithRef() {
  const [count, setCount] = useState(0);
  const countRef = useRef(count);

  // 更新 ref 以反映最新的 count
  useEffect(() => {
    countRef.current = count;
  }, [count]);

  const handleAlertClick = () => {
    setTimeout(() => {
      // 使用 ref 获取最新值，而不是闭包中捕获的旧值
      alert("当前计数: " + countRef.current);
    }, 3000);
  };

  return (
    <div>
      <p>计数: {count}</p>
      <button onClick={() => setCount(count + 1)}>增加</button>
      <button onClick={handleAlertClick}>3秒后显示计数</button>
    </div>
  );
}
```

#### 1.6.5 使用场景和注意事项

**适用场景**：

- 访问 DOM 元素或组件实例
- 保存前一个 props 或 state
- 存储不需要触发重新渲染的可变值
- 解决闭包陷阱
- 与 `useImperativeHandle` 结合，向父组件暴露方法

**注意事项**：

- 修改 `ref.current` 不会触发重新渲染
- 避免在渲染期间读取或写入 `ref.current`（除非你明确知道自己在做什么）
- 不要将 `ref` 或 `ref.current` 作为其他 Hook 的依赖项
- `useRef` 不仅仅用于 DOM 引用，还可以用于存储任何可变值

警告：在渲染期间读取或写入 refs 可能导致不一致的 UI 或难以调试的问题。尽量在事件处理函数或 effects 中操作 refs。

### 1.7 useContext: 上下文共享的实现原理

`useContext` 是一个用于获取 React 上下文（Context）值的 Hook，它使组件能够读取上下文并订阅其更新。

#### 1.7.1 基本原理

`useContext` 接收一个上下文对象（由 `React.createContext` 创建）作为参数，并返回该上下文的当前值。当上下文值变化时，使用 `useContext` 的组件会重新渲染。

#### 1.7.2 内部实现机制

`useContext` 的内部实现相对简单：

1. 从当前渲染的组件获取上下文值
2. 订阅上下文的变化
3. 当上下文值变化时，触发使用该上下文的组件重新渲染

```jsx
// useContext 的简化实现
function useContext(Context) {
  const contextValue = readContext(Context);
  return contextValue;
}

function readContext(Context) {
  // 获取当前上下文值
  const contextItem = ReactCurrentDispatcher.current.readContext(Context);
  return contextItem.value;
}
```

#### 1.7.3 上下文的工作原理

React 的上下文系统由三部分组成：

1. **Context 对象**：由 `React.createContext` 创建
2. **Provider**：提供上下文值的组件
3. **Consumer**：消费上下文值的组件（使用 `useContext` 或 `Context.Consumer`）

当 Provider 的 `value` 属性变化时，所有使用该上下文的后代组件都会重新渲染。

```jsx
// 创建上下文
const ThemeContext = React.createContext("light");

// 提供上下文值
function App() {
  const [theme, setTheme] = useState("light");

  return (
    <ThemeContext.Provider value={theme}>
      <div>
        <ThemedButton />
        <button onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
          切换主题
        </button>
      </div>
    </ThemeContext.Provider>
  );
}

// 使用上下文值
function ThemedButton() {
  const theme = useContext(ThemeContext);

  return (
    <button
      style={{
        background: theme === "light" ? "#fff" : "#333",
        color: theme === "light" ? "#333" : "#fff",
      }}
    >
      我是一个 {theme} 主题的按钮
    </button>
  );
}
```

#### 1.7.4 性能优化

当上下文值变化时，所有使用该上下文的组件都会重新渲染，这可能导致性能问题。可以采取以下策略进行优化：

1. **拆分上下文**：将频繁变化的值和不经常变化的值放在不同的上下文中
2. **使用 React.memo**：对不依赖变化上下文的组件进行记忆化
3. **优化上下文值**：使用 `useMemo` 缓存上下文值，避免不必要的重新渲染

```jsx
// 拆分上下文
const ThemeContext = React.createContext("light");
const UserContext = React.createContext(null);

// 优化上下文值
function ThemeProvider({ children }) {
  const [theme, setTheme] = useState("light");

  // 使用 useMemo 缓存上下文值
  const themeContextValue = useMemo(() => {
    return { theme, setTheme };
  }, [theme]);

  return (
    <ThemeContext.Provider value={themeContextValue}>
      {children}
    </ThemeContext.Provider>
  );
}
```

#### 1.7.5 与 useReducer 结合使用

`useContext` 经常与 `useReducer` 结合使用，实现类似 Redux 的状态管理：

```jsx
// 创建上下文
const CounterContext = React.createContext(null);

// 定义 reducer
function counterReducer(state, action) {
  switch (action.type) {
    case "increment":
      return { count: state.count + 1 };
    case "decrement":
      return { count: state.count - 1 };
    default:
      throw new Error(`未知的 action 类型: ${action.type}`);
  }
}

// 提供上下文和 reducer
function CounterProvider({ children }) {
  const [state, dispatch] = useReducer(counterReducer, { count: 0 });

  return (
    <CounterContext.Provider value={{ state, dispatch }}>
      {children}
    </CounterContext.Provider>
  );
}

// 使用上下文和 dispatch
function Counter() {
  const { state, dispatch } = useContext(CounterContext);

  return (
    <div>
      <p>计数: {state.count}</p>
      <button onClick={() => dispatch({ type: "increment" })}>增加</button>
      <button onClick={() => dispatch({ type: "decrement" })}>减少</button>
    </div>
  );
}

// 使用 Provider 包装应用
function App() {
  return (
    <CounterProvider>
      <Counter />
    </CounterProvider>
  );
}
```

#### 1.7.6 使用场景和注意事项

**适用场景**：

- 共享全局数据（如主题、用户信息、语言设置）
- 避免 props 深层传递（props drilling）
- 与 `useReducer` 结合实现状态管理
- 跨组件通信

**注意事项**：

- 上下文变化会导致所有使用该上下文的组件重新渲染，可能影响性能
- 不要过度使用上下文，对于只需要在几个组件之间共享的数据，直接传递 props 可能更简单
- 考虑将上下文的提供者放在组件树的较低位置，以限制重新渲染的范围
- 使用多个上下文时，嵌套过多的 Provider 可能导致代码难以维护

提示：创建自定义 Hook 来简化上下文的使用

```jsx
// 自定义 Hook
function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme 必须在 ThemeProvider 内部使用");
  }
  return context;
}

// 使用自定义 Hook
function ThemedButton() {
  const { theme, setTheme } = useTheme();
  // ...
}
```

### 1.8 useImperativeHandle: 父组件调用子组件方法的实现机制

`useImperativeHandle` 是一个用于自定义通过 ref 暴露给父组件的实例值的 Hook。它通常与 `forwardRef` 一起使用。

#### 1.8.1 基本原理

`useImperativeHandle` 允许你在使用 `ref` 时自定义暴露给父组件的实例值。它接收三个参数：

1. 要修改的 `ref`
2. 一个创建自定义实例值的函数
3. 依赖项数组（可选）

#### 1.8.2 内部实现机制

`useImperativeHandle` 的内部实现涉及以下步骤：

1. 在渲染期间，调用创建函数生成自定义实例值
2. 将这个值赋给传入的 ref 的 `current` 属性
3. 只有当依赖项变化时，才会重新生成实例值

```jsx
// useImperativeHandle 的简化实现
function useImperativeHandle(ref, create, deps) {
  const hook = updateWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;

  if (currentHook !== null) {
    const prevDeps = currentHook.memoizedState[1];
    if (nextDeps !== null && areHookInputsEqual(nextDeps, prevDeps)) {
      // 依赖项没有变化，跳过更新
      return;
    }
  }

  // 依赖项变化或首次渲染，创建新的实例值
  const instanceValue = create();
  hook.memoizedState = [instanceValue, nextDeps];

  // 更新 ref 的 current 属性
  if (ref !== null) {
    ref.current = instanceValue;
  }
}
```

#### 1.8.3 与 forwardRef 结合使用

`useImperativeHandle` 通常与 `forwardRef` 一起使用，以便父组件可以获取子组件的引用：

```jsx
// 使用 forwardRef 和 useImperativeHandle
const FancyInput = React.forwardRef((props, ref) => {
  const inputRef = useRef(null);

  // 自定义暴露给父组件的实例值
  useImperativeHandle(
    ref,
    () => ({
      focus: () => {
        inputRef.current.focus();
      },
      getValue: () => {
        return inputRef.current.value;
      },
      setValue: (value) => {
        inputRef.current.value = value;
      },
    }),
    []
  );

  return <input ref={inputRef} />;
});

// 父组件使用 FancyInput
function Parent() {
  const fancyInputRef = useRef(null);

  const handleClick = () => {
    // 调用子组件暴露的方法
    fancyInputRef.current.focus();
    fancyInputRef.current.setValue("Hello from parent!");
    console.log("当前值:", fancyInputRef.current.getValue());
  };

  return (
    <div>
      <FancyInput ref={fancyInputRef} />
      <button onClick={handleClick}>操作输入框</button>
    </div>
  );
}
```

#### 1.8.4 依赖项数组的作用

与其他 Hooks 类似，`useImperativeHandle` 的第三个参数是一个依赖项数组。只有当依赖项变化时，才会重新创建实例值：

```jsx
// 带依赖项的 useImperativeHandle
const Counter = React.forwardRef((props, ref) => {
  const [count, setCount] = useState(0);

  // 只有当 count 变化时，才会更新暴露的实例值
  useImperativeHandle(
    ref,
    () => ({
      getCount: () => count,
      increment: () => setCount(count + 1),
    }),
    [count]
  ); // 依赖于 count

  return (
    <div>
      <p>计数: {count}</p>
      <button onClick={() => setCount(count + 1)}>增加</button>
    </div>
  );
});
```

#### 1.8.5 使用场景和注意事项

**适用场景**：

- 需要父组件调用子组件方法的场景
- 需要限制父组件对子组件 DOM 的访问
- 需要向父组件暴露自定义 API
- 表单组件封装（如自定义输入框、表单验证）
- 复杂组件的命令式操作（如模态框、轮播图）

**注意事项**：

- 尽量避免过度使用命令式代码，优先考虑声明式和单向数据流
- 只暴露必要的方法和属性，保持组件的封装性
- 注意依赖项数组的正确性，避免使用过时的值
- 使用 `useImperativeHandle` 会增加组件之间的耦合度，应谨慎使用

警告：过度使用 `useImperativeHandle` 可能导致代码难以维护和测试。只有在声明式方法不足以满足需求时，才考虑使用命令式方法。

## 2. React Diff 算法原理

React 的核心特性之一是虚拟 DOM（Virtual DOM）和高效的 Diff 算法，它们使 React 能够以最小的代价更新实际的 DOM，提高应用程序的性能。本部分将深入探讨 React Diff 算法的工作原理和优化策略。
也可以参考 https://react.iamkasong.com/diff/one.html

### 2.1 基本工作原理和流程

#### 2.1.1 虚拟 DOM 与 Diff 算法概述

虚拟 DOM 是 React 中的一个概念，它是真实 DOM 的 JavaScript 对象表示。当组件的状态发生变化时，React 会：

1. 创建一个新的虚拟 DOM 树
2. 将新的虚拟 DOM 树与旧的虚拟 DOM 树进行比较（Diff）
3. 计算出最小的变更集合
4. 将这些变更应用到实际的 DOM 上

Diff 算法工作流程：

- 状态更新 → 创建新的虚拟 DOM 树 → 与旧虚拟 DOM 树进行 Diff 比较 → 生成 DOM 更新补丁 → 应用补丁到真实 DOM
- Diff 比较过程包括：Tree Diff（层级比较）→ Component Diff（组件比较）→ Element Diff（元素比较）

#### 2.1.2 传统 Diff 算法的局限性

在计算机科学中，比较两棵树的差异是一个复杂的问题。传统的树形结构 Diff 算法的时间复杂度是 O(n³)，其中 n 是树中节点的数量。对于包含成百上千个节点的 DOM 树，这样的算法性能会非常差。

#### 2.1.3 React 的 Diff 策略

为了解决传统 Diff 算法的性能问题，React 团队制定了一些启发式策略，将 Diff 算法的时间复杂度从 O(n³) 降低到 O(n)。这些策略基于以下假设：

1. 不同类型的元素会产生不同的树
2. 开发者可以通过 `key` 属性暗示哪些子元素在不同的渲染中保持稳定

基于这些假设，React 实现了高效的 Diff 算法，主要包括三个层面的比较：Tree Diff、Component Diff 和 Element Diff。

```jsx
// 虚拟 DOM 节点的简化结构
const vNode = {
  type: "div", // 元素类型
  props: {
    // 属性
    className: "container",
    children: [
      {
        type: "h1",
        props: {
          children: "Hello, World!",
        },
      },
      {
        type: "p",
        props: {
          children: "This is a paragraph.",
        },
      },
    ],
  },
};
```

### 2.2 优化策略

#### 2.2.1 Tree Diff: 层级比较

Tree Diff 是 React Diff 算法的第一层比较，它基于一个重要的假设：DOM 节点跨层级的移动操作非常少，可以忽略不计。

基于这个假设，React 对树进行分层比较。当发现节点不存在时，会直接删除该节点及其所有子节点，不会尝试在其他层级寻找匹配。这种策略大大简化了 Diff 过程，提高了性能。

Tree Diff 示意图：

- 旧虚拟 DOM：Root → Div → P + Span
- 新虚拟 DOM：Root → Div → Span + Div
- 比较过程：Root 比较 Root → Div 比较 Div → P 被删除 → Span 比较 Span → 新增 Div

**示例代码**：

```jsx
// 旧虚拟 DOM
const oldVirtualDOM = (
  <div>
    <p>Paragraph</p>
    <span>Span</span>
  </div>
);

// 新虚拟 DOM（p 元素被移除，添加了一个 div 元素）
const newVirtualDOM = (
  <div>
    <span>Span</span>
    <div>New Div</div>
  </div>
);

// React 会执行以下操作：
// 1. 比较根节点 <div>，类型相同，继续比较子节点
// 2. 比较第一个子节点：旧的是 <p>，新的是 <span>，类型不同，删除 <p> 并插入 <span>
// 3. 比较第二个子节点：旧的是 <span>，新的是 <div>，类型不同，删除 <span> 并插入 <div>
// 实际上，React 不知道 <span> 只是移动了位置，它会执行删除和插入操作
```

**跨层级移动的处理**：

如果确实需要跨层级移动 DOM 节点，React 不会将其识别为移动操作，而是会执行删除和重新创建的操作。这可能导致性能问题，因此 React 官方建议避免跨层级移动 DOM 节点。

避免跨层级移动 DOM 节点！React 不会将其识别为移动操作，而是会执行删除和重新创建的操作，这会导致性能问题和状态丢失。如果需要切换组件的显示和隐藏，考虑使用 CSS 或条件渲染，而不是改变 DOM 结构。

#### 2.2.2 Component Diff: 组件比较

Component Diff 是 React Diff 算法的第二层比较，它处理组件级别的比较。React 对组件的比较策略如下：

1. 如果组件类型相同（如都是 `Button` 组件），React 会递归比较其虚拟 DOM 树
2. 如果组件类型不同（如从 `Button` 变为 `Link`），React 会将旧组件标记为待删除，并创建新组件

Component Diff 示意图：

- 旧虚拟 DOM：Root → 组件 A → 组件 B + 组件 C
- 新虚拟 DOM：Root → 组件 A → 组件 D + 组件 C
- 比较过程：Root 比较 Root → 组件 A 比较组件 A → 组件 B 与组件 D 类型不同，整体替换 → 组件 C 与组件 C 类型相同，继续比较

**示例代码**：

```jsx
// 旧虚拟 DOM
const oldVirtualDOM = (
  <div>
    <Counter initial={0} />
    <Button onClick={handleClick}>Click Me</Button>
  </div>
);

// 新虚拟 DOM（将 Button 组件替换为 Link 组件）
const newVirtualDOM = (
  <div>
    <Counter initial={0} />
    <Link href="#">Click Me</Link>
  </div>
);

// React 会执行以下操作：
// 1. 比较根节点 <div>，类型相同，继续比较子节点
// 2. 比较第一个子节点：都是 Counter 组件，类型相同，递归比较其虚拟 DOM 树
// 3. 比较第二个子节点：一个是 Button 组件，一个是 Link 组件，类型不同，
//    删除 Button 组件并创建 Link 组件
```

**性能优化**：

对于同类型的组件，React 提供了 `shouldComponentUpdate`（类组件）和 `React.memo`（函数组件）来优化性能。如果这些方法返回 `false`，React 会跳过该组件及其子组件的比较过程。

```jsx
// 类组件优化
class PureCounter extends React.Component {
  shouldComponentUpdate(nextProps, nextState) {
    // 只有当 count 属性变化时才重新渲染
    return this.props.count !== nextProps.count;
  }

  render() {
    return <div>{this.props.count}</div>;
  }
}

// 函数组件优化
const MemoCounter = React.memo(function Counter({ count }) {
  return <div>{count}</div>;
});
```

#### 2.2.3 Element Diff: 元素比较

Element Diff 是 React Diff 算法的第三层比较，它处理同一层级的子元素列表。当比较同一层级的子元素时，React 默认采用从左到右的比较方式，这在某些情况下可能导致性能问题。

为了优化这一过程，React 引入了 `key` 属性，它帮助 React 识别哪些元素是新增的、哪些是被移除的、哪些是可以复用的。

Element Diff 示意图：

- 旧列表：A → B → C → D
- 新列表：B → C → E → A
- 比较结果：A 移动 → B 不变 → C 不变 → D 删除 → E 新增

**不使用 key 的问题**：

如果不使用 `key`，React 会按照元素在数组中的索引进行比较，这可能导致不必要的 DOM 操作：

```jsx
// 旧虚拟 DOM
const oldVirtualDOM = (
  <ul>
    <li>Item 1</li>
    <li>Item 2</li>
    <li>Item 3</li>
  </ul>
);

// 新虚拟 DOM（在列表开头添加一个新元素）
const newVirtualDOM = (
  <ul>
    <li>Item 0</li>
    <li>Item 1</li>
    <li>Item 2</li>
    <li>Item 3</li>
  </ul>
);

// 如果不使用 key，React 会执行以下操作：
// 1. 比较第一个 <li>：内容从 "Item 1" 变为 "Item 0"，更新内容
// 2. 比较第二个 <li>：内容从 "Item 2" 变为 "Item 1"，更新内容
// 3. 比较第三个 <li>：内容从 "Item 3" 变为 "Item 2"，更新内容
// 4. 添加第四个 <li>：内容为 "Item 3"
// 这导致了 3 次更新和 1 次添加，而实际上只需要 1 次添加
```

**使用 key 的优化**：

使用 `key` 属性可以帮助 React 更准确地识别元素，减少不必要的 DOM 操作：

```jsx
// 旧虚拟 DOM
const oldVirtualDOM = (
  <ul>
    <li key="1">Item 1</li>
    <li key="2">Item 2</li>
    <li key="3">Item 3</li>
  </ul>
);

// 新虚拟 DOM（在列表开头添加一个新元素）
const newVirtualDOM = (
  <ul>
    <li key="0">Item 0</li>
    <li key="1">Item 1</li>
    <li key="2">Item 2</li>
    <li key="3">Item 3</li>
  </ul>
);

// 使用 key 后，React 会执行以下操作：
// 1. 识别出 key="1"、key="2"、key="3" 的元素可以复用
// 2. 添加 key="0" 的新元素
// 这只需要 1 次添加操作，没有更新操作
```

**key 的选择**：

选择合适的 `key` 对于优化 Diff 过程非常重要：

1. `key` 应该是稳定的、唯一的、可预测的
2. 最好使用数据的唯一标识符作为 `key`，如 ID
3. 如果没有唯一标识符，可以使用项目的索引作为 `key`，但这可能导致性能问题

```jsx
// 好的做法：使用唯一 ID 作为 key
function TodoList({ todos }) {
  return (
    <ul>
      {todos.map((todo) => (
        <li key={todo.id}>{todo.text}</li>
      ))}
    </ul>
  );
}

// 不推荐的做法：使用索引作为 key
function TodoList({ todos }) {
  return (
    <ul>
      {todos.map((todo, index) => (
        <li key={index}>{todo.text}</li> // 如果列表顺序会变化，这可能导致性能问题
      ))}
    </ul>
  );
}
```

什么时候可以使用索引作为 `key`？

只有当以下条件都满足时，使用索引作为 `key` 才是安全的：

1. 列表是静态的，不会变化
2. 列表项没有 ID
3. 列表永远不会重新排序或过滤
4. 列表项没有状态（如选中状态）

在其他情况下，应该使用稳定的唯一标识符作为 `key`。

### 2.3 性能优化措施

除了 React 内置的 Diff 算法优化外，开发者还可以采取一些措施来进一步提高性能：

#### 2.3.1 使用 React.memo 和 shouldComponentUpdate

`React.memo`（函数组件）和 `shouldComponentUpdate`（类组件）可以避免不必要的渲染：

```jsx
// 使用 React.memo 优化函数组件
const MemoizedComponent = React.memo(function MyComponent(props) {
  // 只有当 props 变化时才会重新渲染
  return <div>{props.value}</div>;
});

// 使用 shouldComponentUpdate 优化类组件
class OptimizedComponent extends React.Component {
  shouldComponentUpdate(nextProps, nextState) {
    // 只有当特定 props 变化时才重新渲染
    return this.props.value !== nextProps.value;
  }

  render() {
    return <div>{this.props.value}</div>;
  }
}
```

#### 2.3.2 使用 PureComponent

`React.PureComponent` 是 `React.Component` 的一个变体，它实现了 `shouldComponentUpdate` 方法，对 props 和 state 进行浅比较：

```jsx
// 使用 PureComponent
class PureCounterComponent extends React.PureComponent {
  render() {
    return <div>{this.props.count}</div>;
  }
}
```

#### 2.3.3 合理使用 key

正确使用 `key` 属性可以帮助 React 更高效地更新 DOM：

```jsx
// 使用稳定的唯一标识符作为 key
function UserList({ users }) {
  return (
    <ul>
      {users.map((user) => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}
```

#### 2.3.4 避免不必要的渲染

减少不必要的渲染可以提高应用程序的性能：

1. **提取组件**：将大型组件拆分为小型组件，使更新更加精确
2. **使用 useMemo 和 useCallback**：缓存计算结果和回调函数，避免不必要的重新计算和渲染
3. **避免在渲染函数中创建新对象或函数**：每次创建新的引用会导致子组件重新渲染

```jsx
// 不好的做法：每次渲染都创建新的对象
function BadComponent({ data }) {
  // 每次渲染都会创建一个新的样式对象，导致子组件重新渲染
  const style = { color: "red", fontSize: "16px" };

  // 每次渲染都会创建一个新的函数引用
  const handleClick = () => {
    console.log("Clicked");
  };

  return <ChildComponent style={style} onClick={handleClick} data={data} />;
}

// 好的做法：使用 useMemo 和 useCallback 缓存对象和函数
function GoodComponent({ data }) {
  // 只有当依赖项变化时才会创建新的样式对象
  const style = useMemo(() => ({ color: "red", fontSize: "16px" }), []);

  // 只有当依赖项变化时才会创建新的函数引用
  const handleClick = useCallback(() => {
    console.log("Clicked");
  }, []);

  return <ChildComponent style={style} onClick={handleClick} data={data} />;
}
```

#### 2.3.5 使用不可变数据

使用不可变数据可以简化比较过程，提高性能：

```jsx
// 不好的做法：直接修改对象
function BadUpdateComponent({ user }) {
  const handleUpdateName = (newName) => {
    user.name = newName; // 直接修改对象
    setUser(user); // 引用没有变化，可能不会触发重新渲染
  };

  return (
    <div>
      <input
        value={user.name}
        onChange={(e) => handleUpdateName(e.target.value)}
      />
    </div>
  );
}

// 好的做法：创建新对象
function GoodUpdateComponent({ user, setUser }) {
  const handleUpdateName = (newName) => {
    setUser({ ...user, name: newName }); // 创建新对象
  };

  return (
    <div>
      <input
        value={user.name}
        onChange={(e) => handleUpdateName(e.target.value)}
      />
    </div>
  );
}
```

### 2.4 与 Vue3 diff 算法的对比分析

React 和 Vue 3 都使用虚拟 DOM 和 Diff 算法来优化 DOM 更新，但它们的实现方式有一些区别。

#### 2.4.1 基本比较策略

**React**：

- 采用从左到右的单向遍历方式
- 使用 `key` 属性识别节点
- 基于类型和 `key` 判断节点是否可复用

**Vue 3**：

- 采用双端比较算法（从两端向中间比较）
- 使用 `key` 属性识别节点
- 使用最长递增子序列算法优化节点移动

React vs Vue3 Diff 算法对比图：

- React Diff：单向遍历 → 从左到右依次对比 → 使用 key 标识节点 → 找到可复用节点计算移动位置
- Vue3 Diff：双端比较 → 首尾指针同时遍历 → 使用 key 标识节点 → 最长递增子序列优化移动
- 性能对比：React（从左到右移动多个节点）→ 多次 DOM 操作；Vue3（计算最优移动方案）→ 最少 DOM 操作

#### 2.4.2 列表对比算法

**React**：

React 的列表对比算法相对简单，它从左到右遍历新旧列表，使用 `key` 属性识别节点。当发现节点位置变化时，React 会移动节点。

```jsx
// React 的列表对比示例
// 旧列表：A, B, C, D
// 新列表：B, C, E, A

// React 的处理方式：
// 1. 比较第一个节点：A vs B，不匹配，在旧列表中查找 B
// 2. 在旧列表中找到 B，将 B 移动到新位置
// 3. 比较第二个节点：C vs C，匹配，不需要移动
// 4. 比较第三个节点：D vs E，不匹配，在旧列表中查找 E
// 5. 在旧列表中找不到 E，创建新节点 E
// 6. 比较第四个节点：无 vs A，在旧列表中查找 A
// 7. 在旧列表中找到 A，将 A 移动到新位置
// 8. 删除旧列表中未使用的节点 D
```

**Vue 3**：

Vue 3 使用双端比较算法，同时从列表的两端向中间比较。这种方法可以减少节点移动的次数。

```jsx
// Vue 3 的列表对比示例
// 旧列表：A, B, C, D
// 新列表：B, C, E, A

// Vue 3 的处理方式：
// 1. 比较头部节点：A vs B，不匹配
// 2. 比较尾部节点：D vs A，不匹配
// 3. 比较头部和尾部：A vs A，匹配，将 A 移动到新位置
// 4. 比较新头部和旧尾部：B vs D，不匹配
// 5. 在旧列表中查找 B，找到后将 B 移动到新位置
// 6. 比较新头部和旧头部：C vs C，匹配，不需要移动
// 7. 创建新节点 E
// 8. 删除旧列表中未使用的节点 D
```

此外，Vue 3 还使用最长递增子序列算法来最小化节点移动的次数。这种算法可以找出不需要移动的最长节点序列，只移动其他节点。

#### 2.4.3 静态优化

**React**：

- React 的优化主要依赖于开发者使用 `React.memo`、`shouldComponentUpdate` 等手动优化
- React 18 引入了自动批处理和并发渲染等特性，但仍需要开发者显式使用

**Vue 3**：

- Vue 3 的编译器可以静态分析模板，标记静态节点和动态节点
- 静态节点在首次渲染后会被缓存，不参与后续的 Diff 过程
- Vue 3 使用 Proxy 进行细粒度的响应式追踪，只更新实际变化的部分

```jsx
// Vue 3 的静态优化示例
// 模板
<template>
  <div>
    <h1>静态标题</h1>
    <p>{{ dynamicContent }}</p>
  </div>
</template>;

// 编译后的渲染函数（简化版）
function render() {
  return _createBlock("div", null, [
    _createVNode("h1", null, "静态标题", PatchFlags.HOISTED), // 静态节点，被提升
    _createVNode("p", null, _toDisplayString(dynamicContent), PatchFlags.TEXT), // 动态节点，只更新文本
  ]);
}
```

#### 2.4.4 性能比较

在某些场景下，Vue 3 的 Diff 算法可能比 React 的更高效：

1. **列表重新排序**：Vue 3 的双端比较和最长递增子序列算法可以减少节点移动的次数
2. **静态内容**：Vue 3 的编译时优化可以跳过静态内容的 Diff 过程
3. **细粒度更新**：Vue 3 的响应式系统可以精确追踪变化，只更新需要更新的部分

然而，React 的 Diff 算法也有其优势：

1. **简单性**：React 的 Diff 算法相对简单，易于理解和维护
2. **一致性**：React 的 Diff 算法在各种场景下表现一致
3. **并发模式**：React 18 引入的并发模式可以将长时间的渲染任务分解为小块，提高应用程序的响应性

React 和 Vue 3 的 Diff 算法各有优势，选择哪个框架应该基于项目需求和团队熟悉度，而不仅仅是 Diff 算法的性能。在大多数实际应用中，框架的 Diff 算法性能差异不会成为瓶颈。更重要的是开发者对框架的理解和正确使用。

#### 2.4.5 React 18 的并发特性

React 18 引入了并发渲染的概念，这对 Diff 算法也有影响：

1. **时间切片**：React 可以将渲染工作分解为小块，在浏览器空闲时执行，避免阻塞主线程
2. **优先级调度**：React 可以根据任务的优先级调度渲染工作，先处理高优先级的更新
3. **可中断渲染**：React 可以中断正在进行的渲染，处理更高优先级的更新，然后再回来完成之前的工作

这些特性使 React 能够在保持响应性的同时处理复杂的 UI 更新，但它们并不直接改变 Diff 算法的基本工作方式。

```jsx
// React 18 的并发特性示例
import { startTransition } from "react";

// 低优先级更新
function handleInput(e) {
  // 立即更新输入框的值
  setInputValue(e.target.value);

  // 将过滤操作标记为非紧急
  startTransition(() => {
    // 这个更新可以被中断
    setFilteredResults(filterItems(e.target.value));
  });
}
```

### 2.5 总结与最佳实践

#### 2.5.1 React Diff 算法的关键点

1. **三层比较**：Tree Diff（层级比较）、Component Diff（组件比较）和 Element Diff（元素比较）
2. **启发式策略**：基于实际 DOM 操作的特点，采用启发式策略将时间复杂度从 O(n³) 降低到 O(n)
3. **key 的重要性**：正确使用 `key` 属性可以显著提高列表更新的性能

#### 2.5.2 性能优化最佳实践

1. **合理使用 key**：为列表项提供稳定、唯一的 `key`，避免使用索引作为 `key`（除非列表是静态的）
2. **避免不必要的渲染**：使用 `React.memo`、`PureComponent` 和 `shouldComponentUpdate` 避免不必要的渲染
3. **提取组件**：将大型组件拆分为小型组件，使更新更加精确
4. **使用不可变数据**：不直接修改对象或数组，而是创建新的副本
5. **缓存计算结果和函数**：使用 `useMemo` 和 `useCallback` 缓存计算结果和函数引用
6. **避免在渲染函数中创建新对象或函数**：这会导致子组件不必要的重新渲染
7. **使用 React DevTools 进行性能分析**：识别性能瓶颈，有针对性地进行优化

**不推荐的做法**：

```jsx
function BadComponent({ items }) {
  // 每次渲染都创建新的函数引用
  const handleClick = (id) => {
    console.log("Clicked item:", id);
  };

  // 每次渲染都创建新的对象
  const style = { color: "red" };

  return (
    <div>
      {items.map((item, index) => (
        <Item
          key={index} // 使用索引作为 key
          item={item}
          onClick={() => handleClick(item.id)} // 内联函数
          style={style} // 每次渲染都是新对象
        />
      ))}
    </div>
  );
}
```

**推荐的做法**：

```jsx
function GoodComponent({ items }) {
  // 缓存函数引用
  const handleClick = useCallback((id) => {
    console.log("Clicked item:", id);
  }, []);

  // 缓存样式对象
  const style = useMemo(() => ({ color: "red" }), []);

  return (
    <div>
      {items.map((item) => (
        <Item
          key={item.id} // 使用唯一 ID 作为 key
          item={item}
          onClick={handleClick} // 传递缓存的函数
          style={style} // 传递缓存的对象
        />
      ))}
    </div>
  );
}
```

#### 2.5.3 理解 Diff 算法的限制

虽然 React 的 Diff 算法非常高效，但它仍有一些限制：

1. **不识别跨层级移动**：如果一个节点在树中的位置发生变化，React 会删除旧节点并创建新节点，而不是移动它
2. **列表更新依赖于 key**：如果没有提供合适的 `key`，列表更新可能会导致不必要的 DOM 操作
3. **深层组件树的更新开销**：对于深层嵌套的组件树，即使是小的状态变化也可能导致大量的 Diff 计算

了解这些限制可以帮助开发者编写更高效的 React 应用程序，避免常见的性能陷阱。

记住：过早优化是万恶之源。在实际应用中，大多数 React 应用程序的性能瓶颈不是 Diff 算法本身，而是不当的组件设计和不必要的重新渲染。首先编写清晰、可维护的代码，然后使用性能分析工具识别真正的性能瓶颈，最后有针对性地进行优化。

## 3. React Scheduler

### 一、前面的话

时间过得真快，从 2022 年 6 月份 react 发布[18 版本](https://github.com/facebook/react/tree/v18.2.0)以来(以下简称 v18)，时间已经过去了近两年，很多伙伴都体验到了 v18 带来的新特性，其中并发模式最让人眼前一亮，只要我们使用`createRoot()`的方式来渲染我们的应用，就有机会体验到**并发模式**带来的极致爽感，而支撑并发模式的核心莫过于 react 执行流中的调度引擎——**Scheduler**。

`调度`其实并不是一个新词，在计算机行业中，从操作系统到浏览器，包括一些大型的应用层中都有调度任务的需求，调度这件事情的本质其实就是当面临很多独立的任务的时候，如何在**合理的时机**去执行它们。而今天我们研究的对象就是 Scheduler ，探索它是如何调度 react 产出的任务的。

让人兴奋的是 Scheduler 是一个独立的包，意味着它可以**独立**于 react 在任何其他的库中使用。更重要的是它的整个源码不过**600**多行，在深入理解 react 之前，将 Scheduler 吃透是一个很不错的选择，因为看懂它根本不用看完 react 那深似海的执行流，本文尝试以源码级等角度剖析一下 Scheduler 的实现过程，在深入理解 react 之前打下一个坚实的基础，读完本篇文章或许你会知道以下问题的答案？

1. 为什么需要 Scheduler 以及它解决了什么问题？
2. 什么是 Scheduler 中的优先级？
3. Scheduler 使用什么数据结构维护任务的？
4. Scheduler 是如何实现任务切分的？
5. Scheduler 的执行流是什么样的？
6. 更多其他的......

话不多说，我们开始吧！

### 二、概念

#### 为什么需要？

我们为什么需要调度器呢？

首先是解决卡顿问题，这来自于一个最基本的硬伤，js 引擎和绘制渲染都是在同一个线程里面执行的，两者是互斥的，因此要保证用户正常使用不卡顿，屏幕必须要保证一定帧率的**刷新频率**，这个频率通常是每秒 60 帧。而由于 react 会产生一些 CPU 密集性的大任务，例如几万个**虚拟 DOM**的 diff、遍历等等。这种大任务会阻塞浏览器的绘制，导致页面**卡顿**。

其次是 react 会产生一些具有**优先级概念**的任务，优先级高的任务可能在后面产生，因此需要能够打断优先级低的任务，让优先级高的先执行。以更好的响应用户提高用户体验，比如用户点击，鼠标移动等。

以上就是 react 为什么需要一个调度器！

#### 解决的问题

因此在 react 的执行流中，会产生非常多的任务，这些任务的执行时间有长有短，优先级有大有小。它们统统都会丢给 Scheduler 来进行处理，Scheduler 会有一套自己的机制来决定该如何在合适的时机执行这些任务，来解决**CPU 密集型**和**IO 密集型**的场景。

### 三、体验

正如前面所说 Scheduler 可以单独使用，千言万语不如亲自试一试，因此我们可以直接创建一个工程来体验一下：

```sh
npm init
npm i scheduler -S
```

Scheduler 会暴露很多方法，其中最重要的就是这个  `unstable_scheduleCallback`，它的含义是以某种优先级去调度一个任务。

```jsx
// test.js
const { unstable_scheduleCallback } = require("scheduler");

const tasks = [
  1, 1, 2, 2, 3, 3, 4, 4, 1, 2, 3, 4, 1, 2, 3, 4, 3, 2, 1, 1, 1, 1, 1,
];

tasks.forEach((priority, i) => {
  unstable_scheduleCallback(priority, () => {
    console.log(priority, `第${i}任务`);
  });
});

console.log("script!");

Promise.resolve().then((res) => console.log("script屁股后的微任务"));
```

上面的代码是将一些不同**优先级**（其中值越小优先级越高）的任务陆续交给 Scheduler 来调度，然后顺便测试下调度的执行时机的异步情况。 然后在  **nodejs**  中运行一下，结果如下：

![image.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/967ab7b6185440f5aeac79b02fe7b640~tplv-k3u1fbpfcp-jj-mark:0:0:0:0:q75.image#?w=340&h=466&s=17768&e=png&b=000000)

通过结果我们可以得出结论，Scheduler 会按照优先级的顺序来执行给定的任务，优先级高的就会先执行，如果优先级相同的情况下再按照先注册优先执行。并且只要是交给 Scheduler 的任务都会异步执行，并且是在下一个宏任务中执行。（至于每一个任务是否都是在下一个宏任务，这个我们后面源码部分再了解，先留作疑问！）

> 小结：Scheduler 暴露了一些方法供用户使用，其中  `unstable_scheduleCallback`  可以按照优先级高的先执行来进行调度。

### 四、源码

接下来我们深入窥探一下源码，不过不用担心，我会将不重要的信息过滤掉，帮助大家理解其中最为核心的部分，但是当看完本篇文章，建议还是去细细看下源码，这样会更加的印象深刻，也可以用自己的思考验证一下笔者的理解是否正确。

#### 小根堆

![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/4df6939138154cd3a555d9b3cbb81745~tplv-k3u1fbpfcp-jj-mark:0:0:0:0:q75.image#?w=458&h=627&s=87508&e=png&b=fbfbfb)

熟悉算法与数据结构的同学对这个结构可以说相当了解了，小根堆的本质就是一棵二叉树，它的堆顶永远维持着最小值（业务中对应的就是优先级最高的任务），对外暴露 3 个方法，往堆中塞入一个元素，弹出堆顶元素，获取堆顶元素。

它的具体实现在[这里](https://github.com/facebook/react/blob/main/packages/scheduler/src/SchedulerMinHeap.js)，如果对具体实现感兴趣的伙伴可以关注这个专栏，我后期会出一篇 react 中的算法的文章，来详细剖析一下它们的细节，但在这里可以把它当成一个黑盒就好了。

```jsx
// 比较策略
function compare(a, b) {
  // 使用节点的 sortIndex作为判断依据 ，如果比较不了，就是用ID，也就是顺序了
  // Compare sort index first, then task id.
  var diff = a.sortIndex - b.sortIndex;
  return diff !== 0 ? diff : a.id - b.id;
}
```

Scheduler 是使用上面得比较策略来维护堆顶元素的。

#### 优先级

在 Scheduler 中有 5 种[优先级](https://github.com/facebook/react/blob/main/packages/scheduler/src/SchedulerPriorities.js)

```jsx
var ImmediatePriority = 1;
var UserBlockingPriority = 2;
var NormalPriority = 3;
var LowPriority = 4;
var IdlePriority = 5;
```

每一种优先级都对应了相应的过期时间

```jsx
var IMMEDIATE_PRIORITY_TIMEOUT = -1;
var USER_BLOCKING_PRIORITY_TIMEOUT = 250;
var NORMAL_PRIORITY_TIMEOUT = 5000;
var LOW_PRIORITY_TIMEOUT = 10000;
var maxSigned31BitInt = 1073741823;
```

#### 入口

首先了解几个重要的全局变量

```jsx
var taskQueue = []; // 任务队列
var timerQueue = []; // 延时队列

var taskIdCounter = 1; // 任务id.
var currentTask = null; // 当前正在进行的任务
var currentPriorityLevel = NormalPriority; // 当前任务的优先级

var isPerformingWork = false; // 是否在执行flushWork函数
var isHostCallbackScheduled = false; // 是否有任务在调度
var isHostTimeoutScheduled = false; // 是否有定时器来调度延时任务
```

`taskQueue`  和  `timerQueue`  本质上是一个小根堆，只不过使用数组来实现这个小根堆而已。接下来看入口函数

```jsx
function unstable_scheduleCallback(priorityLevel, callback, options) {
  var currentTime = exports.unstable_now(); // 获取当前时间
  var startTime;

  if (typeof options === 'object' && options !== null) { // 只有在options的情况下才会走这里
    ...
  } else {
    startTime = currentTime;
  }

  var timeout;

  switch (priorityLevel) {
    case ImmediatePriority:
      timeout = IMMEDIATE_PRIORITY_TIMEOUT; // -1
      break;

    case UserBlockingPriority:
      timeout = USER_BLOCKING_PRIORITY_TIMEOUT; //250
      break;

    case IdlePriority:
      timeout = IDLE_PRIORITY_TIMEOUT; // 12天 很大很大
      break;

    case LowPriority:
      timeout = LOW_PRIORITY_TIMEOUT; // 10000ms
      break;

    case NormalPriority:
    default:
      timeout = NORMAL_PRIORITY_TIMEOUT; // 5000ms
      break;
  }

  var expirationTime = startTime + timeout;
  var newTask = {
    id: taskIdCounter++,
    callback: callback,
    priorityLevel: priorityLevel,
    startTime: startTime,
    expirationTime: expirationTime,
    sortIndex: -1
  };

  if (startTime > currentTime) { // 只有在有delay的情况下，才会成立，一般情况下都是等于。
    ...
  } else {
    newTask.sortIndex = expirationTime; // sortIndex其实就是过期时间，越早过期（数值越小）越先执行。
    push(taskQueue, newTask); // 放入taskQueue
    if (!isHostCallbackScheduled && !isPerformingWork) {
      // 第一个任务的时候会走这里，因为默认既没有调度日任务，也没有执行flushWork函数
      isHostCallbackScheduled = true;
      requestHostCallback(flushWork);
    }
  }

  return newTask;
}
```

这段代码理解起来并不难，总的来说做了 3 件事情：

1. 根据已知信息创建一个 Task 任务，也就是一个**Task 类型**的对象
2. 将该 task 放入小根堆中
3. 如果是第一个任务，那么执行  `requestHostCallback(flushWork)`  进行调度

### 如何调度

那么  `requestHostCallback`  做了什么呢？

```jsx
function requestHostCallback(callback) {
  scheduledHostCallback = callback; // 其实就是flushWork

  if (!isMessageLoopRunning) {
    // 这个变量代表是否有宏任务在执行
    isMessageLoopRunning = true; // 如果没有去唤醒下一个宏任务
    schedulePerformWorkUntilDeadline();
  }
}
```

当第一个任务被流入 Scheduler 期间是没有正在进行的宏任务的，因此可以看看  `schedulePerformWorkUntilDeadline`  发生了什么

```jsx
schedulePerformWorkUntilDeadline = function () {
  port.postMessage(null);
};
```

Scheduler 用了很多补丁来实现这个  `schedulePerformWorkUntilDeadline`，但是现代浏览器基本上都支持  [MessageChannel](https://developer.mozilla.org/en-US/docs/Web/API/MessageChannel) ，因此调用它意味着会在下一个宏任务的时候唤醒注册在另外一个**port**的回调函数。也就是这一个  `channel.port1.onmessage = performWorkUntilDeadline;`

```jsx
var performWorkUntilDeadline = function () {
  if (scheduledHostCallback !== null) {
    // 其实也就是之前赋值的flushWork
    var currentTime = exports.unstable_now(); // 获取当前的时间
    startTime = currentTime; //全局的startTime，用来记录当前这批任务的调度开始时间，用来判断是否用完切片用的。
    var hasTimeRemaining = true; // 永远只可能为true.
    var hasMoreWork = true;
    try {
      hasMoreWork = scheduledHostCallback(hasTimeRemaining, currentTime); // 也就是执行flushWork
    } finally {
      if (hasMoreWork) {
        schedulePerformWorkUntilDeadline(); // 如果task队列中还有，继续在下一个宏任务中调度
      } else {
        // 如果清空了队列，清空一下全局变量。
        isMessageLoopRunning = false;
        scheduledHostCallback = null;
      }
    }
  } else {
    isMessageLoopRunning = false;
  }
};
```

`performWorkUntilDeadline`  其实就是做了一件事情，执行  `flushWork`，我们来看下它做了什么：

```jsx
function flushWork(hasTimeRemaining, initialTime) { // initialTime是这一批任务的开始时间
  isHostCallbackScheduled = false; // 这个变量只有在flushWork的时候才会被释放。
  isPerformingWork = true;
  var previousPriorityLevel = currentPriorityLevel;
  try {
    ...
    return workLoop(hasTimeRemaining, initialTime);
  } finally {
    currentTask = null;
    currentPriorityLevel = previousPriorityLevel;
    isPerformingWork = false;
  }
}
```

`flushWork`  其实也仅仅只是调用了  `workLoop`，而  `workLoop`  才是调度的核心。

```jsx
function workLoop(hasTimeRemaining, initialTime) {
  var currentTime = initialTime;
  currentTask = peek(taskQueue);
  while (currentTask !== null) {
    if (currentTask.expirationTime > currentTime && (!hasTimeRemaining || shouldYieldToHost())) {
      // 如果 expriationTime > currentTime 说明任务还没有过期，否则过期了，过期了会尽可能早点执行，因此不会进入到这里
      // 没有过期的情况下 ， hasTimeRemaining 一般情况下就是为true，所以主要是看 shouldYieldToHost 结构，返回true（说明时间片已经用完了，需要异步执行）进入到这里，否则
      break;
    }

    var callback = currentTask.callback;

    if (typeof callback === 'function') {
      currentTask.callback = null; // 如果当前任务的函数置为null
      currentPriorityLevel = currentTask.priorityLevel;
      var didUserCallbackTimeout = currentTask.expirationTime <= currentTime; // 说明当前任务过期了，
      var continuationCallback = callback(didUserCallbackTimeout); // 这个才是真正用户提供的任务函数
      currentTime = exports.unstable_now();

      if (typeof continuationCallback === 'function') {
        currentTask.callback = continuationCallback; // 可能会继续执行。
      } else {
        if (currentTask === peek(taskQueue)) {
          pop(taskQueue);
        }
      }

      ...
    } else {
      pop(taskQueue);
    }

    currentTask = peek(taskQueue);
  }

  if (currentTask !== null) {
    return true;
  }
  return false
}
```

这个函数的逻辑是 Scheduler 的核心，我们一点一点来理解。

根据我们之前的分析，当执行流进入到  `workLoop`  的时候意味着已经是下一个宏任务了

![Snipaste_2024-03-20_20-58-43.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/246c1efb4d874cbabb5180c329115683~tplv-k3u1fbpfcp-jj-mark:0:0:0:0:q75.image#?w=269&h=531&s=12579&e=png&b=fdfdfd)

因此由于在 Script 当中我们已经把不同优先级的任务都**同步的**注册完了，因此来到  `workLoop`  的时候堆中应该是有多个任务才对，并且按照优先级大小顺序排列的。

#### 小任务

Scheduler 并没有采取每一个宏任务只完成一个**task**这样的策略，因为这样性能明显不会很好，因为有的任务可能耗时很短，如果留有很大的一块宏任务区间只完成一个很小的任务难免有些浪费，因此 Scheduler 会合并这些小任务在一个宏任务中一起完成，方法就是调度过程中使用一个  `while`  循环来依次取出  `taskQueue`  中的任务，并执行它们。

因此 Scheduler 当遇到小任务的时候，采取的策略是在同一个时间片内一起执行，直到它们的累计时长超过了规定的阈值之后才让出主线程。这个阈值在 Scheduler 中是 5ms，我们可以在[源码](https://github.com/facebook/react/blob/main/packages/scheduler/src/SchedulerFeatureFlags.js#L12C13-L12C31)中窥探的到。

```jsx
var frameYieldMs = 5; // 切片大小
```

判断的方法就是  `shouldYieldToHost`

```jsx
var frameInterval = frameYieldMs;
function shouldYieldToHost() {
  var timeElapsed = exports.unstable_now() - startTime;
  if (timeElapsed < frameInterval) {
    return false; // 说明不应该中断，时间片还没有用完
  }
  return true; // 说明时间片已经用完了
}
```

因为我们知道这一批任务开始的时间，只要所有任务加起来的时间超过  **5ms**  我们就认为要交出主线程了，所以把  `while`  循环  `break`  掉。

最后判断一下  `taskQueue`  中是还存有任务，如果存在返回 true，否则返回 false，这个决定  `performWorkUntilDeadline`  中的  `hasMoreTask`  是否继续调度（可以翻翻看看前面的分析），直到把队列清空为止，而整个过程都是在宏任务中异步完成，根本不会阻塞主线程渲染 UI ，自然也就不会使用户感受到卡顿了。

---

#### 大任务

但是并不是所有的任务都是小任务啊，有的任务很大，可能远远超过 5ms，这个时候该怎么办呢？

实际上，有两种可能，第一种就是用户不管它，直接把这个大任务交给 Scheduler 来进行调度，结果就是 workLoop 在执行完这个任务的时候，已经花了不少时间，下一个任务会  `break`  掉  `while`  循环，然后在下一个任务会在下一个宏任务中调度执行，但是在这个大任务在执行过程中就会阻塞 UI 的绘制，影响用户体验。

第二种就是用户可以利用 Scheduler 的  `shouldYieldToHost`  方法来对大任务进行拆分，将大任务拆称为一个个的小任务然后交给 Scheduler 来执行，这样的话就不会阻塞主线程绘制 UI，获得更流畅的用户体验了，这个该如何去做呢？

这个就需要用户在使用 Scheduler 的时候对大任务的执行方式做一个设计，例如一个同步执行的大任务可以选择将其拆分为若干个独立的小任务用循环去执行，通过类似下面这样的**范式**就可以做到：

```jsx
let current = 0;
let count = 100000;
const bigWork = () => {
  while (current < count && !shouldYieldToHost()) {
    doUnitWork();
    count++;
  }

  if (current < count) {
    // 说明任务还没做完，但是时间片已经到了
    return bigWork;
  }

  return null;
};
```

![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/59e353b8dbd24ca3bee6832d5e56a8f7~tplv-k3u1fbpfcp-jj-mark:0:0:0:0:q75.image#?w=510&h=768&s=33707&e=png&b=fdfdfd)

用户需要将大任务以上面的范式进行改进，然后将大任务拆成极小的细粒度的小任务，然后每次执行小任务的时候都看一下是否用完了 5ms 的时间片，如果用完了就结束执行，这时候大任务可能还没有执行完，但是因为全局变量保存了大任务的执行进度因此并不会丢失掉信息，然后返回函数本身，这个时候我们再来看一下 Scheduler 是如何处理这种情况的。

```jsx
// workLoop 函数内部

var continuationCallback = callback(didUserCallbackTimeout); // 执行过后
currentTime = getCurrentTime();
if (typeof continuationCallback === "function") {
  currentTask.callback = continuationCallback;
} else {
  if (currentTask === peek(taskQueue)) {
    pop(taskQueue);
  }
}
```

可以看到当函数有返回值且返回值为一个函数的时候，本来清空的又会被赋值为该函数，并且最重要一点本次执行的任务不会在  `taskQueue`  中被移除，那么继续往下走，就会在下一个宏任务中被继续调度，因为上一次执行的大任务依然在堆顶，所以这一次执行的依然是它，借助全局变量中保存的信息，任务便会被回复执行，这样即便在大任务的情况下也不会阻塞 UI 的绘制了。

事实上 react 的并发模式就是通过这样的方式来实现大任务的更新的，如下所示：

```jsx
function workLoopConcurrent() {
  // Perform work until Scheduler asks us to yield
  while (workInProgress !== null && !shouldYield()) {
    performUnitOfWork(workInProgress); // 处理每一个fiber节点
  }
}
```

> 小结：  
> 我们通过上面内容知道了 workLoop 的工作流程，Scheduler 的调度流程的主要核心宗旨就是在不阻塞浏览器绘制的大前提下尽可能多的执行任务。如果用户提供的任务很小（耗时短）就会合并起来批量同步执行，如果任务比较大需要用户配合着 Scheduler 将任务拆分成若干小任务分批次的执行。总而言之，Scheduler 总会恰到好处的将我们的给定的任务按照优先级尽快的执行，且并不阻碍 UI 的绘制。

---

#### 饥饿问题

在任务调度的话题里永远都有一个饥饿问题，意思是说在调度器接受到一堆任务之后，它们就会按照优先级的大小排列起来，当调度器取出一个最高优先级的任务执行的过程中，也是有可能继续往队列里面填充任务的，如果这个最高优先级产生的任务的优先级永远都比其他任务优先级高，那其他的低优先级任务就永远不可能得到执行，相当于在排队过程中一直有人插队，这就是著名的**饥饿问题**， Scheduler 是如何解决这个问题的呢？

正如上面所说在 Scheduler 中是用小根堆来维护优先级队列的，我们再来看一下入队列的代码：

```JS
// 简化后的代码
function unstable_scheduleCallback(priorityLevel, callback, options) {
  ...
  var startTime = exports.unstable_now();
  var timeout = 根据优先级确定一个值 // -1 | 250 | 1000 | 5000 | 12 天
  var expirationTime = startTime + timeout;
  var newTask = {
    id: taskIdCounter++,
    callback: callback,
    priorityLevel: priorityLevel,
    startTime: startTime,
    expirationTime: expirationTime,
    sortIndex: -1
  };

  newTask.sortIndex = expirationTime;
  push(taskQueue, newTask);
  ...

  return newTask;
}

```

决定在堆中是否处于高位的核心是  `sortIndex` ，也就是取决于  `expirationTime`  的大小，而它由两部分构成，分别是  `startTime`  和  `timeout` ，我们可以想象一下，当一个低优先级任务进到队列里的时候，其实随着时间的推移它的优先级会越来越高的，因为优先级的值越小优先级越高，随着时间的推移后进来的任务即便优先级比较高，但是  `startTime`  的值会越来越大的，因此意味着后来者它们一出生就带着更重的负担，相对而言，原来优先级低的任务它们因为先进入队列所以就显得优先级在逐步升高了。

Scheduler 体系下的优先级并不是一个一锤子买卖，在调度任务的过程中它们的优先级也会**动态**的调整。

我们甚至可以推断，当一个优先级到了过期时间之后，它一定会处于堆顶，新进来的任务无论优先级多高都不可能再超越它了。

我们举个简单例子来说明这一点：

例如刚开始有两个任务 A1 B2。

字母代表任务名，数字代表优先级。假设刚开始 startTime 的值为 100，那么在堆中应该是这样的。

![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/78614b1cdc0c4223b27396172d62c420~tplv-k3u1fbpfcp-jj-mark:0:0:0:0:q75.image#?w=334&h=392&s=16781&e=png&b=fcfcfc)

然后根据我们之前分析的调度策略，A1 被取出来执行，假设它花了 300ms ，在它任务的末尾又添加了一个优先级为 1 的任务 C1 ，这个时候在计算 C1 的 sortIndex 的时候，就会取当前时间  `startTime` ，由于经过了 250ms，所以当前时间一定大于或等于 400 ，最终计算得到的 stortIndex 必然是要高于 350 的，因此即便后来者优先级再高都不会超过 B2 ，所以 B2 就会在下一个周期中优先执行。

![image.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/ada50fa23d2145458001d0a638467016~tplv-k3u1fbpfcp-jj-mark:0:0:0:0:q75.image#?w=224&h=357&s=12702&e=png&b=fcfcfc)

> 小结  
> 在 Scheduler 中优先级并不是一成不变的，而是在调度过程中动态分配变化的

### 五、最后的话

实际上 Scheduler 中一共维护了两个队列，本文并没有提到关于  `timerQueue`  的相关信息，那是因为在 react 的调度流程中基本不会涉及到  `timerQueue`  所以如果单纯理解 react 其实以上的知识已经足够，出于篇幅原因，timerQueue 相关的信息我会在后续的文章中进行详细分析。

# 练习题

#### **初级副本：React 基础强化**

**目标**：掌握核心概念与基础 Hook 应用  
**难度**：★☆☆☆☆

```
1. 实现计数器组件：使用useState创建+-按钮控制的计数器
2. 条件渲染：根据状态切换显示「登录/登出」按钮
3. 列表渲染：将['apple','banana']渲染为<ul>列表，并添加删除功能
4. 使用useEffect实现组件挂载时获取API数据（模拟axios.get('/api/data')）
5. 表单处理：创建受控输入框，实时显示输入内容长度
6. 组件通信：父组件向子组件传递颜色值，动态改变子组件背景色
7. 实现useToggle Hook：在true/false状态间切换
8. 使用React.memo优化静态子组件
9. 创建Context提供主题色(light/dark)，在按钮中切换
10. 错误处理：在渲染中捕获JSON.parse错误并显示备用UI
```

---

#### **中级副本：工程化实践**

**目标**：提升复杂场景解决方案设计能力  
**难度**：★★★☆☆

```
1. 实现带防抖的搜索框（useDebounce自定义Hook）
2. 使用useReducer管理购物车状态（添加/删除/清空）
3. 多步骤表单：设计可前进/返回的表单流程组件
4. 性能优化：使用React.lazy+ Suspense实现路由级代码分割
5. 封装数据请求Hook（useFetch），支持loading/error状态处理
6. 深度比较依赖项：实现useDeepCompareEffect
7. 集成第三方库：为React-Router v6添加路由动画
8. 设计可拖拽排序列表（react-dnd或原生实现）
9. 使用Portals实现全局通知组件
10. 测试：为Redux异步action编写Jest测试用例
```

---

#### **高级副本：原理与极致优化**

**目标**：深入框架原理与高并发场景处理  
**难度**：★★★★★

```
1. 实现支持依赖跟踪的useWatch Hook（基于Proxy）
2. 手写简化版React Reconciler（渲染10个动态节点）
3. 设计异步任务调度器：优先渲染高优先级UI（模拟Scheduler）
4. 实现时间切片加载：大数据量列表分块渲染（requestIdleCallback）
5. 可中断渲染：使用useTransition管理耗时操作状态
6. 自定义JSX运行时：实现类似React的createElement函数
7. 微前端方案：设计模块联邦(Module Federation)的React集成
8. WebAssembly集成：在React中调用Rust计算模块
9. 优化Web Worker通信：将CPU密集型任务移出主线程
10. 实现React Server Components的客户端水合方案
```

---
