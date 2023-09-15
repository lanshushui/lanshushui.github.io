---
title: Android面试
categories:
  - 面试
tags:
  - 面试
hidden: true
abbrlink: 7e8ea226
---

[Kotlin官方文档](https://www.kotlincn.net/docs/reference/coroutines/coroutines-guide.html)

[面试题5星网站](https://lixiangguo.gitbooks.io/mianshi/content/xin-yi-lun-mian-shi-ti.html)

[Android三方库源码分析](https://blog.yorek.xyz/android/3rd-library/3rd-library-source-code/)

<!-- more -->

# Java/Kotlin



## 类/基础：

[java对象生命周期](https://blog.csdn.net/qq_25005909/article/details/78981512)

[反射中Class.forName()和ClassLoader.loadClass()的区别](https://www.cnblogs.com/xiohao/p/8853462.html)

[Java对象的初始化顺序？](https://www.zhihu.com/question/49196023)

[Java enum 枚举类的编译实现](https://blog.csdn.net/yizishou/article/details/71082123)

[直面底层之字节码看try-catch-finally](https://juejin.cn/post/6949365555329679390)



## 语法原理

[Kotlin Sealed原理](https://juejin.cn/post/6859980718588575757)

[协程(13) | 异常处理](https://juejin.cn/post/7093453154297544741#heading-5)

[协程(15) | 挂起函数原理解析](https://juejin.cn/post/7094235540584661029#heading-6)

[kotlin—lateinit及其实现原理](https://www.jianshu.com/p/940bfde4bf23)

[原理分析Kotlin的延迟初始化](https://juejin.cn/post/6844903607817469966)

[Gson 和 Kotlin Data Class 的避坑指南](https://juejin.cn/post/6908391430977224718#heading-1)

[Kotlin 扩展函数实现原理分析](https://www.jianshu.com/p/bab988f5605a)

[Kotlin - 伴生对象与静态成员](https://juejin.cn/post/6923557770851680264)

[构造函数以及init执行顺序](https://juejin.cn/post/7088248200707964936)

[抽丝剥茧聊Kotlin协程之聊聊Job和SupervisorJob的区别](https://zhuanlan.zhihu.com/p/451902120)



## 同步：

[Monitor对象](https://zhuanlan.zhihu.com/p/356010805)

[volatile的可见性和禁止指令重排序怎么实现的？](https://juejin.cn/post/7110203255480647694)

[synchronized与Lock的区别](https://www.cnblogs.com/iyyy/p/7993788.html)

[死磕 java同步系列之自己动手写一个锁Lock](https://mp.weixin.qq.com/s?__biz=MzkxNDEyOTI0OQ==&mid=2247484425&idx=1&sn=9325222b97f0125160ab4098c686c586&source=41#wechat_redirect)

[死磕 java同步系列之AQS起篇](https://mp.weixin.qq.com/s?__biz=MzkxNDEyOTI0OQ==&mid=2247484424&idx=1&sn=761eb25bd21dbfb4f8be0a458d528976&source=41#wechat_redirect)

[为什么ConcurrentHashMap的读操作不需要加锁](https://www.cnblogs.com/keeya/p/9632958.html)



## 泛型

[retrofit / Gson 是怎么获得擦除后的类型的](https://blog.csdn.net/chuyouyinghe/article/details/119958474)

[Kotlin 泛型擦除不要慌，reified 来帮忙](https://mp.weixin.qq.com/s/xL75xFFRQhpz1-qSPLsF5w)



## GC

[Java常见的GC Root](https://www.jianshu.com/p/dcfe84c50811?from=timeline&isappinstalled=0)



## 杂谈

[死锁的四大条件与处理策略](https://cloud.tencent.com/developer/article/1493418)

[常用缓存淘汰算法](https://melonshell.github.io/2020/02/07/ds_cache_eli/)

[面试题 | 等待多个异步任务的结果](https://juejin.cn/post/7121517604644061192)

[Unicode与UTF-8的区别](https://blog.csdn.net/qq_36761831/article/details/82291166)

[并发和并行的区别](https://www.jianshu.com/p/cbf9588b2afb)

[ClassNotFoundException和NoClassDefFoundError的区别](https://segmentfault.com/a/1190000021292121)



## 虚拟机方向

[7 种 JVM 垃圾收集器，看完我跪了。。](https://cloud.tencent.com/developer/article/1592943)



# 网络

[TCP实现可靠传输](https://www.cnblogs.com/walker993/p/9570902.html)

[TCP拥塞控制机制](https://blog.csdn.net/shuxnhs/article/details/80644531)

[TCP报文格式详解](https://www.cnblogs.com/feng9exe/p/8058891.html)

[TCP的三次握手与四次挥手理解](https://blog.csdn.net/qq_38950316/article/details/81087809)

[TCP Keepalive 和 HTTP Keep-Alive 是一个东西吗？](https://www.xiaolincoding.com/network/3_tcp/tcp_http_keepalive.html#tcp-%E7%9A%84-keepalive)

[对HTTP缓存的全面理解](https://juejin.cn/post/7004820701257400333)



# Android



## Activity

[Android 绘制流程](https://juejin.cn/post/6900457708638437390)

[ViewModel 凭什么能保存重建数据](https://juejin.cn/post/6844903913045360648)

[Android onSaveInstanceState/onRestoreInstanceState 原来要这么理解](https://juejin.cn/post/7040819115874844709)



## Broadcast

[LocalBroadcastManager本地广播原理解析](https://juejin.cn/post/6844904183208869902)

[在Android-O上使用隐式广播](https://jerey.cn/android/2018/08/07/%E5%9C%A8Android-O%E4%B8%8A%E4%BD%BF%E7%94%A8%E9%9A%90%E5%BC%8F%E5%B9%BF%E6%92%AD/)

[17 个必须掌握的 BroadcastReceiver 知识点](https://www.cnblogs.com/yuanhao-1999/p/11817955.html)

[基础-四大组件-BroadCastReceiver里是否可以在onReceive中开启线程](https://www.jianshu.com/p/6679afd12a5a)



## Service

[android5.0之后不允许使用隐式Intent启动Service](https://blog.csdn.net/shangming150/article/details/78086237)

[BindService启动的Service为何在Activity销毁时自动解绑](https://blog.csdn.net/b1480521874/article/details/85320844)



## ContentProvider

[ContentProvider初始化](https://juejin.cn/post/6996512754899091487)

[ContentProvider 使用](https://www.jianshu.com/p/ac40ed95d577)

[Android 的这 13 道 ContentProvider 面试题，你都会了吗？](https://developer.aliyun.com/article/764674)

[Android内容服务ContentService原理浅析](https://www.jianshu.com/p/d6af600e4c20)



## Fragment

[Android commit和commitAllowingStateLoss区别及应用场景](https://huxian99.github.io/2016/08/28/cj3qymo360000owxk9zp17alo/)

[Fragment三问—B站真题](https://cloud.tencent.com/developer/article/1735492)



## handler

[Android全面解析之Handler机制（终篇](https://juejin.cn/post/6887933281686421518)



## Binder

[Android跨进程通信：图文详解 Binder机制 原理](https://cloud.tencent.com/developer/article/1394290)

[听说你Binder机制学的不错，来面试下这几个问题](https://developer.aliyun.com/article/951459)



## 动画

[Android 动画：插值器与估值器](https://www.jianshu.com/p/915471529d3c)



## 框架层常用知识

[HandlerThread使用介绍以及源码解析](https://www.cnblogs.com/leipDao/p/8005520.html)

[IntentService的使用和源码分析 ](https://www.cnblogs.com/feidu/p/8074268.html)

[compileSdkVersion、minSdkVersion、targetSdkVersion的区别](https://www.jianshu.com/p/4444513a17b7)

[SharedPreferences apply方法引发ANR](https://juejin.cn/post/7110618131000721416)



## 事件分发

[ViewGroup事件分发总结-TouchTarget](https://juejin.cn/post/6844904065613201421)

[深入理解事件分发 ViewGroup.mFirstTouchTarget的设计](https://www.jianshu.com/p/5951ebdd2a7e)

[Android事件分发机制一：事件是如何到达activity的？](https://segmentfault.com/a/1190000039196805)



## 屏幕刷新

[Android屏幕刷新机制](https://juejin.cn/post/7163858831309537294)

[探索 Android View 绘制流程](https://juejin.cn/post/6904192359253147661#heading-0)

[怎么通过Choreographer计算帧率](https://segmentfault.com/a/1190000039888096)



## Dex

[DEX 文件格式解析](https://juejin.cn/post/6844903847647772686)

[浅谈 Android Dex 文件](https://tech.youzan.com/qian-tan-android-dexwen-jian/)

[压缩包Zip格式详析](https://blog.csdn.net/qq_43278826/article/details/118436116)

[jar包的一些事儿](https://zhuanlan.zhihu.com/p/82320492)

[关于Android的65535限制](https://www.jianshu.com/p/b17ce6e2388c)



# 打包

[android如何多渠道打包?](https://cloud.tencent.com/developer/article/1906336)



## ANR

[Android性能优化杂谈-如何监控和解决ANR问题](https://blog.csdn.net/ljcITworld/article/details/104420422)





# 第三方框架知识点

[Glide 是如何加载 GIF 动图的](https://juejin.cn/post/6939143083866980360)





Keep Moving Forward
