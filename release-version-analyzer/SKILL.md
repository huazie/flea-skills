---
name: release-version-analyzer
description: Analyze git commits since a specified base version and generate a structured release changelog in Markdown format. This skill should be used when the user wants to produce release notes, changelogs, or version summaries from git commit history for any software project.
---

# Release Version Analyzer

## Overview

Analyze a range of git commits between a base reference (commit hash, tag, or branch) and HEAD, then generate a standardized Markdown release changelog with categorized change descriptions.

## When to Use This Skill

- User requests release notes or changelog generation
- User asks to summarize commits since a specific version/tag/commit
- User needs to prepare npm/GitHub Release body content
- User wants to categorize changes (new features, improvements, bug fixes)

## Workflow

### Step 1: Gather Commit List

Execute the following to retrieve all commits since the base version:

```bash
git log <base_ref>..HEAD --oneline
```

**Parameters:**
- `<base_ref>`: The user-provided base commit hash, tag name (e.g., `v2.3.8`), or branch name

If the revision range is invalid:
- Check if the ref exists locally via `git log --oneline -n 1 <base_ref>`
- If not found, try `git fetch` to pull remote refs
- If still not found, ask the user to provide an alternative base ref or use the latest N commits instead

### Step 2: Inspect Each Commit

For every commit in the list:

```bash
# View changed files summary
git show <commit_hash> --stat

# View detailed diff when needed
git diff <commit_hash>^..<commit_hash>
# OR for merge commits
git show <commit_hash>
```

Collect the following information per commit:
- **Commit message**: Original message (primary source of semantic meaning)
- **PR number**: Extract PR number from merge commit message (e.g., "Merge pull request #136" → `#136`)
- **Changed files**: Which files were added/modified/deleted
- **Diff details**: Key code changes that clarify intent

**PR number extraction rule:** When a commit is a merge commit with message matching pattern `Merge pull request #(\d+)`, extract the PR number. Associate this PR number with its child commit(s) for output reference.

### Step 3: Classify Each Change

Apply the following classification rules strictly:

| Category | Icon | Criterion | Examples |
|----------|------|-----------|---------|
| **New Feature** | :star2: | From-scratch functionality/module/interface | New comment system support, new config option, new page/route, new plugin integration |
| **Improvement** | :pencil2: | Enhancement of existing feature (non-bug) | Performance optimization (lazy load/CDN/compress), code refactoring, dependency upgrade, README/doc adjustment, style tweak, config restructure |
| **Bug Fix** | :wrench: | Correction of erroneous behavior | Wrong config key, broken link, logic error, edge case handling |

**Edge cases:**
- A single commit touching multiple categories → split into respective sections
- Unclassifiable commit → place under `:memo: Other Changes`
- Refactoring that also fixes a bug → classify as Bug Fix (primary intent takes precedence)

### Step 4: Generate Output

Determine the output language based on the **user's request language** or the **dominant language of commit messages**. Provide two output templates:

#### Template A — Chinese Output (default when user speaks Chinese)

```markdown
## :star2: 新增功能
<!-- 每个 bullet 对应一个新增功能提交 -->

## :pencil2: 优化内容
<!-- 每个 bullet 对应一个优化提交 -->

## :wrench: 修复内容
<!-- 每个 bug 修复提交 -->
```

**中文格式化规则：**
1. 每个 bullet point 对应一个 commit（同一任务的多个 commit 可合并为一行描述）
2. 优先使用 commit message 原始语义，适当润色使其更易读（保持中文）
3. 每个分类内按时间倒序排列（最新的在前）
4. 使用简洁语言，每项一行为宜
5. **每个 bullet point 末尾追加对应的 PR 引用**，格式为 `#PR编号`（如 `#136`）。**当同一描述涉及多个 commit/PR 时，按时间倒序追加多个 PR 引用**（如 `#136 #138 #140`）
6. 末尾附统计：`共 N 个 commit（其中 新增 X / 优化 Y / 修复 Z）`

#### Template B — English Output (default when user speaks English)

```markdown
## :star2: New Features
<!-- One bullet per new feature commit -->

## :pencil2: Improvements
<!-- One bullet per improvement commit -->

## :wrench: Bug Fixes
<!-- One bullet per fix commit -->
```

**English formatting rules:**
1. Each bullet point corresponds to one commit (merge related commits into one line if they belong to the same task)
2. Preserve original commit message semantics, polish for readability (Chinese if original is Chinese)
3. Sort by time descending (newest first within each category)
4. Use concise language — one line per item ideally
5. **Append the corresponding PR reference at the end of each bullet point**, format as `#PR_number` (e.g., `#136`). **When a single description involves multiple commits/PRs, append multiple PR references in descending time order** (e.g., `#136 #138 #140`)
6. Append statistics at the end: `Total: N commits (X new / Y improved / Z fixed)`

### Step 5: Validate and Present

Before presenting output, verify:
- [ ] Every commit from `git log` output is accounted for (no omissions)
- [ ] No duplicate entries
- [ ] Classification is consistent with rules
- [ ] Statistics count matches total commit count

## Example Output (Chinese)

## :star2: 新增功能

- Diversity主题配置和资源同步功能 #130

## :pencil2: 优化内容

- 主题相关图片压缩与SVG优化 #126 #128
- README文件中安装步骤调整、配置信息独立 #127

## :wrench: 修复内容

- 修复gitalk的language属性配置问题及拼写错误修正 #125 #129

---
*共 6 个 commit（其中 新增 1 / 优化 2 / 修复 1）*

## Example Output (English)

## :star2: New Features

- Diversity theme configuration and resource sync capability #130

## :pencil2: Improvements

- Theme image compression and SVG optimization #126 #128
- README installation steps adjustment; configuration info separated into dedicated docs #127

## :wrench: Bug Fixes

- Fixed gitalk language attribute misconfiguration issue and typo corrections #125 #129

---
*Total: 6 commits (1 new / 2 improved / 1 fixed)*
