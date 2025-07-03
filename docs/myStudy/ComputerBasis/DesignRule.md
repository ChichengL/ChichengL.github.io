# 简略认知

设计模式往往代表着最佳实践，是一套被反复使用的、多数人知晓的、经过分类编目的、代码设计经验的总结。

设计模式的原则有如下

- **S 单一职责原则**
  - 一个程序只做好一件事
  - 如果功能过于复杂就拆分开，每个部分保持独立
- - **O 开放/封闭原则**
    - 对扩展开放，对修改封闭
    - 增加需求时，扩展新代码，而非修改已有代码
- L 里氏替换原则
  - 子类能覆盖父类
  - 父类能出现的地方子类就能出现
- I 接口隔离原则
  - 保持接口的单一独立
  - 类似单一职责原则，这里更关注接口
- D 依赖倒转原则
  - 面向接口编程，依赖于抽象而不依赖于具体
  - 使用方只关注接口而不关注具体类的实现
- **A 迪米特法则**
  - 一个对象应当对其他对象尽可能少的了解
  - 降低类与类之间的耦合
- **P 合成复用原则**
  - 尽量使用对象组合，而不是继承来达到复用的目的

设计模式最关键的两个内容是：**解耦和复用**

## 创建型

分为：单例模式、原型模式、工厂模式、抽象工厂模式、建造者模式

### 工厂模式

工厂模式定义一个`用于创建对象的接口`，这个接口由子类决定实例化哪一个类。该模式使一个类的实例化延迟到了子类。而子类可以重写接口方法以便创建的时候指定自己的对象类型。

比如：汉堡王负责生产汉堡，小明只用关心有没有汉堡，而不用关心汉堡是如何制作的。

```js
class Product {
  constructor(name) {
    this.name = name;
  }
  init() {
    console.log("init");
  }
  fun() {
    console.log("fun");
  }
}

class Factory {
  create(name) {
    return new Product(name);
  }
}

// use
let factory = new Factory();
let p = factory.create("p1");
p.init();
p.fun();
```

适用场景：

- 如果你不想让某个子系统与较大的那个对象之间形成强耦合，而是想运行时从许多子系统中进行挑选的话，那么工厂模式是一个理想的选择
- 将 new 操作简单封装，遇到 new 的时候就应该考虑是否用工厂模式；
- 需要依赖具体环境创建不同实例，这些实例都有相同的行为,这时候我们可以使用工厂模式，简化实现的过程，同时也可以减少每种对象所需的代码量，有利于消除对象间的耦合，提供更大的灵活性

### 单例模式

一个类只有一个实例，并提供一个访问它的全局访问点；

```js
class LoginForm {
  constructor() {
    this.state = "hide";
  }
  show() {
    if (this.state === "show") {
      alert("已经显示");
      return;
    }
    this.state = "show";
    console.log("登录框显示成功");
  }
  hide() {
    if (this.state === "hide") {
      alert("已经隐藏");
      return;
    }
    this.state = "hide";
    console.log("登录框隐藏成功");
  }
}
LoginForm.getInstance = (function () {
  let instance;
  return function () {
    if (!instance) {
      instance = new LoginForm();
    }
    return instance;
  };
})();

let obj1 = LoginForm.getInstance();
obj1.show();

let obj2 = LoginForm.getInstance();
obj2.hide();

console.log(obj1 === obj2);
```

#### 优点

- 划分命名空间，减少全局变量
- 增强模块性，把自己的代码组织在一个全局变量名下，放在单一位置，便于维护
- 且只会实例化一次。简化了代码的调试和维护

#### 缺点

- 由于单例模式提供的是一种单点访问，所以它有可能导致模块间的强耦合 从而不利于单元测试。无法单独测试一个调用了来自单例的方法的类，而只能把它与那个单例作为一个单元一起测试。

#### 场景例子

- 定义命名空间和实现分支型方法
- 登录框
- vuex 和 redux 中的 store

## 结构型

### 适配器模式

**将一个类的接口转化为另外一个接口**，以满足用户需求，使类之间接口不兼容问题通过适配器得以解决。

```js
class Plug {
  getName() {
    return "iphone充电头";
  }
}

class Target {
  constructor() {
    this.plug = new Plug();
  }
  getName() {
    return this.plug.getName() + " 适配器Type-c充电头";
  }
}

let target = new Target();
target.getName(); // iphone充电头 适配器转Type-c充电头
```

