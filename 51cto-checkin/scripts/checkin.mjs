#!/usr/bin/env node
'use strict';

// 51CTO 每日自动签到
// 原理：用系统真实 Chrome 打开站点，靠【原生持久化 profile】携带登录态完成签到；脚本幂等。
//
// ⚠️ 反爬要点（重要）：
//   51CTO 前置的 Tencent EdgeOne WAF 会拦截「无头浏览器」——整页返回「请求已被拦截」。
//   因此默认使用【有头】系统 Chrome（channel: 'chrome'，headless:false），与真实用户一致；
//   无头模式（HEADLESS=1）在当前风控下极易被拦截，不建议。
//
// 登录态策略（v2，默认「原生 profile 模式」）：
//   不再依赖导出的 cookies.json，而是让脚本启动的系统 Chrome 复用【专属持久化 profile】
//   （<技能目录>/chrome-profile）。Chrome 用自身持久化 + App-Bound 加密保管 51CTO 登录态，
//   与「正常 Chrome 一直登录着」是同一机制——只要始终复用同一 profile 路径 + 真实 Chrome，
//   登录态就长期有效，无需反复导出 / 续期 cookies。
//   · 首次：运行 `node login.mjs` 在该 profile 的浏览器里登录一次 51CTO，登录态即被 Chrome 保存；
//   · 之后：每日签到直接复用该 profile，打开 user/sign 点签到即可。
//   · 该 profile 独立于你日常使用的 Default profile，互不干扰，也不会和正在运行的 Chrome 抢锁。
//   · 兼容回退：设置 USE_COOKIES=1 可退回旧的 cookies.json 模式（需先 login.mjs 导出 cookies.json）。
//
// 判定来源：以专用签到页 https://blog.51cto.com/user/sign 为权威——
//   已登录：停留本站，显示「今日已签到」或签到按钮；
//   未登录：被重定向到 home.51cto.com/index?reback=...（登录页）→ 报 COOKIE_EXPIRED，触发登录助手。
//
// 退出码：
//   0  成功 / 今日已签到（幂等跳过）
//   2  旧模式缺少 cookies.json 或解析失败（仅 USE_COOKIES=1 时）
//   3  登录态失效 / 未登录
//   1  其他失败（按钮未找到 / 未检测到成功标识 / 被 WAF 拦截 / profile 被占用 / 异常）

import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const COOKIE_FILE = path.join(ROOT, 'cookies.json');
const LOG_DIR = path.join(ROOT, 'logs');
// 原生 profile 模式：专属持久化 profile 目录（Chrome 在此保管登录态）
const PROFILE_DIR = process.env.PROFILE_DIR || path.join(ROOT, 'chrome-profile');
// 默认原生 profile 模式；USE_COOKIES=1 回退旧 cookies.json 模式
const USE_PROFILE = !/^1$/i.test(process.env.USE_COOKIES || '');
// 首页：仅在专用签到页不可用时作为回退入口
const CHECKIN_URL = process.env.CHECKIN_URL || 'https://blog.51cto.com/';
// 专用签到页：权威状态源（登录态 / 今日已签到 / 签到按钮 三态都在此页准确体现）
const SIGN_URL = process.env.SIGN_URL || 'https://blog.51cto.com/user/sign';
const DEBUG = process.env.DEBUG === '1' || process.env.DEBUG === 'true';
// 默认有头（反 WAF）；HEADLESS=1 强制无头（不推荐）
const HEADLESS = process.env.HEADLESS === '1';

// 旧 cookies.json 模式下加载的 cookie（profile 模式下为 null）
let cookies = null;

// ---------- 日志 ----------
function ts() { return new Date().toISOString().replace('T', ' ').slice(0, 19); }
const logLines = [];
function log(level, msg) {
  const line = `[${ts()}] [${level}] ${msg}`;
  console.log(line);
  logLines.push(line);
}
function result(kind, detail = '') {
  log('RESULT', `${kind}${detail ? ' | ' + detail : ''}`);
}
function flushLog() {
  try {
    if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
    const f = path.join(LOG_DIR, `checkin-${new Date().toISOString().slice(0, 10)}.log`);
    fs.appendFileSync(f, logLines.join('\n') + '\n');
  } catch (_) { /* 日志失败不影响主流程 */ }
}
function exit(code) { flushLog(); process.exit(code); }

