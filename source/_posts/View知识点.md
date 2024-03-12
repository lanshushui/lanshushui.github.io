---
title: View知识点
categories:
  - 知识点
tags:
  - View
abbrlink: 4c65a511
---



<!-- more -->



## 快速找到是哪个View消费了点击事件

```kotlin
//Activity   
override fun dispatchTouchEvent(ev: MotionEvent?): Boolean {
    val re = super.dispatchTouchEvent(ev)
    val decView = (window.decorView as ViewGroup)
    val mFirstTouchTargetF = ViewGroup::class.java.getDeclaredField("mFirstTouchTarget")
    mFirstTouchTargetF.isAccessible = true
    var first = mFirstTouchTargetF.get(decView)
    var consumeView: View = decView
    while (first != null) {
        val viewF = first::class.java.getDeclaredField("child")
        viewF.isAccessible = true
        consumeView = viewF.get(first) as View
        first = if (consumeView is ViewGroup) {
            mFirstTouchTargetF.get(consumeView)
        } else {
            null
        }
    }
    MLog.info(TAG, "consumeView is $consumeView")
    return re
}
```



## 布局问题

1. RelativeLayout的wrap_content会导致layout_marginBottom属性失效

   [RelativeLayout的layout_marginBottom属性失效问题](https://blog.csdn.net/w958796636/article/details/52921584)

2. 外层LinearLayout的宽是wrap_content情况下，内层LinearLayout的宽是match_parent不能铺满屏幕，只能达到wrap_content的效果。为了达到铺满屏幕的效果，内层使用宽是match_parent的RelateLayout控件



Keep Moving Forward
