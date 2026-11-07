# HabitatQuest 教师工作台 · 长期项目笔记

## 技术栈与架构
- Vite 5 + React 18 + TypeScript（`strict` / `noUnusedLocals` / `noUnusedParameters` 全开）+ Tailwind v4（`@tailwindcss/vite`）+ GSAP + d3-scale / d3-shape + lucide-react。
- **无 router**：`App.tsx` 用 `stage: 'login' | 'transition' | 'dashboard'` 控制两页。
- `ShapeTrailCanvas` 必须常驻挂载、永不卸载；这是 GSAP/Canvas 两页连续转场成立的前提。
- 转场逻辑（`src/transition/usePageTransition.ts`）全部用 data-attribute 选择器，**严禁依赖 UI 文案做选择器**。
- 设计变量在 `src/styles/tokens.css`，`data-theme` 挂在 `<html>`，明暗双主题。

## 数据约定
- 固定种子 `SEED = 20260515`，3 个班 × 27 人，保证每次渲染数据一致。
- **中文字符串是数据主键**：班级名（如 `'三年级 A 班'`）、学生中文名（头像哈希、搜索匹配基于它）、动物中文名（错误热点逻辑基于它）。新增语言只加展示字段，不要改写这些键。
- `randomName(rand)` 消耗固定两次 PRNG 调用并返回 `{ cn, en }`；改动它会导致全站种子数据漂移。
- 数据层不存放 UI 文案：需本地化的句子改为结构化字段（`reasonKey` / `days` / `habitat` / `accuracy`），由 UI 层拼装。
- KPI 与雷达图口径一致：雷达六维加权平均 = KPI 平均正确率，勿破坏。
- 无真实鉴权。演示账号 `teacher@habitatquest.edu / habitat2026`，教师为吴老师 / Ms. Wu。

## 中英双语（2026-11-07 加入）
- 自研 i18n，无第三方依赖：`src/i18n/index.tsx`（Provider / `useI18n()` / `t(key, params)`）、`src/i18n/dict.ts`（`zh` 为唯一键源，`en: Record<DictKey, string>` 编译期查漏）、`src/i18n/labels.ts`（实体标签 helpers）。
- 语言存 `localStorage['hq-locale']`；`index.html` 内联脚本提前应用 `lang` / `data-locale` / title / description 防首屏闪烁；Provider effect 同步 `document.documentElement.lang`、title、meta。
- `src/lib/format.ts` 的时间/时长/日期/星期/数字函数均带可选 `locale`，默认 `'zh'`。
- `LanguageToggle` 为 `中 / EN` 分段控件，登录页 compact、工作台顶栏默认尺寸。
- `MistakeBars.tsx` 的「另一语言小字」是**有意设计**（中文页显示英文副名、英文页显示中文副名），属双语教育提示，不是漏译。
- 新增 UI 文案的正确做法：先在 `dict.ts` 的 `zh` 加键（TS 会强制补 `en`），组件用 `t()`；实体名一律走 `i18n/labels.ts` 的 helper。

## 验证方式
- `npm run build` = `tsc -b && vite build`。
- `npm run preview` → `http://127.0.0.1:4173/`；用 `playwright-cli` 单条链式命令验证（分次调用会丢浏览器会话）。
- 工作台内容在**内层 `overflow-y:auto` 的 div** 里滚动，`window.scrollTo` 无效，需定位该容器或 `scrollIntoViewIfNeeded()`。
- 「需要关注」面板可用 `section` + 含 `Assign` / `布置练习` 按钮来精确定位。
