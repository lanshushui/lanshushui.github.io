---
title: KSP知识点
categories:
  - 知识点
tags:
  - KSP
abbrlink: 8ff11c1
---



[使用KSP处理注解和生成Kotlin代码](https://juejin.cn/post/7157881407057559589)

[KSP化的ARoute库](https://github.com/JailedBird/ArouterKspCompiler)

<!-- more -->

> KSP打印日志需要使用warn才能看见



## 1.添加插件依赖

```kotlin
//网上的参考模块都是通过plugins闭包引入 
plugins {
    ...
    id("com.google.devtools.ksp") version "1.7.10-1.0.6"//引入ksp插件
}
```

但如果要把ksp配置抽离成一个单独的gradle文件，就只能用 `apply plugin: "com.google.devtools.ksp"` 的方式，但这之前必须添加插件脚本依赖

```groovy
//根目录的build.gradle   添加依赖的插件-旧的写法
buildscript {
    dependencies {
        //需要和kotlin版本对应
        classpath  “com.google.devtools.ksp:com.google.devtools.ksp.gradle.plugin:$versions.ksp”
    }
}

```



## 2.module目录的build.gradle 添加kotlin插件

```groovy
apply plugin: 'kotlin-android'

```



## 3.因为ksp需要配置的对象有点重复，所以抽象成一个gradle脚本

```java
apply plugin: "com.google.devtools.ksp" //这一行的代码在第一步操作下才能这么编写
android {
    ksp {
        arg("moduleName", project.getName())
    }
    buildTypes.all { type ->
        sourceSets {
            main.java.srcDirs += "build/generated/ksp/${type.name}/kotlin"
        }
    }
}
dependencies {
    ksp project(":xxx-compiler-ksp")
}

```



## 4.module目录的build.gradle 添加自定义的gradle脚本

```groovy
apply from: "$rootDir/xxxx.gradle"
```



Keep Moving Forward
