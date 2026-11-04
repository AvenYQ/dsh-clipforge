/**
 * 按标题给视频归类，落到「原片目录/分类/」下，避免几百个文件堆在一起。
 * 优先问本地模型（短标签），模型不可用时退回关键词表，最后兜底「未分类」。
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { chat, llmAvailable } from './nlp.js';

const KEYWORDS = [
  ['NBA', /nba|lebron|curry|lakers|celtics|篮球|扣篮|三分|绝杀/i],
  ['足球', /足球|梅西|C罗|英超|欧冠|世界杯|进球/i],
  ['搞笑', /搞笑|沙雕|翻车|笑死|整活|名场面|meme|funny/i],
  ['动效', /动效|动画|motion|p5|交互动效|transitions?|微交互|ui\s*动画/i],
  ['美食', /吃|美食|recipe|烹饪|探店|火锅|烧烤|蟹|汤包/i],
  ['旅行', /旅行|vlog|自驾|徒步|城市|风景|古镇/i],
  ['数码', /数码|评测|开箱|手机|macbook|iphone|显卡|cpu/i],
  ['游戏', /游戏|game|steam|主机|玩法|通关/i],
  ['音乐', /音乐|mv|翻唱|吉他|钢琴|remix|cover/i],
  ['影视', /电影|剧集|预告|trailer|解说|片段/i],
  ['知识', /科普|讲解|课程|lecture|历史|经济|物理|数学/i],
  ['生活', /日常|生活|plog|分享|随手/i],
];

function sanitize(label) {
  const clean = String(label || '')
    .replace(/[\s"'“”「」【】()（）。，,、:：/\\|<>*?]/g, '')
    .replace(/^[A-Za-z]+$/, (value) => value.toUpperCase())
    .trim();
  return clean.length >= 1 && clean.length <= 8 ? clean : '';
}

function byKeyword(title) {
  const text = String(title || '');
  for (const [label, pattern] of KEYWORDS) {
    if (pattern.test(text)) return label;
  }
  return '';
}

let cached = null;

export async function classify(title, description = '') {
  const keyword = byKeyword(`${title} ${description}`);
  if (keyword) return keyword;

  if (cached === null) cached = await llmAvailable().catch(() => false);
  if (!cached) return '未分类';

  try {
    const answer = await chat(
      [
        '给下面这个视频归一个中文类别，用于文件夹分类。',
        '要求：2–6 个汉字；像「动效」「搞笑」「NBA」「美食」「旅行」「数码」「知识」这种粒度；只输出类别本身，不要标点、不要解释。',
        '',
        `标题：${String(title || '').slice(0, 120)}`,
        description ? `描述：${String(description || '').slice(0, 160)}` : '',
      ].filter(Boolean).join('\n'),
      { maxTokens: 16, temperature: 0.1, timeout: 20_000 },
    );
    const label = sanitize(answer);
    if (label) return label;
  } catch { /* 落兜底 */ }

  return '未分类';
}

/** 归类并确保目录存在，返回视频应落入的目录 */
export async function categoryDir(title, description = '', root = '') {
  const label = await classify(title, description).catch(() => '未分类');
  const dir = path.join(root, label);
  await fs.mkdir(dir, { recursive: true }).catch(() => {});
  return dir;
}
