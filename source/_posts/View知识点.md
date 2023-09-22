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







Keep Moving Forward
