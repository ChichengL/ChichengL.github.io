# 手写 Pinia 小记

## Vuex 和 Pinia 的区别

- Pinia 的特点是采用 ts 进行编写的，类型提示友好，体积小。
- 去除 mutations， 保存了 state，getters，actions（包含了同步和异步）
- Pinia 支持 compositionAPI，同时兼顾 OptionsApi
- Vuex 中需要使用 module 定义模块，出现嵌套的树形结构，以此 vuex 中出现命名空间的概念。取值也非常
- Vuex 中允许程序有一个 store
- Pinia 可以采用多个 store，store 之间可以互相调用（扁平化），不用担心命名冲突问题

```vue
new Vuex.Store({ state:{a:1}, module:{ a:{ state:{} } } })
```

## Pinia 的基本结构及 CompositionApi 格式

本次手写的 pinia 主要包含两个函数`createPinia`和`defineStore`

这里介绍一下 createPinia 的作用

- 创建一个 pinia 实例，然后将其挂载到当前实例上。
  - 因为 Pinia 支持 Vue2 和 Vue3 因此，有两种方法进行挂载到相应的实例上，然后最后返回一个 Pinia 实例

`createStore.ts`

```ts
import type { App } from "vue";
import { ref } from "vue";
import { PiniaSymbol } from "./rootState";
export function createPinia() {
  const state = ref({}); ///映射状态

  const pinia = {
    install(app: App) {
      //希望所有组件都访问，this.$pinia
      app.config.globalProperties.$pinia = pinia;
      //   使用provide和inject来访问pinia
      app.provide(PiniaSymbol, pinia);
    },
    state,
    _s: new Map(), //每个store id对应这一个store
  };
  return pinia;
}
```

\_s 是私有属性，主要功能是映射 id->store 的关系，以便后面取出各种 store

state 作为全局状态树的一个起点或者最顶层的状态对象，作为映射状态的

对于各个仓库中`state的数据都是响应式`的，都借用了 vue 的`ref`方法

`store.ts`

```ts
import { computed, getCurrentInstance, inject, reactive, toRefs } from "vue";
import { PiniaSymbol } from "./rootState";

function createOptionStore(id: any, options: any, pinia: any) {
  const { state, actions, getters = {} } = options;

  function setup(store) {
    //用户提供的状态
    pinia.state.value[id] = state ? state() : {};
    const localState = toRefs(pinia.state.value[id]); //解构出去依旧是响应式

    const setupStore = Object.assign(
      localState,
      actions, //用户提供的动作
      Object.keys(getters).reduce((computeds, getterKey) => {
        computeds[getterKey] = computed(() => {
          return getters[getterKey].call(store);
        });
        return computeds;
      }, {})
    );
    return setupStore;
  }

  createSetupStore(id, setup, pinia); //options API需要将这个Api转化为
}
//setupStore 中用户提供了完整的setup方法，直接执行即可
function createSetupStore(id: any, setup: any, pinia: any) {
  const store = reactive({}); //创建响应式对象
  function wrapAction(action: Function) {
    return function () {
      //保证this对象
      return action.call(store, ...arguments);
    };
  }

  const setupStore = setup(store); //拿到的setupStore 可能没有处理过this指向
  for (let key in setupStore) {
    const value = setupStore[key];
    if (typeof value === "function") {
      setupStore[key] = wrapAction(value); //将函数的this永远指向store
    }
  }
  Object.assign(store, setupStore);
  console.log(store);
  pinia._s.set(id, store);
  return store;
}

export function defineStore(idOrOptions: string | any, setup: any) {
  let id: any;
  let options: any;

  if (typeof idOrOptions === "string") {
    id = idOrOptions;
    options = setup;
  } else {
    options = idOrOptions;
    id = idOrOptions.id;
  }
  function useStore() {
    const currentInstance = getCurrentInstance();
    const pinia: any = currentInstance && inject(PiniaSymbol);
    // return store
    //useStore只能在组件中使用
    if (!pinia._s.has(id)) {
      //第一次使用
      //创建选项store，还可能是setupStore
      if (typeof setup === "function") {
        createSetupStore(id, setup, pinia);
      } else {
        createOptionStore(id, options, pinia);
      }
    }
    const store = pinia._s.get(id);
    return store;
  }
  return useStore;
}
```

都知道 defineStore 返回的是一个对象，因此在`useStore`函数最后返回的是`store`对象。

因为 defineStore 支持 vue2 和 vue3 因此有两种风格，OptionsAPI 和 CompositionAPI

对于 OptionsAPI

可能出现

```ts
export const useCounterStore = defineStore("counter", {
  state: () => {
    return {
      count: 0,
    };
  },
  getters: {
    double() {
      return this.count * 2;
    },
  },
  actions: {
    increment(payload: number) {
      this.count += payload;
    },
  },
});
```

这种情况，或者是

```ts
export const useCounterStore = defineStore({
  id: "counter",
  state: () => {
    return {
      count: 0,
    };
  },
  getters: {
    double() {
      return this.count * 2;
    },
  },
  actions: {
    increment(payload: number) {
      this.count += payload;
    },
  },
});
```

对于这种选项式处理，调用的是`createOptionStore` 方法

createOptionStore 方法接收三个参数，当前仓库的名字，配置对象，以及 pinia 实例

createOptionsStore 最终返回的是一个对象

- 通过调用 `options.state()` 初始化并将其值赋给全局 pinia 状态树中对应 id 的位置。
- 然后通过 toRefs 方法，转化为响应式对象，相当于将 state 再包裹一层防止解构丢失响应式
- 然后通过 setup 函数将其内容转化为函数（最终这个函数要返回一个对象），以便后续 CompositionAPI 的统一处理

```tsx
export const useCounterStore = defineStore("counter", () => {
  const count = ref(0);
  const todoStore = useTodoStore();

  const double = computed(() => {
    return count.value * 2;
  });
  const increment = (payload: number) => {
    console.log(todoStore);
    count.value += payload;
  };
  return {
    count,
    double,
    increment,
  };
});
```

在`createSetupStore`方法中对 state 中的属性进行处理

- 首先创建一个响应式对象进行存储值
- 随后调用 setup 方法，拿到一个对象，其中包含 state，getter，actions
- 然后遍历该对象，如果得到的值是 function，那么就将其使用高阶函数处理，以防止解构后丢失 this 指针

- 执行传入的 setup 函数获取处理后的 store 结构，并将其中的函数包装以确保正确的上下文。
- 对于各种操作（actions）调用直接进行调用，然后放在当前仓库上

Object.assign 将 actions 对象上的方法放在 localState 上，以便可以实现`xxxStore.yyy()`进行调用方法

getters 本身就是计算属性，调用 getters 上的方法，然后将其用计算属性包裹得到

```js
Object.keys(getters).reduce((computeds, getterKey) => {
  computeds[getterKey] = computed(() => {
    return getters[getterKey].call(store);
  });
  return computeds;
}, {});
```

这一步相当于是，创建一个新对象，然后执行 getters 上的方法，得到的数据通过 computed 包裹，后放在新对象上

然后通过 Object.assign，将这些属性拷贝到 localState 上

最终得到的是一个`setupStore`

最后放在 pinia.\_s 上
