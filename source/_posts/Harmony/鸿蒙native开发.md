---
title: 鸿蒙native开发
categories:
  - Harmony
tags:
  - Native
abbrlink: df80432a
---

[CMake 保姆级教程](https://subingwen.cn/cmake/CMake-primer/)

[NDK开发用例文档](https://developer.huawei.com/consumer/cn/doc/harmonyos-faqs-V5/faqs-ndk-development-V5)



<!-- more -->

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



## 命令行生成so文件

> 鸿蒙ndk中有ninja.exe ，所以采用cmake+nanji构建so库   [官方指定文档](https://developer.huawei.com/consumer/cn/doc/best-practices-V5/bpta-cmake-adapts-to-harmonyos-V5)
>
> window cmake默认的生成器是NMake Makefiles，所以cmake命令需要特定指定生成器

前提：PATH环境配置ndk的bin目录，在源代码目录新建立build目录，并cd进入。

##### 1.执行cmke命令 

> 可以通过 cmake -help 命令查看命令

> cmake -S=..\ -DCMAKE_TOOLCHAIN_FILE=C:\Users\lanshushui\AppData\Local\OpenHarmony\Sdk\12\native\build\cmake\ohos.toolchain.cmake   -DOHOS_ARCH=arm64-v8a -G=Ninja

-DCMAKE_TOOLCHAIN_FILE  为一个特定的平台编译代码时，可以使用 `-DCMAKE_TOOLCHAIN_FILE=path/to/your/toolchain/file.cmake` 来指定工具链文件。这样，CMake 会使用该文件中的设置来配置构建过程。

-S 指定源代码目录

-G 指定生成器

**生成的目录结构：**

![](https://s3.bmp.ovh/imgs/2024/11/23/73e5ef2d8f58b0da.png)

##### 2.执行ninji命令

> ninja

**生成的目录结构：**

![](https://s3.bmp.ovh/imgs/2024/11/23/23823ecbcdca869b.png)

##### 3.命令记录

```c
D:\DevEcoStudioProjects\NATIVEOHOS\entry\src\main\cpp\build>cmake -S=..\ -DCMAKE_TOOLCHAIN_FILE=C:\Users\lanshushui\AppData\Local\OpenHarmony\Sdk\12\native\build\cmake\ohos.toolchain.cmake   -DOHOS_ARCH=arm64-v8a -G=Ninja
-- The C compiler identification is Clang 15.0.4
-- The CXX compiler identification is Clang 15.0.4
-- Detecting C compiler ABI info
-- Detecting C compiler ABI info - done
-- Check for working C compiler: C:/Users/lanshushui/AppData/Local/OpenHarmony/Sdk/12/native/llvm/bin/clang.exe - skipped
-- Detecting C compile features
-- Detecting C compile features - done
-- Detecting CXX compiler ABI info
-- Detecting CXX compiler ABI info - done
-- Check for working CXX compiler: C:/Users/lanshushui/AppData/Local/OpenHarmony/Sdk/12/native/llvm/bin/clang++.exe - skipped
-- Detecting CXX compile features
-- Detecting CXX compile features - done
-- Configuring done (5.2s)
-- Generating done (0.0s)
-- Build files have been written to: D:/DevEcoStudioProjects/NATIVEOHOS/entry/src/main/cpp/build

D:\DevEcoStudioProjects\NATIVEOHOS\entry\src\main\cpp\build>ninja
[1/2] Building CXX object CMakeFiles/change.dir/napi_init.cpp.o
clang++: warning: argument unused during compilation: '--gcc-toolchain=C:/Users/lanshushui/AppData/Local/OpenHarmony/Sdk/12/native/llvm' [-Wunused-command-line-argument]
[2/2] Linking CXX shared library libchange.so
```



## 接入带napi信息的so库

[官方指导文档](https://developer.huawei.com/consumer/cn/doc/harmonyos-faqs-V5/faqs-ndk-21-V5)

> 前提知识点：
>
> native模板代码生成的hap中lib文件夹，除了自定义代码生成的so库，还有 c++运行时标准库**libc++_shared.so**
>
> 所以如果我们要在纯ArkTs项目中接入命令行生成的so库时，还需要接入libc++_shared.so
>
> 本地目录：C:\Users\lanshushui\AppData\Local\OpenHarmony\Sdk\12\native\llvm\lib\arm-linux-ohos\libc++_shared.so
>
> IDE编译目录：D:\DevEcoStudioProjects\NATIVEOHOS\entry\build\default\intermediates\libs\default\arm64-v8a\libc++_shared.so

[android通过ANDROID_STL 变量来决定使用动态库还是静态库](https://www.cnblogs.com/jackieathome/p/17937700)

[鸿蒙通过OHOS_STL变量来决定使用动态库还是静态库](https://developer.huawei.com/consumer/cn/doc/harmonyos-references-V5/cpp-V5)

###### *将一个native的demo项目改成一个带so库的纯ArtTs项目，通过该操作来了解第三方so库的接入*

1. build后，将 \entry\build\default\intermediates\libs\default\arm64-v8a目录下的两个so库都复制到lib目录下
2. 删除cpp目录下的napi_init.cpp 和CMakeLists.txt文件，以及entry/build-profile.json5的externalNativeOptions属性，使其变成个纯ArkTs项目
3. 运行，功能正常

> type目录下定义的导出文件可能爆红：Declared function 'add' has no native implementation.<ArkTSCheck> ，但实际没有运行问题





Keep Moving Forward
