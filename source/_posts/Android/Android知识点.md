---
title: Android知识点
categories:
  - Android
tags:
  - Android知识
abbrlink: 1733ce00
---



[读取APP所有的进程](https://blog.51cto.com/u_16213448/7925925)

[多进程情况下判断应用是否处于前台或者后台](https://blog.csdn.net/weixin_40347412/article/details/141040175)

<!-- more -->

## 四大组件

### Activity

#### taskaffinity只有在FLAG_ACTIVITY_NEW_TASK标记下才会有作用，没有则会忽略taskaffinity，放入启动Activity的任务栈中

> 当调用startActivity()方法来启动一个Activity时，默认是将它放入到当前的任务当中。但是，如果在Intent中加入了FLAG_ACTIVITY_NEW_TASK flag的话，情况就会变的复杂起来。首先，系统会去检查这个Activity的affinity是否与当前Task的affinity相同。如果相同的话就会把它放入到当前Task当中，如果不同则会先去检查是否已经有一个名字与该Activity的affinity相同的Task,如果有，这个Task将被调到前台，同时这个Activity将显示在这个Task的顶端；如果没有的话，系统将会尝试为这个Activity创建一个新的Task。需要注意的是，如果一个Activity在manifest文件中声明的启动模式是”singleTask”，那么他被启动的时候，行为模式会和前面提到的指定FLAG_ACTIVITY_NEW_TASK一样



#### 快速找到是哪个View消费了点击事件

```kotlin
//Activity   
override fun dicaihuispatchTouchEvent(ev: MotionEvent?): Boolean {
    val re = super.dispatchTouchEvent(ev)
    val decView = (window.decorView as ViewGroup)
    val mFirstTouchTargetF = ViewGroup::class.java.getDeclaredField("mFirstTouchTarget")
    mFirstTouchTargetF.isAccessible = true
    var first = mFirstTouchTargetF.get(decView)
    var consumeView: View = decView
    while (first != null) {
        val viewF = first::class.java.getDeclaredField("child")
        viewF.isAccessible = true
        consumeView = viewF.get(first) as View
        first = if (consumeView is ViewGroup) {
            mFirstTouchTargetF.get(consumeView)
        } else {
            null
        }
    }
    MLog.info(TAG, "consumeView is $consumeView")
    return re
}
```



#### 调用startActivityForResult后直接产生onActivityResult回调问题

[Intent.FLAG_ACTIVITY_NEW_TASK 会导致onActivityResult马上返回](https://blog.csdn.net/ALee_130158/article/details/103971765)



#### home键返回桌面再次点击应用图标，重新启动MAIN_action的Activity

[每次启动Intent导致新创建Task的时候，该Task会记录导致其创建的Intent；而如果后续需要有一个新的与创建Intent完全一致（完全一致定位为：启动类，action、category等等全部一样，不可多项也不可缺少），那么该Intent并不会触发Activity的新建启动，而只会将已经存在的对应Task移到前台](https://blog.csdn.net/shangming150/article/details/78343103)



#### onSaveInstanceState-onStop

下拉状态栏： onSaveInstanceState ，onPause，onStop 都不会调用

按Home： onPause --onStop--onSaveInstanceState 都会被调用

```java
//ActivityThread类
private void callActivityOnStop(ActivityClientRecord r, boolean saveState, String reason) {
    // Before P onSaveInstanceState was called before onStop, P是安卓9.0版本
    //starting with P it's called after.    Before Honeycomb state was always saved before onPause.
    final boolean shouldSaveState = saveState && !r.activity.mFinished && r.state == null
        && !r.isPreHoneycomb();
    final boolean isPreP = r.isPreP();
    if (shouldSaveState && isPreP) {
        callActivityOnSaveInstanceState(r);
    }

    try {
        r.activity.performStop(r.mPreserveWindow, reason);
    } catch (SuperNotCalledException e) {
        throw e;
    } catch (Exception e) {
        if (!mInstrumentation.onException(r.activity, e)) {
            throw new RuntimeException(
                "Unable to stop activity "
                + r.intent.getComponent().toShortString()
                + ": " + e.toString(), e);
        }
    }
    r.setState(ON_STOP);

    if (shouldSaveState && !isPreP) {
        callActivityOnSaveInstanceState(r);
    }
}
```

安卓9.0版本前onSaveInstanceState在onStop前被调用，安卓9.0版本前onSaveInstanceState在onStop后被调用



### Broadcast

[Android 14 之 动态注册Broadcast必须声明exported属性](https://juejin.cn/post/7313048140277596197)



## 重点组件

### View

> RelativeLayout的wrap_content会导致layout_marginBottom属性失效 [RelativeLayout的layout_marginBottom属性失效问题](https://blog.csdn.net/w958796636/article/details/52921584)

> 外层LinearLayout的宽是wrap_content情况下，内层LinearLayout的宽是match_parent不能铺满屏幕，只能达到wrap_content的效果。为了达到铺满屏幕的效果，内层使用宽是match_parent的RelateLayout控件

> 想要异步但在绘制之前进行操作的方法：使用 postOnAnimation 
>
> 比起post 消息队列轮到才执行，可能延迟任意帧，postOnAnimation 下一帧 VSync 必达。且在Choreographe中CALLBACK_ANIMATION 排第二，CALLBACK_TRAVERSAL排第4，比绘制更早触发



#### View事件传递

[ViewGroup事件分发总结-TouchTarget](https://juejin.cn/post/6844904065613201421)

[深入理解事件分发 ViewGroup.mFirstTouchTarget的设计](https://www.jianshu.com/p/5951ebdd2a7e)

[Android中onTouch，onTouchEvent，onClick优先级](https://blog.csdn.net/libinbin147256369/article/details/79911276)

> 当ViewGroup设置了 setOnClickListener，setOnTouchListener返回false （View也是一样的逻辑）
>
> ```
> MyViewGroup-- dispatchTouchEvent
> MyViewGroup-- setOnTouchListener
> MyViewGroup-- onTouchEvent--ACTION_DOWN--true
> 
> MyViewGroup-- dispatchTouchEvent
> MyViewGroup-- setOnTouchListener
> MyViewGroup-- onTouchEvent--ACTION_UP--true
> 
> MyViewGroup-- setOnClickListener
> ```
>
> 当ViewGroup不设置 setOnClickListener，setOnTouchListener返回false
>
> ```
> MyViewGroup-- dispatchTouchEvent
> MyViewGroup-- setOnTouchListener
> MyViewGroup-- onTouchEvent--ACTION_DOWN--false
> ```
>
> **可以看出setOnClickListener会影响 onTouchEvent的返回值，导致消费事件**



> 当ViewGroup设置了 setOnClickListener，setOnTouchListener返回false
>
> 当View设置了 setOnClickListener，setOnTouchListener返回false
>
> ```
> MyViewGroup-- dispatchTouchEvent
> MyView-- dispatchTouchEvent
> MyView-- setOnTouchListener
> MyView-- onTouchEvent--ACTION_DOWN--true
> 
> MyViewGroup-- dispatchTouchEvent
> MyView-- dispatchTouchEvent
> MyView-- setOnTouchListener
> MyView-- onTouchEvent--ACTION_UP--true
> 
> MyView-- setOnClickListener
> ```
>
> **可以看出 优先触发子View的 dispatchTouchEvent，不触发父ViewGroup的setOnTouchListener** **反正就是优先子类**

> **触发的子View的setOnClickListener，父ViewGroup的setOnClickListener不会触发**，
>
> **不可能触发两个View的click事件，因为一个Click事件是在UP事件触发的，只能由一个View接受事件序列，即使UP事件场景onTouchEvent方法返回false，给上层触发，生层也没有PRESS标识，无法触发点击事件**



> 当ViewGroup setOnTouchListener返回false
>
> 当View  setOnTouchListener返回false
>
> ```
> MyViewGroup-- dispatchTouchEvent
> MyView-- dispatchTouchEvent
> MyView-- setOnTouchListener
> MyView-- onTouchEvent--ACTION_DOWN--false
> MyViewGroup-- setOnTouchListener
> MyViewGroup-- onTouchEvent--ACTION_DOWN--false
> ```
>



#### removeView对事件传递的影响

> 1.View正在消费事件时被remove，会触发cancel 事件
>
> ![](https://s3.bmp.ovh/imgs/2025/12/20/7127cce3c2851494.png)



> 2.正在消费的View A被remove后，父View的 dispatchTouchEvent还会继续收到同一序列的事件，但会交给自己的onTouchEvent进行处理
>
> 3.正在消费的View A被remove后，即使父View中还有一个(onTouchEvent返回true，一定会消费事件) 的View B，也不会交给它处理同一序列的事件，一定是由父View处理该序列的事件，下次down事件才会分配给子View B处理
>
> ![](https://s3.bmp.ovh/imgs/2025/12/20/0609ad533b590cb2.png)



#### TouchDelegate扩展点击区域

[TouchDelegate扩展点击区域](https://blog.csdn.net/chuyouyinghe/article/details/115249659)



#### removeView是马上进行ui变化吗

*测试方案： removeFromParent*后主线程等待3s，查看期间效果

```kotlin
fun wait3s(){
    val count = CountDownLatch(1)
    Thread({
        //处理业务1
        try {
            TimeUnit.SECONDS.sleep(3)
            count.countDown()
        } catch (e: InterruptedException) {
            e.printStackTrace()
        } finally {
            count.countDown() //确保每个任务执行完递减
        }
    }, "t1").start()
    count.await()
}
```

> 结论：ui变化是在下一次绘制才发生，即使removeFromParent后又调用requestLayout和invalidate
>
> 测试 FlutterSurfaceView 也是如此



### SurfaceView

#### SurfaceView会挖洞显示

“挖洞”是早期（Android ≤ 6.0）对 **SurfaceView 默认行为** 的形象说法：

1. SurfaceView 的独立 Surface **默认放在 Window 下面**（z 更小）
2. 系统必须在 **宿主 Window 的绘图表面上“抠掉”一块矩形区域**（设为透明），否则用户只能看到 Window 内容，看不到 Surface
3. 这个“抠透明矩形”的过程就是 **requestTransparentRegion → ViewRootImpl → WindowManagerService** 的联动逻辑，被叫成“挖洞”

##### 挖洞的具体步骤（源码级）

1. `onAttachedToWindow()` 里调用
   `mParent.requestTransparentRegion(this)`
   → 把 **SurfaceView 所占矩形** 登记为“要透明”
2. 每次 `performTraversals()` 收集所有透明区
   `ViewGroup.gatherTransparentRegion()`
   → 从根区域 **减去** 所有子 View 的非透明部分，**剩余就是洞**
3. WMS 把最终透明区写进 **SurfaceFlinger 的 Layer 属性**
   → 宿主 Window 的像素 **alpha=0**，**后面 SurfaceView 的 Layer 就透出来**

------

##### 为什么后来“挖洞”说法少了

- **Android 7.0 开始默认改用“同层合成”**（BufferQueueLayer 与 Window 同一 LayerStack）
  **不再在 Window 上抠洞**，而是 **直接按 z 序合成**，所以 **“洞”概念消失**
- Android 7.0 开始框架把 SurfaceView 的 BufferQueue **attach 到 Window 的同一 LayerStack**
  → **不再挖洞**，**层级随 View 树变化**，**动画/透明度/圆角一并支持**
  于是社区把这种“跟 Window 一起合成”的方案叫 **“同层合成”**。
- 只有你 **主动 `setZOrderOnTop(true)`** 才会回到 **旧独立 Layer** 模式，**此时仍需洞**，但 **视觉上你已感知不到**（它盖在最上，不需要 Window 透明）

> Android 7.0 后普通View也可以在SurfaceView 上正常展示
>

#### `bringToFront()` 对 SurfaceView **无效** 

案例场景：先add SurfaceViewA，再add SurfaceViewB，这时候想通过bringToFront()展示SurfaceViewA，

虽然view被移动上来了，但视觉上是没有效果的

原因： **SurfaceView 的 Z-order 一旦随 View 树确定后，就不会再随 View 树顺序变化而重新排序**

具体逻辑：

1. 入口：attachedToWindow → 立即算一次 z-order
2. updateSurface() → 把“View 树序号”转成 z 值 这个 **z 值一次性写进 `mDrawingState.z`**，之后 **不再随 View 树变化而更新**。
3. SurfaceFlinger 侧：只认 z 值，不再看 View 树

> 解决方案：可以通过remove，add重新重新updateSurface方法，更新z值

```kotlin
private fun bringAToFront() {
    if (mSvA != null) {
        mSvA!!.bringToFront()
        val parent = mSvA!!.parent as ViewGroup
        val index =parent.indexOfChild(mSvA)
        //之前认为removeView后 需要post一下addView调用，后面发现并不需要
        //因为surfaceDestroy方法在removeView后会马上调用了
        parent.removeView(mSvA)
        parent.addView(mSvA,index)

    }
}
```

如果换成SurfaceViewB 进行 remove，add操作，问题还是没有解决。必须触发SurfaceViewA的surface重建

个人分析觉得是SurfaceViewA的z值是最低的，例如1。mSvA!!.bringToFront()后，SurfaceViewB 进行 remove，add操作后它的z值也变成最低的1，但因为是remove，add操作，SurfaceViewB 是后更新的，所以它还是处于上层显示



#### 生命周期

> surfaceCreated 
>
>   在performTraversals draw绘制流程中触发

![](https://s3.bmp.ovh/imgs/2025/09/27/4e6d4af0a99336c1.png)



> surfaceDestroyed 
>
> 在removeView 或者 Activity onStop中都会直接触发

![](https://s3.bmp.ovh/imgs/2025/09/27/017253d978b3dddb.png)

![](https://s3.bmp.ovh/imgs/2025/09/27/b3be1e99908211c9.png)



### Fragment

Fragment调用生命周期最近的方法

androidx.fragment.app.FragmentStateManager#moveToExpectedState

#### 1.Commit与CommitNow的区别

##### 1.commit() >> enqueueAction() >> scheduleCommit() >> execPendingActions()

```java
private void scheduleCommit() {
    synchronized (this) {
        boolean postponeReady =
            mPostponedTransactions != null && !mPostponedTransactions.isEmpty();
        boolean pendingReady = mPendingActions != null && mPendingActions.size() == 1;
        if (postponeReady || pendingReady) {
            mHost.getHandler().removeCallbacks(mExecCommit);
            mHost.getHandler().post(mExecCommit);
        }
    }
}

Runnable mExecCommit = new Runnable() {
    @Override
    public void run() {
        execPendingActions();
    }
};    
```

  可以看到commit方法利用Handler机制， 是异步的，所以不清楚fragment什么时候被添加上，不清楚生命周期什么时候被调用

##### 2.commitNow() >>  execSingleAction() >>  removeRedundantOperationsAndExecute() >> executeOpsTogether()

删除部分代码，贴入executeOpsTogether重要部分代码

```java
while((newState = this.computeExpectedState()) != this.mFragment.mState) {
    stateWasChanged = true;
    int nextStep;
    if (newState > this.mFragment.mState) {
        nextStep = this.mFragment.mState + 1;
        switch (nextStep) {
            case 0:
                this.attach();
                break;
            case 1:
                this.create();
                break;
            case 2:
                this.ensureInflatedView();
                this.createView();
                break;
            case 3:
                this.activityCreated();
                break;
            case 4:
                this.mFragment.mState = 4;
                break;
            case 5:
                this.start();
                break;
            case 6:
                this.mFragment.mState = 6;
                break;
            case 7:
                this.resume();
        }
    }
}
```

可以看到commitNow 是同步的，连同Fragment的各个生命周期OnCreate，OnCreateView都会在同一个Looper消息循环中被调用



因此在一些迫切需要立刻展示的场景，可以使用commitNow 或者 commitNowAllowingStateLoss



#### 2.Fragment onResume调用时，view的WindowToken是空的吗？

BUG场景：Fragment onResume调用时，利用fragment的view 显示一个popupwindow可能会因为拿不到token导致崩溃

```java
android.view.WindowManager$BadTokenException: Unable to add window -- token null is not valid; is your activity running?
```

> 解决方法：post一下再显示popupwindow



 *答案：不一定，如果activity的window没在屏幕上时，那么token就是空的；如果是activity的window已经在屏幕上时，再创建显示一个fragment，此时token就不是空的*

##### 如果Fragment是在Activity的onCreate方法时加入场景下 , Fragment的onResume方法调用路径

![](https://s3.bmp.ovh/imgs/2023/06/12/3dd9a65d555145c1.jpg)



可以看到 Fragment的onResume是在同一个消息循环中，跟着Activity的onResume方法调用的，

我们都知道Activity的onResume方法调用，activity的view是还没有add到window上的，所以导致fragment的view有没有add到window上，没有token



##### Fragment 的view是什么时候add的？

```java
//FragmentStateManager类
void createView() {

    this.mFragment.mContainer = container;
    //Fragment的onCreateView被调用
    this.mFragment.performCreateView(layoutInflater, container, this.mFragment.mSavedFragmentState);
    if (this.mFragment.mView != null) {
        this.mFragment.mView.setSaveFromParentEnabled(false);
        this.mFragment.mView.setTag(id.fragment_container_view_tag, this.mFragment);
        if (container != null) {
            //加入父布局
            int index = this.mFragmentStore.findFragmentIndexInContainer(this.mFragment);
            this.mFragment.mContainer.addView(this.mFragment.mView, index);
        }
        //Fragment的onViewCreated被调用
        this.mFragment.performViewCreated();
        this.mDispatcher.dispatchOnFragmentViewCreated(this.mFragment, this.mFragment.mView, this.mFragment.mSavedFragmentState, false);
    }
```

 可以看到虽然Fragment 的view在createView时就add到mContainer上，但可惜mContainer还没有add到window上，所以导致一直到onResume时，也拿不到token



#### 3.探究activity onCreate方法中 commit fragment 场景下，fragment的生命周期

```java
//FragmentActivity类
protected void onStart() {
    this.mFragments.noteStateNotSaved();
    super.onStart();
    this.mStopped = false;
    if (!this.mCreated) {
        this.mCreated = true;
        this.mFragments.dispatchActivityCreated();  //this.dispatchStateChange(4);
    }

    this.mFragments.execPendingActions();
    this.mFragmentLifecycleRegistry.handleLifecycleEvent(Event.ON_START);
    this.mFragments.dispatchStart(); // this.dispatchStateChange(5);
}

//FragmentStateManager类
void moveToExpectedState() {
    if (newState > this.mFragment.mState) {
        nextStep = this.mFragment.mState + 1;
        switch(nextStep) {
            case 0:
                this.attach();
                break;
            case 1:
                this.create();
                break;
            case 2:
                this.ensureInflatedView();
                this.createView();
                break;
            case 3:
                this.activityCreated();
                break;
            case 4:
                this.mFragment.mState = 4;
                break;
            case 5:
                this.start();
                break;
            case 6:
                this.mFragment.mState = 6;
                break;
            case 7:
                this.resume();
        }
    }
}
```

可以看到除了fragment的onResume方法外，所有创建的生命周期都在Activity的onStart()中被调用。

其实Activity的onCreate方法也会调用this.dispatchStateChange(1)，但我们的场景onCreate被调用时才进行commit，导致此时还没有任何的fragment。所有都生命周期堆积在Activity的onStart()中被调用



### DialogFragment

#### 生命周期

```
2019-03-10 14:19:10.971 22626-22626/org.lym.sourcecodeparse D/DialogFragment: onAttach
2019-03-10 14:19:10.971 22626-22626/org.lym.sourcecodeparse D/DialogFragment: onCreate
2019-03-10 14:19:10.972 22626-22626/org.lym.sourcecodeparse D/DialogFragment: onCreateDialog
2019-03-10 14:19:10.972 22626-22626/org.lym.sourcecodeparse D/DialogFragment: onCreateView
2019-03-10 14:19:10.994 22626-22626/org.lym.sourcecodeparse D/DialogFragment: onActivityCreated
2019-03-10 14:19:11.186 22626-22626/org.lym.sourcecodeparse D/DialogFragment: onStart
2019-03-10 14:19:11.186 22626-22626/org.lym.sourcecodeparse D/DialogFragment: onResume
```

#### onCreateDialog调用时机为什么比onCreateView快

```java
//FragmentStateManager类
void createView() {
    //这里触发onCreateDialog
    LayoutInflater layoutInflater = mFragment.performGetLayoutInflater(
        mFragment.mSavedFragmentState);
    //这里触发onCreateView
    mFragment.performCreateView(layoutInflater, container, mFragment.mSavedFragmentState);
}
//fragment类
LayoutInflater performGetLayoutInflater(@Nullable Bundle savedInstanceState) {
    mLayoutInflater = onGetLayoutInflater(savedInstanceState);
    return mLayoutInflater;
}

//DialogFragment类   重写了fragment的onGetLayoutInflater方法
public LayoutInflater onGetLayoutInflater(@Nullable Bundle savedInstanceState) {
    prepareDialog(savedInstanceState);
    if (mDialog != null) {
        layoutInflater = layoutInflater.cloneInContext(mDialog.getContext());
    }
    return layoutInflater;
}
private void prepareDialog(@Nullable Bundle savedInstanceState) {
    mDialog = onCreateDialog(savedInstanceState);
}
```

#### mDecor初始化的时机

```java
//DialogFragment类
public void onStart() {
    super.onStart();
    if (mDialog != null) {
        mDialog.show();
    }
}
//Dialog类
public void show() {
    mDecor = mWindow.getDecorView();
}

```

可以看出mDecor在onStart方法后才会赋值



#### 注意点

###### requestFeature方法必须在onCreateView方法之前调用

```kotlin
override fun onCreateDialog(savedInstanceState: Bundle?): Dialog {
    val dialog = super.onCreateDialog(savedInstanceState)
    dialog.window?.apply {
        requestFeature(Window.FEATURE_NO_TITLE)
    }
    return dialog
}
```

###### setLayout，setGravity等改变UI的方法必须在onStart中调用，不能在onCreateDialog中调用

```java
//Window类
public void setLayout(int width, int height) {
    final WindowManager.LayoutParams attrs = getAttributes();
    attrs.width = width;
    attrs.height = height;
    dispatchWindowAttributesChanged(attrs); //下发attrs
}
//Dialog类
public void onWindowAttributesChanged(WindowManager.LayoutParams params) {
    if (mDecor != null) { //这里的判断是关键
        mWindowManager.updateViewLayout(mDecor, params);
    }
}
```

可以看出setLayout等方法必须在mDecor有值时调用才有效，在onCreateDialog方法被调用时mDecor为null，无法进行UI的设置

###### dialog不拦截区域外的点击事件

```kotlin
setFlags( WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL, WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL)
```



#### **DialogFragment制作的Toast模板：(可以出现在dialog之上，且不影响Activity的点击事件)**

```kotlin
class MyToast : DialogFragment() {
    companion object {
        private const val TAG = "MyToast"
        fun show(value: Any) {
            val dialog = MyToast()
            dialog.arguments = Bundle().apply {
                putInt("value", value)
            }
            dialog.show(fm , "Tosat")
        }
    }

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        val view = inflater.inflate(R.layout.view, container, false)
        return view
    }

    override fun onCreateDialog(savedInstanceState: Bundle?): Dialog {
        val dialog = super.onCreateDialog(savedInstanceState)
        dialog.window?.apply { //去除title样式,必须写在onViewCreated之前
            requestFeature(Window.FEATURE_NO_TITLE)
        }
        return dialog
    }

    override fun onStart() {
        super.onStart()
        dialog?.window?.apply {
            //去除灰色背景
            clearFlags(WindowManager.LayoutParams.FLAG_DIM_BEHIND)
            //传递点击事件到Activity
            setFlags(WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL,WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL)
            //背景
            setBackgroundDrawable(ColorDrawable(0x00000000))
            //设置宽高
            setLayout(250.dpInt, WindowManager.LayoutParams.WRAP_CONTENT)
            //位置
            setGravity(Gravity.CENTER)
        }
        //不可取消
        isCancelable = false
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        show()
    }

    fun show() {
        //处理逻辑
        //启动定时器调用dismissWithAlpha
        lifecycleScope.launch { 
            delay(3000)
            dismissWithAlpha()
        }
    }

    private fun dismissWithAlpha() {
        val animator = ObjectAnimator.ofFloat(view, "alpha", 1.0f, 0f)
        animator.duration = 320
        animator.doOnEnd {
            if (fragmentManager != null) { 
                //加个null判断 因为有个定时器逻辑，最容易发生 Fragment not associated with a fragment manager.
                dismissAllowingStateLoss()
            }
        }
        animator.start()
    }

    override fun onDestroy() {
        super.onDestroy()
        animator?.cancel()
    }
}
```



### PopUpWindow

```kotlin
//继承PopupWindowclass
class MyPopupWindow(context: Context) : PopupWindow(context) {
    
    init{
        setBackgroundDrawable(ColorDrawable(Color.TRANSPARENT))
        contentView = view
        width = ViewGroup.LayoutParams.WRAP_CONTENT
        height = ViewGroup.LayoutParams.WRAP_CONTENT
    }

    fun show(){
        showAtLocation(parent, Gravity.CENTER, 0, 0)
    }
}
```



#### 分析为什么contentView丢失了设置的宽度

```kotlin
//PopupWindow
private void preparePopup(WindowManager.LayoutParams p) {
    if (mBackground != null) { //背景图不为空，将创建背景View
        mBackgroundView = createBackgroundView(mContentView);
        mBackgroundView.setBackground(mBackground);
    } else { //不设置背景图时，contentView就是背景View
        mBackgroundView = mContentView;
    }
    mDecorView = createDecorView(mBackgroundView);

}
//将contentView加入背景ViewGroud中
//如果设置的contentView的高是WRAP_CONTENT，将不改变contentView的高
//否则将contentView的高以MATCH_PARENT加入背景ViewGroud中
//而宽度锁死为MATCH_PARENT
private PopupBackgroundView createBackgroundView(View contentView) {
    final ViewGroup.LayoutParams layoutParams = mContentView.getLayoutParams();
    final int height;
    if (layoutParams != null && layoutParams.height == WRAP_CONTENT) {
        height = WRAP_CONTENT;
    } else {
        height = MATCH_PARENT;
    }
    final PopupBackgroundView backgroundView = new PopupBackgroundView(mContext);
    final PopupBackgroundView.LayoutParams listParams = new PopupBackgroundView.LayoutParams(
        MATCH_PARENT, height);
    backgroundView.addView(contentView, listParams);
    return backgroundView;
}

//将背景View加入DecorView中
//如果设置的contentView的高是WRAP_CONTENT，背景View的高也是WRAP_CONTENT
//否则将背景View的高将以MATCH_PARENT加入背景ViewGroud中
//而背景View宽度锁死为MATCH_PARENT
private PopupDecorView createDecorView(View contentView) {
    final ViewGroup.LayoutParams layoutParams = mContentView.getLayoutParams();
    final int height;
    if (layoutParams != null && layoutParams.height == WRAP_CONTENT) {
        height = WRAP_CONTENT;
    } else {
        height = MATCH_PARENT;
    }

    final PopupDecorView decorView = new PopupDecorView(mContext);
    decorView.addView(contentView, MATCH_PARENT, height);
    decorView.setClipChildren(false);
    decorView.setClipToPadding(false);

    return decorView;
}
//DecorView将以设置PopupWindow的宽高加入window中 
```

**总结**

宽度：

1. 背景View 宽度  MATCH_PARENT
2. contentView宽度  MATCH_PARENT

高度：

如果 contentView高度 是  WRAP_CONTENT 

1.   contentView高度 是  WRAP_CONTENT
2.   ​     背景View高度 是  WRAP_CONTENT

否则

1. ​    contentView高度 是  MATCH_PARENT
2. ​    背景View高度 是  MATCH_PARENT



**由上面可以看出，contentView宽度数据被完全丢失，因此如果contentView存在具体的宽度数据，必须挪到PopupWindow的宽度属性上**



#### 当PopupWindow的宽度设置为WRAP_CONTENT ，而contentView的宽度锁死为MATCH_PARENT，那弹窗的宽度是什么呢？

做个实验便知道：PopupWindow宽是WRAP_CONTENT --- > DecorView的宽是WRAP_CONTENT 

FrameLayout宽是WRAP_CONTENT ，而它子View（ConstraintLayout）是MATCH_PARENT时，子View（ConstraintLayout）的宽度将是WRAP_CONTENT的形式展示。



### ViewPager2

ViewPager2的实现原理是RecyclerView



offscreenPageLimit参数的原理是增加RecyclerView的绘制区域   **ViewPager2内部LinearLayoutManagerImpl类**

```java
private class LinearLayoutManagerImpl extends LinearLayoutManager {
    LinearLayoutManagerImpl(Context context) {
        super(context);
    }

    protected void calculateExtraLayoutSpace(@NonNull RecyclerView.State state, @NonNull int[] extraLayoutSpace) {
        int pageLimit = ViewPager2.this.getOffscreenPageLimit();
        if (pageLimit == -1) {
            super.calculateExtraLayoutSpace(state, extraLayoutSpace);
        } else {
            int offscreenSpace = ViewPager2.this.getPageSize() * pageLimit;
            extraLayoutSpace[0] = offscreenSpace;
            extraLayoutSpace[1] = offscreenSpace;
        }
    }
}
```



### ViewModel

#### ViewModel的onCleared方法被调用时机

```java
//FragmentStateManager
void destroy() {
    //清除ViewModel
    if ((beingRemoved && !mFragment.mBeingSaved) || shouldClear) {
        mFragmentStore.getNonConfig().clearNonConfigState(mFragment);
    }
    mFragment.performDestroy();
}
//Fragment   
void performDestroy() {
    //
    mChildFragmentManager.dispatchDestroy();
    mLifecycleRegistry.handleLifecycleEvent(Lifecycle.Event.ON_DESTROY);
    mState = ATTACHED;
    mCalled = false;
    mIsCreated = false;
    onDestroy();
    if (!mCalled) {
        throw new SuperNotCalledException("Fragment " + this
                                          + " did not call through to super.onDestroy()");
    }
}
```

可以看到调用顺序：

> 1.先清除Fragment自身的ViewModel
>
> 2.调用Fragment的performDestroy
>
> ​    2.1. 调用mChildFragmentManager的dispatchDestroy，递归走上面的逻辑
>
> ​    2.2 生命周期LifecycleRegistry的回调
>
> ​    2.3 调用Frament自身的onDestroy方法



可以看出【ViewModel的onClear方法】调用是快于【Fragment的onDestroy方法】，所以不可以在Fragment的onDestroy中调用viewmodel变量，此时获得的viewmodel实例是新创建的，并不是之前持有的viewmodel变量。



## 业务知识

### 网络加载点9图的补充

 参考文档：

[对嘛！这才是从网络加载点9图的正确姿势](https://juejin.cn/post/7147458316103811108)

去看上面的文档了解，这个博客文只是些个人记录

目前方案是调用 AAPT 预处理完后再上传后台

#### 1.制作点9图

傻瓜式教程

[Android studio中.9图片的含义及制作教程](https://blog.csdn.net/sunbinkang/article/details/77331718)

#### 2.AAPT命令

``` 
C:\Users\AppData\Local\Android\Sdk\build-tools\31.0.0\aapt.exe c -v -S  . -C .\9out
```

将该命令打包成cmd文件，与要处理的点9图处于同一个目录，运行即可（将aapt目录改为自己的对应目录）

上面命令调用AAPT处理资源，将有黑边的点9图转换为正常PNG

#### 2.获得点9图对应的Bitmap

参考文档方案测试不行，因此我的处理是不让Glide生成Bitmap，只是下载文件，然后BitmapFactory转为Bitmap

``` kotlin
Glide.with(view)
.asFile()
.load(url)
.into(object :
      SimpleTarget<File>() {
          override fun onResourceReady(resource: File, p1: Transition<in File>?) {
              val bitmap = BitmapFactory.decodeFile(resource.absolutePath)
              val chunk = bitmap.ninePatchChunk
              val drawable = if (NinePatch.isNinePatchChunk(chunk)) {
                  NinePatchDrawable(context.resources, bitmap, chunk, Rect(), null)
              } else {
                  BitmapDrawable(context.resources, bitmap)
              }
              bgView.setImageDrawable(drawable)
          }
      })
```

<font color='red'>感觉好像都搞定了。。。。。  但还剩下个Bitmap的密度问题</font>

#### 3.获得正确密度尺寸的Bitmap

BitmapFactory.decodeFile(String pathName)  方法的调用不会根据手机尺寸进行图片的缩放

[屏幕密度掺入BitmapFactory里decodeFile与decodeResource的差异](https://blog.csdn.net/sevensundark/article/details/7616450)

这样子会导致一个问题

假如我们有个气泡右上角有个50x50 px的皇冠小icon，我们想要的效果.9图的效果肯定是 

1. 在一倍密度的手机下皇冠大小是50x50 px，剩下的气泡部分由可拉伸的区域填补
2. 在二倍密度的手机下皇冠大小是100x100 px，剩下的气泡部分由可拉伸的区域填补
3. 在三倍密度的手机下皇冠大小是150x150 px，剩下的气泡部分由可拉伸的区域填补



直接调用BitmapFactory.decodeFile(String pathName)  会导致在任何尺寸的手机上气泡皇冠的大小都是50 X 50 px。所以我们要根据手机的尺寸进行图片的缩放

修改第二步代码为：

```kotlin
Glide.with(view)
.asFile()
.load(url)
.into(object :
      SimpleTarget<File>() {
          override fun onResourceReady(resource: File, p1: Transition<in File>?) {
              opt.inDensity = 320 //这是因为我的原始图片是个二倍图 160*2
              opt.inTargetDensity = BasicConfig.appContext.resources.displayMetrics.densityDpi
              val bitmap = BitmapFactory.decodeFile(resource.absolutePath, opt)
              val chunk = bitmap.ninePatchChunk
              val drawable = if (NinePatch.isNinePatchChunk(chunk)) {
                  NinePatchDrawable(context.resources, bitmap, chunk, Rect(), null)
              } else {
                  BitmapDrawable(context.resources, bitmap)
              }
              bgView.setImageDrawable(drawable)
          }
```

  opt.inDensity = 160*你的图片是几倍图  。我的情况是设计提供的是二倍图，所以设置为320



### Notification

[Android通知Notification使用全解析，看这篇就够了](https://bbs.huaweicloud.com/blogs/362305)



#### 前台服务

[安卓9以上，在后台使用麦克风或摄像头功能，必须启动一个前台服务](https://www.rtcdeveloper.cn/cn/community/blog/25759)

[Android后台应用开启前台服务Android8到12梳理](https://zhuanlan.zhihu.com/p/652510243)

[官方限制文档](https://developer.android.com/guide/components/foreground-services#wiu-restrictions)

1. 因为安卓9才需要启动前台服务，而安卓8.0以上就必须指定NotificationChannel，所以NotificationChannel是必须存在的，不用分版本判断创建

2. 案例的NotificationCompat.Builder创建还缺少其他必要参数

   ```
          val builder: NotificationCompat.Builder = NotificationCompat.Builder(baseContext, CHANNEL_ID)
                       .setSmallIcon(xxx)
                       .setContentTitle("前台服务")
                       .setContentText("正在使用麦克风")
   ```

3.[app被强杀时，前台服务会被重新创建，不会自动停止](https://stackoverflow.com/questions/31850252/how-to-kill-a-foreground-service-along-with-the-application)   方法：onTaskRemoved方法中调用stopSelf

 

#### BUG场景问题

1.setSmallIcon方法没有效果，展示效果为白色方块  [问题讨论](https://github.com/invertase/react-native-firebase/issues/1796)

  解决方案：生成单独的通知图标透明文件  [官方网站](https://romannurik.github.io/AndroidAssetStudio/icons-notification.html)



### LinkMovementMethod

BUG场景：

当clickSpan连着imageSpan时，点击imageSpan很容易就触发到clickspan的点击逻辑

特别是文本发生换行时，clickSpan连着imageSpan，此时imagespan处于行尾时，很容易触发该问题



[ImageSpan点击事件位置偏移问题](https://www.jianshu.com/p/b87dddf02e04)

 上面的博客提供了BUG原因和解决方案

#### 自定义LinkMovementMethod

```java
public class MyMovementMethod extends ScrollingMovementMethod {
    private static final int CLICK = 1;
    private static final int UP = 2;
    private static final int DOWN = 3;

    private static final int HIDE_FLOATING_TOOLBAR_DELAY_MS = 200;

    @Override
    public boolean canSelectArbitrarily() {
        return true;
    }

    @Override
    protected boolean handleMovementKey(TextView widget, Spannable buffer, int keyCode,
            int movementMetaState, KeyEvent event) {
        switch (keyCode) {
            case KeyEvent.KEYCODE_DPAD_CENTER:
            case KeyEvent.KEYCODE_ENTER:
                if (KeyEvent.metaStateHasNoModifiers(movementMetaState)) {
                    if (event.getAction() == KeyEvent.ACTION_DOWN &&
                            event.getRepeatCount() == 0 && action(CLICK, widget, buffer)) {
                        return true;
                    }
                }
                break;
        }
        return super.handleMovementKey(widget, buffer, keyCode, movementMetaState, event);
    }

    @Override
    protected boolean up(TextView widget, Spannable buffer) {
        if (action(UP, widget, buffer)) {
            return true;
        }

        return super.up(widget, buffer);
    }

    @Override
    protected boolean down(TextView widget, Spannable buffer) {
        if (action(DOWN, widget, buffer)) {
            return true;
        }

        return super.down(widget, buffer);
    }

    @Override
    protected boolean left(TextView widget, Spannable buffer) {
        if (action(UP, widget, buffer)) {
            return true;
        }

        return super.left(widget, buffer);
    }

    @Override
    protected boolean right(TextView widget, Spannable buffer) {
        if (action(DOWN, widget, buffer)) {
            return true;
        }

        return super.right(widget, buffer);
    }

    private boolean action(int what, TextView widget, Spannable buffer) {
        Layout layout = widget.getLayout();

        int padding = widget.getTotalPaddingTop() +
                      widget.getTotalPaddingBottom();
        int areaTop = widget.getScrollY();
        int areaBot = areaTop + widget.getHeight() - padding;

        int lineTop = layout.getLineForVertical(areaTop);
        int lineBot = layout.getLineForVertical(areaBot);

        int first = layout.getLineStart(lineTop);
        int last = layout.getLineEnd(lineBot);

        ClickableSpan[] candidates = buffer.getSpans(first, last, ClickableSpan.class);

        int a = Selection.getSelectionStart(buffer);
        int b = Selection.getSelectionEnd(buffer);

        int selStart = Math.min(a, b);
        int selEnd = Math.max(a, b);

        if (selStart < 0) {
            if (buffer.getSpanStart(FROM_BELOW) >= 0) {
                selStart = selEnd = buffer.length();
            }
        }

        if (selStart > last)
            selStart = selEnd = Integer.MAX_VALUE;
        if (selEnd < first)
            selStart = selEnd = -1;

        switch (what) {
            case CLICK:
                if (selStart == selEnd) {
                    return false;
                }

                ClickableSpan[] links = buffer.getSpans(selStart, selEnd, ClickableSpan.class);

                if (links.length != 1) {
                    return false;
                }

                ClickableSpan link = links[0];
//                if (link instanceof TextLinkSpan) {
//                    ((TextLinkSpan) link).onClick(widget, TextLinkSpan.INVOCATION_METHOD_KEYBOARD);
//                } else {
//                    link.onClick(widget);
//                }
                link.onClick(widget);
                break;

            case UP:
                int bestStart, bestEnd;

                bestStart = -1;
                bestEnd = -1;

                for (int i = 0; i < candidates.length; i++) {
                    int end = buffer.getSpanEnd(candidates[i]);

                    if (end < selEnd || selStart == selEnd) {
                        if (end > bestEnd) {
                            bestStart = buffer.getSpanStart(candidates[i]);
                            bestEnd = end;
                        }
                    }
                }

                if (bestStart >= 0) {
                    Selection.setSelection(buffer, bestEnd, bestStart);
                    return true;
                }

                break;

            case DOWN:
                bestStart = Integer.MAX_VALUE;
                bestEnd = Integer.MAX_VALUE;

                for (int i = 0; i < candidates.length; i++) {
                    int start = buffer.getSpanStart(candidates[i]);

                    if (start > selStart || selStart == selEnd) {
                        if (start < bestStart) {
                            bestStart = start;
                            bestEnd = buffer.getSpanEnd(candidates[i]);
                        }
                    }
                }

                if (bestEnd < Integer.MAX_VALUE) {
                    Selection.setSelection(buffer, bestStart, bestEnd);
                    return true;
                }

                break;
        }

        return false;
    }

    @Override
    public boolean onTouchEvent(TextView widget, Spannable buffer,
                                MotionEvent event) {
        int action = event.getAction();

        if (action == MotionEvent.ACTION_UP || action == MotionEvent.ACTION_DOWN) {
            int x = (int) event.getX();
            int y = (int) event.getY();

            x -= widget.getTotalPaddingLeft();
            y -= widget.getTotalPaddingTop();

            x += widget.getScrollX();
            y += widget.getScrollY();

            Layout layout = widget.getLayout();
            int line = layout.getLineForVertical(y);
            int off = layout.getOffsetForHorizontal(line, x);
            //该off所在字符的水平偏移
            float xLeft = layout.getPrimaryHorizontal(off);
            if (xLeft < x) {
                off += 1;
            } else {
                off -= 1;
            }
            ClickableSpan[] links = buffer.getSpans(off, off, ClickableSpan.class);

            if (links.length != 0) {
                ClickableSpan link = links[0];
                if (action == MotionEvent.ACTION_UP) {
//                    if (link instanceof TextLinkSpan) {
//                        ((TextLinkSpan) link).onClick(
//                                widget, TextLinkSpan.INVOCATION_METHOD_TOUCH);
//                    } else {
//                        link.onClick(widget);
//                    }
                    link.onClick(widget);
                } else if (action == MotionEvent.ACTION_DOWN) {
//                    if (widget.getContext().getApplicationInfo().targetSdkVersion
//                            >= Build.VERSION_CODES.P) {
//                        // Selection change will reposition the toolbar. Hide it for a few ms for a
//                        // smoother transition.
//                        widget.hideFloatingToolbar(HIDE_FLOATING_TOOLBAR_DELAY_MS);
//                    }
                    Selection.setSelection(buffer,
                            buffer.getSpanStart(link),
                            buffer.getSpanEnd(link));
                }
                return true;
            } else {
                Selection.removeSelection(buffer);
            }
        }

        return super.onTouchEvent(widget, buffer, event);
    }

    @Override
    public void initialize(TextView widget, Spannable text) {
        Selection.removeSelection(text);
        text.removeSpan(FROM_BELOW);
    }

    @Override
    public void onTakeFocus(TextView view, Spannable text, int dir) {
        Selection.removeSelection(text);

        if ((dir & View.FOCUS_BACKWARD) != 0) {
            text.setSpan(FROM_BELOW, 0, 0, Spannable.SPAN_POINT_POINT);
        } else {
            text.removeSpan(FROM_BELOW);
        }
    }

    public static MovementMethod getInstance() {
        if (sInstance == null)
            sInstance = new PublicChatMovementMethod();

        return sInstance;
    }

    private static PublicChatMovementMethod sInstance;
    private static Object FROM_BELOW = new NoCopySpan.Concrete();
}

```



#### 支持GIF播放的TextView和Span

```kotlin
class SpanTextView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyle: Int = 0
) : TextView(context, attrs, defStyle) {

    private var hasSpanCallback = false

    private var isSpanAttached = false

    private var spanCallbacks: Array<SpanCallback>? = null

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        onAttach()
    }

    override fun onDetachedFromWindow() {
        super.onDetachedFromWindow()
        onDetach()
    }

    override fun onStartTemporaryDetach() {
        super.onStartTemporaryDetach()
        onDetach()
    }

    override fun onFinishTemporaryDetach() {
        super.onFinishTemporaryDetach()
        onAttach()
    }

    override fun setText(text: CharSequence, type: BufferType) {
        if (getText() === text) {
            //防止重复设置text导致span中反复调用生命周期方法
            super.setText(text, type)
            return
        }
        val wasSpanAttached = isSpanAttached
        if (hasSpanCallback && wasSpanAttached) {
            onDetach()
        }
        if (text is Spanned) {
            try {
                spanCallbacks = text.getSpans(0, text.length, SpanCallback::class.java)
                hasSpanCallback = spanCallbacks?.isNotEmpty() == true
            } catch (e: ArrayIndexOutOfBoundsException) {
                //
            }
        } else {
            spanCallbacks = null
            hasSpanCallback = false
        }
        super.setText(text, type)
        if (hasSpanCallback && wasSpanAttached) {
            onAttach()
        }
    }

    private fun onAttach() {
        spanCallbacks?.forEach {
            it.onAttach(this)
        }
        isSpanAttached = true
    }

    private fun onDetach() {
        spanCallbacks?.forEach {
            it.onDetach()
        }
        isSpanAttached = false
    }

    interface SpanCallback {
        fun onAttach(textView: TextView)
        fun onDetach()
    }
}
```

```kotlin
class GIFImageSpan(d: Drawable) : CustomImageSpan(d) , SpanTextView.SpanCallback {

    var curDrawableCallback: Drawable.Callback? = null
    override fun onAttach(textView: TextView) {
        val textViewRef = WeakReference(textView)
        (drawable as? GifDrawable)?.apply {
            curDrawableCallback = object : Drawable.Callback {
                override fun invalidateDrawable(who: Drawable) {
                    textViewRef.get()?.invalidate()
                }

                override fun scheduleDrawable(who: Drawable, what: Runnable, `when`: Long) {
                }

                override fun unscheduleDrawable(who: Drawable, what: Runnable) {
                }
            }
            drawable.callback = curDrawableCallback

            if (!isRunning) {
                start()
            }
        }
    }

    override fun onDetach() {
        (drawable as? GifDrawable)?.apply {
            if (isRunning) {
                stop()
            }
        }
        curDrawableCallback = null
    }
}
```



#### 支持上下偏移的Span

```java
public static class VerticalOffsetSpan extends ReplacementSpan {
    private final int offsetPx;
    private final int textSize;


    public VerticalOffsetSpan(int textSize, int offsetPx) {
        this.offsetPx = offsetPx;
        this.textSize = textSize;
    }


    @Override
    public int getSize(Paint paint, CharSequence text, int start, int end, Paint.FontMetricsInt fm) {
        paint.setTextSize(textSize);
        return Math.round(paint.measureText(text, start, end));
    }


    @Override
    public void draw(Canvas canvas, CharSequence text, int start, int end,
                     float x, int top, int y, int bottom, Paint paint) {
        paint.setTextSize(textSize);
        canvas.drawText(text, start, end, x, y + offsetPx, paint);
    }
}

```



### SnapHelper

```java
//快速滑动时触发
public int findTargetSnapPosition(RecyclerView.LayoutManager layoutManager, int velocityX,int velocityY)
//缓慢滑动时触发  
public View findSnapView(RecyclerView.LayoutManager layoutManager)    
```

*默认的PagerSnapHelper 是通过内部的findCenterView方法找到距离RecyclerView中点最近的View*



但如果有需求需要一页一页滑动，但滑动到三分之一处就切换页面，那默认的PagerSnapHelper无法处理，它是滑动到二分之一才进行页面切换。这就需要我们自定义PagerSnapHelper 



#### 1.自定义三分之一滑动的PagerSnapHelper 

大部分都是复制默认的PagerSnapHelper ，只需要改动findCenterView方法

```java
/*
 * Copyright 2018 The Android Open Source Project
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package com.lanshushui;

import android.graphics.PointF;
import android.util.DisplayMetrics;
import android.view.View;
import android.view.ViewGroup;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.recyclerview.widget.LinearSmoothScroller;
import androidx.recyclerview.widget.OrientationHelper;
import androidx.recyclerview.widget.RecyclerView;
import androidx.recyclerview.widget.SnapHelper;

import tv.athena.util.common.ScreenUtils;

/**
 * Implementation of the {@link SnapHelper} supporting pager style snapping in either vertical or
 * horizontal orientation.
 *
 * <p>
 * <p>
 * PagerSnapHelper can help achieve a similar behavior to
 * {@link androidx.viewpager.widget.ViewPager}. Set both {@link RecyclerView} and the items of the
 * {@link RecyclerView.Adapter} to have
 * {@link android.view.ViewGroup.LayoutParams#MATCH_PARENT} height and width and then attach
 * PagerSnapHelper to the {@link RecyclerView} using {@link #attachToRecyclerView(RecyclerView)}.
 */
public class PagerSnapHelper extends SnapHelper {
    private static final int MAX_SCROLL_ON_FLING_DURATION = 100; // ms

    // Orientation helpers are lazily created per LayoutManager.
    @Nullable
    private OrientationHelper mVerticalHelper;
    @Nullable
    private OrientationHelper mHorizontalHelper;

    private RecyclerView mRecyclerView;


    @Override
    public void attachToRecyclerView(@Nullable RecyclerView recyclerView) throws IllegalStateException {
        super.attachToRecyclerView(recyclerView);
        mRecyclerView = recyclerView;
    }

    @Nullable
    @Override
    public int[] calculateDistanceToFinalSnap(@NonNull RecyclerView.LayoutManager layoutManager,
                                              @NonNull View targetView) {
        int[] out = new int[2];
        if (layoutManager.canScrollHorizontally()) {
            out[0] = distanceToCenter(targetView,
                    getHorizontalHelper(layoutManager));
        } else {
            out[0] = 0;
        }

        if (layoutManager.canScrollVertically()) {
            out[1] = distanceToCenter(targetView,
                    getVerticalHelper(layoutManager));
        } else {
            out[1] = 0;
        }
        return out;
    }

    @Nullable
    @Override
    public View findSnapView(RecyclerView.LayoutManager layoutManager) {
        if (layoutManager.canScrollVertically()) {
            return findCenterView(layoutManager, getVerticalHelper(layoutManager));
        } else if (layoutManager.canScrollHorizontally()) {
            return findCenterView(layoutManager, getHorizontalHelper(layoutManager));
        }
        return null;
    }

    @Override
    public int findTargetSnapPosition(RecyclerView.LayoutManager layoutManager, int velocityX,
                                      int velocityY) {
        final int itemCount = layoutManager.getItemCount();
        if (itemCount == 0) {
            return RecyclerView.NO_POSITION;
        }

        final OrientationHelper orientationHelper = getOrientationHelper(layoutManager);
        if (orientationHelper == null) {
            return RecyclerView.NO_POSITION;
        }

        // A child that is exactly in the center is eligible for both before and after
        View closestChildBeforeCenter = null;
        int distanceBefore = Integer.MIN_VALUE;
        View closestChildAfterCenter = null;
        int distanceAfter = Integer.MAX_VALUE;

        // Find the first view before the center, and the first view after the center
        final int childCount = layoutManager.getChildCount();
        for (int i = 0; i < childCount; i++) {
            final View child = layoutManager.getChildAt(i);
            if (child == null) {
                continue;
            }
            final int distance = distanceToCenter(child, orientationHelper);

            if (distance <= 0 && distance > distanceBefore) {
                // Child is before the center and closer then the previous best
                distanceBefore = distance;
                closestChildBeforeCenter = child;
            }
            if (distance >= 0 && distance < distanceAfter) {
                // Child is after the center and closer then the previous best
                distanceAfter = distance;
                closestChildAfterCenter = child;
            }
        }

        // Return the position of the first child from the center, in the direction of the fling
        final boolean forwardDirection = isForwardFling(layoutManager, velocityX, velocityY);
        if (forwardDirection && closestChildAfterCenter != null) {
            return layoutManager.getPosition(closestChildAfterCenter);
        } else if (!forwardDirection && closestChildBeforeCenter != null) {
            return layoutManager.getPosition(closestChildBeforeCenter);
        }

        // There is no child in the direction of the fling. Either it doesn't exist (start/end of
        // the list), or it is not yet attached (very rare case when children are larger then the
        // viewport). Extrapolate from the child that is visible to get the position of the view to
        // snap to.
        View visibleView = forwardDirection ? closestChildBeforeCenter : closestChildAfterCenter;
        if (visibleView == null) {
            return RecyclerView.NO_POSITION;
        }
        int visiblePosition = layoutManager.getPosition(visibleView);
        int snapToPosition = visiblePosition
                + (isReverseLayout(layoutManager) == forwardDirection ? -1 : +1);

        if (snapToPosition < 0 || snapToPosition >= itemCount) {
            return RecyclerView.NO_POSITION;
        }
        return snapToPosition;
    }

    private boolean isForwardFling(RecyclerView.LayoutManager layoutManager, int velocityX,
                                   int velocityY) {
        if (layoutManager.canScrollHorizontally()) {
            return velocityX > 0;
        } else {
            return velocityY > 0;
        }
    }

    private boolean isReverseLayout(RecyclerView.LayoutManager layoutManager) {
        final int itemCount = layoutManager.getItemCount();
        if ((layoutManager instanceof RecyclerView.SmoothScroller.ScrollVectorProvider)) {
            RecyclerView.SmoothScroller.ScrollVectorProvider vectorProvider =
                    (RecyclerView.SmoothScroller.ScrollVectorProvider) layoutManager;
            PointF vectorForEnd = vectorProvider.computeScrollVectorForPosition(itemCount - 1);
            if (vectorForEnd != null) {
                return vectorForEnd.x < 0 || vectorForEnd.y < 0;
            }
        }
        return false;
    }

    @Nullable
    @Override
    protected RecyclerView.SmoothScroller createScroller(
            @NonNull RecyclerView.LayoutManager layoutManager) {
        if (!(layoutManager instanceof RecyclerView.SmoothScroller.ScrollVectorProvider)) {
            return null;
        }
        return new LinearSmoothScroller(PagerSnapHelper.this.mRecyclerView.getContext()) {

            private static final float MILLISECONDS_PER_INCH = 25f;

            @Override
            protected void onTargetFound(View targetView, RecyclerView.State state, Action action) {
                int[] snapDistances = calculateDistanceToFinalSnap(mRecyclerView.getLayoutManager(),
                        targetView);
                final int dx = snapDistances[0];
                final int dy = snapDistances[1];
                final int time = calculateTimeForDeceleration(Math.max(Math.abs(dx), Math.abs(dy)));
                if (time > 0) {
                    action.update(dx, dy, time, mDecelerateInterpolator);
                }
            }

            @Override
            protected float calculateSpeedPerPixel(DisplayMetrics displayMetrics) {
                return MILLISECONDS_PER_INCH / displayMetrics.densityDpi;
            }

            @Override
            protected int calculateTimeForScrolling(int dx) {
                return Math.min(MAX_SCROLL_ON_FLING_DURATION, super.calculateTimeForScrolling(dx));
            }
        };
    }

    private int distanceToCenter(@NonNull View targetView, OrientationHelper helper) {
        final int childCenter = helper.getDecoratedStart(targetView)
                + (helper.getDecoratedMeasurement(targetView) / 2);
        final int containerCenter = helper.getStartAfterPadding() + helper.getTotalSpace() / 2;
        return childCenter - containerCenter;
    }

    /**
     * 找到将要展示的View
     * 若无新View展示超过三分之一，则返回当前View
     * 否则返回新加入的View
     */
    @Nullable
    private View findCenterView(RecyclerView.LayoutManager layoutManager,
                                OrientationHelper helper) {
        int childCount = layoutManager.getChildCount();
        if (childCount == 0) {
            return null;
        }
        View CurContainer = null;
        for (int i = 0; i < childCount; i++) {
            final View child = layoutManager.getChildAt(i);
            if (child == null) {
                continue;
            }
            //child view是否是当前正在显示的View
            boolean isCurContainer = isCurPage((ViewGroup) child);
            if (isCurContainer) {
                CurContainer = child;
            }
            int maxHeight = ScreenUtils.getScreenHeight();
            int maxScrollY = maxHeight / 3;
            int[] out = new int[2];
            child.getLocationInWindow(out);
            if (isCurContainer) { //当前View是当前页
                if (Math.abs(out[1]) <= maxScrollY) { //滑动幅度小于三分之一
                    return child;
                } else {
                    //存在新View滑动超过三分之一
                }
            }else { //当前View不是当前页
                if (maxHeight - Math.abs(out[1]) >= maxScrollY) { //露出的部分超过三分之一
                    return child;
                }
            }
        }
        return CurContainer;
    }

    @Nullable
    private OrientationHelper getOrientationHelper(RecyclerView.LayoutManager layoutManager) {
        if (layoutManager.canScrollVertically()) {
            return getVerticalHelper(layoutManager);
        } else if (layoutManager.canScrollHorizontally()) {
            return getHorizontalHelper(layoutManager);
        } else {
            return null;
        }
    }

    @NonNull
    private OrientationHelper getVerticalHelper(@NonNull RecyclerView.LayoutManager layoutManager) {
        if (mVerticalHelper == null || mVerticalHelper.getLayoutManager() != layoutManager) {
            mVerticalHelper = OrientationHelper.createVerticalHelper(layoutManager);
        }
        return mVerticalHelper;
    }

    @NonNull
    private OrientationHelper getHorizontalHelper(
            @NonNull RecyclerView.LayoutManager layoutManager) {
        if (mHorizontalHelper == null || mHorizontalHelper.getLayoutManager() != layoutManager) {
            mHorizontalHelper = OrientationHelper.createHorizontalHelper(layoutManager);
        }
        return mHorizontalHelper;
    }
}

```



### java层捕捉崩溃的写法

```kotlin
private static void startCatchLooper() {
    new Handler(Looper.getMainLooper()).post(() -> {
        while (true) {
            loopInner();
        }
    });
}

private static void loopInner() {
    try {
        Looper.loop();
    } catch (Throwable e) {
        if (e.getMessage() != null) {
            Message message = getMessage();
            //如果忽略该异常，则直接return，否则继续抛出Throwable
            if(catch(message,e)){
                return;
            }else{
                throw e;
            }
        }
    }
}
// 获得当前执行的Message

private static Message getMessage() {
    MessageQueue messageQueue;
    Looper mainLooper = Looper.getMainLooper();
    try {
        if (Build.VERSION.SDK_INT >= 23) {
            messageQueue = mainLooper.getQueue();
        } else {
            Field fieldQueue = Looper.class.getDeclaredField("mQueue");
            fieldQueue.setAccessible(true);
            messageQueue = (MessageQueue) fieldQueue.get(mainLooper);
        }
        Field fieldMessages = MessageQueue.class.getDeclaredField("mMessages");
        fieldMessages.setAccessible(true);
        return (Message) fieldMessages.get(messageQueue);
    } catch (Throwable ignored) {
        //
    }
    return null;
}    
```



## 崩溃场景

### Android 非45度倍数角度渐变引起的崩溃

[Android 非45度倍数角度渐变引起的崩溃](https://juejin.cn/post/7097060489540141092)



Keep Moving Forward
