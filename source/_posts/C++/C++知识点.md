---
title: C++知识点
categories:
  - C++
tags:
  - 知识点
  - C++
abbrlink: 44bbaae6
---



[C++基础教程](https://www.54benniao.com/cpp/rumen/2/)

[C++ 参考手册API](https://www.apiref.com/cpp-zh/index.html)

[CMake 保姆级教程](https://subingwen.cn/cmake/CMake-primer/)



[C++ 单例模式的几种实现方式](https://www.cnblogs.com/tengzijian/p/17473248.html)

<!-- more -->

## Java 和 C++ 对比

> C++ 类继承也有修饰词 关键字class时默认的继承方式是private， 使用struct时默认的继承方式是public

> this并不是一个常规变量, 而是一个 **右值**, 所以不能取得`this`的地址.(不能`&this`, 左值右值的区别就在于是否可以取地址)



## 基础开发特点

### 基础语法：

> [using语法和typedef语法区别](https://subingwen.cn/cpp/using/)

> [nullptr和NULL的区别](https://subingwen.cn/cpp/nullptr/)

> [C++命名空间（namespace）](https://www.54benniao.com/view/6326.html)

> [std::is_enum   检查 `T` 是否为枚举类型](https://www.apiref.com/cpp-zh/cpp/types/is_enum.html)

> [强制类型转换操作符 static_cast](https://www.cnblogs.com/QG-whz/p/4509710.html)

> [存储固定集合中的任意类型的值 std::variant](https://cloud.tencent.com/developer/article/2414270)



### 方法与类：

> [Lambda表达式](https://subingwen.cn/cpp/lambda/)

> [继承构造函数的使用方法是这样的：通过使用using 类名::构造函数名](https://subingwen.cn/cpp/construct/#2-%E7%BB%A7%E6%89%BF%E6%9E%84%E9%80%A0%E5%87%BD%E6%95%B0)





## 业务开发特点

> [数值类型和字符串之间的转换: to_string , stoi](https://subingwen.cn/cpp/convert/)

> [使用R“()” 定义原始字面量](https://subingwen.cn/cpp/R/)

> 测试数据时如果需要在头文件中定义并实现函数，为了避免函数重复定义导致编译失败，方法可以用inline修饰





#### unordered_map知识

> unordered_map用 []访问，但key不存在时，访问仍然成功，取得value对象默认构造的值

> enum可以直接作为map的key，却不能直接作为unordered_map的key。

> value不能是抽象类，针对这场景需要用到指针或者智能指针shared_ptr



## 问题场景

###### 





Keep Moving Forward
