---
title: Flutter PointerCancel 僵尸 Pointer 的根因与修复
categories:
  - 跨平台
tags:
  - 知识点
top: 100
abbrlink: b673d552
---

# Case Study:在 Android 上 reparent FlutterView 时手势卡死 —— PointerCancel 僵尸 Pointer 的根因与修复

> 一次跨越 Android Framework、Flutter Embedding、Flutter Engine native、Flutter Framework 四层的硬核 Bug 排查记录。
>
> **目标读者**:初/中级 Android 开发者、Flutter 接入工程师、想理解触摸事件全链路的同学。
>
> **阅读完本文你会理解**:
> - Android `ViewGroup` 是怎么把手指触摸 → 转换 → 分发到 `View` 的
> - `removeView` 时为什么会自动派一个 `ACTION_CANCEL`,这个 cancel 长啥样
> - Flutter Engine 是怎么把 `MotionEvent` 转成 Dart 端 `PointerEvent` 的
> - **Flutter Framework 是怎么靠 `PointerCancelEvent` 收尾一次手势的**
> - 为什么 cancel 一旦丢失,**动画会卡在中间帧、点击会全部失灵**
> - 为什么"toolType" 这个看起来人畜无害的字段会引发整个手势体系卡死
> - 在什么样的接入架构下这个 bug 会被放大成日常事故
> - **如何用日志验证你当前是不是踩到了这个 bug**

> **文档结构(从浅到深)**:
>
> | 部分 | 章节 | 你会得到什么 |
> |------|------|------------|
> | **第一部分:Bug 表象** | §1–§3 | 看到这个 bug 是什么样,什么场景下会发生 |
> | **第二部分:必备知识储备** | §4–§6 | 从手指到 Dart 业务代码,完整 Touch 事件链路 |
> | **第三部分:根因深挖** | §7–§9 | 三个独立合理的设计如何叠加成 bug |
> | **第四部分:修复方案与验证** | §10–§12 | 怎么修、怎么验证、怎么诊断现场 |
> | **第五部分:反思与延伸** | §13–§14 + 附录 | 教训、相关 Issue、`MotionEvent` 字段速查 |

---

# 第一部分:Bug 表象 — 我们看到了什么

## 一、通用业务场景

只要你的 Android 接入层会**在用户手指还按在屏幕上的时候,把 `FlutterView` 从一个父 `ViewGroup` 搬到另一个父 `ViewGroup`**,你就有可能踩到这个 bug。

常见的搬家模式有:

| 接入模式 | 搬家时机 |
|---------|---------|
| 多 Tab 之间共享同一个 `FlutterView`(避免重启 Engine) | 切 Tab 时 |
| 自定义页面路由 + 转场动画,过渡过程中 reparent | 动画收尾、用户上下滑期间 |
| 弹层/半屏抽屉/全屏预览中嵌入 Flutter | 弹层打开/收起 |
| ViewPager / RecyclerView 内部 cell 嵌入 Flutter | 滚动复用、`onViewRecycled` |
| 多 Activity 共享一个 `FlutterEngine` + `FlutterView` | Activity push/pop |

只要在**触摸序列尚未走完**(`ACTION_DOWN` 已派发,但对应的 `ACTION_UP` 还没到 FlutterView)期间触发 `removeView` + `addView`,就有可能出问题。

这个 bug 的特征:**问题不是必现**,需要"用户手指还没抬起 + 容器层立刻 remove FlutterView"两个时序窗口对齐才会触发。所以本地不容易复现、上线后线上偶现卡死,典型的"幽灵 bug"。

---

## 二、问题表现

把现象抽象出来:

> 用户在 Flutter 区域按下、滑动、容器层在某个时机 reparent 了 FlutterView。
> 之后:
>
> 1. **手势驱动的动画停在中间帧**:页面回弹动画走到 70% 突然不动了、抽屉收起到一半就停住、滑动返回的页面卡在半透明状态。
> 2. **Flutter 区域内的所有点击和滑动都失效**:点按钮没反应、滚动列表纹丝不动。
> 3. **但 Flutter 还在持续渲染**(秒表组件还在走、视频还在播),UI 看起来"活着",只是不响应交互。
> 4. 通常**重新进入页面 / 旋转屏幕 / 触发某些会重建 widget tree 的事件**之后能恢复,但下次还会复现。

这三个症状是同一个根因导致的不同侧面。看完 §7~§8 你会明白每个症状对应着 Dart 框架的哪一处状态卡住。

如果你打开 Flutter 的 GestureBinding 调试,你会发现 `GestureBinding.instance.pointerRouter` 里堆着一个或多个**永远不消失的 pointer 路由**。这就是我们后面要叫的"**僵尸 pointer**"。

---

## 三、第一手现场

抓出问题瞬间的关键日志(已脱敏简化):

```
T0      Dart  pointer=29 PointerDownEvent       ← 用户按下
T0+1ms  Dart  pointer=29 PointerMoveEvent
T0+2ms  Dart  pointer=29 PointerMoveEvent

────────── 容器层决定 reparent FlutterView ──────────

T0+3ms  容器层  attachFlutterView newParent=...
T0+4ms  Android dispatchTouchEvent action=CANCEL  ← Android 自动派出 CANCEL
T0+7ms  FlutterView onDetachedFromWindow
T0+7ms  FlutterView onAttachedToWindow newParent  ← 同一实例

────────── 此后 Dart 端永远收不到 pointer=29 的任何事件 ──────────

T0+200ms  Dart  pointer=33 PointerDownEvent  hits=[29] touches=[29]   ← 僵尸 29 还在!
T0+800ms  Dart  pointer=34 PointerDownEvent  hits=[29] touches=[29]   ← 永久卡住
```

`pointer=29` 是用户那次未完成手势的虚拟 pointer id。它从此永远卡在 Dart 端的 hit test 状态里。后续每个真实手势都跟它绑在一起,业务的 `Listener.onPointerDown` / `GestureDetector` / `pointer-events` 全部失灵。

观察到这里有两个关键问号:

1. Android 既然派了 `ACTION_CANCEL`(我们日志看见了),Dart 端为什么没收到对应的 `PointerCancelEvent`?
2. 这个"reparent FlutterView"的设计本身有没有问题?

下面我们逐层往下挖。**先从最浅的 Android Framework 开始,一直挖到 Dart 框架**,把所需的知识铺垫完,然后回头串根因。

---

# 第二部分:必备知识储备 — 一根手指从屏幕到 Dart 业务代码的完整链路

> **导读**:这一部分讲的是**正常情况下**触摸事件是怎么走的。
> 你会看到 §4 → §5 → §6 三章把一个 `ACTION_DOWN` 从 Android 系统层一路追踪到 Dart 框架层。
> 读完这部分你会有完整的"一次触摸"全景图。
> **本部分尚未涉及 bug,只是基础知识铺垫**。

---

## 四、Android `ViewGroup` 怎么分发触摸事件

要理解这个 bug,必须先把 Android 触摸事件的分发机制吃透。

### 4.1 三大入口

`ViewGroup` 有三个核心方法处理触摸:

| 方法 | 职责 |
|------|------|
| `dispatchTouchEvent(MotionEvent)` | 总入口,决定事件该往哪走 |
| `onInterceptTouchEvent(MotionEvent)` | 是否拦截子 view 的事件 |
| `onTouchEvent(MotionEvent)` | 自己处理事件 |

`View`(普通叶子节点)只有 `dispatchTouchEvent` 和 `onTouchEvent`,没有 `onInterceptTouchEvent`。

### 4.2 `mFirstTouchTarget` —— ViewGroup 的"指纹本"

这是本文最关键的一个数据结构。`ViewGroup` 内部有一个链表 `mFirstTouchTarget`,记录**当前每个 pointer 最终被哪个 child view 拿走了 ACTION_DOWN**。

```
┌────────────────────────────────────────────────────────────┐
│ ViewGroup.mFirstTouchTarget                                 │
│   ┌────────────────┐    ┌────────────────┐                  │
│   │ TouchTarget    │ →  │ TouchTarget    │ → null           │
│   │ child=ViewA    │    │ child=ViewB    │                  │
│   │ pointerIdBits  │    │ pointerIdBits  │                  │
│   └────────────────┘    └────────────────┘                  │
└────────────────────────────────────────────────────────────┘
```

只有 `ACTION_DOWN` 时,`ViewGroup` 才会做 hit test 找到一个能 handle 的 child,把它登记到 `mFirstTouchTarget`。
后续 `MOVE / UP / CANCEL` 都通过查 `mFirstTouchTarget` 直接派发,不再做 hit test。

如果 `mFirstTouchTarget == null`,意味着**没有 child 接住 DOWN**,这时所有事件直接交给 `ViewGroup` 自己的 `onTouchEvent`。

### 4.3 `removeView` 时的连锁反应

来看 `ViewGroup.removeViewInternal` 的真实路径(简化):

```java
private void removeViewInternal(int index, View view) {
    // 1. 如果有焦点、动画相关清理
    ...

    // ★★★ 2. 取消该 child 持有的所有 touch target
    cancelTouchTarget(view);

    // 3. 真正从 children 数组移除
    removeFromArray(index);
}
```

`cancelTouchTarget(view)` 才是关键:

