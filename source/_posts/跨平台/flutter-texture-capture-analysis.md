---
title: Flutter Texture截图原理&PixelCopy失败原理
categories:
  - 跨平台
tags:
  - 知识点
top: 100
abbrlink: b773d7c
---

# Flutter External Texture 与 PixelCopy：为什么 PixelCopy 截不到，RepaintBoundary.toImage() 能截到

---

## 一、Android PixelCopy 工作原理

### 1.1 API 签名

```java
PixelCopy.request(Surface source, Bitmap dest, OnPixelCopyFinishedListener listener, Handler handler)
```

### 1.2 底层机制

`PixelCopy` 不是简单地从 Surface "读像素"。它的调用链：

```
PixelCopy.request(surface, bitmap, ...)
  → ThreadedRenderer.copySurfaceInto(surface, ...)      // frameworks/base
    → nCopySurfaceInto(surface, srcRect, bitmap)         // JNI
      → RenderProxy::copySurfaceInto(ANativeWindow, ...)
        → 向 hwui RenderThread 投递 CopySurfaceInto 任务
          → SurfaceFlinger 从该 Surface 的 BufferQueue consumer 端
             读取最近一帧**已合成**的 buffer
          → 拷贝像素到目标 Bitmap
```

**关键前提**：PixelCopy 需要从 Surface 背后的 **BufferQueue** 中读取 buffer。这要求：

1. Surface 背后有一个 BufferQueue
2. BufferQueue 的 **consumer 端**有**未被消费的 buffer**（即 SurfaceFlinger 能读到的帧）
3. Buffer 格式可被 CPU/GPU 读取

如果 BufferQueue 为空（所有 buffer 已被 consumer acquire 走），PixelCopy 返回 **`ERROR_SOURCE_NO_DATA (3)`**。

### 1.3 PixelCopy 的正常使用场景

PixelCopy 设计用于截取 **SurfaceView / Window** 这类由 **SurfaceFlinger 作为 consumer** 的 Surface：

```
App 渲染 ──push──→ Surface (BufferQueue) ──→ SurfaceFlinger (consumer)
                                                    │
                                              PixelCopy 从这里读 ✅
```

SurfaceFlinger 不会 "acquire 走" buffer，它只是 latch + 合成，buffer 留在队列中可被 PixelCopy 读。

---

## 二、Flutter External Texture 架构

### 2.1 SurfaceProducer：外部渲染内容进入 Flutter 的入口

Flutter 通过 `TextureRegistry.createSurfaceProducer()` 创建一个 `SurfaceProducer`，外部渲染器（如 Camera、MediaPlayer、自定义 GL 渲染器）把内容画到 `producer.getSurface()` 返回的 Surface 上。

Flutter engine 有两种 SurfaceProducer 实现：

| 实现 | Surface 来源 | Consumer |
|------|-------------|----------|
| `SurfaceTextureSurfaceProducer` | `new Surface(SurfaceTexture)` | SurfaceTexture |
| `ImageReaderSurfaceProducer` | `ImageReader.getSurface()` | ImageReader |

### 2.2 ImageReaderSurfaceProducer（API 29+，当前主流）

源码位置：`FlutterRenderer.java` 内部类

```java
// FlutterRenderer.java
final class ImageReaderSurfaceProducer implements TextureRegistry.SurfaceProducer {

    @Override
    public Surface getSurface() {
        PerImageReader pir = getActiveReader();
        return pir.reader.getSurface();  // ← ImageReader 的 producer 端 Surface
    }

    private ImageReader createImageReader33() {
        final ImageReader.Builder builder = new ImageReader.Builder(width, height);
        builder.setMaxImages(MAX_IMAGES);
        builder.setImageFormat(ImageFormat.PRIVATE);              // GPU 专用格式
        builder.setUsage(HardwareBuffer.USAGE_GPU_SAMPLED_IMAGE); // 仅 GPU 采样
        return builder.build();
    }
}
```

