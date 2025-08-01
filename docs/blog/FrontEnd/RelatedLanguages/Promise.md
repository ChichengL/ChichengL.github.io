# Promise 小记

## Promise 的出现背景

Promise 的出现是为了解决`回调地狱`问题

什么是回调地狱？如下所示

```js
function request(cb) {
  // 模拟网络请求
  let flag = Math.random() <= 0.5 ? true : false
  setTimeout(() => {
    cb(flag, flag ? '成功的数据' : '失败的信息')
  }, 1000)
}

console.log('发起请求')

request((status, msg) => {
  console.log(status, msg)
})

request((s1, m1) => {
    request((s2, m2) => {
        request((s3, m3) => {
            // 出现了回调地狱
        }
    })
})

```

多次调用，不仅难以调试，而且难以捕获错误并做出处理

为了`解决回调地狱`问题，因此出现了 Promise。

## 了解 Promise

### Promise 是何物

Promise 是一个内置的`类`，创建 Promise 时需要传入一个回调函数

- 这个回调函数会立即执行，并且有两个参数`resolve`和`reject`
- 当调用 resolve 回调函数时，会执行 Promise.then 方法传入的回调
- 当调用`reject`回调函数时，会执行 Promise.catch 方法传入的回调

比如

```js
const p = new Promise((result, reject) => {
  resolve("result");
});
p.then((res) => {
  console.log("res", res);
}).catch((err) => {
  console.log("err", err);
});
```

支持链式调用，多次链式调用，错误会冒泡到最后一个 catch

`Promise的状态`有三种`pending、fulfilled、rejected`

### resolve 的参数

resolve 传入参数有两种情况

- 如果传入的为`普通的值或者对象`，那么就会被传递到 then 的参数中
- 如果传入的是一个 Promise，那么当前 Promise 的状态会`由传入的Promise决定`

```js
const newPromise = new Promise((resolve, reject) => {
  resolve("success");
});
new Promise((resolve, reject) => {
  // 当前 Promise 的状态由传入的 Promise 去决定

  resolve(newPromise);
})

  .then((res) => {
    console.log("res", res);
  })

  .catch((err) => {
    console.log("err", err);
  });
```

如果传入的是一个对象，并且这个对象实现了 then 方法，也会执行该 then 方法决定后续的状态

```js
new Promise((resolve, reject) => {
  // 如果 resolve 传入的是对象，且该对象实现了 then 方法
  // 则该 Promise 的状态由 then 方法决定
  resolve({
    then(resolve, reject) {
      reject("error");
    },
  });
})
  .then((res) => {
    console.log("res", res);
  })
  .catch((err) => {
    console.log("err", err);
  });
```

### Promise 的实例方法

**1.then 方法**
通过 then，可以对 Promise 中的 resolve 进行处理，then 方法返回的是一个 Promise 实例（这也是能够链式调用的原因）
同时支持多次调用

```js
const newPromise = new Promise((resolve, reject) => {
  resolve("tttttt");
});

newPromise.then((res) => console.log("res1", res)); //res1 tttttt

newPromise.then((res) => console.log("res1", res)); //res1 tttttt

newPromise.then((res) => console.log("res1", res)); //res1 tttttt
```

多次调用的 then 是当前 Promise 中 resolve 传入的

调用 then 方法都是返回的一个 Promise 对象，那么可以进行一个`s操作`

```js
const promise = new Promise((res) => {
  res("test");
});
promise.then(() => "test1").then((res) => console.log(res));
```

猜猜打印的什么？`test`还是`test1`
答案是`test1`，为什么？
这里需要理解一下`.then`之后得到的是什么，then 中的返回值有什么用
实际上，`then`中的返回值，会作为下一个 Promise.then 中的参数
那么

```js
promise.then(() => "test1").then((res) => console.log(res));

//就相当于下面
promise.then(() => {
  return new Promise((res) => {
    res("test1");
  });
});
```

then 中的参数也可以传递

```js
const promise = new Promise((resolve) => {
  resolve("你好");
});
promise
  .then(() => {
    return {
      then(resolve) {
        return resolve("success");
      },
    };
  })
  .then((msg) => {
    // 打印 success
    console.log(msg);
  });
```

**catch**

除了使用`reject`（传入函数的第二个参数）来捕获错误，还可以使用 catch 捕获
catch 也会返回一个 Promise 对象

