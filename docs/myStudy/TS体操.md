# TS体操（待完成）

## 简单

### 实现Pick
首先需要知道Pick是什么
Pick，故名思意——挑选。在某个已经存在的类型T中选出指定一组属性K来创建新的类型
其应用
```ts
interface Person{
	name:string,
	age:number,
	address:string
}

type PersonPick = Pick<Person, 'name'|'age'>
//相当于得到， 
interface PersonPick{
	name:string,
	age:number
}
```

```ts
type Pick<T, k extends keyof T> = {
	[P in K]:T[P]
}

```
其原理实现如上
对于`[P in K]:T[P]` ，相当于从K中取出每个属性P，然后新类型的相应属性类型`T`中对应键`p`属性值的类型


### 实现Readonly
Readonly可以声明只读属性，对于实现可读类型可以使用`映射类型完成`
```ts
type Readonly<T>={
	readonly [P in keyof T] : T[P]
}
```


### 实现元组转化为对象
```ts
const tuple = ['a', 'b', 'c'] as const;

type TupleToObject<T extends readonly (keyof any)[]> = {

    [P in T[number]]: P

}
//等同于下面这个
type Object = {a:'a',b:'b',c:'c'}
```
这里`T extends readonly (keyof any)[] ` 相当于是，限制T必须为一个只读元组
`[P in T[number]]`这部分是采用了映射类型语法，它遍历T数组中的每一个元素，`T[number] ` 表示类型T所有元素组成的联合类型（即可以任意访问数组中任意位置的元素）
后面的就是,对于 `T` 数组中的每个元素 `P`，我们在新创建的对象类型中声明一个同名属性，并将其类型设置为 `P`

### 找到第一个/最后一个类型
```ts
type First<T extends any[]> = T extends [infer P, ...any[]] ? P : never

type Last<T extends any[]> = T extends [...any[],infer P]?P:never
```


### 实现Exclude
```ts
type MyExclude<T,U> = T extends U ? never : T 
```
如果T是U的子类型，或者T= =U那么返回never
如果 `T` 中有部分或全部成员不在 `U` 中，则结果类型将包含这些不在 `U` 中的 `T` 的成员


### 实现If效果
```ts
type A = If<true, 'a','b'>
type B = If<false, 'a','b'>

```
大概就是实现这个效果

实现代码
```ts
type If<B extends boolean, T, F> = C extends true ? T : F
```

### 实现concat

效果就是`数组.concat(arr1)`这样子
```ts
type Result = Concat<[1],[2]>
//得到结果是 [1,2]
```
具体实现很简单，直接将两者解构放在一个数组中就行
```ts
type Concat<T extends any[], S extends any[]> = [...T,...U]
```


### 实现Includes

includes其效果如下
```ts
type Includes<T extends readonly any[], U> = {

  [K in T[number]]: true;

}[U] extends true? true : false;
```

1. `[K in T[number]]: true` 使用了映射类型（Mapped Type）的语法，它会遍历 `T` 中的所有元素类型（通过 `T[number]` 来获取），并为每个元素类型 `K` 创建一个新的属性，其属性值为 `true`。例如，如果 `T = [string, number]`，则生成的类型会是 `{ string: true, number: true }`。
2. `[U] extends true? true:false`，是利用索引访问操作符尝试从上一步生成的类型中获取属性U的值



## 中等
### ReturnType
ReturnType的作用：获取函数的返回类型
其使用
```ts
function foo(x:string):number{

	return parseInt(x)
}
type fooType = ReturnType<typeof foo>
```

其实现
```ts
type ReturnType<T> = T extends (...args:any[])=> infer R ? R : never
```

使用`infer R`进行推断函数中的返回类型，并将其赋值给R，然后得到的类型是R


### 实现Omit

Omit是什么？
Omit是一个内置工具，其作用是从一个已存在的对象类型`T`中`剃除`指定的属性键`K`，从而创建一个新的类型
其使用
```ts
type PersonOmiteKey = Omit<Person,'key'>
```
其原理实现
```ts
type MyOmit<T,U> =  Pick<T, Exclude<keyof T, U>>
```
Pick和Exclude都可以手搓，结合上面的
可以实现
```ts
type MyPick<T, K extends keyof T> = {
	[P in K]:T[P]
}
type MyExclude<T,U> = T extends U ? never : T;
type MyOmit<T,U> = MyPick<T,MyExclude<keyof T,U>>
```


### 深度Readonly
即将对象的每一个参数及其子对象递归地设为只读
```ts
type IsObject<T> = keyof T extends never ? false:true//判断是否可枚举

type DeepReadonly<T> = {
	readonly [P in keyof T] : IsObject<T[P]> extends true?
	DeepReadonly<T[P]>:
	T[P]
}
```

事例：
```ts
type obj1 = {

    name: string

    age: number

    address: string

    hobby: [

        string,

        number

    ]

}
type obj2 = DeepReadonly<obj1>
/**

 * type obj2 = {

    readonly name: string;

    readonly age: number;

    readonly address: string;

    readonly hobby: readonly [string, number];

}

 */
```



### 出堆
实现一个POP，接收一个数组并返回一个没有最后一个元素的数组
```ts
type arr1 = ['a','b','c']
type re1 = POP<arr1> //// expected to be ['a', 'b', 'c']
```
其实现如下
```ts
type POP<T extends any[]> = T extends [...infer L,infer R] ? R : never
```