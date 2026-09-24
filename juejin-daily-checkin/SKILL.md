---
name: juejin-daily-checkin
description: |
  稀土掘金（juejin.cn）每日自动签到 + 免费幸运抽奖助手。用于：
  (1) 每日自动完成掘金成长签到（幂等，已签则跳过）
  (2) 抽取每日免费幸运抽奖（只抽免费的，绝不消耗矿石）
  (3) 查询并报告签到状态、连续/累计天数、矿石余额
  触发词："掘金签到"、"juejin签到"、"掘金抽奖"、"掘金自动签到"、"稀土掘金签到"、"掘金成长"
---

# 稀土掘金每日签到 + 免费抽奖

基于持久化 Chrome 登录态，通过 agent-browser 在浏览器内调用掘金 Growth API / 点击真实页面按钮，完成每日签到与免费抽奖。已实测打通（2026-09-14），核心原则是**幂等 + 只抽免费、绝不耗矿**。

## 前置要求

| 项 | 说明 |
|----|------|
| 登录态 | 掘金登录 cookie 存于持久化 Chrome profile（本环境默认 `C:\Users\Administrator\.agent-browser\profiles\juejin`，由 `~/.agent-browser/config.json` 指向，无需额外 `--profile`）。首次需手动在有头 Chrome 中登录一次，登录态写入该 profile |
| 浏览器 | agent-browser 管理的 Chrome（默认 `~/.agent-browser/browsers/chrome-*/chrome.exe`） |
| 运行约束 | **单次 Bash 调用内必须串完 open + eval**（见"环境坑"） |

**首次配置**：若 profile 内无有效登录态，按"环境坑 #3/#5"启动有头 Chrome 登录一次（登录态有效期约 1 年）。

## 核心流程

### 步骤 1：签到
1. 浏览器打开 `https://juejin.cn/`（预热 cookie，建立 juejin.cn 源上下文，fetch 才能带 sessionid）
2. 浏览器内 `eval` 调 `GET https://api.juejin.cn/growth_api/v1/get_today_status`（fetch 加 `credentials:'include'`）
   - `data:true` → 今日已签到，**跳过** check_in（幂等，绝不重复请求）
   - `data:false` → 浏览器内 `eval` 调 `POST https://api.juejin.cn/growth_api/v1/check_in`（body `{}`，**只调一次**）
     - 成功：`err_no:0`；已签：`err_no:8000`
     - 若 fetch POST 因 **CORS 预检失败**（返回非 0 err_no 或网络错误），**改用点击页面真实"签到"按钮**（位置见"环境坑 #7 备注"），不要循环重试 fetch

### 步骤 2：免费抽奖（核心原则：只抽免费，绝不消耗矿石）
1. 浏览器打开 `https://juejin.cn/user/center/lottery`（本环境推荐用 `eval "window.location.assign(...)"` 在已开的页面上导航，避免第二次前台 `open` 触发坑 9 挂死）
2. `sleep` 约 4 秒，等 SPA 渲染出转盘按钮
3. ⚠️ **免费抽受签到门控**：`free_count` 在 `check_in` 成功之前**恒为 0**（页面显示"去签到免费抽1次"）。**务必先完成步骤 1 的签到，再读本接口的 `free_count`**；否则会误判"今日免费已抽完"而漏抽。实测：签到前 `free_count=0` → 签到后变 `1` → 点击免费按钮后 `1→0`。
   - 浏览器内 `eval` 读 `GET https://api.juejin.cn/growth_api/v1/lottery_config/get` → `data.free_count`
   - `free_count <= 0` → 今日免费已抽完或尚未签到，**跳过**（不点击、不耗矿）
   - `free_count > 0` → 浏览器内 `eval` 定位并点击**免费抽奖**按钮（务必排除"十连抽"）：
     ```js
     const items=[...document.querySelectorAll('.turntable-item.lottery')];
     const free=items.find(e=>/免费/.test(e.textContent)&&!/十连抽/.test(e.textContent));
     free.click(); // 免费按钮；"十连抽"会消耗 2000 矿石，严禁点错
     ```
   - `sleep` 约 3 秒后，重新 `GET lottery_config/get` 复核 `free_count` 应 `1→0`；`get_cur_point` 矿石应**增加**（中奖）或**不变**（未中），**绝不应减少**（免费抽不耗矿）
   - 抽奖结果（奖品名）用 `scripts/lottery_prize.js` 抓取弹窗文案（选择器 `.lottery-modal/.lottery-result/.result-modal/.dialog-content/.modal-body`，2026-09-17 实测命中「恭喜抽中90矿石 本次抽中的矿石已累加到你的当前矿石数中 收下奖励」）。若为空表示未弹窗，则用 `get_cur_point` 矿石增量（免费抽通常 +N 矿石）兜底说明奖品。
4. **严禁**手工 `fetch POST lottery/draw`：该发球接口需浏览器签名/指纹，Node 直连恒定返回空 body，CORS 预检也被拦，已实测走不通