// ---------- Cookie 归一化（仅旧模式使用） ----------
function parseCookieHeader(str) {
  return str.split(';').map(s => s.trim()).filter(Boolean).map(pair => {
    const i = pair.indexOf('=');
    return { name: pair.slice(0, i).trim(), value: pair.slice(i + 1).trim() };
  });
}
function normalizeCookies(raw) {
  let list = raw;
  if (typeof raw === 'string') {
    const s = raw.trim();
    list = (s.startsWith('[') || s.startsWith('{')) ? JSON.parse(s) : parseCookieHeader(s);
  }
  if (!Array.isArray(list)) throw new Error('cookies.json 格式无法识别（应为对象数组）');
  const out = [];
  for (const c of list) {
    if (!c || !c.name) continue;
    let domain = c.domain || (c.url ? new URL(c.url).hostname : undefined);
    if (!domain) { log('WARN', `跳过缺少 domain 的 cookie: ${c.name}`); continue; }
    if (domain.startsWith('.')) domain = domain.slice(1); // Playwright 接受带/不带点的域名
    let sameSite = c.sameSite || 'Lax';
    if (sameSite === 'no_restriction' || sameSite === 'unspecified') sameSite = 'None';
    if (!['Strict', 'Lax', 'None'].includes(sameSite)) sameSite = 'Lax';
    const ck = {
      name: c.name,
      value: String(c.value ?? ''),
      domain,
      path: c.path || '/',
      secure: !!c.secure,
      httpOnly: !!c.httpOnly,
      sameSite,
    };
    const exp = c.expires != null ? c.expires : c.expirationDate;
    if (exp != null && !isNaN(Number(exp))) ck.expires = Number(exp);
    out.push(ck);
  }
  return out;
}

// ---------- 签到后自动续期（仅旧 cookies.json 模式需要） ----------
async function refreshCookies(context) {
  if (USE_PROFILE) return; // 原生 profile 模式：Chrome 自身持久化，无需回写 cookies.json
  try {
    const all = await context.cookies();
    const list = all.filter(c => /51cto/.test(c.domain || ''));
    if (list.length) {
      fs.writeFileSync(COOKIE_FILE, JSON.stringify(list, null, 2), { encoding: 'utf8' });
      log('INFO', `已刷新 cookies.json（${list.length} 个，自动续期）`);
    }
  } catch (e) {
    log('WARN', `回写 cookies.json 失败（不影响本次签到）：${e.message}`);
  }
}

// ---------- 浏览器启动 ----------
// 返回 { browser, context }；两种模式对上层透明：
// · 原生 profile 模式：launchPersistentContext（Chrome 自己保管登录态）
// · 旧模式：普通 launch + newContext + addCookies
async function launch() {
  const channel = process.env.BROWSER_CHANNEL ?? 'chrome';
  const args = ['--disable-blink-features=AutomationControlled'];

  if (USE_PROFILE) {
    const opts = { headless: HEADLESS, args, locale: 'zh-CN' };
    try {
      const ctx = await chromium.launchPersistentContext(PROFILE_DIR, { ...opts, channel });
      return { browser: ctx.browser(), context: ctx };
    } catch (e) {
      log('WARN', `系统 Chrome（channel: ${channel}）启动失败，回退到自带 Chromium：${e.message}`);
    }
    const ctx = await chromium.launchPersistentContext(PROFILE_DIR, opts);
    return { browser: ctx.browser(), context: ctx };
  }

  // 旧 cookies.json 模式
  let browser;
  if (channel) {
    try {
      browser = await chromium.launch({ headless: HEADLESS, channel, args });
    } catch (e) {
      log('WARN', `系统 Chrome（channel: ${channel}）启动失败，回退到自带 Chromium：${e.message}`);
    }
  }
  if (!browser) browser = await chromium.launch({ headless: HEADLESS, args });
  const context = await browser.newContext({ locale: 'zh-CN' });
  if (cookies && cookies.length) await context.addCookies(cookies);
  return { browser, context };
}

