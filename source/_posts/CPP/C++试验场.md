---
title: C++试验场
categories:
  - CPP
tags:
  - 试验场
  - CPP
abbrlink: 44bbaae6
---





<!-- more -->

## 试验场

### 局部变量传入lambda延迟场景：

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







Keep Moving Forward