### 步骤 3：结果查询与报告
- 矿石余额：`GET https://api.juejin.cn/growth_api/v1/get_cur_point` → `data` 字段（注意是 `get_cur_point`，非 `get_current_point`，后者 404）
- 连续/累计天数：`GET https://api.juejin.cn/growth_api/v1/get_counts` → `data.cont_count` / `data.sum_count`
- 报告内容：签到状态、抽奖结果（奖品名）、当前矿石余额、连续/累计签到天数
- 若签到与抽奖均已完成（今日已签 + 免费已抽），报告从简即可

## 环境坑（重要，勿踩）

1. **agent-browser 守护进程在单次工具调用结束后被杀**——必须将所有 `open` + `eval` 串进**同一次 Bash 调用**（用 `;` 串联或封装成脚本），不能分多次调用。
2. **不要用 PATH 包装器调用 agent-browser**（`.bin` wrapper 依赖 sed/dirname 等 Unix 工具，本环境 shim 残缺会崩）；直接 `node <agent-browser.js 绝对路径>` 调用。
3. **沙箱会杀掉工具调用启动的 GUI 子进程**（Chrome 一闪而过）。需人工登录/有头窗口时，必须用 `run_in_background + dangerouslyDisableSandbox` 直接启动 chrome.exe：
   `"<chrome路径>" --user-data-dir="<profile路径>" https://juejin.cn/`
4. 无头下 `document.cookie` 读取被 SecurityError 拦截 → 用 `eval fetch()` 或 `--json cookies get` 代替。
5. sessionid 失效（`get_today_status` 返回 403 must login）时：按坑 #3 启动有头 Chrome 让用户重新登录，登录态写回同一 profile，无需重试。
6. 掘金 SPA 偶发渲染空白 → 判断登录态优先用 fetch 接口而非 DOM。
7. **agent-browser `eval` 本质是把脚本当「顶层脚本」执行**，两个必踩坑（2026-09-17 实测）：
   - ⚠️ **顶层 `return` 非法**：若 eval 字符串里直接写 `return {...}`（不在函数/IIFE 内），会报 `SyntaxError: Illegal return statement` 且**整段不执行**（点击/抽奖不会触发）。**必须用 IIFE 包裹 return**：`(async()=>{ ... return x })()` 或 `(()=>{ ... return x })()`。本技能 `scripts/*.js` 已全部用 IIFE 包裹，可直接 `cat` 进 `eval`；但若在自动化里临时手写内联 eval，务必遵守此规则。
   - **返回值双重 JSON 序列化（真陷阱，2026-09-18 实测确认）**：agent-browser 把 `eval` 返回的字符串再 `JSON.stringify` 一次落盘；经 bash `$(...)` 捕获后变成**双重编码的单行字符串**——内层引号被转义成 `\"`，例如 `\"free_count\":1`（注意内层是 `\"` 而非 `"`，冒号后通常无空格，**不是**"美化带空格"格式）。因此 ① 用字面引号正则 `grep '"free_count"'` 会**全部落空**（实际是 `\"free_count\"`）；② 单次 `JSON.parse` 只能解开外层、得到的是字符串而非对象，`o.data` 为 undefined。后果是 `free_count` 被误读为 0 → **漏点免费按钮、白跑一天**。✅ 正确解析：用本技能 `scripts/parse.js`（它做 `JSON.parse(JSON.parse(s))` 双解析，输出紧凑标准 JSON 供 grep），或内联 `node -e "let s=require('fs').readFileSync(0,'utf8').trim();let v=JSON.parse(s);let o=typeof v==='string'?JSON.parse(v):v;"`。**严禁对原始 eval 输出直接字面引号 grep。**
   - 备注：签到真实按钮位置尚未实测固化（通常在成长页/首页右侧），如遇 `check_in` fetch 失败，应先人工确认按钮选择器再补充到本 skill，不要盲点 DOM。
8. **免费抽必须先签到才能解锁**：`lottery_config/get` 的 `free_count` 在 `check_in` 之前恒为 0，不是"今日已抽"而是"尚未签到未解锁"。顺序铁律：**步骤 1 签到（today_status=false 时真签到）→ 步骤 2 再读 free_count**。若某补签任务在 `today_status=true`（已签）时跑抽奖，`free_count` 才真实反映剩余免费次数（1=未抽 / 0=已抽）。2026-09-16 验证：10:00 主任务当日未签，签到前 free_count=0、签到后=1，点击免费按钮中奖 +70 矿石、free_count→0，全程未耗矿。

