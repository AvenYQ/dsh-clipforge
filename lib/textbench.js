/**
 * 文稿分析：把一篇长文拆成段落，交给本机网关做提炼 / 大纲 / 金句 / 概念 / 问题 / 双语。
 *
 * 长文按段落分块（每块约 5000 字）先做「块内摘录」，再汇总成整篇——
 * 这样 3 万字也不会被截断，也不至于一次把上下文撑爆。
 */
import { chat, llmAvailable } from './nlp.js';

const CHUNK_CHARS = 5000;

/* ── 切分 ───────────────────────────────────────────────────────────── */

const UI_NOISE = /^(toggle( the)? (table of )?contents?|jump to (content|navigation)|main page|contents|navigation|search|read|edit|view source|view history|tools|appearance|personal tools|print\/export|languages?)$/i;

/** 抓网页时 <main> 里常混着导航词，先剔掉，别让它们变成「第一段」。 */
function isNoise(line) {
  const value = line.trim();
  if (value.length === 0) return true;
  if (value.length <= 40 && UI_NOISE.test(value)) return true;
  return false;
}

export function guessTitle(paragraphs) {
  for (const paragraph of paragraphs) {
    const value = String(paragraph.text || '').trim();
    if (value.length >= 4 && value.length <= 80 && !isNoise(value)) return value.replace(/\s+/g, ' ');
  }
  return '未命名文稿';
}

export function splitParagraphs(text) {
  const body = String(text || '').replace(/\r\n?/g, '\n').trim();
  if (!body) return [];
  let blocks = body.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);

  /* 一整块没有空行时，按句子切成 260 字左右的段，避免出现一个巨大段落。 */
  if (blocks.length < 3 && body.length > 800) {
    const sentences = body.split(/(?<=[。！？!?；;\.])\s*/).filter(Boolean);
    const merged = [];
    let buffer = '';
    for (const sentence of sentences) {
      if ((buffer + sentence).length > 260 && buffer) {
        merged.push(buffer.trim());
        buffer = sentence;
      } else {
        buffer += sentence;
      }
    }
    if (buffer.trim()) merged.push(buffer.trim());
    if (merged.length > blocks.length) blocks = merged;
  }
  const kept = blocks.filter((value) => !isNoise(value));
  return (kept.length ? kept : blocks).map((value, index) => ({ n: index + 1, text: value }));
}

export function chunkParagraphs(paragraphs, maxChars = CHUNK_CHARS) {
  const chunks = [];
  let current = [];
  let size = 0;
  for (const paragraph of paragraphs) {
    if (size + paragraph.text.length > maxChars && current.length > 0) {
      chunks.push(current);
      current = [];
      size = 0;
    }
    current.push(paragraph);
    size += paragraph.text.length;
  }
  if (current.length) chunks.push(current);
  return chunks.length ? chunks : [[]];
}

function numbered(paragraphs) {
  return paragraphs.map((paragraph) => `[¶${paragraph.n}] ${paragraph.text}`).join('\n');
}

