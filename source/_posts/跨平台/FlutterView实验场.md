---
title: FlutterView实验场
categories:
  - 跨平台
tags:
  - 知识点
top: 100
abbrlink: d2a32cfc
---

> FlutterView 内部默认是 **FlutterSurfaceView** 展示 。在需要将FlutterView在不同ViewGroup移动的场景中，会因为remove，add操作出现短暂黑屏



> 将FlutterView切换到 **FlutterTextureView **展示 ，在不同ViewGroup移动的场景中也会因为remove，add操作出现短暂闪屏，闪屏颜色为 FlutterView本身的背景色

<!-- more -->

[代码仓库](https://github.com/lanshushui/FlutterHost)

## FlutterView在不同ViewGroup移动

相比起来FlutterTextureView 更容易实现该功能



##### 为什么FlutterTextureView移动会导致短暂闪屏？

> 因为SurfaceTexture的重新摧毁建立导致的

![](https://s3.bmp.ovh/imgs/2025/05/24/ef748d0fd2fefdc1.png)

上图为removeFromParent触发的逻辑，FlutterTextureView注册的SurfaceTextureListener的onSurfaceTextureDestroyed被调用



![](https://s3.bmp.ovh/imgs/2025/05/24/87770428a26267ae.png)

上图为addView后的逻辑，绘制流程触发的FlutterTextureView注册的SurfaceTextureListener的onSurfaceTextureAvailable被调用



##### 怎么复用SurfaceTexture 第一版

> 在remove textureView时，textureView 中的surfaceTexture成员变量会置为空。所以在textureView重新添加到页面view时，在draw（）方法中会重新生成一个surfaceTexture，并回调onSurfaceTextureAvailable（）接口方法。只有重新生成surfaceTexture时才会回调。注意如果在draw（）方法之前，比如preDraw（）中，把老的SurfaceTexture给到新的textureview，那么就不会生成新的surfaceTexture了  [来源](https://blog.csdn.net/u010029439/article/details/94213830)



根据上述方案查看源码，可以看见TextureView的mSurface变量会条件调用release方法后置空

![](https://s3.bmp.ovh/imgs/2025/05/24/60624e28e813ba41.png)



第一版的代码

```kotlin
val flutterTextureView = flutterView.get(0) as FlutterTextureView
//removeView前保存surfaceTexture
val old =flutterTextureView.surfaceTexture
findViewById<ViewGroup>(R.id.container).removeView(flutterView)
//removeView后设置旧的surfaceTexture
flutterTextureView.setSurfaceTexture(old!!)
findViewById<ViewGroup>(R.id.container).addView(flutterView,0)
```

**有问题，不能用一个已经released的SurfaceTexture**

![](https://s3.bmp.ovh/imgs/2025/05/24/d5285fbf90af51b9.png)



##### SurfaceTexture什么时候release的？

从上面的releaseSurfaceTexture源码可以看出，SurfaceTextureListener的onSurfaceTextureDestroyed方法返回值决定着是否release SurfaceTexture



##### 怎么复用SurfaceTexture 第二版

因为FlutterTextureView的surfaceTextureListener是私有变量，无法修改内部onSurfaceTextureDestroyed相关代码。

幸好FlutterView支持传入自定义FlutterTextureView，因此想出代理模式跳过原来的onSurfaceTextureDestroyed逻辑



**自定义FlutterTextureView**

```kotlin
class MyFlutterTextureView(context: Context) : FlutterTextureView(context) {

    override fun setSurfaceTextureListener(listener: SurfaceTextureListener?) {
        if (listener != null) {
            super.setSurfaceTextureListener(WrapSurfaceTextureListener(listener))
        } else {
            super.setSurfaceTextureListener(listener)
        }
    }

    class WrapSurfaceTextureListener(private val listener: SurfaceTextureListener) :
        SurfaceTextureListener {
        override fun onSurfaceTextureAvailable(surface: SurfaceTexture, width: Int, height: Int) {
            listener.onSurfaceTextureAvailable(surface, width, height)
        }

        override fun onSurfaceTextureSizeChanged(surface: SurfaceTexture, width: Int, height: Int) {
            listener.onSurfaceTextureSizeChanged(surface, width, height)
        }

        override fun onSurfaceTextureDestroyed(surface: SurfaceTexture): Boolean {
            return false
        }

        override fun onSurfaceTextureUpdated(surface: SurfaceTexture) {
            listener.onSurfaceTextureUpdated(surface)
        }

    }
}
```

实现不闪屏的移动FlutterView方案

```kotlin
class MainActivity : Activity() {
    lateinit var flutterEngine: FlutterEngine

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.layout_main)
        val flutterView =FlutterView(this,MyFlutterTextureView(this))
        flutterView.setBackgroundColor(resources.getColor(android.R.color.holo_red_dark))
        findViewById<ViewGroup>(R.id.container).addView(flutterView,0)
        flutterEngine = FlutterEngine(this)
        flutterEngine.dartExecutor.executeDartEntrypoint(
            DartExecutor.DartEntrypoint.createDefault()
        )
        flutterView.attachToFlutterEngine(flutterEngine)
        findViewById<Button>(R.id.btn).setOnClickListener {
            val flutterTextureView = flutterView.get(0) as FlutterTextureView
            //removeView前保存surfaceTexture
            val old =flutterTextureView.surfaceTexture
            findViewById<ViewGroup>(R.id.container).removeView(flutterView)
            //removeView后设置旧的surfaceTexture
            flutterTextureView.setSurfaceTexture(old!!)
            findViewById<ViewGroup>(R.id.container).addView(flutterView,0)
        }

    }

    override fun onResume() {
        super.onResume()
        // flutterEngine.getLifecycleChannel()获取到的是一个LifecycleChannel对象，类比于MethodChannel，
        // 作用大概就是将Flutter和原生端的生命周期相互联系起来。
        flutterEngine.lifecycleChannel.appIsResumed()
    }

    override fun onPause() {
        super.onPause()
        flutterEngine.lifecycleChannel.appIsInactive()
    }

    override fun onStop() {
        super.onStop()
        flutterEngine.lifecycleChannel.appIsPaused()
    }
}

```





## Flutter在surface与texture之间切换展示

> FlutterView内部有convertToImageView方法就有类似的切换效果，主要就是attachToRenderer方法调用，所以直接上代码了

```kotlin
class MyFlutterView : FlutterView {

    var flutterTextureView: FlutterTextureView? = null
    var flutterSurfaceView: FlutterSurfaceView? = null
    private var flutterEngine: FlutterEngine? = null

    constructor(context: Context, flutterTextureView: MyFlutterTextureView) : super(
        context,
        flutterTextureView
    ) {
        this.flutterTextureView = flutterTextureView
    }

    constructor(context: Context, flutterSurfaceView: FlutterSurfaceView) : super(
        context,
        flutterSurfaceView
    ) {
        this.flutterSurfaceView = flutterSurfaceView
    }

    override fun attachToFlutterEngine(flutterEngine: FlutterEngine) {
        super.attachToFlutterEngine(flutterEngine)
        this.flutterEngine = flutterEngine
    }

    fun switch() {
        if (getChildAt(0) == flutterSurfaceView && flutterSurfaceView != null) {
            flutterSurfaceView!!.removeFromParent()
            if (flutterTextureView == null) {
                flutterTextureView = MyFlutterTextureView(context)
            }
            addView(flutterTextureView)
            if (flutterEngine != null) {
                flutterTextureView!!.attachToRenderer(flutterEngine!!.renderer)
            }
        } else if (getChildAt(0) == flutterTextureView && flutterTextureView != null) {
            val old =flutterTextureView!!.surfaceTexture
            flutterTextureView!!.removeFromParent()
            flutterTextureView!!.setSurfaceTexture(old!!)
            if (flutterSurfaceView == null) {
                flutterSurfaceView = FlutterSurfaceView(context)
            }
            addView(flutterSurfaceView)
            if (flutterEngine != null) {
                flutterSurfaceView!!.attachToRenderer(flutterEngine!!.renderer)
            }
        }
    }
}

fun View.removeFromParent() {
    val parent = parent
    if (parent != null && parent is ViewGroup) {
        parent.removeView(this)
    }
}
```





Keep Moving Forward
