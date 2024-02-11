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
        </dependency>
    </dependencies>
</project>
```

会像其他远端依赖一样被打包进pom中，相关字段为library2项目的配置信息，version字段默认为unspecified

(library2项目的build.gradle也可以配置这个字段) 

> 从pom文件来看是被完全当成远端依赖来处理了



Keep Moving Forward
