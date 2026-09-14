#!/usr/bin/env bash
# 稀土掘金每日签到 + 免费抽奖（单次 Bash 调用内串完，幂等 + 只抽免费绝不耗矿）
# 用法: bash juejin-daily-checkin/scripts/run.sh
# 覆盖变量: JB_NODE / JB_AGENT_BROWSER
set -u

NODE="${JB_NODE:-C:/Users/Administrator/.workbuddy/binaries/node/versions/22.22.2-3/node.exe}"
ABJS="${JB_AGENT_BROWSER:-C:/Users/Administrator/.workbuddy/binaries/node/workspace/node_modules/agent-browser/bin/agent-browser.js}"
D="${JB_SKILL_DIR:-${0%/*}}"
OUT="${JB_OUT_DIR:-/tmp/juejin_run}"
mkdir -p "$OUT"

AB() { "$NODE" "$ABJS" "$@"; }
PARSE() { "$NODE" "$D/parse.js"; }

# 1. 预热 cookie（建立 juejin.cn 源上下文，fetch 才能带 sessionid）
AB open "https://juejin.cn/" >/dev/null 2>&1

# 2. 签到
AB eval "$(cat "$D/checkin.js")" 2>/dev/null | PARSE > "$OUT/out_checkin.json"
echo "=== CHECKIN ==="
cat "$OUT/out_checkin.json"

if grep -q "must login" "$OUT/out_checkin.json"; then
  echo "LOGIN_EXPIRED=1  -> 请按 SKILL.md 环境坑 #3/#5 启动有头 Chrome 重新登录"
  exit 0
fi

# 3. 免费抽奖
AB open "https://juejin.cn/user/center/lottery" >/dev/null 2>&1
sleep 4
AB eval "$(cat "$D/lottery_config.js")" 2>/dev/null | PARSE > "$OUT/out_cfg.json"
echo "=== LOTTERY_CONFIG ==="
cat "$OUT/out_cfg.json"

FREE=$(grep -o '"free_count":[0-9]*' "$OUT/out_cfg.json" | grep -o '[0-9]*' | head -1)
echo "free_count=${FREE:-0}"

if [ "${FREE:-0}" -gt 0 ]; then
  AB eval "$(cat "$D/lottery_click.js")" 2>/dev/null | PARSE > "$OUT/out_click.json"
  echo "=== LOTTERY_CLICK ==="
  cat "$OUT/out_click.json"
  sleep 3
  AB eval "$(cat "$D/lottery_config.js")" 2>/dev/null | PARSE > "$OUT/out_recheck.json"
  echo "=== LOTTERY_RECHECK ==="
  cat "$OUT/out_recheck.json"
else
  echo "=== LOTTERY_SKIP (free_count<=0, 今日免费已抽完) ==="
fi

# 4. 指标
AB eval "$(cat "$D/metrics.js")" 2>/dev/null | PARSE > "$OUT/out_metrics.json"
echo "=== METRICS ==="
cat "$OUT/out_metrics.json"
