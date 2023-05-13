---
title: Comparator知识点
categories:
  - 知识点
tags:
  - Comparator
abbrlink: c4311606
---





## 1.Comparator接口  compare方法实现返回值探究

```java
object : Comparator<Object>() {
            override fun compare(o1: Object?, o2: Object?): Int {
            }
        }
```

​       

```java
return 01.xxx -02.xxx
```

代表着升序队列，xx属性越小的排在越前面 ，适用场景

1.  xxx属性代表着进场顺序，而队列需要FIFO 
2.  xxx属性代表着创建时间，而队列需要先创建先出







```java
return 02.xxx -01.xxx
```

代表着降序队列，xx属性越大的排在越前面 ，适用场景

1.  xxx属性代表着优先级，而队列是高优先级队列 





Keep Moving Forward
