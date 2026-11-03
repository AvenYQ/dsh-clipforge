/**
 * Host half of the Workbench bundle.
 *
 * Owns the local pipeline (yt-dlp → ffmpeg → whisper.cpp) and serves it to the Web UI over
 * `/workbench/api`. The page never spawns processes; it only talks to these routes.
 */
import { createReadStream } from 'node:fs';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';

import {
  PATHS,
  cleanTitle,
  describeTools,
  download,
  ensureDirs,
  formatBytes,
  makeGif,
  clipVideo,
  downloadSniffed,
  downloadDouyin,
  keyframes,
  previewClip,
  keywords,
  mergeClips,
  probe,
  safeSlug,
  transcribe,
} from './lib/media.js';
import { labelSpeakers, llmAvailable, targetFor, translateTurns } from './lib/nlp.js';
import { analyze, guessTitle, splitParagraphs, translateParagraphs } from './lib/textbench.js';
import { browserReady, fetchWithBrowser, openInBrowser } from './lib/browser.js';
import { captureCookies, cookiePathFor } from './lib/cookies.js';
import { sniffMedia } from './lib/sniff.js';
import { douyinInfo, isDouyin } from './lib/douyin.js';

export const inject = ['webServer'];

const API_PREFIX = '/clipforge/api';
const API_PREFIX_LEGACY = '/workbench/api';

const MIME = {
  '.mp4': 'video/mp4',
  '.m4a': 'audio/mp4',
  '.webm': 'video/webm',
  '.mkv': 'video/x-matroska',
  '.mov': 'video/quicktime',
  '.gif': 'image/gif',
  '.wav': 'audio/wav',
  '.srt': 'text/plain; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

function mimeOf(file) {
  return MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
}

function send(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function fail(res, error) {
  send(res, 200, { ok: false, error: String(error?.message || error) });
}

function readBody(req, limit = 2 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error('请求体过大'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('请求体不是合法 JSON'));
      }
    });
    req.on('error', reject);
  });
}

async function serveFile(req, res, filePath) {
  let stat;
  try {
    stat = await fsp.stat(filePath);
  } catch {
    send(res, 404, { ok: false, error: '文件不存在' });
    return;
  }
  if (!stat.isFile()) {
    send(res, 404, { ok: false, error: '不是文件' });
    return;
  }
  const headers = {
    'Content-Type': mimeOf(filePath),
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'no-cache',
    'Last-Modified': stat.mtime.toUTCString(),
  };
  const range = req.headers.range;
  if (range) {
    const match = /bytes=(\d*)-(\d*)/.exec(String(range));
    let start = match?.[1] ? Number(match[1]) : 0;
    let end = match?.[2] ? Number(match[2]) : stat.size - 1;
    if (!match || Number.isNaN(start) || Number.isNaN(end) || start > end || start >= stat.size) {
      res.writeHead(416, { 'Content-Range': `bytes */${stat.size}` });
      res.end();
      return;
    }
    end = Math.min(end, stat.size - 1);
    res.writeHead(206, {
      ...headers,
      'Content-Range': `bytes ${start}-${end}/${stat.size}`,
      'Content-Length': end - start + 1,
    });
    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    createReadStream(filePath, { start, end }).pipe(res);
    return;
  }
  res.writeHead(200, { ...headers, 'Content-Length': stat.size });
  if (req.method === 'HEAD') {
    res.end();
    return;
  }
  createReadStream(filePath).pipe(res);
}

function nowId() {
  return Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
}


function stripRefs(text) {
  return String(text || '').replace(/\s*\[¶[\d,\s¶]+\]/g, '').trim();
}

function refsText(refs) {
  const list = Array.isArray(refs) ? refs : refs ? [refs] : [];
  return list.length ? list.map((n) => `[¶${n}]`).join('') : '';
}

function textView(record) {
  return {
    id: record.id,
    title: record.title,
    source: record.source,
    chars: record.chars,
    createdAt: record.createdAt,
    paragraphs: record.paragraphs,
    status: record.status,
    progress: record.progress,
    error: record.error,
    result: record.result,
    translation: record.translation,
    translationStatus: record.translationStatus || 'idle',
    translationError: record.translationError || '',
  };
}