架构图：

```
外部渲染器 ──push buffer──→ ImageReader.Surface (BufferQueue)
                                    │
                                    │  consumer = ImageReader
                                    │
                                    ▼
                            acquireLatestImage()
                                    │
                                    ▼
                            Image → HardwareBuffer → GPU 纹理 → DlImage
                                    │
                                    ▼
                            Flutter raster thread 合成到屏幕
```

### 2.3 SurfaceTextureSurfaceProducer

源码位置：`SurfaceTextureSurfaceProducer.java`

```java
// SurfaceTextureSurfaceProducer.java
@Override
public Surface getSurface() {
    if (surface == null || !surface.isValid()) {
        surface = new Surface(surfaceTexture);  // ← 包装 SurfaceTexture
    }
    return surface;
}
```

架构图：

```
外部渲染器 ──push buffer──→ Surface(SurfaceTexture) (BufferQueue)
                                    │
                                    │  consumer = SurfaceTexture
                                    │
                                    ▼
                            updateTexImage() → GL_TEXTURE_EXTERNAL_OES
                                    │
                                    ▼
                            Flutter raster thread sample 到屏幕
```

---

## 三、为什么 PixelCopy 在 Flutter Texture 的 Surface 上失败

### 3.1 ImageReader 模式

```
外部渲染 ──push──→ ImageReader.Surface (BufferQueue)
                        │
                        ├── Consumer = ImageReader
                        │   Flutter engine 每帧调 acquireLatestImage()
                        │   → buffer 被 acquire 走，队列清空
                        │
                        └── PixelCopy.request(surface, bitmap)
                                ↓
                            尝试从 BufferQueue consumer 端读
                                ↓
                            队列空 → ERROR_SOURCE_NO_DATA (3) ❌
```

**ImageReader 是排他性 consumer**——`acquireLatestImage()` 会 acquire 并 close 所有旧帧，只保留最新一帧的引用。Flutter engine 在 raster thread 每帧都调用它，buffer 被立即消费。PixelCopy 来读时队列永远是空的。

而且 `ImageFormat.PRIVATE` + `USAGE_GPU_SAMPLED_IMAGE` 意味着 buffer 仅供 GPU 纹理采样，即使队列不空，PixelCopy 也不一定能读。

### 3.2 SurfaceTexture 模式

```
外部渲染 ──push──→ Surface(SurfaceTexture) (BufferQueue)
                        │
                        ├── Consumer = SurfaceTexture
                        │   updateTexImage() acquire 走 buffer，绑到 GL 纹理
                        │
                        └── PixelCopy.request(surface, bitmap)
                                ↓
                            BufferQueue 空 → ERROR_SOURCE_NO_DATA (3) ❌
```

同理，`SurfaceTexture.updateTexImage()` 也是排他性消费。

### 3.3 与 SurfaceView 的本质区别

```
                          SurfaceView                    Flutter Texture
                    ┌──────────────────┐           ┌──────────────────────┐
BufferQueue         │                  │           │                      │
consumer：          │  SurfaceFlinger   │           │  ImageReader /       │
                    │  (不 acquire，    │           │  SurfaceTexture      │
                    │   只 latch+合成)  │           │  (acquire 走 buffer) │
                    └──────────────────┘           └──────────────────────┘
                           │                                 │
PixelCopy 能读？           ✅                                ❌
```

SurfaceFlinger 对 SurfaceView 的 buffer 只做 latch（锁存用于合成），**不 acquire**，buffer 留在队列中。而 ImageReader / SurfaceTexture 作为 consumer 会**真正 acquire 走** buffer，导致队列清空。

**结论：PixelCopy 对 Flutter `SurfaceProducer.getSurface()` 返回的 Surface 永远失败，这是架构性限制，与时序无关，等多久都没用。**

---

## 四、RepaintBoundary.toImage() 如何绕过这个限制

