---
title: React Native项目开发-步骤2
categories:
  - React-Native
tags:
  - React-Native调试开发
top: 100
abbrlink: 939f2090
---





本篇目的是生成bundle文件，放进android项目中，android项目能正常运行解析展示

<!-- more -->



## RN项目操作

1.在根项目创建个【output】文件夹

2.终端执行命令 【*下面的命令在package.json中抽象成一个 bundle-android 命令，使用更方便*】

```javascript
yarn react-native bundle --platform android --dev false --entry-file index.js --bundle-output ./output/index.android.bundle --assets-dest ./output
```

3.生成对应bundle文件和图片文件夹

![](https://s3.bmp.ovh/imgs/2024/04/06/fb997caf65cadc08.png)



## Android项目操作

> 1.在app模块下增加assets文件夹，放入bundle文件

> 2.把生成的图片放入【drawable】文件夹，注意不是【drawable-mdpi】文件夹

> 3.运行app，正常解析展示

![](https://s3.bmp.ovh/imgs/2024/04/06/f8b2a4d302c63846.png)





<font color="white">  </font>

## 为什么图片放入【drawable】文件夹，而不是【drawable-mdpi】文件夹

分析图片解析流程

![](https://s3.bmp.ovh/imgs/2024/04/06/fd3583e3f3f081ac.png)

![](https://s3.bmp.ovh/imgs/2024/04/06/06eca95670908b57.png)



可以看到调用链最终调用到ResourceDrawableIdHelper#getResourceDrawableId方法，

getResourceDrawableId方法内通过 context.getResources().getIdentifier(name, "drawable", context.getPackageName()) 获取资源ID，所以图片必须放在【drawable】文件夹



图片类：**react-android依赖下的 com.facebook.react.views.image.ReactImageView类**





该文章只是为了最快实现功能，所以大部分为硬编码



Keep Moving Forward
