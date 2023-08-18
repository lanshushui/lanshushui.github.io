---
title: DialogFragment知识点
categories:
  - 知识点
tags:
  - DialogFragment
abbrlink: 6b67b819
---



## 1.生命周期



```
2019-03-10 14:19:10.971 22626-22626/org.lym.sourcecodeparse D/DialogFragment: onAttach
2019-03-10 14:19:10.971 22626-22626/org.lym.sourcecodeparse D/DialogFragment: onCreate
2019-03-10 14:19:10.972 22626-22626/org.lym.sourcecodeparse D/DialogFragment: onCreateDialog
2019-03-10 14:19:10.972 22626-22626/org.lym.sourcecodeparse D/DialogFragment: onCreateView
2019-03-10 14:19:10.994 22626-22626/org.lym.sourcecodeparse D/DialogFragment: onActivityCreated
2019-03-10 14:19:11.186 22626-22626/org.lym.sourcecodeparse D/DialogFragment: onStart
2019-03-10 14:19:11.186 22626-22626/org.lym.sourcecodeparse D/DialogFragment: onResume
```



<!-- more -->



## 2.关键点

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

​       

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



##### **DialogFragment制作的Toast模板：(可以出现在dialog之上，且不影响Activity的点击事件)**

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

Keep Moving Forward
