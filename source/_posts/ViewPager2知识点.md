---
title: ViewPager2知识点
categories:
  - 知识点
tags:
  - ViewPager2
abbrlink: 5f633874
---



## 开始

1. ViewPager2的实现原理是RecyclerView

   

2. offscreenPageLimit参数的原理是增加RecyclerView的绘制区域   **ViewPager2内部LinearLayoutManagerImpl类**

   ```java
   private class LinearLayoutManagerImpl extends LinearLayoutManager {
       LinearLayoutManagerImpl(Context context) {
           super(context);
       }
   
       protected void calculateExtraLayoutSpace(@NonNull RecyclerView.State state, @NonNull int[] extraLayoutSpace) {
           int pageLimit = ViewPager2.this.getOffscreenPageLimit();
           if (pageLimit == -1) {
               super.calculateExtraLayoutSpace(state, extraLayoutSpace);
           } else {
               int offscreenSpace = ViewPager2.this.getPageSize() * pageLimit;
               extraLayoutSpace[0] = offscreenSpace;
               extraLayoutSpace[1] = offscreenSpace;
           }
       }
   }
   ```





Keep Moving Forward
