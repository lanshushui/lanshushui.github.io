---
title: ConstraintLayout知识点
categories: 
- 疑难杂症
tags:
- ConstraintLayout
---



[万字长文 - 史上最全ConstraintLayout](https://juejin.cn/post/6949186887609221133)



## 1.一次Recyclerview的item曝光需求产生的BUG对ConstraintLayout的分析

曝光逻辑是在ViewHolder的onViewAttachedToWindow进行上报，

最后却发现Recyclerview第一次刷新数据时 发现不在屏幕上的viewholder也调用了onViewAttachedToWindow方法，导致多余非法上报



> <font color="red">测试发现是部分viewholder快速进行了onViewAttachedToWindow，然后onViewDetachedFromWindow的操作</font>
>
> 

**xml布局**

<img src="https://s3.bmp.ovh/imgs/2023/05/12/6dcd17d349803a7b.jpg" style="zoom:80%;" />

```
class MyRecyclerView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyle: Int = 0
) : RecyclerView(context, attrs, defStyle) {

    override fun onMeasure(widthSpec: Int, heightSpec: Int) {
        super.onMeasure(widthSpec, heightSpec)
        Log.i("MyRecyclerView", "${MeasureSpec.getSize(heightSpec)}")
    }
}
```



上面的布局看起来很正常，大多数场景下都可能用到这样子的布局，但就是这样子的布局导致的Log日志是

```kotlin
2023-05-12 13:30:44.381  5692-5692  MyRecyclerView          com.example.testcode                 I  2151
2023-05-12 13:30:44.383  5692-5692  MyRecyclerView          com.example.testcode                 I  776
2023-05-12 13:30:44.397  5692-5692  MyRecyclerView          com.example.testcode                 I  2151
2023-05-12 13:30:44.399  5692-5692  MyRecyclerView          com.example.testcode                 I  776
```



进入Activity，页面会被绘制两次，ConstraintLayout也会绘制两次，所以形成了四次输出，我们只需要看第一和第二次输出

[进入Activity时，为何页面布局内View#onMeasure会被调用两次](https://blog.csdn.net/qq_26287435/article/details/123274342)

第一输出的是MyRecyclerView父布局的高度，这个是因为ConstraintLayout的子view相互影响布局，第一次无法确定高度导致的

第二次输出才是MyRecyclerView自身的高度



**知识前提：viewholder的onViewAttachedToWindow是在addView时被调用，addView是在Recyclerview的onMeasuer时被调用**

![](https://s3.bmp.ovh/imgs/2023/05/12/63478300924c3186.jpg)



**所以正是因为第一次传入的错误高度，导致RecyclerView add了多余的View，又在第二次正确高度的影响下，detach掉 导致的问题**







## 解决方案

1.不用ConstraintLayout，使用LinearLayout，让RecyclerView从始至终都拿到正确的布局高度

2.破坏链式约束

![](https://s3.bmp.ovh/imgs/2023/05/12/38f2bd35454f0c3a.jpg)

ConstraintLayout内部不要形成链式的约束，这样子ConstraintLayout第一次就能知道RecyclerView需要的高度是多少





Keep Moving Forward
