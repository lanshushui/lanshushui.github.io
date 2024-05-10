---
title: React Native原理
categories:
  - React-Native
tags:
  - 源码分析
top: 100
abbrlink: 75edac57
---



[React Native 启动速度优化——JS 篇（全网最全，值得收藏）](https://cloud.tencent.com/developer/article/1818101)

<!-- more -->

## React启动流程图

![systrace](/images/reactNativeHost.getReactInstanceManager.png)



## APP如何找到Metor服务器

```kotlin
//保存sp的debug_http_host即可
val mPreferences = PreferenceManager.getDefaultSharedPreferences(applicationContext)
mPreferences?.edit()?.putString("debug_http_host","192.168.0.141:8081")?.apply()
```

![](https://s3.bmp.ovh/imgs/2024/04/06/1dde267ccdb59b07.png)

```java
//ReactInstanceManager类
private void recreateReactContextInBackgroundInner() {
    if (this.mUseDeveloperSupport && this.mJSMainModulePath != null) {
        final DeveloperSettings devSettings = this.mDevSupportManager.getDevSettings();
        if (!Systrace.isTracing(0L)) {
            if (this.mBundleLoader == null) {
                this.mDevSupportManager.handleReloadJS();
            } else {
                this.mDevSupportManager.isPackagerRunning(new PackagerStatusCallback() {
                    public void onPackagerStatusFetched(boolean packagerIsRunning) {
                        UiThreadUtil.runOnUiThread(() -> {
                            if (packagerIsRunning) {
                                //Metro服务器已运行时，跑到这个分支
                                ReactInstanceManager.this.mDevSupportManager.handleReloadJS();
                            } else if (ReactInstanceManager.this.mDevSupportManager.hasUpToDateJSBundleInCache() && !devSettings.isRemoteJSDebugEnabled() && !ReactInstanceManager.this.mUseFallbackBundle) {
                                ReactInstanceManager.this.onJSBundleLoadedFromServer();
                            } else {
                                devSettings.setRemoteJSDebugEnabled(false);
                                ReactInstanceManager.this.recreateReactContextInBackgroundFromBundleLoader();
                            }

                        });
                    }
                });
            }

            return;
        }
    }
    //从本地加载JS文件
    this.recreateReactContextInBackgroundFromBundleLoader();
}


//BridgeDevSupportManager类
public void handleReloadJS() {
    UiThreadUtil.assertOnUiThread();
    ReactMarker.logMarker(ReactMarkerConstants.RELOAD, this.getDevSettings().getPackagerConnectionSettings().getDebugServerHost());
    this.hideRedboxDialog();
    if (this.getDevSettings().isRemoteJSDebugEnabled()) {
        PrinterHolder.getPrinter().logMessage(ReactDebugOverlayTags.RN_CORE, "RNCore: load from Proxy");
        this.showDevLoadingViewForRemoteJSEnabled();
        this.reloadJSInProxyMode();
    } else {
        //无代理，走到这分支
        PrinterHolder.getPrinter().logMessage(ReactDebugOverlayTags.RN_CORE, "RNCore: load from Server");
        //获取url
        String bundleURL = this.getDevServerHelper().getDevServerBundleURL((String)Assertions.assertNotNull(this.getJSAppBundleName()));		//从服务器拉取JS
        this.reloadJSFromServer(bundleURL);
    }

}

//DevServerHelper类
public String getDevServerBundleURL(String jsModulePath) {
    return this.createBundleURL(jsModulePath, DevServerHelper.BundleType.BUNDLE, this.mPackagerConnectionSettings.getDebugServerHost());
}

//上下对比 可以看到host参数是通过 this.mPackagerConnectionSettings.getDebugServerHost() 获取的
private String createBundleURL(String mainModuleID, BundleType type, String host, boolean modulesOnly, boolean runModule) {
    boolean dev = this.getDevMode();
    return String.format(Locale.US, "http://%s/%s.%s?platform=android&dev=%s&lazy=%s&minify=%s&app=%s&modulesOnly=%s&runModule=%s", host, mainModuleID, type.typeID(), dev, dev, this.getJSMinifyMode(), this.mPackageName, modulesOnly ? "true" : "false", runModule ? "true" : "false");
}


//PackagerConnectionSettings类
public String getDebugServerHost() {
    //可以看到是从sp中取debug_http_host字段作为host
    String hostFromSettings = this.mPreferences.getString("debug_http_host", (String)null);
    if (!TextUtils.isEmpty(hostFromSettings)) {
        return (String)Assertions.assertNotNull(hostFromSettings);
    } else {
        String host = AndroidInfoHelpers.getServerHost(this.mAppContext);
        return host;
    }
}
```

总结：

1. 从最重要的recreateReactContextInBackgroundInner方法开始，调用ReactInstanceManager.this.mDevSupportManager.handleReloadJS()方法触发加载JS
2. BridgeDevSupportManager类的handleReloadJS方法通过DevServerHelper类的getDevServerBundleURL方法获取URL
3. DevServerHelper类的getDevServerBundleURL方法通过PackagerConnectionSettings类的getDebugServerHost方法获取主机地址
4. getDebugServerHost是通过本地sp的debug_http_host字段获取地址





## APP如何找到本地JS文件

![](https://s3.bmp.ovh/imgs/2024/04/06/1dde267ccdb59b07.png)

```java
//ReactInstanceManager类
private void recreateReactContextInBackgroundInner() {
    if (this.mUseDeveloperSupport && this.mJSMainModulePath != null) {
        final DeveloperSettings devSettings = this.mDevSupportManager.getDevSettings();
        if (!Systrace.isTracing(0L)) {
            if (this.mBundleLoader == null) {
                this.mDevSupportManager.handleReloadJS();
            } else {
                this.mDevSupportManager.isPackagerRunning(new PackagerStatusCallback() {
                    public void onPackagerStatusFetched(boolean packagerIsRunning) {
                        UiThreadUtil.runOnUiThread(() -> {
                            if (packagerIsRunning) {
                                ReactInstanceManager.this.mDevSupportManager.handleReloadJS();
                            } else if (ReactInstanceManager.this.mDevSupportManager.hasUpToDateJSBundleInCache() && !devSettings.isRemoteJSDebugEnabled() && !ReactInstanceManager.this.mUseFallbackBundle) {
                                ReactInstanceManager.this.onJSBundleLoadedFromServer();
                            } else {
                                //开发模式下 没有开启Metro服务器跑到这分支
                                devSettings.setRemoteJSDebugEnabled(false);
                                ReactInstanceManager.this.recreateReactContextInBackgroundFromBundleLoader();
                            }

                        });
                    }
                });
            }

            return;
        }
    }
    //release模式下 跑到这分支
    this.recreateReactContextInBackgroundFromBundleLoader();
}



private void recreateReactContextInBackgroundFromBundleLoader() {
    this.recreateReactContextInBackground(this.mJavaScriptExecutorFactory, this.mBundleLoader);
}
private void recreateReactContextInBackground(JavaScriptExecutorFactory jsExecutorFactory, JSBundleLoader jsBundleLoader) {
    ReactContextInitParams initParams = new ReactContextInitParams(jsExecutorFactory, jsBundleLoader);
    if (this.mCreateReactContextThread == null) { //跑到这分支，子线程创建ReactContext
        this.runCreateReactContextOnNewThread(initParams);
    } else {
        this.mPendingReactContextInitParams = initParams;
    }

}

//子线程创建 ReactContext，
//initParams.getJsBundleLoader() 默认值为 JSBundleLoader$1,
//即com.facebook.react.bridge.JSBundleLoader#createAssetLoader返回值
private void runCreateReactContextOnNewThread(ReactContextInitParams initParams) {
    this.mCreateReactContextThread = new Thread((ThreadGroup)null, () -> {
        ReactApplicationContext reactApplicationContext;
        reactApplicationContext = this.createReactContext(initParams.getJsExecutorFactory().create(), initParams.getJsBundleLoader());
    }, "create_react_context");
}

private ReactApplicationContext createReactContext(JavaScriptExecutor jsExecutor, JSBundleLoader jsBundleLoader) {
    //创建CatalystInstanceImpl
    CatalystInstanceImpl catalystInstance = catalystInstanceBuilder.build();
    catalystInstance.runJSBundle();
}

//CatalystInstanceImpl类
public void runJSBundle() {
    this.mJSBundleLoader.loadScript(this);
}

//JSBundleLoader类
//使用的是该方法返回的JSBundleLoader
public static JSBundleLoader createAssetLoader(final Context context, final String assetUrl, final boolean loadSynchronously) {
    return new JSBundleLoader() {
        public String loadScript(JSBundleLoaderDelegate delegate) { 
            //delegate是CatalystInstanceImpl
            delegate.loadScriptFromAssets(context.getAssets(), assetUrl, loadSynchronously);
            return assetUrl;
        }
    };
}

//CatalystInstanceImpl
//assetURL参数默认值是  assets://index.android.bundle
public void loadScriptFromAssets(AssetManager assetManager, String assetURL, boolean loadSynchronously) {
    this.mSourceURL = assetURL;
    this.jniLoadScriptFromAssets(assetManager, assetURL, loadSynchronously);
}
```

总结：

1. 从最重要的recreateReactContextInBackgroundInner方法开始，子线程调用createReactContext方法，
2. createReactContext方法内创建CatalystInstanceImpl类，并调用runJSBundle方法
3. CatalystInstanceImpl类的runJSBundle方法默认是调用mJSBundleLoader的loadScript方法
4. AssetBundleLoader的loadScript方法是调用CatalystInstanceImpl的loadScriptFromAssets方法，内部触发JNI方法





Keep Moving Forward
