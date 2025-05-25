---
title: 鸿蒙native开发
categories:
  - Harmony
tags:
  - Native
top: 100
abbrlink: df80432a
---

[CMake 保姆级教程](https://subingwen.cn/cmake/CMake-primer/)

[NDK开发用例文档](https://developer.huawei.com/consumer/cn/doc/harmonyos-faqs-V5/faqs-ndk-development-V5)

[Native侧如何获取ArkTS侧类实例](https://developer.huawei.com/consumer/cn/doc/harmonyos-faqs-V5/faqs-ndk-53-V5)

[如何在C++调用从ArkTS传递过来的function](https://developer.huawei.com/consumer/cn/doc/harmonyos-faqs-V5/faqs-ndk-26-V5)

[libuv](https://developer.huawei.com/consumer/cn/doc/harmonyos-references-V13/libuv-V13#%E6%94%AF%E6%8C%81%E7%9A%84%E8%83%BD%E5%8A%9B)



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

![](https://s3.bmp.ovh/imgs/2025/05/24/8e43a31ced16f7c8.png)

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

> types文件夹下定义so信息的子文件夹**一定要lib开头**，libxxx。不然会报错

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



## C++如何调用TS

[Native侧如何获取ArkTS侧类实例](https://developer.huawei.com/consumer/cn/doc/harmonyos-faqs-V5/faqs-ndk-53-V5)

> 通过demo代码的debug，发现 ts调到napi_init.cpp的代码，debug区域的线程信息是不同的，但实际通过pid==tid判断，发现是同线程调用，官方文档也有佐证 [通过按钮点击事件调用Native层的接口时，Native层代码是在主线程中执行的](https://developer.huawei.com/consumer/cn/doc/harmonyos-faqs-V5/faqs-ndk-14-V5)
>
> [如何判断是否为主线程](https://developer.huawei.com/consumer/cn/doc/harmonyos-faqs/faqs-arkts-68-V5)

> 很多时候C++层需要长期持有ts的对象，方便随时回调
>
> 不能直接保存napi_value，因为它有生命周期！！！[Native侧如何合理管控对象的生命周期](https://developer.huawei.com/consumer/cn/doc/harmonyos-faqs-V5/faqs-ndk-80-V5)
>
> 通过napi_ref 延长对象生命周期，napi_create_reference; napi_get_reference_value；napi_delete_reference 来保存获取ts对象



## 如何导出C++自定义类，导出后如何在ArkTS侧进行类方法调用？

[文档来源](https://blog.csdn.net/m0_70748845/article/details/147982946)    

C++侧定义类

```c
// MyDemo.h 定义C++ 类 
class MyDemo { 
  public: 
    MyDemo(std::string m_name); 
    MyDemo(); 
    ~MyDemo();   
    std::string name; 
    int add(int a, int b); 
    int sub(int a, int b); 
};

```

完成ArkTS类与C++侧的映射关系，并将其挂载到export上。

```c
// ArkTS对象构造函数 
static napi_value JsConstructor(napi_env env, napi_callback_info info) { 
    // 创建napi对象 
    napi_value jDemo = nullptr; 
    size_t argc = 0; 
    napi_value args[1] = {0}; 
    // 获取构造函数入参 
    napi_get_cb_info(env, info, &argc, args, &jDemo, nullptr); 
    // args[0] js传入的参数 
    char name[50]; 
    size_t result = 0; 
    napi_get_value_string_utf8(env, args[0], name, sizeof(name) + 1, &result); 
    // 创建C++对象 
    MyDemo *cDemo = new MyDemo(name);
    // 设置js对象name属性 
    napi_set_named_property(env, jDemo, "name", args[0]); 
    // 绑定JS对象与C++对象 
    napi_wrap( 
        env, jDemo, cDemo, 
        // 定义js对象回收时回调函数，用来销毁C++对象，防止内存泄漏 
        [](napi_env env, void *finalize_data, void *finalize_hint) { 
            MyDemo *cDemo = (MyDemo *)finalize_data; 
            delete cDemo; 
            cDemo = nullptr; 
        }, 
        nullptr, nullptr); 
    return jDemo; 
} 
// ArkTS对象add函数 
static napi_value JsAdd(napi_env env, napi_callback_info info) { 
    size_t argc = 2; 
    napi_value args[2] = {nullptr}; 
    napi_value jDemo = nullptr; 
    napi_get_cb_info(env, info, &argc, args, &jDemo, nullptr); 
    MyDemo *cDemo = nullptr; 
    // 将ArkTS对象转为c对象 
    napi_unwrap(env, jDemo, (void **)&cDemo); 
    // 获取ArkTS传递的参数 
    int value0; 
    napi_get_value_int32(env, args[0], &value0); 
    int value1; 
    napi_get_value_int32(env, args[1], &value1); 
    int cResult = cDemo->add(value0, value1); 
    napi_value jResult; 
    napi_create_int32(env, cResult, &jResult); 
    return jResult; 
} 
// ArkTS对象sub函数 
static napi_value JsSub(napi_env env, napi_callback_info info) { 
    size_t argc = 2; 
    napi_value args[2] = {nullptr}; 
    napi_value jDemo = nullptr; 
    napi_get_cb_info(env, info, &argc, args, &jDemo, nullptr); 
    MyDemo *cDemo = nullptr; 
    // 将ArkTS对象转为c对象 
    napi_unwrap(env, jDemo, (void **)&cDemo); 
    // 获取ArkTS传递的参数 
    int value0; 
    napi_get_value_int32(env, args[0], &value0); 
    int value1; 
    napi_get_value_int32(env, args[1], &value1); 
    int cResult = cDemo->sub(value0, value1); 
    napi_value jResult; 
    napi_create_int32(env, cResult, &jResult); 
    return jResult; 
} 
static napi_value Add(napi_env env, napi_callback_info info) { 
    size_t requireArgc = 2; 
    size_t argc = 2; 
    napi_value args[2] = {nullptr}; 
    napi_get_cb_info(env, info, &argc, args, nullptr, nullptr); 
    napi_valuetype valuetype0; 
    napi_typeof(env, args[0], &valuetype0); 
    napi_valuetype valuetype1; 
    napi_typeof(env, args[1], &valuetype1); 
    int value0; 
    napi_get_value_int32(env, args[0], &value0); 
    int value1; 
    napi_get_value_int32(env, args[1], &value1); 
    MyDemo *demo = new MyDemo(); 
    // 调用so中函数进行运算 
    int result = demo->add(value0, value1); 
    napi_value sum; 
    napi_create_int32(env, result, &sum); 
    delete demo; 
    return sum; 
} 
static napi_value Sub(napi_env env, napi_callback_info info) { 
    size_t argc = 2; 
    napi_value args[2] = {nullptr}; 
    napi_get_cb_info(env, info, &argc, args, nullptr, nullptr); 
    napi_valuetype valuetype0; 
    napi_typeof(env, args[0], &valuetype0); 
    napi_valuetype valuetype1; 
    napi_typeof(env, args[1], &valuetype1); 
    int value0; 
    napi_get_value_int32(env, args[0], &value0); 
    int value1; 
    napi_get_value_int32(env, args[1], &value1); 
    MyDemo *demo = new MyDemo(); 
    // 调用so中函数进行运算 
    int result = demo->sub(value0, value1); 
    napi_value num; 
    napi_create_int32(env, result, &num); 
    delete demo; 
    return num; 
} 

static napi_value Init(napi_env env, napi_value exports) { 
    // 定义模块需要对外暴露的方法 
    napi_property_descriptor desc[] = {{"add", nullptr, Add, nullptr, nullptr, nullptr, napi_default, nullptr}, 
                                       {"sub", nullptr, Sub, nullptr, nullptr, nullptr, napi_default, nullptr}}; 
    napi_define_properties(env, exports, sizeof(desc) / sizeof(desc[0]), desc); 
    // 通过napi_define_class建立ArkTS类与C++侧的映射关系，然后将对应的对象挂载到export上 
    napi_property_descriptor classProp[] = {{"add", nullptr, JsAdd, nullptr, nullptr, nullptr, napi_default, nullptr}, 
                                            {"sub", nullptr, JsSub, nullptr, nullptr, nullptr, napi_default, nullptr}}; 
    napi_value jDemo = nullptr; 
    const char *jDemoName = "MyDemo"; 
    // 建立ArkTS构造函数与C++方法的关联,指定2个prop 
    napi_define_class(env, jDemoName, sizeof(jDemoName), JsConstructor, nullptr, 
                      sizeof(classProp) / sizeof(classProp[0]), classProp, &jDemo); 
    napi_set_named_property(env, exports, jDemoName, jDemo); 
    return exports; 
}
```

index.d.ts文件中定义ArkTS类

```c
declare namespace testNapi { 
  const add: (a: number, b: number) => number; 
  const sub: (a: number, b: number) => number; 
  // 定义ArkTS接口 
  class MyDemo { 
    constructor(name:string) 
    name: string 
    add(a: number, b: number): number 
    sub(a: number, b: number): number 
  } 
} 
export default testNapi;

```

ArkTS侧实现调用

```c
import testNapi from 'libentry.so'; 
// ... 
    new testNapi.MyDemo('abc'); 
    hilog.info(0x0000, 'testTag', 'Test NAPI 2 + 3 = %{public}d', testNapi.add(2, 3)); 
    hilog.info(0x0000, 'testTag', 'Test NAPI 2 - 3 = %{public}d', testNapi.sub(2, 3)); 
// ... 
```



## so库是如何，何时加载的？

so库是在import代码执行后就会加载，不是调用so库暴露的方法才被加载

当然代码中必须有地方使用so库暴露的函数，否则import代码会被标记为 'testNapi' is declared but its value is never read，编译包时把import这一行给删除了。

```typescript
import testNapi from 'libchange.so';
//在编译后会变成
import testNapi from "@normalized:Y&&&libchange.so&";
```

so库加载时 RegisterEntryModule  入口函数会被调用

![](https://s3.bmp.ovh/imgs/2025/05/17/57649cac7d903b59.png)











## 小知识点

[暂不支持在c++子线程调用ArkTS接口，当前只能通过callback异步调用或者线程安全的方式进行回调处理](https://developer.huawei.com/consumer/cn/doc/harmonyos-faqs-V5/faqs-ndk-8-V5)

Keep Moving Forward
