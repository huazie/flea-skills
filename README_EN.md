# flea-skills

[![Stars](https://img.shields.io/github/stars/huazie/flea-skills?style=flat-square&logo=github)](https://github.com/huazie/flea-skills/stargazers)
[![License](https://img.shields.io/github/license/huazie/flea-skills?style=flat-square)](./LICENSE)

A collection of practical agent skills.

[中文说明 / Chinese Documentation](README.md)

## Skills

| Skill | Description | Path |
|-------|-------------|------|
| hexo-blog-starter | Hexo + GitHub/GitLab Pages personal blog scaffolding assistant | [hexo-blog-starter](./hexo-blog-starter) |
| release-version-analyzer | Analyze git commits to generate a structured release changelog | [release-version-analyzer](./release-version-analyzer) |
| juejin-daily-checkin | Juejin (juejin.cn) daily auto check-in + free lottery draw (free only, never spends ore) | [juejin-daily-checkin](./juejin-daily-checkin) |

## Quick Start

### hexo-blog-starter

One-click scaffold for a Hexo-based personal blog, deployable to GitHub Pages or GitLab Pages:

**Highlights:**
- Scaffold a Hexo blog from scratch and deploy to **GitHub Pages** or **GitLab Pages**
- Initialize a Hexo project and configure CI/CD auto-deploy (GitHub Actions / GitLab CI)
- Answer questions about Hexo setup, themes, and deployment

**Supported platforms:**
- GitHub Pages (default) — deployed via GitHub Actions
- GitLab Pages — deployed via GitLab CI/CD

**Trigger words:** build a blog, create personal blog, Hexo setup, GitHub Pages blog, GitLab Pages blog

### release-version-analyzer

Analyze git commits since a specified base version and generate a structured Markdown release changelog (categorized into new features / improvements / bug fixes, with Chinese & English output):

**Highlights:**
- Generate a changelog over the commit range from a base ref (commit / tag / branch) to HEAD
- Auto-extract PR numbers, classify changes, and count commits
- Output Markdown ready to use as npm / GitHub Release body content

**Trigger words:** generate release notes, changelog, version summary, release notes

### juejin-daily-checkin

Juejin (juejin.cn) daily auto check-in + free lucky draw. Based on a persistent Chrome login session, it invokes the Growth API inside the browser / clicks the real page button. Idempotent and free-draw-only.

**Highlights:**
- Daily auto check-in (idempotent — skips if already signed, never requests twice)
- Daily free lucky draw (clicks only the real "免费抽奖" button, never `fetch POST lottery/draw`, never spends ore)
- Query and report check-in status, consecutive / cumulative days, and current ore balance

**Prerequisites:**
- Juejin login session stored in a persistent Chrome profile (default `~/.agent-browser/profiles/juejin`); log in once in a headed Chrome first
- Depends on the agent-browser managed Chrome and Node.js

**Usage:**
```bash
# Optional path overrides: JB_NODE / JB_AGENT_BROWSER / JB_SKILL_DIR
bash juejin-daily-checkin/scripts/run.sh
```

**Trigger words:** juejin check-in, juejin sign-in, juejin lottery, juejin auto check-in

## Project Structure

```
flea-skills/
├── hexo-blog-starter/          # Hexo blog scaffolding skill
│   ├── SKILL.md                # Skill guide
│   └── references/             # Reference docs
│       ├── prerequisites.md           # Prerequisites install guide
│       ├── hexo-config.md             # Hexo config details
│       ├── github-actions-advanced.md # GitHub Actions advanced config
│       ├── gitlab-pages.md            # GitLab Pages deploy guide
│       ├── project-template.md        # Project templates & plugins
│       └── interactive-config.md      # Interactive config guide
├── release-version-analyzer/   # Release changelog skill
│   └── SKILL.md                # Skill guide
├── juejin-daily-checkin/        # Juejin check-in & lottery skill
│   ├── SKILL.md                # Skill guide (flow / pitfalls / retry strategy)
│   └── scripts/                # One-shot scripts
│       ├── run.sh                     # Chains open+eval in a single Bash call
│       ├── checkin.js                 # Check-in: get_today_status → check_in
│       ├── lottery_config.js          # Read free draw count free_count
│       ├── lottery_click.js           # Click free draw button (excludes 十连抽)
│       ├── metrics.js                 # Ore balance / consecutive & cumulative days
│       └── parse.js                   # eval double JSON serialization fallback
├── LICENSE                     # Open source license
├── README.md                   # Project README (Chinese)
└── README_EN.md                # Project README (English)
```

## Contributing

Contributions of new skills or improvements to existing ones are welcome!

1. Fork this repository
2. Create your skill directory `<skill-name>/`
3. Write the `SKILL.md` guide (optionally with `references/` or `scripts/`)
4. Update the skill list and project structure in the root `README.md`
5. Submit a Pull Request

## License

[MIT](./LICENSE)
