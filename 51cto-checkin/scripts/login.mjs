#!/usr/bin/env node
'use strict';

// 51CTO 登录助手（一次性）
// 原生 profile 模式（默认）：用系统 Chrome 打开 51CTO 登录页，你在浏览器里登录一次，
// 登录态由 Chrome 持久化保存到 <技能目录>/chrome-profile，之后 checkin.mjs 直接复用，
// 无需导出 cookies.json，也无需每日重新登录（与「正常 Chrome 一直登录」同机制）。
// 旧模式（USE_COOKIES=1）：登录后把会话导出为 cookies.json（供旧 checkin 模式使用）。

import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const COOKIE_FILE = path.join(ROOT, 'cookies.json');
const PROFILE_DIR = process.env.PROFILE_DIR || path.join(ROOT, 'chrome-profile');
// 默认原生 profile 模式；USE_COOKIES=1 回退旧 cookies.json 模式
const USE_PROFILE = !/^1$/i.test(process.env.USE_COOKIES || '');
// 51CTO 登录入口（现统一在 home.51cto.com/index 登录）
const LOGIN_PAGE = 'https://home.51cto.com/index';

// 有头启动（需人工操作）；系统 Chrome → 自带 Chromium 回退。两种模式返回 { browser, context }。
async function launch() {
  const channel = process.env.BROWSER_CHANNEL ?? 'chrome';
  const args = ['--disable-blink-features=AutomationControlled'];
  if (USE_PROFILE) {
    try {
      const ctx = await chromium.launchPersistentContext(PROFILE_DIR, { headless: false, channel, args, locale: 'zh-CN' });
      return { browser: ctx.browser(), context: ctx };
    } catch (e) {
      console.log(`系统 Chrome 启动失败，回退自带 Chromium：${e.message}`);
    }
    const ctx = await chromium.launchPersistentContext(PROFILE_DIR, { headless: false, args, locale: 'zh-CN' });
    return { browser: ctx.browser(), context: ctx };
  }
  let browser;
  if (channel) {
    try { browser = await chromium.launch({ headless: false, channel, args }); }
    catch (e) { console.log(`系统 Chrome 启动失败，回退自带 Chromium：${e.message}`); }
  }
  if (!browser) browser = await chromium.launch({ headless: false, args });
  const context = await browser.newContext({ locale: 'zh-CN' });
  return { browser, context };
}

// 仅保留 51cto 相关 cookie（仅旧模式使用）
function saveCookies(cookies) {
  const list = cookies.filter(c => /51cto/.test(c.domain || ''));
  fs.writeFileSync(COOKIE_FILE, JSON.stringify(list, null, 2), { encoding: 'utf8' });
  return list.length;
}

// 是否已登录：以页面实际呈现为准。
// 注意：游客访问同样会拿到多个 cookie（含 tfstk/www51cto 等），仅凭 cookie 数量/名称
// 会把游客误判为已登录（曾导致「打开即保存游客会话」），故这里改为判断页面文案：
// 命中登录页文案（登录/注册、立即登录…）视为未登录；命中用户中心文案（退出登录、个人中心…）视为已登录。
async function looksLoggedIn(page) {
  const LOGIN_TXT = /(立即登录|请登录|登录\/注册|登录查看|账号登录|手机号登录|扫码登录|密码登录|登录后)/;
  const USER_TXT = /(退出登录|注销|个人中心|我的博客|我的主页|账号设置|我的收藏|我的消息|消息中心|我的关注|我的粉丝|我的积分|积分商城)/;
  try {
    const txt = await page.evaluate(() => document.body.innerText);
    if (LOGIN_TXT.test(txt)) return false;
    if (USER_TXT.test(txt)) return true;
  } catch (_) { /* 页面切换中，忽略本次 */ }
  return false;
}

async function main() {
  console.log('== 51CTO 登录助手 ==');
  if (USE_PROFILE) {
    console.log(`即将打开 Chrome 登录页（原生持久化 profile：${PROFILE_DIR}）。`);
    console.log('请在浏览器中登录 51CTO（含验证码）。登录成功后本助手会自动关闭；');
    console.log('登录态由 Chrome 持久化保存，之后每日签到自动复用，无需再手动导出。\n');
  } else {
    console.log('即将打开 Chrome 登录页，请在浏览器中登录 51CTO（含验证码）。');
    console.log('登录成功后本助手会自动保存 cookies.json；若自动检测未触发，登录完成后按本窗口 Enter 也可手动保存。\n');
  }

  const { browser, context } = await launch();
  let saved = false;
  let closed = false;

  browser.on('disconnected', () => {
    closed = true;
    if (!saved) {
      console.log('\n浏览器已关闭且尚未保存。若未完成登录，请重新运行：node login.mjs');
      process.exit(1);
    }
  });

  const page = await context.newPage();

  async function doSave() {
    if (saved) return;
    saved = true;
    if (USE_PROFILE) {
      console.log('\n已确认登录态，profile 已持久化（无需导出 cookies.json）。');
      console.log('以后每日签到会自动复用，无需再手动导出。');
    } else {
      const cookies = await context.cookies();
      const n = saveCookies(cookies);
      if (!n) {
        console.log('当前未检测到 51CTO 登录态（cookie 数为 0）。请确认已在浏览器中登录，或稍候自动检测。');
        saved = false;
        return;
      }
      console.log(`\n已保存 ${n} 个 51CTO Cookie 到 cookies.json。`);
      console.log('以后每日签到会自动复用并在签到成功后续期，无需再手动导出。');
    }
    try { process.stdin.removeListener('data', onKey); } catch (_) {}
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
    process.exit(0);
  }

  const onKey = () => { if (!saved) doSave(); };
  process.stdin.resume();
  process.stdin.on('data', onKey);

  await page.goto(LOGIN_PAGE, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(e => {
    console.log('打开登录页失败：' + e.message);
  });

  // 轮询检测登录态（最多 10 分钟）
  const POLL = 2000;
  const MAX_WAIT = 10 * 60 * 1000;
  const start = Date.now();
  while (!saved && !closed && Date.now() - start < MAX_WAIT) {
    await page.waitForTimeout(POLL);
    if (closed) break;
    try {
      if (await looksLoggedIn(page)) {
        console.log('检测到登录态，正在保存…');
        await doSave();
        break;
      }
    } catch (_) { /* 忽略瞬时错误，继续轮询 */ }
  }

  if (!saved && !closed) {
    console.log('\n超时未自动检测到登录态。请确认已登录，或直接按 Enter 手动保存；也可关闭浏览器退出后重试。');
    await new Promise(() => {}); // 等待用户 Enter 或关闭窗口
  }
}

main().catch(e => { console.error(e); process.exit(1); });
