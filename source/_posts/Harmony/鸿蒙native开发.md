---
title: 鸿蒙native开发
categories:
  - Harmony
tags:
  - Native
abbrlink: df89432a
---

## 目录结构

![](https://s3.bmp.ovh/imgs/2024/11/22/c5d1207d4e2ea7b9.png)



## 修改生成的so文件名称

> Ensure that the .so name is the same as that in oh-package.json5 under module directory. 

##### 1.修改types文件夹下的文件夹名称为so库的名称，及其目录下的oh-package.json5的name属性

![](https://s3.bmp.ovh/imgs/2024/11/23/9fee13dc5dc6a4c3.png)

##### 2.修改CMakeLists.txt文件

![](https://s3.bmp.ovh/imgs/2024/11/23/d999dd7b567cfc9c.png)

##### 3.修改napi_init.cpp文件，napi_module的nm_modname属性

![](https://s3.bmp.ovh/imgs/2024/11/23/01779d12e71d7555.png)

##### 4.修改entry 模块的oh-package.json5的依赖,和引用so库的est文件

![image-20241123001601426](C:\Users\lanshushui\AppData\Roaming\Typora\typora-user-images\image-20241123001601426.png)

![](https://s3.bmp.ovh/imgs/2024/11/23/1c2fab04c909e368.png)

Keep Moving Forward
