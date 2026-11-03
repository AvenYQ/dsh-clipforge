/**
 * 抖音解析：短链展开 → 取 video id → 申请 ttwid → 请求分享页拿 _ROUTER_DATA
 * → 取无水印播放地址。全程走 HTTP，不需要开浏览器。
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

const MOBILE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const TTWID_FILE = path.join(os.homedir(), '.dsh', 'workbench', 'cookies', 'ttwid.txt');

export function isDouyin(url) {
  return /(^|\.)(douyin|iesdouyin)\.com$/i.test((() => { try { return new URL(url).hostname; } catch { return ''; } })());
}

async function readTtwid() {
  try {
    const raw = await fs.readFile(TTWID_FILE, 'utf8');
    const value = raw.trim();
    return value.length > 40 ? value : '';
  } catch {
    return '';
  }
}

async function issueTtwid() {
  const response = await fetch('https://ttwid.bytedance.com/ttwid/union/register/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      region: 'cn', aid: 1768, needFid: false, service: 'www.ixigua.com',
      migrate_info: { ticket: '', source: 'node' }, cbUrlProtocol: 'https', union: true,
    }),
    signal: AbortSignal.timeout(15_000),
  });
  const raw = response.headers.getSetCookie?.() || [];
  const hit = raw.map((item) => /ttwid=([^;]+)/.exec(item)).find(Boolean);
  if (!hit) throw new Error('申请 ttwid 失败');
  const value = hit[1];
  await fs.mkdir(path.dirname(TTWID_FILE), { recursive: true });
  await fs.writeFile(TTWID_FILE, value, 'utf8');
  return value;
}

async function getTtwid(force = false) {
  if (!force) {
    const cached = await readTtwid();
    if (cached) return cached;
  }
  return issueTtwid();
}

export async function expandShortLink(rawUrl) {
  const response = await fetch(rawUrl, {
    headers: { 'User-Agent': MOBILE_UA },
    redirect: 'follow',
    signal: AbortSignal.timeout(20_000),
  });
  return response.url;
}

function pickItem(data) {
  const loader = data?.loaderData || {};
  for (const key of Object.keys(loader)) {
    const info = loader[key]?.videoInfoRes;
    if (info?.item_list?.length) return info.item_list[0];
  }
  return null;
}

async function fetchSharePage(videoId, ttwid) {
  const response = await fetch(`https://www.iesdouyin.com/share/video/${videoId}`, {
    headers: { 'User-Agent': MOBILE_UA, Cookie: `ttwid=${ttwid}`, Referer: 'https://www.douyin.com/' },
    signal: AbortSignal.timeout(25_000),
  });
  if (!response.ok) throw new Error(`分享页返回 ${response.status}`);
  const html = await response.text();
  const match = /window\._ROUTER_DATA\s*=\s*(\{.*?\})<\/script>/s.exec(html);
  if (!match) return null;
  try {
    return pickItem(JSON.parse(match[1].trim()));
  } catch {
    return null;
  }
}

/** 解析抖音链接（纯 HTTP，不开浏览器） */
export async function douyinInfo(rawUrl) {
  const expanded = await expandShortLink(rawUrl);
  const idMatch = /\/video\/(\d+)/.exec(expanded) || /(\d{15,})/.exec(expanded);
  if (!idMatch) throw new Error('没能从链接里认出视频 ID');
  const videoId = idMatch[1];

  let item = await fetchSharePage(videoId, await getTtwid());
  if (!item) item = await fetchSharePage(videoId, await getTtwid(true));
  if (!item) throw new Error('分享页没有返回视频信息（ttwid 可能已失效，重试一次仍失败）');

  const playList = item?.video?.play_addr?.url_list || [];
  if (!playList.length) throw new Error('没有拿到播放地址');
  const playUrl = playList[0].replace('playwm', 'play');

  return {
    videoId,
    title: String(item.desc || '').trim() || `douyin_${videoId}`,
    duration: Number(item?.video?.duration || 0) / 1000,
    cover: item?.video?.cover?.url_list?.[0] || '',
    playUrl,
    pageUrl: `https://www.douyin.com/video/${videoId}`,
  };
}

export const DOUYIN_UA = MOBILE_UA;
