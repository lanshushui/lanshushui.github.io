---
title: Flow知识点
categories:
  - 知识点
tags:
  - Flow
abbrlink: 58bbdd0e
---



[【Kotlin Flow】 一眼看全——Flow操作符大全](https://juejin.cn/post/6989536876096913439)



# 1.Flow 的collect的正常用法

```kotlin
mainScope.launch {
    flow.collect {
        //do something
    }
}
mainScope.launch {
    flow2.collect {
        //do something
    }
}
```

 flow的collect是个suspend函数，内部逻辑是个while(true)死循环，所以不能在collect之后写任何代码，因为执行不到 



<!-- more -->



下面为 **SharedFlowImpl** 的代码

```
override suspend fun collect(collector: FlowCollector<T>): Nothing {
    val slot = allocateSlot()
    try {
        if (collector is SubscribedFlowCollector) collector.onSubscription()
        val collectorJob = currentCoroutineContext()[Job]
        while (true) {
            var newValue: Any?
            while (true) {
                newValue = tryTakeValue(slot) // attempt no-suspend fast path first
                if (newValue !== NO_VALUE) break
                awaitValue(slot) // await signal that the new value is available
            }
            collectorJob?.ensureActive()
            collector.emit(newValue as T)
        }
    } finally {
        freeSlot(slot)
    }
}
```



<font color='red'>如果需要collect一个flow，需要单独起一个协程，该协程内只能collect一个flow，不能在collect函数后面加任何代码</font>





# 2.*zip*操作符和*combine*操作符区别

1. zip要求 ：两个流发送数据的次数必须一致，1+1 合并成新的数据

   ​     如果A流发两个数据，B流发一个数据，则A流的第二个数据因为找不到B流的对应数据，不会触发zip流的合并发送

2. combine要求：没啥要求，两个流任意一个流的数据刷新，combine流都会取两个流的最新值进行合并







Keep Moving Forward