### 4.1 Dart 侧调用链

```dart
RenderRepaintBoundary.toImage(pixelRatio: dpr)
  → OffsetLayer.toImage(bounds, pixelRatio)        // layer.dart
    → scene = _createSceneForImage(bounds)          // 重建 Layer subtree
      → TextureLayer.addToScene(builder)            // builder.addTexture(textureId)
    → scene.toImage(width, height)                  // 进入 engine C++
```

`Scene.toImage` 让 engine 在 raster thread 上做一次**离屏渲染**——跟正常屏幕合成走**完全相同的 raster pipeline**。

### 4.2 Engine C++ 侧：TextureLayer::Paint

```cpp
// texture_layer.cc L48-67
void TextureLayer::Paint(PaintContext& context) const {
    // 从 texture registry 拿到 external texture 实例
    std::shared_ptr<Texture> texture =
        context.texture_registry
            ? context.texture_registry->GetTexture(texture_id_)
            : nullptr;
    if (!texture) { return; }

    // 构造 PaintContext，canvas 是离屏 surface 的 canvas
    Texture::PaintContext ctx{
        .canvas = context.canvas,      // ← 离屏 canvas
        .gr_context = context.gr_context,
        .aiks_context = context.aiks_context,
        .paint = context.state_stack.fill(paint),
    };
    texture->Paint(ctx, paint_bounds(), freeze_, sampling_);
}
```

`TextureLayer::Paint` 拿到的 `texture` 就是 `ImageExternalTexture`（或 `SurfaceTextureExternalTexture`），然后调用它的 `Paint` 方法。

### 4.3 ImageExternalTexture::Paint——直接从 ImageReader 拿帧

```cpp
// image_external_texture.cc L29-53
void ImageExternalTexture::Paint(PaintContext& context,
                                 const DlRect& bounds,
                                 bool freeze,
                                 const DlImageSampling sampling) {
    if (state_ == AttachmentState::kDetached) { return; }

    Attach(context);

    if (!freeze) {
        ProcessFrame(context, bounds);    // ← 关键：从 ImageReader 获取最新帧
    }

    if (dl_image_) {
        context.canvas->DrawImageRect(    // ← 画到 canvas（离屏 surface）
            dl_image_,
            DlRect::Make(dl_image_->GetBounds()),
            bounds, sampling, context.paint,
            flutter::DlSrcRectConstraint::kStrict
        );
    } else {
        FML_LOG(INFO) << "No DlImage available for ImageExternalTexture to paint.";
    }
}
```

`ProcessFrame`（子类实现）的核心逻辑：

```
ProcessFrame:
  1. AcquireLatestImage()           // 从 ImageReader acquire 最新 Image
  2. Image → HardwareBuffer         // 取出底层硬件 buffer
  3. HardwareBuffer → AHardwareBuffer
  4. AHardwareBuffer → GPU 纹理     // 绑为 EGLImage (GL) 或 VkImage (Vulkan)
  5. 包装成 DlImage → dl_image_     // 供 DrawImageRect 使用
```

### 4.4 为什么这条路能拿到帧

```
外部渲染 ──push──→ ImageReader.Surface (BufferQueue)
                        │
                        │  Scene.toImage 触发 raster pipeline
                        │
                        ▼
                  TextureLayer::Paint
                        ↓
                  ImageExternalTexture::Paint
                        ↓
                  ProcessFrame → AcquireLatestImage()   ← 主动从 ImageReader 拿
                        ↓
                  Image → HardwareBuffer → GPU 纹理 → DlImage
                        ↓
                  DrawImageRect 到离屏 canvas            ← 画上去了 ✅
                        ↓
                  离屏 canvas → 生成 Image → PNG bytes
```

**`Scene.toImage` 走的是 Flutter engine 自己的 raster pipeline，不经过 SurfaceFlinger**。`ImageExternalTexture::Paint` 直接调用 `AcquireLatestImage()` 从 ImageReader **主动 pull** 最新帧——跟正常屏幕合成走完全相同的代码路径。

