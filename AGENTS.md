# AGENTS 开发维护指南

本文档面向项目维护者，记录开发、测试、打包与发布流程。

## 目录结构

- `src/main`：Electron 主进程（窗口、托盘、命令服务、持久化）
- `src/preload`：渲染层安全桥接
- `src/renderer`：界面层（主页、设置、工作区）
- `src/shared`：协议与共享类型
- `scripts`：开发脚本、校验脚本、发布辅助脚本
- `tests`：Vitest 单元测试
- `.github/workflows/release-packages.yml`：tag 触发的 `.deb/.exe/.dmg` 打包与发布

## 常用命令

### 开发与运行

```bash
npm install
npm run dev
npm run start
```

### 构建与测试

```bash
npm run build
npm test
npm run verify:gate
AIPROTAL_REQUIRE_GUI=1 npm run verify:gate
npm run check:architecture
AIPROTAL_ARCH_FAIL_ON_WARN=1 npm run check:architecture
npm run verify:visual
```

### 安装包打包

```bash
npm run package:deb
npm run package:exe
npm run package:dmg
npm run package:release
```

本地产物输出目录：`release/`

## 发布流程（vX.Y.Z）

### 1. 发布前校验

```bash
git status --short --branch
npm run verify:gate
```

### 2. 生成 Changelog 与 Release Notes

```bash
VERSION=1.0.0
TODAY=2026-03-12
python3 "$CODEX_HOME/skills/dev2release/scripts/conventional_changelog.py" \
  --from-ref "" \
  --to-ref HEAD \
  --version "$VERSION" \
  --date "$TODAY" \
  --changelog CHANGELOG.md \
  --write

python3 "$CODEX_HOME/skills/dev2release/scripts/conventional_changelog.py" \
  --from-ref "" \
  --to-ref HEAD \
  --version "$VERSION" \
  --date "$TODAY" > RELEASE_NOTES.md
```

### 3. 提交、打 Tag、推送

```bash
npm version 1.0.0 --no-git-tag-version
git add package.json package-lock.json electron-builder.yml .github/workflows/release-packages.yml README.md AGENTS.md CHANGELOG.md RELEASE_NOTES.md
git commit -m "chore(release): v1.0.0 add deb/exe/dmg packaging"

git tag -a "v1.0.0" -m "release v1.0.0"
git push origin HEAD
git push origin "v1.0.0"
```

### 4. CI 自动产物

推送 tag 后，GitHub Actions 会：

- `ubuntu-latest` 产出 `.deb`
- `windows-latest` 产出 `.exe`（NSIS）
- `macos-latest` 产出 `.dmg`（x64/arm64）
- 上传 workflow artifacts
- 自动附加到 GitHub Release `vX.Y.Z`

## 回滚方案

### 删除错误发布 tag

```bash
git push --delete origin "v1.0.0"
git tag -d "v1.0.0"
```

### 回滚发布提交

```bash
git revert <release_commit_sha>
git push origin HEAD
```

### 删除 GitHub Release

- 在 GitHub 网页端删除对应 `vX.Y.Z` Release
- 再执行 tag 删除，保持仓库与发布页一致

## 维护约定

- 优先保持最小改动，避免无关重构
- 变更需通过 `npm run verify:gate`
- 版本发布必须同步更新 `CHANGELOG.md`
