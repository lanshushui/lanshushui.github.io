---
title: C++知识点
categories:
  - CPP
tags:
  - 知识点
  - CPP
abbrlink: 44bbaae6
---



[C++基础教程](https://www.54benniao.com/cpp/rumen/2/)

[C++ 参考手册API](https://www.apiref.com/cpp-zh/index.html)

[cpp11 features case](https://gitcode.com/gh_mirrors/my/myCpp11Study/tree/master/cpp11features)

[CMake 保姆级教程](https://subingwen.cn/cmake/CMake-primer/)



[C++ 单例模式的几种实现方式](https://www.cnblogs.com/tengzijian/p/17473248.html)

<!-- more -->

## Java 和 C++ 对比

> C++ 类继承也有修饰词 关键字class时默认的继承方式是private， 使用struct时默认的继承方式是public

> this并不是一个常规变量, 而是一个 **右值**, 所以不能取得`this`的地址.(不能`&this`, 左值右值的区别就在于是否可以取地址)

> c++实现多态条件：virtual方法+父类指针指向子类对象 **必须是指针

> ```
> People p ;
> Animal a =p; //这是利用复制构造函数创建了个a，不是java语法的用引用a指向实例p
> a.eat();  //打印Animal eat  说明多态失败；这一点和JAVA不一样
> 
> Animal* animal = new People();
> animal->eat(); //打印 People eat  说明多态成功
> 
> //由此延申到具体业务场景：需要用vector或者unordered_map存储子类时，value必须是智能指针(shared_ptr)才能实现多态
> ```

> [C++类定义中，数据成员不能被指定为自身类型，但可以是指向自身类型的指针或引用？为什么在类体内可以定义将静态成员声明为其所属类的类型呢 ?](https://www.cnblogs.com/guxuanqing/p/5876768.html)





## 基础开发特点

### 基础语法：

> if(auto xxx = fun()){} ，可以这样子判空

> [拷贝构造函数，赋值函数的区别](https://www.cnblogs.com/liushui-sky/p/7728902.html)

> [using语法和typedef语法区别](https://subingwen.cn/cpp/using/)

> [nullptr和NULL的区别](https://subingwen.cn/cpp/nullptr/)   [std::nullopt](https://www.apiref.com/cpp-zh/cpp/utility/optional/nullopt.html)

> [C++命名空间（namespace）](https://www.54benniao.com/view/6326.html)

> [const & constexpr的区别](https://www.luozhiyun.com/archives/756)

> `typedef int (FUNC)(int,int)`，定义了一个函数类型FUNC，可以使用FUNC去定义函数。
>
> `typedef int (*FUNC_P)(int, int)`, 定义了一个函数指针类型，可以使用`FUNC_P`去定义指向函数的指针
>
> [typedef函数知识来源](https://blog.51cto.com/u_15295315/2999214)



### std标准库

#### std::string

> <font color="red">switch 不能用std::string  </font>

> std::string 判断字符串相等 可以直接用==

> [数值类型和字符串之间的转换: to_string , stoi](https://subingwen.cn/cpp/convert/)

> [使用R“()” 定义原始字面量](https://subingwen.cn/cpp/R/)



#### unordered_map知识

> unordered_map用 []访问，但key不存在时，访问仍然成功，取得value对象默认构造的值

> unordered_map取值方式：  if (map.find(key) != map.end()) {}

> enum可以直接作为map的key，却不能直接作为unordered_map的key【除非指定第三个参数std::hash<int>】。

> value不能是抽象类，针对这场景需要用到指针或者智能指针shared_ptr



#### 杂余：

> [std::is_enum   检查 `T` 是否为枚举类型](https://www.apiref.com/cpp-zh/cpp/types/is_enum.html)

> [强制类型转换操作符 static_cast](https://www.cnblogs.com/QG-whz/p/4509710.html)

> [存储固定集合中的任意类型的值 std::variant](https://cloud.tencent.com/developer/article/2414270)



### 方法与类：

> [Lambda表达式](https://subingwen.cn/cpp/lambda/)

> [继承构造函数的使用方法是这样的：通过使用using 类名::构造函数名](https://subingwen.cn/cpp/construct/#2-%E7%BB%A7%E6%89%BF%E6%9E%84%E9%80%A0%E5%87%BD%E6%95%B0)





## 业务开发特点

> 测试数据时如果需要在头文件中定义并实现函数，为了避免函数重复定义导致编译失败，方法可以用inline修饰



## 问题场景

###### 





Keep Moving Forward
