---
name: 51cto-checkin
description: |
  51CTO（blog.51cto.com）每日自动签到助手。基于 Playwright **有头系统 Chrome + 原生持久化 profile**
  （Chrome 自身保管登录态，与「正常 Chrome 一直登录」同机制，无需导出/续期 cookies.json），
  打开专用签到页完成签到，由页面自身 JS 完成反爬动态签名，脚本幂等（已签跳过）。
  触发词："51CTO 签到"、"51cto 签到"、"51CTO 自动签到"、"51cto checkin"、"51cto 每日签到"。
version: "2.0.0"
license: MIT
---

# 51CTO 每日自动签到

用 Playwright **有头系统 Chrome** 复用**专属持久化 profile**（`<技能目录>/chrome-profile`）携带登录态，
打开专用签到页 `https://blog.51cto.com/user/sign`，读取权威状态（已签到 / 待签到按钮）并完成签到；
由页面自身 JS 完成反爬签名。脚本**幂等**：今日已签到会直接跳过。

> ⚠️ **反爬要点**：51CTO 前置 Tencent EdgeOne WAF 会拦截**无头浏览器**（整页返回「请求已被拦截」，
> 导致 `no_sign_button` / `COOKIE_EXPIRED` 误报）。因此脚本**默认使用有头系统 Chrome**（`headless:false`）；
> 无头模式（`HEADLESS=1`）在当前风控下极易被拦截，不建议。系统未装 Chrome 时会回退自带 Chromium。

> 为什么不直接调接口：51CTO 签到接口带动态签名 + 设备指纹 + 行为时序检测，纯 `curl`/`requests` 极易被风控。
> 真实浏览器方案最稳；且本方案不再依赖「导出 cookies.json」这一易过期环节。

## 登录态策略（v2：原生 profile 模式）

**核心思路**：与其把登录态「导出成 cookies.json 再读取」（这份导出会过期，导致反复 `COOKIE_EXPIRED`），
不如让签到脚本直接复用**系统 Chrome 的持久化登录态**——和「你正常用 Chrome 一直登录着 51CTO」是同一机制。

- 脚本启动系统 Chrome 时指定一个**专属的持久化 profile 目录**（`chrome-profile/`），Chrome 用自身持久化 +
  App-Bound 加密把 51CTO 登录态存在该目录里。
- 只要始终复用**同一 profile 路径 + 真实 Chrome**，登录态就长期有效，**无需反复导出 / 续期**。
- 该 profile 独立于你日常使用的 Default profile，**互不干扰**，也不会和正在运行的 Chrome 抢锁（SingletonLock）。
- 首次只需在登录助手里登录一次；之后每日签到直接复用。
- 兼容回退：设置 `USE_COOKIES=1` 可退回旧的 cookies.json 模式（需先 `login.mjs` 导出）。

## 安装为 WorkBuddy 技能

本目录本身即一个技能。放到技能目录即可被 agent 直接调用（无需在命令里写死绝对路径）：

- **用户级（推荐）**：复制到 `~/.workbuddy/skills/51cto-checkin`
- **项目级**：复制到 `<工作区>/.workbuddy/skills/51cto-checkin`

安装后脚本基于自身位置（`__dirname`）自动定位 `chrome-profile/` 与 `logs/`，**与 cwd 无关**；
所有自动化任务直接"调用 51cto-checkin 技能"即可，不再依赖任何机器专属路径。

## 安装依赖（首次）

本技能不随附 `node_modules`，首次使用前需在**技能目录**安装 Playwright 与 Chromium（profile 模式也用系统 Chrome，
但 Playwright 库本身仍需安装）：

```powershell
cd <技能目录>
npm install playwright
node node_modules/playwright/cli.js install chromium
```

> 系统未装 Chrome 时，脚本会回退到 Playwright 自带 Chromium（仍建议装系统 Chrome 以获得最稳的 WAF 通过率）。

## 前置条件（一次性）

- **首次只需运行一次登录助手**：`node scripts/login.mjs`，在打开的浏览器里登录 51CTO（含验证码），
  登录态会被 Chrome 持久化保存到 `chrome-profile/`。**之后无需再手动导出**——每日签到自动复用。
- 该 profile 的登录态会像正常 Chrome 一样长期保留（数周~数月，取决于 51CTO 服务端），过期后重新运行一次
  `node scripts/login.mjs` 即可（届时只是刷新一下该 profile 的登录态）。

## 文件结构

```
51cto-checkin/
├── SKILL.md
├── package.json
├── .gitignore            # 忽略 node_modules / logs / cookies.json / chrome-profile（运行时产物，不入库）
├── cookies.json          # 仅旧模式（USE_COOKIES=1）使用；运行时生成，勿提交/分享
├── chrome-profile/       # 原生 profile 模式专用：Chrome 持久化登录态（含敏感会话，已被 .gitignore 忽略）
├── scripts/
│   ├── checkin.mjs       # 签到主脚本（有头系统 Chrome + 持久化 profile，幂等）
│   └── login.mjs         # 一次性登录助手（有头，在 profile 中登录一次）
├── references/
│   └── login-setup.md    # 登录助手使用说明
└── logs/                 # 运行后自动生成，仅含签到结果（已被 .gitignore 忽略）
```

## 首次登录（只做一次）

```powershell
cd <技能目录>
# 用 node 运行登录助手（请在有图形界面的终端运行，会弹出 Chrome 窗口）
node scripts/login.mjs
```

