/**
 * 浏览器嗅探：用 ego 浏览器打开页面，拦截网络请求，捞出真实音视频直链。
 * 用于 yt-dlp 支持不了、或需要站点签名的平台（抖音等）。
 */
import { MARKER, runBrowser } from './browser.js';

function score(url) {
  const br = /[?&]br=(\d+)/.exec(url);
  return br ? Number(br[1]) : 0;
}

export async function sniffMedia(url, { wait = 7000 } = {}) {
  const script = `
const space = await taskSpaces.useOrCreate('workbench');
await cdp('Network.enable', {});
await page.goto(${JSON.stringify(url)}, { waitUntil: 'domcontentloaded' });
await new Promise((resolve) => setTimeout(resolve, ${wait}));
const meta = await page.evaluate(() => {
  const pick = (selector) => (document.querySelector(selector) || {}).content || '';
  return {
    title: document.title || '',
    ogTitle: pick('meta[property="og:title"]'),
    description: pick('meta[name="description"]'),
    pageUrl: location.href,
  };
});
const events = await page.drainEvents('network');
const urls = (Array.isArray(events) ? events : []).map((event) => {
  if (!event) return '';
  if (event.url) return event.url;
  const request = event.params && event.params.request;
  return request && request.url ? request.url : '';
}).filter(Boolean);
console.log(${JSON.stringify(MARKER)} + JSON.stringify({ urls, meta }));
`;
  const data = await runBrowser(script, { timeout: 150_000 });
  const urls = data?.urls || [];
  const videos = urls.filter((item) => /mime_type=video_mp4/.test(item) && /media-video/.test(item));
  const audios = urls.filter((item) => /media-audio/.test(item));
  videos.sort((a, b) => score(b) - score(a));
  audios.sort((a, b) => score(b) - score(a));

  return {
    url: data?.meta?.pageUrl || url,
    title: (data?.meta?.ogTitle || data?.meta?.title || '').replace(/\s*-\s*抖音\s*$/, '').trim(),
    description: data?.meta?.description || '',
    video: videos[0] || '',
    audio: audios[0] || '',
    candidates: { videos: videos.length, audios: audios.length },
  };
}
