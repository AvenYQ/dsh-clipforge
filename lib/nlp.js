/**
 * 文案的语言处理：本地网关（OpenAI 兼容 /v1/chat/completions）上的逐句翻译与说话人切分。
 *
 * 网关地址默认取本机 Magpie 网关，可用 DSH_WORKBENCH_LLM_URL / DSH_WORKBENCH_LLM_MODEL 覆盖。
 * 网关不可用时所有函数安静降级，面板只显示原文。
 */

const RAW_URL = process.env.DSH_WORKBENCH_LLM_URL || 'http://127.0.0.1:3425/v1/chat/completions';
const MODEL = process.env.DSH_WORKBENCH_LLM_MODEL || 'opencode-go/glm-5.3-flash';
const MODELS_URL = RAW_URL.replace(/\/chat\/completions\/?$/, '/models');

let availability = { at: 0, ok: false };

export async function llmAvailable(force = false) {
  if (!force && Date.now() - availability.at < 30_000) return availability.ok;
  try {
    const response = await fetch(MODELS_URL, { signal: AbortSignal.timeout(2500) });
    availability = { at: Date.now(), ok: response.ok };
  } catch {
    availability = { at: Date.now(), ok: false };
  }
  return availability.ok;
}

export async function chat(prompt, { system, maxTokens = 4096, temperature = 0.2, timeout = 120_000 } = {}) {
  const messages = [];
  if (system) messages.push({ role: 'system', content: system });
  messages.push({ role: 'user', content: prompt });

  const response = await fetch(RAW_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, messages, max_tokens: maxTokens, temperature }),
    signal: AbortSignal.timeout(timeout),
  });
  if (!response.ok) throw new Error(`翻译服务返回 ${response.status}`);
  const data = await response.json();
  const message = data.choices?.[0]?.message || {};
  return String(message.content || '').trim();
}

function extractJson(text) {
  const raw = String(text || '').replace(/```(?:json)?/gi, '').trim();
  const start = raw.indexOf('[');
  const end = raw.lastIndexOf(']');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
}

/** 文本里中日韩字符的占比，用来决定翻译方向。 */
export function cjkRatio(text) {
  const body = String(text || '');
  if (!body) return 0;
  const cjk = (body.match(/[\u3040-\u30ff\u3400-\u9fff]/g) || []).length;
  return cjk / body.length;
}

export function targetFor(text) {
  return cjkRatio(text) > 0.25 ? '英文' : '中文';
}

/**
 * 逐条翻译，输入输出一一对应；返回与 turns 等长的译文数组（失败的项为 ''）。
 */
export async function translateTurns(turns, target, { onProgress, context = '' } = {}) {
  const out = new Array(turns.length).fill('');
  if (turns.length === 0) return out;
  const batchSize = 24;

  for (let offset = 0; offset < turns.length; offset += batchSize) {
    const batch = turns.slice(offset, offset + batchSize);
    const numbered = batch.map((turn, index) => `${index + 1}. ${turn.text.replace(/\s+/g, ' ').trim()}`).join('\n');
    onProgress?.(`翻译 ${offset + 1}-${offset + batch.length} / ${turns.length}`);

    const prompt = [
      context ? `背景：${context}` : '',
      `把下面每条编号字幕逐条翻译成${target}。`,
      '规则：保持原顺序、不合并、不拆分、不遗漏；口播风格，不要书面腔；人名保持原样；只输出 JSON 数组。',
      '输出格式：[{"i":1,"t":"译文"},{"i":2,"t":"译文"}]',
      '',
      numbered,
    ].filter(Boolean).join('\n');

    let parsed = null;
    for (let attempt = 0; attempt < 2 && !parsed; attempt += 1) {
      try {
        const answer = await chat(attempt === 0 ? prompt : `${prompt}\n\n只输出 JSON，不要任何解释文字。`);
        parsed = extractJson(answer);
      } catch {
        parsed = null;
      }
    }
    if (!Array.isArray(parsed)) continue;
    parsed.forEach((item, position) => {
      if (typeof item === 'string') {
        if (position < batch.length && item.trim()) out[offset + position] = item.trim();
        return;
      }
      const index = Number(item?.i ?? item?.index ?? 0) - 1;
      const text = String(item?.t ?? item?.text ?? item?.translation ?? '').trim();
      if (index >= 0 && index < batch.length && text) out[offset + index] = text;
    });
  }
  return out;
}

/**
 * 说话人切分：让模型按语义给每条字幕打说话人标签，返回与 turns 等长的标签数组。
 * 模型不认为有多人时返回 null，调用方据此收起说话人标识。
 */
export async function labelSpeakers(turns, { onProgress, context = '' } = {}) {
  if (turns.length < 5) return null;
  const numbered = turns.map((turn, index) => `${index + 1}. ${turn.text.replace(/\s+/g, ' ').trim()}`).join('\n');
  onProgress?.('判断说话人');

  const prompt = [
    context ? `背景：${context}` : '',
    '下面是一场视频里的逐条字幕。判断其中有几个人在说话，并按说话人给每条字幕打标签。',
    '规则：只有确实能看出换了人才换标签；同一个人连续讲话都用同一个标签；不要凭语气臆测。',
    '只输出 JSON 数组，形如 [{"i":1,"s":"A"},{"i":2,"s":"B"}]，i 是条目编号，s 是说话人代号（A/B/C…）。',
    '如果只有一个人说话，就全部标成 A。',
    '',
    numbered,
  ].filter(Boolean).join('\n');

  let parsed = null;
  try {
    parsed = extractJson(await chat(prompt, { maxTokens: 4096 }));
  } catch {
    return null;
  }
  if (!Array.isArray(parsed)) return null;

  const labels = new Array(turns.length).fill('');
  for (const item of parsed) {
    const index = Number(item?.i ?? 0) - 1;
    const tag = String(item?.s ?? '').trim().toUpperCase();
    if (index >= 0 && index < turns.length && /^[A-Z]$/.test(tag)) labels[index] = tag;
  }
  for (let index = 0; index < labels.length; index += 1) {
    if (!labels[index]) labels[index] = labels[index - 1] || 'A';
  }
  const counts = new Map();
  for (const label of labels) counts.set(label, (counts.get(label) || 0) + 1);
  if (counts.size < 2) return null;
  /* 只出现一次的标签基本都是模型自己编的换人，宁可全不标。 */
  if ([...counts.values()].some((count) => count < 2)) return null;
  return labels;
}