---

## 五、SurfaceTextureExternalTexture 的 Paint 路径（对照）

```cpp
// surface_texture_external_texture.cc L38-62
void SurfaceTextureExternalTexture::Paint(PaintContext& context,
                                          const DlRect& bounds,
                                          bool freeze,
                                          const DlImageSampling sampling) {
    if (state_ == AttachmentState::kDetached) { return; }

    const bool should_process_frame = !freeze || ShouldUpdate() || dl_image_ == nullptr;
    if (should_process_frame) {
        ProcessFrame(context, bounds);
        // ProcessFrame 内部:
        //   SurfaceTexture.updateTexImage()   → acquire 最新帧到 GL 纹理
        //   SurfaceTexture.getTransformMatrix → 获取 UV 变换矩阵
        //   绑定为 DlImage
    }

    if (!dl_image_) { return; }
    DrawFrame(context, bounds, sampling);  // DrawImage / DrawRect with shader
}
```

同理，`SurfaceTextureExternalTexture` 也是在 `Paint` 时主动 `updateTexImage()` 消费帧。`Scene.toImage` 能触发同样的路径。

---

## 六、时序陷阱：首帧截图全白

`RepaintBoundary.toImage()` 虽然走对了路径，但有一个时序问题：

如果截图发生在外部渲染器**还没 push 任何帧**到 ImageReader 时，`AcquireLatestImage()` 返回 null → `dl_image_` 为 null → engine 打印 `"No DlImage available"` → 截图结果**全白**。

engine 日志：
```
[INFO:flutter/shell/platform/android/image_external_texture.cc(51)]
No DlImage available for ImageExternalTexture to paint.
```

**解决**：截图前等待外部渲染器至少出一帧（实测 200ms 足够覆盖首帧渲染 + ImageReader 入队的端到端延迟）。

---

## 七、RepaintBoundary + Texture 截图模板代码

### 7.1 Widget 层：用 RepaintBoundary 包住 Texture

```dart
import 'dart:typed_data';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';

class TextureCaptureWidget extends StatefulWidget {
  final int textureId;
  final double width;
  final double height;

  const TextureCaptureWidget({
    super.key,
    required this.textureId,
    required this.width,
    required this.height,
  });

  @override
  State<TextureCaptureWidget> createState() => TextureCaptureWidgetState();
}

class TextureCaptureWidgetState extends State<TextureCaptureWidget> {
  final GlobalKey _boundaryKey = GlobalKey();

  /// 截取 Texture 当前像素，编码为 PNG 字节。
  /// 失败返回 null。
  Future<Uint8List?> capture() async {
    try {
      final ctx = _boundaryKey.currentContext;
      if (ctx == null) return null;

      final ro = ctx.findRenderObject();
      if (ro is! RenderRepaintBoundary) return null;

      // pixelRatio 用设备 dpr，保证截图是物理像素分辨率
      final dpr = MediaQuery.of(ctx).devicePixelRatio;
      final image = await ro.toImage(pixelRatio: dpr);
      try {
        final byteData = await image.toByteData(format: ui.ImageByteFormat.png);
        return byteData?.buffer.asUint8List();
      } finally {
        image.dispose();
      }
    } catch (e) {
      debugPrint('capture failed: $e');
      return null;
    }
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: widget.width,
      height: widget.height,
      child: RepaintBoundary(
        key: _boundaryKey,         // ← 截图时通过这个 key 找到 RenderObject
        child: Texture(
          textureId: widget.textureId,
        ),
      ),
    );
  }
}
```

### 7.2 调用截图

