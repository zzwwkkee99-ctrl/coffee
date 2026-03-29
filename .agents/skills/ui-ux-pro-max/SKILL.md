---
name: ui-ux-pro-max
description: 专业的 UI/UX 设计引擎，支持 50+ 现代 UI 风格、行业定制配色方案与无障碍标准。
---

# UI/UX Pro Max 设计指南

这套技能赋予你专业的 UI/UX 知识库与设计智能。当你处理任何网页或移动端界面的样式和交互设计时，必须严格遵守以下法则，以产出达到业界顶尖水准（如苹果、Vercel、Stripe 级别）的产品设计。

## 1. 结构化设计知识库
在每次设计或重构代码前，主动应用以下体系：

### 1.1 UI 风格预设 (UI Styles)
根据产品应用场景，从以下高级样式中选择：
- **Glassmorphism (磨砂玻璃与拟物)**：利用背景模糊 (`backdrop-blur`)、半透明背景色 (`bg-white/10`)、微光边框 (`border-white/20`) 以及环境光阴影创造深度。
- **Bento Grid (便当盒网格)**：使用无缝衔接的圆角卡片陈列信息，配合恰当的留白与对齐。
- **Clean Minimalism (极致极简)**：极大削减边框线，依赖高质量的排版、字号对比和留白来划分区域。
- **Neo-Brutalism (新粗野主义)**：使用高对比色彩，粗实体黑色边框 (`border-2 border-black`) 与锐利的几何阴影。

### 1.2 色彩体系 (Color Palettes)
- **拒接单调**：严禁随意使用如 `red`, `blue` 或 `#FF0000` 这样的原生/基础色。
- **行业适配**：
  - **SaaS / Tech**：深邃的暗黑模式，搭配冷紫、靛蓝荧光强调色。
  - **Fintech (金融科技)**：强调信任感的深湖蓝配金属灰、极简绿。
  - **Healthcare (医疗)**：舒缓的蓝绿色调，大面积洁白与低饱和中性色。
- **灰阶过渡**：必须使用从 50 到 900 具有明确阶梯的灰色系统（Slate, Zinc, Neutral）。

### 1.3 字体排版 (Typography)
- **字体组合**：禁用浏览器默认字体。在现代 Web 应用中，优先选用 Inter, Roboto, Outfit, Plus Jakarta Sans 等专业字体。
- **层级分明**：使用非线性的字号比例（如 12px, 14px, 16px, 20px, 24px, 32px, 48px），确保大标巨大、正文易读。
- **对比与字重**：利用 `font-medium`, `font-semibold` 与次级文本颜色（如 `text-gray-500`）在同一行内创造主次分别。

## 2. 交互与微动画 (Micro-Interactions)
- 所有可交互元素（按钮、链接、卡片）必须配备悬停 (hover)、激活 (active) 及聚焦 (focus) 的状态反馈。
- 引入平滑动画缓冲：所有的状态切换应用 `cubic-bezier` 或者 `ease-in-out` 的过渡 `transition-all duration-300`，绝不允许瞬时生硬的变化。

## 3. 标准与规范 (UX & Accessibility)
- **无障碍访问 (a11y)**：
  - 确保主要的文本对比度满足 WCAG AA 级别 (4.5:1)。
  - 输入框、图标按钮须配备明确的 `aria-label`。
- **触摸友好**：所有移动端按钮或可点击区域高度不可低于 `44px`。
- **8pt 网格原则**：所有的 margin, padding, border-radius 优先选用 4 或 8 的倍数（如 4px, 8px, 12px, 16px, 24px...），保持界面的节奏感。

## 4. 你的工作流
当用户要求你写代码时：
1. **理解上下文**：识别功能组件的性质（如 Dashboard, Landing Page）。
2. **应用 Pro Max 模式**：放弃“只要能跑就行”的思想，从一开始就用最优质的样式属性去包装 HTML/组件。
3. **输出方案**：使用 Vanilla CSS, Tailwind, 或是 CSS-in-JS 等框架，精准地再现上述设计理念。