function renderMarkdown(record) {
  const result = record.result || {};
  const lines = [
    `# ${record.title}`,
    '',
    `> ${record.chars} 字${record.source ? ` · 来源 ${record.source}` : ''} · 生成于 ${new Date().toLocaleString('zh-CN')}`,
    '',
  ];
  if (result.oneLiner) lines.push('## 一句话结论', '', result.oneLiner, '');
  if (result.bullets?.length) {
    lines.push('## 要点', '');
    for (const bullet of result.bullets) lines.push(`- ${stripRefs(bullet.text)} ${refsText(bullet.refs)}`);
    lines.push('');
  }
  if (result.outline?.length) {
    lines.push('## 大纲', '');
    for (const node of result.outline) lines.push(`${'  '.repeat(Math.max(0, (node.level || 1) - 1))}- ${stripRefs(node.text)} ${refsText(node.refs)}`);
    lines.push('');
  }
  if (result.quotes?.length) {
    lines.push('## 金句', '');
    for (const quote of result.quotes) lines.push(`> ${quote.text} ${quote.ref ? `[¶${quote.ref}]` : ''}`, '');
  }
  if (result.concepts?.length) {
    lines.push('## 概念', '', '| 术语 | 解释 | 段落 |', '| --- | --- | --- |');
    for (const concept of result.concepts) lines.push(`| ${concept.term} | ${concept.explain} | ${refsText(concept.refs)} |`);
    lines.push('');
  }
  if (result.questions?.length) {
    lines.push('## 延伸问题', '');
    result.questions.forEach((item, index) => lines.push(`${index + 1}. ${item.q}${item.why ? ` —— ${item.why}` : ''}`));
    lines.push('');
  }
  if (record.translation?.length) {
    const byN = new Map(record.translation.map((item) => [item.n, item.text]));
    lines.push('## 双语对照', '');
    for (const paragraph of record.paragraphs) {
      const translated = byN.get(paragraph.n);
      if (!translated) continue;
      lines.push(`**¶${paragraph.n}**`, '', paragraph.text, '', translated, '');
    }
  }
  return lines.join('\n');
}

