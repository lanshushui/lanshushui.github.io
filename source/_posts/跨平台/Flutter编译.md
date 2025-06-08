---
title: Flutter编译
categories:
  - 跨平台
tags:
  - 知识点
top: 100
abbrlink: 4e1bfd91
---



<!-- more -->

目标：编译出android平台的app.so和资源文件

前提：flutter doctor -v 查看保证android平台的相关配置已完成

命令行:

```c
flutter assemble --output \build -dTargetPlatform=android -dTargetFile="lib/main.dart" -dBuildMode=release -v  -dAndroidArchs=android-arm64 android_aot_bundle_release_android-arm64
```



> 可以通过flutter doctor -v 找到flutter sdk目录
>
> 可以通过flutter assemble -h 可以填写的参数，但是不全的，很多参数都没有列出来
>
> 最重要的 -v参数可以看到编译流程的错误信息，必填



> flutter assemble命令最终可以走到 package:flutter_tools目录下的dark源码，可以在flutter sdk的package文件夹下找到flutter_tools包



##### Target

上面命令的 **android_aot_bundle_release_android-arm64** 是任务的一个target，命令必须指定一个target，flutter提供了很多的target，在flutter_tools\lib\src\commands\assemble.dart可以找到，每个target类都有一个name属性，就是命令填入的参数

![](https://s3.bmp.ovh/imgs/2025/06/08/3a1679999fba1c28.png)



##### BuildMode

-dBuildMode 不能是debug，会出现以下报错

![](https://s3.bmp.ovh/imgs/2025/06/08/61733809390d137a.png)

查看源码后发现

```dart
//flutter_tools\lib\src\base\build.dart
if (!_isValidAotPlatform(platform, buildMode)) {
    _logger.printError('${getNameForTargetPlatform(platform)} does not support AOT compilation.');
    return 1;
}

bool _isValidAotPlatform(TargetPlatform platform, BuildMode buildMode) {
    if (buildMode == BuildMode.debug) {
        return false;
    }
    return const <TargetPlatform>[
        TargetPlatform.android_arm,
        TargetPlatform.android_arm64,
        TargetPlatform.android_x64,
        TargetPlatform.ios,
        TargetPlatform.darwin,
        TargetPlatform.linux_x64,
        TargetPlatform.linux_arm64,
        TargetPlatform.windows_x64,
        TargetPlatform.windows_arm64,
    ].contains(platform);
}
```



##### 产物

![](https://s3.bmp.ovh/imgs/2025/06/08/2bb2a9b1532119a6.png) 

在当前文件夹的build目录下生成以上产物

在[Flutter Host](https://github.com/lanshushui/FlutterHost)基础上，不想接入module的aar，直接挪动上面命令的产物实现Flutter业务接入

我们手动将app.so改名为libapp.so移动到项目的lib/arm64-v8a目录下，将flutter_assets移动到assets目录下，即可实现接入flutter业务代码

**但距离运行起来还缺失三样东西，之后再研究**

1. framework层的embedding ui库

2. arm对应的flutter.so库

3. io.flutter.plugins.GeneratedPluginRegistrant 类

   ```java
   //需要该类的链路
   //1.io.flutter.embedding.engine.FlutterEngine的init方法
   
   // Only automatically register plugins if both constructor parameter and
   // loaded AndroidManifest config turn this feature on.
   if (automaticallyRegisterPlugins && flutterLoader.automaticallyRegisterPlugins()) {
       GeneratedPluginRegister.registerGeneratedPlugins(this);
   }
   
   //2.io.flutter.embedding.engine.plugins.util.GeneratedPluginRegister的registerGeneratedPlugins方法
   Class<?> generatedPluginRegistrant =
       Class.forName("io.flutter.plugins.GeneratedPluginRegistrant");
   Method registrationMethod =
       generatedPluginRegistrant.getDeclaredMethod("registerWith", FlutterEngine.class);
   registrationMethod.invoke(null, flutterEngine);
   ```

module的aar的pom文件依赖能提供1，2产物，自身的aar包能提供3产物和libapp.so和资源文件



Keep Moving Forward