```js
const promise = new Promise((resolve, reject) => {
  reject("error");
});
promise
  .then(() => {})
  .catch((err) => {
    console.log(err);
  });
```

**finally**，无论 Promise 实例的状态是`fulfilled/rejected`都会执行 finally。
类似于`try ... catch ... finally`

### Promise 类方法

**1.resolve 方法**
除了使用 new Promise 得到一个 Promise 对象还可以使用 resolve 方法

```js
function bar(obj) {
  return Promise.resolve(obj);
}

//其等同于下面的
function bar(obj) {
  return new Promise((res) => {
    res(obj);
  });
}
```

resolve 的参数有几种类型，`Promise、原始值/对象、thenable

**2. reject 方法**
同 resolve 一样，唯一不同的是，其创建的 Promise 状态是一个 rejected

**3.all 方法**
Promise.all()接收一个 Promise 数组，返回一个 Promise 对象。
当所有的 Promise 执行完毕并且都是`fulfilled`时，该实例的状态才会变为`fulfilled`，只要队列中有一个实例的状态是`rejected`，那么该实例的状态也会变`rejected`

```js
let cnt = 0;

function genPromise() {
  return new Promise((resolve) => {
    resolve(`success${(cnt = cnt + 1)}`);
  });
}

const promiseArr = [genPromise(), genPromise(), genPromise()];

Promise.all(promiseArr).then((res) => {
  // [ 'success1', 'success2', 'success3' ]

  console.log("res", res);
});
```

如果有一个是 rejected，那么 Promise.all 返回的实例就为 rejected 状态，且第一个参数是队列中第一个 rejected 的返回值

```js
const promiseArr = [
  genPromise(),
  new Promise((resolve, reject) => {
    reject("error1");
  }),
  new Promise((resolve, reject) => {
    reject("error2");
  }),
];

Promise.all(promiseArr)
  .then((res) => {})
  .catch((err) => {
    // error 1
    console.log(err);
  });
```

**4.allSettled 方法**
因为 all 方法是有缺陷的，如果 Promise 队列中有一个状态为 rejected，那么其他的 fulfilled 以及 pending 的 Promise 实例我们无法捕捉
因此增加了这个方法

- 该方法返回的 Promise 实例，会在所有 Promise 实例执行完毕之后，状态变为 fulfilled
- 无论对垒中的 Promise 状态，都能获取到结果
- 打印的结果会包含`status value/reason`

```js
const promiseArr = [
  new Promise((resolve, reject) => {
    resolve("success1");
  }),
  new Promise((resolve, reject) => {
    reject("error");
  }),
  new Promise((resolve, reject) => {
    resolve("success2");
  }),
];

Promise.allSettled(promiseArr).then((res) => {
  // res [
  //   { status: 'fulfilled', value: 'success1' },
  //   { status: 'rejected', reason: 'error' },
  //   { status: 'fulfilled', value: 'success2' }
  // ]
  console.log("res", res);
});
```

`5.race方法`
Promise.race 方法也接受一个 Promise 队列，但是它会对队列任务进行监听，一旦有 Promise 完成（无论是 fulfilled 还是 rejected）都直接返回，且返回的状态和这第一个完成 Promise 的状态相同

```js
const promiseArr = [
  new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve("success1");
    }, 1000);
  }),
  new Promise((resolve, reject) => {
    setTimeout(() => {
      reject("error");
    }, 2000);
  }),
  new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve("success2");
    }, 3000);
  }),
];

Promise.race(promiseArr)
  .then((res) => {
    console.log("res", res);
  })
  .catch((err) => {
    console.log("err", err);
  });
// 最终打印 res success1
// 如果第二个任务最先完成，那么就会打印 err error
```

**7.any**
和 Promise.race 相似，但是存在区别
any 方法，会等待`一个fulfilled`状态的 Promsie，然后就返回。
如果不存在 fulfilled 状态的，也要等所有执行完毕之后才会返回 Promise 实例的状态

到这里 Promise 大概介绍完毕。
那么可以考虑手动实现一下

## Promise 手写

#### 1.新建类，并且传入执行器 executor

```js
class myPromise {
  constructor(executor) {
    executor();
  }
}
```

#### 2.传入 resolve 和 reject 方法

```js
class myPromise {
  constructor(executor) {
    executor(this.resolve, this.reject);
  }
  resolve = () => {};
  reject = () => {};
}
```

这里使用箭头函数是为了确保 this 指向的问题，让其指向当前实例

#### 3.状态与结果的绑定

```js
const PENDING = "pending";
const FULFILLED = "fulfilled";
const REJECTED = "rejected";

