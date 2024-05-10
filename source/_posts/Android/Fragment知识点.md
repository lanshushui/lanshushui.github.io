---
title: Fragment知识点
categories:
  - Android
tags:
  - Fragment
abbrlink: 1733ce00
---



## 1.关键节点

Fragment调用生命周期最近的方法

androidx.fragment.app.FragmentStateManager#moveToExpectedState



<!-- more -->



## 2.Commit与CommitNow的区别

1. commit() >> enqueueAction() >> scheduleCommit() >> execPendingActions()

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
   ```

​       

```java
Runnable mExecCommit = new Runnable() {
    @Override
    public void run() {
        execPendingActions();
    }
};

```



可以看到commit方法利用Handler机制， 是异步的，所以不清楚fragment什么时候被添加上，不清楚生命周期什么时候被调用



2.commitNow() >>  execSingleAction() >>  removeRedundantOperationsAndExecute() >> executeOpsTogether()

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



## 3.Fragment onResume调用时，view的WindowToken是空的吗？

 *答案：不一定，如果activity的window没在屏幕上时，那么token就是空的；如果是activity的window已经在屏幕上时，再创建显示一个fragment，此时token就不是空的*



##### Fragment是在Activity的onCreate方法时加入场景下 , Fragment的onResume方法调用路径

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



知识场景：Fragment onResume调用时，利用fragment的view 显示一个popupwindow可能会因为拿不到token导致崩溃

```
android.view.WindowManager$BadTokenException: Unable to add window -- token null is not valid; is your activity running?
```



解决方法：post一下再显示popupwindow



## 探究activity onCreate方法中 commit fragment 场景下，fragment的生命周期

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
```

```java
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



Keep Moving Forward
