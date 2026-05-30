---
title: Flutter Flutter 点击事件从入门到精通
categories:
  - 跨平台
tags:
  - 知识点
top: 100
abbrlink: c899220e

---

# Flutter 点击事件从入门到精通

> 从手指按下去到回调执行，完整理解 Flutter 的事件系统。

---

## 目录

1. [整体流程](#1-整体流程)
2. [原始指针事件](#2-原始指针事件)
3. [命中测试](#3-命中测试)
4. [命中测试 → 竞技场的衔接](#4-命中测试--竞技场的衔接)
5. [手势竞技场](#5-手势竞技场)
6. [语义手势与开发实战](#6-语义手势与开发实战)
7. [常见场景与避坑](#7-常见场景与避坑)
8. [总结表](#8-总结表)

---

## 1. 整体流程

```
手指按下 → PointerDownEvent → 命中测试 → 找出被戳中的 RenderObject
  → 事件分发 → 把绑定的 GestureRecognizer 加入竞技场
  → 竞技场裁决 → 赢家触发回调 → 你的代码执行
```

**四个阶段**：
1. **原始指针事件**：引擎封装触摸数据为 PointerDownEvent
2. **命中测试**：遍历渲染树，收集被戳中的 RenderObject
3. **事件分发 + 竞技场**：遍历 hits 列表，把 RenderObject 上绑定的 GestureRecognizer 送进竞技场
4. **回调执行**：竞技场赢家触发你的 onTap/onPanUpdate 等

---

## 2. 原始指针事件

引擎从底层收到的触摸数据，封装成四种事件：

| 事件 | 触发时机 |
|---|---|
| `PointerDownEvent` | 手指按下 |
| `PointerMoveEvent` | 手指移动 |
| `PointerUpEvent` | 手指抬起 |
| `PointerCancelEvent` | 事件被取消（如来电中断） |

**关键规则**：命中测试只在 `PointerDown` 时执行一次。后续的 Move、Up 直接发给之前命中的目标。

---

## 3. 命中测试

### 3.1 原理

回答一个问题：**"手指戳在这个位置，哪些 RenderObject 被戳中了？"**

Flutter **深度优先遍历渲染树（RenderObject 树）**，坐标在边界内的 RenderObject 都加入 hits 列表：

```
HitTestResult hits = [];
遍历渲染树（从根往下，深度优先）
  ├── 对每个 RenderObject 调 hitTest()
  │    ├── 坐标在边界内 → 把该 RenderObject 加入 hits 列表
  │    └── 递归检查它的 child
  └── 遍历结束

hits 列表 = [最内层 RenderObject, 它的父, 它的祖父, ... , 根]
```

**hits 列表里存的是 RenderObject，不是 Widget。** 命中测试遍历的是渲染树（RenderObject 树），不是 Widget 树。Widget 只是配置，真正参与布局和事件的是 RenderObject。

**没有手势处理的 widget 也会参与命中测试。** 所有 RenderObject 默认都参与——只要 `hitTest()` 返回 true 就会加入列表。比如 `Container(color: Colors.red)` 虽然没有 onTap，点击它时它的 RenderObject 仍然在 hits 列表里。只是因为没有绑定 GestureRecognizer，所以不会触发任何回调。

**GestureDetector 的命中测试由它内部的 RenderObject 决定。** GestureDetector 是 StatelessWidget，它 build() 返回的是 Listener（RenderObjectWidget），Listener 产生 RenderPointerListener，这个 RenderObject 才真正参与命中测试。

**三个关键点**：
1. **只做一次（在 PointerDown 时）**。后续的 Move、Up 不重新测试
2. **事件从内到外冒泡**。最内层 widget 最先收到事件
3. **不是所有 RenderObject 都参与**——只有 `hitTest()` 返回 true 的才加入

### 3.2 手动控制命中测试

#### IgnorePointer / AbsorbPointer（最简单）

| | IgnorePointer | AbsorbPointer |
|---|---|---|
| 自己参与命中测试？ | ❌ 不参与 | ✅ 参与 |
| 事件穿透到下层？ | ✅ 穿透 | ❌ 不穿透 |
| 典型场景 | 临时禁用，下层还能响应 | 蒙层挡住下层 |

```dart
IgnorePointer(
  ignoring: true,
  child: Button(onTap: () => print('点不到我，事件穿透到下层')),
)

AbsorbPointer(
  absorbing: true,
  child: Button(onTap: () => print('点不到我，事件被吸收')),
)
```

#### behavior 属性

通过 `behavior` 控制单个 widget 的命中测试范围：

| behavior | 命中测试范围 | 阻挡下层？ |
|---|---|---|
| `deferToChild`（默认） | 只有 child 的可见区域 | ✅ 阻挡 |
| `opaque` | 整个 widget 区域 | ✅ 阻挡 |
| `translucent` | 整个 widget 区域 | ❌ 不阻挡 |

```dart
// opaque：整个区域参与命中测试，包括透明/空白部分
Listener(behavior: HitTestBehavior.opaque, onPointerDown: (_) {})
```

#### 自定义 RenderObject 的 hitTest（精确到像素级）

你可以继承 RenderProxyBox 重写 hitTest 方法，实现不规则形状的点击区域：

```dart
class CircleHit extends SingleChildRenderObjectWidget {
  const CircleHit({super.key, required super.child});

  @override
  RenderObject createRenderObject(BuildContext context) {
    return _RenderCircleHit();
  }
}

class _RenderCircleHit extends RenderProxyBox {
  @override
  bool hitTest(BoxHitTestResult result, {required Offset position}) {
    // 只有圆形区域才命中，四角不响应点击
    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.shortestSide / 2;
    if ((position - center).distance > radius) return false;
    return super.hitTest(result, position: position);
  }
}

// 使用：视觉上是圆形（ClipOval），点击区域也变成圆形
CircleHit(
  child: GestureDetector(
    onTap: () => print('只有圆形区域才能触发'),
    child: Container(width: 80, height: 80, color: Colors.blue),
  ),
)
```

你可以控制的事：
- 不调 `result.add()` → 自己不加入 hits 列表（类似 IgnorePointer）
- 不调 child 的 `hitTest()` → child 不参与命中测试（类似 AbsorbPointer）
- 只测特定形状 → 圆形、三角形等不规则命中区域

### 3.3 命中测试场景

**Stack 上层挡住下层，但下层也在 hits 列表里**

```dart
Stack(
  children: [
    GestureDetector(onTap: () => print('下层'), child: Container(200x200, green)),
    GestureDetector(onTap: () => print('上层'), child: Container(100x100, red)),
  ],
)
```

```
hits 列表 = [红色 Container 的 RenderObject, 上层 GD 的 RenderObject,
             绿色 Container 的 RenderObject, 下层 GD 的 RenderObject, Stack 的 RenderObject]

两个 GestureDetector 的 RenderObject 都在列表里！
命中测试不决定谁响应，它只管"谁被戳中了"
最终谁响应由竞技场决定
```

**behavior opaque 让透明区域也能命中**

```dart
GestureDetector(
  behavior: HitTestBehavior.opaque,  // 整个区域参与命中测试
  onTap: () => print('透明区域也能点'),
  child: Container(color: Colors.transparent),
)
```

---

## 4. 命中测试 → 竞技场的衔接

这是整个事件系统中最关键的一环：**命中测试结束之后，竞技场怎么知道要把哪些识别器加进去？**

### 4.1 完整流程

```
PointerDown
  ↓
① 命中测试（Hit Test）
   遍历渲染树，收集 hits 列表（存的是 RenderObject）
  ↓
② 事件分发（Event Dispatch）
   遍历 hits 列表，对每个 RenderObject 调 handleEvent()：
     ├── RenderPointerListener.handleEvent()
     │    → 遍历它内部的 _gestureRecognizers Map
     │    → 把每个 GestureRecognizer 加入竞技场
     │    → 同时触发 onPointerDown 回调
     │
     └── 其他 RenderObject（RenderConstrainedBox 等）的 handleEvent()
         → 空实现，什么都不做
  ↓
③ 关闭竞技场（GestureArenaManager.close）
   不再允许新识别器加入
  ↓
④ 等待事件发展 → 裁决胜负
```

**关键**：命中测试只收集 RenderObject。竞技场是在事件分发阶段、**遍历 hits 列表时**，发现某个 RenderObject 绑定了 GestureRecognizer，才把识别器加入竞技场。

### 4.2 GestureRecognizer 是怎么"绑定"到 RenderObject 的

从 GestureDetector 到你写代码时的 onTap，完整的创建和绑定链路：

```
你写：GestureDetector(onTap: () => print('点击'))
  ↓
① GestureDetector.build()
   检查你设了 onTap → 生成"配方" Map：
   { TapGestureRecognizer 类型: 工厂 }
  ↓
② RawGestureDetector(gestures: 这个Map, child: ...)
   RawGestureDetector 是 StatefulWidget
   ↓
③ RawGestureDetectorState.initState()
   遍历"配方" Map → 调用 factory() 创建 TapGestureRecognizer 实例
   创建 Listener（RenderObjectWidget）
   把 TapGestureRecognizer 传入 Listener
  ↓
④ Listener → RenderPointerListener（RenderObject）
   把 TapGestureRecognizer 存入 _gestureRecognizers Map
   插入渲染树
  ↓
⑤ 用户点击 → 命中测试 → RenderPointerListener 加入 hits 列表
  ↓
⑥ 事件分发 → RenderPointerListener.handleEvent()
   遍历 _gestureRecognizers Map
   → recognizer.addPointer(event)
   → GestureArenaManager.add(pointer, recognizer)
   → TapGestureRecognizer 进入竞技场
  ↓
⑦ 竞技场裁决 → 赢了就触发 onTap
```

**关键**：GestureRecognizer **是在 build 时创建的**（RawGestureDetectorState.initState() 阶段），不是用户点击时才创建。用户点击时只是把已存在的识别器加入竞技场。

**RenderPointerListener 内部的关键源码（简化）**：

```dart
class RenderPointerListener extends RenderProxyBoxWithHitTestBehavior {
  // 这就是绑定的关键——一个 Map 存着所有手势识别器
  // 这个 Map 在 build 阶段就被填充了
  Map<Type, GestureRecognizer>? _gestureRecognizers;

  // PointerDown 事件来时，遍历这个 Map
  @override
  void handleEvent(PointerEvent event, HitTestEntry entry) {
    if (event is PointerDownEvent) {
      // 把每个 GestureRecognizer 加入竞技场
      _gestureRecognizers?.forEach((type, recognizer) {
        recognizer.addPointer(event);
        // addPointer 内部调 GestureArenaManager.add(pointer, recognizer)
      });
    }
    // 也触发 Listener 设的回调
    onPointerDown?.call(event);
  }
}
```

### 4.3 为什么 Listener 不参与竞技场？

对比 GestureDetector 和 Listener 的源码差异：

```
GestureDetector:
  build() → RawGestureDetector（StatefulWidget）
  → RawGestureDetectorState.initState() 创建 GestureRecognizer
  → 传给 Listener → 存入 RenderPointerListener._gestureRecognizers
  → 事件分发时遍历这个 Map，把识别器加入竞技场

Listener（直接用）：
  Listener(onPointerDown: (e) {})
  → 不创建 GestureRecognizer
  → RenderPointerListener._gestureRecognizers 为空
  → 事件分发时直接触发 onPointerDown 回调
  → 不进入竞技场
```

**Listener 不参与竞技场，因为它的 RenderPointerListener 没有绑定任何 GestureRecognizer。** 它直接在 `handleEvent` 里触发回调，不经过竞技场。

---

## 5. 手势竞技场

### 5.1 为什么需要竞技场

多个识别器在同一位置监听，竞技场解决"谁才是用户真正意图"的冲突：

```dart
GestureDetector(
  onTap: () => print('点击'),
  onDoubleTap: () => print('双击'),
  onLongPress: () => print('长按'),
)
```

手指按下去时，三个识别器都不知道用户的意图——是点击？双击？还是长按？

### 5.2 加入时机和加入的是什么

**加入时机**：命中测试之后的事件分发阶段。具体是在遍历 hits 列表时，对每个 RenderPointerListener 调 `handleEvent()`，在其中遍历 `_gestureRecognizers` Map，调 `recognizer.addPointer(event)`。

**加入的是什么**：`GestureRecognizer`（手势识别器），不是 RenderObject，也不是 Widget。

```
GestureDetector(onTap: () {})
  ↓ build()
RawGestureDetector(gestures: {TapGestureRecognizer: factory})
  ↓ build()
Listener → RenderPointerListener（把 factory 创建出的 recognizer 存进 _gestureRecognizers）
  ↓ 用户点击
命中测试 → RenderPointerListener 的 RenderObject 被加入 hits 列表
  ↓ 事件分发
RenderPointerListener.handleEvent()
  → 遍历 _gestureRecognizers
  → recognizer.addPointer(event)
  → GestureArenaManager.add(pointer, recognizer)
  → TapGestureRecognizer 进入竞技场
```

### 5.3 胜负规则

**第一个 accept 的赢，最后一个 reject 的也赢。**

```
PointerDown 触发 → 所有识别器进入竞技场 → 等待事件发展...

三种胜出方式：
  ① accept：某个识别器确认手势匹配（如拖动超过 18px）
     → 立即赢，其他全输
  ② reject：某个识别器确认不匹配（如点击发现手指动了）
     → 退出，只剩一个时它自动赢
  ③ sweep：都没表态，竞技场关闭时强制选第一个
```

**各识别器 accept/reject 时机**：

| 识别器 | accept | reject |
|---|---|---|
| TapGestureRecognizer | PointerUp 时手指没移动太多 | PointerMove 超过 18px |
| DragGestureRecognizer | PointerMove 超过 18px 阈值 | - |
| LongPressGestureRecognizer | PointerDown 后 500ms 没动 | 手指移动超过阈值 |
| DoubleTapGestureRecognizer | 300ms 内第二次 Down | 超时没等到第二次 |

### 5.4 开发者怎么控制竞技场

#### 方式 1：只监听一种手势——竞技场只有一个人，立即赢

```dart
// 只设 onTap → 没有竞争对手，无延迟
GestureDetector(onTap: () {})
```

#### 方式 2：调识别器的参数——控制"多快赢"

```dart
RawGestureDetector(
  gestures: {
    LongPressGestureRecognizer: GestureRecognizerFactoryWithHandlers<
        LongPressGestureRecognizer>(
      () => LongPressGestureRecognizer(
        duration: const Duration(milliseconds: 200), // 默认 500ms
      ),
      (instance) {
        instance.onLongPress = () => print('200ms 长按');
      },
    ),
  },
  child: Container(width: 100, height: 100),
)
```

#### 方式 3：完全自定义手势识别器

继承 `OneSequenceGestureRecognizer`，自己控制 accept/reject 时机：

```dart
// 三击手势识别器
class TripleTapRecognizer extends GestureRecognizer {
  int _tapCount = 0;
  DateTime? _lastTapTime;
  void Function()? onTripleTap;

  @override
  void addAllowedPointer(PointerDownEvent event) {
    startTrackingPointer(event.pointer);
  }

  @override
  void handleEvent(PointerEvent event) {
    if (event is PointerUpEvent) {
      final now = DateTime.now();
      if (_lastTapTime == null ||
          now.difference(_lastTapTime!) < Duration(milliseconds: 400)) {
        _tapCount++;
      } else {
        _tapCount = 1;
      }
      _lastTapTime = now;

      if (_tapCount >= 3) {
        acceptGesture(event.pointer); // 三击完成 → 我赢了
        onTripleTap?.call();
        _tapCount = 0;
      }
    }
  }

  @override
  void rejectGesture(int pointer) { _tapCount = 0; super.rejectGesture(pointer); }

  @override
  String get debugDescription => 'tripleTap';
  @override
  void didStopTrackingLastPointer(int pointer) {}
}

// 使用
RawGestureDetector(
  gestures: {
    TripleTapRecognizer: GestureRecognizerFactoryWithHandlers<TripleTapRecognizer>(
      () => TripleTapRecognizer(),
      (instance) { instance.onTripleTap = () => print('三击！'); },
    ),
  },
  child: Container(width: 100, height: 100, color: Colors.red),
)
```

**自定义识别器的核心套路**（四个方法）：

```
addAllowedPointer() → 手指按下，开始跟踪
handleEvent()      → 处理移动/抬起，判断是否满足条件
acceptGesture()    → 我赢了，叫停竞技场
rejectGesture()    → 我退出，让别人赢
```

### 5.5 竞技场常见场景

**场景 1：点击+长按共存——按住 500ms 长按赢，快速抬起点击赢**

```dart
GestureDetector(
  onTap: () => print('点击'),
  onLongPress: () => print('长按'),
  child: Container(width: 100, height: 100),
)
```

| 时间 | 事件 | 结果 |
|---|---|---|
| t=0 | 手指按下 | 两个识别器入场 |
| t=50ms | 手指抬起 | 点击识别器 accept → onTap |
| t=0 | 手指按下 | 两个入场 |
| t=500ms | 手指没动 | 长按识别器 accept → onLongPress，点击 reject → onTapCancel |

**场景 2：单击+双击共存——单击有 300ms 延迟**

```dart
GestureDetector(
  onTap: () => print('单击'),
  onDoubleTap: () => print('双击'),
  child: Container(width: 100, height: 100),
)
```

```
单击：
  第一次 Down+Up → 双击识别器等第二次 Down...
  → 等 300ms 没来 → 双击 reject → 点击 accept → onTap 触发（延迟 300ms）

双击：
  第一次 Down+Up → 等第二次
  → 300ms 内第二次 Down → 双击 accept → onDoubleTap
  → 点击 reject → onTap 不触发
```

**场景 3：水平拖动 vs 垂直拖动——谁先超过阈值谁赢**

```dart
GestureDetector(
  onHorizontalDragUpdate: (d) => print('水平'),
  onVerticalDragUpdate: (d) => print('垂直'),
  child: Container(width: 100, height: 100),
)
```

```
手指按下 → 两个入场
手指移动：
  水平位移 > 18px → 水平 accept → 垂直 reject
  垂直位移 > 18px → 垂直 accept → 水平 reject
```

**场景 4：嵌套 GestureDetector——子赢了父就收不到**

```dart
GestureDetector(                              // 父
  onTap: () => print('父'),
  child: GestureDetector(                     // 子
    onTap: () => print('子'),                 // 只有子触发
    child: Container(width: 100, height: 100),
  ),
)
```

behavior **改变不了竞技场结果**——behavior 只控制"是否被命中测试命中"，不控制"竞技场谁赢"。要让父响应，用 `AbsorbPointer` 包住子，或者子不设 onTap。

---

## 6. 语义手势与开发实战

### 6.1 三种添加点击的方式

Flutter 官方文档给出了三种添加点击事件的方法：

| | GestureDetector | InkWell | Button（ElevatedButton/TextButton 等） |
|---|---|---|---|
| **手势类型** | 全部（点击、双击、长按、拖动、缩放） | 主要点击（onTap/onDoubleTap/onLongPress） | 主要点击（onPressed） |
| **视觉反馈** | ❌ 无 | ✅ 水波纹 | ✅ 水波纹 + 预设样式 |
| **使用场景** | 任意 widget 加任意手势 | 需要点击反馈但不想用标准按钮 | 标准按钮（登录、提交等） |
| **灵活度** | 最高 | 中等 | 最低（受限于预设样式） |

```dart
// 1. GestureDetector —— 纯手势，无视觉反馈
GestureDetector(
  onTap: () => print('点击'),
  child: Container(width: 100, height: 100, color: Colors.blue),
)

// 2. InkWell —— 有点击反馈（水波纹）
InkWell(
  onTap: () => print('点击'),
  child: Container(width: 100, height: 100, color: Colors.blue),
)

// 3. ElevatedButton —— 标准按钮（水波纹 + 预设样式）
ElevatedButton(
  onPressed: () => print('点击'),
  child: Text('按钮'),
)
```

**怎么选**：
- 需要标准按钮 → **Button**（最快最规范）
- 需要点击反馈但不是按钮（卡片、列表项）→ **InkWell**
- 需要复杂手势（拖动、缩放）或不需要反馈 → **GestureDetector**

### 6.2 Listener vs GestureDetector

| | Listener | GestureDetector |
|---|---|---|
| 层次 | **底层** | **高层** |
| 监听什么 | 原始 PointerEvent（Down/Move/Up/Cancel） | 语义手势（Tap/Drag/LongPress 等） |
| 竞技场 | ❌ 不参与 | ✅ 参与 |
| 回调参数 | 原始事件对象（含坐标、压力等） | 语义化回调（如 `onTap` 无参数） |
| 内部实现 | 直接触发回调 | 创建 GestureRecognizer 加入竞技场 |

```dart
// Listener：拿到原始数据
Listener(
  onPointerDown: (e) => print('按下: ${e.position}'),
  onPointerMove: (e) => print('移动: ${e.delta}'),
  onPointerUp: (e) => print('抬起'),
  child: Container(width: 100, height: 100, color: Colors.red),
)

// GestureDetector：语义化，不用关心原始事件
GestureDetector(
  onTap: () => print('点击了'),
  onPanUpdate: (d) => print('拖动: ${d.delta}'),
  child: Container(width: 100, height: 100, color: Colors.red),
)
```

**Listener 不参与竞技场**，因为它的 RenderPointerListener 没有绑定 GestureRecognizer。多个 Listener 不会互相冲突——所有 Listener 都收到事件。

### 6.3 GestureDetector 常用回调

| 回调 | 手势 | 常用场景 |
|---|---|---|
| `onTap` | 点击 | 按钮、卡片 |
| `onDoubleTap` | 双击 | 图片放大 |
| `onLongPress` | 长按 | 删除、快捷菜单 |
| `onPanUpdate` | 拖动 | 滑动条、拖拽 |
| `onScaleUpdate` | 缩放 | 图片缩放 |
| `onVerticalDragUpdate` | 垂直拖动 | 列表滚动 |
| `onHorizontalDragUpdate` | 水平拖动 | 左右滑 |

### 6.4 继承关系

```
Listener       → RenderObjectWidget  → 直接产生 RenderObject（RenderPointerListener）
GestureDetector → StatelessWidget     → build() 内部包了 RawGestureDetector
RawGestureDetector → StatefulWidget   → State.initState() 创建 GestureRecognizer，传给 Listener
InkWell        → StatefulWidget       → 继承 GestureDetector，加水波纹
Button         → StatefulWidget       → build() 内部包了 InkWell

GestureDetector 的 build() 简化版：
class GestureDetector extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    // 根据 onTap/onLongPress 等回调生成 Map
    final gestures = _gestureRecognizers; // 动态构建
    return RawGestureDetector(
      gestures: gestures,  // 传给 RawGestureDetector
      child: child,
    );
  }
}

// RawGestureDetectorState.initState() 遍历 gestures Map
// 调用 factory() 创建 GestureRecognizer 实例
// 传给 Listener → RenderPointerListener._gestureRecognizers
```

**Button 的点击本质也是 GestureDetector**——ElevatedButton、TextButton 等 Material 按钮内部最终用的还是 GestureDetector，点击机制完全一样，只是多了水波纹效果。

---

## 7. 常见场景与避坑

### 场景 1：透明区域点不到

```dart
// ❌ 默认 behavior，透明区域不参与命中测试
GestureDetector(
  onTap: () => print('点不到'),
  child: Container(color: Colors.transparent),
)

// ✅ behavior: opaque
GestureDetector(
  behavior: HitTestBehavior.opaque,
  onTap: () => print('点到了'),
  child: Container(color: Colors.transparent),
)
```

### 场景 2：嵌套点击，只让父响应

```dart
// ❌ 子赢了，父收不到
GestureDetector(
  onTap: () => print('父'),
  child: GestureDetector(
    onTap: () => print('子'),  // 只有这个触发
    child: Container(100x100),
  ),
)

// ✅ AbsorbPointer 吸收子的事件
GestureDetector(
  onTap: () => print('父'),
  child: AbsorbPointer(
    child: GestureDetector(
      onTap: () => print('子'), // 不会触发
      child: Container(100x100),
    ),
  ),
)
```

### 场景 3：Listener 让两层都响应

```dart
// GestureDetector 不行（竞技场只有一个赢家）
// Listener 可以（不参与竞技场）
Stack(
  children: [
    Listener(
      onPointerDown: (_) => print('下层收到'),
      child: Container(200x200, Colors.green),
    ),
    Positioned.fill(
      child: Listener(
        behavior: HitTestBehavior.translucent,
        onPointerDown: (_) => print('上层也收到'),
        child: Container(color: Colors.transparent),
      ),
    ),
  ],
)
// 两个 Listener 都收到
```

### 场景 4：可点击区域太小

```dart
// ❌ 40x40 用户很难点到
GestureDetector(
  onTap: () {},
  child: Container(width: 40, height: 40, color: Colors.red),
)

// ✅ Padding 扩大
GestureDetector(
  onTap: () {},
  child: Container(
    padding: EdgeInsets.all(20),  // 点击区域扩大到 80x80
    child: Container(width: 40, height: 40, color: Colors.red),
  ),
)
```

### 场景 5：ListView 里点击 + 滚动不冲突

```dart
ListView.builder(
  itemBuilder: (ctx, i) => GestureDetector(
    onTap: () => print('第 $i 项被点击'),
    child: Container(height: 60, child: Text('Item $i')),
  ),
)
```

手指按下 → 点击识别器入场
手指抬起 → 点击识别器 accept → onTap
手指按住拖动 → 点击识别器 reject（手指动了）→ ListView 滚动接管

---

## 8. 总结表

| 概念 | 一句话 |
|---|---|
| **原始指针事件** | Down/Move/Up/Cancel，底层触摸数据 |
| **命中测试** | 手指按下时遍历渲染树（RenderObject 树），找出被戳中的 RenderObject |
| **命中测试只做一次** | 只在 PointerDown 时执行 |
| **hits 列表存的是 RenderObject** | 不是 Widget，也不是 GestureRecognizer |
| **没有手势的 widget 也参与命中测试** | 只是没有绑定 GestureRecognizer，不会触发回调 |
| **命中测试→竞技场的衔接** | 事件分发时遍历 hits 列表，把 RenderPointerListener 上的 GestureRecognizer 加入竞技场 |
| **GestureRecognizer 怎么绑到 RenderObject** | GestureDetector.build() → RawGestureDetector → Listener → RenderPointerListener._gestureRecognizers Map |
| **Listener 为什么不参与竞技场** | 它的 RenderPointerListener 没有绑定 GestureRecognizer，直接触发回调 |
| **IgnorePointer** | 子树不参与命中测试，事件穿透 |
| **AbsorbPointer** | 子树不参与命中测试，事件被吸收 |
| **behavior: opaque** | 整个区域参与命中测试，阻挡下层 |
| **behavior: translucent** | 整个区域参与，不阻挡下层 |
| **自定义 hitTest** | 重写 RenderProxyBox.hitTest()，精确到像素级 |
| **手势竞技场** | 多个 GestureRecognizer 竞争，谁 accept 谁赢 |
| **竞技场胜出规则** | accept 赢、只剩一个自动赢、超时 sweep |
| **嵌套 GestureDetector** | 子赢了父就收不到 |
| **Listener** | 底层，监听原始事件，不参与竞技场 |
| **GestureDetector** | 高层，监听语义手势，参与竞技场 |
| **InkWell** | GestureDetector + 水波纹 |
| **Button** | 封装好的标准按钮，内部用 GestureDetector |
| **自定义识别器** | 继承 OneSequenceGestureRecognizer，控制 accept/reject |

---

> **一句话总结**：手指按下 → 命中测试找出所有被戳中的 RenderObject → 事件分发时把绑定的 GestureRecognizer 加入竞技场 → 赢家触发你的回调。
> behavior 控制"能不能被戳中"，竞技场控制"戳中了谁响应"。