class myPromise {
  //...省略上面写的
  status = PENDING;
  value = null;
  reson = null;
  //修改resolve和reject
  resolve = (value) => {
    if (this.status === PENDING) {
      this.status = FULFILLED;
      this.value = value;
    }
  };
  reject = (reson) => {
    if (this.status === PENDING) {
      this.status = REJECTED;
      this.reason = reason;
    }
  };
}
```

#### 4.简单实现 then

```js
class myPromise {
  //忽略上面的代码
  then(onFulfilled, onRejected) {
    if (this.status === FULFILLED) {
      onFulfilled(this.value);
    } else if (this.status === REJECTED) {
      onRejected(this.reason);
    }
  }
}
```

test

```js
const myPromise = require("./Promise");

const p = new myPromise((res, reject) => {
  res(10);
});

p.then((res) => console.log(res)); //10成功打印
```

#### 实现异步

但是这是同步的，Promise 是支持异步的。
那么在开始就要重新处理一下了，不能太着急处理 Pending 状态

在 Promise 中添加两个新词

```js
class myPromise {
  //...省略上面
  onFulfilledCallback = null;
  onRejectedCallback = null;
  //然后更改then
  then(onFulfilled, onRejected) {
    if (this.status === FULFILLED) {
      onFulfilled(this.value);
    } else if (this.status === REJECTED) {
      onRejected(this.reason);
    } else if ((this.status = PEDING)) {
      //因为状态未知先缓存这两个函数
      this.onFulfilledCallback = onFulfilled;
      this.onRejectedCallback = onRejected;
    }
  }
}
```

更改 resolve 和 rejecte

```js
resolve = (value) => {
  if (this.status === PENDING) {
    this.status = FULFILLED;
    this.value = value;
    this.onFulfilledCallback && this.onFulfilledCallback(value);
  }
};
reject = (value) => {
  if (this.status === PENDING) {
    this.status = REJECTED;
    this.reason = reason;
    this.onRejectedCallback && this.onRejectedCallback(reason);
  }
};
```

尝试一下

```js
const myPromise = require("./Promise.js");

const promise = new myPromise((resolve, reject) => {
  setTimeout(() => {
    resolve("success");
  }, 2000);
});

promise.then((value) => {
  console.log("resolve", value);
}); //2s后打印了'resolve' 'sucess'还不错
```

但是现在只能处理一个回调函数
使用多个 then 时，就会丢失前面的 then
为了避免这种情况，我们可以采用数组存储，将成功或者失败的回调存储起来
然后循环调用

#### 多次调用

```js
onFulfilledCallbacks = [];

onRejectedCallbacks = [];

resolve = (value) => {
  if (this.status === PENDING) {
    this.status = FULFILLED;

    this.value = value;

    this.onFulfilledCallbacks.forEach((cb) => cb(value));
  }
};

reject = (reason) => {
  if (this.status === PENDING) {
    this.status = REJECTED;

    this.reason = reason;

    this.onRejectedCallbacks.forEach((cb) => cb(reason));
  }
};
```

多次调用即可

#### 链式调用

这里需要一个辅助函数，因为可能值是普通值，可能值是 promise

```js
// Promise.js

class myPromise {
  ......
  then(onFulfilled, onRejected) {
    // ==== 新增 ====
    // 为了链式调用这里直接创建一个 MyPromise，并在后面 return 出去
    const promise2 = new MyPromise((resolve, reject) => {
      // 这里的内容在执行器中，会立即执行
      if (this.status === FULFILLED) {
        // 获取成功回调函数的执行结果
        const x = onFulfilled(this.value);
        // 传入 resolvePromise 集中处理
        resolvePromise(x, resolve, reject);
      } else if (this.status === REJECTED) {
        onRejected(this.reason);
      } else if (this.status === PENDING) {
        this.onFulfilledCallbacks.push(onFulfilled);
        this.onRejectedCallbacks.push(onRejected);
      }
    })

    return promise2;
  }
}

