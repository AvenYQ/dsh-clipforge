# 文稿台（dsh-reader）· 开发说明（给 AI 编码代理）

> 本文是 `dsh-reader-v0.1-spec.md` 并入工作台后的版本，已按实际代码校正。
> v0.1 已基本完成；本文第 3 节列出与原始需求的差距，第 4 节是 v0.2 的任务。
> 视频部分的改进清单见同目录下的 `REVIEW-视频部分-2026-11-03.md`。

---

## 0. 工作方式

1. dsh 处于 0.x 阶段。任何宿主 API（`ctx.webServer.register`、`ctx.get('tools')`、`dsh.bundle.patch`）的用法，都以本机 `~/.dsh/profiles/desktop/node_modules/@deepseek-ai/*` 的源码为准，不要凭记忆猜测。
2. 每完成一个任务，先跑 `node --test test/`，再在面板里手动走一遍对应流程。
3. 需求里没写清楚的地方，选最简单、可替换的实现，并在 `dsh-reader/NOTES.md` 里记一行"决策 + 理由"。

---

## 1. 实际架构（以此为准，原始需求中的 TS / pnpm / 独立 `/reader/` 页面均已作废）

| 项 | 实际做法 |
|---|---|
| 包 | 两个独立包：`dsh-workbench`（视频 + 面板 UI）和 `dsh-reader`（文稿能力，无 UI） |
| 语言 | 原生 ESM JavaScript，无构建步骤 |
| 安装 | 软链：`~/.dsh/profiles/desktop/node_modules/@local/{dsh-workbench,dsh-reader}` 指向桌面上的源码目录；`~/.dsh/profiles/desktop/cordis.patch.yml` 中各加一行 `insert` |
| 重载 | 改宿主端代码（`index.js`、`lib/`）后，执行 `touch ~/.dsh/profiles/desktop/cordis.patch.yml`；改 `client.js` 后刷新页面即可 |
| UI | 不单独出页面，统一放在工作台面板的"文稿台"模式里（`client.js` 第 1656 行起），通过 `fetch('/reader/api/*')` 调用 |
| 接口 | `POST /reader/api/{status, ingest, doc, analyze}` |
| agent tools | `reader_ingest`、`reader_summary`、`reader_quotes`、`reader_mindmap` |
| 模型 | 本机 OpenAI 兼容网关 `127.0.0.1:3425`；可用 `DSH_READER_LLM_URL` / `DSH_READER_LLM_MODEL` 覆盖，未设置时回退到工作台的同名变量 |
| 缓存 | `~/.dsh/reader/cache/<docId>/`，包含 `document.json`、`summary.json`、`quotes.json`、`mindmap.{json,md}`、`usage.json` |
| 数据结构 | `Document → sections[] → paragraphs[{id, text}]`；docId 为正文 sha256 的前 16 位 |

**职责边界：** reader 只负责"文本 → 结构化 → 分析结果"，不碰浏览器、不碰视频、不碰 UI。需要登录的抓取、视频文案来源等能力由工作台提供，再把纯文本交给 reader。

---

## 2. 硬性约束

- 不安装、不依赖 DSH Desktop 应用；只在 `dsh web` 中运行。
- 两个包之间**不互相 import**，只通过 HTTP 接口或前端编排协作，保持各自可单独加载。
- 所有 POST 接口必须校验 `Content-Type: application/json`，并检查 `Origin`（见审阅清单第 6 条）。
- docId 一律校验 `/^[a-f0-9]{16}$/`。
- 金句必须是原文的连续片段，由代码校验（`lib/quotes.js` 的 `validateQuotes`），不依赖模型自觉。这条规则不得放宽。

---

## 3. v0.1 现状与差距

| 原始需求 | 现状 | 处理 |
|---|---|---|
| 粘贴文本 / 网页链接 → Document | ✅ 已完成 | — |
| 网页抽正文 | ⚠️ 纯 HTTP 加正则抽取；遇到需要登录的页面会失败，而旧版 textbench 有 ego 浏览器兜底 | v0.2 任务 R1 |
| 缓存与"重新生成" | ✅ 接口支持 `force` | 确认面板上有"重新生成"按钮 |
| map-reduce 长文 | ✅ | — |
| 金句硬校验 | ✅ 有测试 | — |
| 导图用 markmap 渲染 | ⚠️ 实际是缩进树，可点击跳转 | 保留缩进树作为默认；markmap 视图作为 v0.2 可选项（R6） |
| 分析进度 | ❌ `analyze` 是同步长请求，等全部完成后才一次性返回 stages；重复点击会触发两次模型调用 | v0.2 任务 R2 |
| `.svg` 导出 | ❌ 只能导出 `.md` | 随 R6 一起做 |

---

## 4. v0.2 任务（按顺序完成）

