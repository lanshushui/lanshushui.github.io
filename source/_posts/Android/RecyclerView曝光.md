---
title: RecyclerView曝光
categories:
  - Android
tags:
  - RecyclerView
abbrlink: 94cfd8e0
---
基于RecyclerView 1.2.1 版本分析

<!-- more -->

## 第一次加载时屏幕上所有子item的封面图片下载完成的时机

### 1.目前屏幕上RecyclerView所有可见viewHolder

``` kotlin
val manager =recyclerview.layoutManager()
val first = findFirstVisibleItemPosition()
val last = findLastVisibleItemPosition()
for (i in first..last) {
    val viewHolder = recyclerView?.findViewHolderForAdapterPosition(i) 
}
```

### 2.图片下载完成时机（Glide）

``` kotlin
Glide.with(coverView).load(item.cover).into(object : DrawableImageViewTarget(coverView) {
    override fun setResource(resource: Drawable?) {
        super.setResource(resource)
        if (resource != null) {
            //此时已完成图片展示
        }
    }
})
```

### 3.最重要的是知道什么时候调用第一步，获得Recyclerview第一次加载完成后屏幕上所有可见viewHolder

###### 答案是 自定义GridLayoutManager ，重写onLayoutCompleted方法

``` kotlin
class MyGridLayoutManager(context: Context?, spanSize: Int) : GridLayoutManager(context, spanSize) {

    companion object {
        //是否已经是首次加载
        private var isAlreadyRecordCover = false
    }

    private var recyclerView: RecyclerView? = null

    private var coverUrls = mutableListOf<String>()

    override fun onAttachedToWindow(view: RecyclerView?) {
        super.onAttachedToWindow(view)
        recyclerView = view
    }

	//该方法被调用时，已完成布局，结合自定义变量isAlreadyRecordCover，实现获得第一次加载的数据
    override fun onLayoutCompleted(state: RecyclerView.State?) {
        super.onLayoutCompleted(state)
        if (isAlreadyRecordCover) return
        val first = findFirstVisibleItemPosition()
        val last = findLastVisibleItemPosition()
        if (first != -1 && last != -1) { //不等于-1才说明Recyclerview真的有数据
            isAlreadyRecordCover = true
            for (i in first..last) {
                val viewHolder = recyclerView?.findViewHolderForAdapterPosition(i)
                //通过viewHolder 获得并记录封面url
                coverUrls.add(url)
            }
        }
    }

    /**
     * 步骤2的需要通知的方法
     */
    fun reportCoverShow(cover: String) {
        if (coverUrls.contains(cover)) {
            coverUrls.remove(cover)
            if (coverUrls.isEmpty()) {
                //此时封面数据已全部展示
            }
        }
    }
}
```



## RecyclerView曝光踩坑-1

