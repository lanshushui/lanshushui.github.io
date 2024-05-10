---
title: JS，TS 知识点
categories:
  - H5
tags:
  - JS
  - 知识点
abbrlink: dc4ac76f
---



[JS官方文档](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects)

[TS官方文档]()

[理解 JavaScript 的 async/await](https://segmentfault.com/a/1190000007535316)

[【TypeScript】keyof & in 关键字详解](https://juejin.cn/post/7105778922851139598)



<!-- more -->

## 踩坑问题

> 注意 [Boolean('false') returns true](https://stackoverflow.com/questions/56977500/booleanfalse-returns-true)

> 使用encodeURIComponent代替encodeURI 。encodeURIComponent函数则更为严格，它会对URL中的所有特殊字符进行编码 

> proto3碰上 `JSON.stringify` ，默认将enums转为String [官方文档](https://protobuf.dev/programming-guides/proto3/#json)    对象obj中定义了一个toJSON方法 可以影响`JSON.stringify`输出

> JSON.stringify方法在处理Map对象时会将其转换为空对象。处理方案:  转一层数组
>
> ```javascript
> const data = JSON.stringify(Array.from(map))
> const map = new Map<string, boolean>(JSON.parse(res))
> ```

> ...操作符对基础变量是深复制，但对于object变量是浅复制
>
> ```typescript
> const a={
>     a:"",
>     b:{
>         b:""
>     }
> }
> const b={...a}
> b.a="abc"
> b.b.b="bbb"
> console.log(JSON.stringify(a))  //{"a":"","b":{"b":"bbb"}}
> console.log(JSON.stringify(b))  //{"a":"abc","b":{"b":"bbb"}}
> ```

> JSON.stringify 会打印 null ，不会打印 undefined
>
> ```typescript
> const a={
>     a:null,
> }
> const b={
>     a:undefined,
> }
> console.log(JSON.stringify(a))  //{"a":null}
> console.log(JSON.stringify(b)) //{}
> ```

> null ==  undefined 返回 true             null === undefined 返回 false



## 知识点

> [JS中的块级作用域，var、let、const三者的区别](https://cloud.tencent.com/developer/article/1940775)

> *定义接口时*，属性间不用写` , `分隔符   ； 但实现接口时需要加上分隔符

```typescript
//定义
interface FlexStyle {
    borderLeftWidth?: number | undefined;
    borderRightWidth?: number | undefined;
}
//实现
const a: FlexStyle = {}

const b = {
    borderLeftWidth: 5,
    borderRightWidth: 6
}
```

> 因为JS中没有接口的概念，所以ts中判断一个对象是不是实现某个接口，只能通过断言` as `来实现，不能通过` instanceof `   [文档](https://ts.xcatliu.com/basics/type-assertion.html#%E5%B0%86%E4%B8%80%E4%B8%AA%E8%81%94%E5%90%88%E7%B1%BB%E5%9E%8B%E6%96%AD%E8%A8%80%E4%B8%BA%E5%85%B6%E4%B8%AD%E4%B8%80%E4%B8%AA%E7%B1%BB%E5%9E%8B)

> 当一个组件参数是接口时，创造一个组件不能直接传接口实例，要使用{...interfaeA}将接口实例解耦后传入

> 判断一个变量是不是函数     if (typeof (animal as Fish).swim === 'function')

> obj对象被用作if语句的条件。如果obj对象存在（即非null和非undefined），则条件为真。否则，条件为假

>  ?? 是空值合并操作符。它用于检查一个值是否为 null 或 undefined，如果是的话就返回另一个指定的默认值 
>
> ```typescript
> const result = someValue ?? defaultValue;
> ```

>  ??= 类似于 ??，但是如果左侧的值为 null 或 undefined，则会将右侧的值赋给左侧的变量。
>
> ```typescript
> let myVar: string | undefined = undefined;
> myVar ??= "default";
> ```

> 代替kotlin `?: `操作符的方法   表达式对象 || 0，如果对象被视为真（truthy），则整个表达式的结果将是该对象。如果对象被视为假（falsy），则整个表达式的结果将是0

> 虽然没有kotlin `?: `操作符，但有 `boolean ? A : B `操作符

> 异步的箭头函数 const myfunc  = async () => {}

> declare type AType = keyof typeof BClass 
>
> `typeof` 操作符用于获取一个对象的类型，`keyof` 操作符则用于获取该类型的所有属性名。  
>
> 这行代码的整体含义是：我们正在定义一个类型别名 `AType`，它的值是 `BClass` 对象的所有属性名。

> ```javascript
> const a={
>   add:function(){
>   	console.log('sss')
>   }
> }
> //一般简写成
> const a={
>   add(){
>   	console.log('sss')
>   }
> }
> ```





Keep Moving Forward
