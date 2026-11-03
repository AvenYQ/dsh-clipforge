/**
 * 用本机 ego 浏览器（自带独立 profile）打开页面取正文。
 *
 * 为什么不用纯 HTTP：X 的文章、部分公众号/小红书页面必须登录才返回正文，
 * 而这个浏览器可以保留一次登录态，之后所有抓取都复用它 —— 用户只需要登录一次。
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const HOME = os.homedir();
const CLI = path.join(HOME, '.dsh/profiles/desktop/node_modules/dsh-ego-browser/runtime/ego-linux/bin/ego-browser.mjs');
const CHROME_CANDIDATES = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
];

export const MARKER = '@@WB_RESULT@@';

export const SPACE = 'workbench';

function chromePath() {
  return CHROME_CANDIDATES.find((candidate) => fs.existsSync(candidate)) || '';
}

export function browserReady() {
  return fs.existsSync(CLI) && Boolean(chromePath());
}

export function runBrowser(script, { timeout = 120_000 } = {}) {
  return new Promise((resolve, reject) => {
    if (!browserReady()) {
      reject(new Error('找不到 ego 浏览器（需要 dsh-ego-browser 与 Chrome）'));
      return;
    }
    const child = spawn(process.execPath, [CLI], {
      env: {
        ...process.env,
        EGO_LINUX_CHROME: chromePath(),
        /* 需要用户在里面登录，所以保持可见；把它靠边放，别挡着面板。 */
        EGO_LINUX_HEADLESS: '0',
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let out = '';
    let err = '';
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      try { child.kill('SIGTERM'); } catch { /* 已退出 */ }
      reject(new Error('浏览器操作超时'));
    }, timeout);

    child.stdout.on('data', (chunk) => { out += chunk.toString('utf8'); });
    child.stderr.on('data', (chunk) => { err += chunk.toString('utf8'); });
    child.on('error', (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(error);
    });
    child.on('close', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      const line = out.split('\n').reverse().find((entry) => entry.startsWith(MARKER));
      if (!line) {
        reject(new Error((err || out || '浏览器没有返回结果').split('\n').slice(-3).join(' ').trim()));
        return;
      }
      try {
        resolve(JSON.parse(line.slice(MARKER.length)));
      } catch {
        reject(new Error('浏览器返回的结果不是 JSON'));
      }
    });

    child.stdin.write(script);
    child.stdin.end();
  });
}

function quote(value) {
  return JSON.stringify(String(value));
}

/** 打开页面并返回标题/正文，附带登录墙判断。 */
export async function fetchWithBrowser(url) {
  const script = `
const space = await taskSpaces.useOrCreate(${quote(SPACE)});
await page.goto(${quote(url)}, { waitUntil: 'domcontentloaded' });
await new Promise((resolve) => setTimeout(resolve, 2500));
const data = await page.evaluate(() => {
  const pick = (selector) => {
    const node = document.querySelector(selector);
    return node && node.innerText ? node.innerText.trim() : '';
  };
  const body = pick('article') || pick('main') || (document.body ? document.body.innerText : '');
  return {
    url: location.href,
    title: document.title || '',
    og: (document.querySelector('meta[property="og:title"]') || {}).content || '',
    text: body.slice(0, 40000),
  };
});
console.log(${quote(MARKER)} + JSON.stringify(data));
`;
  const data = await runBrowser(script);
  const haystack = `${data.url} ${data.text.slice(0, 4000)}`;
  const needsLogin = /(?:\/login|\/i\/jf\/onboarding|sign in to x|登录 x|log in to x)/i.test(haystack);
  return {
    ok: true,
    url: data.url,
    title: (data.og || data.title || '').trim(),
    text: data.text,
    needsLogin,
  };
}

/** 只打开页面（让用户在里面登录），不取正文。 */
export async function openInBrowser(url) {
  const script = `
const space = await taskSpaces.useOrCreate(${quote(SPACE)});
await page.goto(${quote(url)}, { waitUntil: 'domcontentloaded' });
console.log(${quote(MARKER)} + JSON.stringify({ url: page.url ? page.url() : ${quote(url)} }));
`;
  return runBrowser(script, { timeout: 60_000 });
}
