---
title: NodeContainer更新方式
categories:
  - Harmony
tags:
  - NodeContainer
abbrlink: 92fbcac0
---

## 更新场景举例



#### 场景1：string变量属性 和 string变量的数组

> 方式1：子组件用@Prop，可以感应到@Observed类的string属性变化，但感应不到数组属性的增加，和数组子项内容的变化
>
> 方式2：子组件用@ObjectLink，可以感应到@Observed类的属性变化和嵌套属性数组的增加，但感应不到数组子项内容的变化
>
> 方式3：使用@Prop+ updateConfiguration 方法更新，可以感应到@Observed类的string属性变化，但感应不到数组属性的增加，和数组子项内容的变化
>
> 方式4：使用@ObjectLink+ updateConfiguration 方法更新，可以感应到@Observed类的属性变化和嵌套属性数组的增加，但感应不到数组子项内容的变化
>
> 方式5：不使用装饰器+ updateConfiguration 方法更新，可以感应到@Observed类的属性变化和嵌套属性数组的增加，但感应不到数组子项内容的变化
>
> 
>
> 方式6：使用@Prop+ update 方法更新原对象，可以感应到@Observed类的属性变化，但感应不到和嵌套属性数组的增加和数组子项内容的变化
>
> 方式7：使用@ObjectLink+ update 方法更新原对象，可以感应到@Observed类的属性变化和嵌套属性数组的增加，但感应不到数组子项内容的变化
>
> 方式8：不使用装饰器+ update 方法更新原对象，无法感知到任何变化
>
> 
>
> 方式9：使用@Prop+ update 方法更新新对象，可以感应到@Observed类的属性变化和嵌套属性数组的增加，但感应不到数组子项内容的变化
>
> 方式10：使用@ObjectLink+ update 方法更新新对象，可以感应到@Observed类的属性变化和嵌套属性数组的增加，但感应不到数组子项内容的变化
>
> 方式11：不使用装饰器+ update 方法更新新对象，无法感知到任何变化



```typescript
import { BuilderNode, FrameNode, NodeController, UIContext } from '@kit.ArkUI'

@Entry
@Component
struct Index {
  controller=new MyNodeController()
  build() {
    Stack(){
      NodeContainer(this.controller)
        .width('100%')
        .height('100%')
    }
  }
}

@Observed
class Params {
  text: string = 'Hello World';
  addAar:string[]=[]
  replaceAAr:string[]=["replaceAAr"]
  constructor(text: string) {
    this.text = text;
  }
}

class MyNodeController extends NodeController{
  private textNode: BuilderNode<[Params]> | null = null;
  private params = new Params("1")
  makeNode(context: UIContext): FrameNode | null {
    this.textNode = new BuilderNode(context);
    this.textNode.build(wrapBuilder<[Params]>(buildText), this.params);
    return this.textNode.getFrameNode();
  }

  constructor() {
    super()
    setTimeout(()=>{
      // this.params.text="2"
      // this.params.addAar.push("addArr")
      // this.params.replaceAAr[0]="replaceAArUpdate"
      // this.textNode?.update(this.params)
      const newP =new Params("2")
      newP.addAar.push("addArr")
      newP.replaceAAr[0]="replaceAArUpdate"
      this.textNode?.update(newP)
    },2000)
  }
}

@Builder
function buildText(params: Params) {
  Child({ params: params})
}

@Component
struct  Child{
  @ObjectLink
  params: Params

  build() {
    Column() {
      Text(this.params.text)
        .fontSize(50)
        .fontWeight(FontWeight.Bold)
        .margin({bottom: 36})
        .fontColor("#000000")
      ForEach(this.params.addAar,(item:string,index:number)=>{
        Text(item)
          .fontSize(50)
          .fontWeight(FontWeight.Bold)
          .margin({bottom: 36})
          .fontColor("#000000")
      })
      ForEach(this.params.replaceAAr,(item:string,index:number)=>{
        Text(item)
          .fontSize(50)
          .fontWeight(FontWeight.Bold)
          .margin({bottom: 36})
          .fontColor("#000000")
      },(item:string,index:number)=>{
        return index+""
      })
    }
  }
}
```



#### 场景2：自定义对象属性 和 自定义对象的数组

