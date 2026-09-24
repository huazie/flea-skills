#!/usr/bin/env bash
# 稀土掘金每日签到 + 免费抽奖（单次 Bash 调用内串完，幂等 + 只抽免费绝不耗矿）
# 用法: bash juejin-daily-checkin/scripts/run.sh
# 覆盖变量: JB_NODE / JB_AGENT_BROWSER / JB_OUT_DIR
#
# ⚠️ 运行要求（2026-09-19 起，两个必须）
#   1) 必须「关闭沙箱」运行（dangerouslyDisableSandbox / 等价方式）：沙箱会杀掉 agent-browser 启动的
#      无头 Chrome 子进程 → eval 全部返回空、字段落空、误判漏抽。
#   2) 必须「后台化 open」（坑 9）：前台 `AB open` 在本环境会常驻阻塞不返回，且 Chrome 继承 stdout fd，
#      一旦接管管道（| head / timeout）就永久挂死。故 open 一律 `&` 后台化 + 重定向到文件，导航改用 eval。
#      结尾必须 taskkill chrome，否则下次 open 因 profile 锁失败。
set -u

NODE="${JB_NODE:-C:/Users/Administrator/.workbuddy/binaries/node/versions/22.22.2-3/node.exe}"
ABJS="${JB_AGENT_BROWSER:-C:/Users/Administrator/.workbuddy/binaries/node/workspace/node_modules/agent-browser/bin/agent-browser.js}"
D="${JB_SKILL_DIR:-${0%/*}}"
OUT="${JB_OUT_DIR:-/tmp/juejin_run}"
mkdir -p "$OUT"

AB() { "$NODE" "$ABJS" "$@"; }
PARSE() { "$NODE" "$D/parse.js"; }

# 释放 profile 锁（坑 9）。⚠️ 两个细节（2026-09-23 修）：
#   1) Git Bash(MSYS) 会把 `/F` 误当路径转成 `F:/` → taskkill 报「无效参数」且静默失败 → Chrome 残留、
#      下次 open 可能因 profile 锁失败。必须加 MSYS_NO_PATHCONV=1。
#   2) 只杀 agent-browser 自带的 Chrome（按 ExecutablePath 含 agent-browser 过滤），不要用
#      `taskkill /IM chrome.exe` 一把梭——那会连用户自己开着的 Chrome 一起杀掉。
kill_ab_chrome() {
  local pids p
  pids=$(MSYS_NO_PATHCONV=1 wmic process where "name='chrome.exe'" get ProcessId,ExecutablePath /format:csv 2>/dev/null \
    | grep -i "agent-browser" | awk -F, '{print $NF}' | tr -d '\r')
  for p in $pids; do MSYS_NO_PATHCONV=1 taskkill /F /PID "$p" >/dev/null 2>&1; done
}

# 1. 预热 cookie（建立 juejin.cn 源上下文，fetch 才能带 sessionid）
#    坑 9：后台化 + 重定向到文件，绝不要接管管道
AB open "https://juejin.cn/" >"$OUT/open.log" 2>&1 &
sleep 25

# 2. 签到（先签到！免费抽的 free_count 受签到门控：签到前恒为 0）
AB eval "$(<"$D/checkin.js")" 2>/dev/null | PARSE > "$OUT/out_checkin.json"
echo "=== CHECKIN ==="
cat "$OUT/out_checkin.json"

if grep -q "must login" "$OUT/out_checkin.json"; then
  echo "LOGIN_EXPIRED=1  -> 请按 SKILL.md 环境坑 #3/#5 启动有头 Chrome 重新登录"
  kill_ab_chrome
  exit 0
fi

# 3. 免费抽奖：用 eval 导航到抽奖页（避免第二次 open，规避坑 9）
AB eval "window.location.assign('https://juejin.cn/user/center/lottery')" >/dev/null 2>&1
sleep 5
AB eval "$(<"$D/lottery_config.js")" 2>/dev/null | PARSE > "$OUT/out_cfg.json"
echo "=== LOTTERY_CONFIG ==="
cat "$OUT/out_cfg.json"

FREE=$(grep -oE '"free_count":[[:space:]]*[0-9]+' "$OUT/out_cfg.json" | grep -o '[0-9]*' | head -1)
echo "free_count=${FREE:-0}"

if [ "${FREE:-0}" -gt 0 ]; then
  AB eval "$(<"$D/lottery_click.js")" 2>/dev/null | PARSE > "$OUT/out_click.json"
  echo "=== LOTTERY_CLICK ==="
  cat "$OUT/out_click.json"
  sleep 3
  AB eval "$(<"$D/lottery_config.js")" 2>/dev/null | PARSE > "$OUT/out_recheck.json"
  echo "=== LOTTERY_RECHECK ==="
  cat "$OUT/out_recheck.json"
  AB eval "$(<"$D/lottery_prize.js")" 2>/dev/null | PARSE > "$OUT/out_prize.json"
  echo "=== LOTTERY_PRIZE ==="
  cat "$OUT/out_prize.json"
else
  echo "=== LOTTERY_SKIP (free_count<=0, 今日免费已抽完) ==="
fi

# 4. 指标
AB eval "$(<"$D/metrics.js")" 2>/dev/null | PARSE > "$OUT/out_metrics.json"
echo "=== METRICS ==="
cat "$OUT/out_metrics.json"

# 5. 释放 profile 锁（坑 9），否则下次 open 失败
kill_ab_chrome
