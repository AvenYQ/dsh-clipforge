window.__ModuleLoader__.load({
  id: 'dsh-clipforge',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const { useCallback, useEffect, useMemo, useRef, useState } = React;

    const PANEL_ID = 'workbench';
    const NS = 'workbench';
    const API = '/clipforge/api';
    const STORE_KEY = 'dsh.workbench.v1';
    const BUILD = '11-03 16:32';

    /* ── 文案 ─────────────────────────────────────────────────────────── */

    const ZH = {
      panel: 'ClipForge',
      title: 'ClipForge',
      subtitle: '贴链接 → 下载 → 文案 → 截取 / 合并 → GIF',
      statusIdle: '等待输入',
      statusWorking: '正在处理',
      videoMode: '视频台',
      textMode: '文稿台',
      openFinder: '在 Finder 中显示',
      clear: '清空工作台',
      clearConfirm: '再点一次清空',

      card1: '输入与解析',
      card2: '下载源流',
      card3: '文案与转写',
      card4: '预览与范围裁切',
      card5: '输出设置与产物',
      card6: '多段片段收集与合并',

      urlPlaceholder: '粘贴视频链接（支持 Bilibili、YouTube、Twitter、小红书等）',
      textPlaceholder: '贴正文，或贴链接（解析不了会让你登录）——至少 40 字',
      parse: '解析',
      parsing: '解析中…',
      analyzeText: '分析文稿',
      autoDetect: '自动识别',
      supported: '支持主流多媒体生态',
      supportNote: '输入任意公开视频 URL，引擎会分析源站分片协议与音画分轨，并在本地缓冲供裁切。',
      detectedVideo: '识别为：视频',
      detectedText: '识别为：文稿',
      modeLabel: '模式',

      waitParse: '等待输入',
      streamIdle: 'STREAM_SRC // IDLE',
      noFormats: '未加载可用规格',
      noFormatsBody: '解析视频后自动拉取可用清晰度、编码方案与独立音轨选项',
      formatHint: '分轨选择：待链接解析',
      pendingParse: '待链接解析',
      quality: '清晰度',
      qBest: '最佳（H.264 优先）',
      q1080: '1080p 以内',
      q720: '720p 以内',
      q480: '480p 以内',
      qAudio: '只要音频',
      download: '下载视频',
      downloading: '下载中',
      done: '已下载',
      failed: '失败',
      cancel: '取消',

      engine: '引擎',
      transcriptIdle: '字幕与语音识别待命',
      transcriptIdleBody: '有原版字幕将直接抓取，无字幕可一键调用本地 Whisper 提取带时间轴的文案。',
      extract: '提取文案',
      reExtract: '重新提取',
      translate: '翻译',
      translateDone: '翻译完成',
      exportSrt: '复制全文',
      bilingual: '双语',
      plain: '纯文本',
      timestamps: '时间戳',
      copy: '复制',
      copied: '已复制',
      saveTxt: '存成 .txt',
      sourceSubtitle: '来源：字幕轨',
      sourceAsr: '来源：本地 Whisper',
      sourceDescription: '来源：平台描述',
      noTranscript: '还没有文案。下载完成后点「提取文案」。',

      tc: 'TC',
      viewIdle: 'VIEW_IDLE',
      noSignal: 'NO_SIGNAL',
      channel: 'CH_01',
      playerEmpty: '暂无加载视频',
      playerEmptyBody: '粘贴并解析链接后在此实时预览与打点裁切',
      spacePlay: 'Space',
      spacePlayLabel: '播放/暂停',
      ioLabel: 'I / O',
      ioHint: '设入点/出点',
      arrows: '← / →',
      arrowsHint: '逐帧步进',
      fpsLabel: 'FPS',
      selState: '选区状态：',
      selUnset: '未设定（完整片源）',
      selRange: '{a} → {b}',
      setIn: '设入点',
      setOut: '设出点',
      resetSel: '复位选区',
      previewSel: '试播选中段',
      stopPreview: '停止试播',
      loopOn: '循环：开',
      loopOff: '循环：关',
      snapOn: '吸附：开',
      snapOff: '吸附：关',
      playBlocked: '浏览器拦了自动播放，点播放器上的播放键继续。',
      previewHint: '试播 {a} → {b}',
      trimHead: '片头 {n}',
      trimTail: '片尾 {n}',
      trimNew: '成片 {n}',

      mp4Title: 'MP4 视频截取',
      mp4Sub: '快速无损直通流 / H.264 兼容重编',
      mp4Chip: '原画直通',
      mp4Action: '截取 MP4',
      gifTitle: 'GIF 动图生成',
      gifSub: '内置 Palettegen 调色板自适应',
      gifChip: '≤ {n}MB',
      gifAction: '一键生成 GIF',
      needRange: '（需先定选区）',
      target: '目标',
      noCompress: '不压缩',
      custom: '自定义',
      fps: '帧率',
      width: '宽度',
      original: '原始',
      vaultTitle: '产物保险箱',
      vaultCount: '{n} 个已完成文件',
      vaultEmpty: '暂无生成产物 · 定好起止点，点一下就存。',
      saveFile: '保存',
      reveal: '定位',

      mergeAction: '加入当前区间',
      mergeTitle: '片段队列为空',
      mergeBody: '攒几段再导出 · 点击「加入当前区间」可将不同时间范围暂存，支持自由重排并无缝混流合并。',
      mergeRun: '拼接导出',
      clearQueue: '清空',
      stage: 'STAGE: {n}/16 CLIPS',
      concat: 'CONCAT_MODE: DIRECT_STREAM',
      mergeItem: '{a} → {b}',

      textSource: '原文',
      paperTab: '摘编',
      outlineTab: '大纲',
      quotesTab: '金句',
      conceptsTab: '概念',
      questionsTab: '延伸问题',
      genAll: '生成全部',
      exportMd: '导出 .md',
      noResultYet: '还没有结果。点「生成全部」提炼要点、出大纲和金句。',
      textEmpty: '先贴一段正文',
      needsLoginTitle: '这个链接需要登录',
      needsLoginBody: '点下面的按钮，插件用自带浏览器打开它；登录一次之后就能自动抓正文，不用复制粘贴。',
      grabBody: '用浏览器抓正文',
      grabAgain: '已登录，再抓一次',
      grabOpening: '正在打开浏览器…',
      grabWorking: '正在抓正文…',
      pasteHint: '不想登录的话，也可以把正文粘贴到输入框',

      error: '出错了',
      removed: '已清空',
      backToIdle: '已回到初始状态',
    };

    const EN = Object.assign({}, ZH, {
      title: 'ClipForge',
      statusIdle: 'Idle',
      statusWorking: 'Working',
      card1: 'Input & parse',
      card2: 'Download source',
      card3: 'Transcript',
      card4: 'Preview & range',
      card5: 'Output & artifacts',
      card6: 'Segment queue',
      parse: 'Parse',
      analyzeText: 'Analyze',
      download: 'Download',
      extract: 'Extract',
      translate: 'Translate',
      copy: 'Copy',
      copied: 'Copied',
      saveTxt: 'Save .txt',
      previewSel: 'Preview range',
      stopPreview: 'Stop',
      setIn: 'Set in',
      setOut: 'Set out',
      resetSel: 'Reset',
      mp4Action: 'Cut MP4',
      gifAction: 'Make GIF',
      vaultTitle: 'Artifacts',
      vaultEmpty: 'Nothing yet — mark a range and export.',
      mergeAction: 'Add current range',
      mergeTitle: 'Queue is empty',
      mergeBody: 'Collect a few ranges, then render one file.',
      mergeRun: 'Render joined clip',
      clearQueue: 'Clear',
      textSource: 'Source',
      genAll: 'Generate all',
      exportMd: 'Export .md',
    });

    /* ── 图标（等宽描边，1.6px） ───────────────────────────────────────── */

    const stroke = { stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' };
    const icon = (size, paths) => h('svg', { width: size, height: size, viewBox: '0 0 24 24', 'aria-hidden': true }, paths.map((d, i) => (typeof d === 'string' ? h('path', { key: i, d, ...stroke }) : h('g', { key: i }, d))));

    const Glyph = {
      link: (s = 16) => icon(s, ['M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1', 'M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1']),
      radar: (s = 16) => icon(s, ['M12 3a9 9 0 1 0 9 9', 'M12 8a4 4 0 1 0 4 4', 'M12 12l6-6']),
      download: (s = 16) => icon(s, ['M12 4v10', 'M8 11l4 4 4-4', 'M5 19h14']),
      subtitles: (s = 16) => icon(s, ['M3 6.5h18v11H3z', 'M7 11h4', 'M13 11h4', 'M7 14.5h7']),
      copy: (s = 16) => icon(s, ['M9 9h9v10H9z', 'M6 15H4V5h9v2']),
      translate: (s = 16) => icon(s, ['M4 6h9', 'M8 4v2c0 4-1.8 7-4 8', 'M6 9c1 2.5 3 4.2 5 5', 'M14 20l3.5-9 3.5 9', 'M15.4 17h4.2']),
      cut: (s = 16) => icon(s, ['M6.5 6.5 18 18', 'M18 6 6.5 17.5', h('circle', { key: 'c1', cx: 5, cy: 18.5, r: 2.2, ...stroke }), h('circle', { key: 'c2', cx: 19, cy: 18.5, r: 2.2, ...stroke })]),
      movie: (s = 16) => icon(s, ['M3 6h18v12H3z', 'M7 6v12', 'M17 6v12', 'M3 12h18']),
      gif: (s = 16) => icon(s, ['M3 6h18v12H3z', 'M8.5 10.5h-1.8a1.7 1.7 0 0 0 0 3.4h1.8v-1.7', 'M12.5 10.5v3.4', 'M15.5 13.9v-3.4h2.6', 'M15.5 12.2h2']),
      layers: (s = 16) => icon(s, ['M12 4 3 9l9 5 9-5-9-5', 'M3 13l9 5 9-5']),
      folder: (s = 16) => icon(s, ['M3 7.5h6l1.5 2H21v9H3z']),
      trash: (s = 16) => icon(s, ['M4 7h16', 'M9 7V5h6v2', 'M6 7l1 12h10l1-12']),
      play: (s = 16) => icon(s, ['M8 5.5v13l11-6.5-11-6.5z']),
      plus: (s = 16) => icon(s, ['M12 5v14', 'M5 12h14']),
      check: (s = 16) => icon(s, ['M4 12.5 9 17.5 20 6.5']),
      warn: (s = 16) => icon(s, ['M12 4 21 20H3L12 4z', 'M12 10v4.5', 'M12 17.2v.1']),
      inpoint: (s = 16) => icon(s, ['M6 5v14', 'M10 12h9', 'M15.5 8.5 19 12l-3.5 3.5']),
      outpoint: (s = 16) => icon(s, ['M18 5v14', 'M14 12H5', 'M8.5 8.5 5 12l3.5 3.5']),
      spinner: (s = 16) => h('svg', { width: s, height: s, viewBox: '0 0 24 24', className: 'wb-spin' }, h('circle', { cx: 12, cy: 12, r: 8, ...stroke, strokeDasharray: '34 14' })),
    };

    /* ── 小工具 ───────────────────────────────────────────────────────── */

    function clock(seconds) {
      const total = Math.max(0, Math.floor(Number(seconds) || 0));
      const m = Math.floor(total / 60);
      const s = total % 60;
      return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    function clockMs(seconds) {
      const value = Math.max(0, Number(seconds) || 0);
      const hh = Math.floor(value / 3600);
      const mm = Math.floor((value % 3600) / 60);
      const ss = Math.floor(value % 60);
      const ms = Math.floor((value % 1) * 1000);
      return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
    }

    function bytes(value) {
      const size = Number(value) || 0;
      if (size >= 1024 ** 3) return `${(size / 1024 ** 3).toFixed(2)} GB`;
      if (size >= 1024 ** 2) return `${(size / 1024 ** 2).toFixed(2)} MB`;
      if (size >= 1024) return `${(size / 1024).toFixed(0)} KB`;
      return `${size} B`;
    }

    async function callSoft(method, payload) {
      const response = await fetch(`${API}/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload || {}),
      });
      return response.json().catch(() => ({ ok: false, error: '返回不是 JSON' }));
    }

    async function call(method, payload) {
      const data = await callSoft(method, payload);
      if (!data.ok) throw new Error(data.error || '请求失败');
      return data;
    }


    /* ── 样式：群青 / 0 圆角 / 等宽标签 ───────────────────────────────── */

    const CSS = `
.wb-root {
  --wb-bg: var(--dsw-alias-bg-base, #f8fafc);
  --wb-surface: var(--dsw-alias-bg-layer-1, #ffffff);
  --wb-container: var(--dsw-alias-bg-layer-2, #f1f5f9);
  --wb-container-2: var(--dsw-alias-bg-layer-3, #e2e8f0);
  --wb-border: var(--dsw-alias-border-l1, #e2e8f0);
  --wb-border-strong: var(--dsw-alias-border-l3, #94a3b8);
  --wb-ink: var(--dsw-alias-label-primary, #0f172a);
  --wb-ink-2: var(--dsw-alias-label-secondary, #334155);
  --wb-muted: var(--dsw-alias-label-tertiary, #64748b);
  --wb-caption: var(--dsw-alias-label-caption, #94a3b8);
  --wb-primary: var(--dsw-alias-brand-primary, #1d4ed8);
  --wb-primary-hover: color-mix(in srgb, var(--wb-primary) 82%, white);
  --wb-primary-ink: var(--dsw-alias-label-primary-inverted, #ffffff);
  --wb-primary-soft: color-mix(in srgb, var(--wb-primary) 12%, transparent);
  --wb-ok: #047857;
  --wb-error: var(--dsw-alias-state-error-primary, #dc2626);
  --wb-error-soft: #fee2e2;
  --wb-font: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'PingFang SC', 'Helvetica Neue', system-ui, sans-serif;
  --wb-mono: ui-monospace, 'SF Mono', 'JetBrains Mono', Menlo, Consolas, monospace;
  flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column;
  background: var(--wb-bg); color: var(--wb-ink); font-family: var(--wb-font);
  font-size: 13px; line-height: 1.55;
}
.wb-root, .wb-root *, .wb-root *::before, .wb-root *::after { box-sizing: border-box; }
html[data-theme='dark'] .wb-root, html.dark .wb-root, .wb-root.wb-dark {
  --wb-ok: #34d399; --wb-error-soft: #3b1d1d;
}
@keyframes wb-spin { to { transform: rotate(360deg) } }
.wb-spin { animation: wb-spin 1s linear infinite; }
@keyframes wb-pulse { 0%, 100% { opacity: .35 } 50% { opacity: 1 } }
.wb-pulse { animation: wb-pulse 1.6s ease-in-out infinite; }

/* 顶栏 */
.wb-top {
  flex: none; display: flex; align-items: center; gap: 14px; height: 58px; padding: 0 22px;
  background: var(--wb-surface); border-bottom: 1px solid var(--wb-border);
}
.wb-mark { width: 28px; height: 28px; display: grid; place-items: center; background: var(--wb-primary); color: var(--wb-primary-ink); }
.wb-brand { display: flex; align-items: baseline; gap: 9px; min-width: 0; }
.wb-brand-title { font-size: 15px; font-weight: 650; letter-spacing: -.01em; white-space: nowrap; }
.wb-ver {
  font-family: var(--wb-mono); font-size: 10px; letter-spacing: .06em; color: var(--wb-muted);
  border: 1px solid var(--wb-border); padding: 2px 6px; text-transform: uppercase;
}
.wb-top-right { margin-left: auto; display: flex; align-items: center; gap: 8px; }

/* 按钮 */
.wb-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 7px; height: 34px; padding: 0 13px;
  white-space: nowrap; flex: none;
  font-family: inherit; font-size: 12.5px; cursor: pointer; border: 1px solid var(--wb-border-strong);
  background: var(--wb-surface); color: var(--wb-ink); border-radius: 0;
  transition: background .14s ease, border-color .14s ease, color .14s ease;
}
.wb-btn:hover:not(:disabled) { background: var(--wb-container); }
.wb-btn:disabled { cursor: not-allowed; color: var(--wb-caption); border-color: var(--wb-border); background: var(--wb-container); }
.wb-btn-primary { background: var(--wb-primary); border-color: var(--wb-primary); color: var(--wb-primary-ink); }
.wb-btn-primary:hover:not(:disabled) { background: var(--wb-primary-hover); border-color: var(--wb-primary-hover); }
.wb-btn-primary:disabled { background: var(--wb-container-2); border-color: var(--wb-border); color: var(--wb-caption); }
.wb-btn-ghost { border-color: var(--wb-border); background: transparent; }
.wb-btn-sm { height: 28px; padding: 0 9px; font-size: 11.5px; }
.wb-btn-danger { color: var(--wb-error); border-color: var(--wb-error); background: transparent; }
.wb-btn-danger.is-armed { background: var(--wb-error); color: #fff; }

/* 布局 */
.wb-body {
  flex: 1 1 auto; min-height: 0; overflow: auto; display: grid; gap: 16px;
  grid-template-columns: minmax(0, 392px) minmax(0, 1fr); padding: 18px 22px 40px; align-content: start;
}
@media (max-width: 1080px) { .wb-body { grid-template-columns: minmax(0, 1fr); } }
.wb-col { display: flex; flex-direction: column; gap: 14px; min-width: 0; }

/* 卡片 */
.wb-card { background: var(--wb-surface); border: 1px solid var(--wb-border); }
.wb-card-head {
  display: flex; align-items: center; gap: 10px; padding: 12px 14px; border-bottom: 1px solid var(--wb-border);
}
.wb-num {
  width: 20px; height: 20px; flex: none; display: grid; place-items: center;
  background: var(--wb-primary); color: var(--wb-primary-ink);
  font-family: var(--wb-mono); font-size: 11px; font-weight: 700;
}
.wb-card-title { font-size: 13.5px; font-weight: 650; letter-spacing: -.005em; }
.wb-card-note { margin-left: auto; font-family: var(--wb-mono); font-size: 10px; letter-spacing: .06em; text-transform: uppercase; color: var(--wb-muted); }
.wb-card-body { padding: 14px; }

/* 通用小字 */
.wb-mono { font-family: var(--wb-mono); font-variant-numeric: tabular-nums; letter-spacing: .02em; }
.wb-label { font-family: var(--wb-mono); font-size: 10px; letter-spacing: .08em; text-transform: uppercase; color: var(--wb-muted); }
.wb-hint { font-size: 11.5px; color: var(--wb-muted); line-height: 1.6; }
.wb-row { display: flex; align-items: center; gap: 8px; min-width: 0; }
.wb-wrap { flex-wrap: wrap; }

/* 输入 */
.wb-input {
  width: 100%; height: 36px; padding: 0 11px; font-family: var(--wb-mono); font-size: 12.5px;
  background: var(--wb-surface); color: var(--wb-ink); border: 1px solid var(--wb-border-strong); outline: none; border-radius: 0;
}
.wb-input::placeholder { color: var(--wb-caption); font-family: var(--wb-font); }
.wb-input:focus { border-color: var(--wb-primary); box-shadow: inset 0 0 0 1px var(--wb-primary); }
.wb-textarea { width: 100%; min-height: 96px; resize: vertical; padding: 10px 11px; font-family: var(--wb-font); font-size: 12.5px; line-height: 1.7; background: var(--wb-surface); color: var(--wb-ink); border: 1px solid var(--wb-border-strong); outline: none; }
.wb-textarea:focus { border-color: var(--wb-primary); box-shadow: inset 0 0 0 1px var(--wb-primary); }

/* 解析结果 */
.wb-meta { display: flex; gap: 12px; margin-top: 12px; }
.wb-thumb { width: 104px; height: 58px; flex: none; object-fit: cover; background: var(--wb-container); border: 1px solid var(--wb-border); }
.wb-meta-body { min-width: 0; display: flex; flex-direction: column; gap: 6px; }
.wb-meta-title { font-size: 12.5px; font-weight: 600; line-height: 1.45; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.wb-chips { display: flex; flex-wrap: wrap; gap: 5px; }
.wb-chip { font-family: var(--wb-mono); font-size: 10px; letter-spacing: .05em; padding: 2px 6px; border: 1px solid var(--wb-border); color: var(--wb-muted); text-transform: uppercase; }
.wb-chip-primary { color: var(--wb-primary); border-color: color-mix(in srgb, var(--wb-primary) 45%, transparent); }

/* 空态 */
.wb-empty { display: flex; flex-direction: column; align-items: center; gap: 7px; padding: 26px 16px; text-align: center; border: 1px dashed var(--wb-border-strong); }
.wb-empty-icon { color: var(--wb-caption); }
.wb-empty-title { font-size: 13px; font-weight: 650; color: var(--wb-ink); }
.wb-empty-text { font-size: 11.5px; color: var(--wb-muted); line-height: 1.6; max-width: 34em; }
.wb-empty-page { padding: 34px 12px; }

/* 进度 */
.wb-bar { position: relative; height: 6px; background: var(--wb-container-2); overflow: hidden; }
.wb-bar-fill { position: absolute; inset: 0 auto 0 0; background: var(--wb-primary); transition: width .3s ease; }
.wb-bar-fill.is-live::after { content: ''; position: absolute; inset: 0; background: repeating-linear-gradient(115deg, rgba(255,255,255,.35) 0 6px, transparent 6px 12px); animation: wb-stripe 1s linear infinite; }
@keyframes wb-stripe { from { transform: translateX(0) } to { transform: translateX(-12px) } }

/* 播放器 */
.wb-screen { position: relative; background: #0b1120; border: 1px solid var(--wb-border); }
.wb-video { display: block; width: 100%; max-height: 42vh; background: #0b1120; }
.wb-screen-empty { display: grid; place-items: center; gap: 8px; min-height: 258px; padding: 24px; text-align: center; color: #94a3b8; }
.wb-screen-empty strong { color: #e2e8f0; font-size: 13px; font-weight: 600; }
.wb-tc { display: flex; align-items: center; gap: 10px; padding: 9px 12px; border: 1px solid var(--wb-border); background: var(--wb-container); margin-bottom: 10px; }
.wb-tc-label { font-family: var(--wb-mono); font-size: 10px; letter-spacing: .08em; color: var(--wb-primary); }
.wb-tc-now { font-family: var(--wb-mono); font-size: 17px; font-weight: 700; letter-spacing: -.01em; }
.wb-tc-sep { color: var(--wb-caption); }
.wb-tc-total { font-family: var(--wb-mono); font-size: 12px; color: var(--wb-muted); }
.wb-tc-fps { margin-left: auto; font-family: var(--wb-mono); font-size: 10px; letter-spacing: .06em; color: var(--wb-muted); }

/* 键盘条 */
.wb-keys { display: flex; align-items: center; gap: 14px; padding: 7px 11px; background: #475569; color: #f8fafc; }
.wb-key { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; }
.wb-key b { font-family: var(--wb-mono); font-size: 10px; font-weight: 600; padding: 1px 5px; background: rgba(255,255,255,.16); border: 1px solid rgba(255,255,255,.28); }
.wb-key-right { margin-left: auto; font-family: var(--wb-mono); font-size: 10px; letter-spacing: .06em; color: #cbd5e1; }

/* 选区 */
.wb-sel { margin-top: 10px; border: 1px solid var(--wb-border); }
.wb-sel-head { display: flex; align-items: center; gap: 8px; padding: 8px 11px; border-bottom: 1px solid var(--wb-border); }
.wb-sel-state { font-size: 11.5px; color: var(--wb-ink-2); }
.wb-sel-delta { margin-left: auto; font-family: var(--wb-mono); font-size: 11px; color: var(--wb-primary); }
.wb-ticks { display: flex; justify-content: space-between; padding: 4px 10px; border-bottom: 1px solid var(--wb-border); }
.wb-tick { font-family: var(--wb-mono); font-size: 9.5px; color: var(--wb-caption); }

.wb-trim { position: relative; height: 34px; margin: 10px 12px; touch-action: none; }
.wb-trim-track { position: absolute; left: 0; right: 0; top: 11px; height: 12px; background: var(--wb-container-2); cursor: pointer; }
.wb-trim-fill { position: absolute; top: 8px; height: 18px; background: color-mix(in srgb, var(--wb-primary) 78%, white); cursor: grab; touch-action: none; border-left: 2px solid var(--wb-primary); border-right: 2px solid var(--wb-primary); }
.wb-trim-fill:active { cursor: grabbing; }
.wb-trim-head { position: absolute; top: 4px; width: 1px; height: 26px; background: var(--wb-ink); opacity: .55; pointer-events: none; }
.wb-trim-handle { position: absolute; top: 0; width: 10px; height: 34px; margin-left: -5px; background: var(--wb-primary); border: 0; cursor: ew-resize; padding: 0; }
.wb-trim-handle::after { content: ''; position: absolute; left: 50%; top: 50%; width: 2px; height: 12px; transform: translate(-50%, -50%); background: var(--wb-primary-ink); }

.wb-sel-actions { display: flex; align-items: center; gap: 8px; padding: 9px 11px; border-top: 1px solid var(--wb-border); flex-wrap: wrap; }

/* 输出 */
.wb-spec { display: flex; align-items: center; gap: 8px; margin-bottom: 9px; }
.wb-field {
  position: relative; display: flex; align-items: stretch; height: 42px;
  border: 1px solid var(--wb-border-strong); background: var(--wb-surface);
}
.wb-field:focus-within { border-color: var(--wb-primary); box-shadow: inset 0 0 0 1px var(--wb-primary); }
.wb-field-label {
  display: flex; align-items: center; padding: 0 10px; border-right: 1px solid var(--wb-border);
  background: var(--wb-container); font-family: var(--wb-mono); font-size: 10px;
  letter-spacing: .08em; text-transform: uppercase; color: var(--wb-muted);
}
.wb-field select {
  flex: 1 1 auto; min-width: 0; appearance: none; border: 0; outline: none; padding: 0 34px 0 12px;
  background: transparent; font-family: var(--wb-font); font-size: 13px; color: var(--wb-ink); cursor: pointer;
}
.wb-field select:disabled { color: var(--wb-caption); cursor: not-allowed; }
.wb-field::after {
  content: ''; position: absolute; right: 13px; top: 50%; width: 7px; height: 7px; pointer-events: none;
  border-right: 1.6px solid var(--wb-muted); border-bottom: 1.6px solid var(--wb-muted);
  transform: translateY(-70%) rotate(45deg);
}
.wb-cta { width: 100%; height: 42px; font-size: 13px; }
.wb-tiles { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
@media (max-width: 760px) { .wb-tiles { grid-template-columns: 1fr; } }
.wb-tile {
  border: 1px solid var(--wb-border); padding: 12px; display: flex; flex-direction: column; gap: 9px;
  height: 100%; min-height: 0;
}
/* 两块的按钮统一压到底边对齐，中间多出来的空间留给参数区，不让按钮缩在上面 */
.wb-tile > .wb-btn { margin-top: auto; }
.wb-tile-params { display: flex; flex-wrap: wrap; gap: 6px; }
.wb-tile-head { display: flex; align-items: flex-start; gap: 9px; }
.wb-tile-icon { width: 30px; height: 30px; display: grid; place-items: center; background: var(--wb-primary-soft); color: var(--wb-primary); flex: none; }
.wb-tile-title { font-size: 12.5px; font-weight: 650; }
.wb-tile-sub { font-size: 11px; color: var(--wb-muted); line-height: 1.5; }
.wb-tile-chip { margin-left: auto; font-family: var(--wb-mono); font-size: 9.5px; letter-spacing: .06em; padding: 2px 5px; border: 1px solid var(--wb-border); color: var(--wb-muted); white-space: nowrap; }
.wb-tile .wb-btn { width: 100%; }

.wb-vault { margin-top: 12px; border: 1px solid var(--wb-border); }
.wb-vault-head { display: flex; align-items: center; gap: 9px; padding: 10px 12px; background: var(--wb-container); border-bottom: 1px solid var(--wb-border); }
.wb-vault-title { font-size: 12px; font-weight: 650; }
.wb-vault-count { margin-left: auto; font-family: var(--wb-mono); font-size: 10px; color: var(--wb-muted); }
.wb-item { display: flex; align-items: center; gap: 9px; padding: 9px 12px; border-bottom: 1px solid var(--wb-border); }
.wb-item:last-child { border-bottom: 0; }
.wb-item-name { font-size: 11.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 22em; }
.wb-vault-file { font-family: var(--wb-mono); font-size: 10px; color: var(--wb-caption); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 24em; }
.wb-item-meta { font-family: var(--wb-mono); font-size: 10px; color: var(--wb-muted); }
.wb-item-actions { margin-left: auto; display: flex; gap: 6px; }

/* 队列 */
.wb-queue { display: flex; flex-direction: column; gap: 6px; }
.wb-queue-row { display: flex; align-items: center; gap: 8px; padding: 7px 9px; border: 1px solid var(--wb-border); background: var(--wb-container); }

/* 文案 */
.wb-tabs { display: inline-flex; border: 1px solid var(--wb-border); }
.wb-tab { height: 26px; padding: 0 10px; font-family: var(--wb-mono); font-size: 10.5px; letter-spacing: .04em; background: var(--wb-surface); color: var(--wb-muted); border: 0; border-right: 1px solid var(--wb-border); cursor: pointer; }
.wb-tab:last-child { border-right: 0; }
.wb-tab.is-on { background: var(--wb-primary); color: var(--wb-primary-ink); }
.wb-tab:disabled { opacity: .45; cursor: not-allowed; }
.wb-doc { margin: 0; max-height: 260px; overflow: auto; padding: 11px 12px; white-space: pre-wrap; word-break: break-word; font-family: var(--wb-font); font-size: 12.5px; line-height: 1.72; color: var(--wb-ink-2); border: 1px solid var(--wb-border); background: var(--wb-container); }
.wb-turn { border: 1px solid var(--wb-border); padding: 9px 11px; }
.wb-turn + .wb-turn { margin-top: 7px; }
.wb-turn-head { display: flex; align-items: center; gap: 7px; margin-bottom: 4px; }
.wb-turn-time { font-family: var(--wb-mono); font-size: 10px; color: var(--wb-muted); }
.wb-turn-src { font-size: 12.5px; line-height: 1.7; color: var(--wb-ink-2); }
.wb-turn-dst { font-size: 12.5px; line-height: 1.7; margin-top: 3px; color: var(--wb-ink); }
.wb-turn-dst.is-pending { color: var(--wb-caption); }

.wb-error { display: flex; align-items: center; gap: 8px; padding: 9px 11px; border: 1px solid var(--wb-error); background: var(--wb-error-soft); color: var(--wb-error); font-size: 12px; }
.wb-notice { display: flex; gap: 8px; padding: 9px 11px; border: 1px solid var(--wb-border-strong); background: var(--wb-container); font-size: 12px; color: var(--wb-ink-2); }

.wb-paras { display: flex; flex-direction: column; gap: 7px; max-height: 46vh; overflow: auto; }
.wb-para { display: flex; gap: 8px; font-size: 12.5px; line-height: 1.7; color: var(--wb-ink-2); }
.wb-para-n { flex: none; width: 30px; text-align: right; font-family: var(--wb-mono); font-size: 10px; color: var(--wb-caption); padding-top: 3px; }
`;

    function StyleSheet() {
      return h('style', { dangerouslySetInnerHTML: { __html: CSS } });
    }

    /* ── 通用块 ───────────────────────────────────────────────────────── */

    function Card({ n, title, note, children, bodyStyle }) {
      return h(
        'section',
        { className: 'wb-card' },
        h(
          'header',
          { className: 'wb-card-head' },
          h('span', { className: 'wb-num' }, n),
          h('span', { className: 'wb-card-title' }, title),
          note ? h('span', { className: 'wb-card-note' }, note) : null,
        ),
        h('div', { className: 'wb-card-body', style: bodyStyle }, children),
      );
    }

    function EmptyBlock({ icon, title, text, children, page }) {
      return h(
        'div',
        { className: `wb-empty${page ? ' wb-empty-page' : ''}` },
        icon ? h('span', { className: 'wb-empty-icon' }, icon) : null,
        title ? h('strong', { className: 'wb-empty-title' }, title) : null,
        text ? h('span', { className: 'wb-empty-text' }, text) : null,
        children || null,
      );
    }

    function TrimBar({ duration, start, end, current, onChange, onSeek }) {
      const trackRef = useRef(null);
      const liveRef = useRef({});
      liveRef.current = { duration, start, end, onChange, onSeek };
      const [drag, setDrag] = useState('');

      const timeAt = useCallback((clientX) => {
        const rect = trackRef.current?.getBoundingClientRect();
        if (!rect || rect.width <= 0) return 0;
        const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
        return ratio * (liveRef.current.duration || 0);
      }, []);

      const begin = useCallback((mode) => (event) => {
        const total = liveRef.current.duration || 0;
        if (!total) return;
        event.preventDefault();
        event.stopPropagation();

        const anchor = timeAt(event.clientX);
        const from = { start: liveRef.current.start, end: liveRef.current.end };
        const width = Math.max(0.3, from.end - from.start);
        const round = (value) => Math.round(value * 10) / 10;

        const move = (moveEvent) => {
          const live = liveRef.current;
          const time = timeAt(moveEvent.clientX);
          if (mode === 'start') live.onChange(round(Math.max(0, Math.min(time, live.end - 0.3))), round(live.end));
          else if (mode === 'end') live.onChange(round(live.start), round(Math.min(total, Math.max(time, live.start + 0.3))));
          else {
            const shifted = Math.max(0, Math.min(from.start + (time - anchor), total - width));
            live.onChange(round(shifted), round(shifted + width));
          }
        };

        const stop = () => {
          window.removeEventListener('pointermove', move);
          window.removeEventListener('pointerup', stop);
          window.removeEventListener('pointercancel', stop);
          setDrag('');
          const live = liveRef.current;
          if (mode === 'end') live.onSeek?.(live.end);
          else live.onSeek?.(live.start);
        };

        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', stop);
        window.addEventListener('pointercancel', stop);
        setDrag(mode);
      }, [timeAt]);

      const pct = (seconds) => `${(duration > 0 ? Math.min(1, Math.max(0, seconds / duration)) : 0) * 100}%`;

      return h(
        'div',
        { className: 'wb-trim', ref: trackRef },
        h('div', { className: 'wb-trim-track', onPointerDown: begin('seek') }),
        h('div', {
          className: 'wb-trim-fill',
          style: { left: pct(start), width: `calc(${pct(end)} - ${pct(start)})` },
          onPointerDown: begin('move'),
        }),
        h('div', { className: 'wb-trim-head', style: { left: pct(current) } }),
        h('button', { type: 'button', className: 'wb-trim-handle', style: { left: pct(start) }, 'aria-label': 'in', onPointerDown: begin('start') }),
        h('button', { type: 'button', className: 'wb-trim-handle', style: { left: pct(end) }, 'aria-label': 'out', onPointerDown: begin('end') }),
      );
    }

    /* ── 主面板 ───────────────────────────────────────────────────────── */

    function Workbench({ t }) {
      const [url, setUrl] = useState('');
      const [textInput, setTextInput] = useState('');
      const [info, setInfo] = useState(null);
      const [job, setJob] = useState(null);
      const [busy, setBusy] = useState('');
      const [error, setError] = useState('');
      const [quality, setQuality] = useState('720');
      const [start, setStart] = useState(0);
      const [end, setEnd] = useState(6);
      const [target, setTarget] = useState('5');
      const [customTarget, setCustomTarget] = useState('3');
      const [fps, setFps] = useState('12');
      const [width, setWidth] = useState('0');
      const [tab, setTab] = useState('plain');
      const [showTime, setShowTime] = useState(false);
      const [now, setNow] = useState(0);
      const [copied, setCopied] = useState('');
      const [previewing, setPreviewing] = useState(false);
      const [loop, setLoop] = useState(false);
      const [playBlocked, setPlayBlocked] = useState(false);
      const [previewSrc, setPreviewSrc] = useState('');
      const [snap, setSnap] = useState(true);
      const [keyframes, setKeyframes] = useState([]);
      const [ranges, setRanges] = useState([]);
      const [confirmClear, setConfirmClear] = useState(false);
      const [modeOverride, setModeOverride] = useState(null);
      const [textRecord, setTextRecord] = useState(null);
      const [textTab, setTextTab] = useState('digest');
      const [loginPrompt, setLoginPrompt] = useState(null);

      const videoRef = useRef(null);
      const hydrated = useRef(false);

      /* 视频台和文稿台各用各的输入，互不干扰 */
      const urlInText = (url.match(/https?:\/\/[^\s，。、；;）)】"'<>]+/i) || [])[0] || '';
      const targetUrl = () => urlInText || url.trim();
      const looksUrl = Boolean(urlInText) || /^https?:\/\/\S+$/i.test(url.trim());
      const autoText = !looksUrl && url.trim().length > 60;
      const textMode = modeOverride === null ? autoText : modeOverride === 'text';
      const inputValue = textMode ? textInput : url;
      const setInputValue = textMode ? setTextInput : setUrl;
      const hasInput = inputValue.trim().length > 0;

      const duration = job?.duration || info?.duration || 0;
      const ready = Boolean(job?.ready);
      const live = Boolean(
        job && (job.status === 'downloading' || job.status === 'queued'
          || job.gif?.status === 'running' || job.transcript?.status === 'running'
          || job.clip?.status === 'running' || job.merge?.status === 'running'
          || job.transcript?.translating),
      );

      /* 恢复现场 */
      useEffect(() => {
        let saved = null;
        try { saved = JSON.parse(window.localStorage.getItem(STORE_KEY) || 'null'); } catch { saved = null; }
        hydrated.current = true;
        if (!saved) return undefined;
        let alive = true;
        if (saved.url) setUrl(saved.url);
        if (saved.textInput) setTextInput(saved.textInput);
        if (saved.info) setInfo(saved.info);
        if (typeof saved.start === 'number') setStart(saved.start);
        if (typeof saved.end === 'number') setEnd(saved.end);
        if (Array.isArray(saved.ranges)) setRanges(saved.ranges);
        if (saved.target) setTarget(saved.target);
        if (saved.fps) setFps(saved.fps);
        if (saved.width) setWidth(saved.width);
        if (typeof saved.snap === 'boolean') setSnap(saved.snap);
        if (typeof saved.showTime === 'boolean') setShowTime(saved.showTime);
        if (saved.tab === 'plain' || saved.tab === 'bilingual') setTab(saved.tab);
        if (saved.mode === 'text' || saved.mode === 'video') setModeOverride(saved.mode);
        if (saved.readerDocId) {
          callReader('doc', { id: saved.readerDocId })
            .then((data) => {
              if (!alive || !data.ok) return;
              setTextRecord({ doc: data.doc, summary: null, quotes: null, mindmap: null, stages: [], busy: '', error: '' });
            })
            .catch(() => {});
        }
        if (saved.jobId) {
          call('job', { id: saved.jobId }).then((data) => {
            if (!alive) return;
            setJob(data.job);
            const total = data.job.duration || 0;
            if (total > 0) {
              setStart((value) => Math.min(value, Math.max(0, total - 0.5)));
              setEnd((value) => Math.min(value, total));
            }
          }).catch(() => {});
        }
        return () => { alive = false; };
      }, []);

      /* 视频台里直接粘长文时，搬到文稿台去，别让内容凭空消失 */
      useEffect(() => {
        if (modeOverride !== null || !autoText || !url.trim()) return;
        setTextInput(url);
        setUrl('');
        setModeOverride('text');
      }, [modeOverride, autoText, url]);

      /* 落盘 */
      useEffect(() => {
        if (!hydrated.current) return;
        const payload = {
          jobId: job?.id || null,
          info,
          url,
          textInput,
          start,
          end,
          ranges,
          target,
          fps,
          width,
          snap,
          showTime,
          tab,
          mode: textMode ? 'text' : 'video',
          readerDocId: textRecord?.doc?.id || null,
        };
        try { window.localStorage.setItem(STORE_KEY, JSON.stringify(payload)); } catch { /* 配额满了就放弃 */ }
      }, [job?.id, info, url, textInput, start, end, ranges, target, fps, width, snap, showTime, tab, textMode, textRecord?.doc?.id]);

      /* 轮询 */
      useEffect(() => {
        if (!job || !live) return undefined;
        const timer = setInterval(async () => {
          try {
            const data = await call('job', { id: job.id });
            setJob(data.job);
          } catch (err) {
            setError(String(err.message || err));
          }
        }, 900);
        return () => clearInterval(timer);
      }, [job?.id, live]);

      /* 关键帧 */
      useEffect(() => {
        if (!job?.ready || keyframes.length) return undefined;
        let alive = true;
        call('keyframes', { id: job.id })
          .then((data) => { if (alive) setKeyframes(data.keyframes || []); })
          .catch(() => {});
        return () => { alive = false; };
      }, [job?.id, job?.ready, keyframes.length]);

      const snapTime = useCallback((time) => {
        if (!snap) return Math.round(time * 10) / 10;
        const candidates = [...keyframes, ...((job?.transcript?.cues) || [])];
        let best = time;
        let distance = 0.65;
        for (const candidate of candidates) {
          const diff = Math.abs(candidate - time);
          if (diff < distance) { distance = diff; best = candidate; }
        }
        return Math.round(best * 10) / 10;
      }, [snap, keyframes, job?.transcript?.cues]);

      const parse = useCallback(async () => {
        if (!inputValue.trim() || busy) return;
        setBusy('parse');
        setError('');
        setLoginPrompt(null);

        if (textMode) {
          try {
            await ingestReader(inputValue.trim());
          } catch (err) {
            setError(String(err.message || err));
          } finally {
            setBusy('');
          }
          return;
        }

        const value = targetUrl();
        try {
          const data = await callSoft('probe', { url: value });
          if (!data.ok) {
            setError(String(data.error || '解析失败'));
            setInfo(null);
            if (data.needsLogin) setLoginPrompt({ url: value, host: data.host || '', opened: false });
            return;
          }
          setInfo(data.info);
          if (data.info.kind === 'text') {
            await ingestReader(data.info.text || data.info.description || value);
          }
          setStart(0);
          setEnd(Math.min(6, Math.floor(data.info.duration || 6)));
        } catch (err) {
          setError(String(err.message || err));
          setInfo(null);
        } finally {
          setBusy('');
        }
      }, [url, busy, looksUrl]);

      const startDownload = useCallback(async () => {
        const target = targetUrl();
        if (!target || busy) return;
        setBusy('download');
        setError('');
        try {
          const data = await call('download', {
            url: target,
            quality,
            audio: quality === 'audio',
            sniff: info?.kind === 'sniff',
            douyin: info?.kind === 'douyin',
            xhs: info?.kind === 'xhs',
            generic: info?.kind === 'generic',
          });
          setJob(data.job);
          if (data.job.duration) setEnd(Math.min(6, Math.floor(data.job.duration)));
        } catch (err) {
          setError(String(err.message || err));
        } finally {
          setBusy('');
        }
      }, [url, quality, busy, info]);

      const extract = useCallback(async () => {
        if (!job || busy) return;
        setBusy('transcript');
        setError('');
        try {
          const data = await call('transcript', { id: job.id, force: Boolean(job.transcript?.text) });
          setJob(data.job);
        } catch (err) {
          setError(String(err.message || err));
        } finally {
          setBusy('');
        }
      }, [job, busy]);

      const translate = useCallback(async () => {
        if (!job || busy) return;
        setBusy('translate');
        setError('');
        try {
          const data = await call('translate', { id: job.id, force: Boolean(job.transcript?.translated) });
          setJob(data.job);
          setTab('bilingual');
        } catch (err) {
          setError(String(err.message || err));
        } finally {
          setBusy('');
        }
      }, [job, busy]);

      const buildClip = useCallback(async () => {
        if (!job || busy) return;
        if (end - start < 0.4) { setError('片段太短，至少 0.4 秒'); return; }
        setBusy('clip');
        setError('');
        try {
          const data = await call('clip', { id: job.id, start, end, mode: 'fast' });
          setJob(data.job);
        } catch (err) {
          setError(String(err.message || err));
        } finally {
          setBusy('');
        }
      }, [job, busy, start, end]);

      const buildGif = useCallback(async () => {
        if (!job || busy) return;
        if (end - start < 0.4) { setError('片段太短，至少 0.4 秒'); return; }
        const targetMB = target === 'custom' ? Number(customTarget) || 0 : Number(target) || 0;
        setBusy('gif');
        setError('');
        try {
          const data = await call('gif', {
            id: job.id,
            start,
            end,
            targetMB,
            fps: Number(fps) || 12,
            width: Number(width) || 0,
          });
          setJob(data.job);
        } catch (err) {
          setError(String(err.message || err));
        } finally {
          setBusy('');
        }
      }, [job, busy, start, end, target, customTarget, fps, width]);

      const addRange = useCallback(() => {
        if (end - start < 0.3) { setError('片段太短，至少 0.3 秒'); return; }
        setRanges((current) => [...current, { start, end }].slice(0, 16));
      }, [start, end]);

      const runMerge = useCallback(async () => {
        if (!job || busy || ranges.length === 0) return;
        setBusy('merge');
        setError('');
        try {
          const data = await call('merge', { id: job.id, ranges });
          setJob(data.job);
        } catch (err) {
          setError(String(err.message || err));
        } finally {
          setBusy('');
        }
      }, [job, busy, ranges]);

      const mark = useCallback((which, time) => {
        const value = time ?? (videoRef.current?.currentTime ?? 0);
        const next = snapTime(value);
        if (which === 'in') setStart(Math.min(next, Math.max(0, end - 0.3)));
        else setEnd(Math.max(next, start + 0.3));
      }, [snapTime, start, end]);

      const nudge = useCallback((which, delta) => {
        if (which === 'in') setStart((value) => Math.max(0, Math.min(Math.round((value + delta) * 10) / 10, end - 0.3)));
        else setEnd((value) => Math.max(start + 0.3, Math.min(Math.round((value + delta) * 10) / 10, duration || value + delta)));
      }, [start, end, duration]);

      const togglePreview = useCallback(async () => {
        const video = videoRef.current;
        if (previewing) {
          video?.pause();
          setPreviewing(false);
          setPreviewSrc('');
          setNow(start);
          return;
        }
        if (!job) return;
        setPlayBlocked(false);
        setPreviewing(true);
        try {
          const data = await call('preview', { id: job.id, start, end });
          setPreviewSrc(data.preview.url);
          setNow(start);
        } catch (err) {
          setError(String(err.message || err));
          setPreviewing(false);
        }
      }, [previewing, job, start, end]);

      const copy = useCallback(async (text, tag) => {
        try {
          await navigator.clipboard.writeText(text || '');
          setCopied(tag);
          setTimeout(() => setCopied(''), 1400);
        } catch { setCopied(''); }
      }, []);

      const docText = useCallback(() => {
        const tr = job?.transcript;
        if (!tr) return '';
        const prefix = (seconds) => (showTime ? `[${clock(seconds)}] ` : '');
        if (tab === 'bilingual' && tr.turns?.length) {
          return tr.turns.map((turn) => {
            const speaker = turn.speaker ? `[${turn.speaker}] ` : '';
            return `${prefix(turn.start)}${speaker}${turn.text}${turn.translation ? `\n${turn.translation}` : ''}`;
          }).join('\n\n');
        }
        if (tr.turns?.length) return tr.turns.map((turn) => `${prefix(turn.start)}${turn.text}`).join('\n');
        return showTime ? (tr.timeline || tr.text || '') : (tr.text || '');
      }, [job, tab, showTime]);

      const saveTxt = useCallback(() => {
        const text = docText();
        if (!text) return;
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${(job?.cleanTitle || 'transcript').replace(/[\\/:*?"<>|]/g, ' ')}.txt`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(link.href), 4000);
      }, [docText, job?.cleanTitle]);

      const clearBoard = useCallback(() => {
        if (!confirmClear) {
          setConfirmClear(true);
          setTimeout(() => setConfirmClear(false), 2600);
          return;
        }
        setConfirmClear(false);
        setJob(null);
        setInfo(null);
        setUrl('');
        setTextInput('');
        setStart(0);
        setEnd(6);
        setRanges([]);
        setKeyframes([]);
        setNow(0);
        setError('');
        setTab('plain');
        setShowTime(false);
        setPreviewing(false);
        setPreviewSrc('');
        setTextRecord(null);
        setTextTab('digest');
        setExportPath('');
        setLoginPrompt(null);
        setModeOverride(null);
        try { window.localStorage.removeItem(STORE_KEY); } catch { /* ignore */ }
      }, [confirmClear]);

      const grabWithBrowser = useCallback(async (targetValue) => {
        const value = targetValue || loginPrompt?.url || targetUrl();
        if (!value) return;
        setBusy('browser');
        setError('');
        try {
          const res = await callSoft('browserFetch', { url: value });
          if (res.ok) {
            await ingestReader(res.page?.text || '');
            setLoginPrompt(null);
          } else {
            await call('browserOpen', { url: value }).catch(() => {});
            setLoginPrompt({ url: value, host: loginPrompt?.host || '', opened: true });
            setError('浏览器已打开，登录完成后点「已登录，再抓一次」');
          }
        } catch (err) {
          setError(String(err.message || err));
        } finally {
          setBusy('');
        }
      }, [loginPrompt, url]);

      const callReader = useCallback(async (method, payload) => {
        const response = await fetch(`/reader/api/${method}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload || {}),
        });
        return response.json().catch(() => ({ ok: false, error: '返回不是 JSON' }));
      }, []);

      const ingestReader = useCallback(async (input) => {
        const data = await callReader('ingest', { input });
        if (!data.ok) throw new Error(data.error || '解析失败');
        setTextRecord({ doc: data.doc, summary: null, quotes: null, mindmap: null, stages: [], busy: '', error: '' });
        setTextTab('summary');
        setModeOverride('text');
        return data.doc;
      }, [callReader]);

      const runReader = useCallback(async (kind, docIdArg) => {
        const docId = docIdArg || textRecord?.doc?.id;
        if (!docId) return;
        setTextRecord((current) => (current ? { ...current, busy: kind, error: '', stages: [] } : current));
        try {
          const data = await callReader('analyze', { docId, kind });
          if (!data.ok) throw new Error(data.error || '生成失败');
          setTextRecord((current) => (current ? { ...current, [kind]: data.result, busy: '', stages: data.stages || [] } : current));
        } catch (err) {
          setTextRecord((current) => (current ? { ...current, busy: '', error: String(err.message || err) } : current));
        }
      }, [callReader, textRecord]);

      const runReaderAll = useCallback(async () => {
        const docId = textRecord?.doc?.id;
        if (!docId) return;
        for (const kind of ['summary', 'quotes', 'mindmap']) {
          // eslint-disable-next-line no-await-in-loop
          await runReader(kind, docId);
        }
      }, [runReader, textRecord]);

      /* 键盘：空格播放、I/O 打点、←/→ 逐帧 */
      useEffect(() => {
        if (!ready) return undefined;
        const onKey = (event) => {
          const tag = (event.target?.tagName || '').toLowerCase();
          if (tag === 'input' || tag === 'textarea' || tag === 'select' || event.target?.isContentEditable) return;
          const video = videoRef.current;
          if (!video) return;
          const key = event.key.toLowerCase();
          if (event.code === 'Space') {
            event.preventDefault();
            if (video.paused) video.play().catch(() => {}); else video.pause();
            return;
          }
          if (key === 'i') { event.preventDefault(); mark('in'); return; }
          if (key === 'o') { event.preventDefault(); mark('out'); return; }
          if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            event.preventDefault();
            const step = event.shiftKey ? 1 : 1 / 30;
            const next = Math.max(0, Math.min((video.duration || duration || 0), video.currentTime + (event.key === 'ArrowLeft' ? -step : step)));
            video.currentTime = next;
            setNow(next);
          }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
      }, [ready, mark, duration]);

      /* ── 渲染片段 ─────────────────────────────────────────────────── */

      const jobTitle = job?.title || info?.title || '';
      const readerDoc = textRecord?.doc || null;
      const card = info || (job?.title ? {
        title: job.title,
        thumbnail: job.thumbnail,
        duration: job.duration,
        platform: job.platform,
        uploader: job.uploader,
        keywords: job.keywords,
        hasSubtitles: job.hasSubtitles,
      } : null);

      const transcript = job?.transcript;
      const gifState = job?.gif;
      const clipState = job?.clip;
      const mergeState = job?.merge;
      const ARTIFACT_LABEL = { SRC: '原片', MP4: '截取', GIF: 'GIF', MERGE: '拼接' };
      const artifacts = [
        ...(job?.ready && job.filename
          ? [{
            kind: 'SRC',
            filename: job.filename,
            sizeLabel: job.sizeLabel,
            sizeBytes: job.sizeBytes,
            url: `${API}/media?id=${job.id}`,
          }]
          : []),
        ...(job?.clips || []).map((item) => ({ ...item, kind: 'MP4' })),
        ...(job?.gifs || []).map((item) => ({ ...item, kind: 'GIF' })),
        ...(job?.merges || []).map((item) => ({ ...item, kind: 'MERGE' })),
      ].slice(0, 12);

      const progress = Math.min(100, job?.percent || 0);
      const selLabel = duration > 0 ? t('selRange', { a: clock(start), b: clock(end) }) : t('selUnset');
      const selDelta = Math.max(0, end - start);

      const renderModeSwitch = () => h(
        'div',
        { className: 'wb-tabs' },
        h('button', { type: 'button', className: `wb-tab${!textMode ? ' is-on' : ''}`, onClick: () => { setModeOverride('video'); setError(''); } }, t('videoMode')),
        h('button', { type: 'button', className: `wb-tab${textMode ? ' is-on' : ''}`, onClick: () => { setModeOverride('text'); setError(''); } }, t('textMode')),
      );

      const inputCard = h(
        Card,
        { n: '1', title: t('card1'), note: busy === 'parse'
          ? t('parsing')
          : textMode
            ? (readerDoc ? (readerDoc.source.type === 'url' ? 'URL' : 'TEXT') : t('waitParse'))
            : (!hasInput ? t('waitParse') : (info?.platform || t('detectedVideo'))) },
        h(
          'div',
          { className: 'wb-row' },
          h('input', {
            className: 'wb-input',
            value: inputValue,
            placeholder: textMode ? t('textPlaceholder') : t('urlPlaceholder'),
            spellCheck: false,
            onChange: (event) => setInputValue(event.target.value),
            onKeyDown: (event) => { if (event.key === 'Enter' && !textMode) parse(); },
          }),
          h(
            'button',
            { type: 'button', className: 'wb-btn wb-btn-primary', onClick: parse, disabled: busy === 'parse' || !hasInput },
            busy === 'parse' ? Glyph.spinner(14) : Glyph.radar(14),
            h('span', null, busy === 'parse' ? t('parsing') : (textMode ? t('analyzeText') : t('parse'))),
          ),
        ),
        h(
          'div',
          { className: 'wb-row', style: { marginTop: '10px' } },
          h('span', { className: 'wb-label' }, t('modeLabel')),
          hasInput
            ? h('span', { className: 'wb-chip wb-chip-primary' }, textMode ? t('detectedText') : t('detectedVideo'))
            : h('span', { className: 'wb-chip' }, t('waitParse')),
          h('span', { className: 'wb-label', style: { marginLeft: 'auto' } }, hasInput ? t('autoDetect') : ''),
        ),
        h(
          'div',
          { className: 'wb-row wb-wrap', style: { marginTop: '10px' } },
          h('span', { className: 'wb-label' }, t('supported')),
          ['Bilibili', 'YouTube', 'X / Twitter', '播客 / 直链'].map((name) => h('span', { key: name, className: 'wb-chip' }, name)),
        ),
        !textMode && urlInText && urlInText !== url.trim()
          ? h('div', { className: 'wb-row wb-wrap', style: { marginTop: '8px' } },
            h('span', { className: 'wb-chip wb-chip-primary' }, '已从分享文案中提取链接'),
            h('span', { className: 'wb-mono wb-hint', style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '22em' } }, urlInText))
          : null,
        h('p', { className: 'wb-hint', style: { margin: '9px 0 0' } }, t('supportNote')),
        error
          ? h('div', { className: 'wb-error', style: { marginTop: '10px' } },
            Glyph.warn(14),
            h('span', { style: { flex: 1 } }, error),
            h('button', {
              type: 'button',
              className: 'wb-btn wb-btn-ghost wb-btn-sm',
              style: { marginLeft: 'auto', flex: 'none' },
              disabled: busy === 'sniff',
              onClick: async () => {
                setBusy('sniff');
                setError('');
                try {
                  const res = await callSoft('sniff', { url: targetUrl() });
                  if (!res.ok) throw new Error(res.error || '嗅探失败');
                  setInfo(res.info);
                } catch (err) {
                  setError(String(err.message || err));
                } finally {
                  setBusy('');
                }
              },
            }, busy === 'sniff' ? Glyph.spinner(12) : Glyph.radar(12), busy === 'sniff' ? '正在嗅探…' : '用浏览器嗅探'))
          : null,
        loginPrompt
          ? h(
            'div',
            { className: 'wb-notice', style: { marginTop: '10px', flexDirection: 'column', alignItems: 'flex-start', gap: '8px' } },
            h('strong', null, t('needsLoginTitle')),
            h('span', { className: 'wb-hint' }, t('needsLoginBody')),
            h(
              'div',
              { className: 'wb-row', style: { width: '100%' } },
              h(
                'button',
                {
                  type: 'button',
                  className: 'wb-btn wb-btn-primary wb-btn-sm',
                  disabled: busy === 'browser',
                  onClick: () => grabWithBrowser(loginPrompt.url),
                },
                loginPrompt.opened ? t('grabAgain') : t('grabBody'),
              ),
              h('span', { className: 'wb-hint' }, t('pasteHint')),
            ),
          )
          : null,
        textMode && readerDoc
          ? h(
            'div',
            { className: 'wb-meta' },
            h('div', { className: 'wb-thumb' }),
            h(
              'div',
              { className: 'wb-meta-body' },
              h('span', { className: 'wb-meta-title' }, readerDoc.meta.title),
              h(
                'div',
                { className: 'wb-chips' },
                h('span', { className: 'wb-chip wb-chip-primary' }, readerDoc.source.type === 'url' ? 'URL' : 'TEXT'),
                h('span', { className: 'wb-chip wb-mono' }, `${readerDoc.meta.charCount} 字`),
                h('span', { className: 'wb-chip wb-mono' }, `${readerDoc.stats?.paragraphs || 0} 段`),
                h('span', { className: 'wb-chip wb-mono' }, `${readerDoc.stats?.sections || 0} 节`),
              ),
            ),
          )
          : null,
        !textMode && card
          ? h(
            'div',
            { className: 'wb-meta' },
            card.thumbnail
              ? h('img', { className: 'wb-thumb', src: card.thumbnail, alt: '', loading: 'lazy', referrerPolicy: 'no-referrer' })
              : h('div', { className: 'wb-thumb' }),
            h(
              'div',
              { className: 'wb-meta-body' },
              h('span', { className: 'wb-meta-title' }, card.title),
              h(
                'div',
                { className: 'wb-chips' },
                card.platform ? h('span', { className: 'wb-chip wb-chip-primary' }, card.platform) : null,
                card.duration ? h('span', { className: 'wb-chip wb-mono' }, clock(card.duration)) : null,
                card.hasSubtitles ? h('span', { className: 'wb-chip' }, 'CC') : null,
              ),
            ),
          )
          : null,
        textMode && card?.kind === 'text'
          ? h('pre', { className: 'wb-doc', style: { marginTop: '10px', maxHeight: '160px' } }, card.text || '')
          : null,
      );

      const hasSource = Boolean(job || info);
      const heights = (info?.heights || []).slice(0, 6);
      const downloadCard = h(
        Card,
        { n: '2', title: t('card2'), note: job ? (job.status === 'done' ? t('done') : 'STREAM_SRC // RUNNING') : 'STREAM_SRC // IDLE' },
        hasSource
          ? h(
            'div',
            null,
            h(
              'div',
              { className: 'wb-spec' },
              h('span', { className: 'wb-label' }, t('quality')),
              h('span', { className: 'wb-chip' }, 'H.264 / AAC'),
              h('span', { className: 'wb-chip wb-chip-primary' }, `${heights.length || 1} TRACKS`),
              h('span', { className: 'wb-label', style: { marginLeft: 'auto' } }, 'READY'),
            ),
            h(
              'div',
              { className: 'wb-field' },
              h('span', { className: 'wb-field-label' }, t('quality')),
              h(
                'select',
                { value: quality, onChange: (event) => setQuality(event.target.value) },
                h('option', { value: 'best' }, t('qBest')),
                h('option', { value: '1080' }, t('q1080')),
                h('option', { value: '720' }, t('q720')),
                h('option', { value: '480' }, t('q480')),
                h('option', { value: 'audio' }, t('qAudio')),
              ),
            ),
            heights.length
              ? h(
                'div',
                { className: 'wb-row wb-wrap', style: { marginTop: '9px' } },
                heights.map((height) => h('span', { key: height, className: 'wb-chip' }, `${height}P`)),
              )
              : null,
            h(
              'button',
              {
                type: 'button',
                className: 'wb-btn wb-btn-primary wb-cta',
                style: { marginTop: '10px' },
                onClick: startDownload,
                disabled: busy === 'download' || !url.trim(),
              },
              busy === 'download' ? Glyph.spinner(15) : Glyph.download(15),
              h('span', null, t('download')),
            ),
            job
              ? h(
                'div',
                null,
                h('div', { className: 'wb-bar', style: { marginTop: '12px' } },
                  h('div', { className: `wb-bar-fill${job.status === 'downloading' ? ' is-live' : ''}`, style: { width: `${job.status === 'done' ? 100 : progress}%` } })),
                h(
                  'div',
                  { className: 'wb-row', style: { marginTop: '7px' } },
                  h('span', { className: 'wb-mono wb-label' }, `${Math.round(job.status === 'done' ? 100 : progress)}%`),
                  job.speed ? h('span', { className: 'wb-mono wb-label' }, job.speed) : null,
                  job.eta ? h('span', { className: 'wb-mono wb-label' }, `ETA ${job.eta}`) : null,
                  h('span', { className: 'wb-mono wb-label', style: { marginLeft: 'auto' } }, job.sizeLabel || ''),
                ),
              )
              : null,
          )
          : h(
            'div',
            null,
            h(EmptyBlock, {
              icon: Glyph.download(24),
              title: t('noFormats'),
              text: t('noFormatsBody'),
            }),
            h(
              'div',
              { className: 'wb-field', style: { marginTop: '10px' } },
              h('span', { className: 'wb-field-label' }, t('quality')),
              h(
                'select',
                { disabled: true },
                h('option', null, t('pendingParse')),
              ),
            ),
          ),
      );

      const transcriptCard = h(
        Card,
        { n: '3', title: t('card3'), note: `${t('engine')} · Whisper Local` },
        job
          ? h(
            'div',
            null,
            h(
              'div',
              { className: 'wb-row wb-wrap', style: { marginBottom: '10px' } },
              h(
                'button',
                { type: 'button', className: 'wb-btn wb-btn-ghost wb-btn-sm', onClick: extract, disabled: !ready || busy === 'transcript' || transcript?.status === 'running' },
                transcript?.text ? t('reExtract') : t('extract'),
              ),
              h(
                'button',
                { type: 'button', className: 'wb-btn wb-btn-ghost wb-btn-sm', onClick: translate, disabled: !transcript?.turns?.length || busy === 'translate' || transcript?.translating },
                transcript?.translating ? t('translate') + '…' : t('translate'),
              ),
              transcript?.text
                ? h(
                  'div',
                  { className: 'wb-tabs', style: { marginLeft: 'auto' } },
                  h('button', { type: 'button', className: `wb-tab${tab === 'bilingual' ? ' is-on' : ''}`, disabled: !transcript.translated, onClick: () => setTab('bilingual') }, t('bilingual')),
                  h('button', { type: 'button', className: `wb-tab${tab === 'plain' ? ' is-on' : ''}`, onClick: () => setTab('plain') }, t('plain')),
                  h('button', { type: 'button', className: `wb-tab${showTime ? ' is-on' : ''}`, onClick: () => setShowTime((value) => !value) }, t('timestamps')),
                )
                : null,
            ),
            transcript?.status === 'running' || transcript?.translating
              ? h('div', { className: 'wb-hint', style: { marginBottom: '8px' } }, transcript.progress || '…')
              : null,
            transcript?.text
              ? (tab === 'bilingual' && transcript.turns?.length && transcript.translated
                ? h('div', null, transcript.turns.map((turn, index) => h(
                  'div',
                  { key: `${turn.start}-${index}`, className: 'wb-turn' },
                  h(
                    'div',
                    { className: 'wb-turn-head' },
                    showTime ? h('span', { className: 'wb-turn-time' }, clock(turn.start)) : null,
                    turn.speaker ? h('span', { className: 'wb-chip' }, turn.speaker) : null,
                  ),
                  h('div', { className: 'wb-turn-src' }, turn.text),
                  turn.translation
                    ? h('div', { className: 'wb-turn-dst' }, turn.translation)
                    : h('div', { className: 'wb-turn-dst is-pending' }, transcript.translating ? '…' : '—'),
                )))
                : h('pre', { className: 'wb-doc' }, docText()))
              : h(EmptyBlock, { icon: Glyph.subtitles(22), title: t('transcriptIdle'), text: t('transcriptIdleBody') }),
            transcript?.text
              ? h(
                'div',
                { className: 'wb-row', style: { marginTop: '9px' } },
                h('span', { className: 'wb-label' }, transcript.source === 'subtitle' ? t('sourceSubtitle') : transcript.source === 'asr' ? t('sourceAsr') : t('sourceDescription')),
                h('button', { type: 'button', className: 'wb-btn wb-btn-ghost wb-btn-sm', style: { marginLeft: 'auto' }, onClick: () => copy(docText(), 'doc') }, copied === 'doc' ? t('copied') : t('copy')),
                h('button', { type: 'button', className: 'wb-btn wb-btn-ghost wb-btn-sm', onClick: saveTxt }, t('saveTxt')),
              )
              : null,
          )
          : h(EmptyBlock, { icon: Glyph.subtitles(22), title: t('transcriptIdle'), text: t('transcriptIdleBody') }),
      );

      const playerCard = h(
        Card,
        { n: '4', title: t('card4'), note: ready ? t('viewIdle') : t('viewIdle') },
        h(
          'div',
          { className: 'wb-tc' },
          h('span', { className: 'wb-tc-label' }, t('tc')),
          h('span', { className: 'wb-tc-now' }, clockMs(now)),
          h('span', { className: 'wb-tc-sep' }, '/'),
          h('span', { className: 'wb-tc-total' }, clockMs(duration)),
          h('span', { className: 'wb-tc-fps' }, ready ? `${t('channel')} · AUTO` : t('noSignal')),
        ),
        h(
          'div',
          { className: 'wb-screen' },
          ready
            ? h('video', {
              key: previewSrc || job.id,
              ref: videoRef,
              className: 'wb-video',
              src: previewSrc || `${API}/media?id=${job.id}`,
              controls: !previewSrc,
              preload: 'auto',
              onLoadedMetadata: (event) => {
                if (!previewSrc) return;
                event.currentTarget.play().catch(() => setPlayBlocked(true));
              },
              onEnded: (event) => {
                if (!previewSrc) return;
                if (loop) { event.currentTarget.currentTime = 0; event.currentTarget.play().catch(() => {}); return; }
                setPreviewing(false);
                setPreviewSrc('');
                setNow(start);
              },
              onTimeUpdate: (event) => {
                const video = event.currentTarget;
                setNow(previewSrc ? start + video.currentTime : video.currentTime);
                if (!previewSrc && previewing && video.currentTime >= end) {
                  if (loop) { video.currentTime = start; setNow(start); }
                  else { video.pause(); setPreviewing(false); }
                }
              },
            })
            : h(
              'div',
              { className: 'wb-screen-empty' },
              Glyph.movie(26),
              h('strong', null, t('playerEmpty')),
              h('span', { style: { fontSize: '11.5px' } }, t('playerEmptyBody')),
            ),
        ),
        h(
          'div',
          { className: 'wb-keys' },
          h('span', { className: 'wb-key' }, h('b', null, t('spacePlay')), t('spacePlayLabel')),
          h('span', { className: 'wb-key' }, h('b', null, 'I / O'), t('ioHint')),
          h('span', { className: 'wb-key' }, h('b', null, '← / →'), t('arrowsHint')),
          h('span', { className: 'wb-key-right' }, `${Math.round(selDelta * 10) / 10}s / ${clock(duration)}`),
        ),
        h(
          'div',
          { className: 'wb-sel' },
          h(
            'div',
            { className: 'wb-sel-head' },
            Glyph.cut(13),
            h('span', { className: 'wb-sel-state' }, `${t('selState')}${selLabel}`),
            h('span', { className: 'wb-sel-delta' }, `Δ ${clockMs(selDelta)}`),
          ),
          h(
            'div',
            { className: 'wb-ticks' },
            [0, 0.2, 0.4, 0.6, 0.8, 1].map((ratio) => h('span', { key: ratio, className: 'wb-tick' }, clock(duration * ratio))),
          ),
          h(TrimBar, {
            duration,
            start,
            end,
            current: now,
            onChange: (nextStart, nextEnd) => {
              if (previewSrc) { videoRef.current?.pause(); setPreviewSrc(''); setPreviewing(false); }
              setStart(snapTime(nextStart));
              setEnd(snapTime(nextEnd));
            },
            onSeek: (time) => {
              if (videoRef.current) videoRef.current.currentTime = time;
              setNow(time);
            },
          }),
          h(
            'div',
            { className: 'wb-sel-actions' },
            h('button', { type: 'button', className: 'wb-btn wb-btn-ghost wb-btn-sm', disabled: !ready, onClick: () => mark('in') }, `[ I ] ${t('setIn')}`),
            h('button', { type: 'button', className: 'wb-btn wb-btn-ghost wb-btn-sm', disabled: !ready, onClick: () => mark('out') }, `[ O ] ${t('setOut')}`),
            h('button', { type: 'button', className: 'wb-btn wb-btn-ghost wb-btn-sm', disabled: !ready, onClick: () => { setStart(0); setEnd(duration); } }, t('resetSel')),
            h('span', { style: { flex: 1 } }),
            h('button', { type: 'button', className: 'wb-btn wb-btn-ghost wb-btn-sm', disabled: !ready, onClick: () => nudge('in', -0.5) }, '−0.5s'),
            h('button', { type: 'button', className: 'wb-btn wb-btn-ghost wb-btn-sm', disabled: !ready, onClick: () => nudge('in', -0.1) }, '−0.1s'),
            h('button', { type: 'button', className: 'wb-btn wb-btn-ghost wb-btn-sm', disabled: !ready, onClick: () => nudge('out', 0.1) }, '+0.1s'),
            h('button', { type: 'button', className: 'wb-btn wb-btn-ghost wb-btn-sm', disabled: !ready, onClick: () => nudge('out', 0.5) }, '+0.5s'),
          ),
          h(
            'div',
            { className: 'wb-sel-actions', style: { borderTop: '0' } },
            h('button', { type: 'button', className: 'wb-btn wb-btn-primary wb-btn-sm', disabled: !ready, onClick: togglePreview }, previewing ? t('stopPreview') : t('previewSel')),
            h('button', { type: 'button', className: `wb-btn wb-btn-sm${loop ? ' wb-btn-primary' : ' wb-btn-ghost'}`, disabled: !ready, onClick: () => setLoop((value) => !value) }, loop ? t('loopOn') : t('loopOff')),
            h('button', { type: 'button', className: `wb-btn wb-btn-sm${snap ? ' wb-btn-primary' : ' wb-btn-ghost'}`, disabled: !ready, onClick: () => setSnap((value) => !value) }, snap ? t('snapOn') : t('snapOff')),
            h('span', { className: 'wb-label', style: { marginLeft: 'auto' } },
              `${t('trimHead', { n: `${start.toFixed(1)}s` })} · ${t('trimTail', { n: `${Math.max(0, duration - end).toFixed(1)}s` })}`),
          ),
        ),
        playBlocked ? h('div', { className: 'wb-hint', style: { marginTop: '8px' } }, t('playBlocked')) : null,
        previewSrc ? h('div', { className: 'wb-hint', style: { marginTop: '8px' } }, t('previewHint', { a: clock(start), b: clock(end) })) : null,
      );

      const outputCard = h(
        Card,
        { n: '5', title: t('card5'), note: 'FFmpeg · libx264 / palettegen' },
        h(
          'div',
          { className: 'wb-tiles' },
          h(
            'div',
            { className: 'wb-tile' },
            h(
              'div',
              { className: 'wb-tile-head' },
              h('span', { className: 'wb-tile-icon' }, Glyph.movie(16)),
              h('div', null,
                h('div', { className: 'wb-tile-title' }, t('mp4Title')),
                h('div', { className: 'wb-tile-sub' }, t('mp4Sub'))),
              h('span', { className: 'wb-tile-chip' }, t('mp4Chip')),
            ),
            h(
              'button',
              { type: 'button', className: 'wb-btn wb-btn-primary', disabled: !ready || busy === 'clip', onClick: buildClip },
              clipState?.status === 'running' ? Glyph.spinner(14) : Glyph.download(14),
              h('span', null, ready ? t('mp4Action') : `${t('mp4Action')} ${t('needRange')}`),
            ),
          ),
          h(
            'div',
            { className: 'wb-tile' },
            h(
              'div',
              { className: 'wb-tile-head' },
              h('span', { className: 'wb-tile-icon' }, Glyph.gif(16)),
              h('div', null,
                h('div', { className: 'wb-tile-title' }, t('gifTitle')),
                h('div', { className: 'wb-tile-sub' }, t('gifSub'))),
              h('span', { className: 'wb-tile-chip' }, target === '0' ? t('noCompress') : t('gifChip', { n: target === 'custom' ? customTarget : target })),
            ),
            h(
              'div',
              { className: 'wb-row wb-wrap', style: { gap: '6px' } },
              h(
                'select',
                { className: 'wb-input', style: { width: 'auto', height: '28px', fontSize: '11px' }, value: target, onChange: (event) => setTarget(event.target.value) },
                h('option', { value: '0' }, t('noCompress')),
                h('option', { value: '2' }, '≤ 2 MB'),
                h('option', { value: '5' }, '≤ 5 MB'),
                h('option', { value: '10' }, '≤ 10 MB'),
                h('option', { value: 'custom' }, t('custom')),
              ),
              target === 'custom'
                ? h('input', { className: 'wb-input', style: { width: '64px', height: '28px' }, type: 'number', min: '0.3', step: '0.5', value: customTarget, onChange: (event) => setCustomTarget(event.target.value) })
                : null,
              h('select', { className: 'wb-input', style: { width: 'auto', height: '28px', fontSize: '11px' }, value: fps, onChange: (event) => setFps(event.target.value) },
                ['8', '10', '12', '15', '20'].map((value) => h('option', { key: value, value }, `${value} fps`))),
              h('select', { className: 'wb-input', style: { width: 'auto', height: '28px', fontSize: '11px' }, value: width, onChange: (event) => setWidth(event.target.value) },
                h('option', { value: '0' }, t('original')),
                ['720', '560', '480', '360'].map((value) => h('option', { key: value, value }, `${value}px`))),
            ),
            h(
              'button',
              { type: 'button', className: 'wb-btn wb-btn-primary', disabled: !ready || busy === 'gif', onClick: buildGif },
              gifState?.status === 'running' ? Glyph.spinner(14) : Glyph.gif(14),
              h('span', null, ready ? t('gifAction') : `${t('gifAction')} ${t('needRange')}`),
            ),
          ),
        ),
        clipState?.status === 'running' || gifState?.status === 'running'
          ? h('div', { className: 'wb-hint', style: { marginTop: '8px' } }, clipState?.progress || gifState?.progress || '…')
          : null,
        clipState?.status === 'error' ? h('div', { className: 'wb-error', style: { marginTop: '8px' } }, clipState.error) : null,
        gifState?.status === 'error' ? h('div', { className: 'wb-error', style: { marginTop: '8px' } }, gifState.error) : null,
        gifState?.status === 'done'
          ? h(
            'div',
            { className: 'wb-item', style: { marginTop: '10px', border: '1px solid var(--wb-border)' } },
            h('img', { src: gifState.url, alt: '', style: { width: '92px', border: '1px solid var(--wb-border)' } }),
            h('div', { style: { minWidth: 0 } },
              h('div', { className: 'wb-item-name' }, gifState.filename),
              h('div', { className: 'wb-item-meta' }, `${gifState.width || '原'}px · ${gifState.fps}fps · ${gifState.sizeLabel}`)),
            h('div', { className: 'wb-item-actions' },
              h('a', { className: 'wb-btn wb-btn-ghost wb-btn-sm', href: gifState.url, download: gifState.filename, style: { textDecoration: 'none' } }, t('saveFile')),
              h('button', { type: 'button', className: 'wb-btn wb-btn-ghost wb-btn-sm', onClick: () => call('reveal', { id: job.id, kind: 'gif' }).catch((err) => setError(String(err.message))) }, t('reveal'))),
          )
          : null,
        h(
          'div',
          { className: 'wb-vault', style: { marginTop: '12px' } },
          h(
            'div',
            { className: 'wb-vault-head' },
            Glyph.folder(14),
            h('span', { className: 'wb-vault-title' }, t('vaultTitle')),
            h('span', { className: 'wb-vault-count' }, t('vaultCount', { n: artifacts.length })),
          ),
          artifacts.length
            ? h('div', null, artifacts.map((item) => h(
              'div',
              { key: `${item.kind}-${item.filename}`, className: 'wb-item' },
              h('span', { className: `wb-chip${item.kind === 'SRC' ? ' wb-chip-primary' : ''}` }, ARTIFACT_LABEL[item.kind] || item.kind),
              h(
                'div',
                { style: { minWidth: 0 } },
                h('div', { className: 'wb-item-name' },
                  item.kind === 'MP4' && item.start != null
                    ? `${clock(item.start)} – ${clock(item.end)}`
                    : item.kind === 'MERGE' && item.spans
                      ? `${item.spans} 段拼接`
                      : item.kind === 'SRC' ? '原片（完整）' : item.filename),
                h('div', { className: 'wb-vault-file' }, item.filename),
              ),
              h('span', { className: 'wb-item-meta' }, item.sizeLabel || bytes(item.sizeBytes)),
              h('div', { className: 'wb-item-actions' },
                h('a', { className: 'wb-btn wb-btn-ghost wb-btn-sm', href: item.url, download: item.filename, style: { textDecoration: 'none' } }, t('saveFile')),
                h('button', { type: 'button', className: 'wb-btn wb-btn-ghost wb-btn-sm', onClick: () => call('reveal', {
                  id: job.id,
                  kind: item.kind === 'SRC' ? 'video' : item.kind === 'GIF' ? 'gif' : item.kind === 'MERGE' ? 'merge' : 'clip',
                }).catch(() => {}) }, t('reveal'))),
            )))
            : h('div', { className: 'wb-empty', style: { border: '0', padding: '18px 12px' } },
              Glyph.folder(20),
              h('span', { className: 'wb-empty-text' }, t('vaultEmpty'))),
        ),
      );

      const mergeCard = h(
        Card,
        { n: '6', title: t('card6'), note: t('stage', { n: ranges.length }) },
        h(
          'div',
          { className: 'wb-row', style: { marginBottom: '10px' } },
          h('button', { type: 'button', className: 'wb-btn wb-btn-ghost wb-btn-sm', disabled: !ready, onClick: addRange }, Glyph.plus(13), t('mergeAction')),
          ranges.length
            ? h('button', { type: 'button', className: 'wb-btn wb-btn-primary wb-btn-sm', style: { marginLeft: 'auto' }, disabled: busy === 'merge', onClick: runMerge }, mergeState?.status === 'running' ? t('mergeRun') + '…' : t('mergeRun'))
            : null,
          ranges.length
            ? h('button', { type: 'button', className: 'wb-btn wb-btn-ghost wb-btn-sm', onClick: () => setRanges([]) }, t('clearQueue'))
            : null,
        ),
        ranges.length
          ? h('div', { className: 'wb-queue' }, ranges.map((range, index) => h(
            'div',
            { key: `${range.start}-${range.end}-${index}`, className: 'wb-queue-row' },
            h('span', { className: 'wb-mono' }, t('mergeItem', { a: clock(range.start), b: clock(range.end) })),
            h('span', { className: 'wb-item-meta' }, `${(range.end - range.start).toFixed(1)}s`),
            h('button', { type: 'button', className: 'wb-btn wb-btn-ghost wb-btn-sm', style: { marginLeft: 'auto' }, onClick: () => setRanges((current) => current.filter((_, position) => position !== index)) }, '×'),
          )))
          : h(EmptyBlock, { icon: Glyph.layers(22), title: t('mergeTitle'), text: t('mergeBody') }),
        mergeState?.status === 'running' ? h('div', { className: 'wb-hint', style: { marginTop: '8px' } }, mergeState.progress || '…') : null,
        mergeState?.status === 'error' ? h('div', { className: 'wb-error', style: { marginTop: '8px' } }, mergeState.error) : null,
        h('div', { className: 'wb-hint wb-mono', style: { marginTop: '10px', letterSpacing: '.06em' } }, `[ ${t('stage', { n: ranges.length })} ] · [ ${t('concat')} ]`),
      );

      /* ── 文稿台（数据来自 dsh-reader） ─────────────────────────── */

      const readerTabState = textTab;
      const flatParagraphs = (() => {
        const out = [];
        const walk = (section) => {
          out.push(...(section.paragraphs || []));
          (section.children || []).forEach(walk);
        };
        (readerDoc?.sections || []).forEach(walk);
        return out;
      })();

      const jumpToPid = (pid) => {
        if (!pid) return;
        const node = document.querySelector(`[data-pid="${pid}"]`);
        if (!node) return;
        node.scrollIntoView({ behavior: 'smooth', block: 'center' });
        node.classList.add('wb-hit');
        setTimeout(() => node.classList.remove('wb-hit'), 2000);
      };

      const renderSections = (sections, depth = 0) => sections.map((section) => h(
        'div',
        { key: section.id, style: { marginBottom: depth === 0 ? '10px' : '6px' } },
        section.heading
          ? h('div', {
            className: depth === 0 ? 'wb-sec-title' : 'wb-sec-sub',
            style: { paddingLeft: `${depth * 10}px` },
          }, section.heading)
          : null,
        (section.paragraphs || []).map((paragraph) => h(
          'p',
          { key: paragraph.id, 'data-pid': paragraph.id, className: 'wb-para-line' },
          paragraph.text,
        )),
        section.children?.length ? renderSections(section.children, depth + 1) : null,
      ));

      const textSourceCard = h(
        Card,
        { n: '2', title: '原文', note: readerDoc ? `${readerDoc.meta.charCount} 字 · ${flatParagraphs.length} 段` : '' },
        readerDoc
          ? h('div', { className: 'wb-reader-source' }, renderSections(readerDoc.sections || []))
          : h(EmptyBlock, { icon: Glyph.subtitles(20), title: '先贴一段正文或链接', text: '支持 Markdown 标题、中文章节标记；链接会自动抽正文。' }),
      );

      const summaryView = () => {
        const data = textRecord?.summary;
        if (!data) return h(EmptyBlock, { icon: Glyph.radar(20), title: '还没有摘要', text: '点「生成」按摘要 / 金句 / 导图分别生成。' });
        return h(
          'div',
          null,
          h('div', { className: 'wb-out-oneline' }, data.oneLine),
          h('p', { className: 'wb-out-paragraph' }, data.paragraph),
          h('div', { className: 'wb-label', style: { margin: '12px 0 6px' } }, 'BY SECTION'),
          (data.bySection || []).map((item, index) => h(
            'div',
            { key: index, className: 'wb-out-section' },
            h('span', { className: 'wb-chip' }, item.sectionId || `s${index + 1}`),
            h('strong', null, item.heading),
            h('div', { className: 'wb-hint' }, item.summary),
          )),
        );
      };

      const quotesView = () => {
        const data = textRecord?.quotes;
        if (!data) return h(EmptyBlock, { icon: Glyph.cut(20), title: '还没有金句', text: '生成后每条都带原文段落，点一下跳到左侧对应位置。' });
        return h(
          'div',
          null,
          (data.quotes || []).map((quote, index) => h(
            'button',
            {
              key: index,
              type: 'button',
              className: 'wb-quote',
              onClick: () => jumpToPid(quote.paragraphId),
            },
            h('span', { className: 'wb-quote-text' }, `「${quote.text}」`),
            h('span', { className: 'wb-quote-meta' },
              h('span', { className: 'wb-chip wb-chip-primary' }, quote.category),
              h('span', { className: 'wb-mono' }, quote.paragraphId),
              quote.reason ? h('span', { className: 'wb-hint' }, quote.reason) : null),
          )),
          data.dropped?.length
            ? h('div', { className: 'wb-hint', style: { marginTop: '8px' } }, `已丢弃 ${data.dropped.length} 条无法在原文中定位的条目`)
            : null,
        );
      };

      const mindmapView = () => {
        const data = textRecord?.mindmap;
        if (!data) return h(EmptyBlock, { icon: Glyph.layers(20), title: '还没有导图', text: '生成后可按层级展开，点叶子跳到原文。' });
        const renderNode = (node, depth) => h(
          'div',
          { key: `${depth}-${node.text}`, className: 'wb-mm-node', style: { paddingLeft: `${depth * 14}px` } },
          h(
            'button',
            {
              type: 'button',
              className: `wb-mm-line${node.pid ? ' is-leaf' : ''}`,
              onClick: () => jumpToPid(node.pid),
            },
            depth === 0 ? '■' : (node.children?.length ? '▸' : '·'),
            h('span', null, node.text),
            node.pid ? h('span', { className: 'wb-mm-pid' }, node.pid) : null,
          ),
          node.children?.length ? node.children.map((child) => renderNode(child, depth + 1)) : null,
        );
        return h(
          'div',
          null,
          h('div', { className: 'wb-mm-tree' }, data.tree ? renderNode(data.tree, 0) : h('div', { className: 'wb-hint' }, '导图为空')),
          h(
            'div',
            { className: 'wb-row', style: { marginTop: '10px' } },
            h('button', {
              type: 'button',
              className: 'wb-btn wb-btn-ghost wb-btn-sm',
              onClick: () => {
                const blob = new Blob([data.markdown || ''], { type: 'text/markdown;charset=utf-8' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = `${readerDoc?.meta.title || 'mindmap'}.md`;
                link.click();
                setTimeout(() => URL.revokeObjectURL(link.href), 4000);
              },
            }, '导出 .md'),
            data.invalid ? h('span', { className: 'wb-hint' }, `已剥离 ${data.invalid} 个无效段落引用`) : null,
          ),
        );
      };

      const textResultCard = h(
        Card,
        { n: '3', title: '分析', note: readerDoc?.meta.title || '' },
        h(
          'div',
          { className: 'wb-row wb-wrap', style: { marginBottom: '10px' } },
          h(
            'div',
            { className: 'wb-tabs' },
            [['summary', '摘要'], ['quotes', '金句'], ['mindmap', '导图']].map(([key, label]) => h(
              'button',
              {
                key,
                type: 'button',
                className: `wb-tab${textTab === key ? ' is-on' : ''}`,
                onClick: () => {
                  setTextTab(key);
                  if (!textRecord?.[key]) runReader(key);
                },
              },
              label,
            )),
          ),
          h('button', {
            type: 'button',
            className: 'wb-btn wb-btn-primary wb-btn-sm',
            style: { marginLeft: 'auto' },
            disabled: !readerDoc || Boolean(textRecord?.busy),
            onClick: () => runReaderAll(),
          }, textRecord?.busy ? Glyph.spinner(12) : Glyph.radar(12), textRecord?.busy ? '生成中…' : '生成全部'),
          textRecord?.stages?.length
            ? h('span', { className: 'wb-hint' }, textRecord.stages[textRecord.stages.length - 1])
            : null,
        ),
        h(
          'div',
          null,
          textTab === 'summary' ? summaryView() : textTab === 'quotes' ? quotesView() : mindmapView(),
        ),
        textRecord?.error ? h('div', { className: 'wb-error', style: { marginTop: '10px' } }, textRecord.error) : null,
      );

      return h(
        'div',
        { className: 'wb-root' },
        h(StyleSheet),
        h(
          'header',
          { className: 'wb-top' },
          h('span', { className: 'wb-mark' }, Glyph.movie(17)),
          h('div', { className: 'wb-brand' },
            h('span', { className: 'wb-brand-title' }, t('title')),
            h('span', { className: 'wb-ver' }, 'v2.0 · local')),
          h('div', { className: 'wb-top-right' },
            renderModeSwitch(),
            h('button', { type: 'button', className: 'wb-btn wb-btn-ghost wb-btn-sm', disabled: !job, onClick: () => job && call('reveal', { id: job.id, kind: 'video' }).catch(() => {}) }, Glyph.folder(13), t('openFinder')),
            h('button', { type: 'button', className: `wb-btn wb-btn-sm ${confirmClear ? 'wb-btn-danger is-armed' : 'wb-btn-ghost'}`, disabled: !job && !info && !url && !textRecord, onClick: clearBoard }, Glyph.trash(13), confirmClear ? t('clearConfirm') : t('clear'))),
        ),
        h(
          'div',
          { className: 'wb-body' },
          h('div', { className: 'wb-col' },
            inputCard,
            textMode ? textSourceCard : downloadCard,
            textMode ? null : transcriptCard),
          h('div', { className: 'wb-col' },
            textMode ? textResultCard : playerCard,
            textMode ? null : outputCard,
            textMode ? null : mergeCard),
        ),
      );
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, { zh: ZH, en: EN }), 'dsh-clipforge: dictionaries');
        const t = ctx.locale.bind(NS);
        ctx.slots.inject('main', () => ctx.slots.register({ name: 'main', key: PANEL_ID, locale: NS, inject: () => ({ t }) }, Workbench));
        ctx.slots.inject('sidebar.panellist', () => ctx.slots.register(
          { name: 'sidebar.panellist', id: PANEL_ID, order: 7, locale: NS, label: () => t('panel') },
          ({ size }) => h('span', { style: { display: 'inline-flex', color: 'currentColor' } }, Glyph.movie(size || 16)),
        ));
      },
    };
  },
});
