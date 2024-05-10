---
title: DeepLink踩坑
categories:
  - Android
tags:
  - DeepLink
abbrlink: ea3a92b7
hidden : true
---



[Android AppLinks 接入](https://juejin.cn/post/6844903494760349703)

[Facebook 广告deeplink配置与测试](https://blog.csdn.net/wjj1996825/article/details/80932453)



<!-- more -->

# Facebook 延迟深度链接接入



1.[官网SDK接入](https://developers.facebook.com/docs/android/getting-started)

- 接入Facebook SDK
- 更新清单

2.[官网延迟深度链接代码](https://developers.facebook.com/docs/android/deep-linking)

- 监听sdk 延迟深度链接回调

3.[官网延迟深度链接测试](https://developers.facebook.com/tools/app-ads-helper)

- 测试延迟深度链接



# tiktok + appsflyer 延迟深度链接接入

tiktok 深度链接的原理就是  tiktok广告点击时，tiktok就会根据广告数据替换我们提供的归因链接内的模板字符串，然后请求这个链接



1. [appflyer的SDK接入](https://dev.appsflyer.com/hc/docs/install-android-sdk)

2. [测试Appflyer功能](https://dev.appsflyer.com/hc/docs/testing-android)  ，能成功显示 "af_status": "Non-organic" 就算成功

   - 模拟归因链接点击 只需要在浏览器上请求归因链接

   - 最重要的是 将设备添加在测试名单

3. [接入延迟深度链接代码](https://dev.appsflyer.com/hc/docs/dl_android_ocds_ddl)

4.  向tiktok提供归因链接

   -  按照步骤2先测试一下提供的归因链接是否能成功显示 "af_status": "Non-organic"
   - 例如归因链接不能有is_retargeting=true 这个数据   [归因链接的结构和参数](https://support.appsflyer.com/hc/zh-cn/articles/207447163-%E5%BD%92%E5%9B%A0%E9%93%BE%E6%8E%A5%E7%9A%84%E7%BB%93%E6%9E%84%E5%92%8C%E5%8F%82%E6%95%B0)

   

# intent和intent-filter的匹配问题

[匹配规则](https://developer.android.com/guide/components/intents-filters?hl=zh-cn)

1. 仅当过滤器未指定任何 URI 或 MIME 类型时，不含 URI 和 MIME 类型的 Intent 才会通过测试。
2. 对于包含 URI 但不含 MIME 类型（既未显式声明，也无法通过 URI 推断得出）的 Intent，仅当其 URI 与过滤器的 URI 格式匹配、且过滤器同样未指定 MIME 类型时，才会通过测试。
3. 仅当过滤器列出相同的 MIME 类型且未指定 URI 格式时，包含 MIME 类型但不含 URI 的 Intent 才会通过测试。
4. 仅当 MIME 类型与过滤器中列出的类型匹配时，同时包含 URI 类型和 MIME 类型（通过显式声明，或可以通过 URI 推断得出）的 Intent 才会通过测试的 MIME 类型部分。如果 Intent 的 URI 与过滤器中的 URI 匹配，或者如果 Intent 具有 `content:` 或 `file:` URI 且过滤器未指定 URI，则 Intent 会通过测试的 URI 部分。换言之，如果过滤器*只是*列出 MIME 类型，则假定组件支持 `content:` 和 `file:` 数据。



基本是一对一的，要么都有，要么都没有





# 依然不懂的点



前提：link.test.net 已网站配置好了APP-LINK的JSON脚本



测试intent脚本

```
adb shell am start  -W -a android.intent.action.VIEW   -c android.intent.category.BROWSABLE   -d "https://link.test.net"
pause
```



APP某个Activity配置这个intent-filter

```xml
<intent-filter >     
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="https" android:host="link.test.net"/>
</intent-filter>
```



**结果脚本运行后，还是无法启动这个Activity，而是启动了系统的浏览器**



加上 android:autoVerify="true"脚本运行后 就能启动这个Activity

```xml
<intent-filter android:autoVerify="true">    
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="http"/>
    <data android:scheme="https" />
    <data android:host="link.test.net"/>
</intent-filter>
```









Keep Moving Forward
