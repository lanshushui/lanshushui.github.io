---
title: ConstraintLayout知识点
categories: 
- 疑难杂症
tags:
- ConstraintLayout
---



[万字长文 - 史上最全ConstraintLayout](https://juejin.cn/post/6949186887609221133)



基于RecyclerView 1.2.1 版本分析



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







## 解决方案（让RecyclerView的measure阶段不进行addView操作）

RecyclerView的measure阶段不进行addView操作  -》》measure阶段能拿到EXACTLY的宽高

1.不用ConstraintLayout，使用LinearLayout，让RecyclerView从始至终都拿到正确的布局高度

2.破坏链式约束

![](https://s3.bmp.ovh/imgs/2023/05/12/38f2bd35454f0c3a.jpg)

ConstraintLayout内部不要形成链式的约束，这样子ConstraintLayout第一次就能知道RecyclerView需要的高度是多少





Keep Moving Forward
