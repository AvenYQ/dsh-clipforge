/**
 * 小红书解析：短链 → 分享页 HTML → masterUrl → 视频直链。
 * 纯 HTTP，不需要登录、不用 yt-dlp（yt-dlp 不支持小红书）。
 */
const MOBILE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

export function isXhs(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    return /(^|\.)(xhslink\.com|xhslink\.cn|xiaohongshu\.com)$/i.test(host);
  } catch {
    return false;
  }
}

function decodeEscapes(text) {
  return text
    .replace(/\\u002F/gi, '/')
    .replace(/\\u0026/gi, '&')
    .replace(/\\u003D/gi, '=')
    .replace(/\\u([0-9a-fA-F]{4})/g, (match, hex) => String.fromCharCode(Number.parseInt(hex, 16)));
}

export async function xhsInfo(rawUrl) {
  const response = await fetch(rawUrl, {
    headers: { 'User-Agent': MOBILE_UA },
    redirect: 'follow',
    signal: AbortSignal.timeout(25_000),
  });
  if (!response.ok) throw new Error(`分享页返回 ${response.status}`);
  const html = decodeEscapes(await response.text());

  const master = /"masterUrl":"([^"]+)"/.exec(html)
    || /"master_url":"([^"]+)"/.exec(html)
    || /"backupUrls":\["([^"]+)"/.exec(html);
  if (!master) throw new Error('页面里没有找到视频地址（可能是图文笔记，或页面结构变了）');

  /* http 会下到 0 字节，必须换成 https */
  const playUrl = master[1].replace(/^http:\/\//i, 'https://');

  const titleHit = /<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i.exec(html)
    || /<title>([^<]*)<\/title>/i.exec(html);
  const title = (titleHit?.[1] || '').replace(/\s*-\s*小红书\s*$/, '').trim() || '小红书视频';

  return {
    playUrl,
    title,
    pageUrl: response.url,
    cover: (/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i.exec(html)?.[1] || ''),
  };
}

export const XHS_UA = MOBILE_UA;