function extractJson(text) {
  const raw = String(text || '').replace(/```(?:json)?/gi, '').trim();
  const start = raw.search(/[[{]/);
  const end = Math.max(raw.lastIndexOf(']'), raw.lastIndexOf('}'));
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
}

async function askJson(prompt, { maxTokens = 4096 } = {}) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const suffix = attempt === 0 ? '' : '\n\n只输出 JSON，不要任何解释、不要 markdown 代码块。';
    const answer = await chat(prompt + suffix, { maxTokens });
    const parsed = extractJson(answer);
    if (parsed) return parsed;
  }
  return null;
}

const rules = [
  '只能依据原文，不得引入外部知识或臆测。',
  '每条结论后面必须带原文段落号，格式如 [¶3]；引用多段就写 [¶3,¶5]。',
].join('\n');

/* ── 块内摘录 ───────────────────────────────────────────────────────── */

async function chunkNotes(chunk) {
  const prompt = [
    '下面是一篇长文的其中一部分，段落已编号。请做块内摘录。',
    rules,
    '输出 JSON：{"bullets":[{"text":"要点","refs":[3]}],"quotes":[{"text":"原文原句","ref":5}],"concepts":[{"term":"术语","explain":"一句话解释","refs":[2]}]}',
    'bullets 3–6 条；quotes 最多 3 条且必须是原文原句；concepts 最多 4 个，没有就给空数组。',
    '',
    numbered(chunk),
  ].join('\n');
  const parsed = await askJson(prompt);
  if (!parsed || typeof parsed !== 'object') return { bullets: [], quotes: [], concepts: [] };
  return {
    bullets: Array.isArray(parsed.bullets) ? parsed.bullets : [],
    quotes: Array.isArray(parsed.quotes) ? parsed.quotes : [],
    concepts: Array.isArray(parsed.concepts) ? parsed.concepts : [],
  };
}

/* ── 汇总 ───────────────────────────────────────────────────────────── */

async function mergeNotes(notes, meta) {
  const flat = {
    bullets: notes.flatMap((note) => note.bullets || []),
    quotes: notes.flatMap((note) => note.quotes || []),
    concepts: notes.flatMap((note) => note.concepts || []),
  };
  const prompt = [
    `下面是对一篇文章分块摘录的结果${meta?.title ? `，标题：${meta.title}` : ''}。请汇总成整篇的结论。`,
    rules,
    '输出 JSON：',
    '{"oneLiner":"一句话结论，40 字以内","bullets":[{"text":"要点","refs":[2]}],',
    ' "outline":[{"level":1,"text":"一级标题","refs":[1]},{"level":2,"text":"二级标题","refs":[4]}],',
    ' "questions":[{"q":"值得继续追的问题","why":"为什么值得追"}]}',
    'bullets 3–6 条（合并重复、按重要性排序）；outline 两级、6–12 条；questions 3 条。',
    '',
    JSON.stringify(flat).slice(0, 12000),
  ].join('\n');
  const parsed = await askJson(prompt, { maxTokens: 5000 });
  if (!parsed) return null;
  return {
    oneLiner: String(parsed.oneLiner || '').trim(),
    bullets: Array.isArray(parsed.bullets) ? parsed.bullets : flat.bullets.slice(0, 6),
    outline: Array.isArray(parsed.outline) ? parsed.outline : [],
    concepts: flat.concepts.slice(0, 10),
    quotes: flat.quotes.slice(0, 8),
    questions: Array.isArray(parsed.questions) ? parsed.questions : [],
  };
}

/* ── 对外入口 ───────────────────────────────────────────────────────── */

export async function analyze(paragraphs, { onProgress, title } = {}) {
  if (!(await llmAvailable(true))) throw new Error('本机翻译网关没开，文稿分析需要它');
  const chunks = chunkParagraphs(paragraphs);
  const notes = [];
  for (let index = 0; index < chunks.length; index += 1) {
    onProgress?.(`摘录第 ${index + 1}/${chunks.length} 块`);
    notes.push(await chunkNotes(chunks[index]));
  }
  onProgress?.('汇总');
  const merged = await mergeNotes(notes, { title });
  if (!merged) throw new Error('汇总失败，模型没有返回可用 JSON');
  return merged;
}

export async function translateParagraphs(paragraphs, { onProgress } = {}) {
  if (!(await llmAvailable(true))) throw new Error('本机翻译网关没开');
  const out = [];
  const batch = 12;
  for (let offset = 0; offset < paragraphs.length; offset += batch) {
    const slice = paragraphs.slice(offset, offset + batch);
    onProgress?.(`翻译 ${offset + 1}-${offset + slice.length} / ${paragraphs.length}`);
    const payload = slice.map((paragraph) => `[¶${paragraph.n}] ${paragraph.text}`).join('\n\n');
    const prompt = [
      '把下面每段翻译成中文（原文已是中文则译成英文）。',
      '保持段落一一对应，不合并、不省略；人名、术语保持原样。',
      '输出 JSON 数组：[{"n":1,"t":"译文"},{"n":2,"t":"译文"}]',
      '',
      payload,
    ].join('\n');
    const parsed = await askJson(prompt, { maxTokens: 6000 });
    if (!Array.isArray(parsed)) continue;
    for (const item of parsed) {
      const n = Number(item?.n ?? item?.i ?? 0);
      const target = paragraphs.find((paragraph) => paragraph.n === n);
      if (target && item?.t) out.push({ n, text: item.t });
    }
  }
  return out;
}