#### 优点

- 可以让任何两个没有关联的类一起运行。
- 提高了类的复用。
- 适配对象，适配库，适配数据

#### 缺点

- 额外对象的创建，非直接调用，存在一定的开销（且不像代理模式在某些功能点上可实现性能优化)
- 如果没必要使用适配器模式的话，可以考虑重构，如果使用的话，尽量把文档完善

#### 场景

- 整合第三方 SDK
- 封装旧接口

比如 vue 里面的 computed
原有 data 中的数据不满足当前的要求，通过计算属性的规则来适配成我们需要的格式，对原有数据并没有改变，只改变了原有数据的表现形式

### 装饰器模式

- 动态地给某个对象添加一些额外的职责，，是一种实现继承的替代方案
- 在不改变原对象的基础上，通过对其进行包装扩展，使原有对象可以满足用户的更复杂需求，而不会影响从这个类中派生的其他对象
  装饰器本身就是对一个东西进行拓展

```js
class Cellphone {
  create() {
    console.log("生成一个手机");
  }
}
class Decorator {
  constructor(cellphone) {
    this.cellphone = cellphone;
  }
  create() {
    this.cellphone.create();
    this.createShell();
  }
  createShell() {
    console.log("生成手机壳");
  }
}
// 测试代码
let cellphone = new Cellphone();
cellphone.create();

console.log("------------");
let dec = new Decorator(cellphone);
dec.create();
```

ES7 之后也有装饰器对应的语法了。

```js
// 装饰器函数，它的第一个参数是目标类
function classDecorator(target) {
  target.hasDecorator = true;
  return target;
}
// 将装饰器“安装”到Button类上
@classDecorator
class Button {
  // Button类的相关逻辑
}
// 验证装饰器是否生效
console.log("Button 是否被装饰了：", Button.hasDecorator);
```

这个不能直接放在浏览器/node 中运行，因为不支持，需要通过 babel 转义得到。

#### 优点

- 装饰类和被装饰类都只关心自身的核心业务，实现了解耦。
- 方便动态的扩展功能，且提供了比继承更多的灵活性。

#### 缺点

- 多层装饰比较复杂。
- 常常会引入许多小对象，看起来比较相似，实际功能大相径庭，从而使得我们的应用程序架构变得复杂起来

### 代理模式

是为一个对象提供一个代用品或占位符，以便控制对它的访问

> 假设当 A 在心情好的时候收到花，小明表白成功的几率有 60%，而当 A 在心情差的时候收到花，小明表白的成功率无限趋近于 0。 小明跟 A 刚刚认识两天，还无法辨别 A 什么时候心情好。如果不合时宜地把花送给 A，花 被直接扔掉的可能性很大，这束花可是小明吃了 7 天泡面换来的。 但是 A 的朋友 B 却很了解 A，所以小明只管把花交给 B，B 会监听 A 的心情变化，然后选 择 A 心情好的时候把花转交给 A，代码如下：

```js
let Flower = function () {};
let xiaoming = {
  sendFlower: function (target) {
    let flower = new Flower();
    target.receiveFlower(flower);
  },
};
let B = {
  receiveFlower: function (flower) {
    A.listenGoodMood(function () {
      A.receiveFlower(flower);
    });
  },
};
let A = {
  receiveFlower: function (flower) {
    console.log("收到花" + flower);
  },
  listenGoodMood: function (fn) {
    setTimeout(function () {
      fn();
    }, 1000);
  },
};
xiaoming.sendFlower(B);
```

比如 HTML 的事件代理就用到了这个

#### 优点

- 代理模式能将代理对象与被调用对象分离，降低了系统的耦合度。代理模式在客户端和目标对象之间起到一个中介作用，这样可以起到保护目标对象的作用
- 代理对象可以扩展目标对象的功能；通过修改代理对象就可以了，符合开闭原则；

#### 缺点

处理请求速度可能有差别，非直接访问存在开销

#### 不同点

装饰者模式实现上和代理模式类似

- 装饰者模式： 扩展功能，原有功能不变且可直接使用
- 代理模式： 显示原有功能，但是经过限制之后的

## 行为型

### 观察者模式

