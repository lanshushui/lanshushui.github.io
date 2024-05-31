---
title: Swiper踩坑
categories:
  - Harmony
tags:
  - 崩溃
abbrlink: df89432a
---

## 崩溃场景

**API12**  使用Swiper时，LazyForEach数据源只有两个时，出现崩溃问题

```typescript
 Swiper(this.swiperController) {
        LazyForEach(this.source, (item: material) => {
          Image(item.materialUrl)
            .width("100%")
            .height("100%")
            .borderRadius(6)
            .objectFit(ImageFit.Fill)
            .margin({ right: 16 })
            .onClick(() => {

            })
            .onAppear(() => {

            })

        }, (item: material, index: number) => item.materialId + item.materialUrl + index)
      }
      .nextMargin(50)
      .loop(true)
```

产生**cppcrash**错误

```
LastFatalMessage:[default] CheckThread:179 Fatal: ecma_vm cannot run in multi-thread! thread:56712 currentThread:56718
Fault thread info:
Tid:56718, Name:IPC_3_56718
#00 pc 000000000018bc34 /system/lib/ld-musl-aarch64.so.1(raise+188)(dff3f628ef1cb60aabb8cc2d2e61e14f)
#01 pc 000000000013bc94 /system/lib/ld-musl-aarch64.so.1(abort+20)(dff3f628ef1cb60aabb8cc2d2e61e14f)
#02 pc 000000000022d308 /system/lib64/platformsdk/libark_jsruntime.so(panda::ecmascript::EcmaVM::CheckThread() const+640)(2703d118189f95d1fb2d3432ed2e1047)
#03 pc 00000000003d300c /system/lib64/platformsdk/libark_jsruntime.so(panda::ecmascript::JSThread::DoStackLimitCheck()+108)(2703d118189f95d1fb2d3432ed2e1047)
#04 pc 00000000002aa128 /system/lib64/platformsdk/libark_jsruntime.so(panda::ecmascript::EcmaInterpreter::Execute(panda::ecmascript::EcmaRuntimeCallInfo*)+44)(2703d118189f95d1fb2d3432ed2e1047)
#05 pc 0000000000469614 /system/lib64/platformsdk/libark_jsruntime.so(panda::FunctionRef::Call(panda::ecmascript::EcmaVM const*, panda::Local, panda::Local const*, int)+1028)(2703d118189f95d1fb2d3432ed2e1047)
#06 pc 0000000002036ebc /system/lib64/platformsdk/libace_compatible.z.so(OHOS::Ace::Framework::JsiFunction::Call(OHOS::Ace::Framework::JsiRef, int, OHOS::Ace::Framework::JsiRef*) const+192)(2d4db53d434edf487ecf2f7927f07ec5)
#07 pc 0000000001d18774 /system/lib64/platformsdk/libace_compatible.z.so(OHOS::Ace::Framework::JSLazyForEachBuilder::OnGetTotalCount()+332)(2d4db53d434edf487ecf2f7927f07ec5)
#08 pc 0000000000fa25dc /system/lib64/platformsdk/libace_compatible.z.so(OHOS::Ace::NG::FrameProxy::Build()+220)(2d4db53d434edf487ecf2f7927f07ec5)
#09 pc 0000000000f9c6f0 /system/lib64/platformsdk/libace_compatible.z.so(OHOS::Ace::NG::FrameProxy::GetFrameNodeByIndex(unsigned int, bool)+128)(2d4db53d434edf487ecf2f7927f07ec5)
#10 pc 0000000000f9c628 /system/lib64/platformsdk/libace_compatible.z.so(OHOS::Ace::NG::FrameNode::GetOrCreateChildByIndex(unsigned int, bool)+40)(2d4db53d434edf487ecf2f7927f07ec5)
#11 pc 00000000015c4da0 /system/lib64/platformsdk/libace_compatible.z.so(OHOS::Ace::NG::SwiperPattern::UpdateCaptureSource(std::__h::shared_ptr, int, int)+212)(2d4db53d434edf487ecf2f7927f07ec5)
#12 pc 00000000015e5124 /system/lib64/platformsdk/libace_compatible.z.so(std::__h::__function::__func, void (std::__h::shared_ptr)>::operator()(std::__h::shared_ptr&&) (.7f942ca2a7203f34493c004262d05158)+148)(2d4db53d434edf487ecf2f7927f07ec5)
#13 pc 000000000097d548 /system/lib64/platformsdk/libace_compatible.z.so(OHOS::Ace::NG::(anonymous namespace)::NormalCaptureCallback::OnSurfaceCapture(std::__h::shared_ptr)+96)(2d4db53d434edf487ecf2f7927f07ec5)
#14 pc 00000000001d86cc /system/lib64/librender_service_base.z.so(OHOS::Rosen::RSRenderServiceClient::TriggerSurfaceCaptureCallback(unsigned long, OHOS::Media::PixelMap*)+624)(7c4044516e61d05c580e81308171fc27)
#15 pc 00000000001ec7cc /system/lib64/librender_service_base.z.so(OHOS::Rosen::RSSurfaceCaptureCallbackStub::OnRemoteRequest(unsigned int, OHOS::MessageParcel&, OHOS::MessageParcel&, OHOS::MessageOption&)+292)(7c4044516e61d05c580e81308171fc27)
#16 pc 0000000000033bc4 /system/lib64/platformsdk/libipc_core.z.so(OHOS::IPCObjectStub::SendRequest(unsigned int, OHOS::MessageParcel&, OHOS::MessageParcel&, OHOS::MessageOption&)+1820)(20be1d35a25563c9f63e5fc74056f22d)
#17 pc 0000000000056128 /system/lib64/platformsdk/libipc_core.z.so(OHOS::BinderInvoker::OnTransaction(unsigned char const*)+1220)(20be1d35a25563c9f63e5fc74056f22d)
#18 pc 00000000000567fc /system/lib64/platformsdk/libipc_core.z.so(OHOS::BinderInvoker::HandleCommandsInner(unsigned int)+368)(20be1d35a25563c9f63e5fc74056f22d)
#19 pc 0000000000055240 /system/lib64/platformsdk/libipc_core.z.so(OHOS::BinderInvoker::HandleCommands(unsigned int)+60)(20be1d35a25563c9f63e5fc74056f22d)
#20 pc 000000000005506c /system/lib64/platformsdk/libipc_core.z.so(OHOS::BinderInvoker::StartWorkLoop()+120)(20be1d35a25563c9f63e5fc74056f22d)
#21 pc 000000000005693c /system/lib64/platformsdk/libipc_core.z.so(OHOS::BinderInvoker::JoinThread(bool)+92)(20be1d35a25563c9f63e5fc74056f22d)
#22 pc 00000000000439a4 /system/lib64/platformsdk/libipc_core.z.so(OHOS::IPCWorkThread::ThreadHandler(void*)+624)(20be1d35a25563c9f63e5fc74056f22d)
#23 pc 00000000001adcc8 /system/lib/ld-musl-aarch64.so.1(start+236)(dff3f628ef1cb60aabb8cc2d2e61e14f)
#24 pc 00000000000a0508 /system/lib/ld-musl-aarch64.so.1(dff3f628ef1cb60aabb8cc2d2e61e14f)
```

## 问题代码定位

从崩溃日志可以看到是因为Swper和lazyForEach引发的崩溃

最终定位到 调用了Swiper的nextMargin方法和loop方法导致的，**两个方法删除其中之一就正常展示了**

nextMargin方法是为了ui效果，能在Swiper一页中展示下一页的一部分，即可以展示1.3个视图。

loop方法是为了无限循环滑动



## 问题修复

- 初步猜测是因为Swiper要在一页展示1.2个视图，LazyForEach会根据key复用视图，因为数据源只有两个，在页面，还没有被回收的视图也被Swiper复用导致崩溃

测试失败：lazyForEach每次都返回独一无二的key，让item的复用失效，结果还是会导致崩溃

- API12文档： [在LazyForEach懒循环加载模式下，加载的组件数量建议大于5个](https://developer.huawei.com/consumer/cn/doc/harmonyos-references-V5/ts-container-swiper-V5#ZH-CN_TOPIC_0000001847209868__loop)。

测试成功，原因未知



**总结：Swiper+LazyForEach的场景下，如果同时调用了nextMargin方法和loop方法，确保数据源大于5个**



Keep Moving Forward
