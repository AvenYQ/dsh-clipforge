/**
 * 通用视频兜底：yt-dlp 不支持的站点，直接从页面 HTML 里找视频地址。
 * 找 og:video / twitter:player:stream / <video src> / .m3u8 / .mp4。
 * 参考 Downbit 的 RegisterGeneric / RegisterPagePeek 思路。
 */
const DESKTOP_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const MOBILE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

function decode(text) {
  return String(text || '')
    .replace(/\\u002F/gi, '/')
    .replace(/\\u0026/gi, '&')
    .replace(/\\\//g, '/')
    .replace(/&amp;/g, '&');
}

function pick(html, patterns) {
  for (const pattern of patterns) {
    const hit = pattern.exec(html);
    if (hit && hit[1]) return decode(hit[1]);
  }
  return '';
}

export async function genericInfo(rawUrl) {
  const ua = MOBILE_UA;
  const response = await fetch(rawUrl, {
    headers: { 'User-Agent': ua, 'Accept-Language': 'zh-CN,zh;q=0.9' },
    redirect: 'follow',
    signal: AbortSignal.timeout(25_000),
  });
  if (!response.ok) throw new Error(`页面返回 ${response.status}`);
  const html = decode(await response.text());

  const video = pick(html, [
    /<meta[^>]+property="og:video(?::url|:secure_url)?"[^>]+content="([^"]+)"/i,
    /<meta[^>]+name="twitter:player:stream"[^>]+content="([^"]+)"/i,
    /<video[^>]+src="([^"]+)"/i,
    /"playUrl"\s*:\s*"([^"]+)"/i,
    /"masterUrl"\s*:\s*"([^"]+)"/i,
    /(https?:\/\/[^"'\s]+\.m3u8[^"'\s]*)/i,
    /(https?:\/\/[^"'\s]+\.mp4[^"'\s]*)/i,
  ]);

  if (!video) throw new Error('页面里没有可下载的视频地址');

  const title = pick(html, [
    /<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i,
    /<title>([^<]*)<\/title>/i,
  ]).trim() || '未命名视频';

  return {
    playUrl: video.replace(/^http:\/\//i, 'https://'),
    title,
    pageUrl: response.url,
    hls: /\.m3u8/i.test(video),
  };
}