9. **`open` 必须后台化，否则整条命令挂死（2026-09-19 实测阻断）**：`agent-browser open <url>` 在本环境前台运行**不自行返回**（常驻等浏览器会话），且其启动的 Chrome 子进程继承 stdout fd。一旦把 `open` 接到管道（`| head`/`| tail`）或用 `timeout` 包裹，管道写端被 Chrome 长期持有，永远等不到 EOF → 命令卡死数分钟（Chrome 其实已起来、profile 已被改写）。✅ 修复：`"$NODE" "$ABJS" open "<url>" >"$OUT/open.log" 2>&1 &` + `sleep 25` 等就绪；后续页面导航一律改用 `eval "window.location.assign('<url>')"` + `sleep`；**结尾必须杀掉 agent-browser 的 Chrome** 释放 profile 锁（否则下次 open 因锁失败）。`scripts/run.sh` 已按此实现。
   - ⚠️ **杀 Chrome 的两个坑（2026-09-23 实测修正）**：① Git Bash(MSYS) 会把 `/F` 误当路径转成 `F:/`，`taskkill /F /IM chrome.exe` 报「无效参数/选项 - 'F:/'」并**静默失败**（实测残留 12 个 agent-browser Chrome 进程）；必须加 `MSYS_NO_PATHCONV=1`。② 不要 `taskkill /IM chrome.exe` 一把梭——会连用户自己开着的 Chrome 一起杀掉。正确做法是按 `ExecutablePath` 含 `agent-browser` 过滤 PID 再逐个 `taskkill /F /PID`（`scripts/run.sh` 的 `kill_ab_chrome()` 已封装；杀父进程即可带走全部子进程）。
10. **必须关闭沙箱运行**：沙箱会杀掉 agent-browser 启动的无头 Chrome 子进程 → 所有 `eval` 返回空、字段全部落空、误判 `free_count=0` 而漏抽。执行时需 `dangerouslyDisableSandbox`（或等价方式）。
11. **抽 helper 传路径参数时用 `argv[1]` 而非 `argv[2]`**：`node -e "<script>" "$PARAM"` 中 `node -e` 的内联脚本不占 `argv[1]` 槽位，用户参数从 `process.argv[1]` 起。误用 `argv[2]` 会让参数恒为 undefined，helper 返回完整对象而非目标字段，导致幂等判断（如 `[ "$SIGNED" = "true" ]`）永不成立、重复 check_in。内存里 `echo "$X" | node -e "..."`（读 stdin、不带路径参数）的写法天然规避此坑，优先采用。

## 多时间点补签策略

签到任务建议配置为每日多个时间点（如 10:00 / 22:00），每个任务**幂等**：先查 `get_today_status`，已签即跳过，绝不重复请求，避免重复签到。本环境因调度校验器不支持单任务多 BYHOUR（多值 BYHOUR 会报错），只能拆为多个同提示词每日任务共享同一记忆文件——当前实际为 **2 个**：10:00 主任务 `ebf9877e`、22:00 兜底 `6cfeb884`。

⚠️ **已知现象（2026-09-22/23）**：10:00 主任务连续两日无执行记录、当日 22:00 查询 `today_status` 均为 `false`，由 22:00 兜底补做成功；同期 22:00 任务一直正常。怀疑 10:00 时段宿主机未开机/未运行导致调度未触发（非登录态问题）。若要更稳，考虑把主任务时间挪到晚间。

## 附：一键脚本

`scripts/run.sh` 已封装上述全流程（含 `checkin.js` / `lottery_config.js` / `lottery_click.js` / `lottery_prize.js` / `metrics.js` / `parse.js`），在单次 Bash 调用内串完（后台化 open + eval 导航 + 结尾杀 Chrome，已规避坑 9）。使用前按需修改脚本顶部 `NODE` / `ABJS` 变量（默认指向本环境路径；其他机器请改为自己的 node 与 agent-browser 路径，或设置环境变量 `JB_NODE` / `JB_AGENT_BROWSER` 覆盖）。

**必须关闭沙箱运行**（坑 10）：沙箱会杀掉无头 Chrome 子进程导致 eval 全空。

```bash
bash juejin-daily-checkin/scripts/run.sh
```

输出示例（今日已完成时，从简报告）：
```
=== CHECKIN ===
{"checkin":"already","err_no":0}
=== LOTTERY_CONFIG ===
{"data":{"free_count":0,"lottery":[...]},"err_no":0}
=== LOTTERY_SKIP (free_count<=0) ===
=== METRICS ===
{"cont":880,"point":776275,"sum":906}
```

成功抽奖时示例：
```
=== LOTTERY_CLICK ===
{"clicked":true,"text":"免费抽奖次数：1次"}
=== LOTTERY_RECHECK ===
{"data":{"free_count":0,...},"err_no":0}
=== LOTTERY_PRIZE ===
{"prize":"恭喜抽中90矿石 本次抽中的矿石已累加到你的当前矿石数中 收下奖励"}
=== METRICS ===
{"cont":880,"point":776275,"sum":906}
```

## 参考链接

- 掘金幸运抽奖页：https://juejin.cn/user/center/lottery
- 掘金 API 域名：https://api.juejin.cn
- agent-browser 技能：本机 `~/.workbuddy/skills/agent-browser`
