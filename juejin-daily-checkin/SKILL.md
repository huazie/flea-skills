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
1. 浏览器打开 `https://juejin.cn/user/center/lottery`
2. `sleep` 约 4 秒，等 SPA 渲染出转盘按钮
3. 浏览器内 `eval` 读 `GET https://api.juejin.cn/growth_api/v1/lottery_config/get` → `data.free_count`
   - `free_count <= 0` → 今日免费已抽完，**跳过**（不点击、不耗矿）
   - `free_count > 0` → 浏览器内 `eval` 定位并点击**免费抽奖**按钮（务必排除"十连抽"）：
     ```js
     const items=[...document.querySelectorAll('.turntable-item.lottery')];
     const free=items.find(e=>/免费/.test(e.textContent)&&!/十连抽/.test(e.textContent));
     free.click(); // 免费按钮；"十连抽"会消耗 2000 矿石，严禁点错
     ```
   - `sleep` 约 3 秒后，重新 `GET lottery_config/get` 复核 `free_count` 应 `1→0`；`get_cur_point` 矿石应**增加**（中奖）或**不变**（未中），**绝不应减少**（免费抽不耗矿）
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
7. **agent-browser `eval` 返回值会被再做一次 JSON 序列化**：eval 内 `return x`（对象），落盘即标准 JSON；解析时做 `JSON.parse(JSON.parse(s))` 兜底（外层是字符串则再解一层）。
   - 备注：签到真实按钮位置尚未实测固化（通常在成长页/首页右侧），如遇 `check_in` fetch 失败，应先人工确认按钮选择器再补充到本 skill，不要盲点 DOM。

## 多时间点补签策略

签到任务建议配置为每日多个时间点（如 10:00 / 19:00 / 22:00），每个任务**幂等**：先查 `get_today_status`，已签即跳过，绝不重复请求，避免重复签到。本环境因调度校验器不支持单任务多 BYHOUR，已拆为 3 个同提示词每日任务共享同一记忆文件。

## 附：一键脚本

`scripts/run.sh` 已封装上述全流程（含 `checkin.js` / `lottery_config.js` / `lottery_click.js` / `metrics.js` / `parse.js`），在单次 Bash 调用内串完。使用前按需修改脚本顶部 `NODE` / `ABJS` 变量（默认指向本环境路径；其他机器请改为自己的 node 与 agent-browser 路径，或设置环境变量 `JB_NODE` / `JB_AGENT_BROWSER` 覆盖）。

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
{"clicked":true,"text":"免费抽奖"}
=== LOTTERY_RECHECK ===
{"data":{"free_count":0,...},"err_no":0}
=== METRICS ===
{"cont":880,"point":776275,"sum":906}
```

## 参考链接

- 掘金幸运抽奖页：https://juejin.cn/user/center/lottery
- 掘金 API 域名：https://api.juejin.cn
- agent-browser 技能：本机 `~/.workbuddy/skills/agent-browser`
