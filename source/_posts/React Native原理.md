---
title: React Native原理
categories:
  - 原理
tags:
  - React Native
abbrlink: 75edac57
---



[React Native 启动速度优化——JS 篇（全网最全，值得收藏）](https://cloud.tencent.com/developer/article/1818101)

<!-- more -->



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



Keep Moving Forward