function resolvePromise(x, resolve, reject) {
  // 判断x是不是 MyPromise 实例对象
  if(x instanceof MyPromise) {
    // 执行 x，调用 then 方法，目的是将其状态变为 fulfilled 或者 rejected
    // x.then(value => resolve(value), reason => reject(reason))
    // 简化之后
    x.then(resolve, reject)
  } else{
    // 普通值
    resolve(x)
  }
}

```

#### 此外 then 还需要看是否返回的自己

> 如果 then 方法返回的是自己的 Promise 对象，则会发生循环调用，这个时候程序会报错

比如

```js
// test.js

const promise = new Promise((resolve, reject) => {
  resolve(100);
});
const p1 = promise.then((value) => {
  console.log(value);
  return p1;
});
//100
//Uncaught (in promise) TypeError: Chaining cycle detected for promise #<Promise>
```

这里可以交给 resolvePromise 中统一处理

```js
class myPromise {
  //...
  then(onFulfilled, onRejected) {
    if (this.status === FULFILLED) {
      const x = onFulfilled(this.value);
      resolvePromise(promise2, x, resolve, reject);
    }
    //......
  }
}
function resolvePromise(promise2, x, resolve, reject) {
  if (promise2 === x) {
    return reject(
      new TypeError("Chaining cycle detected for promise #<Promise>")
    );
    //...和上面一致
  }
}
```

但是这里 promise2 并没有初始化，因此需要创建一个微任务等待 promise2 完成初始化
then 还要进行改动

```js
class myPromise {
  //....
  then(onFulfilled, onRejected) {
    const promise2 = new myPromise((resolve, reject) => {
      if (this.status === FULFILLED) {
        queueMicrotask(() => {
          const x = onFulfilled(this.value);
          resolvePromise(promise2, x, resolve, reject);
        });
      }
    });
  }
}
```

#### 捕获错误以及 then 链式调用其他状态代码补充

##### 捕获执行器错误

```js
constructor(executor){
	try{
		executor(this.resolve,this.reject)
	}catch(error){
		this.reject(error)
	}
}
```

##### then 执行时错误捕获

在 queueMicrotask 中新增

```js
queueMicrotask(() => {
  try {
    const x = onFulfilled(this.value);
    resolvePromise(promise2, x, resolve, reject);
  } catch (error) {
    reject(error);
  }
});
```

#### 参考 fulfilled 状态下的处理方式，对 rejected 和 pending 状态进行改造

1. 增加异步状态下的链式调用
2. 增加回调函数执行结果的判断
3. 增加识别 Promise 是否返回自己
4. 增加错误捕获

```js
//Promise.js
then(onFulfilled,onRejected){
	const promise2 = new myPromise((resolve,reject)=>{
		if(this.status === FULFILLED){
			queueMicrotask(()=>{
				try{
					const x = onFulfilled(this.value)
					resolvePromise(promise2,x,resolve,reject)
				}catch(error){
					reject(error)
				}
			})
		}else if(this.status === REJECTED){
			//新增
			queueMicro(()=>{
				try{
					const x = onRejected(this.reason)
					resolvePromise(promise2,x,resolve,reject)
				}catch(error){
					reject(error)
				}
			})
		}else if(this.status === PENDING){
			this.onFulfilledCallbacks.push(()=>{
				queueMicrotask(()=>{
					try{
						const x = onFulfilled(this.value)
						resolvePromise(promise2,x,resolve,reject)
					}catch(error){
						reject(error)
					}
				})
			});
			this.onRejectedCallbacks.push(()=>{
				queueMicrotask(()=>{
					try{
						const x = onRejected(this.reason)
						resolvePromise(promise2,x,resolve,reject)
					}catch(error){
						reject(error)
					}
				})
			})
		}
	})
	return promise2
}
```

#### then 参数变得可选

then 可以不传参数，那么可以

```js
promise
  .then()
  .then()
  .then()
  .then((value) => console.log(value));
//打印100
```

在 then 方法时要修改一下

```js
then(onFulfilled,onRejected){
	onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : value => value
	onRejected = typeof onRejected === 'function' ? onRejected : reason => {throw reason}
	const promise2 = new myPromise((res,reject)=>{})
}
```

#### resolve 和 reject 静态方法

```js
class myPromise{
	static resolve(parameter){
		if(parameter instanceof myPromise){
			return parameter
		}
		return new myPormise(resolve => {
			resolve(parameter)
		})
	}
	static reject(reason){
		return new
	}
}
```

整体代码，如下,可以通过 PromiseA+
Promise 的类方法没有实现。

```js
const PENDING = "pending";

