---
title: gradle的aar场景知识
categories:
  - gradle的aar场景知识
tags:
  - AAR
abbrlink: 59f16662
---



[发布 Android library 到 Maven 解析](https://www.jb51.net/article/263003.htm)

[上面提供的maven-publish文件的模板代码只能用在library模块](https://cloud.tencent.com/developer/ask/sof/106381154)

<!-- more -->

发布的依赖产物

- aar 文件
- module 文件
- pom 文件
- source.jar

## 问题场景解答

##### 1.产生的module文件是什么内容

![](https://s3.bmp.ovh/imgs/2024/02/07/1403fa345d6aff28.png)

目前暂未发现意义的json字符串文件



##### 2.如果library1依赖的本地的library2项目,即 *api*(*project*(":library2")) ，那打包会发生什么？

> 正常打包成功

打包产生的pom文件相关内容是

```xml
<project xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd" xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
    <modelVersion>4.0.0</modelVersion>
    <groupId>com.ct.ct</groupId>
    <artifactId>library1</artifactId>
    <version>1.0.0</version>
    <packaging>aar</packaging>
    <dependencies>
        <dependency>
            <groupId>Test</groupId>
            <artifactId>library2</artifactId>
            <version>unspecified</version>
            <scope>compile</scope>
            -------------------或者--------------
            <groupId>com.ct.ct</groupId>
      		<artifactId>library2</artifactId>
      		<version>5.0.0_DEBUG</version>
            <scope>compile</scope>
        </dependency>
    </dependencies>
</project>
```

会像其他远端依赖一样被打包进pom中，

1.当library2没有配置maven-publish插件时，相关字段为library2项目的配置信息，version字段默认为unspecified

2.当library2也有配置maven-publish插件时，相关字段则会根据library1打包的类型去读取library2的publications.debug或者publications.release来填写

> 从pom文件来看是被完全当成远端依赖来处理了



##### 3.打包Aar时上传源码操作

```groovy
// 上传源码的 task
task sourceJar(type: Jar) {
    // 如果有Kotlin那么就需要打入dir : getSrcDirs
    if (project.hasProperty("kotlin")) {
        println '====> project kotlin'
        from android.sourceSets.main.java.getSrcDirs()
    } else if (project.hasProperty("android")) {
        println '====> project java'
        from android.sourceSets.main.java.sourceFiles
    } else {
        println '====> project java & kotlin'
        from sourceSets.main.allSource
    }
    archiveClassifier = "sources"
}
publishing {
    publications { PublicationContainer publicationContainer ->
        release(MavenPublication) {
            from components.release
            artifact sourceJar // 上传源码
            groupId = GROUP_ID
            artifactId = ARTIFACT_ID
            version = VERSION
            //这里的闭包代码config阶段就被运行了
        }
    }
}
```

但我这个版本 【agp 8.1.2   gradle-8.0】好像不需要设置artifact sourceJar，默认会带源码，设置了artifact sourceJar还会报错

```
What went wrong:
A problem was found with the configuration of task ':library1:sourceJar' (type 'Jar').
- Gradle detected a problem with the following location:
'C:\AarProject\library1\build\libs\library1-sources.jar'.

Reason: Task ':library1:generateMetadataFileForReleasePublication'
uses this output of task ':library1:sourceJar'
without declaring an explicit or implicit dependency. This can lead to incorrect results being
produced, depending on what order the tasks are executed.
```

解决方案：

```groovy
release(MavenPublication) {
    from components.release
    artifact sourceJar // 上传源码
    groupId = GROUP_ID
    artifactId = ARTIFACT_ID
    version = VERSION
}
//在这里之后才能找到generateMetadataFileForReleasePublication任务
tasks.named("generateMetadataFileForReleasePublication"){
    dependsOn "androidSourcesJar"
}
```

又会出现 【 multiple **artifacts** with the identical extension and classifier 】的问题，因为打包已经默认出现了-source.jar 的问题，需要修改sourceJar的archiveClassifier为其他字符串



##### 4.当library1同时依赖library3的源码和aar包时，编译运行都不会报错

> 优先选择源码，但如果引用的library3的aar包有library3源码没有的类，那library1还是可以引用到该类

所以为了避免aar和源码混淆，当一个library源码化时，必须剔除项目中所有该library的aar依赖







Keep Moving Forward