[万字长文 - 史上最全ConstraintLayout](https://juejin.cn/post/6949186887609221133)



### 1.对ConstraintLayout的分析

曝光逻辑是在ViewHolder的onViewAttachedToWindow进行上报，

最后却发现Recyclerview第一次刷新数据时 发现不在屏幕上的viewholder也调用了onViewAttachedToWindow方法，导致多余非法上报

> <font color="red">测试发现是部分viewholder快速进行了onViewAttachedToWindow，然后onViewDetachedFromWindow的操作</font>



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
        Log.i("MyRecyclerView", "${MeasureSpec.getMode(heightSpec)} ,${MeasureSpec.getSize(heightSpec)}")
    }
}
```



```
MeasureSpec.EXACTLY   1073741824
MeasureSpec.AT_MOST   -2147483648
MeasureSpec.UNSPECIFIED  0
```



上面的布局看起来很正常，大多数场景下都可能用到这样子的布局，但就是这样子的布局导致的Log日志是

```kotlin
2023-05-12 17:30:21.830  3206-3206  MyRecyclerView          com.example.testcode                 I  -2147483648 ,2151
2023-05-12 17:30:21.832  3206-3206  MyRecyclerView          com.example.testcode                 I  1073741824 ,776
2023-05-12 17:30:21.847  3206-3206  MyRecyclerView          com.example.testcode                 I  -2147483648 ,2151
2023-05-12 17:30:21.849  3206-3206  MyRecyclerView          com.example.testcode                 I  1073741824 ,776
```



进入Activity，页面会被绘制两次，ConstraintLayout也会绘制两次，所以形成了四次输出，我们只需要看第一和第二次输出

[进入Activity时，为何页面布局内View#onMeasure会被调用两次](https://blog.csdn.net/qq_26287435/article/details/123274342)

第一输出的是MyRecyclerView父布局的高度，这个是因为ConstraintLayout的子view相互影响布局，第一次无法确定高度导致的

第二次输出才是MyRecyclerView自身的高度



RecyclerView的onMeasure方法

```kotlin
protected void onMeasure(int widthSpec, int heightSpec) {
    if (this.mLayout == null) { //没有layoutmanager
        this.defaultOnMeasure(widthSpec, heightSpec);
    } else {
        if (!this.mLayout.isAutoMeasureEnabled()) {  //自动测量，系统的layoutmanager都是开启的，所以一般不进入该分支
            if (this.mHasFixedSize) {
                this.mLayout.onMeasure(this.mRecycler, this.mState, widthSpec, heightSpec);
                return;
            }

            if (this.mAdapterUpdateDuringMeasure) {
                this.startInterceptRequestLayout();
                this.onEnterLayoutOrScroll();
                this.processAdapterUpdatesAndSetAnimationFlags();
                this.onExitLayoutOrScroll();
                if (this.mState.mRunPredictiveAnimations) {
                    this.mState.mInPreLayout = true;
                } else {
                    this.mAdapterHelper.consumeUpdatesInOnePass();
                    this.mState.mInPreLayout = false;
                }

                this.mAdapterUpdateDuringMeasure = false;
                this.stopInterceptRequestLayout(false);
            } else if (this.mState.mRunPredictiveAnimations) {
                this.setMeasuredDimension(this.getMeasuredWidth(), this.getMeasuredHeight());
                return;
            }

            if (this.mAdapter != null) {
                this.mState.mItemCount = this.mAdapter.getItemCount();
            } else {
                this.mState.mItemCount = 0;
            }

            this.startInterceptRequestLayout();
            this.mLayout.onMeasure(this.mRecycler, this.mState, widthSpec, heightSpec);
            this.stopInterceptRequestLayout(false);
            this.mState.mInPreLayout = false;
        } else {  //经常都是走这个分支
            int widthMode = MeasureSpec.getMode(widthSpec);
            int heightMode = MeasureSpec.getMode(heightSpec);
            this.mLayout.onMeasure(this.mRecycler, this.mState, widthSpec, heightSpec);
            this.mLastAutoMeasureSkippedDueToExact = widthMode == 1073741824 && heightMode == 1073741824;
            //当宽高都是EXACTLY时，直接return
            if (this.mLastAutoMeasureSkippedDueToExact || this.mAdapter == null) {
                return;
            }
			//走到这里说明Recyclerivew是不确定宽高，这时候onMeasure方法会调用dispatchLayoutStep2，导致addView
            if (this.mState.mLayoutStep == 1) {
                this.dispatchLayoutStep1();
            }

            this.mLayout.setMeasureSpecs(widthSpec, heightSpec);
            this.mState.mIsMeasuring = true;
            this.dispatchLayoutStep2();
            this.mLayout.setMeasuredDimensionFromChildren(widthSpec, heightSpec);
            if (this.mLayout.shouldMeasureTwice()) {
                this.mLayout.setMeasureSpecs(MeasureSpec.makeMeasureSpec(this.getMeasuredWidth(), 1073741824), MeasureSpec.makeMeasureSpec(this.getMeasuredHeight(), 1073741824));
                this.mState.mIsMeasuring = true;
                this.dispatchLayoutStep2();
                this.mLayout.setMeasuredDimensionFromChildren(widthSpec, heightSpec);
            }

            this.mLastAutoMeasureNonExactMeasuredWidth = this.getMeasuredWidth();
            this.mLastAutoMeasureNonExactMeasuredHeight = this.getMeasuredHeight();
        }

    }
}
```



**当RecyclerView宽高不确定时，viewholder的onViewAttachedToWindow是在addView时被调用，addView是在Recyclerview的onMeasuer时被调用**

![](https://s3.bmp.ovh/imgs/2023/05/12/63478300924c3186.jpg)



**所以正是因为第一次传入的错误高度以及Recyclerivew不确定的宽高条件下，导致RecyclerView 在measure阶段add了多余的View，又在layout阶段拿到正确高度的影响下，detach掉 导致的问题**



### 2.解决方案（让RecyclerView的measure阶段不进行addView操作）

RecyclerView的measure阶段不进行addView操作  -》》measure阶段能拿到EXACTLY的宽高

1.不用ConstraintLayout，使用LinearLayout，让RecyclerView从始至终都拿到正确的布局高度

2.破坏链式约束

![](https://s3.bmp.ovh/imgs/2023/05/12/38f2bd35454f0c3a.jpg)

ConstraintLayout内部不要形成链式的约束，这样子ConstraintLayout第一次就能知道RecyclerView需要的高度是多少



## RecyclerView曝光踩坑-2

*问题场景是 发现屏幕内的一个豆腐块调用notifyItemChanged后，会导致屏幕外的viewHolder的onViewAttachedToWindow也会被调用*



### 1.notifyItemChanged导致不在屏幕上的viewHolder曝光

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



### 总结问题原因

因为我们notifyItemChanged位置1导致布局重新绘制，同时将位置1的view设置成change状态。在绘制过程中，位置位置1，2所在的那一行豆腐块虽然被绘制了，但不消化可用空间的值，对应RecyclerView来说相当于多了一行豆腐块绘制空间，让位置9，10的豆腐块可以被addView和attach。在后续dispatchLayoutStep3中中又会将不在屏幕的view移除掉。造成位置9和10的viewholder不断的attach和detach。



### 解决方法

从代码上判断，这个是RecyclerView的正常绘制逻辑，无法避免。

RecyclerView在dispatchLayoutStep1中多add一些view，dispatchLayoutStep3中将不合适的view移出去，达到动画效果。

dispatchLayoutStep1和dispatchLayoutStep3都是在一个消息循环中完成的，所以我们可以通过post操作完成曝光和取消曝光的功能。



```kotlin
val task= Runnable { 
    //曝光逻辑
}

