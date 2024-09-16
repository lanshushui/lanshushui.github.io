---
title: Harmony知识点
categories:
  - Harmony
tags:
  - 知识点
  - 鸿蒙
abbrlink: 3066680b
---

[ArkTS基础语法](https://developer.huawei.com/consumer/cn/doc/harmonyos-guides-V2/arkts-basic-syntax-0000001504650057-V2)

[ArkTS容器组件](https://developer.huawei.com/consumer/cn/doc/harmonyos-references/4_4_u5bb9_u5668_u7ec4_u4ef6-0000001862687637)

[ArkTS组件的通用属性](https://developer.huawei.com/consumer/cn/doc/harmonyos-references/5_2_u901a_u7528_u5c5e_u6027-0000001862687533)



[《ArkUI实战》](https://www.arkui.club/)

[**基于Navigation的路由管理**](https://developer.huawei.com/consumer/cn/forum/topic/0204150545294348010)

[**声明式UI中实现组件动态创建**](https://developer.huawei.com/consumer/cn/doc/best-practices-V5/bpta-ui-dynamic-operations-V5)

[鸿蒙开发之android开发人员指南《基础知识》](https://juejin.cn/post/7304538199149412415?searchId=202405091120302872C6F8568234876E6C)

[UIAbility组件概述](https://developer.huawei.com/consumer/cn/doc/harmonyos-guides-V2/uiability-overview-0000001477980929-V2)



<!-- more -->

## Android 和 鸿蒙对标的配置

> match_parent  ==  width("100%")    wrap_content ==  height('auto')

> weight 1 ==  flexGrow(1)

> 宽是1dp的空白View  ==  Blank().width(1).height("100%")

> FrameLayout ==  Stack组件

```typescript
//View实现居中对齐  
Flex({justifyContent :FlexAlign.Center}) {
    Text()
    Text()
}
```





## 基础开发特点

> 子组件定义的变量都可以通过父组件传递过来，不仅限于prop和state变量，普通变量也可以，这是选填参数

| 子组件\父组件 | 普通变量         | prop变量         | state变量        | link变量         |
| :-----------: | ---------------- | ---------------- | ---------------- | ---------------- |
|   普通变量    | 引用传递，同对象 | 引用传递，同对象 | 引用传递，同对象 | 引用传递，同对象 |
|   prop变量    | 值传递，不同对象 | 值传递，不同对象 | 值传递，不同对象 | 值传递，不同对象 |
|   state变量   | 值传递，不同对象 | 引用传递，同对象 | 引用传递，同对象 | 引用传递，同对象 |
|   link变量    | 不允许           | 引用传递，同对象 | 引用传递，同对象 | 引用传递，同对象 |

> **子组件定义的普遍变量，link变量 = 引用传递  ；子组件定义的prop变量= 值传递（不同对象）  ；**
>
> **子组件定义的state变量= 看情况，如果是父组件的普遍变量，则是值传递，否则是引用传递  ；**

>  '@Link', '@Consume',  '@ObjectLink' 装饰的变量不能初始化，必须由父组件传递过来，这也是父组件必传参数
>
>  '@State', '@StorageLink', '@StorageProp', '@LocalStorageLink', '@LocalStorageProp' and '@Provide' 必须本地初始化

> 在aboutToAppear方法内时，组件内的参数都已经由父组件初始化好了

> 鸿蒙 监听一个state 修改另外的state。使用watch装饰器

> [LazyForEach必须使用DataChangeListener对象来进行更新，第一个参数dataSource使用状态变量时，状态变量改变不会触发LazyForEach的UI刷新](https://developer.huawei.com/consumer/cn/doc/harmonyos-guides-V2/arkts-rendering-control-lazyforeach-0000001524417213-V2)

> @Watch设置的函数是同步调用的，即修改@prop变量后会马上调用改函数，然后再执行修改prop变量的下一行代码

> 子组件的prop变量是由父组件的prop或者state变量传递的情况下，如果父组件修改了变量，子组件的prop变量修改是在下一次的事件循环中修改，即如果子组件设置了watch， 顺序是 .1.父组件修改变量 2.执行父组件修改变量的下面代码 3.执行子组件的watch函数

> API12   自定义构建函数的参数传递不能是state参数；因为[调用@Builder装饰的函数默认按值传递](https://developer.huawei.com/consumer/cn/doc/harmonyos-guides-V2/arkts-builder-0000001524176981-V2#section1771518610353)。当传递的参数为状态变量时，状态变量的改变不会引起@Builder方法内的UI刷新。 有这种使用场景抽象成组件，不要用@Builder装饰的函数。



## 业务开发特点

> borderRadius设置的圆角不会限制内部组件，内部组件的四个角会超出圆角范围！！
>
> 采用 [clip(true)方法](https://developer.huawei.com/consumer/cn/doc/harmonyos-references/ts-universal-attributes-sharp-clipping-0000001815927520)

> CustomDialogController可以重复open，传入的builder函数会被重复调用，但其他传入参数是不会变化，例如 传入isModal参数是个函数，也不会被调用，只会使用第一次调用的值

> 组件默认拦截点击事件 ，可通过 enable方法设置

> NavDestination只能有一个子组件，如果有多个子组件，下面的组件不会展示 



## 问题场景

###### 1. API12   Auto属性太坑了 ，强烈推荐不使用。问题：会导致父view的高度不会随着子view变化





Keep Moving Forward
