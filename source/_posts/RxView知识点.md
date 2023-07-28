---
title: RxView知识点
categories:
  - 知识点
tags:
  - RxView
abbrlink: 6beb18a4
---





基于 rxbinding 2.0.0 分析



```
┬───
│ GC Root: Thread object
│
├─ io.reactivex.internal.schedulers.RxThreadFactory$RxCustomThread instance
│ Leaking: UNKNOWN
│ Retaining 5.2 kB in 166 objects
│ Thread name: 'RxComputationThreadPool-1'
│ ↓ Thread.target
│ ~~~~~~
├─ java.util.concurrent.ThreadPoolExecutor$Worker instance
│ Leaking: UNKNOWN
│ Retaining 48 B in 1 objects
│ ↓ ThreadPoolExecutor$Worker.this$0
│ ~~~~~~
├─ java.util.concurrent.ScheduledThreadPoolExecutor instance
│ Leaking: UNKNOWN
│ Retaining 9.1 MB in 79175 objects
│ ↓ ThreadPoolExecutor.workQueue
│ ~~~~~~~~~
├─ java.util.concurrent.ScheduledThreadPoolExecutor$DelayedWorkQueue instance
│ Leaking: UNKNOWN
│ Retaining 9.1 MB in 79166 objects
│ ↓ ScheduledThreadPoolExecutor$DelayedWorkQueue.queue
│ ~~~~~
├─ java.util.concurrent.RunnableScheduledFuture[] array
│ Leaking: UNKNOWN
│ Retaining 9.1 MB in 79161 objects
│ ↓ RunnableScheduledFuture[0]
│ ~~~
├─ java.util.concurrent.ScheduledThreadPoolExecutor$ScheduledFutureTask instance
│ Leaking: UNKNOWN
│ Retaining 9.1 MB in 79083 objects
│ ↓ FutureTask.callable
│ ~~~~~~~~
├─ io.reactivex.internal.schedulers.ScheduledRunnable instance
│ Leaking: UNKNOWN
│ Retaining 9.1 MB in 79082 objects
│ ↓ ScheduledRunnable.actual
│ ~~~~~~
├─ io.reactivex.internal.operators.observable.ObservableThrottleFirstTimed$DebounceTimedObserver instance
│ Leaking: UNKNOWN
│ Retaining 9.1 MB in 79077 objects
│ ↓ ObservableThrottleFirstTimed$DebounceTimedObserver.upstream
│ ~~~~~~~~
├─ com.jakewharton.rxbinding2.view.ViewClickObservable$Listener instance
│ Leaking: UNKNOWN
│ Retaining 32 B in 2 objects
│ ↓ ViewClickObservable$Listener.c
│ ~
├─ CornerRectLayout instance
│ Leaking: YES (View.mContext references a destroyed activity)
│ Retaining 23.8 kB in 335 objects
│ View not part of a window view hierarchy
│ View.mAttachInfo is null (view detached)
│ View.mWindowAttachCount = 5
│ mContext instance of LiveHouseActivity with mDestroyed = true
```



**内存泄露原因： RxView防止重复点击的throttleFirst导致的**



RxView的防止重复点击的关键方法 【throttleFirst】    原理分析

```java
public final Observable<T> throttleFirst(long windowDuration, TimeUnit unit) {
    //默认传入的是io调度器
    return throttleFirst(windowDuration, unit, Schedulers.computation());
}

public final Observable<T> throttleFirst(long skipDuration, TimeUnit unit, Scheduler scheduler) {
    ObjectHelper.requireNonNull(unit, "unit is null");
    ObjectHelper.requireNonNull(scheduler, "scheduler is null");
    return RxJavaPlugins.onAssembly(new ObservableThrottleFirstTimed<T>(this, skipDuration, unit, scheduler));
}
```



由此可见 throttleFirst方法是对上游封装成 ObservableThrottleFirstTimed类



