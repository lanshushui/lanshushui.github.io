---
title: 协程Cancel知识点
categories:
  - 知识点
tags:
  - 协程
abbrlink: a442dbbf
---



参考文档：[Kotlin 协程的取消机制超详细解读](https://juejin.cn/post/7158008928930906148#heading-0)

<!-- more -->



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





Keep Moving Forward
