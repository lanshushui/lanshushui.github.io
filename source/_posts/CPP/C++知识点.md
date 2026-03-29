---
title: C++知识点
categories:
  - CPP
tags:
  - 知识点
  - CPP
abbrlink: 44bbaae
---

[C++最权威教程](https://cntransgroup.github.io/EffectiveModernCppChinese/3.MovingToModernCpp/item17.html)



[C++基础教程](https://www.54benniao.com/cpp/rumen/2/)

[C++ 参考手册API](https://www.apiref.com/cpp-zh/index.html)

[cpp11 features case](https://gitcode.com/gh_mirrors/my/myCpp11Study/tree/master/cpp11features)

[CMake 保姆级教程](https://subingwen.cn/cmake/CMake-primer/)



[C++ 单例模式的几种实现方式](https://www.cnblogs.com/tengzijian/p/17473248.html)

<!-- more -->

## Java 和 C++ 对比

> C++ 特色：子类不会自动继承父类的构造函数！（除非父类的构造函数是没有参数的默认构造函数） [来源](https://parallel101.github.io/cppguidebook/cpp_tricks/#_7)

> 不要在构造函数体内部初始化数据成员，因为只有当类的所有成员初始化完成之后才开始执行构造函数体，此时并不是真正意义上的初始化，而是重新**赋值  **[来源](https://xie.infoq.cn/article/63aff5cc0b896f4bd1e8f3ed3)

> c++类的属性都会默认初始化，如果要延迟初始化，可以用  指针 或者 std::optional [来源](https://parallel101.github.io/cppguidebook/cpp_tricks/#optional)

> C++ 类继承也有修饰词 关键字class时默认的继承方式是private， 使用struct时默认的继承方式是public

> this并不是一个常规变量, 而是一个 **右值**, 所以不能取得`this`的地址.(不能`&this`, 左值右值的区别就在于是否可以取地址)

> c++实现多态条件：virtual方法+父类指针指向子类对象 **必须是指针
>
> [虚函数表原理](https://cloud.tencent.com/developer/article/1599283)   从这篇文章也能看出为什么实现多态必须是指针或者引用

> ```c
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

> [空指针调用不一定会出现崩溃](https://blog.csdn.net/qq_38410730/article/details/112003512)

> vector的begin 得到数组头的指针，end 得到数组的最后一个单元+1的指针，不是指向最后一个元素，要使用rbegin
>



## 基础开发特点

[标准库的类型萃取类型](https://zh.cppreference.com/w/cpp/meta#Type_traits)



### 基础知识

#### 1.malloc和new申请的内存都是虚拟内存

- **虚拟内存层面：**`virtual memory` = `clean memory` + `dirty memory.`

- **物理内存层面：**`resident memory`= `dirty memory`+`clean memory that loaded in physical memory`
- **总结**`virtual memory` == (`clean memory` + `dirty memory`) > `resident memory` >`dirty memory`

```c
// clean memory
char *buf = malloc(100*1024*1024)

// dirty memory
for(int i=0; i < 3*1024*1024; ++i){
    buf[i] = rand()
}
/**
首先申请了100兆的虚拟内存，操作系统很懒的，你申请了，但是你只要不用，我就不会给你分配物理内存。后来for循环中，我们进行读写，操作系统就会分配3兆的物理内存，而其他97兆是在虚拟内存。
**/
```



#### 2.构造和析构函数顺序

##### 1.属性比类先构造，先声明的属性先构造

```c
class C{
  D d;
  E e;  
};
/**
D()
E()
C()
~C()
~E()
~D()
**/
```





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

> 所以仅当下面条件成立时才会生成移动操作（当需要时）[来源](https://cntransgroup.github.io/EffectiveModernCppChinese/3.MovingToModernCpp/item17.html)
>
> - 类中没有拷贝操作
> - 类中没有移动操作
> - 类中没有用户定义的析构
>
> 自定义移动赋值函数时记得加上noexcept关键词  [来源](https://www.bilibili.com/video/BV16NiSBfEUZ/?spm_id_from=333.1391.0.0&vd_source=f02f9d2b6ca3710611c51219432586fa)



### std标准库

#### 基础类型

| 特性         | `long`                                     | `long long`        | `int64_t`                         |
| ------------ | ------------------------------------------ | ------------------ | --------------------------------- |
| **C++标准**  | 传统类型 (C++98)                           | C++11 起正式引入   | C++11 起引入 (头文件 `<cstdint>`) |
| **最小位数** | **至少 32 位**                             | **至少 64 位**     | **精确 64 位**                    |
| **典型位数** | 32 位 (Windows/Linux64) 或 64 位 (Linux64) | 64 位              | 64 位                             |
| **取值范围** | 平台相关                                   | 至少 ±9×10¹⁸       | 精确 ±9.22×10¹⁸                   |
| **可移植性** | ❌ 差（位数不固定）                         | ⚠️ 中等（至少64位） | ✅ 最好（固定位数）                |



#### char知识

[判断某个字符型是否为数字: isdigit()函数](https://blog.csdn.net/qq_36736330/article/details/81448324)

#### std::string知识

> 在 C++ 中，任何时候都务必用 string！别用 C 语言老掉牙的 const char *，太危险了。
>
> const char * 危险的原因：
>
> 1. const char * 的 == 判断的是指针的相等，两个 const char * 只要地址不同，即使实际的字符串相同，也不会被视为同一个元素（如上代码案例所示）。导致 map 里会出现重复的键，以及按键查找可能找不到等。
> 2. 保存的是弱引用，如果你把局部的 char [] 或 string.c_str() 返回的 const char * 存入 map，等这些局部释放了，map 中的 const char * 就是一个空悬指针了，会造成 segfault。

> <font color="red">switch 不能用std::string  </font>

> string 的 == 运算符是经过重载的，比较的是字符串里面的内容相等，而不是地址相等 
>
> std::string 判断字符串相等 可以直接用== ，判空可以用 isEmpty()

> [数值类型和字符串之间的转换: to_string , stoi](https://subingwen.cn/cpp/convert/)

> [使用R“()” 定义原始字面量](https://subingwen.cn/cpp/R/)   字面量中有"的话 可以用[自定义边界符](https://zhuanlan.zhihu.com/p/641890499) 

> 分割版本字符串并转换为整数
>
> ```c
> int numbers[3];
> std::istringstream ss(version);
> std::string token;
> size_t index = 0;
> while (std::getline(ss, token, '.') && index < 3) {
>     numbers[index] = std::stoi(token);
>     ++index;
> }
> ```



#### std::list知识

> 遍历时记得用&引用承接变量  for (const auto& pair : list)

> 获得倒数第二个元素：double penultimate = *std::prev(foo.end(), 2)     [来源](https://cloud.tencent.com/developer/ask/sof/89429)

> 反向遍历 [来源](https://articles.oyoung.cc/2020/09/24/C-%E5%B0%8F%E6%8A%80%E5%B7%A7-%E9%9B%86%E5%90%88-vector-list-map-set-%E7%9A%84%E5%8F%8D%E5%90%91%E9%81%8D%E5%8E%86/)

```c
for(auto it = collection.rbegin(); it != collection.rend(); ++it) {
 std::cout << *it << std::endl;
 // std::cout << it->first << ", " << it->second << std::endl;
}
```



#### std::vector知识

> 遍历时记得用&引用承接变量  for (const auto& pair : vector)

> [高效删除单个 vector 元素](https://parallel101.github.io/cppguidebook/cpp_tricks/#vector)

> vector字节怎么转换为string :    std::string str(vec.begin(), vec.end());
>
> vector字节怎么转换为char* :    char* char_ptr = reinterpret_cast<char*>(vec.data());



#### std::unordered_map知识

> 遍历时记得用&引用承接变量  for (const auto& pair : map)

> unordered_map用 []访问，但key不存在时，访问仍然成功，取得value对象默认构造的值

> insert 不会替换现有值，可以使用 `[]` 运算符或者`insert_or_assign` 函数

> unordered_map取值方式：  if (map.find(key) != map.end()) {}

> enum可以直接作为map的key，却不能直接作为unordered_map的key【除非指定第三个参数std::hash<int>】。

> value不能是抽象类，针对这场景需要用到指针或者智能指针shared_ptr

> 删除  myMap.erase(1)；
>
> [一边遍历 map，一边删除](https://parallel101.github.io/cppguidebook/cpp_tricks/#map)





#### lambda知识

> 隐式捕获可以和显式捕获搭配使用，但不能和同类型的显示捕获一起使用。即隐式值捕获只能搭配显式引用捕获，隐式引用捕获只能搭配显式值捕获。表现形式为："[=,&变量1,&变量2]"或者"[&,变量1,变量2]





#### std::function知识 + std::ref知识

> [std::ref用法以及和&引用区别](https://blog.csdn.net/qq_44918090/article/details/127354840)

> 参数为int，返回值为string ：std::function\<std::string(int)> func         
>
> 无参，返回值为void            ：std::function<void()> func

[对 this 的捕获，通过 `[&]` 和 `[=]` 对 this 的隐式捕获，以及 `[this]` 显式捕获都是 `by-reference` 的，其实捕获的都是 this 指针。](https://cloud.tencent.com/developer/article/2220354)

> 将一个类的函数赋值给std::function变量，使用std::bind方法 [用例](https://blog.csdn.net/qq_38410730/article/details/103637778)
>
> ```c
> 
> class Demo{
> public:
>     void A(std::string str){
>         std::cout << str << std::endl;
>    }
>    void B(std::function<void(std::string)> func){
>        func("hello world");
>    }
>     void call(){
>         B(std::bind(&Demo::A,this, std::placeholders::_1)); //使用占位符，打印hello world
>         B(std::bind(&Demo::A,this, "test")); //传入实际参数，会忽略后续调用传入的参数，打印test
>      }
> };
> ```



#### std::span知识

> absl::Span对std::vector就像absl::string_view对std::string一样。它为vector的元素提供只读接口，但是它也可以从由非vector(如数组和初始化列表)来构造，并且不会产生拷贝元素的消耗。[来源](https://blog.csdn.net/feihe0755/article/details/119428065)

[C++ 20新特性之std::span 用法](https://juejin.cn/post/7398741211657191465)



#### std::mutex知识

> [lock_guard、unique_lock、shared_lock、scoped_lock、recursive_mutex](https://blog.csdn.net/weixin_44477424/article/details/130694304)



#### std::getline知识

`getline` 从输入流读取字符并将它们放进字符串 [官方文档](https://zh.cppreference.com/w/cpp/string/basic_string/getline)



#### std::is_same std::is_base_of知识

常用于模板中判断是否是某类型(的子类) [官方文档](https://zh.cppreference.com/w/cpp/types/is_base_of)



#### std::call_once 知识

[保证函数在任何情况下只调用一次](https://www.cnblogs.com/moodlxs/p/10111859.html)



####  std::optional知识

> 传递时值传递的，所以会造成性能问题和潜在问题 [关于std::optional传递开销的讨论与优化](https://zhuanlan.zhihu.com/p/438821425)
>
> 解决方式： std::optional<std::reference_wrapper<const T>>

```c
#include <iostream>
#include <functional>
#include <optional>

class A {
    public:
    std::string a;

    A() { a = "1"; }
};

class MyClass {
    public:
    // 默认构造函数
    MyClass() { this->a = A(); }

    std::optional<A> GetA() { return this->a; }

    std::optional<std::reference_wrapper<A>> GetARef() { return this->a.value(); }

    public:
    std::optional<A> a;
};

int main() {
    MyClass myClass;
    std::cout << "Test 1"<< std::endl;

    myClass.GetA().value().a = "2";
    std::cout << myClass.a->a << std::endl;

    std::cout << "-----------" << std::endl;
    std::cout << "Test 2"<< std::endl;

    myClass.GetARef().value().get().a = "2";
    std::cout << myClass.a->a<< std::endl;

    return 0;
}
//Test 1
//1
//-----------
//Test 2
//2
```



#### 指针知识

[enable_shared_from_this 的使用及实现原理](https://blog.guorongfei.com/2017/01/25/enbale-shared-from-this-implementaion/)

[shared_ptr在多线程下的安全性问题](https://blog.csdn.net/www_dong/article/details/114418454)

```c
//基类指针转为子类指针
//可能会导致SIGSEGV问题，确保basePtr不是野指针
if(auto* prt =std::dynamic_cast<XXX>(basePtr)){
 
}
//基类智能指针转为子类智能指针
if(auto* prt =std::dynamic_pointer_cast<XXX>(basePtr)){
 
}
//指针转为long类型
long p = std::reinterpret_cast<Long>(ptr)
```



#### 线程知识

[pthread_key_t和pthread_key_create()详解](https://blog.csdn.net/qq_34888036/article/details/133960234)

> 局部变量的thread_local会自动添加static 关键词，所以 thread_local int V; 和 static thread_local int V;是完全等量的 [来源](https://stackoverflow.com/questions/22794382/are-c11-thread-local-variables-automatically-static)



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

##### 1.头文件互相引用，导致编译不通过

[头文件中使用前向定义，不引入依赖头文件，把依赖头文件写入放入其cpp文件中](https://blog.csdn.net/qq_34018840/article/details/106433498)



##### 2.dynamic_cast可能导致SIGSEGV异常

```c
#include <iostream>

class Father {
    public:
    virtual void speak() {
        std::cout << "Father speak";
    }
};

class Son : public Father {
    public:
    void speak() override {
        std::cout << "Son speak";
    }
};

int main() {
    Father *base = new Son();
    delete base;
    if(base) {
        if (Son *son = dynamic_cast<Son *>(base)) {
            son->speak();
        }
    }
    return 0;
}

```

> delete后指针不是0，还是指向一个被释放的地址，所以if条件判断还是能够进入
>
> base指向已经被释放的指针，dynamic_cast会出现SIGSEGV问题
>
> if (Son *son = dynamic_cast<Son *>(base))  的用法只能用于base是个没问题指针或者是nullptr



##### 3.空指针问题可能导致SEGV_MAPERR

```c
v8::Isolate* __isolate = reinterpret_cast<v8::Isolate*>((engine)); 
v8::Isolate::Scope __isolate_scope(__isolate); 
//如果engine指针是0 则会触发
//Reason:Signal:SIGSEGV(SEGV_MAPERR)@0x000000000000ca18 
//#00 pc 0000000000bd497c /data/storage/el1/bundle/libs/arm64/libmmv8.so(v8::internal::Isolate::Enter()+164)
//(8c44e81ca123b2797f85f3d16cfea9aec6c4e148)
```

> 这是因为c++的空指针不一定会出现NPE，但调用对象的某个方法时，会因为踩到(0+偏移地址)导致 访问无法访问的内核地址



## Cmake知识

[Cmake踩坑(option 设置不生效)](https://blog.csdn.net/qq_36383272/article/details/118157815)



Keep Moving Forward