export function apply(ctx) {
  const jobs = new Map();
  const texts = new Map();
  const sniffCache = new Map();
  let saveTimer = null;

  const persist = () => {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveTimer = null;
      const rows = [...jobs.values()].map((job) => ({
        id: job.id,
        url: job.url,
        title: job.title,
        cleanTitle: job.cleanTitle,
        uploader: job.uploader,
        duration: job.duration,
        thumbnail: job.thumbnail,
        platform: job.platform,
        description: job.description,
        keywords: job.keywords,
        filename: job.filename,
        filePath: job.filePath,
        sizeBytes: job.sizeBytes,
        createdAt: job.createdAt,
        gifs: job.gifs,
        clips: job.clips || [],
        merges: job.merges || [],
        transcriptSource: job.transcript?.source || null,
        transcriptChars: job.transcript?.text?.length || 0,
      }));
      fsp.writeFile(PATHS.index, JSON.stringify({ version: 1, jobs: rows }, null, 2)).catch(() => {});
    }, 300);
    saveTimer.unref?.();
  };

  const view = (job) => ({
    id: job.id,
    url: job.url,
    title: job.title,
    cleanTitle: job.cleanTitle,
    uploader: job.uploader,
    duration: job.duration,
    thumbnail: job.thumbnail,
    platform: job.platform,
    description: job.description,
    keywords: job.keywords,
    heights: job.heights,
    hasSubtitles: job.hasSubtitles,
    status: job.status,
    stage: job.stage || '',
    percent: Math.round((job.percent || 0) * 10) / 10,
    speed: job.speed || '',
    eta: job.eta || '',
    sizeBytes: job.sizeBytes || 0,
    sizeLabel: formatBytes(job.sizeBytes || 0),
    filename: job.filename || '',
    ready: Boolean(job.filePath),
    error: job.error || '',
    createdAt: job.createdAt,
    transcript: job.transcript
      ? {
        status: job.transcript.status,
        progress: job.transcript.progress || '',
        source: job.transcript.source || '',
        lang: job.transcript.lang || '',
        note: job.transcript.note || '',
        text: job.transcript.text || '',
        timeline: job.transcript.timeline || '',
        segments: job.transcript.segments?.length || 0,
        cues: (job.transcript.segments || []).map((segment) => Math.round((segment.end || 0) * 10) / 10).slice(0, 4000),
        turns: (job.transcript.turns || []).slice(0, 800),
        target: job.transcript.target || '',
        translating: Boolean(job.transcript.translating),
        translated: Boolean(job.transcript.translated),
        translateNote: job.transcript.translateNote || '',
      }
      : null,
    gifs: job.gifs || [],
    gif: job.gif || null,
    clips: job.clips || [],
    clip: job.clip || null,
    merges: job.merges || [],
    merge: job.merge || null,
    keyframeCount: (job.keyframes || []).length,
  });

  const sidecarOf = (id) => path.join(PATHS.tmp, `${id}.transcript.json`);

  /** 转写完成后补一层：说话人切分 + 逐句翻译。失败只记备注，不影响原文。 */
  const enrichTranscript = (job, { force = false } = {}) => {
    const transcript = job.transcript;
    if (!transcript || transcript.status !== 'done' || !transcript.turns?.length) return;
    if (transcript.enriching) return;
    if (!force && transcript.translated) return;
    transcript.enriching = true;
    transcript.translating = true;
    transcript.progress = '准备翻译';

    (async () => {
      try {
        if (!(await llmAvailable(true))) {
          transcript.translateNote = '本机翻译网关没开，只显示原文';
          return;
        }
        transcript.target = transcript.target || targetFor(transcript.text);
        if (force) transcript.turns.forEach((turn) => { turn.translation = ''; });

        const labels = await labelSpeakers(transcript.turns, {
          onProgress(progress) { transcript.progress = progress; },
          context: [job.title, job.uploader].filter(Boolean).join(' · '),
        }).catch(() => null);
        if (labels) {
          transcript.turns.forEach((turn, index) => { turn.speaker = labels[index]; });
        }

        const translations = await translateTurns(transcript.turns, transcript.target, {
          onProgress(progress) { transcript.progress = progress; },
          context: [job.title, job.uploader].filter(Boolean).join(' · '),
        });
        transcript.turns.forEach((turn, index) => {
          if (translations[index]) turn.translation = translations[index];
        });
        transcript.translated = transcript.turns.some((turn) => turn.translation);
        transcript.translateNote = '';
      } catch (error) {
        transcript.translateNote = String(error?.message || error);
      } finally {
        transcript.enriching = false;
        transcript.translating = false;
        transcript.progress = '';
        fsp.writeFile(sidecarOf(job.id), JSON.stringify(transcript)).catch(() => {});
        persist();
      }
    })();
  };

  const api = {
    async health() {
      await ensureDirs();
      let clients = null;
      try {
        const modules = ctx.get?.('clientModules') ?? ctx.clientModules;
        const graph = modules?.graph?.();
        const ids = Array.isArray(graph?.entries)
          ? graph.entries.map((entry) => entry.id || entry.packageName).filter(Boolean)
          : Object.keys(graph?.table || {});
        clients = { inGraph: ids.includes('@local/dsh-clipforge'), count: ids.length };
      } catch (error) {
        clients = { error: String(error?.message || error) };
      }
      return { ok: true, ...describeTools(), jobs: jobs.size, clients };
    },

    async probe({ url }) {
      if (!url || typeof url !== 'string') throw new Error('缺少链接');
      await ensureDirs();
      const value = url.trim();
      const host = (() => { try { return new URL(value).hostname.replace(/^www\./, ''); } catch { return ''; } })();

      if (isDouyin(value)) {
        try {
          const info = await douyinInfo(value);
          return {
            ok: true,
            info: {
              kind: 'douyin',
              url: value,
              title: info.title,
              cleanTitle: cleanTitle(info.title),
              uploader: '',
              duration: info.duration,
              thumbnail: info.cover,
              platform: 'DOUYIN',
              description: info.title,
              keywords: [],
              heights: [],
              hasSubtitles: false,
              playUrl: info.playUrl,
            },
          };
        } catch (error) {
          return { ok: false, error: String(error?.message || error), host, canSniff: true };
        }
      }

      try {
        const info = await probe(value);
        return { ok: true, info };
      } catch (error) {
        const message = String(error?.message || error);
        if (/cookie/i.test(message) && host && !/douyin|iesdouyin|tiktok/i.test(host)) {
          try {
            const file = await captureCookies(host);
            const info = await probe(value, { cookies: file });
            return { ok: true, info, cookies: true };
          } catch { /* 采集失败就落到浏览器嗅探 */ }
        }
        const canSniff = true;
        const needsLogin = /登录|login|sign in|signin|要求授权|403|401/i.test(message) || /^(x|twitter|weibo|xiaohongshu)\./i.test(host);
        return { ok: false, error: message, needsLogin, host, url: value, canSniff };
      }
    },

    async download({ url, quality = 'best', audio = false, sniff = false, douyin = false }) {
      if (!url) throw new Error('缺少链接');
      await ensureDirs();
      const known = [...jobs.values()].find((job) => job.url === url
        && job.audio === Boolean(audio)
        && (job.filePath || job.status === 'downloading' || job.status === 'queued'));
      if (known) return { ok: true, job: view(known), reused: true };

      let meta = {};
      let sniffed = null;
      let douyinPlay = '';
      if (douyin) {
        const info = await douyinInfo(url);
        douyinPlay = info.playUrl;
        meta = { title: info.title, cleanTitle: cleanTitle(info.title), platform: 'DOUYIN', duration: info.duration, thumbnail: info.cover };
      } else if (sniff) {
        const cached = sniffCache.get(url);
        sniffed = cached && Date.now() - cached.at < 5 * 60 * 1000 ? cached.sniffed : await sniffMedia(url);
        sniffCache.set(url, { at: Date.now(), sniffed });
        meta = {
          title: sniffed.title || '未命名视频',
          cleanTitle: cleanTitle(sniffed.title || ''),
          platform: 'SNIFF',
          description: sniffed.description || '',
          duration: 0,
        };
      } else {
        try {
          meta = await probe(url);
        } catch {
          meta = {};
        }
      }
      if (meta.kind === 'text') throw new Error('这条是文字帖，没有视频可下载');
      const id = nowId();
      const job = {
        id,
        url,
        audio: Boolean(audio),
        quality,
        title: meta.title || '未命名',
        cleanTitle: meta.cleanTitle || cleanTitle(meta.title || ''),
        uploader: meta.uploader || '',
        duration: meta.duration || 0,
        thumbnail: meta.thumbnail || '',
        platform: meta.platform || '',
        description: meta.description || '',
        keywords: meta.keywords || [],
        heights: meta.heights || [],
        hasSubtitles: meta.hasSubtitles || false,
        status: 'downloading',
        stage: '排队中',
        percent: 0,
        createdAt: Date.now(),
        gifs: [],
        clips: [],
      };
      jobs.set(id, job);
      persist();

      const host = (() => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; } })();
      const cookieFile = host ? cookiePathFor(host) : '';
      if (cookieFile && fs.existsSync(cookieFile)) job.cookies = cookieFile;
      const runner = douyinPlay
        ? downloadDouyin(job, douyinPlay, { onProgress: (stage) => { job.stage = stage; } })
        : sniffed
          ? downloadSniffed(job, sniffed, { onProgress: (stage) => { job.stage = stage; } })
          : download(job);
      runner
        .then(() => {
          job.status = 'done';
          persist();
        })
        .catch((error) => {
          job.status = 'error';
          job.error = String(error?.message || error);
          persist();
        });

      return { ok: true, job: view(job) };
    },

    async jobs() {
      return {
        ok: true,
        jobs: [...jobs.values()].sort((a, b) => b.createdAt - a.createdAt).map(view),
      };
    },

    async sniff({ url }) {
      if (!url) throw new Error('缺少链接');
      const sniffed = await sniffMedia(url);
      if (!sniffed.video) throw new Error('浏览器里没拦到视频流（页面可能没播放）');
      sniffCache.set(url, { at: Date.now(), sniffed });
      return {
        ok: true,
        info: {
          kind: 'sniff',
          url,
          title: sniffed.title || '未命名视频',
          cleanTitle: cleanTitle(sniffed.title || ''),
          uploader: '', duration: 0, thumbnail: '',
          platform: 'SNIFF', description: sniffed.description || '', keywords: [], heights: [], hasSubtitles: false,
          sniff: { video: Boolean(sniffed.video), audio: Boolean(sniffed.audio) },
        },
      };
    },

    async job({ id }) {
      const job = jobs.get(id);
      if (!job) throw new Error('找不到这个任务');
      return { ok: true, job: view(job) };
    },

    async transcript({ id, force = false }) {
      const job = jobs.get(id);
      if (!job) throw new Error('找不到这个任务');
      if (!job.filePath) throw new Error('还没下载完');
      if (job.transcript?.status === 'running') return { ok: true, job: view(job) };
      if (job.transcript?.text && !force) return { ok: true, job: view(job), cached: true };

      job.transcript = { status: 'running', progress: '准备中', text: '', timeline: '', segments: [] };
      persist();
      transcribe(job, {
        onProgress(progress) {
          job.transcript.progress = progress;
        },
      })
        .then((result) => {
          job.transcript = { status: 'done', ...result };
          if (result.source === 'description') {
            job.description = job.description || result.text;
          }
          if ((result.text || '').length > 40) {
            job.keywords = keywords(`${job.title} ${result.text.slice(0, 2000)}`, 4);
          }
          fsp.writeFile(sidecarOf(job.id), JSON.stringify(job.transcript)).catch(() => {});
          persist();
        })
        .catch((error) => {
          job.transcript = {
            status: 'error',
            progress: '',
            text: '',
            timeline: '',
            segments: [],
            error: String(error?.message || error),
          };
          persist();
        });
      return { ok: true, job: view(job) };
    },

    async gif({ id, start, end, targetMB = 0, fps = 0, width = 0, name }) {
      const job = jobs.get(id);
      if (!job) throw new Error('找不到这个任务');
      if (!job.filePath) throw new Error('还没下载完');
      const gif = {
        status: 'running',
        progress: '准备渲染',
        targetMB: Number(targetMB) || 0,
        startedAt: Date.now(),
      };
      job.gif = gif;
      persist();
      makeGif(job, { start, end, targetMB, fps, width, name }, {
        onProgress(progress) {
          gif.progress = progress;
        },
      })
        .then((result) => {
          job.gif = {
            status: 'done',
            progress: '',
            ...result,
            sizeLabel: formatBytes(result.sizeBytes),
            url: `${API_PREFIX}/file?id=${job.id}&kind=gif&name=${encodeURIComponent(result.filename)}`,
            createdAt: Date.now(),
          };
          job.gifs = [job.gif, ...(job.gifs || [])].slice(0, 24);
          persist();
        })
        .catch((error) => {
          job.gif = { status: 'error', error: String(error?.message || error), progress: '' };
          persist();
        });
      return { ok: true, job: view(job) };
    },

    async clip({ id, start, end, mode = 'fast', name }) {
      const job = jobs.get(id);
      if (!job) throw new Error('找不到这个任务');
      if (!job.filePath) throw new Error('还没下载完');
      const clip = { status: 'running', progress: '准备切片', mode, targetMB: 0 };
      job.clip = clip;
      persist();
      clipVideo(job, { start, end, mode, name }, {
        onProgress(progress) {
          clip.progress = progress;
        },
      })
        .then((result) => {
          job.clip = {
            status: 'done',
            progress: '',
            ...result,
            url: `${API_PREFIX}/file?id=${job.id}&kind=clip&name=${encodeURIComponent(result.filename)}`,
            createdAt: Date.now(),
          };
          job.clips = [job.clip, ...(job.clips || [])].slice(0, 24);
          persist();
        })
        .catch((error) => {
          job.clip = { status: 'error', error: String(error?.message || error), progress: '' };
          persist();
        });
      return { ok: true, job: view(job) };
    },

    async translate({ id, force = false }) {
      const job = jobs.get(id);
      if (!job) throw new Error('找不到这个任务');
      if (!job.transcript?.turns?.length) throw new Error('先提取文案再翻译');
      enrichTranscript(job, { force });
      return { ok: true, job: view(job) };
    },

    async preview({ id, start, end }) {
      const job = jobs.get(id);
      if (!job) throw new Error('找不到这个任务');
      if (!job.filePath) throw new Error('还没下载完');
      const clip = await previewClip(job, { start, end });
      return {
        ok: true,
        preview: {
          url: `${API_PREFIX}/file?id=${job.id}&kind=preview&name=${encodeURIComponent(clip.filename)}&t=${Date.now()}`,
          filename: clip.filename,
          start: clip.start,
          end: clip.end,
          duration: clip.duration,
        },
      };
    },

    async textCreate({ raw, source = '', title = '' }) {
      const body = String(raw || '').trim();
      if (body.length < 40) throw new Error('正文太短了（至少 40 字）');
      await ensureDirs();
      const paragraphs = splitParagraphs(body);
      const id = `t${nowId()}`;
      const record = {
        id,
        kind: 'text',
        title: String(title || guessTitle(paragraphs)).slice(0, 60),
        source,
        chars: body.length,
        paragraphs,
        createdAt: Date.now(),
        result: null,
        translation: null,
        status: 'idle',
        progress: '',
        error: '',
      };
      texts.set(id, record);
      return { ok: true, text: textView(record) };
    },

    async textAnalyze({ id }) {
      const record = texts.get(id);
      if (!record) throw new Error('找不到这篇文稿');
      if (record.status === 'running') return { ok: true, text: textView(record) };
      record.status = 'running';
      record.progress = '准备分析';
      record.error = '';
      (async () => {
        try {
          const result = await analyze(record.paragraphs, {
            title: record.title,
            onProgress(progress) { record.progress = progress; },
          });
          record.result = result;
          record.status = 'done';
          record.progress = '';
        } catch (error) {
          record.status = 'error';
          record.error = String(error?.message || error);
          record.progress = '';
        }
      })();
      return { ok: true, text: textView(record) };
    },

    async textFromUrl({ url }) {
      if (!browserReady()) throw new Error('本机没有可用的 ego 浏览器 + Chrome');
      const page = await fetchWithBrowser(url);
      if (!page.text || page.text.trim().length < 60) {
        return { ok: false, needsLogin: true, error: '页面没返回正文，可能还需要登录', url: page.url };
      }
      const paragraphs = splitParagraphs(page.text);
      const id = `t${nowId()}`;
      const record = {
        id,
        kind: 'text',
        title: String(page.title || guessTitle(paragraphs)).slice(0, 60),
        source: url,
        chars: page.text.length,
        paragraphs,
        createdAt: Date.now(),
        result: null,
        translation: null,
        status: 'idle',
        progress: '',
        error: '',
      };
      texts.set(id, record);
      return { ok: true, text: textView(record) };
    },

    async textTranslate({ id }) {
      const record = texts.get(id);
      if (!record) throw new Error('找不到这篇文稿');
      if (record.translationStatus === 'running') return { ok: true, text: textView(record) };
      record.translationStatus = 'running';
      record.progress = '准备翻译';
      (async () => {
        try {
          record.translation = await translateParagraphs(record.paragraphs, {
            onProgress(progress) { record.progress = progress; },
          });
          record.translationStatus = 'done';
        } catch (error) {
          record.translationStatus = 'error';
          record.translationError = String(error?.message || error);
        } finally {
          record.progress = '';
        }
      })();
      return { ok: true, text: textView(record) };
    },

    async textJob({ id }) {
      const record = texts.get(id);
      if (!record) throw new Error('找不到这篇文稿');
      return { ok: true, text: textView(record) };
    },

    async textExport({ id }) {
      const record = texts.get(id);
      if (!record) throw new Error('找不到这篇文稿');
      if (!record.result) throw new Error('还没生成内容');
      await fsp.mkdir(PATHS.text, { recursive: true });
      const markdown = renderMarkdown(record);
      const stem = String(record.title || '文稿').replace(/[\\/:*?"<>|\n]/g, ' ').slice(0, 40).trim() || '文稿';
      const stamp = new Date().toISOString().slice(0, 16).replace(/[T:]/g, '-');
      const file = path.join(PATHS.text, `${stamp}-${stem}.md`);
      await fsp.writeFile(file, markdown, 'utf8');
      await fsp.writeFile(file.replace(/\.md$/, '.json'), JSON.stringify(record, null, 2), 'utf8');
      return { ok: true, path: file, markdown };
    },

    async browserStatus() {
      return { ok: true, ready: browserReady() };
    },

    /** 用登录态的浏览器打开链接取正文；拿不到正文时回报 needsLogin。 */
    async browserFetch({ url }) {
      if (!browserReady()) throw new Error('本机没有可用的 ego 浏览器 + Chrome，抓不了登录页');
      const page = await fetchWithBrowser(url);
      if (!page.text || page.text.trim().length < 60) {
        return { ok: false, needsLogin: true, error: '页面没返回正文，可能还需要登录', url: page.url };
      }
      return { ok: true, page };
    },

    /** 在浏览器里打开链接，用户自己完成登录。 */
    async browserOpen({ url }) {
      if (!browserReady()) throw new Error('本机没有可用的 ego 浏览器 + Chrome');
      await openInBrowser(url);
      return { ok: true };
    },

    async openExternal({ url }) {
      if (!/^https?:\/\//i.test(String(url || ''))) throw new Error('只支持 http(s) 链接');
      const { spawn } = await import('node:child_process');
      spawn('open', [url], { detached: true, stdio: 'ignore' }).unref();
      return { ok: true };
    },

    async keyframes({ id }) {
      const job = jobs.get(id);
      if (!job) throw new Error('找不到这个任务');
      if (!job.filePath) throw new Error('还没下载完');
      if (!job.keyframes) job.keyframes = await keyframes(job);
      return { ok: true, keyframes: job.keyframes, count: job.keyframes.length };
    },

    async merge({ id, ranges, name }) {
      const job = jobs.get(id);
      if (!job) throw new Error('找不到这个任务');
      if (!job.filePath) throw new Error('还没下载完');
      if (!Array.isArray(ranges) || ranges.length === 0) throw new Error('没有可拼接的片段');
      const merge = { status: 'running', progress: '准备拼接', count: ranges.length };
      job.merge = merge;
      persist();
      mergeClips(job, ranges, { name }, {
        onProgress(progress) {
          merge.progress = progress;
        },
      })
        .then((result) => {
          job.merge = {
            status: 'done',
            progress: '',
            ...result,
            url: `${API_PREFIX}/file?id=${job.id}&kind=merge&name=${encodeURIComponent(result.filename)}`,
            createdAt: Date.now(),
          };
          job.merges = [job.merge, ...(job.merges || [])].slice(0, 12);
          persist();
        })
        .catch((error) => {
          job.merge = { status: 'error', error: String(error?.message || error), progress: '' };
          persist();
        });
      return { ok: true, job: view(job) };
    },

    async remove({ id }) {
      const job = jobs.get(id);
      if (!job) throw new Error('找不到这个任务');
      jobs.delete(id);
      persist();
      return { ok: true };
    },

    async reveal({ id, kind = 'video' }) {
      const job = jobs.get(id);
      if (!job) throw new Error('找不到这个任务');
      const target = kind === 'gif'
        ? job.gif?.path
        : kind === 'clip'
          ? job.clip?.path
          : kind === 'merge'
            ? job.merge?.path
            : job.filePath;
      if (!target) throw new Error('没有这个文件');
      const { spawn } = await import('node:child_process');
      spawn('open', ['-R', target], { detached: true, stdio: 'ignore' }).unref();
      return { ok: true };
    },
  };

  ctx.effect(() => {
    ensureDirs()
      .then(() => fsp.readFile(PATHS.index, 'utf8'))
      .then(async (raw) => {
        const parsed = JSON.parse(raw);
        for (const row of parsed.jobs || []) {
          if (!row?.id) continue;
          let transcript = null;
          if (row.transcriptSource) {
            try {
              transcript = JSON.parse(await fsp.readFile(path.join(PATHS.tmp, `${row.id}.transcript.json`), 'utf8'));
            } catch {
              transcript = { status: 'idle', source: row.transcriptSource, text: '', timeline: '', segments: [] };
            }
          }
          jobs.set(row.id, {
            ...row,
            status: row.filePath && fs.existsSync(row.filePath) ? 'done' : 'missing',
            percent: row.filePath ? 100 : 0,
            gifs: row.gifs || [],
            clips: row.clips || [],
            merges: row.merges || [],
            transcript,
          });
        }
      })
      .catch(() => {});
    return () => {
      if (saveTimer) clearTimeout(saveTimer);
    };
  }, 'workbench: restore job index');

  const routes = (prefix) => ({
    kind: 'prefix',
    path: prefix,
    handler: async (req, res) => {
      const url = new URL(req.url || '/', 'http://clipforge.local');
      const rest = url.pathname.slice(prefix.length).replace(/^\/+/, '');
      const id = url.searchParams.get('id') || '';

      try {
        if ((req.method === 'GET' || req.method === 'HEAD') && (rest === 'media' || rest === 'file')) {
          const job = jobs.get(id);
          if (!job) throw new Error('找不到这个任务');
          let file = null;
          if (rest === 'media') file = job.filePath;
          else if (url.searchParams.get('kind') === 'gif') {
            const name = url.searchParams.get('name');
            const gif = (job.gifs || []).find((entry) => entry.filename === name) || job.gif;
            file = gif?.path;
          } else if (url.searchParams.get('kind') === 'merge') {
            const name = url.searchParams.get('name');
            const merge = (job.merges || []).find((entry) => entry.filename === name) || job.merge;
            file = merge?.path;
          } else if (url.searchParams.get('kind') === 'preview') {
            const name = url.searchParams.get('name');
            file = name ? path.join(PATHS.tmp, path.basename(name)) : null;
          } else if (url.searchParams.get('kind') === 'clip') {
            const name = url.searchParams.get('name');
            const clip = (job.clips || []).find((entry) => entry.filename === name) || job.clip;
            file = clip?.path;
          } else file = job.filePath;
          if (!file) throw new Error('这个任务还没有文件');
          const resolved = path.resolve(file);
          if (!resolved.startsWith(path.resolve(PATHS.root))) throw new Error('路径越界');
          await serveFile(req, res, resolved);
          return;
        }

        if (req.method !== 'POST') {
          send(res, 405, { ok: false, error: '只支持 POST' });
          return;
        }

        const body = await readBody(req);
        const handler = Object.hasOwn(api, rest) ? api[rest] : null;
        if (!handler) {
          send(res, 404, { ok: false, error: `未知接口 ${rest}` });
          return;
        }
        const payload = await handler(body);
        send(res, 200, payload);
      } catch (error) {
        ctx.logger?.warn?.('workbench: %s', String(error?.message || error));
        if (!res.headersSent) fail(res, error);
      }
    },
  });

  ctx.effect(() => ctx.webServer.register(routes(API_PREFIX)), 'clipforge: /clipforge/api routes');
  ctx.effect(() => ctx.webServer.register(routes(API_PREFIX_LEGACY)), 'clipforge: legacy /workbench/api alias');

  ctx.logger?.info?.('workbench: ready at %s', PATHS.root);
}

export { safeSlug };