// ---------- 页面状态判定 ----------
// EdgeOne WAF 拦截页识别
function isWafBlock(title, text) {
  return /请求已被拦截/.test(title || '') || /请求已被拦截|安全策略拦截/.test(text || '');
}
// 被重定向到登录页识别（访客访问 user/sign 会跳到 home.51cto.com/index?reback=...）
function isLoginPage(url, text) {
  if (/home\.51cto\.com\/index|reback=|passport\.51cto\.com/.test(url || '')) return true;
  return /扫码登录|请使用微信扫描|其他登录方式|微信登录\s*短信登录|账号登录/.test(text || '');
}
// 今日已签到（精确匹配，避免误命中「已签到 21/30 天」这类累计文案）
function isAlreadyToday(text) {
  return /今日已签到|今日签到已完成/.test(text || '');
}
// 保存排查快照
async function dumpDebug(page, tag) {
  try {
    if (!page) return;
    if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
    const stamp = Date.now();
    await page.screenshot({ path: path.join(LOG_DIR, `debug-${tag}-${stamp}.png`) }).catch(() => {});
    fs.writeFileSync(path.join(LOG_DIR, `debug-${tag}-${stamp}.html`), await page.content());
    log('WARN', `已保存页面快照：logs/debug-${tag}-${stamp}.html`);
  } catch (_) {}
}
// 查找可点击的签到按钮（多级回退）
async function findSignButton(page) {
  const sels = [
    'a.signin-btn',
    'span.sign-btn',
    '.signBox .sign-btn',
    '#sign .sign-btn',
    'a:has-text("立即签到")',
    'a:has-text("签到")',
    'button:has-text("签到")',
    '[class*="sign"]:has-text("签到")',
  ];
  for (const s of sels) {
    const l = page.locator(s).first();
    if (await l.count().catch(() => 0) && await l.isVisible().catch(() => false)) return l;
  }
  return null;
}

