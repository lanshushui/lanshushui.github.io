---
title: Kotlin知识点
categories:
  - Android
tags:
  - 协程
abbrlink: a442dbbf
---

<!-- more -->



## 协程

### 取消机制

[Kotlin 协程的取消机制超详细解读](https://juejin.cn/post/7158008928930906148#heading-0)

*协程被cancel后，只有在【运行前】或者【跑到挂起点】才会退出*



```kotlin
val job= CoroutineScope(Dispatchers.Default + SupervisorJob()).launch {
    MLog.info("协程测试", "开始")
    Thread.sleep(5000)
    MLog.info("协程测试","协程是否被cancel ${!isActive}")
    MLog.info("协程测试","协程还在跑")
    delay(1000)
    MLog.info("协程测试","协程跑完了")
}
viewModelScope.launch {
    delay(1000)
    job.cancel()
}
```

对应的日志内容

```
2023-07-03 10:45:21.397 12710-12776 协程测试                    com.sodo.live                        I  协程是否被cancel true
2023-07-03 10:45:21.398 12710-12776 协程测试                    com.sodo.live                        I  协程还在跑
```



代码的目的是在协程运行在Thread.sleep(5000)时，cancel掉协程

看日志可以看出，协程虽然被cancel了，但还在跑，直到运行到挂起点，才退出协程

看参考文档可以知道，此时运行到delay代码时，抛出了CancellationException异常，导致协程结束



协程的调度线程和cancel代码执行线程是同一个时，一般不用太关注这一点，因为符合时序，调用cancel时，协程一定处于被调度前或者运行在挂起点。

但不在同一线程时，可能会出现协程运行在某一行时，调用cancel的场景，但协程此时并不会停止执行，会继续运行到挂起点，这可能就会出现问题

例如资源找不到，View找不到



错误代码样例：

```kotlin
class Activity  {
    var job:Job?=null
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        job= CoroutineScope(Dispatchers.Default + SupervisorJob()).launch {
            val subView =view.findViewById(R.id.test)
            delay(1000)
            subView.gone()
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        job?.cancel()
    }

}
```

概率不大，但也有可能出现崩溃。findViewById过程中，Activity被Destroy了，找不到View出现崩溃

虽然onDestroy方法中协程被cancel了，但协程还是会继续执行delay之前的代码



## Flow 

[【Kotlin Flow】 一眼看全——Flow操作符大全](https://juejin.cn/post/6989536876096913439)



### Flow 的collect的正常用法

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



### *zip*操作符和*combine*操作符区别

1. zip要求 ：两个流发送数据的次数必须一致，1+1 合并成新的数据

   ​     如果A流发两个数据，B流发一个数据，则A流的第二个数据因为找不到B流的对应数据，不会触发zip流的合并发送

2. combine要求：没啥要求，两个流任意一个流的数据刷新，combine流都会取两个流的最新值进行合并



### tryEmit方法

```kotlin
/**
     * Tries to emit a [value] to this shared flow without suspending. It returns `true` if the value was
     * emitted successfully (see below). When this function returns `false`, it means that a call to a plain [emit]
     * function would suspend until there is buffer space available.
     *
     * This call can return `false` only when the [BufferOverflow] strategy is
     * [SUSPEND][BufferOverflow.SUSPEND] **and** there are subscribers collecting this shared flow.
     *
     * If there are no subscribers, the buffer is not used.
     * Instead, the most recently emitted value is simply stored into
     * the replay cache if one was configured, displacing the older elements there,
     * or dropped if no replay cache was configured. In any case, `tryEmit` returns `true`.
     *
     * This method is **thread-safe** and can be safely invoked from concurrent coroutines without
     * external synchronization.
     */
public fun tryEmit(value: T): Boolean
```

**慎用tryEmit，看备注可知，当strategy是BufferOverflow.SUSPEND时（默认策略），且有subscribers时 就会发送失败，返回false**



### StateFlow + data class 的问题

data class 重写了equal，判断每个属性是否相等，而不是判断内存地址

而StateFlow 发现 新旧数据 equal时则不会发送新数据



### LiveData和StateFlow 优缺点

- `StateFlow` 需要将初始状态传递给构造函数，而 `LiveData` 不需要

- LiveData观察者的回调永远发生在主线程；value 是 nullable 的；`LiveData` 是不防抖的；`LiveData` 的 `transformation` 工作在主线程
- Flow属于 Kotlin 协程的一部分，仅 Kotlin 使用；value 空安全；防抖；提供很多操作符支持切换线程
- 当 View 进入 `STOPPED` 状态时，`LiveData.observe()` 会自动取消注册使用方，而从 `StateFlow` 或任何其他数据流收集数据的操作并不会自动停止。如需实现相同的行为，您需要从 `Lifecycle.repeatOnLifecycle` 块收集数据流。





Keep Moving Forward
