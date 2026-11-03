#!/usr/bin/env node
/**
 * 抖音无水印下载（纯 HTTP，不需要登录、不需要浏览器、不用 yt-dlp）
 *
 * 用法：
 *   node scripts/douyin.mjs "https://v.douyin.com/xxxx/" [输出目录]
 *   node scripts/douyin.mjs "3.33 复制打开抖音… https://v.douyin.com/xxxx/ …" ~/Downloads
 *
 * 输出：<id>-<标题>.mp4 + 同名 .json（标题、时长、id、原始地址）
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const run = promisify(execFile);
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const TTWID_FILE = path.join(os.homedir(), '.dsh', 'workbench', 'cookies', 'ttwid.txt');

/** 1. 从分享文案里抠链接 */
export function pickUrl(text) {
  const hit = /https?:\/\/[^\s，。、；;）)】"'<>]+/i.exec(String(text || ''));
  if (!hit) throw new Error('没找到链接');
  return hit[0];
}

/** 2. 短链展开，取 video id */
export async function resolveVideoId(url) {
  const response = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow', signal: AbortSignal.timeout(20_000) });
  const hit = /\/video\/(\d+)/.exec(response.url) || /(\d{15,})/.exec(response.url);
  if (!hit) throw new Error('链接里没有 video id');
  return hit[1];
}

/** 3. ttwid：分享页必须有它才返回视频信息；缓存复用，失效则重新申请 */
export async function getTtwid(force = false) {
  if (!force) {
    try {
      const cached = (await fs.readFile(TTWID_FILE, 'utf8')).trim();
      if (cached.length > 40) return cached;
    } catch { /* 无缓存 */ }
  }
  const response = await fetch('https://ttwid.bytedance.com/ttwid/union/register/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ region: 'cn', aid: 1768, needFid: false, service: 'www.ixigua.com', migrate_info: { ticket: '', source: 'node' }, cbUrlProtocol: 'https', union: true }),
    signal: AbortSignal.timeout(15_000),
  });
  const cookies = response.headers.getSetCookie?.() || [];
  const match = cookies.map((item) => /ttwid=([^;]+)/.exec(item)).find(Boolean);
  if (!match) throw new Error('拿不到 ttwid');
  await fs.mkdir(path.dirname(TTWID_FILE), { recursive: true });
  await fs.writeFile(TTWID_FILE, match[1], 'utf8');
  return match[1];
}

/** 4. 请求分享页，解析 window._ROUTER_DATA → videoInfoRes */
export async function fetchItem(videoId, ttwid) {
  const response = await fetch(`https://www.iesdouyin.com/share/video/${videoId}`, {
    headers: { 'User-Agent': UA, Cookie: `ttwid=${ttwid}`, Referer: 'https://www.douyin.com/' },
    signal: AbortSignal.timeout(25_000),
  });
  if (!response.ok) throw new Error(`分享页 ${response.status}`);
  const html = await response.text();
  const match = /window\._ROUTER_DATA\s*=\s*(\{.*?\})<\/script>/s.exec(html);
  if (!match) return null;
  const data = JSON.parse(match[1].trim());
  for (const key of Object.keys(data.loaderData || {})) {
    const items = data.loaderData[key]?.videoInfoRes?.item_list;
    if (items?.length) return items[0];
  }
  return null;
}

/** 5. 下载（playwm 是带水印的地址，换成 play 即无水印） */
export async function download(playUrl, outPath) {
  await run('curl', [
    '-A', UA, '-e', 'https://www.douyin.com/', '-L', '--fail', '--retry', '2',
    '--connect-timeout', '15', '-o', outPath, playUrl,
  ], { maxBuffer: 1024 * 1024 * 8 });
  return outPath;
}

export async function douyin(rawInput, outDir = process.cwd()) {
  const url = pickUrl(rawInput);
  const videoId = await resolveVideoId(url);
  let item = await fetchItem(videoId, await getTtwid());
  if (!item) item = await fetchItem(videoId, await getTtwid(true));
  if (!item) throw new Error('分享页没有视频信息（ttwid 失效且重试失败）');

  const playUrl = item.video.play_addr.url_list[0].replace('playwm', 'play');
  const title = String(item.desc || '').trim() || `douyin_${videoId}`;
  const safe = title.replace(/[\\/:*?"<>|\n]/g, ' ').slice(0, 60).trim();
  await fs.mkdir(outDir, { recursive: true });
  const outPath = path.join(outDir, `${videoId}-${safe}.mp4`);

  await download(playUrl, outPath);
  const info = {
    id: videoId,
    title,
    duration: Number(item.video?.duration || 0) / 1000,
    cover: item.video?.cover?.url_list?.[0] || '',
    page: `https://www.douyin.com/video/${videoId}`,
    file: outPath,
    bytes: (await fs.stat(outPath)).size,
  };
  await fs.writeFile(outPath.replace(/\.mp4$/, '.json'), JSON.stringify(info, null, 2), 'utf8');
  return info;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [input, outDir] = process.argv.slice(2);
  if (!input) {
    console.error('用法：node scripts/douyin.mjs "<分享文案或链接>" [输出目录]');
    process.exit(1);
  }
  douyin(input, outDir || os.homedir()).then((info) => {
    console.log(JSON.stringify(info, null, 2));
  }).catch((error) => {
    console.error('失败：' + error.message);
    process.exit(1);
  });
}
