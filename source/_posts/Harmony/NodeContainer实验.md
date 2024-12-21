---
title: NodeContainer实验
categories:
  - Harmony
tags:
  - NodeContainer
abbrlink: 8a8b27b8
---

[如何实现组件动态上下树](https://developer.huawei.com/consumer/cn/doc/harmonyos-faqs-V5/faqs-arkui-364-V5)

[Web组件在不同的窗口间迁移](https://developer.huawei.com/consumer/cn/doc/harmonyos-guides-V13/web-component-migrate-V13)



<!-- more -->

## 是否支持多个NodeContainer绑定一个NodeController

**不会崩溃报错,但可能会又隐藏问题**

**FrameNode会挂载在后渲染的NodeContainer上**



## 组件在不同窗口迁移

```typescript
import { NodeController, BuilderNode, FrameNode, UIContext } from '@kit.ArkUI';

declare class Params {
  text: string
}

@Builder
function buttonBuilder(params: Params) {
  Flex({ direction: FlexDirection.Column, alignItems: ItemAlign.Center, justifyContent: FlexAlign.SpaceEvenly }) {
    Text(params.text)
      .fontSize(12)
    Button(`This is a Button`, { type: ButtonType.Normal, stateEffect: true })
      .fontSize(12)
      .borderRadius(8)
      .backgroundColor(0x317aff)
  }
  .height(100)
  .width(200)
}

class MyNodeController extends NodeController {
  private node:BuilderNode<[Params]>|null=null
  private id:number
  constructor(id:number) {
    super();
    this.id=id;
  }

  makeNode(uiContext: UIContext): FrameNode | null {
    return this.node?.getFrameNode()||null;
  }

  updateNode(node:BuilderNode<[Params]>|null){
    this.node=node;
  }
}

class NodeManager{
  rootNode: BuilderNode<[Params]> | null = null;
  private currentNodeController:MyNodeController|null=null

  attach(uiContext:UIContext,nodeController:MyNodeController){
    if(nodeController==this.currentNodeController){
      return
    }
    this.detach()
    if (this.rootNode === null) {
      this.rootNode = new BuilderNode(uiContext);
      this.rootNode.build(wrapBuilder(buttonBuilder), { text: "This is a Text" })
    }
    nodeController.updateNode(this.rootNode);
    nodeController.rebuild();
    this.currentNodeController =nodeController;
  }
  detach(){
    this.currentNodeController?.updateNode(null);
    this.currentNodeController?.rebuild();
    this.currentNodeController=null
  }

}



@Entry
@Component
struct Index {
  private nodeManager = new NodeManager()
  private controller1: MyNodeController = new MyNodeController(1)
  private controller2: MyNodeController = new MyNodeController(2)

  rootNode: BuilderNode<[Params]> | null = null;
  private wrapBuilder: WrappedBuilder<[Params]> = wrapBuilder(buttonBuilder);

  aboutToAppear(): void {
    if (this.rootNode === null) {
      this.rootNode = new BuilderNode(this.getUIContext());
      this.rootNode.build(this.wrapBuilder, { text: "This is a Text" })
    }
  }

  build() {
    Flex({ direction: FlexDirection.Column, alignItems: ItemAlign.Start, justifyContent: FlexAlign.SpaceEvenly }) {
      NodeContainer(this.controller1)
        .onClick(() => {
          console.log("click event");
        })
      NodeContainer(this.controller2)
        .onClick(() => {
          console.log("click event");
        }).margin({top:50,bottom:50})
      Button("change to 1")
        .onClick(()=>{
          this.nodeManager.attach(this.getUIContext(),this.controller1);
        })
      Button("change to 2")
        .onClick(()=>{
          this.nodeManager.attach(this.getUIContext(),this.controller2);
        })
    }
    .height('100%')
    .width('100%')
  }
}
```







Keep Moving Forward