定义了一种`一对多的关系`，让多个观察者对象同时监听某一个主题对象，这个主题对象的状态发生变化时`就会通知所有的观察者对象`，使它们能够自动更新自己，当一个对象的改变需要同时改变其它对象，并且它不知道具体有多少对象需要改变的时候，就应该考虑使用观察者模式。

```js
// 主题 保存状态，状态变化之后触发所有观察者对象
class Subject {
  constructor() {
    this.state = 0;
    this.observers = [];
  }
  getState() {
    return this.state;
  }
  setState(state) {
    this.state = state;
    this.notifyAllObservers();
  }
  notifyAllObservers() {
    this.observers.forEach((observer) => {
      observer.update();
    });
  }
  attach(observer) {
    this.observers.push(observer);
  }
}

// 观察者
class Observer {
  constructor(name, subject) {
    this.name = name;
    this.subject = subject;
    this.subject.attach(this);
  }
  update() {
    console.log(`${this.name} update, state: ${this.subject.getState()}`);
  }
}

// 测试
let s = new Subject();
let o1 = new Observer("o1", s);
let o2 = new Observer("02", s);

s.setState(12); //执行这个之后，重新打印
```

场景：vue 响应式的实现、Event Bus/Event Emitter
Event Bus 的实质还是一个 Vue 对象（vue2

#### 优点

- 支持简单的广播通信，自动通知所有已经订阅过的对象
- 目标对象与观察者之间的抽象耦合关系能单独扩展以及重用
- 增加了灵活性
- 观察者模式所做的工作就是在解耦，让耦合的双方都依赖于抽象，而不是依赖于具体。从而使得各自的变化都不会影响到另一边的变化。

#### 缺点

过度使用会导致对象与对象之间的联系弱化，会导致程序难以跟踪维护和理解（耦合加深了

观察者模式和发布-订阅模式还很类似。但是还有些细微的差别

比如 A 成员将一个文件上传到群里面，**发布者直接接触订阅者的操作叫做观察者模式**。
如果是通过第三者来实现，比如**发布者不会直接接触订阅者**而是通过第三方来实现真正的通信，就叫**发布-订阅模式**
![](https://files.catbox.moe/zm8me7.png)

### 迭代器模式

在 JS 中，本身也内  
置了一个比较简陋的数组迭代器的实现——Array.prototype.forEach。
ES6 之后通过了 `Symbol.iterator`实现这个之后可以通过`for...of ..`来遍历

```js
const arr = [1, 2, 3];
// 通过调用iterator，拿到迭代器对象
const iterator = arr[Symbol.iterator]();
// 对迭代器对象执行next，就能逐个访问集合的成员
iterator.next();
iterator.next();
iterator.next();
```

可以看看[迭代器协议](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Iteration_protocols)

```js
// 编写一个迭代器生成函数
function* iteratorGenerator() {
  yield "1号选手";
  yield "2号选手";
  yield "3号选手";
}
const iterator = iteratorGenerator();
iterator.next();
iterator.next();
iterator.next();
```

手写一个迭代器

```js
// 定义生成器函数，入参是任意集合
function iteratorGenerator(list) {
  // idx记录当前访问的索引
  var idx = 0;
  // len记录传入集合的长度
  var len = list.length;
  return {
    // 自定义next方法
    next: function () {
      // 如果索引还没有超出集合长度，done为false
      var done = idx >= len;
      // 如果done为false，则可以继续取值
      var value = !done ? list[idx++] : undefined;
      // 将当前值与遍历是否完毕（done）返回
      return {
        done: done,
        value: value,
      };
    },
  };
}
var iterator = iteratorGenerator(["1号选手", "2号选手", "3号选手"]);
iterator.next();
iterator.next();
iterator.next();
```

迭代器的使用
让对象可以使用 for...of 语法

```js
const obj = {
  a: 1,
  b: 2,
  c: 3,
  // 新增一个Symbol.iterator属性，属性值是一个迭代器生成函数
  [Symbol.iterator]: function () {
    // 迭代器生成函数返回的迭代器对象
    const objInner = this;

    const keys = Object.keys(objInner);
    let idx = 0;
    const len = keys.length;
    return {
      // 迭代器对象的next方法
      next() {
        if (idx < len) {
          return {
            done: false,
            value: objInner[keys[idx++]],
          };
        } else {
          return {
            done: true,
            value: undefined,
          };
        }
      },
    };
  },
};
```
