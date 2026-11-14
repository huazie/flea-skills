#!/usr/bin/env bash
# 稀土掘金每日签到 + 免费抽奖（单次 Bash 调用内串完，幂等 + 只抽免费绝不耗矿）
# 用法: bash juejin-daily-checkin/scripts/run.sh
# 覆盖变量: JB_NODE / JB_AGENT_BROWSER / JB_OUT_DIR / JB_SKILL_DIR
#            NODE / ABJS 默认运行时按当前系统自动探测，不写死版本号；探测失败直接退出
#
# ⚠️ 运行要求（2026-09-19 起，两个必须）
#   1) 必须「关闭沙箱」运行（dangerouslyDisableSandbox / 等价方式）：沙箱会杀掉 agent-browser 启动的
#      无头 Chrome 子进程 → eval 全部返回空、字段落空、误判漏抽。
#   2) 必须「后台化 open」（坑 9）：前台 `AB open` 在本环境会常驻阻塞不返回，且 Chrome 继承 stdout fd，
#      一旦接管管道（| head / timeout）就永久挂死。故 open 一律 `&` 后台化 + 重定向到文件，导航改用 eval。
#      结尾用 `AB close --all` 释放 profile 锁（原 wmic + taskkill 已被本机安全策略拉黑，勿复用）。
set -u

# 按实际系统定位运行时，不写死版本号（Node 一升级，写死的路径立即失效）
# 优先级：环境变量 > PATH 中真实 node > WorkBuddy 版本目录（取最新）> npm 全局包目录
resolve_node() {
  if [ -n "${JB_NODE:-}" ]; then printf '%s' "$JB_NODE"; return; fi
  local c d base
  c=$(command -v node 2>/dev/null || true)
  if [ -n "$c" ]; then printf '%s' "$c"; return; fi
  base="${HOME}/.workbuddy/binaries/node/versions"
  for d in $(ls -1d "$base"/*/ 2>/dev/null | sort -Vr); do
    if [ -x "${d}node.exe" ]; then printf '%s' "${d}node.exe"; return; fi
    if [ -x "${d}bin/node" ]; then printf '%s' "${d}bin/node"; return; fi
  done
}

resolve_abjs() {
  if [ -n "${JB_AGENT_BROWSER:-}" ]; then printf '%s' "$JB_AGENT_BROWSER"; return; fi
  local n="$1" c d base root
  # ① 与 node 同目录的全局 node_modules（WorkBuddy 自带 node 的布局）
  c="${n%/*}/node_modules/agent-browser/bin/agent-browser.js"
  if [ -f "$c" ]; then printf '%s' "$c"; return; fi
  # ② 历史布局兜底
  c="${HOME}/.workbuddy/binaries/node/workspace/node_modules/agent-browser/bin/agent-browser.js"
  if [ -f "$c" ]; then printf '%s' "$c"; return; fi
  # ③ npm 全局 root（npm 在 Windows 下输出反斜杠，需转成 /）
  if command -v npm >/dev/null 2>&1; then
    root=$(npm root -g 2>/dev/null | tr '\\' '/' || true)
    c="${root}/agent-browser/bin/agent-browser.js"
    if [ -n "$root" ] && [ -f "$c" ]; then printf '%s' "$c"; return; fi
  fi
  # ④ 版本目录（取最新）下的 node_modules
  base="${HOME}/.workbuddy/binaries/node/versions"
  for d in $(ls -1d "$base"/*/ 2>/dev/null | sort -Vr); do
    c="${d}node_modules/agent-browser/bin/agent-browser.js"
    if [ -f "$c" ]; then printf '%s' "$c"; return; fi
  done
}

NODE=$(resolve_node)
ABJS=$(resolve_abjs "${NODE:-}")
if [ -z "${NODE:-}" ] || [ -z "${ABJS:-}" ] \
   || ! "$NODE" -v >/dev/null 2>&1 || [ ! -f "$ABJS" ]; then
  echo "[ERROR] 无法按当前系统定位 node / agent-browser.js，请设置 JB_NODE 与 JB_AGENT_BROWSER 后重试" >&2
  echo "        NODE=${NODE:-<empty>}  ABJS=${ABJS:-<empty>}" >&2
  exit 1
fi
D="${JB_SKILL_DIR:-${0%/*}}"
OUT="${JB_OUT_DIR:-/tmp/juejin_run}"
mkdir -p "$OUT"

AB() { "$NODE" "$ABJS" "$@"; }
PARSE() { "$NODE" "$D/parse.js"; }

# 自愈：清理 agent-browser 残留的 stale daemon 状态文件（坑 12 / 2026-11-14 实测根因）
# 现象：daemon 进程崩溃后 default.pid 仍指向已死 PID → 所有 AB 命令连幽灵 daemon →
#       open 报「exited early without DevToolsActivePort」→ eval 全空 → free_count 误读 0 漏抽。
# 处理：若 default.pid 记录的进程已死，删除 default.{pid,port,engine,version} 让 AB 重建健康 daemon。
# 仅删状态文件、绝不杀进程；不影响 profiles/<name> 登录态。
maybe_heal_daemon() {
  local base="${HOME}/.agent-browser"
  local pidf="${base}/default.pid"
  [ -f "$pidf" ] || return 0
  local pid
  pid=$(cat "$pidf" 2>/dev/null | tr -d '[:space:]')
  [ -n "$pid" ] || return 0
  # 用 node 检测进程存活（跨平台，避免依赖被封禁的 wmic / 不稳定的 tasklist）
  if "$NODE" -e "try{process.kill(${pid},0);process.exit(1)}catch(e){process.exit(0)}" >/dev/null 2>&1; then
    echo "[heal] default.pid=${pid} 已失效(stale)，清理 daemon 状态文件以重建" >&2
    rm -f "${base}/default.pid" "${base}/default.port" "${base}/default.engine" "${base}/default.version" 2>/dev/null || true
  else
    echo "[heal] default.pid=${pid} 进程仍存活，跳过清理" >&2
  fi
}
maybe_heal_daemon

# 释放 profile 锁（坑 9）。2026-11-06 修：
#   本机安全策略把 wmic.exe 列入程序黑名单，原「wmic 枚举 PID + taskkill /F /PID」实现会静默失败
#   并触发拦截；且 Git Bash(MSYS) 会把 /F 转成 F:/ 导致参数无效。
#   实测 daemon 退出会带走 Chrome（close --all 后无残留进程），故统一走 CLI 官方 close --all，
#   不再做进程枚举/强杀，也不会误杀用户自己开着的 Chrome。
close_ab_session() {
  AB close --all >/dev/null 2>&1 || true
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
  close_ab_session
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
close_ab_session