### R1 · 链接抓取失败时，用登录态浏览器兜底
- **流程（前端编排，两个包不互相依赖）：**
  1. 调用 `reader/ingest`。
  2. 如果失败，或返回的正文少于 200 字，调用 `workbench/browserFetch({url})`。
  3. 拿到 `page.text` 后，再调用 `reader/ingest`，参数为 `{ input: page.text, url, title }`。
  4. 如果仍需登录，复用现有的 `loginPrompt` 卡片（"在浏览器打开 → 已登录，再抓一次"）。
- **后端改动：** `reader/ingest` 需要支持在 `input` 为正文时附带 `url` 和 `title`，使 Document 的 `source.url` 正确。
- **验收：** 一篇需要登录的 X 长文，按卡片提示登录一次后，可以完整解析。

### R2 · 分析改为"启动任务 + 轮询"
- **新接口：**
  - `POST /reader/api/run {docId, kind, force}`：立即返回 `{runId}`。
  - `POST /reader/api/run-status {runId}`：返回 `{status, stage, done, total, result?, error?}`。
- **并发控制：**
  - 相同的 `docId + kind` 已在运行时，直接返回已有的 runId。
  - 全局同时最多 2 个分析任务。
- **前端：** 每 1.2 秒轮询一次，显示"分块 x/n → 合并"进度。三项分析互不阻塞。
- 保留旧的 `analyze` 接口供 agent tools 使用（agent 调用可以接受同步等待）。

### R3 · 从旧 textbench 迁移三项功能，然后删除旧代码
1. **双语对照：** 新增 `kind: 'translate'`，逐段翻译，结果按段落 id 对齐，存为 `translation.json`。
2. **概念表 + 延伸问题：** 新增 `kind: 'concepts'`，输出：
   ```
   { concepts: [{term, explain, pids}], questions: [{q, why}] }
   ```
   其中 `pids` 必须在 Document 中存在，不存在的条目剔除。
3. **导出落盘：** `POST /reader/api/export {docId}`，把摘要、金句（带 ¶段号）、导图大纲、概念、双语合并成一份 Markdown。
   - 写入 `~/Movies/DSH工作台/text/<日期>-<标题>.md`。
   - 文件头加 YAML frontmatter：`title`、`source`、`created`、`tags`，便于直接放进 Obsidian。
- **验收：** 迁移完成后，删除 `dsh-workbench/lib/textbench.js`，以及 `index.js` 中所有 `text*` 路由和 `renderMarkdown`。面板功能不得倒退。

### R4 · 视频文案 → 文稿台（两个台的核心联动）
- **入口：** 视频台"文案"卡片上新增按钮"送进文稿台"。
- **数据：**
  - 工作台新增接口 `api.transcriptForReader({id})`，把 `transcript.turns` 按停顿合并成段落，每段约 200–400 字。
  - 每段附带时间范围 `{start, end}`。
- **reader 端改动：**
  - `ingest` 接受一个可选参数 `segments: [{text, start, end}]`。
  - 传入时，每段直接成为一个 Paragraph，并额外保存 `t: [start, end]`；不再走自动分段。
  - `source.type` 设为 `'video'`，并记录 `jobId`。
- **反向联动（这是 R4 的价值所在）：**
  - 文稿台中，金句、导图叶子节点、摘要分节所引用的段落如果带有时间范围，就显示 `mm:ss`。
  - 点击时间：切回视频台，并把 `start`/`end` 设成该段的时间范围。
  - 每条金句旁加两个按钮："切成 GIF"和"切成片段"。调用现有的 `gif` / `clip` 接口，时间范围取所在段落的 `t`，前后各留 0.3 秒，并吸附到关键帧或字幕边界（复用 `snapTime`）。
- **验收：** 一小时访谈提取文案 → 送进文稿台 → 生成金句 → 任选一条点"切成 GIF"，全程不手动拖时间轴，得到对应片段的 GIF。

### R5 · 一键沉淀到知识库
- 在 R3 的导出基础上，增加"存入知识库"选项。目标目录在设置里配置，默认 `~/Desktop/知识库/40-生活/`。
- 只写入用户勾选的金句和要点，不整篇倾倒。
- 写入前展示预览，用户确认后才落盘。

### R6 ·（可选）markmap 视图与 SVG 导出
- 导图标签页新增"树 / 脑图"切换。
- 脑图视图通过 cdnjs 加载 `markmap-view`，只在切换时懒加载。
- SVG 导出直接序列化渲染后的 `<svg>`。

---

## 5. 本版不做

- PDF / 论文 / EPUB / TXT 文件解析（放到 v0.3，届时需要处理 GB18030 编码检测）
- 公众号、知乎、小红书的专用适配器（R1 的浏览器兜底先覆盖大部分情况）
- 基于原文的 RAG 追问
- 跨文档主题库

---

## 6. 交付物

1. 两个包的改动，各自的 `node --test` 全部通过。
2. 更新 `dsh-workbench/README.md` 的"文稿台"章节，以及 `dsh-reader/NOTES.md`。
3. 每个任务（R1–R5）单独提交一次 git commit。前提是已按审阅清单第 0 条完成 git 初始化。
