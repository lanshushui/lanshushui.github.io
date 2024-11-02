---
title: Hdc命令
categories:
  - Harmony
tags:
  - 命令
abbrlink: 502a37a0
---

## 



### macOS环境变量设置方法

[官方文档](https://developer.huawei.com/consumer/cn/doc/harmonyos-guides-V5/hdc-V5#%E5%8F%AF%E9%80%89%E9%85%8D%E7%BD%AE%E5%85%A8%E5%B1%80%E7%8E%AF%E5%A2%83%E5%8F%98%E9%87%8F)    [Linux报错：bash:vi:command not find 如何解决](https://www.cnblogs.com/moonsoft/p/15990450.html)

```typescript
1、打开终端工具，执行以下命令，根据输出结果分别执行不同命令。
echo $SHELL
-如果输出结果为/bin/bash，则执行以下命令，打开.bash_profile文件。
vi ~/.bash_profile
-如果输出结果为/bin/zsh，则执行以下命令，打开.zshrc文件。
vi ~/.zshrc


2、单击字母“i”，进入Insert模式。

3、输入以下内容
export PATH=${PATH}: sdk路径/openharmony/10/toolchains

4、编辑完成后，单击Esc键，退出编辑模式，然后输入“:wq”，单击Enter键保存。

5、执行以下命令，使配置的环境变量生效。
-如果步骤1时打开的是.bash_profile文件，请执行如下命令：
source ~/.bash_profile
-如果步骤1时打开的是.zshrc文件，请执行如下命令：
source ~/.zshrc

6、环境变量配置完成后，关闭并重启DevEco Studio。
```

- 使用`hdc kill -r`命令可以杀掉异常进程并重启hdc服务。
- 如果`hdc list targets`获取不到设备信息，检查是否有hdc进程存在，并尝试重启hdc服务。



Keep Moving Forward
