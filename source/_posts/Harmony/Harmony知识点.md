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



## 鸿蒙组件开发特点

> borderRadius设置的圆角不会限制内部组件，内部组件的四个角会超出圆角范围！！
>
> 采用 [clip(true)方法](https://developer.huawei.com/consumer/cn/doc/harmonyos-references/ts-universal-attributes-sharp-clipping-0000001815927520)

> [LazyForEach必须使用DataChangeListener对象来进行更新，第一个参数dataSource使用状态变量时，状态变量改变不会触发LazyForEach的UI刷新](https://developer.huawei.com/consumer/cn/doc/harmonyos-guides-V2/arkts-rendering-control-lazyforeach-0000001524417213-V2)





Keep Moving Forward
