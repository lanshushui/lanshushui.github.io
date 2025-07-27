---
title: Java知识点
categories:
  - Android
tags:
  - Java
abbrlink: c4311606
---



### substring可能会把两个字符的emoji分开，导致显示无法显示的?字符。

判断边界字符是否是Unicode代理项代码单元，substring时进行位置偏移

```
Character.isLowSurrogate()

Character.isHighSurrogate()
```



### NumberFormat导致精度丢失

代码想实现 【四舍五入，保留两位小数】的功能，结果却和预期不一样

```kotlin
val d = 103.765
val formatter = NumberFormat.getNumberInstance() //返回的是DecimalFormat类
formatter.roundingMode = RoundingMode.HALF_UP
formatter.maximumFractionDigits = 2
formatter.minimumFractionDigits = 2
formatter.isGroupingUsed = false
val result = formatter.format(d)   //结果是 103.76 并不是103.77
```

查看DecimalFormat类format方法原理

```java
public final StringBuffer format(Object number,
                                 StringBuffer toAppendTo,
                                 FieldPosition pos) {
    if (number instanceof Long || number instanceof Integer ||
        number instanceof Short || number instanceof Byte ||
        number instanceof AtomicInteger ||
        number instanceof AtomicLong ||
        (number instanceof BigInteger &&
         ((BigInteger)number).bitLength () < 64)) {
        return format(((Number)number).longValue(), toAppendTo, pos);
    } else if (number instanceof BigDecimal) {
        return format((BigDecimal)number, toAppendTo, pos);
    } else if (number instanceof BigInteger) {
        return format((BigInteger)number, toAppendTo, pos);
    } else if (number instanceof Number) {  //传入的是float，走到了这里 
        return format(((Number)number).doubleValue(), toAppendTo, pos);
    } else {
        throw new IllegalArgumentException("Cannot format given Object as a Number");
    }
}
```

可以看见 ，传入float时，会强转为Number类调用doubleValue方法获得值进行后续操作；就是float转double出现精度丢失

> 103.765变成了 103.76499938964844，再四舍五入 就变成了 103.76



> 解决方案： [利用BigDecimal类巧妙处理Double类型精度丢失](https://www.cnblogs.com/summerday152/p/14202267.html)
>
> ```kotlin
> val d = 103.765
> val formatter = NumberFormat.getNumberInstance()
> formatter.roundingMode = RoundingMode.HALF_UP
> formatter.maximumFractionDigits = 2
> formatter.minimumFractionDigits = 2
> formatter.isGroupingUsed = false
> val result = formatter.format(BigDecimal("$d")) //正常返回 103.77
> ```





### Comparator接口  compare方法实现返回值探究

```java
object : Comparator<Object>() {
            override fun compare(o1: Object?, o2: Object?): Int {
            }
        }
```

```java
return 01.xxx -02.xxx
代表着升序队列，xx属性越小的排在越前面 ，适用场景
1.  xxx属性代表着进场顺序，而队列需要FIFO 
2.  xxx属性代表着创建时间，而队列需要先创建先出
return 02.xxx -01.xxx
代表着降序队列，xx属性越大的排在越前面 ，适用场景
1.  xxx属性代表着优先级，而队列是高优先级队列 
    
```



### 泛型

[“界限”带来的灵活性 —— Java泛型的上下界](https://juejin.cn/post/7022581523048038408)

[Kotlin 范型之泛型约束、类型投影、星号投影](https://www.jianshu.com/p/ce9b093f6967)



#### 1.上界: Extend（ out ）  下界：Super( in )

> extend（ out ） ------------------  只能取，不能存

```java
public void a(){
    List<Apple> appleList = new ArrayList<>();
    appleList.add(new Apple());
    appleList.add(new Apple());
	//如果能存Fruit的子类 ，万一你存的是banana ，appleList.get()方法就崩溃了
    List<? extends Fruit> plate = appleList;
    Fruit fruit = plate.get(0);
}
```



> *super( in )          ------------------  只能存，不能取（其实也能取，取到的都是Object）*

```java
public void a(){
    List<Fruit> fruitList = new ArrayList<>();
    fruitList.add(new Apple());
    fruitList.add(new Banana());

    //fruitList里面存着Banana，applePlate调用get方法，编译器也不知道返回你什么，是返回Apple类还是Banana类
    List<? super Apple> applePlate = fruitList;
    applePlate.add(new Apple());
    applePlate.add(new RedApple());
    applePlate.add(new GreenApple());
}
```

**别搞蒙了 super不是指能存入Apple的父类，是指能存入Apple的子类。这和重写父类方法的super不一样。**



#### 2. Java 语言中，数组是协变的,泛型不是协变的

```java
public void a(){
    Integer[] c=new Integer[10];
    Number[] d=c;
}
//上面的代码是支持的

//下面的代码是不允许的
public void b(){
    ArrayList<Integer> c=new ArrayList();
    ArrayList<Number> d=c;
}
```



#### 3.各个场景

```java
------------------------------------------------------------------------------------------------------------------------------
//类场景

//允许的代码
public class Test<T> {
    
}
//允许的代码
public class Test<T extends Activity> {
    
}
public class Test<T ：Activity> {
    
}
//不允许的代码
public class Test<T super Activity> {

}
//不允许的代码
public class Test<? extends Activity> {
    
}
//不允许的代码
public class Test<? super Activity> {

}

//允许的代码
abstract class Source<out T> {
    abstract fun func(): T
}
//允许的代码
abstract class Comparable<in T> {
    abstract fun func(t: T)
}

------------------------------------------------------------------------------------------------------------------------------
//变量场景

//允许的代码
ArrayList<? extends String> list= new ArrayList();
val list:ArrayList<out String> = ArrayList<String>()

//允许的代码
ArrayList<? super String> list= new ArrayList();
val list:ArrayList<in String> = ArrayList<String>()
    
//允许的代码
ArrayList<?> list= new ArrayList<String>();
val list:ArrayList<*> = ArrayList<String>()
    
//不允许的代码
ArrayList list= new ArrayList<? extends String>();
ArrayList list= new ArrayList<out String>();

```

【?】**【? extends XXX】  和   【? super XXX】只能用在变量引用的泛型上**



#### 4.无界类型通配符`?`, Kotlin 使用星号投影`*`

```java
//java    ? 相当于? extend Object   只能get不能set
ArrayList<?> list= new ArrayList<String>();
Object a=list.get(0);
//kotlin     * 相当于 out Any?   只能get不能set
val list:ArrayList<*> = ArrayList<String>()
val any= list.get(0)
```



Keep Moving Forward
