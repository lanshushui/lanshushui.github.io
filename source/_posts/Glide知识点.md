---
title: Glide知识点
categories:
  - 知识点
tags:
  - Glide
abbrlink: 692dc279
---





## 1.Glide 接入OKHttp3

```groovy
api("com.github.bumptech.glide:glide:${glide_version}") {
    exclude(group: 'androidx.annotation', module: 'annotation')
}
implementation("com.github.bumptech.glide:okhttp3-integration:${glide_version}"){
    exclude group: "com.squareup.okhttp3", module: "okhttp"
    exclude group: "com.android.support"
    exclude group: "com.squareup.okio", module: "okio"
}

api "com.squareup.okhttp3:okhttp:${okhttp_version}"
```



## 2.okhttp3-integration核心代码

```
@GlideModule
public final class OkHttpLibraryGlideModule extends LibraryGlideModule {
  @Override
  public void registerComponents(
      @NonNull Context context, @NonNull Glide glide, @NonNull Registry registry) {
    registry.replace(GlideUrl.class, InputStream.class, new OkHttpUrlLoader.Factory());
  }
}
```



## 3.替换自定义的OKHttpClient

第二步可以看出，arr中使用的是LibraryGlideModule，项目中使用自定义的AppGlideModule，就可以比LibraryGlideModule更晚执行，从而替代自定义的OKHttpClient

```java
@GlideModule
public final class MyGlideModule extends AppGlideModule {
    @Override
    public void registerComponents(
        @NonNull Context context, @NonNull Glide glide, @NonNull Registry registry) {
        OkHttpClient.Builder builder = new OkHttpClient.Builder();
        Call.Factory factory = builder.build();
        registry.replace(GlideUrl.class,InputStream.class, new OkHttpUrlLoader.Factory(factory));
    }
}
```



## 4.GlideModule的registerComponents方法是什么时候被调用的？

![](https://s3.bmp.ovh/imgs/2023/07/31/c035ed8ed3cd009e.jpg)



可以看出是图片下载被解析时，调用getRegistry方法时，如果还未初始化，就会走初始化逻辑，调用registerComponents





Keep Moving Forward
