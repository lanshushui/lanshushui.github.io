---
title: 鸿蒙so库加载测试
categories:
  - Harmony
tags:
  - Native
top: 90
abbrlink: 6de72e62
---

> so加载日志关键词：LoadNativeModule

<!-- more -->

## so库是如何，何时加载的？

so库是在import代码执行后就会加载，不是调用so库暴露的方法才被加载

当然代码中必须有地方使用so库暴露的函数，否则import代码会被标记为 'testNapi' is declared but its value is never read，编译包时把import这一行给删除了。

```typescript
import testNapi from 'libchange.so';
//在编译后会变成
import testNapi from "@normalized:Y&&&libchange.so&";
```

so库加载时 RegisterEntryModule  入口函数会被调用

![](https://s3.bmp.ovh/imgs/2025/05/17/57649cac7d903b59.png)



## so库加载测试

### c++定义类使用场景

#### 出现在类的方法参数中

```
//T.est文件
import lazy { MyDemo } from 'libchange.so';

export class T {
   name ="T"
  getMyDemoName(demo: MyDemo|undefined) {
    return ""
  }
}
```

> import { T } from './T';   不会导致so库加载

> const t =new T() ;  t.getMyDemoName(undefined)  不会导致so库加载



#### 出现在类的属性中

```typescript
//T.est文件
import lazy { MyDemo } from 'libchange.so';

export class T {
  name: string = "T"
  demo: MyDemo | undefined

  constructor(demo: MyDemo | undefined) {
    if (demo != undefined) {
      this.demo = demo
    }
  }
}
```

> const t =new T(undefined)  不会导致so库加载



#### 出现作为类的父类

```typescript
//T.est文件
import lazy { MyDemo } from 'libchange.so';

export const B ="BB"

export class T extends MyDemo {
  name: string = "T"
}
```

> import { B } from './T';  会导致so库的加载

> import * as T from './T'; 会导致so库的加载



#### 出现作为类的父类的父类

```typescript
//P.est文件
import lazy { T } from "./T";

export const BB="B"
export class P extends T {
  name: string = "P"
}
```

> import  { BB} from './P';  会导致so库的加载

**可以看出父类的加载是很特殊的逻辑。就算import一个文件的局部变量，也会导致该文件的所有类被加载，不管该类是否有被export，从而导致父类被加载。**

在该例子中，只是importP文件的BB变量，也导致整个文件被加载，从而导致P class被加载，从而导致T class被加载，从而导致so库被加载



#### 出现作为接口的属性

```typescript
//T.est文件
import lazy { MyDemo } from 'libchange.so';

export const B = "BB"

export interface T {
  demo: MyDemo|undefined
}
```

> import  { B} from './T';  不会导致so库的加载

> import  { T } from './T';  const t:T= { demo: undefined }   不会导致so库的加载



#### 出现作为自定义Type的其中一个属性

```typescript
//T.est文件
import lazy {  MyDemo } from 'libchange.so';

export type  B = MyDemo|string
```

> import  { B} from './T';  不会导致so库的加载



### c++定义方法使用场景

作为导出变量的一个变量

```typescript
//T.est文件
import lazy { add } from 'libchange.so';

export const B = "BB"

export interface T {
  a: (a: number, b: number) => number;
}

export const t: T = {
  a: add
}
```

> import  { B } from './T';  会导致so库的加载

在该例子中，只是import T文件的B变量，也导致整个文件被加载，导致变量t被实例化，a属性被赋值成so库的add方法





**总结： 除了作为类的父类这个比较特殊的场景，其他场景必须实例化用到了so库导出的方法和类才会加载so库**







Keep Moving Forwardt

