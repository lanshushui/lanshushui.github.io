---
title: React Native知识点
categories:
  - React Native
tags:
  - 知识点
abbrlink: 1dcdc51b
---



[React 官方文档](https://zh-hans.react.dev/reference/react/useRef)

[React Native官方文档](https://reactnative.cn/docs/layout-props)

[理解 JavaScript 的 async/await](https://segmentfault.com/a/1190000007535316)



<!-- more -->

## View属性

###### 实现RelateLayout效果

  子view使用 [`alignSelf`](https://reactnative.cn/docs/layout-props#alignself) 属性选择位置



###### 实现FrameLayout效果

  两个需要重叠的view用一个`View`标签包含起来，需要重叠的子view使用 [`position`](https://reactnative.cn/docs/layout-props#position) 属性【absolute】

  例如把按钮放在视图的底部：  position: 'absolute',  bottom:0

  可以使用 `alignSelf` 实现水平居中



###### 实现LinearLayout的weight效果     

   子view使用  [`flex` ](https://reactnative.cn/docs/layout-props#flex)属性选择大小



###### 控制子View的对其方式

[justifyContent](https://reactnative.cn/docs/layout-props#justifycontent)  控制子元素在主轴的对齐方式

[alignItems](https://reactnative.cn/docs/layout-props#alignitems) 控制子元素在交叉轴的对齐方式

例如父View是垂直展示View，`justifyContent`可以控制子View从底部开始展示，`alignItems`可以控制子View水平居中



###### Image实现圆角

   `borderRadius` 设为宽高的一半



###### Text控件

  文字颜色 使用 `color` 属性



###### [`FlatList`](https://reactnative.cn/docs/flatlist)实现分页展示

- style: 用于设置 FlatList 组件的样式。
- data: 用于指定 FlatList 要渲染的数据数组。
- renderItem: 用于定义每个数据项的渲染方式的函数。
- windowSize: 用于指定 FlatList 渲染窗口的大小，即同时渲染的数据项的数量。
- removeClippedSubviews: 用于指定是否在数据项滚出视图时将其从 DOM 中移除，以提高性能。
- pagingEnabled: 用于指定是否启用分页模式，即每次滚动只显示一个完整的数据项。
- horizontal: 用于指定 FlatList 的滚动方向，true 表示水平滚动，false 表示垂直滚动。
- showsVerticalScrollIndicator: 用于指定是否显示垂直滚动条。
- onViewableItemsChanged: 用于指定当可见项发生变化时的回调函数。
- viewabilityConfig: 用于配置可见性检测的参数，例如指定可见性的阈值。
- bounces: 用于指定是否允许内容超出边界并产生弹性效果。
- overScrollMode: 用于指定滚动超出边界时的行为



###### 动画

[基本用法](https://reactnative.cn/docs/animated#%E8%87%AA%E5%AE%9A%E4%B9%89%E5%8A%A8%E7%94%BB%E7%BB%84%E4%BB%B6)

```react

const MyView = (prop: any) => {
  const [scaleValue] = useState(new Animated.Value(1));
  const showAnimation = () => {
    Animated.timing(scaleValue, {
      toValue: 0.75,
      duration: 300,
      useNativeDriver: true,
    })
  }
  return <Animated.Image
    source={{ uri: 'https://gw.alicdn.com/i1/710600684/O1CN01OwjnvQ1GvJkcNOcpb_!!710600684.jpg_Q75.jpg_.webp' }}
    style={{
      width: 40, height: 40, borderRadius: 20, transform: [{ scale: scaleValue }]
    }}
  />
}
```

1. 动画值必须放在state中保存起来
2. 放大，缩小动画必须放在style的`transform`属性上，透明度动画必须放在style的`opacity`属性上





## 常见问题

`View` 标签视情况，可能会被优化，不会被转换为平台的ViewGroup

`View` 可以不需要宽高参数

```react
//对应 export 
import { A } from 'xxxx'
//对应 export default
import B from 'xxxx'
```



Keep Moving Forward
