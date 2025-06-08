---
title: Flutter module接入流程
categories:
  - 跨平台
tags:
  - 知识点
top: 100
abbrlink: 392219cd
---



**记录 如何将android项目和flutter项目分开，并将flutter以aar形式依赖进APP**

[集成Flutter Module到Android项目的两种方式](https://blog.csdn.net/qq_33183882/article/details/126159961)

<!-- more -->

## 1. 制作Flutter Modle

#### 1.选择New Flutter Project,然后会让我们创建一个Flutter项目,这里我们选择创建类型为Module

![](https://i-blog.csdnimg.cn/blog_migrate/e93af96bfc5d9bb68d51a06ed301c2b9.png)

#### 2.创建完的项目结构：

![](https://s3.bmp.ovh/imgs/2024/11/16/984f9217c9717b4b.png)



#### 3.执行flutter build aar  命令打包aar ，下面记录过程中遇到的问题

加入-v 参数，可以看到命令最终会变成

> D:\flutter\packages\flutter_tools\gradle\aar_init_script.gradle -Pflutter-root=D:\flutter
> -Poutput-dir=D:\fluttermodlue\build\host -Pis-plugin=false -PbuildNumber=1.0 --full-stacktrace --info -Pverbose=true -Ptarget=lib\main.dart -Pdart-obfuscation=false -Ptrack-widget-creation=true
> -Ptree-shake-icons=false -Ptarget-platform=android-arm,android-arm64,android-x64 assembleAarDebug



> 问题1：
>
> Flutter运行时卡在了Running Gradle task ”assembleDebug“解决办法
>
> 方案：
>
> ​	1.换国内仓库镜像  [解决来源-1](https://juejin.cn/post/7352387571086950440) 
>
> ​	2.执行gradlew clean命令  [解决办法-2](https://juejin.cn/post/7092175693466828836)

> 问题2：
>
>  Exception in thread “main“ java.util.zip.ZipException: zip END header not found
>
> 方案：
>
> 换gradle版本 [解决来源](https://blog.csdn.net/LucasXu01/article/details/124003584)

> 问题3：
>
> Could not resolve io.flutter:flutter_embedding_debug:1.0.0-e7f9ef6aa0b9040102d1b3c9a6ae934df746ef94.
>
> 方案：
>
> allprojects {
>     repositories {
>         ......
>        //添加这一行
>         maven { url "https://storage.googleapis.com/download.flutter.io" }
>     }
> }  [解决来源](https://blog.csdn.net/jwg1988/article/details/105492110)

> 问题4：
>
>  Execution failed for task ':app:lint'.
>
> 方案：
>
> 只要在当前app的app/build.gradle文件内增加如下代码
>
> android {     ...   lintOptions {      abortOnError false  }     ... }  [解决来源](https://blog.csdn.net/czhpxl007/article/details/50952543)



#### 4.成功打包aar，并在本地build目录生成仓库

##### 1.控制台会输出一下文案，指导怎么集成该aar

```
Consuming the Module
  1. Open <host>\app\build.gradle
  2. Ensure you have the repositories configured, otherwise add them:

      String storageUrl = System.env.FLUTTER_STORAGE_BASE_URL ?: "https://storage.googleapis.com"
      repositories {
        maven {
            url 'D:\fluttermodlue\build\host\outputs\repo'
        }
        maven {
            url "$storageUrl/download.flutter.io"
        }
      }

  3. Make the host app depend on the Flutter module:

    dependencies {
      debugImplementation 'com.example.fluttermodlue:flutter_debug:1.0'
      profileImplementation 'com.example.fluttermodlue:flutter_profile:1.0'
      releaseImplementation 'com.example.fluttermodlue:flutter_release:1.0'
    }


  4. Add the `profile` build type:

    android {
      buildTypes {
        profile {
          initWith debug
        }
      }
    }

To learn more, visit https://flutter.dev/to/integrate-android-archive

```

##### 2.产生的release类型的aar大概为3.77M，大头为内部的libapp.so

###### 下面为aar的目录结构

![](https://s3.bmp.ovh/imgs/2024/11/16/46f51785a91fb562.png)

提供三个关键产物：

1. pom文件传递依赖 framework层的embedding ui库 
2. pom文件传递依赖 arm对应的flutter.so库
3. aar包本身提供的 io.flutter.plugins.GeneratedPluginRegistrant 类，libapp.so 和 资源文件

###### 下面为aar pom文件，会传递flutter库相关的依赖，framework层的embedding ui库和arm对应的flutter.so库

![](https://s3.bmp.ovh/imgs/2024/11/16/a2756bd5d9e152df.png)

这两个aar都是发布在本地缓存的，以我为例子

C:\Users\username\.gradle\caches\modules-2\files-2.1\io.flutter\flutter_embedding_release\1.0.0-db49896cf25ceabc44096d5f088d86414e05a7aa\9ff06a3e2b6d378066ecec963d00d5d3b288f3

C:\Users\username\.gradle\caches\modules-2\files-2.1\io.flutter\arm64_v8a_release\1.0.0-db49896cf25ceabc44096d5f088d86414e05a7aa\8348ee2deac1be3f2e1aedeae384f576b989eb2



## 2.制作Flutter Host

#### 1.直接New 普通的Android项目

> maven设置仓库地址
>
> ```
> maven {
>     url "file:///D:/fluttermodlue/build/host/outputs/repo/"
> }
> ```

> app目录增加module依赖
>
> ```
>  implementation 'com.example.fluttermodlue:flutter_release:1.0'
> ```

> MainActivity 空实现，直接继承FlutterActivity就行
>
> ```
> class MainActivity : FlutterActivity() {
> 
> }
> ```

#### 2.运行即可，FlutterActivity内部会找默认so库和默认dark函数入口

###### 分析APP目录，lib目录下有libflutter.so 和libapp.so 

![](https://s3.bmp.ovh/imgs/2024/11/16/c0980946c3f8759b.png)



## 3.使用FlutterView展示页面

[NA嵌入Flutter页面](https://juejin.cn/post/6996982173928521764)

##### 代码1：

```kotlin
class MainActivity : Activity() {
    lateinit var flutterEngine: FlutterEngine

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        flutterEngine = FlutterEngine(this)
        flutterEngine.dartExecutor.executeDartEntrypoint(
            //定义默认的入口函数
            DartExecutor.DartEntrypoint.createDefault()
        )
        val flutterView = FlutterView(this)
        flutterView.attachToFlutterEngine(flutterEngine)
        setContentView(flutterView)
    }
}
```

最简单的代码，该代码能成功展示默认的flutter页面，但**无法点击交互**

##### 代码2：

```kotlin
class MainActivity : Activity() {
    lateinit var flutterEngine: FlutterEngine

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        flutterEngine = FlutterEngine(this)
        flutterEngine.dartExecutor.executeDartEntrypoint(
            DartExecutor.DartEntrypoint.createDefault()
        )
        val flutterView = FlutterView(this)
        flutterView.attachToFlutterEngine(flutterEngine)
        setContentView(flutterView)
    }

    override fun onResume() {
        super.onResume()
        // flutterEngine.getLifecycleChannel()获取到的是一个LifecycleChannel对象，类比于MethodChannel，
        // 作用大概就是将Flutter和原生端的生命周期相互联系起来。
        flutterEngine.lifecycleChannel.appIsResumed()
    }

    override fun onPause() {
        super.onPause()
        flutterEngine.lifecycleChannel.appIsInactive()
    }

    override fun onStop() {
        super.onStop()
        flutterEngine.lifecycleChannel.appIsPaused()
    }
}
```

解决了代码1的问题，flutter能正常交互点击了



Keep Moving Forward