```dart
// 持有 State 引用（通过 GlobalKey<TextureCaptureWidgetState> 或直接引用）
final stateKey = GlobalKey<TextureCaptureWidgetState>();

// 构建时：
TextureCaptureWidget(
  key: stateKey,
  textureId: myTextureId,
  width: 300,
  height: 200,
)

// 截图时：
final png = await stateKey.currentState?.capture();
if (png != null) {
  // png 就是 PNG 编码的 Uint8List，可以保存/上传/回传 native
}
```

### 7.3 通过 MethodChannel 让 Native 触发截图

如果需要从 Native（Kotlin/Swift）侧主动触发截图，典型做法：

**Dart 侧**——注册 handler：

```dart
const channel = MethodChannel('my_texture_channel');

channel.setMethodCallHandler((call) async {
  switch (call.method) {
    case 'capture':
      final bytes = await stateKey.currentState?.capture();
      if (bytes == null) {
        throw PlatformException(code: 'FAILED', message: 'capture returned null');
        // 注意：handler 返回 null 会被 Android 端当作 notImplemented，
        // 所以失败要抛 PlatformException 而不是 return null。
      }
      return bytes;  // Uint8List 会被序列化为 byte[] 回到 Kotlin
  }
  return null;
});
```

**Kotlin 侧**——发起调用：

```kotlin
channel.invokeMethod("capture", null, object : MethodChannel.Result {
    override fun success(result: Any?) {
        val png = result as? ByteArray  // Dart 的 Uint8List 到 Kotlin 是 byte[]
        // 拿到 PNG bytes
    }
    override fun error(code: String, msg: String?, details: Any?) { /* 失败 */ }
    override fun notImplemented() { /* Dart handler 没装 */ }
})
```

### 7.4 注意事项

| 事项 | 说明 |
|------|------|
| **时序** | 外部渲染器必须已经 push 过至少一帧到 Surface，否则 `AcquireLatestImage()` 返回 null，截图全白。实测等 200ms 即可 |
| **线程** | `toImage()` 是异步的，内部在 raster thread 执行；调用侧在 UI isolate `await` 即可 |
| **pixelRatio** | 用 `MediaQuery.of(context).devicePixelRatio` 保证截图是物理像素分辨率；传 1.0 则是逻辑像素分辨率 |
| **内存** | `toImage()` 返回的 `ui.Image` 持有 GPU 资源，用完必须 `dispose()` |
| **handler 返回 null** | Flutter MethodChannel 的 quirk：handler 返回 null 等同于 `notImplemented`，失败场景要抛 `PlatformException` |
| **RepaintBoundary 位置** | 只需包住 `Texture` widget 本身，不要把手势层、padding 等包进来（不影响像素，但会增大截图尺寸） |

---

## 八、总结对比

|  | PixelCopy | RepaintBoundary.toImage() |
|---|---|---|
| **读取方式** | SurfaceFlinger 从 BufferQueue consumer 端 peek | Flutter raster pipeline 主动 `acquireLatestImage()` |
| **依赖** | BufferQueue 里有**未被 acquire** 的 buffer | ImageReader 有可 acquire 的 Image |
| **对 Flutter Texture** | ❌ buffer 已被 ImageReader/SurfaceTexture acquire 走，队列永远空 | ✅ 走跟屏幕合成相同的 Paint 路径，直接从 ImageReader pull 帧 |
| **是否经过 SurfaceFlinger** | 是 | 否 |
| **失败表现** | `ERROR_SOURCE_NO_DATA (3)`，无论等多久 | 首帧未到时全白，等几帧后正常 |

**一句话总结**：PixelCopy 试图从 Surface 的 BufferQueue 读 buffer，但 Flutter engine 的 ImageReader/SurfaceTexture 作为 consumer 已经把 buffer 全部 acquire 走了；而 `RepaintBoundary.toImage()` 走的是 Flutter engine 自己的 raster pipeline，`ImageExternalTexture::Paint` 内部直接 `AcquireLatestImage()` 从 ImageReader 主动拿帧画到离屏 canvas，完全不依赖 BufferQueue 的剩余 buffer。
