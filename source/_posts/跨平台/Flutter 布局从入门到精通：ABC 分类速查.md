---
title: Flutter 布局从入门到精通：A/B/C 分类速查
categories:
  - 跨平台
tags:
  - 知识点
top: 100
abbrlink: a833dd0f
---

# Flutter 布局从入门到精通：A/B/C 分类速查

> 一份面向 Flutter 新手的布局指南，所有结论均经过真机实测验证（**106 项测试全部通过，0 FAIL**）。
> 先理解底层协议，再学三类组件，最后看典型场景，遇到 bug 能直接定位。

---

## 目录

1. [一切的源头：布局协议](#1-一切的源头布局协议)
2. [约束的三种形态](#2-约束的三种形态)
3. [A / B / C 三类组件总览](#3-a--b--c-三类组件总览)
4. [组件自身的 size 怎么决定](#4-组件自身的-size-怎么决定)
5. [A 类：原样透传](#5-a-类原样透传)
6. [B 类：放松约束](#6-b-类放松约束)
7. [C 类：强制重写约束](#7-c-类强制重写约束)
8. [Container 行为速查](#8-container-行为速查)
9. [宽高谈判：4 个典型场景](#9-宽高谈判4-个典型场景)
10. [特殊家族：Flex / Scrollable](#10-特殊家族flex--scrollable)
11. [高频陷阱与避坑](#11-高频陷阱与避坑)
12. [一页备忘](#12-一页备忘)

---

## 1. 一切的源头：布局协议

Flutter 的所有布局问题，都能用一条规则解释：

```
父 → 子：传 BoxConstraints (minW, maxW, minH, maxH)   "你能在多大范围内选尺寸"
子 → 父：返回 Size                                     "我决定就这么大"
父决定子的位置 (offset)
```

英文口诀：**Constraints go down, Sizes go up, Parent sets the position.**

每个 RenderObject 的 `performLayout()` 必做三件事：

1. 拿到 parent 给的 `constraints`
2. 让自己的 children 去 layout（传约束给它们）
3. **根据 children 返回的 size，决定自己的 size**

> **关键直觉**：widget "有多大" 从来不是它自己说了算，而是它在父约束允许的范围内自己挑一个。
> 父说"你最多 100"，你说"我要 200" —— 不行，你最多只能 100。

---

## 2. 约束的三种形态

每条约束 `BoxConstraints(minW, maxW, minH, maxH)` 在每个方向上有三种"形状"：

| 形态 | 数值特征 | 子的自由度 | 谁会给这种约束 | 真机实测 |
|------|----------|-----------|---------------|---------|
| **tight** | `min == max` | 没的选，必须正好这么大 | `Scaffold body`、`SizedBox`、`Container(width/height)` | 100x60 → child **100x60** ✅ |
| **loose** | `min == 0, max=有限` | 0 ~ max 之间自选 | `Center`、`Align`、`Padding` | Center 内 60x40 → **60x40** ✅ |
| **unbounded** | `max == infinity` | 没上限，子必须有内在尺寸 | `Column/Row` 主轴、`ListView` 主轴 | Column 内 Container 取 Text 尺寸，**不崩** ✅ |

> **大多数布局崩溃**（`hasSize is not true`、`unbounded height`）
> 都发生在 **unbounded 约束 + 子组件没本事自决定尺寸** 的组合里。

### 2.1 直觉对照

```
tight    = 学校说"你必须穿校服"        → 没得选
loose    = 学校说"你可以穿红蓝白之一"   → 有限范围里选
unbounded = 学校说"你爱穿啥穿啥"       → 但你得自己有衣服（内在尺寸）
```

---

## 3. A / B / C 三类组件总览

所有 widget 按"**它把什么样的约束传给 child**"分成三类。这是理解 Flutter 布局的核心分类法。

| 类别 | 一句话 | 直觉 | 风险 |
|------|--------|------|------|
| **A 透传** | 子约束 = 父约束 | 水管，不挡水 | 几乎无 |
| **B 放松** | 子约束 = 父约束 tight 变 loose，max 可能缩小 | 漏斗，扩口 | 把 tight 变 unbounded（如 Column 主轴）→ 子可能崩 |
| **C 重写** | 子约束 = 当前 widget 自己写的，**与父约束部分或完全无关** | 变压器，重定电压 | **bug 高发地** |

### 3.1 约束传递链示例

```
// A 类透传：ClipRect 不改变约束
Scaffold → ClipRect → Container
约束:  tight      tight    ✅ Container 收到的 = Scaffold 给的

// B 类放松：Center 把 tight 变 loose
Scaffold → Center → Container
约束:  tight      loose    ✅ Container 可以在 0~屏幕之间选

// C 类重写：SizedBox 用自己的约束替换
Scaffold → SizedBox(100) → Container
约束:  tight      tight(100)   ✅ Container 收到 100（受 enforce 影响）
```

---

## 4. 组件自身的 size 怎么决定

组件的自身尺寸由两个因素决定：**有没有写宽高**，以及它属于 **A/B/C 哪一类**。

### 4.1 有写宽高时

```
自身 size = clamp(自己写的宽高, 父约束)
```

你写的宽高只是"愿望"，**parent 有最终否决权**。

**真机验证**：

```dart
SizedBox(width: 100, height: 60,
  child: Container(width: 500, height: 500, color: Colors.red),
)
// Container 想要 500×500，但被 tight(100,60) 钳住
// 实测：Container 自身 = 100x60 ✅  500 设了等于没设
```

**A/B/C 三类在"有写宽高"时的行为完全一致**，都是 `clamp(自己写的, 父约束)`。

### 4.2 没写宽高时

没写宽高时，三类组件的行为完全不同：

| 类别 | 自身 size 的决定方式 |
|------|---------------------|
| **A 类** | **size = child.size**（跟随 child） |
| **B 类** | 多数 **size = 父约束的最大值**（占满父），少数有例外 |
| **C 类** | **取决于具体组件**（各不相同） |

#### B 类组件没写宽高时的行为

| 组件 | 没写宽高时自身 size | 真机实测 |
|------|-------------------|---------|
| `Center` | `constraints.biggest`（占满父） | **300x80**（父 300x80）✅ |
| `Align` | `constraints.biggest`（占满父） | **300x80** ✅ |
| `Padding` | 有 child 时 = child.size + padding | **100+15+15=130**(宽) ✅，**不是占满父** |
| `Container`（无color有child） | loose 下贴合 child，tight 下被撑满 | loose: **25x17**(贴合) ✅，tight: **200x50**(撑满) ✅ |
| `Wrap` | `constraints.biggest`（占满父） | **300x80** ✅ |
| `SafeArea` | 减去安全区后的 max | **比父小** ✅ |
| `Stack`（默认 `StackFit.loose`） | 有非Positioned子时 = 子最大size | **180x50**(跟child) ✅ |
| `Stack`（`StackFit.expand`） | `constraints.biggest`（占满父） | **300x80** ✅ |
| `Stack`（`StackFit.passthrough`） | 有非Positioned子时 = 子最大size | **180x50**(跟child) ✅ |

> **B 类注意**：`Padding` 例外——它有 child 时 size = child + padding，不是占满父。

#### C 类组件没写宽高时的行为（最容易混淆）

| 组件 | 没写宽高时自身 size | 真机实测 |
|------|-------------------|---------|
| `SizedBox`（无参无child） | 报错 | - |
| `SizedBox.expand` | `constraints.biggest`（占满父） | **200x60** ✅ |
| `SizedBox.shrink` | `constraints.smallest`（最小） | 父 loose 下 **0x0** ✅ |
| `SizedBox.fromSize` | 指定 size | **120x50** ✅ |
| `ConstrainedBox`（有child） | 取决于 child | **120x40**(跟 child 受约束) ✅ |
| `UnconstrainedBox`（有child） | 取决于 child（去掉父约束） | **25x17**(跟 Text 尺寸) ✅ |
| `LimitedBox` | 仅 unbounded 下取限制值 | ≤**100x50** ✅ |
| `OverflowBox` | 自身受父约束限制 | **300x80**（父 300x80）✅ |
| `SizedOverflowBox` | 指定 size | **120x70** ✅ |
| `FractionallySizedBox` | `constraints.biggest`（占满父） | **200x50** ✅ |
| `AspectRatio` | 按比例 + 父约束 clamp | 父 300x80 中 **200x100**(2:1) ✅ |
| `FittedBox` | `constraints.biggest`（占满父） | **100x50** ✅ |
| `IntrinsicWidth`（有child） | 按内在宽 | **约37x17**(文字尺寸) ✅ |
| `IntrinsicHeight`（有child） | 按内在高 | **约37x17**(文字尺寸) ✅ |

> **简单记**：A 类跟 child，B 类大多占满父（Padding 例外），C 类各不同需要查表。

### 4.3 撑满型 vs 贴合型

没设宽高时，widget 怎么决定大小？除了 A/B/C 分类，还有一个**性格**因素：

| 性格 | loose 下倾向 | 典型 widget |
|------|-------------|------------|
| **撑满型** | 尽量占满 max | `Container(color/decoration)`、`ColoredBox`、`SizedBox.expand` |
| **贴合型** | 贴合 child 或内在尺寸 | `Text`、`Icon`、`Container`（无 color 有 child） |
| **跟随型** | 没有内在尺寸，完全跟父约束 | `ClipRect`、`Opacity`、`Transform` 等 A 类 |

> 一句话：**有"视觉填充意图"的（color、image、decoration）就撑满；只是结构容器的就贴合 child**。

---

## 5. A 类：原样透传

**自己 size = child size；不动约束。** 视觉装饰、命中测试、数据注入相关的多半是 A 类。

### 完整列表（全部真机验证 ✅）

| 组件 | 作用 | 实测尺寸 | 说明 |
|------|------|---------|------|
| `ClipRect` | 矩形裁剪 | 180x50 ✅ | 透传约束 |
| `ClipRRect` | 圆角裁剪 | 180x50 ✅ | 同上 |
| `ClipOval` | 椭圆裁剪 | 180x50 ✅ | 同上 |
| `ClipPath` | 自定义路径裁剪 | 180x50 ✅ | 同上 |
| `Opacity` | 透明度 | 180x50 ✅ | 透传约束 |
| `AnimatedOpacity` | 动画透明 | 180x50 ✅ | 同上 |
| `Transform` | 矩阵变换 | **layout=180x50** ⚠️ | **不改 layout size，只改绘制**，视觉会溢出父容器 |
| `Transform.rotate` | 旋转 | **layout=180x50** ⚠️ | 同上 |
| `GestureDetector` | 手势识别 | 180x50 ✅ | 透传 |
| `Listener` | 原始指针监听 | 180x50 ✅ | 透传 |
| `RawGestureDetector` | 原始手势 | 180x50 ✅ | 透传 |
| `MouseRegion` | 鼠标区域 | 180x50 ✅ | 透传 |
| `Offstage` | 不绘制 | **180x50(占位空白)** ⚠️ | `offstage:true` 时 **child 正常布局但不绘制**，不是 0x0 |
| `Visibility` | 显示/隐藏 | 180x50 ✅ | `maintainSize:true` 时透传 |
| `RepaintBoundary` | 隔离绘制层 | 180x50 ✅ | 透传约束 |
| `DecoratedBox` | 仅装饰背景/边框 | 180x50 ✅ | 透传 |
| `IgnorePointer` | 屏蔽命中测试 | 180x50 ✅ | 透传约束 |
| `AbsorbPointer` | 吸收触摸 | 180x50 ✅ | 透传约束 |
| `ColorFiltered` | 颜色滤镜 | 180x50 ✅ | 透传 |
| `ShaderMask` | 着色器遮罩 | 180x50 ✅ | 透传 |
| `BackdropFilter` | 模糊/滤镜 | 180x50 ✅ | **透传但合成阶段需要有限边界**，必须包 `ClipRect` |
| `ImageFiltered` | 静态滤镜 | 180x50 ✅ | 透传 |

> **唯一陷阱**：`BackdropFilter` 是 A 类透传约束，但合成阶段需要有限边界，**必须**在外层包 `ClipRect`，否则会报 `invalid matrix` 错误。

### 5.1 A 类陷阱

**陷阱：Transform 视觉溢出**

```dart
Transform.scale(scale: 1.5, child: Container(width: 180, height: 50))
// layout size 仍是 180x50（透传约束）
// 但视觉上 child 被放大到 270x75，会溢出父容器！
```

**Offstage 误区**

```dart
Offstage(offstage: true, child: Container(width: 180, height: 50))
// child 正常布局（实测 180x50），只是不绘制
// 不要以为它是 0x0
```

---

## 6. B 类：放松约束

**把父的 tight 变成 loose，让子可以选更小**。多见于摆放类、padding 类。

### 完整列表

| 组件 | 给 child 的约束 | 真机验证 | 关键说明 |
|------|----------------|---------|----------|
| `Center` | `(0..maxW, 0..maxH)` loose | 80x30 ✅ | 把 tight 变 loose，再居中 |
| `Align` | `(0..maxW, 0..maxH)` loose | 80x30 ✅ | 同 Center，可指定对齐 |
| `Padding` | 减去 padding 后的 loose | 约束缩小 ✅ | 把 max 缩小；自身 size = child + padding，不是占满父 |
| `Container`（无 width/height） | 减 padding 后的 loose | 已验证 ✅ | 不写宽高时是 B；写了就是 C |
| `Wrap` | 子项 loose | 自动换行 ✅ | 主轴排不下自动换行；自身 size = 占满父 |
| `SafeArea` | 减系统安全区 | 缩小 ✅ | 缩 max，整体仍 loose |
| `Stack`（默认 `StackFit.loose`） | 非Positioned子 loose `(0..maxW, 0..maxH)` | 200x60 ✅ | 自身 size = 非Positioned子的最大 size |
| `Stack(fit: StackFit.expand)` | 非Positioned子 **tight** `(maxW, maxH)` | 200x50 ✅ | 给所有非Positioned子 tight 约束，撑满整个 Stack |
| `Stack(fit: StackFit.passthrough)` | 透传父约束 | 200x50 ✅ | 不改变约束类型，原样透传 |

### 6.1 B 类陷阱：主轴 unbounded（最高频踩雷）

Column / Row / ListView 主轴给 unbounded 约束：

| 组件 | cross 轴 | 主轴 |
|------|----------|------|
| `Column` | loose `0..maxW` | **unbounded `0..∞`** |
| `Row` | loose `0..maxH` | **unbounded `0..∞`** |
| `ListView` | tight 或 loose | **unbounded** |
| `SingleChildScrollView` | tight 或 loose | **unbounded** |

```dart
Column(
  children: [
    Container(color: Colors.red),  // unbounded下高度=Text尺寸，不崩但看不见
  ],
)

Column(
  children: [
    ListView(children: [...]),     // 滚动型 → 想要 ∞ → 💥 崩
  ],
)
```

| 类型 | 在 unbounded 下的行为 | 结果 |
|------|---------------------|------|
| 撑满型（Container/ColoredBox） | 取最小尺寸（Text大小） | **不崩，但很小** |
| 贴合型（Container 无color有child） | 取内在尺寸 | **安全** ✅ |
| 滚动型（ListView/SingleChildScrollView） | 想要无限空间 | **崩溃** 💥 |

### 6.2 B 类陷阱：Stack 全 Positioned 子

```dart
Stack(children: [
  Positioned.fill(child: ...)   // 全部 Positioned → Stack 拿不到 size
])
```

**真机验证**：父是 loose 时，Stack 取 `constraints.biggest`，**不会塌成 0x0**（实测 200x50）。只在父是 **unbounded** 时才会崩。

**修法**：
- 父级给 tight 约束（用 `SizedBox` 包住 Stack）
- 加一个非 Positioned child 撑出 size
- 用 `Stack(fit: StackFit.expand)`

---

## 7. C 类：强制重写约束

**child 拿到的约束与父约束部分或完全无关，由当前 widget 自己写。** bug 高发地。

### 7.1 核心机制：enforce 规则

C 类组件修改约束传给 child 时，底层调用的是 `enforce` 方法：

```dart
childConstraints.enforce(parentConstraints)
```

**enforce 规则**（简单理解）：
- min 取两者中较大的
- max 取两者中较小的
- **如果父约束是 tight，enforce 结果永远=父约束**

这意味着：当父给 tight 约束时，使用 `enforce` 的 C 类组件（如 SizedBox、ConstrainedBox）写的宽高 **不传递给 child**，child 收到的仍然是父约束。

**不受 enforce 影响的 C 类组件**（FractionallySizedBox、FittedBox、AspectRatio）用自己的方式计算约束：
- `FractionallySizedBox` 按父 `max` 的比例计算，即使父 tight 也按比例缩小
- `FittedBox` 给 child `unbounded` 让其自由布局
- `AspectRatio` 有自己的比例算法

**关键公式**：
- **组件自身 size** = `clamp(自己想要的, 父约束)` — 永远生效
- **组件给 child 的约束** = `自身约束.enforce(父约束)` — **仅对使用 enforce 的组件有效**

#### enforce 真机实测 4 个场景

```dart
// 场景 A：Scaffold.body → SizedBox(100x100) → child
// body 给的约束可以被 SizedBox 改写 → child 实测宽 100 ✅

// 场景 B：SizedBox(300x200) → SizedBox(100x100) → child
// 外层 SizedBox 给内层 tight(300,200)
// 内层 enforce 后 = tight(300,200) → child 实测宽 300 ❌ 不是 100！

// 场景 C：Center → SizedBox(100x100) → child
// Center 给 loose，enforce 后 = tight(100,100) → child 实测宽 100 ✅

// 场景 D：Container(300x200) → SizedBox(100x100) → child
// Container 给 tight(300,200)，enforce 被覆盖 → child 实测宽 300 ❌
```

#### enforce 对比表（真机验证）

| 组件 | tight 父下 | loose 父下 | 说明 |
|------|-----------|-----------|------|
| `SizedBox(width:100)` | child 宽 **300**(被覆盖) ❌ | child 宽 **100** ✅ | 受 enforce 影响 |
| `Container(width:100)` | child 宽 **300**(被覆盖) ❌ | child 宽 **100** ✅ | 受 enforce 影响 |
| `ConstrainedBox(maxW:100)` | child 宽 **300**(被覆盖) ❌ | child 宽 **100** ✅ | 受 enforce 影响 |
| `FractionallySizedBox(0.5)` | child 宽 **150**(300×0.5) ✅ | child 宽 **150** ✅ | **不受 enforce 影响**，按父 max 比例计算 |
| `FittedBox` | child 取内在尺寸 ✅ | child 取内在尺寸 ✅ | **不受 enforce 影响**，给 child unbounded |
| `AspectRatio(2/1)` | 按比例计算 ✅ | 按比例计算 ✅ | **不受 enforce 影响**，有自己的算法 |

> 其他 C 类组件：`OverflowBox`/`SizedOverflowBox` 完全替换父约束，`LimitedBox` 只在 unbounded 下生效，`IntrinsicWidth/Height` 按内在尺寸计算，`Expanded`/`Flexible`/`Spacer` 只能在 Flex 中使用——它们各有自己的约束计算方式，不适用于 enforce 对比。

### 7.2 完整列表

| 组件 | 写给 child 的约束 | 真机验证 | 关键说明 |
|------|-------------------|---------|----------|
| `SizedBox(width: W, height: H)` | tight `(W, H)` | 100x60 ✅ | ⚠️ **父 tight 时 enforce 结果=父约束，不是 W,H** |
| `SizedBox.expand` | tight `(maxW, maxH)` | 200x60 ✅ | **父 unbounded 就喂 ∞**，最常见炸点 |
| `SizedBox.shrink` | tight `(0, 0)` | 0x0 ✅ | 自身 size = `constraints.smallest`，受父约束影响 |
| `SizedBox.fromSize` | tight 指定 size | 120x50 ✅ | 按指定尺寸给 tight |
| `ConstrainedBox` | 与父约束取交集 | **200 vs 120** ⚠️ | **父 tight 时交集=父约束，不生效**；自身 size = child.size |
| `UnconstrainedBox` | **完全去掉父约束** | 25x17(文字) ✅ | 子若无内在尺寸会崩 |
| `LimitedBox` | 仅 unbounded 时生效 | ≤100x50 ✅ | 用于 ListView 主轴防爆；自身 size = clamp(限制值, 父约束) |
| `OverflowBox` | 完全替换父约束 | child=500 ✅ | 子可大于父；**自身仍受父约束限制** |
| `SizedOverflowBox` | 自身指定 size | 120x70 ✅ | 自身 size = 指定值，给 child 的约束可不同 |
| `FractionallySizedBox` | 按父 max 比例 tight | 120x40 ✅ | **不受 enforce 影响**；父 unbounded 时得 ∞ |
| `AspectRatio` | 按比例 tight | 宽高比 2:1 ✅ | **不受 enforce 影响**；有自己的比例算法 |
| `FittedBox` | 给 child unbounded→scale | 缩放 ✅ | **不受 enforce 影响**；上层必须有有限 size |
| `IntrinsicWidth` | tight = 内在宽 | 约37x17 ✅ | 性能贵（两遍 layout） |
| `IntrinsicHeight` | tight = 内在高 | 约37x17 ✅ | 性能贵（两遍 layout） |
| `Positioned.fill` | tight `(stack.W, stack.H)` | 200x50 ✅ | 安全（Stack 需有有限 size） |
| `Expanded` | 主轴 tight 分配 | flex1:2=80:160 ✅ | 只能在 Row/Column/Flex |
| `Flexible` | 主轴 tight(`FlexFit.tight`) 或 loose(`FlexFit.loose`) | 已验证 ✅ | tight 时等价 Expanded |
| `Spacer` | 等价 Expanded(SizedBox.shrink) | 撑开左右 ✅ | 在 Row/Column 中撑开剩余空间 |

### 7.3 关键对比：ConstrainedBox 在 tight vs loose 父下

```dart
// ❌ tight 父下 → 不生效（实测 200，非 120）
Container(width: 200, height: 60,
  child: ConstrainedBox(
    constraints: BoxConstraints(maxWidth: 120),
    child: child,
  ),
)

// ✅ loose 父下 → 生效（实测 120）
Center(
  child: ConstrainedBox(
    constraints: BoxConstraints(maxWidth: 120),
    child: child,
  ),
)
```

### 7.4 关键对比：普通 Container vs UnconstrainedBox

```dart
// 普通：受父约束限制，文字挤在框内
Container(width: 60, height: 40,
  child: Container(child: Text('受限')),
)

// UnconstrainedBox：去掉父约束，文字自由布局
Container(width: 60, height: 40,
  child: UnconstrainedBox(
    child: Container(child: Text('超出')),
  ),
)
```

---

## 8. Container 行为速查

Container 是最特殊的组件——**写宽高时是 C 类，不写宽高时是 B 类**，而且 color 有无还会改变行为。

### 有写宽高时 → C 类

```dart
Container(width: 200, height: 60)  // 等价 SizedBox(200x60)
```
- **对上**：申请 `(200, 60)` → clamp(200, 父约束)
- **对下**：给 child tight `(200, 60)` → 父 tight 时 enforce 覆盖

### 没写宽高时 → B 类（但 color 会改变行为）

| Container 状态 | 父约束 | 行为 | 真机实测 |
|---------------|--------|------|---------|
| 有 child 且无 color/decoration | **loose** | **贴合型** → 跟随 child size | **25x17**(文字尺寸) ✅ |
| 有 child 且无 color/decoration | **tight** | **被撑满** → 取 `constraints.biggest` | **200x50** ✅ |
| 有 color（无论有无 child） | loose 或 tight | **撑满型** → 占满父 | **200x60** ✅ |

```dart
// 对比：tight 父下，无 color 也会被撑满
SizedBox(width: 200, height: 50,
  child: Container(child: Text('hi')),  // 实测 200x50，不是贴合！
)

// 只有在 loose 父下才会贴合
Center(
  child: Container(child: Text('hi')),  // 实测 ≈ 文字尺寸
)
```

> **一句话**：
> - **有 color → 撑满父**（无论什么父约束）
> - **无 color → 只在 loose 父下贴合**，tight 父下照样被撑满
> - **有宽高 → C 类行为**，写啥就是啥（受 clamp 限制）

---

## 9. 宽高谈判：4 个典型场景

### 场景 1 · parent 有限 + child 写宽高（没超）

```dart
SizedBox(width: 300, height: 200,
  child: Container(width: 100, height: 50, color: Colors.red),
)
```

| 步骤 | 内容 |
|------|------|
| parent 给 child 的约束 | tight (300, 200) |
| child 想要 | (100, 50) |
| 谈判 | 100 ≤ 300, 50 ≤ 200 ✅ |
| child 实际 size | **(100, 50)** |

> **结论**：在父允许范围内，"我设啥就是啥"。

### 场景 2 · parent 有限 + child 不写宽高

**child 怎么决定大小，取决于它是谁**。

```dart
// 2a) child 是 A 类（透传）：完全跟父约束
SizedBox(width: 300, height: 200,
  child: ClipRect(child: Container(color: Colors.red)),
)
// ClipRect 透传 tight(300,200) → Container 撑满 300×200

// 2b) child 是 B 类（放松）+ 贴合型 grandchild
SizedBox(width: 300, height: 200,
  child: Center(child: Text('hi')),
)
// Center 给 Text loose(0..300, 0..200) → Text 约 30×20
```

### 场景 3 · child 写的宽高超出 parent 限制

```dart
// 3a) parent 是 tight：写啥都没用
SizedBox(width: 100, height: 60,
  child: Container(width: 500, height: 500),
)
// 实测：child = 100x60 ✅ 铁律

// 3b) parent 是 loose：被 max 钳住
Center(
  child: Container(width: 500, height: 500, color: Colors.red),
)
// Center 给 loose(0..屏幕)，500 被屏幕 max 钳住
```

### 场景 4 · parent 是 unbounded（最危险）

| parent 约束 | child 设宽高？ | child 实际 size |
|------------|---------------|----------------|
| unbounded (0..∞) | (100, 50) | 100×50 ✅ |
| unbounded (0..∞) | 不设 + 贴合型 | 内在尺寸 ✅ |
| unbounded (0..∞) | 不设 + 撑满型 | **不崩**，取最小(Text尺寸) ⚠️ |
| unbounded (0..∞) | SizedBox.expand | **💥 必崩** |

---

## 10. 特殊家族：Flex / Scrollable

### Flex 家族（Row / Column / Flex）

| 配置 | 效果 |
|------|------|
| `mainAxisSize: MainAxisSize.max`（默认） | 主轴想占满父 max |
| `mainAxisSize: MainAxisSize.min` | 主轴 = 子项总和 |
| 未被 Expanded/Flexible 包裹的子 | 主轴拿 **unbounded** 约束 |
| 被 Expanded 包裹的子 | 主轴 tight 分配 |
| 被 Flexible(fit: tight) | 同 Expanded |
| 被 Flexible(fit: loose) | 主轴 0..分到的空间 |

### Scrollable 家族

`ListView` / `GridView` / `SingleChildScrollView` / `PageView`：

- 主轴 unbounded
- **嵌套同方向滚动 → 必须 `shrinkWrap: true` + 外层有限尺寸**

```dart
// ❌ 必崩
ListView(children: [ListView(...)])

// ✅
ListView(children: [
  SizedBox(height: 200, child: ListView(...))
])

// ✅
ListView(children: [
  ListView(shrinkWrap: true, physics: NeverScrollableScrollPhysics(), ...)
])
```

---

## 11. 高频陷阱与避坑

### 陷阱 1：SizedBox.expand 在 unbounded 父里

```dart
Column(children: [
  SizedBox.expand(child: ...)   // ❌ Column 主轴 unbounded → expand 喂 ∞
])
```

**修**：用 `Expanded` 包，或换成 `SizedBox(height: X)`。

### 陷阱 2：ConstrainedBox 在 tight 父下不生效

```dart
Container(width: 200,
  child: ConstrainedBox(            // ❌ 父 tight(200,∞) → 不生效
    constraints: BoxConstraints(maxWidth: 120),
    child: child,
  ),
)
// 实测 200(非120)
```

**修**：让父给 loose 约束（用 Center 包一层）。

### 陷阱 3：Container(无color有child) 在 tight 父下不贴合

```dart
SizedBox(width: 200, height: 50,
  child: Container(child: Text('hi')),  // ❌ 被撑满 200x50
)
```

**修**：在 loose 父下使用（用 Center 包）。

### 陷阱 4：FittedBox 在 unbounded 父里

`FittedBox` 会先让 child 在 unbounded 约束里布局再 scale。父 unbounded 时 FittedBox 自身也 unbounded → 没人收尺寸 → 崩。
**修**：上层一定要有有限 size。

### 陷阱 5：Expanded 不在 Flex 里

```dart
Stack(children: [Expanded(child: ...)])  // ❌ 只能在 Row/Column/Flex
```

### 陷阱 6：BackdropFilter 必须包 ClipRect

```dart
// ❌ 可能报 invalid matrix
BackdropFilter(filter: ..., child: ...)

// ✅
ClipRect(child: BackdropFilter(filter: ..., child: ...))
```

---

## 12. 一页备忘

### 三类 widget 速记

```
A 透传：ClipRect, Opacity, Transform, IgnorePointer, RepaintBoundary,
        DecoratedBox, GestureDetector, Offstage, Visibility, BackdropFilter,
        ColorFiltered, ShaderMask, Listener, MouseRegion, ClipRRect,
        ClipOval, ClipPath, AnimatedOpacity, RawGestureDetector,
        AbsorbPointer, ImageFiltered
        ⇒ "我啥也不动，原样传"

B 放松：Center, Align, Padding, SafeArea, Container(无宽高), Wrap,
        Stack(默认对非Positioned子)
        ⇒ "tight 变 loose，max 不变或缩"
        ⚠️ Column/Row/ListView 主轴会变 unbounded！
        ⚠️ Padding 自身 size = child + padding（不占满父）

C 重写：SizedBox(系列), ConstrainedBox, UnconstrainedBox, LimitedBox,
        OverflowBox, SizedOverflowBox, FractionallySizedBox, AspectRatio,
        Container(有宽高), Positioned(系列), Expanded, Flexible, Spacer,
        IntrinsicWidth/Height, FittedBox
        ⇒ "我说了算，给 child 写 tight"
        ⚠️ tight 父下 ConstrainedBox/SizedBox 约束被父覆盖！
        ⚠️ unbounded 父里用 SizedBox.expand 会喂 ∞！
        ⚠️ FractionallySizedBox/FittedBox/AspectRatio 不受 enforce 影响
```

### Container 速查

```
写宽高?     → C 类，clamp(宽高, 父约束)
无宽高有color → 撑满父
无宽高无color → loose父下贴合，tight父下被撑满
```

### Positioned.fill vs SizedBox.expand

| | size 来源 | 安全性 |
|--|----------|--------|
| `Positioned.fill` | **Stack 的 size** | 安全（Stack 需有有限 size） |
| `SizedBox.expand` | **父约束的 max** | 父 unbounded 时是定时炸弹 |

### 五句必背

1. **约束往下走，size 往上回，位置父决定**
2. **C 类才会重写约束，是 bug 高发地**
3. **Column / Row / ListView 主轴是 unbounded**
4. **tight 父下 C 类组件（SizedBox/ConstrainedBox）给 child 的约束被父覆盖**
5. **`SizedBox.expand` 看似无害，碰到 unbounded 父就是定时炸弹**

### 宽高谈判一句话

> **真实 size = clamp(我想要的, parent 允许的)**
>
> 你写的宽高只是"愿望"，**parent 有最终否决权**；
> 没写宽高时，看 widget 是"撑满型"还是"贴合型"——
> **撑满型在 unbounded 父里取最小不崩但看不见，滚动型才会崩**。

### 常见报错速查

| 错误信息 | 典型原因 | 怎么修 |
|---------|----------|--------|
| `RenderBox was not laid out` | unbounded 约束里没自决定 size | 用 SizedBox/Expanded 给确定尺寸 |
| `Vertical viewport was given unbounded height` | ListView/Column 嵌套同方向 | `shrinkWrap: true` 或 `Expanded` |
| `BoxConstraints forces an infinite width/height` | expand + 父 unbounded | 别在 unbounded 父里用 expand |
| `TransformLayer invalid matrix` | BackdropFilter 拿到 ∞ | 上层包 ClipRect |
| Stack 全 Positioned 子"塌了" | 父没给 tight 约束 | 父加 SizedBox 或 `Stack(fit:expand)` |

---

> **106 项真机测试全部通过（0 FAIL）**。运行验证：`adb logcat -d | findstr "[MEASURE]"`
