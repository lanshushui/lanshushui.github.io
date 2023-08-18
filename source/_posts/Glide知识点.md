---
title: Glide知识点
categories:
  - 知识点
tags:
  - Glide
abbrlink: 692dc279
---





# 1.Glide+OKHTTP3



## 1.Glide 接入OKHttp3

```groovy
api("com.github.bumptech.glide:glide:${glide_version}") {
    exclude(group: 'androidx.annotation', module: 'annotation')
}
implementation("com.github.bumptech.glide:okhttp3-integration:${glide_version}"){
    exclude group: "com.squareup.okhttp3", module: "okhttp"
    exclude group: "com.android.support"
    exclude group: "com.squareup.okio", module: "okio"
}

api "com.squareup.okhttp3:okhttp:${okhttp_version}"
```



<!-- more -->



## 2.okhttp3-integration核心代码

```
@GlideModule
public final class OkHttpLibraryGlideModule extends LibraryGlideModule {
  @Override
  public void registerComponents(
      @NonNull Context context, @NonNull Glide glide, @NonNull Registry registry) {
    registry.replace(GlideUrl.class, InputStream.class, new OkHttpUrlLoader.Factory());
  }
}
```



## 3.替换自定义的OKHttpClient

第二步可以看出，arr中使用的是LibraryGlideModule，项目中使用自定义的AppGlideModule，就可以比LibraryGlideModule更晚执行，从而替代自定义的OKHttpClient

```java
@GlideModule
public final class MyGlideModule extends AppGlideModule {
    @Override
    public void registerComponents(
        @NonNull Context context, @NonNull Glide glide, @NonNull Registry registry) {
        OkHttpClient.Builder builder = new OkHttpClient.Builder();
        Call.Factory factory = builder.build();
        registry.replace(GlideUrl.class,InputStream.class, new OkHttpUrlLoader.Factory(factory));
    }
}
```



## 4.GlideModule的registerComponents方法是什么时候被调用的？

![](https://s3.bmp.ovh/imgs/2023/07/31/c035ed8ed3cd009e.jpg)



可以看出是图片下载被解析时，调用getRegistry方法时，如果还未初始化，就会走初始化逻辑，调用registerComponents





# 2.Glide+OKHttp3 线程池分析

## 1.Glide线程池

```java
//com.bumptech.glide.GlideBuilder
Glide build(@NonNull Context context,List<GlideModule> manifestModules, AppGlideModule annotationGeneratedGlideModule) {
    //图片下载线程池
    if (sourceExecutor == null) {
        sourceExecutor = GlideExecutor.newSourceExecutor();
    }
	//硬盘解析线程池
    if (diskCacheExecutor == null) {
        diskCacheExecutor = GlideExecutor.newDiskCacheExecutor();
    }
	//动画解析线程池
    if (animationExecutor == null) {
        animationExecutor = GlideExecutor.newAnimationExecutor();
    }
}
```



![](https://s3.bmp.ovh/imgs/2023/08/16/f29dedbeb0a190b2.jpg)

 图片下载线程池是个【核心4线程，最多4线程】的线程池



![](https://s3.bmp.ovh/imgs/2023/08/16/c4fcc46afe34fc6e.jpg)

  硬盘解析线程池是个【核心1线程，最多1线程】的线程池



![](https://s3.bmp.ovh/imgs/2023/08/16/9d4c9903a1a4901e.jpg)

动画解析线程池是个【核心2线程，最多2线程】的线程池



1. ***在未接入OKHttp3时，Source线程池用于下载图片，可以看出最多支持4个图片同时下载***
2. ***在接入OKHttp3时，Source线程池用于向OKHttp3线程池提交下载任务获得InputStream 基本是瞬间完成提交任务，等Okhttp3下载回调，所以下载图片取决于OKHttp3配置***



## 2.OkHttp3线程池

```kotlin
val executorService: ExecutorService
get() {
    if (executorServiceOrNull == null) {
        executorServiceOrNull = ThreadPoolExecutor(0, Int.MAX_VALUE, 60, TimeUnit.SECONDS,
                                                   SynchronousQueue(), threadFactory("$okHttpName Dispatcher", false))
    }
    return executorServiceOrNull!!
}
```



```kotlin
//okhttp3.Dispatcher
private fun promoteAndExecute(): Boolean {
    this.assertThreadDoesntHoldLock()

    val executableCalls = mutableListOf<AsyncCall>()
    val isRunning: Boolean
    synchronized(this) {
        val i = readyAsyncCalls.iterator()
        while (i.hasNext()) {
            val asyncCall = i.next()

            if (runningAsyncCalls.size >= this.maxRequests) break // 最多支持64个请求
            if (asyncCall.callsPerHost.get() >= this.maxRequestsPerHost) continue // 每个Host最多支持5个请求

            i.remove()
            asyncCall.callsPerHost.incrementAndGet()
            executableCalls.add(asyncCall)
            runningAsyncCalls.add(asyncCall)
        }
        isRunning = runningCallsCount() > 0
    }

    for (i in 0 until executableCalls.size) {
        val asyncCall = executableCalls[i]
        asyncCall.executeOn(executorService)
    }

    return isRunning
}
```

 OKhttp3线程池是无限制的，但最多同时支持64个请求，每个Host同时最多支持5个请求





Keep Moving Forward