const FULFILLED = "fulfilled";

const REJECTED = "rejected";

class myPromise {
  constructor(executor) {
    executor(this.resolve, this.reject);
  }

  status = PENDING;

  value = null;

  reson = null;

  onFulfilledCallbacks = [];

  onRejectedCallbacks = []; //修改resolve和reject

  resolve = (value) => {
    if (this.status === PENDING) {
      this.status = FULFILLED;

      this.value = value;

      this.onFulfilledCallbacks.forEach((cb) => cb(value));
    }
  };

  reject = (reason) => {
    if (this.status === PENDING) {
      this.status = REJECTED;

      this.reason = reason;

      this.onRejectedCallbacks.forEach((cb) => cb(reason));
    }
  };

  then(onFulfilled, onRejected) {
    onFulfilled =
      typeof onFulfilled === "function" ? onFulfilled : (value) => value;

    onRejected =
      typeof onRejected === "function"
        ? onRejected
        : (reason) => {
            throw reason;
          };

    const promise2 = new myPromise((resolve, reject) => {
      const MicrotaskFulfilled = () => {
        queueMicrotask(() => {
          try {
            const x = onFulfilled(this.value);

            resolvePromise(promise2, x, resolve, reject);
          } catch (e) {
            reject(e);
          }
        });
      };

      const MicrotaskRejected = () => {
        queueMicrotask(() => {
          try {
            const x = onRejected(this.reason);

            resolvePromise(promise2, x, resolve, reject);
          } catch (e) {
            reject(e);
          }
        });
      };

      if (this.status === FULFILLED) {
        MicrotaskFulfilled(); //集中处理
      } else if (this.status === REJECTED) {
        MicrotaskRejected();
      } else if ((this.status = PENDING)) {
        //因为状态未知先缓存这两个函数

        this.onFulfilledCallbacks.push(MicrotaskFulfilled);

        this.onRejectedCallbacks.push(MicrotaskRejected);
      }
    });

    return promise2;
  }

  static resolve(parameter) {
    // 如果传入 MyPromise 就直接返回

    if (parameter instanceof myPromise) {
      return parameter;
    } // 转成常规方式

    return new MyPromise((resolve) => {
      resolve(parameter);
    });
  } // reject 静态方法

  static reject(reason) {
    return new myPromise((resolve, reject) => {
      reject(reason);
    });
  }
}

// MyPromise.js

function resolvePromise(promise, x, resolve, reject) {
  // 如果相等了，说明return的是自己，抛出类型错误并返回

  if (promise === x) {
    return reject(
      new TypeError("The promise and the return value are the same")
    );
  }

  if (typeof x === "object" || typeof x === "function") {
    // x 为 null 直接返回，走后面的逻辑会报错

    if (x === null) {
      return resolve(x);
    }

    let then;

    try {
      // 把 x.then 赋值给 then

      then = x.then;
    } catch (error) {
      // 如果取 x.then 的值时抛出错误 error ，则以 error 为据因拒绝 promise

      return reject(error);
    } // 如果 then 是函数

    if (typeof then === "function") {
      let called = false;

      try {
        then.call(
          x, // this 指向 x // 如果 resolvePromise 以值 y 为参数被调用，则运行 [[Resolve]](promise, y)

          (y) => {
            // 如果 resolvePromise 和 rejectPromise 均被调用，

            // 或者被同一参数调用了多次，则优先采用首次调用并忽略剩下的调用

            // 实现这条需要前面加一个变量 called

            if (called) return;

            called = true;

            resolvePromise(promise, y, resolve, reject);
          }, // 如果 rejectPromise 以据因 r 为参数被调用，则以据因 r 拒绝 promise

          (r) => {
            if (called) return;

            called = true;

            reject(r);
          }
        );
      } catch (error) {
        // 如果调用 then 方法抛出了异常 error：

        // 如果 resolvePromise 或 rejectPromise 已经被调用，直接返回

        if (called) return; // 否则以 error 为据因拒绝 promise

        reject(error);
      }
    } else {
      // 如果 then 不是函数，以 x 为参数执行 promise

      resolve(x);
    }
  } else {
    // 如果 x 不为对象或者函数，以 x 为参数执行 promise

    resolve(x);
  }
}

