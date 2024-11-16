---
title: Flutter module接入流程
categories:
  - Flutter
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

###### 下面为aar pom文件，会传递flutter库相关的依赖，embedding的ui库和arm对应的so库

![](https://s3.bmp.ovh/imgs/2024/11/16/a2756bd5d9e152df.png)

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



Keep Moving Forward
