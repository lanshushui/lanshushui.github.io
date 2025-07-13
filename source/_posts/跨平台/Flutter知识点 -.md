---
title: Flutter知识点
categories:
  - 跨平台
tags:
  - 知识点
top: 100
abbrlink: 1cfedf1f
---

[Flutter开发-使用命令创建Flutter App/Module/Plugin/Package](https://juejin.cn/post/6844903843621257224)

[《Flutter实战·第二版》](https://book.flutterchina.club/chapter2/flutter_package_mgr.html#_2-5-1-%E7%AE%80%E4%BB%8B)

[Flutter Android 工程结构及应用层编译源码深入分析](https://blog.csdn.net/yanbober/article/details/118758871)

[Flutter Android 端 Activity/Fragment 流程源码分析](https://yanbober.blog.csdn.net/article/details/119039500)

[Flutter 混合开发 - 动态下发 libflutter.so & libapp.so](https://juejin.cn/post/7313446602441785382)

[鸿蒙Flutter MD文档](https://gitee.com/openharmony-sig/flutter_samples/tree/5aadae27be32aa85f3c90d27bdd16f27f4413352/ohos/docs/04_development)



> flutter doctor -v 查看Flutter SDK安装路径

> dart format . 格式化内容       dart format . -o none --set-exit-if-changed 判断文件是否格式化，否则报错

> flutter analyze 默认会分析整个项目的 Dart 代码。如果你想跳过某些文件或目录的检测. 在 analysis_options.yaml 中排除文件或目录

<!-- more -->

## 常见知识

> libflutter.so是存放flutter的一些基础类库的so文件，而libapp.so则是存放我们业务代码的so文件。
>
> DEBUG | JIT模式下，我们是没有libapp.so的，业务代码存放在kernel_blob.bin文件中，而在release模式下，是有libapp.so文件的
>
> [知识来源](https://juejin.cn/post/7189533148022046778)

> Flutter Framework层：用Dart编写，封装整个Flutter架构的核心功能，包括Widget、动画、绘制、手势等功能，有Material（Android风格UI）和Cupertino（iOS风格）的UI界面， 可构建Widget控件以及实现UI布局。
>
> Flutter Engine层：用C++编写，用于高质量移动应用的轻量级运行时环境，实现了Flutter的核心库，包括Dart虚拟机、动画和图形、文字渲染、通信通道、事件通知、插件架构等。引擎渲染采用的是2D图形渲染库Skia，虚拟机采用的是面向对象语言Dart VM，并将它们托管到Flutter的嵌入层。shell实现了平台相关的代码，比如跟屏幕键盘IME和系统应用生命周期事件的交互。不同平台有不同的shell，比如Android和iOS的shell。



## 组件知识

#### input

> [Flutter FocusNode输入框焦点控制概述](https://blog.csdn.net/zl18603543572/article/details/106029630)



## 渲染知识

> renderSurface.attachToRenderer 之后flutter就会把UI渲染在FlutterView上。点击操作会触发engine内部的渲染
>
> 但要在 flutterEngine.*lifecycleChannel*.appIsResumed() 之后FlutterView才会UI刷新
>
> appIsPaused 和 appIsInactive状态下FlutterView也会刷新，appIsDetached后才停止更新渲染
>
> 官方demo项目测试：
>
> appIsDetached ->appIsPaused   点击按钮仍会触发UI刷新，appIsDetached状态下的操作触发的UI刷新也会一起显现
>
> appIsDetached ->appIsInactive  点击按钮仍会触发UI刷新，appIsDetached状态下的操作触发的UI刷新也会一起显现
>
> appIsDetached ->appIsResumed点击按钮仍会触发UI刷新，appIsDetached状态下的操作触发的UI刷新也会一起显现
>
> **总结：lifecycleChannel只是切断屏幕的渲染，但engine内部的渲染是一直在继续着的**



##### flutterEngine.*renderer*.isDisplayingFlutterUi 何时为true

![](https://s3.bmp.ovh/imgs/2025/05/28/a2db9c6a10228616.png)

> onFirstFrame回调时设置



Keep Moving Forward
