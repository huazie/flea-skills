# flea-skills

[![Stars](https://img.shields.io/github/stars/huazie/flea-skills?style=flat-square&logo=github)](https://github.com/huazie/flea-skills/stargazers)
[![License](https://img.shields.io/github/license/huazie/flea-skills?style=flat-square)](./LICENSE)

实用的技能集合仓库

[English Documentation / 英文说明](README_EN.md)

## 技能列表

| 技能 | 描述 | 路径 |
|------|------|------|
| hexo-blog-starter | Hexo + GitHub/GitLab Pages 个人博客搭建助手 | [hexo-blog-starter](./hexo-blog-starter) |
| release-version-analyzer | 分析 git commits 生成结构化发布日志（changelog） | [release-version-analyzer](./release-version-analyzer) |
| juejin-daily-checkin | 稀土掘金每日自动签到 + 免费幸运抽奖（只抽免费、绝不耗矿） | [juejin-daily-checkin](./juejin-daily-checkin) |

## 快速开始

### hexo-blog-starter

一键搭建基于 Hexo 的个人博客，支持部署到 GitHub Pages 或 GitLab Pages：

**核心功能：**
- 从零搭建 Hexo 博客并部署到 **GitHub Pages** 或 **GitLab Pages**
- 初始化 Hexo 项目、配置 CI/CD 自动部署（GitHub Actions / GitLab CI）
- 解答 Hexo 建站、主题、部署相关问题

**支持平台：**
- GitHub Pages（默认）- 使用 GitHub Actions 自动部署
- GitLab Pages - 使用 GitLab CI/CD 自动部署

**触发词：** 搭建博客、创建个人博客、Hexo建站、GitHub Pages博客、GitLab Pages博客

### release-version-analyzer

分析指定基准版本以来的 git commits，生成结构化 Markdown 发布日志（按新增功能 / 优化 / 修复分类，支持中英文）：

**核心功能：**
- 基于 base ref（commit / tag / branch）到 HEAD 的提交范围生成 changelog
- 自动提取 PR 编号、分类变更、统计提交数
- 输出可直接用作 npm / GitHub Release 正文的 Markdown

**触发词：** 生成发布说明、changelog、版本总结、release notes

### juejin-daily-checkin

稀土掘金（juejin.cn）每日自动签到 + 免费幸运抽奖，基于持久化 Chrome 登录态，在浏览器内调用 Growth API / 点击真实页面按钮，幂等且只抽免费。

**核心功能：**
- 每日自动签到（幂等，已签则跳过，绝不重复请求）
- 抽取每日免费幸运抽奖（只点真实「免费抽奖」按钮，严禁 `fetch POST lottery/draw`，绝不消耗矿石）
- 查询并报告签到状态、连续/累计天数、当前矿石余额

**前置要求：**
- 掘金登录态存于持久化 Chrome profile（默认 `~/.agent-browser/profiles/juejin`），首次需在有头 Chrome 中登录一次
- 依赖 agent-browser 管理的 Chrome 与 Node.js

**用法：**
```bash
# 可选覆盖路径：JB_NODE / JB_AGENT_BROWSER / JB_SKILL_DIR
bash juejin-daily-checkin/scripts/run.sh
```

**触发词：** 掘金签到、juejin签到、掘金抽奖、掘金自动签到、稀土掘金签到

## 项目结构

```
flea-skills/
├── hexo-blog-starter/          # Hexo 博客搭建技能
│   ├── SKILL.md                # 技能指南
│   └── references/             # 参考资料
│       ├── prerequisites.md           # 前置环境安装指南
│       ├── github-auth.md             # GitHub 账号注册与认证
│       ├── troubleshooting.md         # 常见报错速查表
│       ├── hexo-config.md             # Hexo 配置详解
│       ├── github-actions-advanced.md # GitHub Actions 进阶配置
│       ├── gitlab-pages.md            # GitLab Pages 部署指南
│       └── project-template.md        # 项目模板与插件
├── release-version-analyzer/   # 发布日志生成技能
│   └── SKILL.md                # 技能指南
├── juejin-daily-checkin/        # 掘金签到抽奖技能
│   ├── SKILL.md                # 技能指南（流程 / 环境坑 / 补签策略）
│   └── scripts/                # 一键脚本
│       ├── run.sh                     # 单次 Bash 调用内串完 open+eval
│       ├── checkin.js                 # 签到：get_today_status → check_in
│       ├── lottery_config.js          # 读取免费抽奖次数 free_count
│       ├── lottery_click.js           # 点击免费抽奖按钮（排除十连抽）
│       ├── metrics.js                 # 矿石余额 / 连续累计天数
│       └── parse.js                   # eval 双重 JSON 序列化兜底
├── LICENSE                     # 开源协议
├── README.md                   # 项目说明（中文）
└── README_EN.md                # 项目说明（英文）
```

## 贡献指南

欢迎提交新的技能或改进现有技能！

1. Fork 本仓库
2. 创建你的技能目录 `<skill-name>/`
3. 编写 `SKILL.md` 指南文档（建议附带 `references/` 或 `scripts/`）
4. 更新根目录 `README.md` 技能列表与项目结构
5. 提交 Pull Request

## License

[MIT](./LICENSE)
