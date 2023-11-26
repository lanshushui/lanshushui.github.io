---
title: React Native知识点
categories:
  - React Native
tags:
  - 知识点
abbrlink: 1dcdc51b
---



[JS官方文档](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects)

[TS官方文档]()

[React 官方文档](https://zh-hans.react.dev/reference/react/useRef)

[React Native官方文档](https://reactnative.cn/docs/layout-props)

[理解 JavaScript 的 async/await](https://segmentfault.com/a/1190000007535316)



<!-- more -->

## 常见JS问题

> [JS中的块级作用域，var、let、const三者的区别](https://cloud.tencent.com/developer/article/1940775)

> *定义接口时*，属性间不用写` , `分隔符   ； 但实现接口时需要加上分隔符

```react
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

> 判断一个变量是不是函数     if (typeof (animal as Fish).swim === 'function')

> obj对象被用作if语句的条件。如果obj对象存在（即非null和非undefined），则条件为真。否则，条件为假

> 代替kotlin `?: `操作符的方法   表达式对象 || 0，如果对象被视为真（truthy），则整个表达式的结果将是该对象。如果对象被视为假（falsy），则整个表达式的结果将是0

> 使用encodeURIComponent代替encodeURI 。encodeURIComponent函数则更为严格，它会对URL中的所有特殊字符进行编码 

> proto3碰上 `JSON.stringify` ，默认将enums转为String [官方文档](https://protobuf.dev/programming-guides/proto3/#json)    对象obj中定义了一个toJSON方法 可以影响`JSON.stringify`输出

> JSON.stringify方法在处理Map对象时会将其转换为空对象。处理方案:  转一层数组
>
> ```
> const data = JSON.stringify(Array.from(map))
> const map = new Map<string, boolean>(JSON.parse(res))
> ```

## View属性

###### 实现RelateLayout效果

  子view使用 [`alignSelf`](https://reactnative.cn/docs/layout-props#alignself) 属性选择位置



###### 实现FrameLayout效果

  两个需要重叠的view用一个`View`标签包含起来，需要重叠的子view使用 [`position`](https://reactnative.cn/docs/layout-props#position) 属性【absolute】

  例如把按钮放在视图的底部：  position: 'absolute',  bottom:0

  可以使用 `alignSelf` 实现水平居中

  可以使用 `top: '50%'` 实现垂直居中



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

  文字居中  `textAlign: 'center'   textAlignVertical: 'center'`



###### [`FlatList`](https://reactnative.cn/docs/flatlist)实现分页展示

- data: 用于指定 FlatList 要渲染的数据数组。

- renderItem: 用于定义每个数据项的渲染方式的函数。

- windowSize: 用于指定 FlatList 渲染窗口的大小，即同时渲染的数据项的数量。

- removeClippedSubviews: 用于指定是否在数据项滚出视图时将其从 DOM 中移除，以提高性能。

- pagingEnabled: 用于指定是否启用分页模式，即每次滚动只显示一个完整的数据项。

- maxToRenderPerBatch 每次增量渲染的最大数量，性能优化

- initialNumToRender  指定一开始渲染的元素数量，性能优化

- onViewableItemsChanged 可见元素变化

- initialScrollIndex 和getItemLayout 配合使用

  

- handleScrollBeginDrag    按住手指滑动马上触发，即使在最后一页继续滑动也会触发

- onMomentumScrollEnd  与handleScrollBeginDrag对应，可能多次调用

- onScroll 滑动触发，在最后一页继续滑动**不会触发** 



###### 实现下拉提醒 已全部加载的Toast

```react
//使用PanResponder判断是否是下滑
const panResponder = React.useRef(
    PanResponder.create({
        onMoveShouldSetPanResponder: () => {
        return true
      },
      onStartShouldSetPanResponder: () => {
        return true
      },
      onMoveShouldSetPanResponderCapture: () => true,
        onPanResponderGrant: (e: GestureResponderEvent, gestureState: PanResponderGestureState) => {
            if (gestureState.vy < 0) {
                //注册onViewableItemsChanged函数 获得当前显示的页数，isAtBottom函数 判断是否是列表最后一页
                if (!loadMoreEnable.current && isAtBottom()) {
                    showToast()
                }
            }
        },
    }),
)
```



手势事件  [PanResponder](https://blog.csdn.net/zramals/article/details/78403508) 

```
//这个视图是否在触摸开始时想成为响应器？ 
onStartShouldSetPanResponder:this._onStartShouldSetPanResponder,
//所以如果一个父视图要防止子视图在触摸开始时成为响应器，它应该有一个 onStartShouldSetResponderCapture 处理程序，返回 true。
onStartShouldSetPanResponderCapture:this._onStartShouldSetPanResponderCapture,
//当视图不是响应器时，该指令被在视图上移动的触摸调用：这个视图想“声明”触摸响应吗? 
onMoveShouldSetPanResponder:this._onMoveShouldSetPanResponder,
//所以如果一个父视图要防止子视图在移动开始时成为响应器，它应该有一个 onMoveShouldSetPanResponderCapture 处理程序，返回 true。
onMoveShouldSetPanResponderCapture:this._onMoveShouldSetPanResponderCapture,
//当前有其他的东西成为响应器并且没有释放它。 
onPanResponderReject: this._onPanResponderReject,
//视图现在正在响应触摸事件。这个时候要高亮标明并显示给用户正在发生的事情。
onPanResponderGrant: this._onPanResponderGrant,
//手势开始
onPanResponderStart: this._onPanResponderStart,
//手势结束
onPanResponderEnd: this._onPanResponderEnd,
//用户正移动他们的手指 
onPanResponderMove: this._onPanResponderMove,
//在触摸最后被引发，即“touchUp” 
onPanResponderRelease: this._onPanResponderRelease,
//其他的东西想成为响应器。这种视图应该释放应答吗？返回 true 就是允许释放 
onPanResponderTerminationRequest:this._onPanResponderTerminationRequest,
```

异常正常滑动触发的事件顺序

```
onMoveShouldSetPanResponderCapture
onPanResponderGrant
onPanResponderMove(可能没有)
onPanResponderEnd
```



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

> 不能在useEffect定义一个回调形式的闭包去读取useState的值

```react
//错误写法
const View = (prop: any) => {
    const [followState, setFollowState] = useState({isFollow: true})
    useEffect(() => {
        const listener = (map: Map<number, boolean>) => {
            const isFollow = map.get(uid) || false
            if (followState.isFollow != isFollow) { //不能这样子去读取当前组件的followState
                setFollowState({isFollow: isFollow})
            }
        }
        addFollowListener(listener)
        return () => {
            removeFollowListener(listener)
        }
    }, [])
}
//因为listener对象只在页面加载完毕进行有且一次的初始化，无论后续followState怎么变化，listener闭包里拿到的followState都是第一次的值
```





Keep Moving Forward
