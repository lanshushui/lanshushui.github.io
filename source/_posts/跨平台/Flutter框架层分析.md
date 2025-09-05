---
title: Flutter框架层分析
categories:
  - 跨平台
tags:
  - 知识点
top: 100
abbrlink: b619670f
---



> flutter doctor -v 查看Flutter SDK安装路径

> dart format . 格式化内容       dart format . -o none --set-exit-if-changed 判断文件是否格式化，否则报错

> flutter analyze 默认会分析整个项目的 Dart 代码。如果你想跳过某些文件或目录的检测. 在 analysis_options.yaml 中排除文件或目录

> [PlatformView的原理](http://guoshuyu.cn:9528/home/wx/Flutter-P3.html)

<!-- more -->



## Engine创建流程

java层调用  createAndRunEngine  → attachToNative

1.c++层调用 AttachJNI [代码](https://github.com/flutter/engine/blob/main/shell/platform/android/platform_view_android_jni_impl.cc#L157)

```c
static jlong AttachJNI(JNIEnv* env, jclass clazz, jobject flutterJNI) {
    fml::jni::JavaObjectWeakGlobalRef java_object(env, flutterJNI);
    std::shared_ptr<PlatformViewAndroidJNI> jni_facade =
        std::make_shared<PlatformViewAndroidJNIImpl>(java_object);
    auto shell_holder = std::make_unique<AndroidShellHolder>(
        FlutterMain::Get().GetSettings(), jni_facade);
    if (shell_holder->IsValid()) {
        return reinterpret_cast<jlong>(shell_holder.release());
    } else {
        return 0;
    }
}
```

2.调用AndroidShellHolder的构造函数  [代码](https://github.com/flutter/engine/blob/main/shell/platform/android/android_shell_holder.cc#L85)   先后创建 ThreadHost ，利用ThreadHost 提供的taskRunner创建 task_runners ， Shell [代码 ](https://github.com/flutter/engine/blob/main/shell/platform/android/android_shell_holder.cc#L85) 

>  AndroidShellHolder 通过唯一成员 `std::unique_ptr<Shell> shell_` 管理整个 Shell 生命周期

3.构造函数先创建 ThreadHost 

1. ThreadHost构造函数调用CreateThread创建4个线程 [代码](https://github.com/flutter/engine/blob/main/shell/common/thread_host.cc#L79)
2. CreateThread 创建 std::make_unique< fml::Thread >   [代码](https://github.com/flutter/engine/blob/main/shell/common/thread_host.cc#L59)
3. fml::Thread 构造函数创建 std::make_unique< ThreadHandle > ，ThreadHandle构造函数创建真正的线程 [代码](https://github.com/flutter/engine/blob/main/fml/thread.cc#L66)

再利用ThreadHost 提供的taskRunner创建 task_runners ， 调用 **Shell::Create** 创建std::unique_ptr< Shell >，传入on_create_platform_view  lambda函数 等待创建PlatformViewAndroid  [代码](https://github.com/flutter/engine/blob/main/shell/platform/android/android_shell_holder.cc#L85)

4.Shell::Create 调用Shell::CreateWithSnapshot方法创建Shell [代码](https://github.com/flutter/engine/blob/main/shell/common/shell.cc#L361)

```c
std::unique_ptr<Shell> Shell::CreateShellOnPlatformThread(
    DartVMRef vm,
    fml::RefPtr<fml::RasterThreadMerger> parent_merger,
    std::shared_ptr<ShellIOManager> parent_io_manager,
    const std::shared_ptr<ResourceCacheLimitCalculator>&
    resource_cache_limit_calculator,
    const TaskRunners& task_runners,
    const PlatformData& platform_data,
    const Settings& settings,
    fml::RefPtr<const DartSnapshot> isolate_snapshot,
    const Shell::CreateCallback<PlatformView>& on_create_platform_view,
    const Shell::CreateCallback<Rasterizer>& on_create_rasterizer,
    const Shell::EngineCreateCallback& on_create_engine,
    bool is_gpu_disabled) {
    if (!task_runners.IsValid()) {
        FML_LOG(ERROR) << "Task runners to run the shell were invalid.";
        return nullptr;
    }
    //创建shell
    auto shell = std::unique_ptr<Shell>(
        new Shell(std::move(vm), task_runners, std::move(parent_merger),
                  resource_cache_limit_calculator, settings, is_gpu_disabled));

    // 在 platform thread (this thread) 创建 platform view
    auto platform_view = on_create_platform_view(*shell.get());
    if (!platform_view || !platform_view->GetWeakPtr()) {
        return nullptr;
    }

    // 在 raster 线程创建rasterizer.
    std::promise<std::unique_ptr<Rasterizer>> rasterizer_promise;
    auto rasterizer_future = rasterizer_promise.get_future();
    std::promise<fml::TaskRunnerAffineWeakPtr<SnapshotDelegate>>
        snapshot_delegate_promise;
    auto snapshot_delegate_future = snapshot_delegate_promise.get_future();
    fml::TaskRunner::RunNowOrPostTask(
        task_runners.GetRasterTaskRunner(),
        [&rasterizer_promise,  //
         &snapshot_delegate_promise,
         on_create_rasterizer,                                   //
         shell = shell.get(),                                    //
         impeller_context = platform_view->GetImpellerContext()  //
        ]() {
            TRACE_EVENT0("flutter", "ShellSetupGPUSubsystem");
            std::unique_ptr<Rasterizer> rasterizer(on_create_rasterizer(*shell));
            rasterizer->SetImpellerContext(impeller_context);
            snapshot_delegate_promise.set_value(rasterizer->GetSnapshotDelegate());
            rasterizer_promise.set_value(std::move(rasterizer));
        });

    // Ask the platform view for the vsync waiter. This will be used by the engine
    // to create the animator.
    auto vsync_waiter = platform_view->CreateVSyncWaiter();
    if (!vsync_waiter) {
        return nullptr;
    }

    // 在 IO 线程上创建 IO 管理器。IO 管理器必须先初始化，
    //因为它的状态是其他子系统所依赖的。它必须先启动并获取初始化其他子系统所需的引用。
    std::promise<std::shared_ptr<ShellIOManager>> io_manager_promise;
    auto io_manager_future = io_manager_promise.get_future();
    std::promise<fml::WeakPtr<ShellIOManager>> weak_io_manager_promise;
    auto weak_io_manager_future = weak_io_manager_promise.get_future();
    std::promise<fml::RefPtr<SkiaUnrefQueue>> unref_queue_promise;
    auto unref_queue_future = unref_queue_promise.get_future();
    auto io_task_runner = shell->GetTaskRunners().GetIOTaskRunner();
    
	//platform_view最终会通过shell->Setup(std::move(platform_view), ...)方法存储在shell的platform_view_属性中
    PlatformView* platform_view_ptr = platform_view.get();
    fml::TaskRunner::RunNowOrPostTask(
        io_task_runner,
        [&io_manager_promise,                                               //
         &weak_io_manager_promise,                                          //
         &parent_io_manager,                                                //
         &unref_queue_promise,                                              //
         platform_view_ptr,                                                 //
         io_task_runner,                                                    //
         is_backgrounded_sync_switch = shell->GetIsGpuDisabledSyncSwitch()  //
        ]() {
            TRACE_EVENT0("flutter", "ShellSetupIOSubsystem");
            std::shared_ptr<ShellIOManager> io_manager;
            if (parent_io_manager) {
                io_manager = parent_io_manager;
            } else {
                io_manager = std::make_shared<ShellIOManager>(
                    platform_view_ptr->CreateResourceContext(),  // resource context
                    is_backgrounded_sync_switch,                 // sync switch
                    io_task_runner,  // unref queue task runner
                    platform_view_ptr->GetImpellerContext()  // impeller context
                );
            }
            weak_io_manager_promise.set_value(io_manager->GetWeakPtr());
            unref_queue_promise.set_value(io_manager->GetSkiaUnrefQueue());
            io_manager_promise.set_value(io_manager);
        });

    // Send dispatcher_maker to the engine constructor because shell won't have
    // platform_view set until Shell::Setup is called later.
    auto dispatcher_maker = platform_view->GetDispatcherMaker();

    // 在 UI 线程中创造Engine. std::unique_ptr<Engine> engine_;
    std::promise<std::unique_ptr<Engine>> engine_promise;
    auto engine_future = engine_promise.get_future();
    fml::TaskRunner::RunNowOrPostTask(
        shell->GetTaskRunners().GetUITaskRunner(),
        fml::MakeCopyable([&engine_promise,                                 //
                           shell = shell.get(),                             //
                           &dispatcher_maker,                               //
                           &platform_data,                                  //
                           isolate_snapshot = std::move(isolate_snapshot),  //
                           vsync_waiter = std::move(vsync_waiter),          //
                           &weak_io_manager_future,                         //
                           &snapshot_delegate_future,                       //
                           &unref_queue_future,                             //
                           &on_create_engine,
                           runtime_stage_backend = DetermineRuntimeStageBackend(
                               platform_view->GetImpellerContext())]() mutable {
            TRACE_EVENT0("flutter", "ShellSetupUISubsystem");
            const auto& task_runners = shell->GetTaskRunners();

            // The animator is owned by the UI thread but it gets its vsync pulses
            // from the platform.
            auto animator = std::make_unique<Animator>(*shell, task_runners,
                                                       std::move(vsync_waiter));

            engine_promise.set_value(on_create_engine(
                *shell,                               //
                dispatcher_maker,                     //
                *shell->GetDartVM(),                  //
                std::move(isolate_snapshot),          //
                task_runners,                         //
                platform_data,                        //
                shell->GetSettings(),                 //
                std::move(animator),                  //
                weak_io_manager_future.get(),         //
                unref_queue_future.get(),             //
                snapshot_delegate_future.get(),       //
                shell->is_gpu_disabled_sync_switch_,  //
                runtime_stage_backend                 //
            ));
        }));

    //将platform_view存储在shell中，这里都是一些future.get  所以都会等待结果
    if (!shell->Setup(std::move(platform_view),  //
                      engine_future.get(),       //
                      rasterizer_future.get(),   //
                      io_manager_future.get())   //
       ) {
        return nullptr;
    }

    return shell;
}
```



## Engine spawn流程

> Shell::Spawn 不会为 UI / GPU / IO 三个 TaskRunner 再创建新的 fml::Thread，而是直接把 **父 Shell 已经跑起来的那三条线程** 拿来复用

1.利用主engine的flutterJNI 创建出新的FlutterJNI，然后调用engine的构造方法

```java
FlutterEngine spawn(
    @NonNull Context context,
    @NonNull DartEntrypoint dartEntrypoint,
    @Nullable String initialRoute,
    @Nullable List<String> dartEntrypointArgs,
    @Nullable PlatformViewsController platformViewsController,
    boolean automaticallyRegisterPlugins,
    boolean waitForRestorationData) {
    if (!isAttachedToJni()) {
        throw new IllegalStateException(
            "Spawn can only be called on a fully constructed FlutterEngine");
    }

    FlutterJNI newFlutterJNI =
        flutterJNI.spawn(
        dartEntrypoint.dartEntrypointFunctionName,
        dartEntrypoint.dartEntrypointLibrary,
        initialRoute,
        dartEntrypointArgs);
    return new FlutterEngine(
        context, // Context.
        null, // FlutterLoader. A null value passed here causes the constructor to get it from the
        // FlutterInjector.
        newFlutterJNI, // FlutterJNI.
        platformViewsController, // PlatformViewsController.
        null, // String[]. The Dart VM has already started, this arguments will have no effect.
        automaticallyRegisterPlugins, // boolean.
        waitForRestorationData); // boolean
}

```

2.用native方法构造出新的FlutterJNI

```java
public FlutterJNI spawn(
    @Nullable String entrypointFunctionName,
    @Nullable String pathToEntrypointFunction,
    @Nullable String initialRoute,
    @Nullable List<String> entrypointArgs) {
    ensureRunningOnMainThread();
    ensureAttachedToNative();
    FlutterJNI spawnedJNI =
        nativeSpawn(
        nativeShellHolderId,
        entrypointFunctionName,
        pathToEntrypointFunction,
        initialRoute,
        entrypointArgs);
    Preconditions.checkState(
        spawnedJNI.nativeShellHolderId != null && spawnedJNI.nativeShellHolderId != 0,
        "Failed to spawn new JNI connected shell from existing shell.");

    return spawnedJNI;
}

```

3.native层创建java层对象FlutterJNI   [代码来源](https://github.com/flutter/engine/blob/main/shell/platform/android/platform_view_android_jni_impl.cc)

> 主engine的nativeShellHolderId 属性是engine调用 attachToJni 方法赋值的，
>
> spawn的engine的nativeShellHolderId 属性  是c++层赋值的，因为此时的flutterJNI 已经attach了

```c
// 简单地创建AndroidShellHolder c++对象后返回指针
static jlong AttachJNI(JNIEnv* env, jclass clazz, jobject flutterJNI) {
  fml::jni::JavaObjectWeakGlobalRef java_object(env, flutterJNI);
  std::shared_ptr<PlatformViewAndroidJNI> jni_facade =
      std::make_shared<PlatformViewAndroidJNIImpl>(java_object);
  auto shell_holder = std::make_unique<AndroidShellHolder>(
      FlutterMain::Get().GetSettings(), jni_facade);
  if (shell_holder->IsValid()) {
    return reinterpret_cast<jlong>(shell_holder.release());
  } else {
    return 0;
  }
}

static jobject SpawnJNI(JNIEnv* env,
                        jobject jcaller,
                        jlong shell_holder,
                        jstring jEntrypoint,
                        jstring jLibraryUrl,
                        jstring jInitialRoute,
                        jobject jEntrypointArgs) {
    //构建出java层对象的FlutterJNI
    jobject jni = env->NewObject(g_flutter_jni_class->obj(), g_jni_constructor);
    if (jni == nullptr) {
        FML_LOG(ERROR) << "Could not create a FlutterJNI instance";
        return nullptr;
    }

    fml::jni::JavaObjectWeakGlobalRef java_jni(env, jni);
    std::shared_ptr<PlatformViewAndroidJNI> jni_facade =
        std::make_shared<PlatformViewAndroidJNIImpl>(java_jni);

    auto entrypoint = fml::jni::JavaStringToString(env, jEntrypoint);
    auto libraryUrl = fml::jni::JavaStringToString(env, jLibraryUrl);
    auto initial_route = fml::jni::JavaStringToString(env, jInitialRoute);
    auto entrypoint_args = fml::jni::StringListToVector(env, jEntrypointArgs);
	//这里利用宏，用shell_holder参数构建出新的AndroidShellHolder	
    auto spawned_shell_holder = ANDROID_SHELL_HOLDER->Spawn(
        jni_facade, entrypoint, libraryUrl, initial_route, entrypoint_args);

    if (spawned_shell_holder == nullptr || !spawned_shell_holder->IsValid()) {
        FML_LOG(ERROR) << "Could not spawn Shell";
        return nullptr;
    }

    jobject javaLong = env->CallStaticObjectMethod(
        g_java_long_class->obj(), g_long_constructor,
        reinterpret_cast<jlong>(spawned_shell_holder.release()));
    if (javaLong == nullptr) {
        FML_LOG(ERROR) << "Could not create a Long instance";
        return nullptr;
    }
	//设置java层对象的FlutterJNI的nativeShellHolderId 属性
    env->SetObjectField(jni, g_jni_shell_holder_field, javaLong);

    return jni;
}
```

4.AndroidShellHolder::Spawn  这里把原本的thread_host_传递进新AndroidShellHolder的构造函数中，复用了thread_host_，创建新的 std::unique_ptr< AndroidShellHolder >  [代码](https://github.com/flutter/engine/blob/main/shell/platform/android/android_shell_holder.cc#L218)   

5.Shell::Spawn    把原本的task_runners_传递进CreateWithSnapshot 方法中复用   [代码](https://github.com/flutter/engine/blob/main/shell/common/shell.cc#L572)  

6.Shell::CreateWithSnapshot [代码](https://github.com/flutter/engine/blob/main/shell/common/shell.cc#L361)   

7.Shell::CreateShellOnPlatformThread  创建std::unique_ptr< Shell > [代码 ](https://github.com/flutter/engine/blob/main/shell/common/shell.cc#L205) 



> 注意：我发现c++层的engine也有Spawn方法，但是并没有找到调用链接，我们java层 spawn 一个engine时也是把CreateEngine方法 传入CreateWithSnapshot的参数中，最终调用 std::make_unique< Engine >方法  [代码](https://github.com/flutter/engine/blob/main/shell/common/shell.cc#L55)



## Engine摧毁流程

java层调用 destroy→ detachFromNativeAndReleaseResources→ nativeDestroy

1.c++层调用DestroyJNI [代码](https://github.com/flutter/engine/blob/main/shell/platform/android/platform_view_android_jni_impl.cc#L170)

```c
static void DestroyJNI(JNIEnv* env, jobject jcaller, jlong shell_holder) {
  delete ANDROID_SHELL_HOLDER;
}
```

2.调用AndroidShellHolder的析构函数 [代码](https://github.com/flutter/engine/blob/main/shell/platform/android/android_shell_holder.cc#L205)

```c
AndroidShellHolder::~AndroidShellHolder() {
  shell_.reset();  //std::unique_ptr<Shell> shell_; 所以一定会调用析构函数
  thread_host_.reset(); //std::shared_ptr<ThreadHost> thread_host_;   能否立刻调用ThreadHost的析构函数存疑？
}
```

3.调用shell_的析构函数  主要是向各个TaskRunner抛任务 [代码](https://github.com/flutter/engine/blob/main/shell/common/shell.cc#L508) 

```c
Shell::~Shell() {
    #if !SLIMPELLER
    PersistentCache::GetCacheForProcess()->RemoveWorkerTaskRunner(
        task_runners_.GetIOTaskRunner());
    #endif  //  !SLIMPELLER

    vm_->GetServiceProtocol()->RemoveHandler(this);

    fml::AutoResetWaitableEvent platiso_latch, ui_latch, gpu_latch,
    platform_latch, io_latch;

    fml::TaskRunner::RunNowOrPostTask(
        task_runners_.GetPlatformTaskRunner(),
        fml::MakeCopyable([this, &platiso_latch]() mutable {
            engine_->ShutdownPlatformIsolates();
            platiso_latch.Signal();
        }));
    platiso_latch.Wait();

    fml::TaskRunner::RunNowOrPostTask(
        task_runners_.GetUITaskRunner(),
        fml::MakeCopyable([this, &ui_latch]() mutable {
            engine_.reset(); //std::unique_ptr<Engine> engine_;   一定会调用Engine的析构函数
            ui_latch.Signal();
        }));
    ui_latch.Wait();

    fml::TaskRunner::RunNowOrPostTask(
        task_runners_.GetRasterTaskRunner(),
        fml::MakeCopyable(
            [this, rasterizer = std::move(rasterizer_), &gpu_latch]() mutable {
                rasterizer.reset();  //std::unique_ptr<Rasterizer> rasterizer_;  一定会调用Rasterizer的析构函数
                this->weak_factory_gpu_.reset(); // std::unique_ptr<fml::TaskRunnerAffineWeakPtrFactory<Shell>> weak_factory_gpu_;   一定会调用weak_factory_gpu_的析构函数
                gpu_latch.Signal();
            }));
    gpu_latch.Wait();

    fml::TaskRunner::RunNowOrPostTask(
        task_runners_.GetIOTaskRunner(),
        fml::MakeCopyable([io_manager = std::move(io_manager_),
                           platform_view = platform_view_.get(),
                           &io_latch]() mutable {
            io_manager.reset();
            if (platform_view) {
                platform_view->ReleaseResourceContext();
            }
            io_latch.Signal();
        }));

    io_latch.Wait();

    // The platform view must go last because it may be holding onto platform side
    // counterparts to resources owned by subsystems running on other threads. For
    // example, the NSOpenGLContext on the Mac.
    fml::TaskRunner::RunNowOrPostTask(
        task_runners_.GetPlatformTaskRunner(),
        fml::MakeCopyable([platform_view = std::move(platform_view_),
                           &platform_latch]() mutable {
            platform_view.reset(); //std::unique_ptr<PlatformView> platform_view_; 一定会调用PlatformView的析构函数
            platform_latch.Signal();
        }));
    platform_latch.Wait();
}
```

4.ThreadHost的析构函数没有额外代码，但它持有所有线程都是unique的，所以当ThreadHost析构时，所有线程都会析构停止,会调用pthread_join等待所有线程停止。 [代码](https://github.com/flutter/engine/blob/main/shell/common/thread_host.h)

```c
std::unique_ptr<fml::Thread> platform_thread;
std::unique_ptr<fml::Thread> ui_thread;
std::unique_ptr<fml::Thread> raster_thread;
std::unique_ptr<fml::Thread> io_thread;
std::unique_ptr<fml::Thread> profiler_thread;
//成员按声明顺序（上 → 下）构造，按析构逆序（下 → 上）销毁,所以是 io -- raster -- ui 先后停止
```





Keep Moving Forward