override fun onViewAttachedToWindow(holder: BaseViewHolder) {
    holder.itemView.post(task)
}

override fun onViewDetachedFromWindow(holder: BaseViewHolder) {
    holder.itemView.removeCallbacks(task)
}
```



## RecyclerView曝光踩坑-3

背景： 使用RecyclerView+PagerSnapHelper 实现一页一页滑动的效果。

使用RecyclerView的smoothScrollToPosition实现自动滑页功能。



当从第一页自动滑向第二页，第二页和第三页的都会被调用onViewAttachedToWindow，导致多余页面上报。



### 首先让我们看一下问题场景下的 DEBUG 信息

![](https://s3.bmp.ovh/imgs/2023/08/07/5d9ab8ba137383e8.jpg)

LinearLayoutManager的fill函数是布局关键函数，不了解的先去了解一下，这里就不仔细讲了。

remainingSpace是布局可用空间，截图数值为265。是由**【layoutState.mAvailable的1px】和【layoutState.mExtraFillSpace的264px】**组成。

**我的用例场景一页宽度就是264px**。所以导致会加载进两个页面，导致问题的出现。



让我们来分析下**【 layoutState.mAvailable的1px】 和 【layoutState.mExtraFillSpace的264px】**   是如何产生的？这有利于我们解决问题



### 1.分析smoothScrollToPosition实现逻辑

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



### 2.简单分析ViewFlinger

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



### 3.简单分析SmoothScroller

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



### 4.分析从scrollStep到最重要的fill方法调用链

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



Keep Moving Forward