```java
private void cancelTouchTarget(View view) {
    TouchTarget predecessor = null;
    TouchTarget target = mFirstTouchTarget;
    while (target != null) {
        if (target.child == view) {
            // 把 target 从链表中摘掉
            ...

            // ★★★ 给 child 派一个合成的 ACTION_CANCEL
            long now = SystemClock.uptimeMillis();
            MotionEvent event = MotionEvent.obtain(
                now, now, MotionEvent.ACTION_CANCEL, 0.0f, 0.0f, 0);
            event.setSource(InputDevice.SOURCE_TOUCHSCREEN);
            view.dispatchTouchEvent(event);
            event.recycle();
            return;
        }
        predecessor = target;
        target = target.next;
    }
}
```

**关键事实**:

- 如果 `mFirstTouchTarget` 链表里有 `view`(说明它正在持有触摸),`removeView` 会**自动派一个 `ACTION_CANCEL`** 给它。这个机制是 Android Framework 的标准行为,目的是让被移除的 view 有机会清理它的内部手势状态。
- 这个合成事件用的是 `MotionEvent.obtain(downTime, eventTime, action, x, y, metaState)` —— **简化版**的 obtain。
- **这个简化版本只能表达一个最简单的 pointer**,后面我们会看到这是问题的根源。

### 4.4 简化版 `MotionEvent.obtain` 长什么样

打开 Android 源码 `MotionEvent.java`:

```java
public static MotionEvent obtain(long downTime, long eventTime, int action,
        float x, float y, float pressure, float size, int metaState,
        float xPrecision, float yPrecision, int deviceId, int edgeFlags, int source,
        int displayId) {
    MotionEvent ev = obtain();
    synchronized (gSharedTempLock) {
        ensureSharedTempPointerCapacity(1);
        final PointerProperties[] pp = gSharedTempPointerProperties;
        pp[0].clear();        // ← ★ 看这里
        pp[0].id = 0;
        ...
        ev.initialize(deviceId, source, displayId,
                action, 0, edgeFlags, metaState, 0, CLASSIFICATION_NONE,
                0, 0, xPrecision, yPrecision,
                downTime * NS_PER_MS, eventTime * NS_PER_MS,
                1, pp, pc);
        return ev;
    }
}
```

`PointerProperties.clear()`:

```java
public void clear() {
    id = INVALID_POINTER_ID;
    toolType = TOOL_TYPE_UNKNOWN;   // ← ★ ★ ★
}
```

**简化版 obtain 不接收 toolType 参数,默认就是 `TOOL_TYPE_UNKNOWN`(值 0)**。

而我们实际用手指触摸屏幕,`MotionEvent.getToolType(0)` 返回的是 `TOOL_TYPE_FINGER`(值 1)。
**这两个数值不同**,这一点请记住,后面 §7 根因分析会用到。

---

## 五、一根手指:从 `ACTION_DOWN` 到 Dart 端 `PointerDownEvent` 全程

`MotionEvent` 进入 `FlutterView` 之后会经过 Java 层 → Native 层 → Dart 层三段转换。这一章把整条管道串起来讲完。

### 5.1 Java 层入口:`FlutterView.onTouchEvent`

`flutter/shell/platform/android/io/flutter/embedding/android/FlutterView.java`:

```java
@Override
public boolean onTouchEvent(@NonNull MotionEvent event) {
    if (!isAttachedToFlutterEngine()) {
        return super.onTouchEvent(event);   // 没绑引擎,什么都不做
    }
    requestUnbufferedDispatch(event);
    return androidTouchProcessor.onTouchEvent(event);
}
```

`isAttachedToFlutterEngine()` 检查:

```java
public boolean isAttachedToFlutterEngine() {
    return flutterEngine != null
        && flutterEngine.getRenderer() == renderSurface.getAttachedRenderer();
}
```

只有引擎在线、surface 绑定正确,事件才会被往下转发。

### 5.2 Java 层转码:`AndroidTouchProcessor.onTouchEvent`

`AndroidTouchProcessor.onTouchEvent` 把 `MotionEvent` 编码成一个 byte buffer(`PointerData` packet),最终通过 `renderer.dispatchPointerDataPacket` 走 JNI 投递给 native engine。

它的核心逻辑根据 action 分支:

```java
if (action == ACTION_DOWN || action == ACTION_POINTER_DOWN) {
    addPointerForIndex(event, getActionIndex(), pointerChange, ...);
} else if (action == ACTION_UP || action == ACTION_POINTER_UP) {
    // 给其他 pointer 补一个 batched MOVE,然后 UP,如果是手指 UP 还要合成一个 REMOVE
    ...
} else {
    // ACTION_MOVE / ACTION_CANCEL 走这里
    for (int p = 0; p < event.getPointerCount(); p++) {
        addPointerForIndex(event, p, pointerChange, ...);
    }
}
```

`ACTION_CANCEL` 走的是最后那个 else,对每个 pointer 调一次 `addPointerForIndex`。

### 5.3 `uniquePointerIdByType` —— 把 `toolType` 编进 device id

进入 `addPointerForIndex` 看第一行干什么的:

```java
final int pointerId = uniquePointerIdByType(event, pointerIndex);
...
packet.putLong(pointerId); // device  ← 写进 packet 的 device 字段
packet.putLong(0);         // pointer_identifier, will be generated in pointer_data_packet_converter.cc.
```

`uniquePointerIdByType`:

```java
// 我们用 3 bits 装下 6 种 toolType
private static final int TOOL_TYPE_BITS = 3;
private static final int TOOL_TYPE_MASK = (1 << TOOL_TYPE_BITS) - 1;  // = 7

private int uniquePointerIdByType(MotionEvent event, int pointerIndex) {
    return (event.getPointerId(pointerIndex) << TOOL_TYPE_BITS)
        | (event.getToolType(pointerIndex) & TOOL_TYPE_MASK);
}
```

