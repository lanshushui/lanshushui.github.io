---
title: React Native项目开发-步骤3
categories:
  - 调试开发
tags:
  - React Native
top: 100
abbrlink: e4981006
---



[React Native 启动速度优化——JS 篇（全网最全，值得收藏）](https://cloud.tencent.com/developer/article/1818101)

[React Native 使用官方Metro进行Android 分包](https://www.jianshu.com/p/d144f0f2dd62)

本篇目的是进行bundle拆包，放进android项目中，android项目能正常多bundle 运行解析展示



[我的Android项目](https://github.com/lanshushui/ReactNativeAndroid)

[我的JS项目](https://github.com/lanshushui/ReactNativeTs)

<!-- more -->



React Native打包形成的Bundle文件的内容从上到下依次是：
 **Polyfills**：定义基本的JS环境（如：__d()函数、__r()函数、**DEV** 变量等）
 **Module定义**：使用__d()函数定义所有用到的模块，该函数为每个模块赋予了一个模块ID，模块之间的依赖关系都是通过这个ID进行关联的。
 **Require调用**：使用__r()函数引用根模块。



## RN项目操作

1.根目录创建 metro.common.config.js 文件

```javascript
const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const fs = require('fs');
const config = {
    serializer: {
        createModuleIdFactory: function () {
            return function (path) {
                // 根据文件的相对路径构建 ModuleId
                const projectRootPath = __dirname;
                let moduleId = path.substr(projectRootPath.length + 1);

                // 把 moduleId 写入 idList.txt 文件，记录公有模块 id
                fs.appendFileSync('./idList.txt', `${moduleId}\n`);
                return moduleId;
            };
        },
    },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);

```

2.根目录创建common.js文件

```javascript
require('react');
require('react-native');
```

3.新增【bundle-common】命令并执行

```javascript
 "bundle-common":"react-native bundle --platform android  --dev false --entry-file common.js --bundle-output ./output/common.android.bundle --config metro.common.config.js"
```

-----已生成common.android.bundle文件，下面生成 index.android.bundle 文件---------

4.修改metro.config.js文件

```javascript
const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const fs = require('fs');

// 读取 idList.txt，转换为数组
const idList = fs.readFileSync('./idList.txt', 'utf8').toString().split('\n');

function createModuleId(path) {
    const projectRootPath = __dirname;
    let moduleId = path.substr(projectRootPath.length + 1);
    return moduleId;
}

const config = {
    serializer: {
        createModuleIdFactory: function () {
            return function (path) {
                return createModuleId(path);
            };
        },
        processModuleFilter: function (modules) {
            const mouduleId = createModuleId(modules.path);

            // 通过 mouduleId 过滤在 common.bundle 里的数据
            if (idList.indexOf(mouduleId) < 0) {
                console.log('createModuleIdFactory path', mouduleId);
                return true;
            }
            return false;
        },
    },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);

```

5.执行【bundle-android】命令

```javascript
 "bundle-android":"react-native bundle --platform android --dev false --entry-file index.js --bundle-output ./output/index.android.bundle --assets-dest ./output"
```

6.手动删除 【index.android.bundle】文件 的 Polyfills 部分 （因为common.bundle已经定义了基本的JS环境）



**完成，已生成index.android.bundle和 common.android.bundle 两个文件**



## Android项目操作

1.将 common.android.bundle 和 index.android.bundle 放在assets文件夹

2.ReactNativeHost内部类重写getBundleAssetName()方法，返回 "common.android.bundle"。让reactContext创建时加载基础包

3.改造Application的onCreate方法

```kotlin
override fun onCreate() {
    super.onCreate()
    SoLoader.init(this, false)
    //监听common.bundle文件加载完成，回调时加载【业务bundle】
    reactNativeHost.reactInstanceManager.addReactInstanceEventListener { contect ->
        contect.catalystInstance?.loadScriptFromAssets(assets, bundle, false)
    }
    //创建reactContext，内部会启动加载【基础bundle】
    reactNativeHost.reactInstanceManager?.createReactContextInBackground()
}
```

4.重写MainActivity的**createReactActivityDelegate()**，返回自定义的MainReactActivityDelegate类，重写loadApp方法，当业务bundle加载完成后才调用 **super.loadApp(appKey)**



只写下基本思路，还需要实现各种回调监听哈~

​	

Keep Moving Forward
