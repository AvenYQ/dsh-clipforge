/**
 * Workbench media engine — everything that touches a process lives here.
 *
 * Nothing in this file knows about Cordis: `index.js` wires routes to these functions, and the
 * test script drives them directly, so the pipeline can be exercised without a running page.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const HOME = os.homedir();

export const PATHS = {
  root: process.env.DSH_WORKBENCH_DIR || path.join(HOME, 'Movies', 'DSH工作台'),
  get video() { return path.join(this.root, 'video'); },
  get gif() { return path.join(this.root, 'gif'); },
  get clip() { return path.join(this.root, 'clip'); },
  get text() { return path.join(this.root, 'text'); },
  get tmp() { return path.join(this.root, 'tmp'); },
  get models() { return path.join(this.root, 'models'); },
  get index() { return path.join(this.root, 'index.json'); },
};

export async function ensureDirs() {
  for (const dir of [PATHS.video, PATHS.gif, PATHS.clip, PATHS.text, PATHS.tmp, PATHS.models]) {
    await fsp.mkdir(dir, { recursive: true });
  }
}

/* ── tool discovery ─────────────────────────────────────────────────── */

function isExec(file) {
  try {
    const stat = fs.statSync(file);
    if (!stat.isFile()) return false;
    fs.accessSync(file, fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

const PATH_DIRS = String(process.env.PATH || '')
  .split(path.delimiter)
  .filter(Boolean);

function findBinary(names, extra = []) {
  const seen = new Set();
  const tryOne = (candidate) => {
    if (!candidate || seen.has(candidate)) return null;
    seen.add(candidate);
    return isExec(candidate) ? candidate : null;
  };
  for (const name of names) {
    for (const dir of PATH_DIRS) {
      const hit = tryOne(path.join(dir, name));
      if (hit) return hit;
    }
  }
  for (const candidate of extra) {
    const hit = tryOne(candidate.replace(/^~/, HOME));
    if (hit) return hit;
  }
  return null;
}

let toolCache = null;

export function tools(force = false) {
  if (toolCache && !force) return toolCache;
  const ytdlpBin = findBinary(['yt-dlp'], [
    '~/Library/Python/3.10/bin/yt-dlp',
    '~/Library/Python/3.9/bin/yt-dlp',
    '~/Library/Python/3.11/bin/yt-dlp',
    '~/Library/Python/3.12/bin/yt-dlp',
    '/opt/homebrew/bin/yt-dlp',
    '/usr/local/bin/yt-dlp',
  ]);
  const python = findBinary(['python3'], ['/opt/homebrew/bin/python3', '/usr/bin/python3']);
  const ffmpeg = findBinary(['ffmpeg'], ['/opt/homebrew/bin/ffmpeg', '/usr/local/bin/ffmpeg']);
  const ffprobe = findBinary(['ffprobe'], ['/opt/homebrew/bin/ffprobe', '/usr/local/bin/ffprobe']);
  const whisper = findBinary(['whisper-cli', 'main', 'whisper'], [
    '/opt/homebrew/bin/whisper-cli',
    '/usr/local/bin/whisper-cli',
  ]);
  const model = [
    path.join(PATHS.models, 'ggml-small.bin'),
    path.join(PATHS.models, 'ggml-medium.bin'),
    path.join(PATHS.models, 'ggml-base.bin'),
    '/opt/homebrew/share/whisper.cpp/models/ggml-small.bin',
  ].find((candidate) => fs.existsSync(candidate)) || null;

  toolCache = {
    ytdlp: ytdlpBin ? { cmd: ytdlpBin, prefix: [] } : python ? { cmd: python, prefix: ['-m', 'yt_dlp'] } : null,
    ffmpeg,
    ffprobe,
    whisper,
    whisperModel: model,
  };
  return toolCache;
}

export function describeTools() {
  const t = tools(true);
  return {
    ytdlp: t.ytdlp ? [t.ytdlp.cmd, ...t.ytdlp.prefix].join(' ') : null,
    ffmpeg: t.ffmpeg,
    ffprobe: t.ffprobe,
    whisper: t.whisper,
    whisperModel: t.whisperModel,
    dirs: { root: PATHS.root, video: PATHS.video, gif: PATHS.gif },
  };
}

/* ── process helper ─────────────────────────────────────────────────── */

export function run(cmd, args, options = {}) {
  const { timeout = 0, cwd, onLine, env } = options;
  return new Promise((resolve, reject) => {
    let child;
    try {
      child = spawn(cmd, args, { cwd, env: env ? { ...process.env, ...env } : process.env });
    } catch (error) {
      reject(error);
      return;
    }
    let stdout = '';
    let stderr = '';
    let settled = false;
    let buffer = '';
    const timer = timeout > 0
      ? setTimeout(() => {
        if (settled) return;
        settled = true;
        try { child.kill('SIGKILL'); } catch { /* already gone */ }
        reject(new Error(`命令超时（${Math.round(timeout / 1000)}s）：${path.basename(cmd)}`));
      }, timeout)
      : null;

    const handleChunk = (chunk, into) => {
      const text = chunk.toString('utf8');
      if (into === 'out') {
        if (stdout.length < 8_000_000) stdout += text;
      } else if (stderr.length < 8_000_000) {
        stderr += text;
      }
      if (!onLine) return;
      buffer += text;
      const lines = buffer.split(/\r?\n|\r/);
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (line.trim()) onLine(line, into);
      }
    };

    child.stdout?.on('data', (chunk) => handleChunk(chunk, 'out'));
    child.stderr?.on('data', (chunk) => handleChunk(chunk, 'err'));
    child.on('error', (error) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      reject(error);
    });
    child.on('close', (code) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      if (buffer.trim() && onLine) onLine(buffer, 'out');
      resolve({ code, stdout, stderr });
    });
  });
}