// ---------- 回退：首页「每日签到」模块 ----------
// 仅在专用签到页被 WAF 拦截或异常时使用；返回退出码（内部已关闭浏览器）
async function homepageCheckin(page, context, browser) {
  log('WARN', `专用签到页不可用，回退首页「每日签到」模块：${CHECKIN_URL}`);
  await page.goto(CHECKIN_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(5000); // 模块由 JS 异步渲染，多等一会，避免误读游客文案
  const title = await page.title();
  const text = await page.evaluate(() => document.body.innerText);

  if (isWafBlock(title, text)) {
    log('ERROR', '首页亦被 EdgeOne WAF 拦截，无法完成签到，请稍后重试。');
    await dumpDebug(page, 'waf');
    result('FAILED', 'waf_blocked');
    await browser.close();
    return 1;
  }
  if (isLoginPage(page.url(), text)) {
    log('ERROR', '登录态失效或未登录（首页被跳转到登录页）。请重新运行登录助手：\n  node login.mjs');
    await dumpDebug(page, 'login');
    result('COOKIE_EXPIRED');
    await browser.close();
    return 3;
  }

  const moduleBtn = page.locator('.signBox .sign-btn, #sign .sign-btn, .signBox #sign').first();
  if (await moduleBtn.count().catch(() => 0) && await moduleBtn.isVisible().catch(() => false)) {
    log('INFO', '找到首页「每日签到」模块按钮，点击中…');
    await moduleBtn.click();
    await page.waitForTimeout(3000);
    const after = await page.evaluate(() => document.body.innerText);
    if (/签到成功|签到完成/.test(after)) {
      log('INFO', '点击模块后签到成功。');
      if (DEBUG) await page.screenshot({ path: path.join(LOG_DIR, `success-${Date.now()}.png`) }).catch(() => {});
      result('SUCCESS');
      await refreshCookies(context).catch(() => {});
      await browser.close();
      return 0;
    }
    if (isAlreadyToday(after)) {
      log('INFO', '今日已签到（模块点击后检测到）。');
      result('ALREADY');
      await refreshCookies(context).catch(() => {});
      await browser.close();
      return 0;
    }
    if (isLoginPage(page.url(), after)) {
      log('ERROR', '点击后跳转到登录页，说明未登录。请重新运行登录助手：\n  node login.mjs');
      await dumpDebug(page, 'login');
      result('COOKIE_EXPIRED');
      await browser.close();
      return 3;
    }
    log('WARN', '点击模块后未检测到明确成功标识，保存快照。');
    await dumpDebug(page, 'result');
    result('FAILED', 'no_success_signal');
    await browser.close();
    return 1;
  }

  log('WARN', '首页未找到可点击的签到按钮，保存页面快照用于排查。');
  await dumpDebug(page, 'nobtn');
  result('FAILED', 'no_sign_button');
  await browser.close();
  return 1;
}

// ---------- 主流程 ----------
async function main() {
  let browser, context, page;

  if (USE_PROFILE) {
    log('INFO', `使用原生持久化 profile 模式（${PROFILE_DIR}）`);
  } else {
    // 旧 cookies.json 模式：加载并校验
    if (!fs.existsSync(COOKIE_FILE)) {
      log('ERROR', `未找到 cookies.json（${COOKIE_FILE}）。请先运行一次登录助手：\n  node login.mjs`);
      result('MISSING_COOKIES');
      return exit(2);
    }
    try {
      let rawText = fs.readFileSync(COOKIE_FILE, 'utf8');
      if (rawText.charCodeAt(0) === 0xFEFF) rawText = rawText.slice(1); // 去除 UTF-8 BOM
      cookies = normalizeCookies(JSON.parse(rawText));
    } catch (e) {
      log('ERROR', `解析 cookies.json 失败：${e.message}。如登录态已变，请重新运行 node login.mjs 生成新的 cookies.json。`);
      result('MISSING_COOKIES', e.message);
      return exit(2);
    }
    if (!cookies.length) {
      log('ERROR', 'cookies.json 中没有有效 Cookie。请重新运行 node login.mjs 生成登录态。');
      result('MISSING_COOKIES');
      return exit(2);
    }
    log('INFO', `已加载 ${cookies.length} 个 Cookie`);
  }

  try {
    ({ browser, context } = await launch());
    page = await context.newPage();

    // 步骤 1：打开专用签到页（权威状态源）
    log('INFO', `打开专用签到页：${SIGN_URL}`);
    await page.goto(SIGN_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);
    const title = await page.title();
    const text = await page.evaluate(() => document.body.innerText);
    log('INFO', `当前页面：${page.url()}（标题：${title}）`);

    // 步骤 2：WAF 拦截 → 回退首页模块
    if (isWafBlock(title, text)) {
      return exit(await homepageCheckin(page, context, browser));
    }

    // 步骤 3：登录失效
    if (isLoginPage(page.url(), text)) {
      log('ERROR', '登录态失效或未登录（签到页被重定向到登录页）。请重新运行登录助手：\n  node login.mjs');
      await dumpDebug(page, 'login');
      result('COOKIE_EXPIRED');
      await browser.close();
      return exit(3);
    }

    // 步骤 4：今日已签到
    if (isAlreadyToday(text)) {
      log('INFO', '今日已签到（幂等跳过）。');
      if (DEBUG) await page.screenshot({ path: path.join(LOG_DIR, `debug-${Date.now()}.png`) }).catch(() => {});
      result('ALREADY');
      await refreshCookies(context).catch(() => {}); // profile 模式此处为 no-op
      await browser.close();
      return exit(0);
    }

    // 步骤 5：点击签到按钮
    const btn = await findSignButton(page);
    if (btn) {
      log('INFO', '找到签到按钮，点击中…');
      await btn.click();
      await page.waitForTimeout(3000);
      const after = await page.evaluate(() => document.body.innerText);
      if (/签到成功|签到完成/.test(after)) {
        log('INFO', '签到成功。');
        if (DEBUG) await page.screenshot({ path: path.join(LOG_DIR, `success-${Date.now()}.png`) }).catch(() => {});
        result('SUCCESS');
        await refreshCookies(context).catch(() => {});
        await browser.close();
        return exit(0);
      }
      if (isAlreadyToday(after)) {
        log('INFO', '今日已签到（点击后检测到）。');
        result('ALREADY');
        await refreshCookies(context).catch(() => {});
        await browser.close();
        return exit(0);
      }
      log('WARN', '点击后未检测到明确成功标识，保存快照。');
      await dumpDebug(page, 'result');
      result('FAILED', 'no_success_signal');
      await browser.close();
      return exit(1);
    }

    // 步骤 6：签到页既非已签到也无可点按钮 → 回退首页模块
    return exit(await homepageCheckin(page, context, browser));
  } catch (e) {
    if (USE_PROFILE && /user data|already in use|locked|singleton/i.test(e.message || '')) {
      log('ERROR', '持久化 profile 被占用（可能上次 Chrome 未正常关闭）。请关闭残留 Chrome 进程后重试。');
      result('FAILED', 'profile_locked');
    } else {
      log('ERROR', '执行异常：' + (e && e.stack ? e.stack : e));
      await dumpDebug(page, 'error');
      result('FAILED', e && e.message ? e.message : String(e));
    }
    await browser?.close().catch(() => {});
    return exit(1);
  }
}

main();
