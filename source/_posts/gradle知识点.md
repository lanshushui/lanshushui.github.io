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

> Gradle生命周期一般分为三个阶段
>
> 1. 初始化阶段，解析setting.gradle文件，确定需要引入哪些模块；
> 2. 配置阶段，解析每个project的build.gradle文件，build.gradle就是一堆代码的集合，只是用dsl的语言风格描述出来，看着像配置语言。同时汇总所有project生成有向无环图来确定每个task的依赖关系；
> 3. 执行阶段，根据上个阶段生成的task依赖关系图，依次执行所有task。



[Android编译速度优化——模块Aar方案实现](https://github.com/zhupeipei/AndroidBuildAccPlugin)

[ 输出项目第三方库以及本地依赖库的权限信息](https://github.com/Omooo/Android-Notes/blob/master/blogs/Android/Gradle/%E4%BE%9D%E8%B5%96%E6%9D%83%E9%99%90%E4%BF%A1%E6%81%AF.md)



<!-- more -->

[Task#finalizedBy 函数](https://cloud.tencent.com/developer/article/2253820)



## setting.gradle

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

> 模块之间的互相依赖我们通常使用 `implementation(project(":$modulePath"))` 的语法进行引用。注意，Gradle 以 “:” 为文件路径分隔符，如果 a 模块引用的 b 模块放置在某个深层的文件（例如 “/commons/utils/b”）中，则需要完整的路径引用：`project(":commons:utils:b")`



## buildscript

[buildscript 的脚本执行顺序](https://juejin.cn/post/6935605583743549476)

[如果我们想在gradle脚本中使用外部的jar包!!](https://cloud.tencent.com/developer/article/1837160)

[classpath implementation的区别](https://juejin.cn/s/gradle%20dependencies%20classpath%20implementation)



> kts中引入自定义gradle脚本文件    *apply*(from = File("${*rootDir*}/app/test.gradle"))，如果是相对目录，相对的是apply的项目的对应目录

> 哪个project 进行apply操作，test.gradle就能通过project属性访问到所属的项目

> kts如何调用ext中的自定义方法  val projectOrAAr = ext.get("projectOrAAr") as groovy.lang.Closure<Object>



## Plugin插件用法

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



## Project相关API

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



## gradle相关API

> 通过project.gradle 获得gradle

> 每一次运行gradle任务，所有gradle文件获得的gradle变量都是同一个对象

> ```kotlin
> //setting.gradle.kts
> gradle.addBuildListener(object : BuildListener {
>     override fun settingsEvaluated(settings: Settings) {
>         println("addBuildListener--------settingsEvaluated")
>     }
> 
>     override fun projectsLoaded(gradle: Gradle) {
>         println("addBuildListener--------projectsLoaded")
>     }
> 
>     override fun projectsEvaluated(gradle: Gradle) {
>         println("addBuildListener--------projectsEvaluated")
>     }
> 
>     override fun buildFinished(result: BuildResult) {
>         println("addBuildListener--------buildFinished")
>     }
> })
> gradle.addProjectEvaluationListener(object :ProjectEvaluationListener{
>     override fun beforeEvaluate(project: Project) {
>         println("addProjectEvaluationListener--------beforeEvaluate----------- $project")
>     }
> 
>     override fun afterEvaluate(project: Project, state: ProjectState) {
>         println("addProjectEvaluationListener--------afterEvaluate-----------$project")
>     }
> 
> })
> 
> //app build.gradle
> println("1---------rootProject")
> beforeEvaluate {
>     println("4---------rootProject-beforeEvaluate")
> }
> println("2---------rootProject")
> afterEvaluate {
>     println("5---------rootProject-afterEvaluate")
> }
> println("3---------rootProject")
> 
> //library1 build.gradle
> println("1---------library1")
> beforeEvaluate {
>     println("4---------library1-beforeEvaluate")
> }
> println("2---------library1")
> afterEvaluate {
>     println("5---------library1-afterEvaluate")
> }
> println("3---------library1")
> ```

```
//////////////////////// 运行结果////////////////////////////////
addBuildListener--------settingsEvaluated
addBuildListener--------projectsLoaded

> Configure project :
addProjectEvaluationListener--------beforeEvaluate----------- root project 'AarProject'
addProjectEvaluationListener--------afterEvaluate-----------root project 'AarProject'

> Configure project :app
addProjectEvaluationListener--------beforeEvaluate----------- project ':app'
1---------rootProject
2---------rootProject
3---------rootProject
addProjectEvaluationListener--------afterEvaluate-----------project ':app'
5---------rootProject-afterEvaluate

> Configure project :library1
addProjectEvaluationListener--------beforeEvaluate----------- project ':library1'
1---------library1
2---------library1
3---------library1
addProjectEvaluationListener--------afterEvaluate-----------project ':library1'
5---------library1-afterEvaluate

addBuildListener--------projectsEvaluated

> Task :prepareKotlinBuildScriptModel UP-TO-DATE
addBuildListener--------buildFinished

BUILD SUCCESSFUL in 2s
```

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



## Maven插件

[发布aar包到maven仓库以及 maven插件 和 maven-publish 插件的区别](https://cloud.tencent.com/developer/article/1911642)	

[发布 Android library 到 Maven 解析](https://www.jb51.net/article/263003.htm)



## dependency 以及 configurations

[Gradle 理解：configuration、dependency](https://juejin.cn/post/6844904088446959623)

[ testImplementation和 androidTestImplementation 的区别](https://stackoverflow.com/questions/52076775/android-difference-between-testimplementation-and-androidtestimplementation-in-b)

[configurations.all vs configurations](https://juejin.cn/s/gradle%20configurations.all%20vs%20configurations)

[一篇文章深入gradle（上篇）:依赖机制](https://oubindo.github.io/2019/09/05/%E4%B8%80%E7%AF%87%E6%96%87%E7%AB%A0%E6%B7%B1%E5%85%A5gradle%EF%BC%88%E4%B8%8A%E7%AF%87%EF%BC%89:%E4%BE%9D%E8%B5%96%E6%9C%BA%E5%88%B6/)

[Android gradle dependency tree change（依赖树变化）监控实现](https://cloud.tencent.com/developer/article/2332005)



## 命令

```kotlin
//cmd执行graldew命令时，会额外启动Gradle Daemon执行命令，重新跑一遍初始化阶段，配置阶段
fun Project.execCmd(cmd: String): String {
    try {
        val stdOut = ByteArrayOutputStream()
        //project.exec是以project对象的目录启动命令
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

> window系统下执行命令

```groovy
String path = project.path
String cmd = "gradlew ${path}:publishReleasePublicationToMavenRepository"
rootProject.exec {
    commandLine 'cmd','/c',cmd
}
```

> GIT命令

```kotlin
//判断某个模块是否有本地修改 
project.execCmd("git -C ${project.projectDir.absolutePath} status --porcelain")

//根据commitId 获得commit的信息(不包含作者，时间的)
static def getCommitMsg(String commitId, Gradle gradle) {
    String cmd = "git log --pretty=format:\"%s\" $commitId -1"
    return execCmd(cmd, gradle.rootProject).trim()
}
//获得project最新的提交CommitId
static def getProjectLastCommitId(String projectPath, Gradle gradle) {
    String cmd = "git log -n 1 --oneline --format=%H $projectPath"
    return execCmd(cmd, gradle.rootProject).trim()
}
//获得文件每一行的git信息
execCmd("git blame config/aarPomConfig.yml", gradle.rootProject).eachLine{}
```

> gradle命令传参
>

```groovy
./gradlew xxxtask -Pc='aaa'
在Gradle命令中，-Pc表示你正在设置一个名为"c"（或者在-P后面的任何内容）的项目属性。Gradle允许你使用-P选项将属性传递给构建脚本。
在你的例子中，你将属性"c"的值设置为字符串’aaa’。这意味着你的Gradle构建脚本可以在构建过程中使用这个名为"c"的属性及其值
//方式1
project.hasProperty('c') ? project.c : '默认值'
//方式2
gradle.startParameter.projectProperties.containsKey("c")
```



父项目task中如何启动另一个子项目的task

```
1.使用cmd命令，但会起一个新的gradle环境执行命令
2.将子项目task内的代码封装在一个函数中，保存在project.ext.xxx中，然后父项目 project(":子项目").ext.xxx()
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



## Groovy语法

> 方法支持返回多个值，以[]包括起来，返回的是list集合，但调用的地方会自动解耦；

```
def A={ String a ,String b ->
    String c= a+b
    println(c)
}
def B={
    return ["a","b"]
}
A(B())
```



Keep Moving Forward