```java
public final class ObservableThrottleFirstTimed<T> extends AbstractObservableWithUpstream<T, T> {
    final long timeout;
    final TimeUnit unit;
    final Scheduler scheduler;

    public ObservableThrottleFirstTimed(ObservableSource<T> source,
                                        long timeout, TimeUnit unit, Scheduler scheduler) {
        super(source);
        this.timeout = timeout;
        this.unit = unit;
        this.scheduler = scheduler;
    }

    @Override
    public void subscribeActual(Observer<? super T> t) {
        //将下游Observer封装成DebounceTimedObserver，它是实现防止重复点击的类
        source.subscribe(new DebounceTimedObserver<T>(
            new SerializedObserver<T>(t),
            timeout, unit, scheduler.createWorker()));
    }

    static final class DebounceTimedObserver<T>
        extends AtomicReference<Disposable>
        implements Observer<T>, Disposable, Runnable {
        private static final long serialVersionUID = 786994795061867455L;

        final Observer<? super T> downstream;
        final long timeout;
        final TimeUnit unit;
        final Scheduler.Worker worker;

        Disposable upstream;

        volatile boolean gate;

        boolean done;

        DebounceTimedObserver(Observer<? super T> actual, long timeout, TimeUnit unit, Worker worker) {
            this.downstream = actual;
            this.timeout = timeout;
            this.unit = unit;
            this.worker = worker;
        }

        @Override
        public void onSubscribe(Disposable d) {
            if (DisposableHelper.validate(this.upstream, d)) {
                this.upstream = d;
                downstream.onSubscribe(this);
            }
        }

        @Override
        public void onNext(T t) {
            //防止重复点击的关键变量gate，默认是false，能走进分支，进入分支后就设置成true，不再允许给下游发送点击事件
            if (!gate && !done) {
                gate = true;

                downstream.onNext(t);

                Disposable d = get();
                if (d != null) {
                    d.dispose();
                }
                //该类本身是个Runnbale，扔给work执行延时任务，重新设置gate的值
                DisposableHelper.replace(this, worker.schedule(this, timeout, unit));
            }
        }

        @Override
        public void run() {
            //允许发送点击事件
            gate = false;
        }

        @Override
        public void onError(Throwable t) {
            if (done) {
                RxJavaPlugins.onError(t);
            } else {
                done = true;
                downstream.onError(t);
                worker.dispose();
            }
        }

        @Override
        public void onComplete() {
            if (!done) {
                done = true;
                downstream.onComplete();
                worker.dispose();
            }
        }

        @Override
        public void dispose() {
            upstream.dispose();
            worker.dispose();
        }

        @Override
        public boolean isDisposed() {
            return worker.isDisposed();
        }
    }
}

```



总结：

其实点击事件是正常生成，但通过DebounceTimedObserver的gate变量控制，不会给下游传递点击事件。

DebounceTimedObserver通过给io线程发送延时任务，实现再次允许给下游传递点击事件。延时的时长就是重复重复点击的时长。



*泄露原因：正是io线程持有延时任务，延时任务Runnable类本身就是DebounceTimedObserver，持有上下游，持有链一直传递，导致Activity无法被释放。*



该泄露场景很少，只有在rxjava的io线程非常繁忙，延时任务前面有很多耗时任务，导致延时任务一直无法被执行才会出现。

一旦延时任务被执行了，引用链就消失了，所以也不会一直内存泄露。



解决方法：

1.不用管，该内存泄露并不会一直存在

2.用回原生Click

3.点击Observable绑定生命周期，及时剥离上下流

绑定生命周期函数代码：

```kotlin
fun <T> Observable<T>.bindLife(life: Any): Observable<T> = let {
    when (life) {
        is View -> it.compose(RxLifecycleAndroid.bindView(life))
        is LifecycleProvider<*> -> it.compose(RxLifecycle.bind(life.lifecycle().filter { event ->
            event == ActivityEvent.DESTROY || event == FragmentEvent.DESTROY_VIEW
        }))
        is Lifecycle -> it.compose(RxLifecycle.bind(LifecycleObservable(life).filter { event ->
            event == Lifecycle.Event.ON_DESTROY
        }))
        is Observable<*> -> it.compose(RxLifecycle.bind(life))
        else -> it
    }
}
```



Keep Moving Forward
