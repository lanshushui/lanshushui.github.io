---
title: Notification知识点
categories:
  - Notification
tags:
  - 知识点
abbrlink: 6082b58e
---



[Android通知Notification使用全解析，看这篇就够了](https://bbs.huaweicloud.com/blogs/362305)



<!-- more -->

## 前台服务

[安卓9以上，在后台使用麦克风或摄像头功能，必须启动一个前台服务](https://www.rtcdeveloper.cn/cn/community/blog/25759)

[Android后台应用开启前台服务Android8到12梳理](https://zhuanlan.zhihu.com/p/652510243)

[官方限制文档](https://developer.android.com/guide/components/foreground-services#wiu-restrictions)



1. 因为安卓9才需要启动前台服务，而安卓8.0以上就必须指定NotificationChannel，所以NotificationChannel是必须存在的，不用分版本判断创建

2. 案例的NotificationCompat.Builder创建还缺少其他必要参数

   ```
          val builder: NotificationCompat.Builder = NotificationCompat.Builder(baseContext, CHANNEL_ID)
                       .setSmallIcon(xxx)
                       .setContentTitle("前台服务")
                       .setContentText("正在使用麦克风")
   ```

3.[app被强杀时，前台服务会被重新创建，不会自动停止](https://stackoverflow.com/questions/31850252/how-to-kill-a-foreground-service-along-with-the-application)   方法：onTaskRemoved方法中调用stopSelf

​     

## 常见问题

1.setSmallIcon方法没有效果，展示效果为白色方块  [问题讨论](https://github.com/invertase/react-native-firebase/issues/1796)

  解决方案：生成单独的通知图标透明文件  [官方网站](https://romannurik.github.io/AndroidAssetStudio/icons-notification.html)





Keep Moving Forward