> 方式1：子组件用@Prop，无法感知到任何变化
>
> 方式2：子组件用@ObjectLink，无法感知到任何变化
>
> 方式3：使用@Prop+ updateConfiguration 方法更新，无法感知到任何变化
>
> 方式4：使用@ObjectLink+ updateConfiguration 方法更新，可以感应到@Observed类的属性变化和嵌套属性数组的增加和 数组子项内容的变化  **最完美的一次**
>
> 方式5：不使用装饰器+ updateConfiguration 方法更新，可以感应到@Observed类的属性变化和嵌套属性数组的增加和 数组子项内容的变化  **最完美的一次**
>
> 
>
> 方式6：使用@Prop+ update 方法更新原对象，无法感知到任何变化
>
> 方式7：使用@ObjectLink+ update 方法更新原对象，无法感应到@Observed类的属性变化和嵌套属性数组的增加
>
> foreach子组件内置则无法感应到数组子项内容的变化（将foreach子组件抽成一个带ObjectLink的组件 则可以感应到数组子项内容的变化）
>
> 方式8：不使用装饰器+ update 方法更新原对象，无法感应到@Observed类的属性变化和嵌套属性数组的增加
>
> foreach子组件内置则无法感应到数组子项内容的变化（将foreach子组件抽成一个带ObjectLink的组件 则可以感应到数组子项内容的变化）
>
> 
>
> 方式9：使用@Prop+ update 方法更新新对象，可以感应到@Observed类的属性变化和嵌套属性数组的增加，但感应不到数组子项内容的变化（将foreach子组件抽成一个带ObjectLink的组件 也是一样的效果）
>
> 方式10：使用@ObjectLink+ update 方法更新新对象，可以感应到@Observed类的属性变化和嵌套属性数组的增加，但感应不到数组子项内容的变化（将foreach子项抽成一个带ObjectLink的组件 也是一样的效果）
>
> 方式11：不使用装饰器+ update 方法更新新对象，无法感知到任何变化

```typescript
import { BuilderNode, FrameNode, NodeController, UIContext } from '@kit.ArkUI'

@Entry
@Component
struct Index {
  controller=new MyNodeController()
  build() {
    Stack(){
      NodeContainer(this.controller)
        .width('100%')
        .height('100%')
    }
  }
}

@Observed
class Params {
  text: StringWrap = new StringWrap("1");
  addAar:StringWrap[]=[]
  replaceAAr:StringWrap[]=[new StringWrap("replaceAAr")]
}

@Observed
class StringWrap{
  text: string = 'Hello World';

  constructor(text:string) {
    this.text =text
  }
}

class MyNodeController extends NodeController{
  private textNode: BuilderNode<[Params]> | null = null;
  private params = new Params()
  makeNode(context: UIContext): FrameNode | null {
    this.textNode = new BuilderNode(context);
    this.textNode.build(wrapBuilder<[Params]>(buildText), this.params);
    return this.textNode.getFrameNode();
  }

  constructor() {
    super()
    setTimeout(()=>{
      // this.params.text.text="2"
      // this.params.addAar.push(new StringWrap("addArr"))
      // this.params.replaceAAr[0].text="replaceAArUpdate"
      // this.textNode?.update(this.params)
      const newP =new Params()
      newP.text.text="2"
      newP.addAar.push(new StringWrap("addArr"))
      newP.replaceAAr[0].text="replaceAArUpdate"
      this.textNode?.update(newP)
    },2000)
  }
}

@Builder
function buildText(params: Params) {
  Child({ params: params})
}

@Component
struct  Child{
  @ObjectLink
  params: Params

  build() {
    Column() {
      Text(this.params.text.text)
        .fontSize(50)
        .fontWeight(FontWeight.Bold)
        .margin({bottom: 36})
        .fontColor("#000000")
      ForEach(this.params.addAar,(item:StringWrap,index:number)=>{
        Text(item.text)
          .fontSize(50)
          .fontWeight(FontWeight.Bold)
          .margin({bottom: 36})
          .fontColor("#000000")
      })
      ForEach(this.params.replaceAAr,(item:StringWrap,index:number)=>{
        Text(item.text)
          .fontSize(50)
          .fontWeight(FontWeight.Bold)
          .margin({bottom: 36})
          .fontColor("#000000")
      },(item:string,index:number)=>{
        return index+""
      })
      ForEach(this.params.replaceAAr,(item:StringWrap,index:number)=>{
        Child2({item:item})
      },(item:string,index:number)=>{
        return index+""
      })
    }
  }
}

@Component
struct  Child2{
  @ObjectLink
  item:StringWrap
  build() {
    Text(this.item.text)
      .fontSize(50)
      .fontWeight(FontWeight.Bold)
      .margin({bottom: 36})
      .fontColor("#000000")
  }
}
```



Keep Moving Forward
