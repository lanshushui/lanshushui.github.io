---
title: ASM知识点
categories:
  - 知识点
tags:
  - ASM
  - HOOK
top: 100
abbrlink: 3098f3f8
---



[【Android】函数插桩（Gradle + ASM）](https://www.jianshu.com/p/16ed4d233fd1)

通过上面的大神教程，学习在自定义函数前后进行插桩，满足打点日志的需求。



但如果想要知道APP中什么时候调用系统的方法，例如想要知道APP【哪些地方】【什么时候】调用了 context.getSystemService() 方法，以及当时的堆栈，

Hook替换掉context.getSystemService()这一行代码为是最简单的操作



*利用ASM的  **AdviceAdapter** 类和  **INVOKESTATIC**  操作码很容易就实现函数的Hook替换功能*



<!-- more -->



## 1.自定义AdviceAdapter

```kotlin
class MethodHookAdapter(
    mv: MethodVisitor,
    desc: String,
    name: String,
    access: Int
) : AdviceAdapter(Opcodes.ASM5, mv, access, name, desc) {

    override fun visitMethodInsn(
        opcode: Int,
        owner: String,
        name: String,
        descriptor: String,
        isInterface: Boolean
    ) {
        if (isHook(opcode,owner,name,descriptor,isInterface)) {
            //满足hook条件，则替换成自定义的static函数
            super.visitMethodInsn(
                INVOKESTATIC,
                newOwner,
                newMethodName,
                newMethodDesc,
                false
            )
        } else {
            super.visitMethodInsn(opcode, owner, name, descriptor, isInterface)
        }
    }
}
```



但对自定义Hook函数的newMethodDesc有一定的要求

```
如果hook的函数是实例对象的函数，即操作码是INVOKESPECIAL。自定义Hook函数的参数列表必须是 [要Hook的对象类，Hook函数原本的参数列表]
如果hook的函数是静态函数，即操作码是INVOKESTATIC。自定义Hook函数的参数列表则保持一致    [Hook函数原本的参数列表]
```



用例代码：

```java
public class A {

    void a(int x, int y) {
    }

    static void b(int x, int y) {
    }
}

public class HookA {
	
    //hook A.a()方法，参数列表最前面必须加个A的参数
    static void hookA(A a, int x, int y) {
    }
    
	//hook A.b()方法，参数列表保持一致
    static void hookB(int x, int y) {
    }
}
```



## 2.Hook参数列表为什么必须这样子设计？

###### *分析字节码-1*

```kotlin
void a(){
    Context context= new Activity();
    //调用实例方法
    Object systemService = context.getSystemService(Context.WINDOW_SERVICE);
}


//下面为上面a函数的字节码

.method a()V
.registers 3

.line 9
//调用Activity()方法，将返回值放进v0寄存器中
new-instance v0, Landroid/app/Activity;
//调用v0寄存器中的实例对象的init方法
invoke-direct {v0}, Landroid/app/Activity;-><init>()V

.line 10
.local v0, "context":Landroid/content/Context;
//将字符串"window"赋值给寄存器v1
const-string v1, "window"

//调用v0寄存器中的值的getSystemService(String)方法，参数内容是v1寄存器内的值
invoke-virtual {v0, v1}, Landroid/content/Context;->getSystemService(Ljava/lang/String;)Ljava/lang/Object;
//前一个方法调用的返回值存储到寄存器 v1 中。
move-result-object v1

.line 11
.local v1, "systemService":Ljava/lang/Object;
return-void
.end method
```



###### *分析字节码-2*

```kotlin
void a(){
    Context context= new Activity();
    //调用静态方法
    Object systemService = Hook.hook(context,Context.WINDOW_SERVICE);
}


//下面为上面a函数的字节码

.method a()V
.registers 3

.line 9
//调用Activity()方法，将返回值放进v0寄存器中
new-instance v0, Landroid/app/Activity;
//调用v0寄存器中的实例对象的init方法
invoke-direct {v0}, Landroid/app/Activity;-><init>()V

.line 10
.local v0, "context":Landroid/content/Context;
//将字符串"window"赋值给寄存器v1
const-string v1, "window"

//调用静态方法hook，参数内容是（v0寄存器内的值，v1寄存器内的值）
invoke-static {v0, v1}, Lcom/test/Hook;->hook(Landroid/content/Context;Ljava/lang/String;)Ljava/lang/Object;
//前一个方法调用的返回值存储到寄存器 v1 中。
move-result-object v1

.line 11
.local v1, "systemService":Ljava/lang/Object;
return-void
.end method
```



**可以看出  invoke-virtual {v0, v1}  和 invoke-static {v0, v1} 主要的区别是**:

1. **invoke-virtual 中的v0是作为实例对象的寄存器。相当于 --》  v0.fun( v1 )**
2. **invoke-static 中的v0是作为参数的寄存器。相当于 --》  fun( v0 , v1 )**



**一个invoke-virtual场景下的函数调用，操作栈中一定有1+参数个数个变量**

**一个invoke-static场景下的函数调用，操作栈中只有参数个数个变量**



回头看一下第一步的Hook代码，我们将invoke-virtual场景下的函数调用替换成invoke-static调用，所以hook类的静态函数必须多出一个参数来承接 ***实例对象变量***





## 3.再看一下两个场景下的ASM码

```java
void a(){
Context context= new Activity();
//调用实例方法
Object systemService = context.getSystemService(Context.WINDOW_SERVICE);
}
//下面为ASM码
methodVisitor = classWriter.visitMethod(0, "a", "()V", null, null);
methodVisitor.visitCode();
methodVisitor.visitTypeInsn(NEW, "android/app/Activity");
methodVisitor.visitInsn(DUP);
methodVisitor.visitMethodInsn(INVOKESPECIAL, "android/app/Activity", "<init>", "()V", false);
methodVisitor.visitVarInsn(ASTORE, 1);
methodVisitor.visitVarInsn(ALOAD, 1);
methodVisitor.visitLdcInsn("window");
//Hook点，Hook前的代码
methodVisitor.visitMethodInsn(INVOKEVIRTUAL, "android/content/Context", "getSystemService", "(Ljava/lang/String;)Ljava/lang/Object;", false);
methodVisitor.visitVarInsn(ASTORE, 2);
methodVisitor.visitInsn(RETURN);
methodVisitor.visitMaxs(2, 3);
methodVisitor.visitEnd();
```

```java
void a(){
    Context context= new Activity();
    //调用静态方法
    Object systemService = Hook.hook(context,Context.WINDOW_SERVICE);
}

methodVisitor = classWriter.visitMethod(0, "a", "()V", null, null);
methodVisitor.visitCode();
methodVisitor.visitTypeInsn(NEW, "android/app/Activity");
methodVisitor.visitInsn(DUP);
methodVisitor.visitMethodInsn(INVOKESPECIAL, "android/app/Activity", "<init>", "()V", false);
methodVisitor.visitVarInsn(ASTORE, 1);
methodVisitor.visitVarInsn(ALOAD, 1);
methodVisitor.visitLdcInsn("window");
//Hook点，Hook后的代码
methodVisitor.visitMethodInsn(INVOKESTATIC, "com/Hook", "hook", "(Landroid/content/Context;Ljava/lang/String;)Ljava/lang/Object;", false);
methodVisitor.visitVarInsn(ASTORE, 2);
methodVisitor.visitInsn(RETURN);
methodVisitor.visitMaxs(2, 3);
methodVisitor.visitEnd();
```







Keep Moving Forward
