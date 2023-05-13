---
title: Fragment知识点
categories:
  - 知识点
tags:
  - Fragment
abbrlink: 1733ce00
---





## 1.关键节点

Fragment调用生命周期最近的方法

androidx.fragment.app.FragmentStateManager#moveToExpectedState



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







Keep Moving Forward
