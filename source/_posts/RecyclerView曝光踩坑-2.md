---
title: RecyclerView曝光踩坑-2
categories:
  - 疑难杂症
tags:
  - RecyclerView
abbrlink: 412d5155
---



[万字长文 - 史上最全ConstraintLayout](https://juejin.cn/post/6949186887609221133)



[RecyclerView曝光踩坑-1](https://lanshushui.github.io/post/22258c7a.html)



基于RecyclerView 1.2.1 版本分析



## 1.notifyItemChanged导致不在屏幕上的viewHolder曝光

RecyclerView场景：

```
-----------
| 1     2 |
| 3     4 |
| 5     6 |
| 7     8 |
----------
  9    10
```



当notifyItemChanged位置1时，<font color="red">位置9和位置10的onViewAttachedToWindow会被调用</font>，导致不断上报错误的曝光数据。

特别是位置1需要持续刷新，调用notifyItemChanged，上报的错误量不断增加。



*前提：要了解RecyclerView基本的Layout逻辑*



**基础调用链：**

**RecyclerView                        --                  dispatchLayout()**

**RecyclerView                        --                  dispatchLayoutStep1()**

**LinearLayoutManager        --                  onLayoutChildren()**

**LinearLayoutManager        --                  fill()**



分析：

```java
//LinearLayoutManager类   fill函数
int fill(RecyclerView.Recycler recycler, LayoutState layoutState,
         RecyclerView.State state, boolean stopOnFocusable) {
  	//可用空间
    int remainingSpace = layoutState.mAvailable + layoutState.mExtraFillSpace;
    //layout完子item后，子item的相关数据的封装类
    LayoutChunkResult layoutChunkResult = mLayoutChunkResult;
    //不断地判断 可用空间，若大于零则不断加入View
    while ((layoutState.mInfinite || remainingSpace > 0) && layoutState.hasMore(state)) {
        //初始化layoutChunkResult
        layoutChunkResult.resetInternal();
        //正在布局子item,并将layout完，将子item的相关数据封装在layoutChunkResult中
        layoutChunk(recycler, state, layoutState, layoutChunkResult);
        
        if (layoutChunkResult.mFinished) {
            break;
        }
        //增加偏移量
        layoutState.mOffset += layoutChunkResult.mConsumed * layoutState.mLayoutDirection;
        
        //关键代码，提取layout的消耗空间，将可用空间不断减少
        //是条件进入的，说明有些情况，即使我们addView了，也不会消耗可用空间，RecyclerView会继续while循环addView
        //我们的BUG是因为第一个判断导致的，即mIgnoreConsumed为ture。通常该变量都是false的
        if (!layoutChunkResult.mIgnoreConsumed || layoutState.mScrapList != null
            || !state.isPreLayout()) {
            layoutState.mAvailable -= layoutChunkResult.mConsumed;
           	//可用空间不断减少
            remainingSpace -= layoutChunkResult.mConsumed;
        }

        if (layoutState.mScrollingOffset != LayoutState.SCROLLING_OFFSET_NaN) {
            layoutState.mScrollingOffset += layoutChunkResult.mConsumed;
            if (layoutState.mAvailable < 0) {
                layoutState.mScrollingOffset += layoutState.mAvailable;
            }
            recycleByLayoutState(recycler, layoutState);
        }
        if (stopOnFocusable && layoutChunkResult.mFocusable) {
            break;
        }
    }
    return start - layoutState.mAvailable;
}
```



什么情况下mIgnoreConsumed是true呢，继续跟进layoutChunk函数

```java
//LinearLayoutManager类   fill函数
void layoutChunk(RecyclerView.Recycler recycler, RecyclerView.State state,
                 LayoutState layoutState, LayoutChunkResult result) {
    ///...
    View view = layoutState.next(recycler);
    LayoutParams params = (LayoutParams) view.getLayoutParams();
     // 如果该view是remove状态或者是change状态，将mIgnoreConsumed设置false，不消化可用空间
    if (params.isItemRemoved() || params.isItemChanged()) {
        result.mIgnoreConsumed = true;
    }
    ///...
}
```



由上面可以看出，当对应的view是change状态时，addView也不会消耗RecyclerView的可用空间，让RecyclerView可以add进更多的View



## 总结问题原因

因为我们notifyItemChanged位置1导致布局重新绘制，同时将位置1的view设置成change状态。在绘制过程中，位置位置1，2所在的那一行豆腐块虽然被绘制了，但不消化可用空间的值，对应RecyclerView来说相当于多了一行豆腐块绘制空间，让位置9，10的豆腐块可以被addView和attach。在后续dispatchLayoutStep3中中又会将不在屏幕的view移除掉。造成位置9和10的viewholder不断的attach和detach。





## 解决方法

从代码上判断，这个是RecyclerView的正常绘制逻辑，无法避免。

RecyclerView在dispatchLayoutStep1中多add一些view，dispatchLayoutStep3中将不合适的view移出去，达到动画效果。

所以只能做个定时判断，Attached时用50ms延迟的定时器进行曝光上报，Detached时尝试移除定时器。



Keep Moving Forward
