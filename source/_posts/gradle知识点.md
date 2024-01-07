---
title: Gradle知识点
categories:
  - 知识点
tags:
  - Gradle
abbrlink: 728a6632
---

[Android Studio Build Output控制台输出乱码解决](https://blog.csdn.net/github_2011/article/details/109135258)

[我想调试下build.gradle | Gradle 调试](https://cloud.tencent.com/developer/article/1951717)

[关于 Gradle 你应该知道的知识点](https://juejin.cn/post/7064350945756332040#heading-1)

> Gradle生命周期一般分为三个阶段l
>
> 1. 初始化阶段，解析setting.gradle文件，确定需要引入哪些模块；
> 2. 配置阶段，解析每个project的build.gradle文件，build.gradle就是一堆代码的集合，只是用dsl的语言风格描述出来，看着像配置语言。同时汇总所有project生成有向无环图来确定每个task的依赖关系；
> 3. 执行阶段，根据上个阶段生成的task依赖关系图，依次执行所有task。



[Android编译速度优化——模块Aar方案实现](https://github.com/zhupeipei/AndroidBuildAccPlugin)



<!-- more -->

[Task#finalizedBy 函数](https://cloud.tencent.com/developer/article/2253820)



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

```kotlin
//配置Maven参数
private fun configMavenPublish(subProject: Project, appExtension: AppExtension?) {
        subProject.afterEvaluate {
            if (!subProject.pluginManager.hasPlugin("maven-publish")) {
                return@afterEvaluate
            }
            subProject.extensions.configure<PublishingExtension>("publishing") { publishingExt ->
                publishingExt.publications { publicationContainer ->
                    val publicationName = "xxx"
                    if (publicationContainer.findByName(publicationName) == null) {
                        publicationContainer.create(
                            publicationName,
                            MavenPublication::class.java
                        ) {
                            with(it) {
                                groupId = mavenModel.groupId
                                artifactId = mavenModel.artifactId
                                version = mavenModel.version
                                from(subProject.components.getByName(buildTypeName))
                            }
                        }
                    }
                }
                publishingExt.repositories { repositoryHandler ->
                    repositoryHandler.maven {
                        it.setUrl(MAVEN_PUBLISH_URL)
                    }
                }
            }
        }
    }
```



## 3.Project相关API

> project.gradle 获得gradle

> project.*rootProject* != project   判断应用插件的是不是根项目

> project.path ==":"   说明是根项目

> project.extensions.create("BuildAccExtension", BuildAccExtension::class.*java*)    创建ext

> project.afterEvaluate，是所有模块都已经配置完后才触发，如果注册了多个project.afterEvaluate回调，那么执行顺序等同于注册顺序
>
> project.afterEvaluate{   //可以通过it 参数拿到project   }

> project.pluginManager.hasPlugin("maven-publish")   project.plugins.hasPlugin("com.android.application") 判断是否存在某个插件（必须在project.afterEvaluate后使用）

>  project.pluginManager.apply("maven-publish") apply某个插件
>



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
> gradle.addBuildListener(new BuildListener() {
>     void buildStarted(Gradle var1) {
>         println '开始构建'
>     }
>     void settingsEvaluated(Settings var1) {
>         // var1.gradle.rootProject 这里访问 Project 对象时会报错，
>         // 因为还未完成 Project 的初始化。
>         println 'settings 评估完成（settings.gradle 中代码执行完毕）'
>     }
>     void projectsLoaded(Gradle var1) {
>         println '项目结构加载完成（初始化阶段结束）'
>         println '初始化结束，可访问根项目：' + var1.gradle.rootProject
>     }
>     void projectsEvaluated(Gradle var1) {
>         println '所有项目评估完成（配置阶段结束）'
>     }
>     void buildFinished(BuildResult var1) {
>         println '构建结束 '
>     }
> })
> ```

3.获得项目gradle版本   

```kotlin
 val version = runCatching{project.gradle.gradleVersion.split(".")[0].toInt() }.getOrNull() ?: 0  
```

4.获得运行的任务名称

```groovy

List<TaskExecutionRequest> taskRequests = gradle.startParameter.getTaskRequests();
if (taskRequests.size() > 0) {
    String taskName = taskRequests.get(0).toString();
    if (taskName.contains("assembledebug")) {
        println  "assembledebug"
    }
}
```

6.获得项目所有构建变体

```kotlin
val appExtension = runCatching { mAppProject?.extensions?.getByType(AppExtension::class.java) }.getOrNull()
appExtension.applicationVariants.forEach { applicationVariant ->

                                         }
```



## 5.Maven插件

[发布aar包到maven仓库以及 maven插件 和 maven-publish 插件的区别](https://cloud.tencent.com/developer/article/1911642)	



## 6.configurations

[Gradle 理解：configuration、dependency](https://juejin.cn/post/6844904088446959623)





## 7.Cmd命令

```kotlin
fun Project.execCmd(cmd: String): String {
    try {
        val stdOut = ByteArrayOutputStream()
        project.exec {
            it.executable = "sh"
            it.args = listOf("-c", cmd)
            it.standardOutput = stdOut
            it.errorOutput = stdOut
        }
        val result = stdOut.toString()
        return result
    } catch (e: Exception) {
        return ""
    }
}
```

判断某个模块是否有本地修改

```kotlin
 val result = project.execCmd("git -C ${project.projectDir.absolutePath} status --porcelain")
```

获得最新commitId

```kotlin
fun getCommitId(project: Project): String? {
    val projectDir = project.projectDir.absolutePath
    val commitRes = project.execCmd("cd $projectDir && git log | head -n 1")
    if (commitRes.startsWith("commit ")) {
        return commitRes.substring(7).replace("\n", "")
    }
    return null
}
```



## 有用方法集合

1.获取local.properties文件的值        **gradle.properties的值在gradle文件中可以通过变量名引用获取**

```groovy
def getPropertyFromLocalProperties(key, Object defaultValue) {
    File file = project.rootProject.file('local.properties');
    if (file.exists()) {
        Properties properties = new Properties()
        properties.load(file.newDataInputStream())
        return properties.getOrDefault(key, defaultValue)
    } else {
        return defaultValue
    }
}
```



Keep Moving Forward
