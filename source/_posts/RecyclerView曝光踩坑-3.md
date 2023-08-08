---
title: RecyclerView曝光踩坑-3
categories:
  - 疑难杂症
tags:
  - RecyclerView
abbrlink: 362a61c3
---



[万字长文 - 史上最全ConstraintLayout](https://juejin.cn/post/6949186887609221133)



[RecyclerView曝光踩坑-1](https://lanshushui.github.io/post/22258c7a.html)

[RecyclerView曝光踩坑-2](https://lanshushui.github.io/post/412d5155.html)



背景： 使用RecyclerView+PagerSnapHelper 实现一页一页滑动的效果。

使用RecyclerView的smoothScrollToPosition实现自动滑页功能。



当从第一页自动滑向第二页，第二页和第三页的都会被调用onViewAttachedToWindow，导致多余页面上报。



## 首先让我们看一下问题场景下的 DEBUG 信息

![](https://s3.bmp.ovh/imgs/2023/08/07/5d9ab8ba137383e8.jpg)

LinearLayoutManager的fill函数是布局关键函数，不了解的先去了解一下，这里就不仔细讲了。

remainingSpace是布局可用空间，截图数值为265。是由**【layoutState.mAvailable的1px】和【layoutState.mExtraFillSpace的264px】**组成。

**我的用例场景一页宽度就是264px**。所以导致会加载进两个页面，导致问题的出现。



让我们来分析下**【 layoutState.mAvailable的1px】 和 【layoutState.mExtraFillSpace的264px】**   是如何产生的？这有利于我们解决问题







## 1.分析smoothScrollToPosition实现逻辑

```java
//RecyclerView
public void smoothScrollToPosition(int position) {
    mLayout.smoothScrollToPosition(this, mState, position);
}

//LinearLayoutManager
public void smoothScrollToPosition(RecyclerView recyclerView, RecyclerView.State state,
                                   int position) {
    LinearSmoothScroller linearSmoothScroller = new LinearSmoothScroller(recyclerView.getContext());
    //设置目标位置
    linearSmoothScroller.setTargetPosition(position);
    linearSmoothScroller.start(mRecyclerView, this);
}

//SmoothScroller
void start(RecyclerView recyclerView, LayoutManager layoutManager) {

    // 停止上一个mViewFlinger
    recyclerView.mViewFlinger.stop();
    
	//google建议我们每一次滑动都创建一个新的SmoothScroller，LinearLayoutManager正是这样子操作的，我们自定义LayoutManger注意一下
    if (mStarted) {
        Log.w(TAG, "An instance of " + this.getClass().getSimpleName() + " was started "
              + "more than once. Each instance of" + this.getClass().getSimpleName() + " "
              + "is intended to only be used once. You should create a new instance for "
              + "each use.");
    }

    mRecyclerView = recyclerView;
    mLayoutManager = layoutManager;
    if (mTargetPosition == RecyclerView.NO_POSITION) {
        throw new IllegalArgumentException("Invalid target position");
    }
    //通知mRecyclerView要滑动到的目前位置
    mRecyclerView.mState.mTargetPosition = mTargetPosition;
    mRunning = true;
    //标志为等待执行
    mPendingInitialRun = true;
    //这里很重要，会尝试在已有布局中找是否存在目标View，找不到就是null。  我们的案例是一页一页滑动的，所以是肯定找不到下一个页的View
    mTargetView = findViewByPosition(getTargetPosition());
    //onStart空实现
    onStart();
    //最重要的是这里，调用mViewFlinger的postOnAnimation实现滑动
    //ViewFlinger就是个Runnable,下面会分析
    mRecyclerView.mViewFlinger.postOnAnimation();

    mStarted = true;
}
```

总结：调用RecyclerView的smoothScrollToPosition 会一路跑到SmoothScroller的start方法，启用ViewFlinger。



这里面最重要的逻辑是  

- ​     赋值SmoothScroller的mTargetPosition，mPendingInitialRun设为true，标志为等待执行，并尝试给mTargetView赋值
- ​     调用ViewFlinger的postOnAnimation 开始动画





## 2.简单分析ViewFlinger

```java
//RecyclerView的内部类
class ViewFlinger implements Runnable {
    public void run() {
        //第一段代码   尝试滑动消费，一旦smoothScroller.onAnimation被调用，isPendingInitialRun设置成false
        if (scroller.computeScrollOffset()) {
            //......
            smoothScroller.onAnimation(consumedX, consumedY);
            //......
        }
        //第二段代码   如果isPendingInitialRun还是true，即第一段代码没有被调用，   传入0，0 ，让smoothScroller至少要被调用1次
        if (smoothScroller != null && smoothScroller.isPendingInitialRun()) {
            smoothScroller.onAnimation(0, 0);
        }
    }
}
```



- ViewFlinger是个Runnable，主要看run方法，可以看出滑动的逻辑主要还是Scroller。
- 但我们smoothScrollToPosition一路走下来，只是设置了mTargetPosition，并不会对ViewFlinger的mOverScroller做出任何改变，它没有任何滑动数据，所以scroller.computeScrollOffset()会返回false， smoothScroller.onAnimation不会在第一段代码中被调用
- 走向了第二段代码，又跑回了SmoothScroller的onAnimation方法





## 3.简单分析SmoothScroller

```java
void onAnimation(int dx, int dy) {
 
	// 下面的 if 块存在可以让 LayoutManager 在正确的位置滚动 1 个像素方向，以便使 LayoutManager 绘制两页的视图，
    //因此 在进一步滚动之前可以找到目标视图。这样做是为了防止初始滚动距离滚动超过视图，
    //这会导致看起来很紧张的动画。
    if (mPendingInitialRun && mTargetView == null && mLayoutManager != null) {
        PointF pointF = computeScrollVectorForPosition(mTargetPosition);
        if (pointF != null && (pointF.x != 0 || pointF.y != 0)) {
            recyclerView.scrollStep(
                (int) Math.signum(pointF.x),
                (int) Math.signum(pointF.y),
                null);
        }
    }

    mPendingInitialRun = false;
}
```

  google的注释解答了一切

  如果这个SmoothScroller 【从来没有运行过】 &&【还找不到目前View】，将会调用recyclerView.scrollStep向正确方向滑动1px。

**<font color="#FF0000">这个就是layoutState.mAvailable的1px由来</font>**



## 4.分析从scrollStep到最重要的fill方法调用链



```
--recyclerView.scrollStep(1px)
--layoutManager.scrollHorizontallyBy(1px)
--layoutManager.scrollBy(1px)
     --updateLayoutState(1px)
        -- calculateExtraLayoutSpace()
           --getExtraLayoutSpace()  
 --layoutManager.fill(RecyclerView.Recycler recycler, LayoutState layoutState,State state, boolean stopOnFocusable)
```

```java
private void updateLayoutState(int layoutDirection, int requiredSpace,
                               boolean canUseExistingSpace, RecyclerView.State state) {
    //mAvailable设置为1px
    mLayoutState.mAvailable = requiredSpace;
    //计算额外需要空间
    calculateExtraLayoutSpace(state, mReusableIntPair);
    //mExtraFillSpace设置为264px
    mLayoutState.mExtraFillSpace = mReusableIntPair[1];
}

protected void calculateExtraLayoutSpace(@NonNull RecyclerView.State state,
                                         @NonNull int[] extraLayoutSpace) {
    int extraLayoutSpaceStart = 0;
    int extraLayoutSpaceEnd = 0;
    //计算额外需要空间
    int extraScrollSpace = getExtraLayoutSpace(state);
    if (mLayoutState.mLayoutDirection == LayoutState.LAYOUT_START) {
        extraLayoutSpaceStart = extraScrollSpace;
    } else {
        extraLayoutSpaceEnd = extraScrollSpace;
    }
    extraLayoutSpace[0] = extraLayoutSpaceStart;
    extraLayoutSpace[1] = extraLayoutSpaceEnd;
}

protected int getExtraLayoutSpace(RecyclerView.State state) {   // 这个也是ViewPager2实现多页加载的核心函数
    //如果有目标位置，返回RecyclerView的宽度/高度，否则返回0
    if (state.hasTargetScrollPosition()) {
        return mOrientationHelper.getTotalSpace();
    } else {
        return 0;
    }
}
```

​    到此为之 ，remainingSpace的265【layoutState.mAvailable的1px和layoutState.mExtraFillSpace的264px组成】是如何生成知道了。

  

1. 步骤1 .smoothScrollToPosition调用，设置了targetPosition，但因为只有一页View，是找不到mTargetView。调用ViewFlinger滑动，
2. 步骤2.但ViewFlinger没有滑动数据，调用SmoothScroller的onAnimation(0,0)方法
3. 步骤3.SmoothScroller如果还没有运行过，且找不到mTargetView，会向滑动方向滑动1px。mLayoutState.mAvailable=1px
4. 步骤4.因为targetPosition不是空，会增加一页额外空间。  mLayoutState.mExtraFillSpace = 一页空间;
5. 步骤5. fill View时，1px+一页空间 会导致加入两个页面



## 解决方法

从第三步分析解决，只有找不到mTargetView时，才会走下面步骤的逻辑。那我们只要提前让mTargetView不为null就行了。

我们学习一下源码的思路，在调用smoothScrollToPosition滑向下一页前，手动滑动1px，让目标View提前出现在屏幕上，这样子smoothScrollToPosition调用时就mTargetView就能被找到，不是null了



滑向下一页的正确代码：

```kotlin
recyclerView?.scrollBy(1, 0)
recyclerView?.smoothScrollToPosition(position + 1)
```





解决方案很简单，就一行代码，但知道怎么解决却花了几天时间研究RecyclerView源码   。。。。。。。。。。
