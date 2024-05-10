---
title: ViewModel知识点
categories:
  - Android
tags:
  - ViewModel
abbrlink: 4500f14b
---



ViewModel出现了调用onCleared方法 又马上被创建的情况



## 1.ViewModel的onCleared方法被调用时机

<!-- more -->

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





*可以看出【ViewModel的onClear方法】调用是快于【Fragment的onDestroy方法】，所以不可以在Fragment的onDestroy中调用viewmodel变量，此时获得的viewmodel实例是新创建的，并不是之前持有的viewmodel变量。*



Keep Moving Forward
