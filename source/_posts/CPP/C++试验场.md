---
title: C++试验场
categories:
  - CPP
tags:
  - 试验场
  - CPP
abbrlink: 946195a2
---



[【C++】空指针调用成员函数及访问成员变量](https://blog.csdn.net/qq_38410730/article/details/112003512	)



<!-- more -->

## 试验场

## 局部变量传入lambda延迟场景：

```c
#include <iostream>
#include <functional>
#include <thread>
#include <chrono>

class MyClass {
public:
    // 默认构造函数
    MyClass() {
        std::cout << "Default constructor called." << std::endl;
    }

    // 复制构造函数
    MyClass(const MyClass& other) {
        std::cout << "Copy constructor called." << std::endl;
    }

    // 移动构造函数
    MyClass(MyClass&& other) noexcept {
        std::cout << "Move constructor called." << std::endl;
    }

    // 赋值运算符
    MyClass& operator=(const MyClass& other) {
        std::cout << "Copy assignment operator called." << std::endl;
        return *this;
    }

    // 移动赋值运算符
    MyClass& operator=(MyClass&& other) noexcept {
        std::cout << "Move assignment operator called." << std::endl;
        return *this;
    }

    ~MyClass(){
        std::cout << "MyClass destruction called" << std::endl;
        destruction = true;
    }

    void test() const{
        std::cout << "test call destruction: " <<destruction<< std::endl;
    }
    bool destruction{false};
};

void printValue(MyClass& x) {
    x.test();
}

std::thread testFunction() {
    MyClass myClass;
    // 创建一个延迟执行的Lambda表达式
    auto delayedLambda = [&]() {
        std::this_thread::sleep_for(std::chrono::seconds(1)); // 延迟1秒
        printValue(myClass); // 使用捕获的值
    };

    // 返回一个线程对象，该线程将执行Lambda表达式
    return std::thread(delayedLambda);
}

int main() {
    // 调用测试函数并获取线程对象
    std::thread t1 = testFunction();
    // 等待线程结束
    t1.join();

    return 0;
}
```

> Default constructor called.
> MyClass destruction called
> test call destruction: 1
>
> 结论：引用传递，局部变量会先析构，后面执行的lambda代码会出现问题



## c++ 函数模板使用引用参数

```c
#include <iostream>
 
// 定义一个函数模板，接受引用参数
template <typename T>
void addOne(T& value) {
    value += 1;
}
 
int main() {
    int intValue = 5;
    double doubleValue = 3.14;
 
    std::cout << "Before adding one:" << std::endl;
    std::cout << "intValue = " << intValue << std::endl;
    std::cout << "doubleValue = " << doubleValue << std::endl;
 
    // 调用函数模板，传递引用参数
    addOne(intValue);
    addOne(doubleValue);
 
    std::cout << "After adding one:" << std::endl;
    std::cout << "intValue = " << intValue << std::endl;
    std::cout << "doubleValue = " << doubleValue << std::endl;
 
    return 0;
}
```

> Before adding one:
> intValue = 5
> doubleValue = 3.14
> After adding one:
> intValue = 6
> doubleValue = 4.14
>
> 结论：函数模板可以使用& 



## lambda 函数使用引用参数

```c
#include <iostream>

int main() {
    int intValue = 5;

    const auto addFun = [](int& a){
        a+=1;
    };
    std::cout << "Before adding one:" << std::endl;
    std::cout << "intValue = " << intValue << std::endl;

    addFun(intValue);

    std::cout << "After adding one:" << std::endl;
    std::cout << "intValue = " << intValue << std::endl;
    return 0;
}
```

> Before adding one:
> intValue = 5
> After adding one:
> intValue = 6
>
> 结论：lambda函数可以使用& 



```c
#include <iostream>
#include <functional>

class MyClass {
public:
    // 默认构造函数
    MyClass() {
        std::cout << "Default constructor called." << std::endl;
    }

    // 复制构造函数
    MyClass(const MyClass& other) {
        std::cout << "Copy constructor called." << std::endl;
    }

    // 移动构造函数
    MyClass(MyClass&& other) noexcept {
        std::cout << "Move constructor called." << std::endl;
    }

    // 赋值运算符
    MyClass& operator=(const MyClass& other) {
        std::cout << "Copy assignment operator called." << std::endl;
        return *this;
    }

    // 移动赋值运算符
    MyClass& operator=(MyClass&& other) noexcept {
        std::cout << "Move assignment operator called." << std::endl;
        return *this;
    }

    ~MyClass(){
        std::cout << "MyClass destruction called" << std::endl;
        destruction = true;
    }

    void test() const{
        std::cout << "test call destruction: " <<destruction<< std::endl;
    }
    bool destruction{false};
    int data{0};
};

int main() {
    MyClass myClass;

    const auto addFun = [](MyClass& a){
        a.data+=1;
    };
    const auto addFunImp =[&](std::function<void(MyClass&)> add){
        add(myClass);
    };
    std::cout << "Before adding one:" << std::endl;
    std::cout << "intValue = " << myClass.data << std::endl;

    addFunImp(addFun);

    std::cout << "After adding one:" << std::endl;
    std::cout << "intValue = " << myClass.data << std::endl;
    return 0;
}
```

> Default constructor called.
> Before adding one:
> intValue = 0
> After adding one:
> intValue = 1
> MyClass destruction called
>
> 结论：嵌套lambda函数使用& 也生效 

```c
//样式1
const auto addFun = [](MyClass a){
    a.data+=1;
};
const auto addFunImp =[&](std::function<void(MyClass)> add){
    add(myClass);
};
addFunImp(addFun);
/*
Default constructor called.
Copy constructor called.
Move constructor called.
MyClass destruction called
MyClass destruction called
MyClass destruction called
*/

//样式2
const auto addFun = [](MyClass a){
    a.data+=1;
};
const auto addFunImp =[&](std::function<void(MyClass&)> add){
    add(myClass);
};
addFunImp(addFun);
/*
Default constructor called.
Copy constructor called.
MyClass destruction called
MyClass destruction called
*/

//样式3
const auto addFun = [](MyClass& a){
    a.data+=1;
};
const auto addFunImp =[&](std::function<void(MyClass)> add){
    add(myClass);
};
addFunImp(addFun); //这行编译失败
//样式3 无法编译通过

//样式4
const auto addFun = [](MyClass&& a){
    a.data+=1;
};
const auto addFunImp =[&](std::function<void(MyClass)> add){
    add(myClass);
};
addFunImp(addFun);
/*
Default constructor called.
Copy constructor called.
MyClass destruction called
MyClass destruction called
*/

//样式5
const auto addFun = [](MyClass a){
    a.data+=1;
};
const auto addFunImp =[&](std::function<void(MyClass&&)> add){
    add(std::move(myClass));
};
addFunImp(addFun);
/*
Default constructor called.
Move constructor called.
MyClass destruction called
MyClass destruction called
*/


//样式6
const auto addFun = [](MyClass&& a){
    a.data+=1;
};
const auto addFunImp =[&](std::function<void(MyClass&&)> add){
    add(std::move(myClass));
};
addFunImp(addFun);
/*
Default constructor called.
MyClass destruction called
*/

//样式7
const auto addFun = [](MyClass&& a){
    a.data+=1;
};
const auto addFunImp =[&](std::function<void(MyClass&)> add){
    add(myClass);
};
addFunImp(addFun); //这行编译失败
//样式7 无法编译通过

//样式8
const auto addFun = [](MyClass& a){
    a.data+=1;
};
const auto addFunImp =[&](std::function<void(MyClass&&)> add){
    add(std::move(myClass));
};
addFunImp(addFun);//这行编译失败
//样式8 无法编译通过
```



## 空指针研究

```c
#include <iostream>

class A {
  public:
    A() { a_ = 1; }
    ~A() { }

    int GetValueA() {
      std::cout << "GetValueA()" << std::endl;
      return a_;
    }
    void fun() {
      std::cout << "fun()" << std::endl;
    }

    int a_;
};

int main() {
  A *a = nullptr;
  a->fun();  //没有发生异常，正常打印 fun()


  return 0;
}

```



Keep Moving Forward
