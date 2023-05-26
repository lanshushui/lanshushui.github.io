---
title: PopUpWindow知识点
categories:
  - 知识点
tags:
  - PopUpWindow
abbrlink: p8hxlm47
---





## PopUpWindow基础用法

```kotlin
//继承PopupWindow
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



#### 问题1：丢失contentView设置的宽度

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

总结

宽度：

1. 背景View 宽度  MATCH_PARENT
2. contentView宽度  MATCH_PARENT

高度：

如果 contentView高度 是  WRAP_CONTENT 

1.   contentView高度 是  WRAP_CONTENT
2. ​     背景View高度 是  WRAP_CONTENT

否则

1. ​    contentView高度 是  MATCH_PARENT
2. ​    背景View高度 是  MATCH_PARENT



**由上面可以看出，contentView宽度数据被完全丢失，因此如果contentView存在具体的宽度数据，必须挪到PopupWindow的宽度属性上**



#### 提问：当PopupWindow的宽度设置为WRAP_CONTENT ，而我们知道contentView的宽度锁死为MATCH_PARENT，那弹窗的宽度是什么呢？



做个实验便知道：PopupWindow宽是WRAP_CONTENT -》DecorView的宽是WRAP_CONTENT 

FrameLayout宽是WRAP_CONTENT ，而它子View（ConstraintLayout）是MATCH_PARENT时，子View（ConstraintLayout）的宽度将是WRAP_CONTENT的形式展示。



## PopupWindow如何全屏

```kotlin
setBackgroundDrawable(ColorDrawable(Color.TRANSPARENT))
isClippingEnabled = false
width = ViewGroup.LayoutParams.MATCH_PARENT
height = ViewGroup.LayoutParams.MATCH_PARENT
```



Keep Moving Forward