/* ── naming ─────────────────────────────────────────────────────────── */

const NOISE = [
  /\b(?:official|music\s*video|mv|4k|hd|1080p|2160p|完整版|高清|超清)\b/gi,
  /\b(?:www\.[\w.-]+)\b/gi,
];

export function cleanTitle(input) {
  let text = String(input || '').trim();
  if (!text) return '';
  text = text.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{2B00}-\u{2BFF}]/gu, ' ');
  text = text.replace(/[#＃][^\s#＃]{1,24}/g, ' ');
  text = text.replace(/[【\[（(]/g, ' ').replace(/[】\]）)]/g, ' ');
  for (const pattern of NOISE) text = text.replace(pattern, ' ');
  text = text.replace(/[_|｜/\\]+/g, ' ');
  text = text.replace(/[·•。、，,;；:：!！?？"“”'‘’]+/g, ' ');
  text = text.replace(/\s{2,}/g, ' ').trim();
  const tokens = [];
  let width = 0;
  for (const char of text) {
    const charWidth = /[\u3000-\u9fff\uff00-\uffef]/.test(char) ? 2 : 1;
    if (width + charWidth > 44) break;
    width += charWidth;
    tokens.push(char);
  }
  return tokens.join('').trim() || String(input).slice(0, 24);
}

const STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'this', 'that', 'you', 'your', 'are', 'was', 'from', 'have', 'has',
  '视频', '我们', '你们', '他们', '这个', '那个', '什么', '怎么', '就是', '可以', '一个', '自己',
  '没有', '现在', '然后', '因为', '所以', '如果', '还是', '但是', '需要', '这样', '那样', '知道',
]);

export function keywords(input, limit = 4) {
  const text = String(input || '');
  const latin = text.toLowerCase().match(/[a-z][a-z'-]{2,}/g) || [];
  const cjk = text.match(/[\u4e00-\u9fa5]{2,4}/g) || [];
  const counts = new Map();
  for (const word of [...latin, ...cjk]) {
    if (STOPWORDS.has(word) || word.length < 2) continue;
    counts.set(word, (counts.get(word) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .slice(0, limit)
    .map(([word]) => word);
}

export function safeSlug(name, fallback = 'clip') {
  const slug = String(name || '')
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60);
  return slug || fallback;
}


/* ── 链接归一化与网页正文兜底 ───────────────────────────────────────── */

/** 去掉登录跳转壳和跟踪参数：X 的 /i/jf/onboarding/web?redirect_after_login=<真地址> 会被还原。 */
export function normalizeUrl(raw) {
  let current = String(raw || '').trim();
  if (!current) return current;
  for (let depth = 0; depth < 3; depth += 1) {
    let url;
    try {
      url = new URL(current);
    } catch {
      return current;
    }
    const redirect = url.searchParams.get('redirect_after_login') || url.searchParams.get('redirect_after');
    if (redirect) {
      const next = redirect.startsWith('http') ? redirect : `${url.origin}${redirect.startsWith('/') ? '' : '/'}${redirect}`;
      if (next === current) break;
      current = next;
      continue;
    }
    for (const key of ['s', 't', 'ref_src', 'ref_url', 'share_source', 'spm', 'from', 'is_from_webapp']) {
      url.searchParams.delete(key);
    }
    const cleaned = url.toString();
    return cleaned === current ? current : cleaned;
  }
  return current;
}

const BROWSER_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

function metaContent(html, pattern) {
  const match = pattern.exec(html);
  return match ? match[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim() : '';
}

/**
 * 视频抓不到时的兜底：当作普通网页抓标题、摘要和正文。
 * 对需要登录的站点（X 的文章、私密帖）拿不到正文，会退回 null。
 */
export async function fetchWebText(url) {
  let html = '';
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': BROWSER_UA,
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        Accept: 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) return null;
    html = await response.text();
  } catch {
    return null;
  }
  if (!html || html.length < 200) return null;

  const title = metaContent(html, /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)
    || metaContent(html, /<meta[^>]+name=["']twitter:title["'][^>]+content=["']([^"']+)["']/i)
    || metaContent(html, /<title[^>]*>([^<]+)<\/title>/i);
  const description = metaContent(html, /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)
    || metaContent(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
  const thumbnail = metaContent(html, /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
  const site = metaContent(html, /<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i);

  const bodyMatch = /<article[^>]*>([\s\S]*?)<\/article>/i.exec(html)
    || /<main[^>]*>([\s\S]*?)<\/main>/i.exec(html);
  let body = '';
  if (bodyMatch) {
    body = bodyMatch[1]
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, '\n')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/\n{2,}/g, '\n')
      .trim();
  }
  const text = (body.length > 80 ? body : description).trim();
  if (!text) return null;
  return {
    kind: 'text',
    title: title || url,
    cleanTitle: cleanTitle(title || ''),
    uploader: site,
    text: text.slice(0, 20000),
    description: description || text.slice(0, 400),
    thumbnail,
    platform: site || '网页',
    duration: 0,
    url,
  };
}

/* ── probe ──────────────────────────────────────────────────────────── */

function explainFailure(url, errorLine) {
  const host = (() => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; } })();
  const clean = String(errorLine || '').replace(/^ERROR:\s*/i, '').trim();
  if (/^(x|twitter)\.com$/.test(host)) {
    return 'X 的帖子/长文要登录才给正文，yt-dlp 也抓不到视频。这条不是视频链接——把正文复制出来，或换成带媒体的推文链接再试。';
  }
  if (/Unsupported URL/i.test(clean)) {
    return `这个链接不是可下载的视频页（${host || '该站点'}）：${clean}`;
  }
  return clean || '解析失败';
}

export async function probe(rawUrl, { cookies = '' } = {}) {
  const t = tools();
  if (!t.ytdlp) throw new Error('这台机器上没找到 yt-dlp，先装一个再解析');
  const url = normalizeUrl(rawUrl);
  const { code, stdout, stderr } = await run(
    t.ytdlp.cmd,
    [
      ...t.ytdlp.prefix,
      '-J', '--no-warnings', '--no-playlist', '--skip-download',
      '--socket-timeout', '20',
      ...(cookies ? ['--cookies', cookies] : []),
      url,
    ],
    { timeout: 90_000 },
  );
  if (code !== 0) {
    const lines = (stderr || stdout || '')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !/^Deprecated Feature/i.test(line) && !/^WARNING/i.test(line));
    const errorLine = lines.find((line) => /^ERROR/i.test(line)) || lines.slice(-1)[0] || '';
    const host = (() => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; } })();
    const page = /^(x|twitter)\.com$/.test(host) ? null : await fetchWebText(url).catch(() => null);
    if (page && page.text) return page;
    throw new Error(explainFailure(url, errorLine));
  }
  let info;
  try {
    info = JSON.parse(stdout.slice(stdout.indexOf('{')));
  } catch {
    throw new Error('解析结果不是合法 JSON');
  }
  const heights = new Set();
  for (const format of info.formats || []) {
    if (format.vcodec && format.vcodec !== 'none' && format.height) heights.add(format.height);
  }
  const subtitles = Object.keys(info.subtitles || {});
  const automatic = Object.keys(info.automatic_captions || {});
  const title = info.title || info.fulltitle || info.id || '未命名';
  const description = info.description || '';
  return {
    kind: 'video',
    url,
    id: info.id || null,
    title,
    cleanTitle: cleanTitle(title),
    uploader: info.uploader || info.channel || info.creator || '',
    duration: Number(info.duration || 0),
    thumbnail: info.thumbnail || '',
    platform: info.extractor_key || info.extractor || '',
    site: info.webpage_url_domain || info.domain || '',
    description,
    keywords: keywords(`${title} ${description}`),
    heights: [...heights].sort((a, b) => b - a).slice(0, 6),
    hasSubtitles: subtitles.length > 0,
    subtitleLangs: subtitles.slice(0, 8),
    autoLangs: automatic.slice(0, 8),
    isLive: Boolean(info.is_live),
    filesize: Number(info.filesize_approx || info.filesize || 0),
  };
}

/* ── download ───────────────────────────────────────────────────────── */

const PROGRESS = /\[download\]\s+([\d.]+)%\s+of\s+~?\s*([\d.]+)([KMGT]iB)?(?:\s+at\s+([\d.]+|Unknown)\s*([KMGT]iB)?\/s)?(?:\s+ETA\s+([\d:]+))?/i;

export function formatSelector(quality) {
  if (quality === 'audio') return 'ba/b';
  if (quality === 'best' || !quality) return 'bv*[ext=mp4][vcodec^=avc1]+ba[ext=m4a]/bv*+ba/b';
  const height = Number(String(quality).replace(/\D/g, '')) || 0;
  if (!height) return 'bv*+ba/b';
  return `bv*[height<=${height}][ext=mp4][vcodec^=avc1]+ba[ext=m4a]/bv*[height<=${height}]+ba/b[height<=${height}]/b`;
}

export function downloadArgs({ id, url, quality, audio, cookies }) {
  const t = tools();
  const selector = formatSelector(audio ? 'audio' : quality);
  const template = path.join(PATHS.video, `${id}-%(title).70B.%(ext)s`);
  const args = [
    ...t.ytdlp.prefix,
    '-f', selector,
    '--no-playlist',
    '--newline',
    '--no-warnings',
    '--retries', '3',
    '--socket-timeout', '20',
    '-o', template,
    ...(cookies ? ['--cookies', cookies] : []),
  ];
  if (audio) args.push('-x', '--audio-format', 'm4a');
  else args.push('--merge-output-format', 'mp4');
  args.push(url);
  return args;
}

export function parseProgressLine(line) {
  const match = PROGRESS.exec(line);
  if (!match) return null;
  return {
    percent: Number(match[1]),
    total: match[2] ? Number(match[2]) * 1024 ** ({ KB: 1, MB: 2, GB: 3, TB: 4 }[String(match[3] || 'MiB').replace('iB', 'B')] ?? 2) : 0,
    speed: match[4] && match[4] !== 'Unknown' ? `${match[4]} ${match[5] || ''}`.trim() : '',
    eta: match[6] || '',
  };
}

export async function download(job, { signal } = {}) {
  const t = tools();
  if (!t.ytdlp) throw new Error('缺少 yt-dlp');
  const args = downloadArgs(job);
  let last = 0;
  const result = await run(t.ytdlp.cmd, args, {
    onLine(line) {
      const progress = parseProgressLine(line);
      if (progress) {
        job.percent = progress.percent;
        job.speed = progress.speed;
        job.eta = progress.eta;
        job.totalBytes = progress.total || job.totalBytes;
        last = Date.now();
      } else if (/\[Merger\]|\[ExtractAudio\]/.test(line)) {
        job.stage = '正在合并音视频';
        job.percent = 100;
      } else if (/^\[download\] Destination:/.test(line)) {
        job.stage = '正在下载';
      }
    },
  });
  if (result.code !== 0) {
    const message = (result.stderr || result.stdout || '').split('\n').filter(Boolean).slice(-4).join(' ');
    throw new Error(message || '下载失败');
  }
  const files = await fsp.readdir(PATHS.video);
  const hit = files
    .filter((name) => name.startsWith(`${job.id}-`) && !/\.(part|ytdl|temp)$/i.test(name))
    .map((name) => path.join(PATHS.video, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0];
  if (!hit) throw new Error('下载完成但没找到文件');
  job.filePath = hit;
  job.filename = path.basename(hit);
  job.sizeBytes = fs.statSync(hit).size;
  job.percent = 100;
  job.stage = '已下载';
  return job;
}

/* ── subtitles + transcript ─────────────────────────────────────────── */

function parseTimestamp(stamp) {
  const match = /(\d+):(\d+):(\d+)[,.](\d+)/.exec(stamp || '');
  if (!match) return 0;
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]) + Number(match[4]) / 1000;
}

export function parseSrt(text) {
  const blocks = String(text).replace(/\r/g, '').split(/\n{2,}/);
  const segments = [];
  for (const block of blocks) {
    const lines = block.split('\n').filter(Boolean);
    if (lines.length < 2) continue;
    const timeLine = lines.find((line) => line.includes('-->'));
    if (!timeLine) continue;
    const [from, to] = timeLine.split('-->').map((part) => part.trim());
    const body = lines.slice(lines.indexOf(timeLine) + 1).join(' ').replace(/<[^>]+>/g, '').trim();
    if (!body) continue;
    segments.push({ start: parseTimestamp(from), end: parseTimestamp(to), text: body });
  }
  return segments;
}

export function parseVtt(text) {
  const blocks = String(text).replace(/\r/g, '').split(/\n{2,}/);
  const segments = [];
  for (const block of blocks) {
    const lines = block.split('\n').filter(Boolean);
    const timeLine = lines.find((line) => line.includes('-->'));
    if (!timeLine) continue;
    const [from, to] = timeLine.split('-->').map((part) => part.trim());
    const body = lines.slice(lines.indexOf(timeLine) + 1).join(' ').replace(/<[^>]+>/g, '').trim();
    if (!body) continue;
    segments.push({ start: parseTimestamp(from), end: parseTimestamp(to), text: body });
  }
  return segments;
}

export async function fetchSubtitles(job) {
  const t = tools();
  const base = path.join(PATHS.tmp, `sub-${job.id}`);
  const args = [
    ...t.ytdlp.prefix,
    '--skip-download',
    '--write-subs', '--write-auto-subs',
    '--sub-langs', 'zh-Hans,zh-Hant,zh,zh-CN,zh-TW,en,en-US',
    '--convert-subs', 'srt',
    '-o', base,
    '--no-warnings',
    job.url,
  ];
  await run(t.ytdlp.cmd, args, { timeout: 120_000 });
  let files = [];
  try {
    files = (await fsp.readdir(PATHS.tmp)).filter((name) => name.startsWith(`sub-${job.id}`) && /\.(srt|vtt)$/i.test(name));
  } catch {
    return null;
  }
  if (files.length === 0) return null;
  const best = files.find((name) => name.includes('.zh-Hans')) || files.find((name) => name.includes('.zh')) || files[0];
  const raw = await fsp.readFile(path.join(PATHS.tmp, best), 'utf8');
  const segments = /\.vtt$/i.test(best) ? parseVtt(raw) : parseSrt(raw);
  if (segments.length === 0) return null;
  return { lang: path.basename(best).replace(`sub-${job.id}.`, '').replace(/\.(srt|vtt)$/i, ''), segments, file: path.join(PATHS.tmp, best) };
}

export function joinSegments(segments) {
  return segments.map((segment) => segment.text.replace(/\s+/g, ' ').trim()).join('\n');
}

export function withTimestamps(segments) {
  const fmt = (seconds) => {
    const total = Math.max(0, Math.round(seconds));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return h > 0
      ? `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };
  return segments.map((segment) => `[${fmt(segment.start)}] ${segment.text.replace(/\s+/g, ' ').trim()}`).join('\n');
}

const NOISE_SEGMENT = /^[[(（【]?\s*(?:music|音乐|blank_?audio|silence|静音|applause|掌声|笑声|laughter)\s*[\])）】]?$/i;

/** Drops `[MUSIC]`-style placeholders and collapses repeated lines the model emits on hold music. */
export function dedupeSegments(segments) {
  const kept = [];
  let last = '';
  for (const segment of segments) {
    const text = String(segment.text || '').trim();
    if (!text) continue;
    if (NOISE_SEGMENT.test(text.replace(/[.,!?，。！？]+$/g, ''))) continue;
    if (text === last) continue;
    last = text;
    kept.push({ ...segment, text });
  }
  return kept;
}

/**
 * 逐句字幕：默认一句一条，只有极短的碎片（<12 字）且紧贴着上一句时才并进去，
 * 这样翻出来是一句对一句，而不是糊成一大段。
 */
export function buildTurns(segments) {
  const turns = [];
  for (const segment of segments) {
    const text = String(segment.text || '').trim();
    if (!text) continue;
    const last = turns[turns.length - 1];
    const gap = last ? segment.start - last.end : 0;
    if (last && last.text.length < 12 && gap < 0.35) {
      last.end = segment.end;
      last.text = `${last.text} ${text}`.replace(/\s+/g, ' ');
    } else {
      turns.push({ start: segment.start, end: segment.end, text });
    }
  }
  return turns;
}

export async function transcribe(job, { onProgress } = {}) {
  const t = tools();
  if (!job.filePath) throw new Error('先下载视频再提取文案');

  onProgress?.('正在找字幕轨');
  const subtitles = await fetchSubtitles(job);
  if (subtitles) {
    return {
      source: 'subtitle',
      lang: subtitles.lang,
      segments: subtitles.segments,
      turns: buildTurns(subtitles.segments),
      text: joinSegments(subtitles.segments),
      timeline: withTimestamps(subtitles.segments),
    };
  }

  if (!t.whisper || !t.whisperModel) {
    return {
      source: 'description',
      lang: '',
      segments: [],
      text: [job.description, job.title].filter(Boolean).join('\n\n'),
      timeline: '',
      turns: [],
      note: '这条没有字幕轨，本机也没装 whisper.cpp 模型，只能给你平台描述。',
    };
  }

  onProgress?.('正在抽音轨');
  const wav = path.join(PATHS.tmp, `${job.id}.wav`);
  const ff = await run(t.ffmpeg, ['-y', '-i', job.filePath, '-vn', '-ac', '1', '-ar', '16000', '-c:a', 'pcm_s16le', wav], { timeout: 600_000 });
  if (ff.code !== 0) throw new Error('抽音轨失败：' + ff.stderr.split('\n').slice(-2).join(' '));

  onProgress?.('本地转写中（whisper.cpp）');
  const outBase = path.join(PATHS.tmp, `${job.id}-asr`);
  const spoken = /[\u4e00-\u9fa5]/.test(`${job.title || ''} ${job.description || ''}`);
  const wr = await run(t.whisper, [
    '-m', t.whisperModel,
    '-f', wav,
    '-l', spoken ? 'zh' : 'auto',
    '-oj',
    '-of', outBase,
    '-np',
  ], { timeout: 3_600_000 });
  if (wr.code !== 0) throw new Error('转写失败：' + wr.stderr.split('\n').slice(-2).join(' '));

  let payload = null;
  try {
    payload = JSON.parse(await fsp.readFile(`${outBase}.json`, 'utf8'));
  } catch {
    return {
      source: 'description',
      lang: '',
      segments: [],
      text: [job.description, job.title].filter(Boolean).join('\n\n'),
      timeline: '',
      turns: [],
      note: 'whisper 没吐出 JSON，退回平台描述。',
    };
  }
  const segments = dedupeSegments((payload.transcription || []).map((item) => ({
    start: (item.offsets?.from ?? 0) / 1000,
    end: (item.offsets?.to ?? 0) / 1000,
    text: String(item.text || '').trim(),
  })));
  await fsp.rm(wav, { force: true });
  return {
    source: 'asr',
    lang: payload.result?.language || '',
    segments,
    turns: buildTurns(segments),
    text: joinSegments(segments),
    timeline: withTimestamps(segments),
  };
}

/* ── GIF ────────────────────────────────────────────────────────────── */

export const GIF_LADDER = [
  [720, 12],
  [640, 12],
  [560, 10],
  [480, 10],
  [420, 8],
  [360, 8],
  [300, 6],
  [240, 6],
];

export function gifFilter({ width, fps }) {
  const chain = [];
  chain.push(`fps=${fps}`);
  if (width > 0) chain.push(`scale='min(${width},iw)':-2:flags=lanczos`);
  return `${chain.join(',')},split[a][b];[a]palettegen=max_colors=176:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=3:diff_mode=rectangle`;
}

export async function makeGif(job, options, { onProgress } = {}) {
  const t = tools();
  if (!t.ffmpeg) throw new Error('缺少 ffmpeg');
  const start = Math.max(0, Number(options.start) || 0);
  const end = Math.max(start + 0.2, Number(options.end) || 0);
  const targetMB = Number(options.targetMB) || 0;
  const duration = end - start;
  if (duration > 60) throw new Error('单次 GIF 最长 60 秒');

  const ladder = targetMB > 0
    ? GIF_LADDER
    : [[Number(options.width) || 0, Number(options.fps) || 12]];
  const stem = safeSlug(options.name || job.cleanTitle || job.title, path.basename(job.filePath, path.extname(job.filePath)));
  const stamp = `${Math.round(start)}-${Math.round(end)}`;
  const out = uniquePath(PATHS.gif, `${stem}-gif-${stamp}`, '.gif');
  let lastResult = null;

  for (let index = 0; index < ladder.length; index += 1) {
    const [width, fps] = ladder[index];
    onProgress?.(`渲染 ${width || '原'}px / ${fps}fps（第 ${index + 1}/${ladder.length} 档）`);
    const args = [
      '-y',
      '-ss', String(start),
      '-t', String(duration),
      '-i', job.filePath,
      '-vf', gifFilter({ width, fps }),
      '-loop', '0',
      out,
    ];
    const result = await run(t.ffmpeg, args, { timeout: 900_000 });
    if (result.code !== 0) {
      throw new Error('ffmpeg 失败：' + result.stderr.split('\n').slice(-2).join(' '));
    }
    const size = fs.statSync(out).size;
    lastResult = { path: out, sizeBytes: size, width, fps, sizeMB: Number((size / 1024 / 1024).toFixed(2)) };
    if (targetMB <= 0) break;
    if (size <= targetMB * 1024 * 1024) break;
    if (index < ladder.length - 1) await fsp.rm(out, { force: true });
  }

  if (!lastResult) throw new Error('没有生成任何 GIF');
  return { ...lastResult, targetMB, duration, filename: path.basename(lastResult.path) };
}

export function formatBytes(bytes) {
  const value = Number(bytes) || 0;
  if (value >= 1024 ** 3) return `${(value / 1024 ** 3).toFixed(2)} GB`;
  if (value >= 1024 ** 2) return `${(value / 1024 ** 2).toFixed(2)} MB`;
  if (value >= 1024) return `${(value / 1024).toFixed(0)} KB`;
  return `${value} B`;
}

/* ── 剪辑：把片段单独切出来 ─────────────────────────────────────────── */

/** 同名文件自动加 -2、-3，不覆盖已有产物。 */
export function uniquePath(dir, stem, ext) {
  let candidate = path.join(dir, `${stem}${ext}`);
  let index = 2;
  while (fs.existsSync(candidate)) {
    candidate = path.join(dir, `${stem}-${index}${ext}`);
    index += 1;
  }
  return candidate;
}

export async function clipVideo(job, options, { onProgress } = {}) {
  const t = tools();
  if (!t.ffmpeg) throw new Error('缺少 ffmpeg');
  if (!job.filePath) throw new Error('先下载视频再剪辑');

  const from = Math.max(0, Number(options.start) || 0);
  const to = Math.max(from + 0.2, Number(options.end) || 0);
  const duration = to - from;
  const mode = options.mode === 'accurate' ? 'accurate' : 'fast';
  const stem = safeSlug(options.name || job.cleanTitle || job.title, 'clip');
  const suffix = mode === 'accurate' ? '' : '-fast';
  const out = uniquePath(PATHS.clip, `${stem}-clip-${Math.round(from)}-${Math.round(to)}${suffix}`, '.mp4');

  const args = ['-y', '-ss', String(from), '-i', job.filePath, '-t', String(duration)];
  if (mode === 'accurate') {
    args.push('-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k');
  } else {
    args.push('-c', 'copy', '-avoid_negative_ts', 'make_zero');
  }
  args.push('-movflags', '+faststart', out);

  onProgress?.(mode === 'accurate' ? '精确剪切，正在重编码' : '快速剪切，正在拷贝流');
  const result = await run(t.ffmpeg, args, { timeout: 1_800_000 });
  if (result.code !== 0) throw new Error('切片失败：' + result.stderr.split('\n').slice(-2).join(' '));
  const size = fs.statSync(out).size;
  return {
    path: out,
    filename: path.basename(out),
    sizeBytes: size,
    sizeLabel: formatBytes(size),
    duration,
    mode,
    start: from,
    end: to,
  };
}

/* ── 关键帧与多段拼接 ───────────────────────────────────────────────── */

export async function keyframes(job) {
  const t = tools();
  if (!job.filePath) return [];
  const result = await run(t.ffprobe, [
    '-v', 'error',
    '-select_streams', 'v:0',
    '-skip_frame', 'nokey',
    '-show_entries', 'frame=pts_time',
    '-of', 'csv=p=0',
    job.filePath,
  ], { timeout: 300_000 });
  if (result.code !== 0) return [];
  const times = result.stdout
    .split('\n')
    .map((line) => Number.parseFloat(line.split(',')[0]))
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => a - b);
  return times;
}

export async function hasAudio(job) {
  const t = tools();
  const result = await run(t.ffprobe, [
    '-v', 'error',
    '-select_streams', 'a:0',
    '-show_entries', 'stream=index',
    '-of', 'csv=p=0',
    job.filePath,
  ], { timeout: 60_000 });
  return result.code === 0 && result.stdout.trim().length > 0;
}

export async function mergeClips(job, ranges, { name } = {}, { onProgress } = {}) {
  const t = tools();
  if (!job.filePath) throw new Error('先下载视频再拼接');
  const spans = (ranges || [])
    .map((range) => ({ start: Math.max(0, Number(range.start) || 0), end: Number(range.end) || 0 }))
    .filter((range) => range.end - range.start >= 0.2);
  if (spans.length === 0) throw new Error('没有可拼接的片段');

  const audio = await hasAudio(job);
  const filters = [];
  spans.forEach((span, index) => {
    filters.push(`[0:v]trim=start=${span.start}:end=${span.end},setpts=PTS-STARTPTS[v${index}]`);
    if (audio) filters.push(`[0:a]atrim=start=${span.start}:end=${span.end},asetpts=PTS-STARTPTS[a${index}]`);
  });
  const chain = spans.map((_, index) => (audio ? `[v${index}][a${index}]` : `[v${index}]`)).join('');
  filters.push(`${chain}concat=n=${spans.length}:v=1${audio ? ':a=1' : ''}[v]${audio ? '[a]' : ''}`);

  const stem = safeSlug(name || job.cleanTitle || job.title, 'merge');
  const out = uniquePath(PATHS.clip, `${stem}-merge-${spans.length}x`, '.mp4');
  onProgress?.(`拼接 ${spans.length} 段`);

  const args = ['-y', '-i', job.filePath, '-filter_complex', filters.join(';'), '-map', '[v]'];
  if (audio) args.push('-map', '[a]');
  args.push(
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p',
    ...(audio ? ['-c:a', 'aac', '-b:a', '192k'] : ['-an']),
    '-movflags', '+faststart', out,
  );
  const result = await run(t.ffmpeg, args, { timeout: 3_600_000 });
  if (result.code !== 0) throw new Error('拼接失败：' + result.stderr.split('\n').slice(-2).join(' '));
  const size = fs.statSync(out).size;
  return {
    path: out,
    filename: path.basename(out),
    sizeBytes: size,
    sizeLabel: formatBytes(size),
    segments: spans.length,
    duration: spans.reduce((sum, span) => sum + (span.end - span.start), 0),
    ranges: spans,
  };
}

/* ── 试播用的临时切片 ─────────────────────────────────────────────────── */

/**
 * 把 [start, end] 精确切一个小文件供试播用。
 * 不依赖播放器 seek —— 有些环境里对 HTTP 流的 seek 会被丢掉，直接放一段现成的片段最稳。
 * 同一个区间重复试播命中缓存，不再跑 ffmpeg。
 */
export async function previewClip(job, { start, end }) {
  const t = tools();
  if (!t.ffmpeg) throw new Error('缺少 ffmpeg');
  if (!job.filePath) throw new Error('还没下载完');

  const from = Math.max(0, Number(start) || 0);
  const to = Math.max(from + 0.3, Number(end) || 0);
  const key = `${job.id}-${Math.round(from * 10)}-${Math.round(to * 10)}`;
  const out = path.join(PATHS.tmp, `preview-${key}.mp4`);

  if (!fs.existsSync(out)) {
    const result = await run(t.ffmpeg, [
      '-y',
      '-ss', String(from),
      '-t', String(to - from),
      '-i', job.filePath,
      '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '23', '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-b:a', '128k',
      '-movflags', '+faststart',
      out,
    ], { timeout: 300_000 });
    if (result.code !== 0) throw new Error('试播切片失败：' + result.stderr.split('\n').slice(-2).join(' '));
  }

  /* 只留最近 20 个试播文件，别把 tmp 撑爆。 */
  try {
    const files = (await fsp.readdir(PATHS.tmp)).filter((name) => name.startsWith('preview-') && name.endsWith('.mp4'));
    if (files.length > 20) {
      const stale = files
        .map((name) => ({ name, at: fs.statSync(path.join(PATHS.tmp, name)).mtimeMs }))
        .sort((a, b) => a.at - b.at)
        .slice(0, files.length - 20);
      for (const item of stale) await fsp.rm(path.join(PATHS.tmp, item.name), { force: true });
    }
  } catch {
    /* 清理失败不影响播放 */
  }

  return { path: out, filename: path.basename(out), start: from, end: to, duration: to - from };
}

/* ── 浏览器嗅探到的直链下载 ───────────────────────────────────────────── */

/**
 * 下载嗅探得到的音视频直链（抖音这类站点给的是带签名的临时地址）。
 * 先 curl 拉视频与音频，再用 ffmpeg 合并；音频缺失时直接落视频。
 */
export async function downloadSniffed(job, media, { onProgress } = {}) {
  const t = tools();
  const headerArgs = [
    '-A', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    '-e', 'https://www.douyin.com/',
    '-L', '--fail', '--retry', '2', '--connect-timeout', '15',
  ];

  if (!media?.video) throw new Error('没有嗅探到视频直链');
  const videoTmp = path.join(PATHS.tmp, `${job.id}-v.mp4`);
  const audioTmp = path.join(PATHS.tmp, `${job.id}-a.mp4`);
  onProgress?.('下载视频流');

  const videoResult = await run('curl', [...headerArgs, '-o', videoTmp, media.video], { timeout: 900_000 });
  if (videoResult.code !== 0) throw new Error('视频流下载失败（链接可能已过期，重新解析即可）');

  let hasAudio = false;
  if (media.audio) {
    onProgress?.('下载音频流');
    const audioResult = await run('curl', [...headerArgs, '-o', audioTmp, media.audio], { timeout: 900_000 });
    hasAudio = audioResult.code === 0 && fs.statSync(audioTmp).size > 1000;
  }

  const stem = safeSlug(job.cleanTitle || job.title, job.id);
  const out = path.join(PATHS.video, `${job.id}-${stem}.mp4`);
  onProgress?.('合并音视频');

  const mergeArgs = hasAudio
    ? ['-y', '-i', videoTmp, '-i', audioTmp, '-c', 'copy', '-movflags', '+faststart', out]
    : ['-y', '-i', videoTmp, '-c', 'copy', '-movflags', '+faststart', out];
  const merged = await run(t.ffmpeg, mergeArgs, { timeout: 900_000 });
  if (merged.code !== 0) throw new Error('合并失败：' + merged.stderr.split('\n').slice(-2).join(' '));

  await fsp.rm(videoTmp, { force: true });
  await fsp.rm(audioTmp, { force: true });

  job.filePath = out;
  job.filename = path.basename(out);
  job.sizeBytes = fs.statSync(out).size;
  job.percent = 100;
  job.stage = '已下载';

  const probeResult = await run(t.ffprobe, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', out], { timeout: 60_000 });
  const secs = Number.parseFloat(probeResult.stdout.trim());
  if (Number.isFinite(secs)) job.duration = secs;
  return job;
}

/* ── 抖音无水印直链下载 ─────────────────────────────────────────────── */

export async function downloadDouyin(job, playUrl, { onProgress } = {}) {
  const t = tools();
  if (!playUrl) throw new Error('没有可用的播放地址');
  onProgress?.('下载无水印视频');
  const stem = safeSlug(job.cleanTitle || job.title, job.id);
  const out = path.join(PATHS.video, `${job.id}-${stem}.mp4`);
  const result = await run('curl', [
    '-A', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    '-e', 'https://www.douyin.com/',
    '-L', '--fail', '--retry', '2', '--connect-timeout', '15',
    '-o', out, playUrl,
  ], { timeout: 900_000 });
  if (result.code !== 0) throw new Error('下载失败（地址可能已过期，重新解析一次）');

  job.filePath = out;
  job.filename = path.basename(out);
  job.sizeBytes = fs.statSync(out).size;
  job.percent = 100;
  job.stage = '已下载';
  const probeResult = await run(t.ffprobe, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', out], { timeout: 60_000 });
  const secs = Number.parseFloat(probeResult.stdout.trim());
  if (Number.isFinite(secs)) job.duration = secs;
  return job;
}
