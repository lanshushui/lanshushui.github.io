---
title: RecyclerView首次加载图片展示完成时机
categories:
  - 疑难杂症
tags:
  - RecyclerView
  - RecyclerView首次加载
abbrlink: 94cfd8e0
---
突然接到一个需求，要知道一个RecyclerView刚打开时，第一次加载时屏幕上所有子item的封面图片下载完成的时机



<!-- more -->

## 开始



### 1.目前屏幕上RecyclerView所有可见viewHolder

``` kotlin
val manager =recyclerview.layoutManager()
val first = findFirstVisibleItemPosition()
val last = findLastVisibleItemPosition()
for (i in first..last) {
    val viewHolder = recyclerView?.findViewHolderForAdapterPosition(i) 
}
```



### 2.图片下载完成时机（Glide）

``` kotlin
Glide.with(coverView).load(item.cover).into(object : DrawableImageViewTarget(coverView) {
    override fun setResource(resource: Drawable?) {
        super.setResource(resource)
        if (resource != null) {
            //此时已完成图片展示
        }
    }
})
```



### 3.最重要的是知道什么时候调用第一步，获得Recyclerview第一次加载完成后屏幕上所有可见viewHolder

###### 答案是 自定义GridLayoutManager ，重写onLayoutCompleted方法

``` kotlin
class MyGridLayoutManager(context: Context?, spanSize: Int) : GridLayoutManager(context, spanSize) {

    companion object {
        //是否已经是首次加载
        private var isAlreadyRecordCover = false
    }

    private var recyclerView: RecyclerView? = null

    private var coverUrls = mutableListOf<String>()

    override fun onAttachedToWindow(view: RecyclerView?) {
        super.onAttachedToWindow(view)
        recyclerView = view
    }

	//该方法被调用时，已完成布局，结合自定义变量isAlreadyRecordCover，实现获得第一次加载的数据
    override fun onLayoutCompleted(state: RecyclerView.State?) {
        super.onLayoutCompleted(state)
        if (isAlreadyRecordCover) return
        val first = findFirstVisibleItemPosition()
        val last = findLastVisibleItemPosition()
        if (first != -1 && last != -1) { //不等于-1才说明Recyclerview真的有数据
            isAlreadyRecordCover = true
            for (i in first..last) {
                val viewHolder = recyclerView?.findViewHolderForAdapterPosition(i)
                //通过viewHolder 获得并记录封面url
                coverUrls.add(url)
            }
        }
    }

    /**
     * 步骤2的需要通知的方法
     */
    fun reportCoverShow(cover: String) {
        if (coverUrls.contains(cover)) {
            coverUrls.remove(cover)
            if (coverUrls.isEmpty()) {
                //此时封面数据已全部展示
            }
        }
    }
}
```

知道怎么实现后感觉挺简单的，较难的是想到解决思路