- 弹出的 Chrome 中登录 51CTO；登录成功后助手**自动检测并关闭窗口**，登录态已存入 `chrome-profile/`。
- 若自动检测未触发，登录完成后按终端窗口的 **Enter** 也可手动确认。
- 之后每日签到自动复用该 profile，登录态过期前无需再登录。
- 若某天脚本报 `COOKIE_EXPIRED`，重新运行一次 `node scripts/login.mjs` 刷新该 profile 的登录态即可。

## 手动运行（验证用）

```powershell
cd <技能目录>
# 用 node 运行（脚本基于自身位置定位，cwd 任意也可）
node scripts/checkin.mjs
# 调试模式（保存页面快照/HTML）
$env:DEBUG='1'; node scripts/checkin.mjs
```

环境变量：
- `SIGN_URL`：签到页（默认 `https://blog.51cto.com/user/sign`，**权威状态源**）。
- `CHECKIN_URL`：首页入口（默认 `https://blog.51cto.com/`），**仅作 WAF 拦截时的回退**。
- `DEBUG=1`：失败时保存 `logs/debug-*.png` 与 `debug-*.html` 便于排查。
- `HEADLESS=1`：强制无头模式（**不推荐，会被 EdgeOne WAF 拦截**；默认有头）。
- `BROWSER_CHANNEL`：浏览器通道（默认 `chrome`，即系统 Chrome）；设为空字符串则强制回退 Playwright 自带 Chromium。
- `PROFILE_DIR`：持久化 profile 目录（默认 `<技能目录>/chrome-profile`）。
- `USE_COOKIES=1`：**回退到旧版 cookies.json 模式**（默认关闭，走原生 profile 模式）。

## 退出码与结果行

脚本结尾会打印一行 `[RESULT] <KIND>`，便于自动化解析：

| 退出码 | RESULT KIND | 含义 | 处理 |
|---|---|---|---|
| 0 | `SUCCESS` / `ALREADY` | 签到成功 / 今日已签到（幂等跳过） | 无需处理 |
| 2 | `MISSING_COOKIES` | （仅旧模式）缺少或解析失败 `cookies.json` | 运行 `node scripts/login.mjs`（USE_COOKIES=1）生成登录态 |
| 3 | `COOKIE_EXPIRED` | 登录态失效，被重定向到登录页 | 重新运行 `node scripts/login.mjs` 刷新该 profile |
| 1 | `FAILED \| waf_blocked` | 被 EdgeOne WAF 拦截（页面「请求已被拦截」） | 确认用的是有头模式；稍后重试或更换网络 |
| 1 | `FAILED \| profile_locked` | 持久化 profile 被占用（上次 Chrome 未正常关闭） | 关闭残留 Chrome 进程后重试 |
| 1 | `FAILED \| no_sign_button` | 未找到签到按钮 | 开 `DEBUG=1` 看 `logs/debug-nobtn-*.html` 快照 |
| 1 | `FAILED \| no_success_signal` | 点击后无成功标识 | 开 `DEBUG=1` 看 `logs/debug-result-*.html` 快照 |

## 每日自动化（在 WorkBuddy 内）

共 **多个** recurring 自动化：3 个签到 + 1 个登录助手巡检。签到脚本幂等，电脑在任一时间点开机即可补签。
所有任务均"调用 51cto-checkin 技能"执行，**不再写死任何机器路径**。

（签到 / 登录助手巡检的 prompt 逻辑与正文一致："调用已安装技能 + 读取 `[RESULT]` 行 + `COOKIE_EXPIRED` 时自动拉登录助手"，此处不再赘述。）

## 排错

- **`COOKIE_EXPIRED`**：该 profile 的登录态过期，运行 `node scripts/login.mjs` 刷新一次即可。
- **`FAILED | waf_blocked` / 快照标题是「请求已被拦截」**：被 EdgeOne WAF 拦截。根因通常是用了**无头**浏览器——
  实测同机同 IP：无头（含 `--disable-blink-features=AutomationControlled`）→ 被拦；**有头系统 Chrome → 正常**。
  解决：确认脚本为默认有头模式（不要设 `HEADLESS=1`）；若仍被拦（换网络/IP 风控），稍后重试。此场景不是「页面改版」，无需改选择器。
- **`FAILED | profile_locked`**：`chrome-profile/` 被上次未正常关闭的 Chrome 占用。关闭残留 Chrome 进程，
  或删除该目录下的 `SingletonLock` 后重试。
- **`FAILED | no_sign_button`**：先看快照 `logs/debug-nobtn-*.html` 的标题——若是「请求已被拦截」→ 属 WAF（见上）；
  否则才是签到页结构可能已变，把该 HTML 反馈给我据以修正选择器。
  另注：`user/sign` 页**已签到当天本就没有签到按钮**，此时应命中 `ALREADY` 而非 `no_sign_button`。
- **登录助手弹不出浏览器窗口**：确保在有图形界面的终端运行；受控/无头服务器环境无法显示窗口，需在本机桌面执行。
- **启动报找不到 chromium**：运行一次 `node node_modules/playwright/cli.js install chromium`。
- **找不到 playwright**：在技能目录执行 `npm install playwright`。

## 安全说明

- `chrome-profile/` 含 51CTO 登录态（等同账号密码），仅本机使用，**不落日志、不提交、不分享**（已被 .gitignore 忽略）。
- `cookies.json`（仅旧模式）同样敏感，已被忽略。
- `logs/` 只记录签到结果与 DEBUG 快照，不含会话原文。
- 仅用于本人账号每日签到，勿用于批量/他人账号或任何违反 51CTO 用户协议的行为。
