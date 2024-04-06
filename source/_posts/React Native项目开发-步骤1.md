---
title: React Native项目开发-步骤1
categories:
  - 调试开发
tags:
  - React Native
abbrlink: a96712a
---





网上找到所有教程，包括官方教程都是 生成一个大项目，里面包括RN，android，IOS项目，在一个仓库中既有原生代码又有js代码。

**但实际大型项目开发，肯定是分成RN项目，Android项目，IOS项目三个项目。**



所以这第一篇文档是记录如何实现【分开RN项目和Android项目】，并在【Android项目上展示RN界面，支持修改RN代码后马上刷新界面】

<!-- more -->



## 制作纯RN项目

```
react-native init ReactNativeTs
```

使用官方命令，生成个RN项目，把 【android】【ios】【test】文件夹删除，就剩下个纯TS项目，简简单单

> 1.查看package.json文件，记录下RN版本

```
"dependencies": {
    "react": "18.2.0",
    "react-native": "0.73.6"
  }
```

> 2.记录 node_modules/jsc-android/dist/org 这个路径，这里有android-jsc库，android项目需要依赖这个库

![](https://s3.bmp.ovh/imgs/2024/04/05/8d31cb809851face.png)





## 制作纯Android项目

> 1.AndroidStudio制作空的Android项目

> 2.在根目录创建个repo目录，充当本地仓库。把RN项目第二步提及的文件夹复制到该目录下

![](https://s3.bmp.ovh/imgs/2024/04/05/d5183cdc992acd11.png)

> 3.修改settings.gradle，增加配置 本地仓库repo目录

```kotlin
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        maven {
            // 从node_modules/jsc-android/dist/org 复制来的依赖库
            setUrl( "$rootDir/repo")
        }
        google()
        mavenCentral()
    }
}
```

> 4.修改app模块的build.gradle，增加 react-android和 jsc 两项依赖

```kotlin
//要和RN项目的react-native版本一致
implementation("com.facebook.react:react-android:0.73.6")
//  从 /repo/org/webkit/android-jsc 目录查看具体版本号
implementation("org.webkit:android-jsc:r250231")
```

<font color="red">为什么android-jsc 要本地仓库配置，不能像其他依赖库一样从 mavenCentral 中央库拉取呢 ？</font>

**因为 facebook 并没有在 mavenCentral 中央库上发布最新版本号，看了一下mavenCentral上 最新是 【Sep 07, 2015】发布的 r174650版本，无语了** 

<font color="white">  </font>

**-----项目依赖以上步骤已完成，正式开始编码------**

<font color="white">  </font>

> 5.自定义Application，实现ReactApplication接口

```kotlin
class MainApplication : Application(), ReactApplication {

    override val reactNativeHost: ReactNativeHost =
    object : DefaultReactNativeHost(this) {

        override fun getPackages(): List<ReactPackage> =
        ArrayList<ReactPackage>(
            Arrays.asList<ReactPackage>(
                MainReactPackage(null)
            )
        )

        override fun getJSMainModuleName(): String = "index"

        override fun getUseDeveloperSupport(): Boolean = true

        override val isNewArchEnabled: Boolean = true
        override val isHermesEnabled: Boolean = false
    }

    override val reactHost: ReactHost
    get() = getDefaultReactHost(this.applicationContext, reactNativeHost)

    override fun onCreate() {
        super.onCreate()
        SoLoader.init(this, false)
    }
}

```

> 6.自定义ReactActivity子类，连接Metro服务器

```kotlin
class MainActivity : ReactActivity() {

    private var mPreferences: SharedPreferences? = null

    //需要和RN项目的 AppRegistry.registerComponent注册的名称一致
    override fun getMainComponentName(): String = "ReactNativeTs"

    override fun createReactActivityDelegate(): ReactActivityDelegate =
        DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

    override fun onCreate(savedInstanceState: Bundle?) {
        //连接Metro服务器关键，只需要sp简单保存debug_http_host字段，为当前需要连接的Metro服务器
        mPreferences = PreferenceManager.getDefaultSharedPreferences(applicationContext)
        mPreferences?.edit()?.putString("debug_http_host","192.168.0.141:8081")?.apply()
        super.onCreate(savedInstanceState)
    }
}

```



## 开始实时编程

1.打开RN项目，使用 【yarn start】 命令，启动Metro服务器，记录下端口并查看当前电脑的ip

2.打开Android项目 修改sp的【debug_http_host】字段 ，编译运行APP

3.完成，MainActivity打开时会自动连接Metro服务器，拉取JS代码，解析展示



## 关键总结

1.RN项目使用 【yarn start】 命令，启动Metro服务器

2.Android项目依赖 react-android 和 android-jsc 库，并sp保存debug_http_host字段为Metro服务器地址





该文章只是为了最快实现功能，所以大部分为硬编码

实际项目开发步骤应该为  app扫描RN项目生成的二维码，二维码内包含Metro地址和mainComponentName字段，新建立的Activity解析这些数据并设置在对应地方



Keep Moving Forward
