---
title: ImageSpan扩展
categories:
  - Android
tags:
  - ImageSpan
abbrlink: 503d328
---



## 支持GIF播放的TextView

<!-- more -->

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



## 支持GIF的ImageSpan

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



Keep Moving Forward