注意这个"device id"**不是简单的 `pointerId`**,而是 `(pointerId << 3) | toolType`。
这个设计是为了修一个屏幕镜像工具的 bug([flutter/flutter#160144](https://github.com/flutter/flutter/issues/160144)):
某些屏幕镜像软件会让同一个 pointerId 在不同事件里报告不同的 toolType,Flutter 内部会因此错乱。
所以工程师**故意把 toolType 编码进 device id**,确保 (pointerId, toolType) 不同的组合在 Flutter 看来就是不同的 pointer。

听起来很合理对吧?但这个改动埋下了一个深坑,我们 §7 会看到。

注意还有一行 `packet.putLong(0); // pointer_identifier, will be generated in pointer_data_packet_converter.cc.`,Java 端把 `pointer_identifier` 字段**故意填 0**,声明"我不知道,等 native 填"。这个伏笔在 §5.5 揭晓。

### 5.4 packet 投到 native:`dispatchPointerDataPacket`

`renderer.dispatchPointerDataPacket(packet, packet.position())` 走 JNI,把这个 byte buffer 同步交给 native 端,最终进 `PointerDataPacketConverter::Convert`。

**这一步是同步的、不过 vsync、不依赖 surface 状态**。所以"surface 中间态导致 packet 丢"这种猜测是错的,我们查问题时不要被 surface 切换的复杂性带偏。

### 5.5 Native 状态机:`PointerDataPacketConverter::states_`

文件位置:`flutter/lib/ui/window/pointer_data_packet_converter.cc`。

它干一件事:**根据 `device` 字段维护一个状态表 `states_`,把 packet 里的 `PointerData` 转成 Dart 框架真正能消费的事件序列**。

它做这事的原因:Android(以及其他平台)发出来的事件并不"完整",比如:
- `ACTION_DOWN` 之前没有显式的 ADD,但 Dart 框架希望先看到 ADD 再看到 DOWN
- 同一个 pointer 多次 DOWN 之间没有 REMOVE,Dart 框架希望 REMOVE 必须在 ADD 之前

引擎在这里把这些缝隙补上,方法就是查 `states_` 表。

**状态表**:

```cpp
// pointer_data_packet_converter.h
struct PointerState {
    int64_t pointer_identifier;
    bool is_down;
    int64_t view_id;
    double physical_x;
    double physical_y;
    ...
};

class PointerDataPacketConverter {
    std::map<int64_t, PointerState> states_;
};
```

表的 key 就是 `PointerData.device` 字段。

**各 Change 处理(节选)**:

```cpp
case PointerData::Change::kDown: {
    auto iter = states_.find(pointer_data.device);
    PointerState state;
    if (iter == states_.end()) {
        // 没建过 state,合成一个 ADD 写进 states_
        PointerData synthesized_add_event = pointer_data;
        synthesized_add_event.change = PointerData::Change::kAdd;
        synthesized_add_event.synthesized = 1;
        state = EnsurePointerState(synthesized_add_event);
        converted_pointers.push_back(synthesized_add_event);
    } else {
        state = iter->second;
    }
    ...
    UpdatePointerIdentifier(pointer_data, state, /*start_new_pointer=*/true);
}

case PointerData::Change::kUp: {
    auto iter = states_.find(pointer_data.device);
    FML_DCHECK(iter != states_.end());
    PointerState state = iter->second;
    state.is_down = false;
    states_[pointer_data.device] = state;
    converted_pointers.push_back(pointer_data);
    break;
}

case PointerData::Change::kRemove: {
    auto iter = states_.find(pointer_data.device);
    FML_DCHECK(iter != states_.end());
    ...
    states_.erase(pointer_data.device);
    converted_pointers.push_back(pointer_data);
    break;
}
```

到目前为止逻辑都对称、合理:每个 change 都先查 `states_.find(device)`,在存在的前提下处理。
`kCancel` 分支看起来"应该"也是这个模式 —— 但它不是。这个细节我们留到 §7.3 单独讲,因为它是本 bug 三大根因之一。

### 5.6 两层 ID:`device` 是状态机 key,`pointer_identifier` 才是 Dart 看到的 `pointer`

走到这里读者通常会有一个疑问:

> 我们日志里看到 Dart 端 `PointerDownEvent` 的 pointer 字段一直在自增 —— 29、33、34、35……
> 但 Android 单指触摸 `getPointerId(0)` 永远是 0,引擎里 device 也永远是 1。
> **那 Dart 看到的那个一直自增的"pointer" 到底是从哪来的?它跟 Java 层 `uniquePointerIdByType` 返回的那个 pointerId 是什么关系?**

直接答案:**它们是两个完全不同的字段,只是名字都叫"pointer 什么什么",特别容易混**。Flutter Engine 同时维护两层 ID,各管各的事。下面顺着事件流一层一层把数值追出来。

#### 5.6.1 Java 层:写出 `device`,把 `pointer_identifier` 故意留空

`AndroidTouchProcessor.java` line 313 / 374-375 把字段写进 packet:

```java
final int pointerId = uniquePointerIdByType(event, pointerIndex);
//      ↑ Java 局部变量,虽然命名叫 pointerId,
//        实际是 (Android pointerId << 3) | toolType
...
packet.putLong(pointerId);   // ← ★ 写到 packet 的 device 字段
packet.putLong(0);           // ← ★ pointer_identifier 字段填 0(占位)
                             //   注释:"will be generated in pointer_data_packet_converter.cc"
```

注意两件事:

1. **Java 局部变量 `pointerId` ≠ `event.getPointerId(0)`**(尽管名字一样!)。
   Java 局部 `pointerId` 是 `uniquePointerIdByType` 的返回值,实际填到 packet 的 **`device` 字段**。
2. **packet 里的 `pointer_identifier` 字段,Java 故意写 0**。Java 自己声明它"我不知道,等 native 填"。

`PointerData` 是个 C 结构体,在 packet byte buffer 里这两个字段是**两个独立的 long**,各占 8 字节。Java 端写一头,Native 端补另一头。

#### 5.6.2 Native 层:`device` 当 key 查表,`pointer_identifier` 自己生成

`pointer_data_packet_converter.cc` 收到 packet,处理 kDown 时(参见 §5.5 列出的代码),最后会调用:

```cpp
UpdatePointerIdentifier(pointer_data, state, /*start_new_pointer=*/true);
```

`UpdatePointerIdentifier` 长这样:

```cpp
void PointerDataPacketConverter::UpdatePointerIdentifier(
    PointerData& pointer_data, PointerState& state, bool start_new_pointer) {
  if (start_new_pointer) {
    state.pointer_identifier = ++pointer_;     // ← ★ 全局计数器自增,赋给 state
    states_[pointer_data.device] = state;
  }
  pointer_data.pointer_identifier = state.pointer_identifier;
  //               ↑ ★ 写回 packet 的 pointer_identifier 字段(覆盖 Java 那 0)
}
```

`pointer_` 是 `PointerDataPacketConverter` 的成员变量(`pointer_data_packet_converter.h` line 125):

```cpp
int64_t pointer_ = 0;
```

每次 kDown 就 `++pointer_`。**只有 kDown 时 `start_new_pointer = true`**。其他 change(MOVE、UP、CANCEL、HOVER、REMOVE)都是 `false`,沿用同一个 state 里已经存好的 `pointer_identifier`。

所以 PointerData 走出 native 时:

| 字段 | 值 |
|------|-----|
| `device` | Java 算出来的 `(pointerId<<3)\|toolType`,**会复用** |
| `pointer_identifier` | native 生成的 **单调递增** 计数器值 |

#### 5.6.3 Dart 端:`PointerEvent` 上的两个字段叫什么

`flutter/packages/flutter/lib/src/gestures/converter.dart`(`PointerEventConverter.expand`)生成 PointerEvent 时:

```dart
case ui.PointerChange.down:
  return PointerDownEvent(
    pointer: datum.pointerIdentifier,   // ← native 生成的 ★ pointer_identifier ★
    device: datum.device,               // ← Java 算的 ★ device ★
    ...
  );
```

`PointerEvent` 上确实**两个字段都有**:

| Dart `PointerEvent` 字段 | 来自哪里 | 特征 |
|------|---------|------|
| `event.pointer` | native 生成的 `pointer_identifier` | 单调递增,每段触摸序列独一无二 |
| `event.device` | Java `uniquePointerIdByType` 算的 `device` | 会复用,标识"哪根手指 / 什么工具" |

#### 5.6.4 Dart 框架内部用哪个?

打开 `flutter/packages/flutter/lib/src/gestures/binding.dart` line 413、424、436:

```dart
// GestureBinding._handlePointerEventImmediately
if (event is PointerDownEvent ...) {
    _hitTests[event.pointer] = hitTestResult;          // ★ 用 event.pointer
} else if (event is PointerUpEvent || event is PointerCancelEvent) {
    hitTestResult = _hitTests.remove(event.pointer);    // ★ 用 event.pointer
} else if (event.down) {
    hitTestResult = _hitTests[event.pointer];           // ★ 用 event.pointer
}
```

打开 `gestures/recognizer.dart` line 520-521:

```dart
// OneSequenceGestureRecognizer.startTrackingPointer
GestureBinding.instance.pointerRouter.addRoute(pointer, handleEvent, transform);
_trackedPointers.add(pointer);                          // ★ 用 pointer (= event.pointer)
GestureBinding.instance.gestureArena.add(pointer, this); // ★ 用 pointer
```

**Dart 框架内部全部用 `event.pointer`(= native 生成的 `pointer_identifier`),完全不用 `event.device`**。`event.device` 在 framework 里只在少数地方读(比如区分鼠标/触摸用于 cursor 显示),业务代码也基本不需要关心它 —— 你写 `Listener(onPointerDown: ...)` 拿到的 `event.pointer` 就是那个一直自增的 `pointer_identifier`。

#### 5.6.5 一次单指触摸,完整数值追踪

把上面的链路串起来,看一次"按下 → 抬起"全程,每层每个字段实际是什么值:

假设这是 app 启动后第 29 次 kDown 通过 `PointerDataPacketConverter`(也就是 `pointer_` 即将 ++ 到 29 的那一次)。

```
┌───────────────── 用户单指按下 ─────────────────┐
│ Android InputManager → ViewGroup → FlutterView  │
│                                                 │
│ MotionEvent:                                    │
│   actionMasked = ACTION_DOWN                    │
│   getPointerId(0) = 0      ← 系统给第一指的 id  │
│   getToolType(0) = 1       ← TOOL_TYPE_FINGER   │
└─────────────────────────────────────────────────┘
                      ↓
┌───────────── AndroidTouchProcessor ─────────────┐
│ uniquePointerIdByType:                          │
│   = (0 << 3) | 1 = 1                            │
│                                                 │
│ packet.device              = 1                  │
│ packet.pointer_identifier  = 0  (占位)          │
└─────────────────────────────────────────────────┘
                      ↓
┌──── PointerDataPacketConverter::Convert(kDown) ────┐
│ states_.find(1) → end()(第一次见这根手指)         │
│   合成 kAdd → states_[1] = state(0)                │
│ UpdatePointerIdentifier(start_new_pointer=true):    │
│   ++pointer_  → pointer_ = 29                      │
│   state.pointer_identifier = 29                    │
│   states_[1] = state(29)                           │
│   packet.pointer_identifier = 29                   │
│                                                    │
│ 输出 packet:                                       │
│   device = 1                                       │
│   pointer_identifier = 29                          │
└────────────────────────────────────────────────────┘
                      ↓
┌────────── PointerEventConverter.expand ──────────┐
│ PointerDownEvent(                                 │
│   pointer = 29,    ← datum.pointerIdentifier      │
│   device  = 1,     ← datum.device                 │
│ )                                                 │
└───────────────────────────────────────────────────┘
                      ↓
┌─────────────── GestureBinding ───────────────┐
│ _hitTests[29] = hitTestResult                 │
│ pointerRouter.addRoute(29, ...)               │
│ gestureArena.add(29, recognizer)              │
│                                               │
│ 业务代码 onPointerDown(event):                │
│   event.pointer = 29  ← 业务看到这个          │
│   event.device  = 1   ← 业务通常不看          │
└───────────────────────────────────────────────┘
```

**MOVE / UP 阶段**:device 还是 1(states_[1] 一直在),pointer_identifier 沿用 29(`start_new_pointer=false` 不再自增)。Dart 端看到的就是 pointer=29 的一系列 PointerMoveEvent + PointerUpEvent。

**用户抬起后再按下一次**(此时 `pointer_` 已 ++ 到 30):

```
Android pointerId = 0(系统复用)
toolType = 1
device = 1    ← 跟上次一样!但 states_[1] 已被 kRemove 擦掉
pointer_identifier = ++pointer_ = 30   ← 新值
Dart 端 event.pointer = 30
```

第二次触摸的 device 跟上次一模一样(系统第一指就是 0、工具还是手指),**但 Dart 端看到的 event.pointer 升到 30** —— 这就是为什么我们日志里 pointer 字段一直在跳。

#### 5.6.6 为什么要做两层?

直觉上"用同一个 ID 不就完了" —— 但**对状态机和对手势识别器来说,需要的是两件不同的事**:

| 视角 | 关心的问题 | 适合的 ID |
|------|-----------|---------|
| 引擎状态机 | "这根手指/这个工具,我之前是不是在跟踪它?" | `device`(可复用) |
| 手势识别器 | "这是新一段触摸,跟刚才那段是两回事吗?" | `pointer_identifier`(单调递增) |

如果 ID 复用,识别器就要一直担心"我现在状态里是不是还有上一段的残留"。
单调递增的 `pointer_identifier` 让识别器可以**断言每次新 pointer 一定是全新的一段**,代码大幅简化。

---

## 六、Dart Framework 怎么靠 `PointerCancelEvent` 收尾一次手势

走完 native 引擎,事件来到了 Dart 端。`PointerCancelEvent` 在 Dart 这一层的角色比表面看起来重要得多 —— 它是**手势状态机的"清理唤醒事件"**。Cancel 一旦丢失,整个上层状态机就再也回不到 idle。

下面把跟我们这个 bug 相关的状态机一层一层拆开。

### 6.1 `GestureBinding`:`_hitTests` 与 `pointerRouter`

`flutter/lib/src/gestures/binding.dart`:

```dart
final Map<int, HitTestResult> _hitTests = <int, HitTestResult>{};

void _handlePointerEventImmediately(PointerEvent event) {
  HitTestResult? hitTestResult;
  if (event is PointerDownEvent || event is PointerSignalEvent || event is PointerHoverEvent) {
    hitTestResult = HitTestResult();
    hitTestInView(hitTestResult, event.position, event.viewId);
    if (event is PointerDownEvent) {
      _hitTests[event.pointer] = hitTestResult;        // ★ DOWN 写入
    }
  } else if (event is PointerUpEvent || event is PointerCancelEvent) {
    hitTestResult = _hitTests.remove(event.pointer);    // ★ UP/CANCEL 移除
  } else if (event.down) {
    hitTestResult = _hitTests[event.pointer];           // MOVE 复用
  }
  ...
}
```

DOWN 时写入,UP/CANCEL 时移除。如果 cancel 永不到达,`_hitTests[pointer]` 就**永久残留**。
注意这个 map 是 `private` 的,业务代码不能直接观察。但你可以通过 `GestureBinding.instance.pointerRouter.debugRouteCount(pointer)` 间接判断(一个 pointer 仍有 route 通常意味着它在 `_hitTests` 里也还在)。

### 6.2 `GestureRecognizer`:每个识别器各自的 `_trackedPointers`

`flutter/lib/src/gestures/recognizer.dart` 里所有 `OneSequenceGestureRecognizer`(它的子类有 `TapGestureRecognizer`、`HorizontalDragGestureRecognizer`、`ScaleGestureRecognizer` 等)都维护一份自己的 `_trackedPointers`:

```dart
abstract class OneSequenceGestureRecognizer extends GestureRecognizer {
  final Set<int> _trackedPointers = HashSet<int>();

  @protected
  void startTrackingPointer(int pointer, [Matrix4? transform]) {
    GestureBinding.instance.pointerRouter.addRoute(pointer, handleEvent, transform);
    _trackedPointers.add(pointer);
    GestureBinding.instance.gestureArena.add(pointer, this);
  }

  @protected
  void stopTrackingPointer(int pointer) {
    if (_trackedPointers.contains(pointer)) {
      GestureBinding.instance.pointerRouter.removeRoute(pointer, handleEvent);
      _trackedPointers.remove(pointer);
      if (_trackedPointers.isEmpty) {
        didStopTrackingLastPointer(pointer);   // ★★★
      }
    }
  }
}
```

谁来调 `stopTrackingPointer`?各识别器的 `handleEvent` 看到 UP / CANCEL 时调:

```dart
// 例:HorizontalDragGestureRecognizer.handleEvent
if (event is PointerUpEvent || event is PointerCancelEvent) {
  ...
  stopTrackingPointer(event.pointer);
}
```

**所以 cancel 一旦丢:**

1. `_trackedPointers` 里的僵尸永不被移除
2. `didStopTrackingLastPointer` 永不被调用
3. 这个识别器**永远以为自己还在追踪一个手势**

### 6.3 `didStopTrackingLastPointer` —— 手势"收尾"的唯一入口

`didStopTrackingLastPointer` 是手势识别器结束一轮的唯一回调点。**所有手势驱动的动画 / 回调都从这里出发**:

| 识别器 | `didStopTrackingLastPointer` 里做什么 |
|--------|-----------------------------------|
| `TapGestureRecognizer` | 触发 `onTap` / `onTapCancel` |
| `HorizontalDragGestureRecognizer` | 触发 `onEnd(velocity)` 或 `onCancel` |
| `LongPressGestureRecognizer` | 重置内部 timer / state |
| `ScaleGestureRecognizer` | 重置缩放基准 |

业务上构建在这些识别器之上的"**手势驱动动画**"(如下拉刷新、滑动返回、抽屉拖拽)逻辑都是:

```
拖拽中:onUpdate → controller.value = ...
拖拽结束:onEnd → controller.fling() / forward() / reverse()
```

`onEnd` 不触发,`controller` 就停在最后一帧 —— 这就是 §8 我们要展开讲的"动画卡在中间帧"的物理根因。

### 6.4 `Navigator.userGestureInProgress`:手势期间路由状态

`flutter/lib/src/widgets/navigator.dart`:

```dart
int _userGesturesInProgress = 0;
bool get userGestureInProgress => _userGesturesInProgress > 0;

void didStartUserGesture() {
  _userGesturesInProgress += 1;
  ...
  userGestureInProgressNotifier.value = true;
}

void didStopUserGesture() {
  assert(_userGesturesInProgress > 0);
  _userGesturesInProgress -= 1;
  ...
}
```

页面切换型手势(滑动返回)的标准模式:

```
gesture start:  navigator.didStartUserGesture()
gesture update: route.controller.value = ...
gesture end:    navigator.didStopUserGesture()
                route.controller.forward() 或 navigator.pop()
```

`gesture end` 这一步通常是在 `onEnd` 回调里调 `didStopUserGesture()`。如果 `onEnd` 不触发(因为 §6.3 说的 `didStopTrackingLastPointer` 没调),`_userGesturesInProgress` 就一直 +1 没 -1 → `userGestureInProgress == true` 永久卡住。

### 6.5 `GestureArenaManager`:竞技场状态

每个 pointer 进入系统时会被开一个"竞技场"(`GestureArenaManager.add`),所有 `addPointer` 的识别器都注册成 member。
正常情况下:

- DOWN → arena open
- 某个识别器 `accept` → arena 关闭,winner 拿走事件
- UP / CANCEL → `sweep(pointer)` 把 arena 强制关闭

```dart
// GestureArenaManager.sweep
void sweep(int pointer) {
  final _GestureArena? state = _arenas[pointer];
  if (state == null) return;
  ...
  _arenas.remove(pointer);
}
```

**`sweep` 是在 `GestureBinding._handlePointerEventImmediately` 里 UP/CANCEL 之后被调的**。Cancel 没到 → sweep 没调 → 这个 pointer 的 arena 永远开着。

虽然 arena 卡住通常不会直接锁死新手势(新 DOWN 会开自己的新 arena),但这是验证 bug 是否存在的最强信号 —— **arena 残留的 pointer 永远是僵尸**(§12 诊断方法会用)。

---

# 第三部分:根因深挖 — 三个独立合理的设计为什么叠加成 bug

> **导读**:第二部分讲了"正常情况下"事件怎么走。现在我们把每一层"看起来都很合理但又埋着雷"的设计拎出来,看它们叠在一起怎么塌的。
> §7 讲三件雷,§8 讲塌下来之后用户为什么看到"动画卡 + 点击失灵",§9 讲什么场景会高频踩到。

---

## 七、三个互不兼容的设计

回顾完前面的链路,本 bug 的根因可以浓缩成三件"看起来都很合理"的事:

### 7.1 第一件雷:Android `cancelTouchTarget` 用简化版 obtain → toolType 永远是 UNKNOWN

回顾 §4.3-4.4:`ViewGroup.cancelTouchTarget` 是 Android Framework 在 `removeView` 时为了让 child 有机会清理状态而**自动派一发 ACTION_CANCEL** 的标准机制。

它用的是简化版 `MotionEvent.obtain(downTime, eventTime, action, x, y, metaState)`,源码内部:

```java
pp[0].clear();       // → toolType = TOOL_TYPE_UNKNOWN
pp[0].id = 0;
```

**toolType 默认就是 `TOOL_TYPE_UNKNOWN`(=0)**,跟用户真实手指事件的 `TOOL_TYPE_FINGER`(=1) 不同。

这个机制 Android 早期就有,toolType 那时候根本不是事件的核心字段。**单独看,这一处设计完全合理** —— 它的契约只是"派发一个 cancel 信号给 child",从来没承诺能完整还原原始触摸的所有元数据。

### 7.2 第二件雷:Flutter `uniquePointerIdByType` 把 toolType 编进 device id

回顾 §5.3:`AndroidTouchProcessor.uniquePointerIdByType`:

```java
return (event.getPointerId(pointerIndex) << TOOL_TYPE_BITS)
    | (event.getToolType(pointerIndex) & TOOL_TYPE_MASK);
```

这个改动来自 [flutter/flutter#160144](https://github.com/flutter/flutter/issues/160144)(2024 年):某些屏幕镜像工具会让同一个 pointerId 报告不同 toolType,导致 Flutter 内部状态机错乱。修复方法是**把 toolType 编进 device id**,让 (pointerId, toolType) 不同的组合在 Flutter 看来就是不同的 pointer。

**单独看,这一处设计也完全合理** —— 它解决了一个真实存在的兼容性问题。

但它和第一件雷一拼接,神奇的事情发生了:

| 事件 | `getPointerId(0)` | `getToolType(0)` | 编码后 device |
|------|-------------------|------------------|--------------|
| 用户真实 ACTION_DOWN | 0 | TOOL_TYPE_FINGER (=1) | `(0<<3)\|1` = **1** |
| 用户真实 ACTION_MOVE | 0 | TOOL_TYPE_FINGER (=1) | **1** |
| ViewGroup 合成的 ACTION_CANCEL | 0 | **TOOL_TYPE_UNKNOWN (=0)** | `(0<<3)\|0` = **0** |

**用户的整套手势在 Flutter 引擎看来 device=1,但 Android 派来收尾的 cancel 在引擎看来 device=0**。

### 7.3 第三件雷:`PointerDataPacketConverter` kCancel 分支"没有 else 的 if"

回顾 §5.5:其他 change(kDown / kUp / kRemove)都遵循"先查 `states_.find(device)`,在存在的前提下处理"的对称模式。
`kCancel` 看起来"应该"也是这样 —— 但它不是:

```cpp
case PointerData::Change::kCancel: {
    // Android's three finger gesture will send a cancel event
    // to a non-existing pointer. Drops the cancel if pointer
    // is not previously added.
    // https://github.com/flutter/flutter/issues/20517
    auto iter = states_.find(pointer_data.device);
    if (iter != states_.end()) {
        PointerState state = iter->second;
        FML_DCHECK(state.is_down);
        UpdatePointerIdentifier(pointer_data, state, false);

        if (LocationNeedsUpdate(pointer_data, state)) {
            // 位置不一致先合成一个 MOVE
            PointerData synthesized_move_event = pointer_data;
            synthesized_move_event.change = PointerData::Change::kMove;
            synthesized_move_event.synthesized = 1;
            UpdateDeltaAndState(synthesized_move_event, state);
            converted_pointers.push_back(synthesized_move_event);
        }

        state.is_down = false;
        states_[pointer_data.device] = state;
        converted_pointers.push_back(pointer_data);
    }
    // ★★★ 注意!没有 else!iter == end() 时整发 cancel 被静默丢弃!
    break;
}
```

注释写得很清楚:这是 Flutter 故意的。
[#20517](https://github.com/flutter/flutter/issues/20517)(2018 年) 报告"Android 三指手势会给一个没添加过的 pointer 发 cancel",引擎选择**遇到没见过 device 的 cancel 直接吃掉**。

**单独看,这一处设计也合理** —— 在 2018 年的环境下:
- 当时 device id == pointerId
- 合成 cancel 的 pointerId = 0,而 ADD/DOWN 的 pointerId 也是 0
- 同一个 device id,`states_.find(0)` 必然找得到,cancel 不会被吞

> 2024 年加入 `uniquePointerIdByType` 后,这条假设悄悄破裂了:
> ADD/DOWN 的 device = (0<<3)|1 = 1,
> cancel 的 device = (0<<3)|0 = 0,
> `states_.find(0)` 必然找不到,**cancel 必然被吞**。

两个独立 commit,各自看都对,**合在一起就是一个静默 bug**。这就是软件演化最隐蔽的一类问题:**不变量(invariant)被默默打破而没人察觉**。

### 7.4 全链路时序图

把三处雷叠起来,事件从用户手指走到"被丢"的完整流程:

```
┌────────────────────────────────────────────────────────────────────────────┐
│ Android Framework                                                           │
│                                                                             │
│  parent.removeView(flutterView)                                             │
│    ↓                                                                        │
│  cancelTouchTarget(flutterView)                                             │
│    ↓                                                                        │
│  MotionEvent.obtain(now, now, ACTION_CANCEL, 0, 0, 0)  ← 简化版 obtain      │
│    └─ PointerProperties.clear() → toolType = TOOL_TYPE_UNKNOWN  (= 0)       │
│    ↓                                                                        │
│  flutterView.dispatchTouchEvent(cancelEvent)                                │
└────────────────────────────────────────────────────────────────────────────┘
                                ↓
┌────────────────────────────────────────────────────────────────────────────┐
│ Flutter Embedding (Android Java)                                            │
│                                                                             │
│  FlutterView.onTouchEvent(cancelEvent)                                      │
│    ↓                                                                        │
│  AndroidTouchProcessor.onTouchEvent                                         │
│    └─ uniquePointerIdByType: device = (pointerId<<3) | toolType            │
│           = (0 << 3) | 0 = 0  ← 这里!toolType=UNKNOWN 让 device 错位       │
│    ↓                                                                        │
│  renderer.dispatchPointerDataPacket → JNI                                   │
└────────────────────────────────────────────────────────────────────────────┘
                                ↓
┌────────────────────────────────────────────────────────────────────────────┐
│ Flutter Engine (native, C++)                                                │
│                                                                             │
│  PointerDataPacketConverter::Convert                                        │
│    └─ case kCancel:                                                         │
│         iter = states_.find(0)                                              │
│           - states_ 里只有 device=1(用户 DOWN/MOVE 注册的)                 │
│           - find 返回 end() → "没见过这个 device"                           │
│         iter == end() → if 不成立,没有 else → ★ cancel 被丢弃 ★            │
└────────────────────────────────────────────────────────────────────────────┘
                                ↓
┌────────────────────────────────────────────────────────────────────────────┐
│ Flutter Framework (Dart)                                                    │
│                                                                             │
│  GestureBinding.dispatchEvent: 永远收不到 PointerCancelEvent                │
│    ↓                                                                        │
│  (后果展开见 §8)                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

每一处单独看都没问题。**但放在一起,Android 的"标准 cancel"就再也无法到达 Dart 端了**。

---

## 八、卡住的连锁反应 — 用户为什么看到"动画卡半路 + 点击失灵"

`PointerCancelEvent` 在 Dart 端没收到,会塌哪里?基于 §6 我们已经介绍过的 framework 状态机,逐项展开:

### 8.1 `GestureRecognizer._trackedPointers` 永不清空

回顾 §6.2:每个 `OneSequenceGestureRecognizer` 都维护自己的 `_trackedPointers` 集合,它的清理唯一入口是 `handleEvent` 里看到 UP / CANCEL 后调 `stopTrackingPointer`。

cancel 永远到不了 → 所有曾经 `addPointer` 过的识别器,它们的 `_trackedPointers` 里都有这个僵尸 pointer。识别器**永远以为自己还在追踪一个手势**。

### 8.2 `didStopTrackingLastPointer` 永不触发 → 手势驱动动画停在中间帧

回顾 §6.3:`stopTrackingPointer` 里只有当 `_trackedPointers.isEmpty` 时才会调 `didStopTrackingLastPointer`,而这是手势识别器**唯一**的收尾入口。

业务代码常见的"手势驱动动画"模式:

```dart
GestureDetector(
  onVerticalDragUpdate: (details) {
    controller.value -= details.primaryDelta! / size.height;  // 拖拽期间更新 controller
  },
  onVerticalDragEnd: (details) {
    if (controller.value > 0.5) {
      controller.forward();    // 收尾:展开
    } else {
      controller.reverse();    // 收尾:收回
    }
  },
)
```

`onVerticalDragEnd` 是 `HorizontalDragGestureRecognizer.didStopTrackingLastPointer` 链路上派出来的回调。
僵尸 pointer 让这个链路永远不触发 → `controller` 停在 `onVerticalDragUpdate` 最后一次设的值上 → **画面停在中间帧**。

抽屉收一半、滑动返回卡半透明、下拉刷新转圈不消失 …… 这些"动画卡半路"现象,机制全部是这个。

### 8.3 `Navigator.userGestureInProgress` 永久 true → 路由动画失效

回顾 §6.4:`Navigator.didStopUserGesture()` 通常是在手势收尾的回调里调用的:

```dart
// 典型的滑动返回手势 controller
void _handleDragEnd(DragEndDetails details) {
  navigator.didStopUserGesture();         // ★ 这一行永远不执行
  if (controller.value > 0.5) {
    navigator.pop();
  } else {
    controller.reverse();
  }
}
```

`onDragEnd` 不触发 → `didStopUserGesture()` 不调 → `_userGesturesInProgress` 永远 +1 没 -1 → `userGestureInProgress == true` 永久卡住。

这个状态下:
- Navigator 拒绝某些后续 transition
- Hero 动画异常
- 路由动画停止收尾,**用户看到的就是"页面定格在半透明/半移动状态"**

### 8.4 `GestureArenaManager._arenas[pointer]` 永不 sweep

回顾 §6.5:arena 关闭的最后一步 `sweep` 也是在 UP / CANCEL 之后调的。cancel 没到 → sweep 没调 → 这个 pointer 的 arena 永远开着。

虽然 arena 卡住通常不会直接锁死新手势(新 DOWN 会开自己的新 arena),但残留的 arena entry 是**验证 bug 存在最强、最直接的信号** —— 它对应着一个永远不结束的"竞技回合"。

### 8.5 业务的 hit test / 自定义路由层

如果业务方有自己的 hit test 缓存(比如某些定制 binding 维护着 `_hitTests` / `allTouches` 集合),这些状态也会因为 cancel 缺失而残留。后续手势的事件分发时,可能因为僵尸 pointer 把新事件错误地"merge"进旧链路,**表现就是点击没反应**。

### 8.6 总表:每个状态卡住对应用户感知到什么

| 卡住的状态 | 用户感知到的现象 |
|-----------|-----------------|
| `GestureRecognizer._trackedPointers` 不空,`didStopTrackingLastPointer` 不调 | 拖拽 / 滑动手势的 `onEnd` 永不触发,业务动画停在中间帧 |
| `Navigator.userGestureInProgress` 永久 true | 页面路由动画停止收尾;Hero 异常;后续无法响应点击事件 |
| `GestureArenaManager._arenas[pointer]` 残留 | 验证 bug 存在的最直接信号(§12 诊断方法会用) |
| `GestureBinding._hitTests[pointer]` 残留 | 旧 hit test 缓存仍在,某些自定义 binding 会基于这条状态做错误决策 |
| 业务方自定义 binding 的 `_hitTests` / `allTouches` 残留(若有) | 后续 hit test 派发链异常,可能导致点击事件被错误地 "merge" 进僵尸链路,表现就是**点击没反应** |

**你看到的"卡死"不是单一机制,而是上面所有状态同时卡住造成的复合现象**。

---

## 九、为什么"reparent FlutterView"是这个 bug 的"放大器"

普通 Flutter 应用很难触发这个 bug:**`FlutterView` 通常一直挂在同一个 `ViewGroup` 下,`removeView` 极少发生**。Activity 销毁会拆,但那是进程/页面级别的事件,用户已经离开当前界面了,卡死与否不重要。

真正高发的场景是:**单 Engine 多宿主架构**。即一个 `FlutterEngine` 实例对应一个 `FlutterView` 实例,这个 `FlutterView` 在多个父容器之间来回搬家(避免每次都重启 Engine,启动开销动辄数百毫秒)。

这种架构下:

1. 用户在 Flutter 区域按下 → Android `mFirstTouchTarget` 登记 `flutterView` → Flutter Engine 分配 device id = 1
2. 业务层(因为路由切换、动画收尾、Tab 切换、抽屉收起等任何原因)调用 `oldParent.removeView(flutterView)` → Android 派出合成 CANCEL
3. **此时用户手指还按着、`ACTION_UP` 还没到 FlutterView**
4. CANCEL 被静默丢弃 → 僵尸诞生

如果搬家发生得**频繁、且每次都在用户尚未抬手时触发**,僵尸会一个接一个累积,直到某次手势再也无法识别,业务卡死。

---

# 第四部分:修复方案与验证

## 十、修复方案

### 10.1 修复点选择

有四个可下手的地方,按修复点距离根因从近到远:

| 修复点 | 优劣 |
|--------|------|
| Android Framework 的简化版 obtain | 改不了(系统代码) |
| Flutter Engine `AndroidTouchProcessor` | 一般接入方不应/不会魔改 Flutter 源码 |
| **业务自定义的 `MyFlutterView`(继承 `FlutterView`)** | **改动小、命中精准、不影响其他 case** |
| Dart 端 binding 兜底清 zombie | 语义弱、可能 race、改动散 |

最推荐的是**继承 `FlutterView` 写一个 `MyFlutterView`,在 `dispatchTouchEvent` 拦截"Android 合成的 cancel"特征事件**,把 `toolType` 改成 `TOOL_TYPE_FINGER` 后再下放给 `super`。

### 10.2 命中条件

精准识别"`ViewGroup.cancelTouchTarget` 合成的那种 cancel"必须三个条件全满足:

1. `actionMasked == ACTION_CANCEL`
2. `pointerCount == 1`(简化版 obtain 永远只能一个 pointer)
3. `getToolType(0) == TOOL_TYPE_UNKNOWN`(简化版 obtain 默认值)

**这三个条件加起来唯一对应"Android 合成 cancel"这个 case**。
真实用户用手指/笔/鼠标产生的 cancel 一定带正确 toolType,绝不会同时满足 2 + 3。

### 10.3 重建事件

我们用 `MotionEvent.obtain` 的**长版**(接收 `PointerProperties[]` 和 `PointerCoords[]` 数组的那个),手动给 `toolType` 赋 `TOOL_TYPE_FINGER`:

```kotlin
class MyFlutterView : FlutterView {

    override fun dispatchTouchEvent(event: MotionEvent): Boolean {
        val patched = maybePatchSyntheticCancel(event)
        if (patched == null) {
            return super.dispatchTouchEvent(event)
        }
        return try {
            super.dispatchTouchEvent(patched)
        } finally {
            patched.recycle()   // patched 是我们自己 obtain 的,需要回收
        }
    }

    /**
     * Android `ViewGroup.cancelTouchTarget` 在 removeView 期间合成的 ACTION_CANCEL
     * toolType 默认是 TOOL_TYPE_UNKNOWN,会让 Flutter Engine 因 device id 错位而静默丢弃。
     * 这里把它重建成 toolType = TOOL_TYPE_FINGER,与之前的 DOWN/MOVE 一致。
     *
     * 命中条件三连(全部满足才 patch),保证不会误伤真实用户事件:
     *   1. actionMasked == ACTION_CANCEL
     *   2. pointerCount == 1
     *   3. toolType(0) == TOOL_TYPE_UNKNOWN
     */
    private fun maybePatchSyntheticCancel(event: MotionEvent): MotionEvent? {
        if (event.actionMasked != MotionEvent.ACTION_CANCEL) return null
        if (event.pointerCount != 1) return null
        if (event.getToolType(0) != MotionEvent.TOOL_TYPE_UNKNOWN) return null

        val props = MotionEvent.PointerProperties().apply {
            id = event.getPointerId(0)
            toolType = MotionEvent.TOOL_TYPE_FINGER
        }
        val coords = MotionEvent.PointerCoords().also { event.getPointerCoords(0, it) }

        return MotionEvent.obtain(
            event.downTime, event.eventTime, MotionEvent.ACTION_CANCEL,
            1, arrayOf(props), arrayOf(coords),
            event.metaState, event.buttonState,
            event.xPrecision, event.yPrecision,
            event.deviceId, event.edgeFlags,
            event.source, event.flags
        )
    }
}
```

### 10.4 修复后链路

```
Android cancelTouchTarget → 合成 cancel(toolType=UNKNOWN)
   ↓
MyFlutterView.dispatchTouchEvent
   ↓ maybePatchSyntheticCancel
重建 cancel(toolType=FINGER)
   ↓ super
ViewGroup.dispatchTouchEvent → FlutterView.onTouchEvent
   ↓
AndroidTouchProcessor.uniquePointerIdByType:(0<<3)|1 = 1  ← 跟 DOWN/MOVE 一致
   ↓
PointerDataPacketConverter:states_.find(1) ✓
   ↓
PointerCancelEvent 派到 Dart
   ↓
GestureBinding._hitTests / GestureRecognizer 状态机正常清理 ✓
   ↓
didStopTrackingLastPointer 触发 → 动画收尾 / 用户手势结束信号正常派发 ✓
```

### 10.5 为什么只改 `toolType` 就够了?—— `pointerId` 是怎么"巧合一致"的

回头看 `uniquePointerIdByType`:

```java
return (event.getPointerId(pointerIndex) << TOOL_TYPE_BITS)
    | (event.getToolType(pointerIndex) & TOOL_TYPE_MASK);
```

device 字段拼起来是 `(pointerId << 3) | toolType`,**两个字段都参与编码**。我们的修复只改了 `toolType`,那 `pointerId` 那部分难道天然就对吗?

打开 `MotionEvent.java`,看简化版 obtain 实际怎么填 `PointerProperties`:

```java
public static MotionEvent obtain(long downTime, long eventTime, int action,
        float x, float y, ...) {
    MotionEvent ev = obtain();
    synchronized (gSharedTempLock) {
        ensureSharedTempPointerCapacity(1);
        final PointerProperties[] pp = gSharedTempPointerProperties;
        pp[0].clear();        // → id = INVALID_POINTER_ID, toolType = TOOL_TYPE_UNKNOWN
        pp[0].id = 0;         // ← ★ 紧接着把 id 强制覆盖为 0
                              //   toolType 没被重新赋值,保持 clear() 留下的 UNKNOWN
        ...
    }
}
```

`pp[0].id = 0` 是**硬编码**。这条 cancel 不管什么场景下被合成,`getPointerId(0)` 永远是 0。

那真实用户事件的 `pointerId` 是多少?Android 系统给屏幕上的每根手指分配 pointerId,**第一指从 0 开始递增**:

| 触摸顺序 | 系统分配的 pointerId |
|---------|---------------------|
| 第一根手指 ACTION_DOWN | 0 |
| 第二根手指 ACTION_POINTER_DOWN | 1 |
| 第三根手指 ACTION_POINTER_DOWN | 2 |
| ...第一根手指抬起... | (id=0 释放) |
| 之后再按下一根手指 | 0(系统会复用最小空缺) |

也就是说,**只要场景是"单指触摸期间 reparent FlutterView"**,用户那根手指的 pointerId 就是 0,跟简化版 obtain 硬编码的 0 **巧合一致**。

所以我们这个 case 里:

| 字段 | 用户真实 DOWN/MOVE | Android 合成 CANCEL | 是否一致 |
|------|-------------------|--------------------|---------|
| `getPointerId(0)` | 0(系统分配第一指) | 0(`pp[0].id = 0` 硬编码) | ✓ 一致 |
| `getToolType(0)` | TOOL_TYPE_FINGER (1) | TOOL_TYPE_UNKNOWN (0) | ✗ **错位** |
| `device = (id<<3)\|toolType` | `(0<<3)\|1 = 1` | `(0<<3)\|0 = 0` | ✗ **错位** |

device 字段错位**只发生在 toolType 这 3 个低位上**。修好 toolType,高位 pointerId 部分本来就对,整个 device 字段就跟用户的 DOWN/MOVE 重新对齐了。

### 10.6 修复方案的局限:多指场景

上面这条"巧合一致"只在**单指**场景下成立。如果用户用了两根手指:

```
第一指 DOWN  pointerId=0  toolType=FINGER  → device = (0<<3)|1 = 1
第二指 DOWN  pointerId=1  toolType=FINGER  → device = (1<<3)|1 = 9
```

引擎 `states_` 里同时有 device=1 和 device=9 两个 entry。

这时候触发 reparent → `cancelTouchTarget` 合成 cancel:

```
合成 CANCEL  pointerId=0  toolType=UNKNOWN  → device = 0
```

**简化版 obtain 永远只能合成 `pointerCount=1, pointerId=0` 的事件**(从源码看 `ensureSharedTempPointerCapacity(1)` 写死 capacity=1,`pp[0].id = 0` 写死 id),**根本没有能力表达"取消多个 pointer"**。

这意味着:

- 即使我们 patch 修好了 toolType,这一发 cancel 也只能"清理 device=1 那一个 pointer"
- device=9 的那个 pointer 在引擎和 framework 里依然永远卡住
- 这是 **Android Framework 自己的设计限制**,不是我们 patch 能修的

所以 §10.2 的命中条件**第二条 `pointerCount == 1`** 既是"识别 Android 合成 cancel 的特征",也是"承认这个 patch 的能力边界"。多指 reparent 场景的 cancel 丢失需要架构层规避(等 ACTION_UP 后再 reparent,或在 reparent 前主动派一发完整的多指 cancel)。

好消息是:**实际业务里 reparent 多发生于"用户单指拖拽返回"这种场景**,多指期间 reparent 极罕见。本 patch 已能覆盖 99% 的现场。

---

## 十一、验证

### 11.1 验证日志要点

复现路径(在用户手指还按住时触发 reparent)跑一次,期待看到:

```
[MyFlutterView]      patched synthetic CANCEL toolType UNKNOWN→FINGER
[MyFlutterView]      dispatchTouchEvent action=CANCEL toolType=1 patched=true
[GestureBinding]     dispatchEvent: pointer=N, type=PointerCancelEvent  ← 关键!
                     之后 Listener.onPointerCancel 被业务收到
```

修复前(同样的路径):

```
[MyFlutterView]      dispatchTouchEvent action=CANCEL ...
                     之后 Dart 端 200ms 内静默,无 PointerCancelEvent
[新一次 PointerDown] hits=[N] touches=[N]   ← 僵尸 N 永久残留
```

### 11.2 验证矩阵

| 场景 | 期望行为 |
|------|---------|
| 用户手指按住期间 reparent FlutterView | 修复后 Dart 端立刻收到 PointerCancelEvent;后续手势不带僵尸 |
| 用户用真实物理 cancel(电源键 lock 屏、电话来电等) | toolType 是真实值(FINGER/STYLUS/MOUSE),不命中 patch 条件,事件原样下放 |
| 三指手势 cancel | pointerCount > 1,不命中 patch 条件,事件原样下放 |
| 鼠标/触控笔模式下 reparent | toolType 是 MOUSE/STYLUS,不命中 patch 条件;Engine 行为依赖具体设备(本 patch 只解决 finger 路径) |

---

## 十二、诊断方法 — 怎么知道你当前是不是踩到了这个 bug

如果你看到"动画卡在半路 + 点击失灵"的现象,但不确定是不是这个 bug,可以按下面顺序排查。
**这一节给的是通用 Flutter 接入都能用的诊断手段,跟具体业务无关**。

### 12.1 第一信号:Android 侧 cancel 是不是合成的

在自定义 `MyFlutterView.dispatchTouchEvent` 入口加一行日志:

```kotlin
override fun dispatchTouchEvent(event: MotionEvent): Boolean {
    if (event.actionMasked == MotionEvent.ACTION_CANCEL) {
        Log.i("Diag", "CANCEL pointerCount=${event.pointerCount} " +
                "toolType=${event.getToolType(0)} " +     // 0=UNKNOWN, 1=FINGER, ...
                "parent=${parent?.javaClass?.simpleName}")
    }
    return super.dispatchTouchEvent(event)
}
```

**判定**:

- 看到 `toolType=0`(`TOOL_TYPE_UNKNOWN`)的 cancel,且发生时机在 reparent 前后 → 100% 命中本 bug 触发条件。
- 真实用户 cancel(锁屏/打断/三指)的 toolType 一定是 `1/2/3/4` 中的一个,不会是 0。

### 12.2 第二信号:Dart 端 cancel 有没有被 engine 吞

自定义一个 `WidgetsFlutterBinding`,重写 `dispatchEvent` 打日志:

```dart
class DiagnosticBinding extends WidgetsFlutterBinding {
  static WidgetsBinding ensureInitialized() {
    if (WidgetsBinding._instance == null) {
      DiagnosticBinding();
    }
    return WidgetsBinding.instance;
  }

  @override
  void dispatchEvent(PointerEvent event, HitTestResult? hitTestResult) {
    if (event is PointerDownEvent
        || event is PointerUpEvent
        || event is PointerCancelEvent) {
      // 调 super 之前先记录路由数,super 之后再读一次,看路由是否被清掉
      final before = pointerRouter.debugRouteCount(event.pointer);
      super.dispatchEvent(event, hitTestResult);
      final after = pointerRouter.debugRouteCount(event.pointer);
      debugPrint('[Diag] ${event.runtimeType} pointer=${event.pointer} '
          'routes ${before} → ${after}');
    } else {
      super.dispatchEvent(event, hitTestResult);
    }
  }
}
```

> `pointerRouter` 是 `GestureBinding.instance.pointerRouter`,公开访问。
> `debugRouteCount(pointer)` 是 `@visibleForTesting` 暴露的方法,可以直接用。

**判定**:

- Android 侧看到 `ACTION_CANCEL` 进了 `dispatchTouchEvent`(§12.1)
- 但 Dart 侧**没有**对应 `PointerCancelEvent` 这条日志
- 而且新手势的 `[Diag] PointerDownEvent pointer=X routes 0 → N` 之后,这个 N 永远不回到 0

**→ 引擎吞 cancel 已确认**。结合 §12.1 的 `toolType=0` 现象,根因坐实是本 bug。

### 12.3 第三信号:GestureArena 里有没有"长寿"的 pointer

Flutter 自带一个 debug flag 直接看 arena 内部:

```dart
import 'package:flutter/gestures.dart';

void main() {
  debugPrintGestureArenaDiagnostics = true;   // 打开就行
  runApp(MyApp());
}
```

打开后,每次 arena 的 add / accept / reject / sweep 都会打日志。
**判定**:正常情况下,每个 pointer 应该在毫秒级走完 add → close/sweep 的生命周期。
如果你看到某个 pointer 只有 `add` 没有 `sweep`,而后续别的 pointer 不断进来,这个"长寿 pointer" 就是僵尸。

类似的还有:

```dart
debugPrintHitTestResults = true;          // 打印每次 hit test 的结果
debugPrintRecognizerCallbacksTrace = true; // 打印手势识别器的 callback 调用栈
```

线上代码记得用 `assert(() { debugPrintGestureArenaDiagnostics = true; return true; }());` 包起来,只在 debug build 生效。

### 12.4 第四信号:`Navigator.userGestureInProgress` 永久卡住

如果业务有"滑动返回"或类似手势驱动路由,挂一个监听:

```dart
final navigatorKey = GlobalKey<NavigatorState>();

navigatorKey.currentState!.userGestureInProgressNotifier.addListener(() {
  debugPrint('[Diag] userGestureInProgress = '
      '${navigatorKey.currentState!.userGestureInProgress}');
});
```

**判定**:正常情况下 `false → true → false` 是一个完整闭环。
如果看到 `false → true` 之后**永远不再回到 false**,即使用户已经抬手了,就是僵尸 pointer 让 `didStopUserGesture` 没机会调。
**这个信号最直接对应"页面动画卡在中间"的视觉现象**。

### 12.5 一份完整的 checklist

复现期间观察,符合越多项越确诊:

- [ ] §12.1:Android 侧抓到 `ACTION_CANCEL` 且 `toolType=0`、`pointerCount=1`
- [ ] §12.2:Dart 侧 `dispatchEvent` 没有对应的 `PointerCancelEvent`,`pointerRouter.debugRouteCount` 不回 0
- [ ] §12.3:`debugPrintGestureArenaDiagnostics` 看到某 pointer 只 add 没 sweep
- [ ] §12.4:`Navigator.userGestureInProgressNotifier` 卡在 true 不下来
- [ ] 现象:动画停在中间帧 + 后续点击失效

5 项至少符合 3 项 → 100% 是本文这个 bug,直接上修复方案 §10。

---

# 第五部分:反思与延伸

## 十三、教训与延伸

### 13.1 软件不变量(invariant)的隐式破坏

引擎的 cancel 丢弃逻辑写于 2018 年,前提假设是"device id == pointerId"。
2024 年 `uniquePointerIdByType` 引入后,这条假设被悄悄打破,但没人想到要去 review `pointer_data_packet_converter.cc` 的 cancel 分支。

**经验**:

- 在某个核心结构上加 hash/编码改变其取值空间时,要主动 grep 所有用这个结构作 key 的位置,确认它们的不变量是否还成立。
- 单元测试很重要,但单元测试只能覆盖你想得到的 case。这个 bug 的具体触发条件是"toolType=UNKNOWN 的 cancel + 之前已有 toolType=FINGER 的 down",写测试的人不会主动去测这个组合。

### 13.2 排查方法论

回顾我们的排查路径:

1. **先观察现象,把"卡死"具象化**:不是"屏幕没反应",而是"特定 pointer 永远在 hit test 状态里"。这一步把模糊的"卡死"变成了具体可查询的状态。
2. **沿事件流向上回溯**:从 Dart `_hitTests` → Flutter framework → Engine native → Embedding Android → ViewGroup 派发,一层一层走,**每层都假设它是好的,直到日志/代码证明不是**。
3. **不要猜**:中途有过一个"surface swap 中间态导致 packet 丢"的猜测,后来证实 `dispatchPointerDataPacket` 是同步 JNI、跟 surface 状态无关。**当怀疑某个边界时,去读那条边界两端的源码**,不要凭印象。
4. **加日志的位置很重要**:在事件流的"分叉口"加日志(`dispatchTouchEvent` 入口、`onTouchEvent` 入口、Dart 端 `dispatchEvent` 入口、cancel 后置探针),可以快速判断 packet 在哪一段消失了。
5. **承认错误,重新读代码**。错的判断只要读代码就能纠正。

### 13.3 修复设计原则

我们的 patch 满足:

- **离根因近**:在事件被解析前就修 toolType,避免下游层层"补救"。
- **命中条件唯一**:三连必满足,不会误伤真实事件。
- **完全可逆**:patch 只重建一个事件、不改全局状态。
- **不依赖 race 假设**:不需要假设"新 down 来时一定无残留"。
- **本地化**:改一个文件、一个方法,review 容易。

如果换成"在 Dart 端检测残留 pointer 后合成 cancel 清除"的兜底方案,虽然也能修复,但:
- 需要假设 race 不存在(实际可能在 down 还没派完时 zombie 就影响了 hit test)
- 改的是 framework binding,影响面比一个 Android 文件大得多
- 语义上很别扭("我的状态机为什么会有残留呢?因为我假设我会有残留")

**修 bug 的时候,选离根因最近的修复点**。

### 13.4 这个 bug 还教会我们什么

- **不要在用户交互的"半截事件流"中重排视图层级**。如果架构允许,等 `ACTION_UP` 收到后再 reparent;或者在 reparent 之前主动派一个**正确的** `ACTION_CANCEL`。这是从架构层面规避问题的方法,比 patch 修复更彻底。
- **Android Framework 的合成事件,不是天然能跨语言/跨引擎正确解读的**。Android 自己内部知道"toolType=UNKNOWN 是合成 cancel"的隐含语义,但任何下游解析器(Flutter、Compose、其他引擎)都没有义务读出这个约定。
- **`PointerCancelEvent` 在手势框架里不是"可有可无"的事件,它是状态机收尾的唯一钥匙**。任何吞掉 cancel 的设计(无论是 cancelTouchTarget 这一端,还是 PointerDataPacketConverter 那一端)都需要在另一端有补偿机制。本 bug 就是双方都假设对方会处理好,结果谁都没处理。
- **接入第三方引擎时,继承宿主层 View 加一层 thin wrapper 是值得的**。我们这个 patch 之所以能干净地落地,就是因为接入方原本就有 `MyFlutterView extends FlutterView` 这一层,可以在最早的入口拦截事件。如果直接用原生 `FlutterView`,要么得 hook InputManager 要么得改宿主路由,都是更大的改动。

---

## 十四、相关 Issue / Commit

- [flutter/flutter#20517](https://github.com/flutter/flutter/issues/20517) —— Engine 丢弃孤立 cancel 的来源(2018)
- [flutter/flutter#160144](https://github.com/flutter/flutter/issues/160144) —— `uniquePointerIdByType` 把 toolType 编入 device 的来源(2024)
- 关键文件参考:
  - `frameworks/base/core/java/android/view/ViewGroup.java`(`cancelTouchTarget`)
  - `frameworks/base/core/java/android/view/MotionEvent.java`(简化版 `obtain`、`PointerProperties.clear`)
  - `flutter/shell/platform/android/.../FlutterView.java`(`onTouchEvent` / `isAttachedToFlutterEngine`)
  - `flutter/shell/platform/android/.../AndroidTouchProcessor.java`(`uniquePointerIdByType`)
  - `flutter/lib/ui/window/pointer_data_packet_converter.cc`(`kCancel` 没有 else 的 if)
  - `flutter/packages/flutter/lib/src/gestures/binding.dart`(`GestureBinding._hitTests` / `_handlePointerEventImmediately`)
  - `flutter/packages/flutter/lib/src/gestures/recognizer.dart`(`OneSequenceGestureRecognizer._trackedPointers` / `stopTrackingPointer`)
  - `flutter/packages/flutter/lib/src/gestures/arena.dart`(`GestureArenaManager.sweep`)
  - `flutter/packages/flutter/lib/src/widgets/navigator.dart`(`Navigator.didStartUserGesture` / `didStopUserGesture`)

---

## 附录:从 0 开始读懂 `MotionEvent` 的几个字段

| 字段 | 含义 | 典型值 |
|------|------|--------|
| `actionMasked` | 操作类型 | `ACTION_DOWN` / `ACTION_MOVE` / `ACTION_UP` / `ACTION_CANCEL` / `ACTION_POINTER_DOWN` / `ACTION_POINTER_UP` |
| `actionIndex` | 多指事件中,这个 action 是关于哪一根手指的 | `0`(主指)/ `1`(第二指)/ ... |
| `pointerCount` | 当前在屏幕上的手指数 | 1 或多 |
| `getPointerId(idx)` | 第 `idx` 根手指在 Android 看来的 id(系统给的稳定 id,跨事件不变) | 0, 1, 2... |
| `getToolType(idx)` | 第 `idx` 根手指是什么"工具" | `TOOL_TYPE_FINGER`(1)/ `TOOL_TYPE_STYLUS`(2)/ `TOOL_TYPE_MOUSE`(3)/ `TOOL_TYPE_ERASER`(4)/ `TOOL_TYPE_UNKNOWN`(0) |
| `downTime` | 主指最初按下的时间戳 | uptime ms |
| `eventTime` | 这个事件本身的时间戳 | uptime ms |

`PointerProperties` 是 Android 系统用来描述"一根手指属性"的小结构,只有两个字段:`id` 和 `toolType`。
`PointerCoords` 描述位置:`x`、`y`、`pressure`、`size`、`orientation` 等。

`MotionEvent.obtain` 有多个重载,差别在于"你能不能控制 `PointerProperties` / `PointerCoords`":

- `obtain(downTime, eventTime, action, x, y, metaState)` —— 最简化,只能表达单指、坐标、metaState,toolType 永远是 UNKNOWN。**本文 bug 的根源**。
- `obtain(downTime, eventTime, action, pointerCount, properties[], coords[], ...)` —— 长版,可控所有字段。我们 patch 用的就是这个。
- `obtain(MotionEvent other)` —— 完全复刻一个事件,常用于"我想拷贝并修改"。