myPromise.deferred = function () {
  var result = {};

  result.promise = new myPromise(function (resolve, reject) {
    result.resolve = resolve;

    result.reject = reject;
  });

  return result;
};

module.exports = myPromise;
```

## async 和 await 实现

async/await 是基于 Promise+Generator 实现的，它的实现原理是：

1. async 函数会返回一个 Promise 对象
2. await 会暂停异步函数的执行，等待 Promise 对象的状态发生改变（fulfilled 或 rejected）
3. 当 Promise 对象的状态发生改变时，执行 generator 函数的后续代码

```js
// 模拟 async 函数
function myAsync(generatorFunction) {
  // 返回一个 Promise 对象，这与原生 async 函数一致
  return function () {
    const generator = generatorFunction.apply(this, arguments);

    // 递归执行 generator 的下一步
    function step(key, arg) {
      let generatorResult;

      try {
        // 执行 generator 的下一步，获取 { value, done }
        generatorResult = generator[key](arg);
      } catch (error) {
        // 发生错误时，Promise 以错误 rejected
        return Promise.reject(error);
      }

      const { value, done } = generatorResult;

      if (done) {
        // 如果 generator 执行完毕，返回最终结果
        return Promise.resolve(value);
      } else {
        // 如果 value 是 Promise，则等待它解决后继续执行
        return Promise.resolve(value).then(
          (result) => step("next", result),
          (error) => step("throw", error)
        );
      }
    }

    // 启动 generator 的执行
    return step("next");
  };
}

// 使用示例
const fetchData = () =>
  new Promise((resolve) => setTimeout(() => resolve("Data fetched"), 1000));

const asyncFunction = myAsync(function* () {
  console.log("Start");
  try {
    // 使用模拟的 await（实际上直接用 yield 即可）
    const data = yield fetchData();
    console.log(data);
    return "Done";
  } catch (error) {
    console.error("Error:", error);
  }
});

// 调用模拟的 async 函数
asyncFunction().then((result) => console.log(result));
```

## 请求相关 AJAX

AJAX -> Asynchronous Javascript and XML 本质上是 JS 向服务端拿取数据

AJAX -> Axios(XHR) || Fetch
XHR VS Fetch

| 功能点                    | XHR      | Fetch    |
| ------------------------- | -------- | -------- |
| 基本请求能力              | ✅       | ✅       |
| 基本获取响应能力          | ✅       | ✅       |
| 监控请求进度              | ✅       | ❌       |
| 监控响应进度              | ✅       | ✅       |
| Service Worker 中是否可用 | ❌       | ✅       |
| 控制 Cookie 的鞋带        | ❌       | ✅       |
| 控制重定向                | ❌       | ✅       |
| 请求取消                  | ✅       | ✅       |
| 自定义 Referrer           | ❌       | ✅       |
| 流                        | ❌       | ✅       |
| API 风格                  | Event    | Promise  |
| 活跃度                    | 停止更新 | 不断更新 |

### 基本请求 + 响应

1. XHR/axios

> [XMLHttpRequest](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest)

[axios](https://axios-http.com/zh/docs/intro)

```js
const xhr = new XMLHttpRequest();
xhr.open("GET", "https://www.baidu.com");
xhr.send();

xhr.onreadystatechange = () => {
  if (xhr.readyState === 4) {
    console.log("xhr", xhr.responseText);
  }
};

const axios = require("axios");
axios.get("https://www.baidu.com").then((res) => {
  console.log("res", res);
});
```

2. fetch

> [fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)

```js
fetch("https://www.baidu.com", {
  method: "GET",
  headers: {
    "Content-Type": "application/json",
  },
}).then((res) => {
  console.log("res", res);
});
```

### 监控请求进度

1. XHR/axios

```js
const xhr = new XMLHttpRequest();
xhr.open("GET", "https://www.baidu.com");
xhr.send();

xhr.onprogress = (event) => {
  console.log("xhr", event);
};
/**
 * 监控响应进度 和下面等效
 */
xhr.addEventListener("progress", (event) => {
  console.log("xhr", event);
});

const axios = require("axios");
axios.get("https://www.baidu.com", {
  onDownloadProgress: (event) => {
    console.log("axios", event);
  },
});
```
