---
title: Gradle知识点
categories:
  - 知识点
tags:
  - Gradle
abbrlink: 728a6632
---

[Android Studio Build Output控制台输出乱码解决](https://blog.csdn.net/github_2011/article/details/109135258)

[关于 Gradle 你应该知道的知识点](https://juejin.cn/post/7064350945756332040#heading-1)

> Gradle生命周期一般分为三个阶段l
>
> 1. 初始化阶段，解析setting.gradle文件，确定需要引入哪些模块；
> 2. 配置阶段，解析每个project的build.gradle文件，build.gradle就是一堆代码的集合，只是用dsl的语言风格描述出来，看着像配置语言。同时汇总所有project生成有向无环图来确定每个task的依赖关系；
> 3. 执行阶段，根据上个阶段生成的task依赖关系图，依次执行所有task。





<!-- more -->



## 1.setting.gradle

可以通过如下方式注册需要参与构建的模块，项目名称中 `:` 代表项目的分隔符, 类似路径中的 `/`. 如果以 `:` 开头则表示相对于 `root project`

```groovy
pluginManagement {
    //插件仓库
    repositories { 
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    //依赖仓库
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "WebviewDemo"
//app模块 和 module模块都要配置
include(":app")
include(":webviewlib")
```



## 2.Plugin插件用法

```kotlin
class BuildAccPlugin : Plugin<Project> {
    override fun apply(project: Project) {
    }
}
```

```kotlin
//判断是否设置了某个插件
fun isAndroidPlugin(curProject: Project): Boolean {
    return curProject.plugins.hasPlugin("com.android.library")
}

fun isAppPlugin(curProject: Project): Boolean {
    return curProject.plugins.hasPlugin("com.android.application")
}
```

```kotlin
//给project添加 maven-publish 插件
private fun applyMavenPublishPluginInternal(project: Project) {
    project.afterEvaluate {
        if (!project.pluginManager.hasPlugin("maven-publish")) {
            project.pluginManager.apply("maven-publish")
        } else {
            log("当前模块已经添加了maven-publish插件，将被替换")
        }
        log("project ${project.name} plugin (maven-publish) has applied")
    }
}
```



## 3.Project相关API

> project.gradle 获得gradle

> project.*rootProject* != project   判断应用插件的是不是根项目

> project.extensions.create("BuildAccExtension", BuildAccExtension::class.*java*)    创建ext

> project.afterEvaluate，是所有模块都已经配置完后才触发，如果注册了多个project.afterEvaluate回调，那么执行顺序等同于注册顺序
>
> project.afterEvaluate{   //可以通过it 参数拿到project   }





## 4.gradle相关API

> 通过project.gradle 获得gradle

> 1. gradle.addProjectEvaluationListener
>
> ```kotlin
> project.gradle.addProjectEvaluationListener(object : ProjectEvaluationListenerWrapper() {
>     override fun afterEvaluate(subProject: Project, projectState: ProjectState) {
>         super.afterEvaluate(subProject, projectState)
>     }
> })
> ```

> 2. *gradle*.addBuildListener
>
> ```kotlin
> project.gradle.addBuildListener(object : BuildListenerWrapper() {
>     override fun projectsEvaluated(gradle: Gradle) {
>         super.projectsEvaluated(gradle)
>     }
> 
>     override fun buildFinished(buildResult: BuildResult) {
>         super.buildFinished(buildResult)
>     }
> })
> ```

3.获得项目gradle版本   

```kotlin
 val version = runCatching{project.gradle.gradleVersion.split(".")[0].toInt() }.getOrNull() ?: 0  
```



## 5.Maven插件

[发布aar包到maven仓库以及 maven插件 和 maven-publish 插件的区别](https://cloud.tencent.com/developer/article/1911642)	





Keep Moving Forward
