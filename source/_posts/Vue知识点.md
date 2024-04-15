---
title: Vue知识点
categories:
  - Vue
tags:
  - Vue
abbrlink: 7abbf13b
---





小知识点

<!-- more -->

> 1.插值语法  双括号用于标签体

> 2.指令语法  用于标签属性   标签里属性用变量赋值不能直接用双括号，必须使用:前置,      这样子的双引号内的内容就被当成表达式

```vue
<a v-bind:href="url"/>   //简写等同于 <a :href="url"/> 
```

> v-bind:xx 单向数据绑定  ；v-model:value 双向数据绑定，只能用在表单类标签 ,可以简写成v-model,因为默认收集的就是value值

```vue
<input type="text" v-model:value="name"/>   //简写等同于  <input type="text" v-model="name"/>  
```

> [Vue .sync修饰符与this.$emit(update:xxx) ](https://www.cnblogs.com/wangyingblock/p/15398456.html)





Keep Moving Forward
