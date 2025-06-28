# GitHub Actions 配置文档

## 概述

本文档详细说明了 Ollama Pro 项目的 GitHub Actions 配置，包括跨平台构建、安全扫描、发布自动化等功能。

## 目录

- [工作流概览](#工作流概览)
- [构建工作流 (build.yml)](#构建工作流-buildyml)
- [安全扫描工作流 (security.yml)](#安全扫描工作流-securityyml)
- [配置审计报告](#配置审计报告)
- [最佳实践建议](#最佳实践建议)
- [故障排查指南](#故障排查指南)
- [维护和更新](#维护和更新)

## 工作流概览

### 当前工作流

| 工作流 | 文件 | 触发条件 | 主要功能 |
|--------|------|----------|----------|
| 构建和发布 | `.github/workflows/build.yml` | push (main/develop), PR, tags | 跨平台构建、自动发布 |
| 安全扫描 | `.github/workflows/security.yml` | push, PR, 定时 | 依赖扫描、代码安全、许可证检查 |

### 支持的平台

- **Windows**: `.msi` 和 `.exe` 安装包
- **macOS**: `.dmg` 和 `.app` 通用二进制文件 (Intel + Apple Silicon)
- **Linux**: `.deb`, `.rpm`, 和 `.AppImage` 包

## 构建工作流 (build.yml)

### 触发条件

```yaml
on:
  push:
    branches: [main, develop]
    tags: ['v*']
  pull_request:
    branches: [main, develop]
```

### 构建矩阵

| 平台 | Runner | 特殊参数 | 输出格式 |
|------|--------|----------|----------|
| Windows | `windows-latest` | - | `.msi`, `.exe` |
| macOS | `macos-latest` | `--target universal-apple-darwin` | `.dmg`, `.app` |
| Linux | `ubuntu-22.04` | - | `.deb`, `.rpm`, `.AppImage` |

### 构建步骤详解

#### 1. 环境准备

```yaml
- name: Checkout repository
  uses: actions/checkout@v4

- name: Install dependencies (ubuntu only)
  if: matrix.platform == 'ubuntu-22.04'
  run: |
    sudo apt-get update
    sudo apt-get install -y libwebkit2gtk-4.0-dev libwebkit2gtk-4.1-dev \
      libappindicator3-dev librsvg2-dev patchelf
```

#### 2. Rust 环境配置

```yaml
- name: Rust setup
  uses: dtolnay/rust-toolchain@stable
  with:
    targets: ${{ matrix.platform == 'macos-latest' && 'aarch64-apple-darwin,x86_64-apple-darwin' || '' }}

- name: Rust cache
  uses: swatinem/rust-cache@v2
  with:
    workspaces: './src-tauri -> target'
    cache-on-failure: true
```

#### 3. Node.js 环境配置

```yaml
- name: Sync node version and setup cache
  uses: actions/setup-node@v4
  with:
    node-version: 'lts/*'
    cache: 'yarn'

- name: Cache node modules
  uses: actions/cache@v3
  with:
    path: |
      node_modules
      ~/.cache/yarn
    key: ${{ runner.os }}-yarn-${{ hashFiles('**/yarn.lock') }}
```

#### 4. 构建和测试

```yaml
- name: Install frontend dependencies
  run: yarn install --frozen-lockfile

- name: Run tests
  run: |
    yarn lint
    cargo test --manifest-path src-tauri/Cargo.toml

- name: Build frontend
  run: yarn build
```

#### 5. Tauri 构建和发布

```yaml
- name: Build the app
  uses: tauri-apps/tauri-action@v0
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  with:
    tagName: ${{ github.ref_name }}
    releaseName: 'Ollama Pro ${{ github.ref_name }}'
    releaseBody: |
      ## What's Changed
      
      ### Features
      - Enhanced cross-platform build support
      - Improved performance and stability
      - Updated dependencies
      
      ### Bug Fixes
      - Various bug fixes and improvements
      
      ### Downloads
      - **Windows**: `.msi` and `.exe` installers
      - **macOS**: `.dmg` and `.app` bundles
      - **Linux**: `.deb`, `.rpm`, and `.AppImage` packages
    releaseDraft: false
    prerelease: ${{ contains(github.ref_name, 'alpha') || contains(github.ref_name, 'beta') || contains(github.ref_name, 'rc') }}
    args: ${{ matrix.args }}
```

### 发布策略

- **正式版本**: 推送 `v*` 标签时自动发布
- **预发布版本**: 标签包含 `alpha`、`beta` 或 `rc` 时标记为预发布
- **草稿发布**: 设置为 `false`，直接发布

## 安全扫描工作流 (security.yml)

### 触发条件

```yaml
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 2 * * *'  # 每日 UTC 2:00 运行
```

### 扫描任务

#### 1. 依赖漏洞扫描 (dependency-scan)

- **Yarn Audit**: 检查 Node.js 依赖漏洞
- **Cargo Audit**: 检查 Rust 依赖漏洞
- **级别**: moderate 及以上

#### 2. 代码安全扫描 (code-scan)

- **工具**: GitHub CodeQL
- **语言**: JavaScript, TypeScript
- **查询**: security-extended, security-and-quality
- **权限**: security-events:write

#### 3. Rust 安全扫描 (rust-security)

- **Clippy 安全检查**: 多种安全相关 lint
- **Unsafe 代码检测**: 检查并报告 unsafe 代码块

```yaml
run: |
  cd src-tauri
  cargo clippy --all-targets --all-features -- \
    -W clippy::suspicious \
    -W clippy::complexity \
    -W clippy::perf \
    -W clippy::style \
    -W clippy::pedantic \
    -D warnings
```

#### 4. 敏感信息检测 (secret-scan)

- **工具**: TruffleHog OSS
- **范围**: 整个代码库
- **模式**: 仅验证过的密钥

#### 5. 许可证合规性检查 (license-scan)

- **Node.js**: license-checker
- **Rust**: cargo-license
- **禁止许可证**: GPL, AGPL, LGPL, CPAL, OSL, EPL, MPL

#### 6. 安全报告汇总 (security-report)

生成包含所有扫描结果的汇总报告。

## 配置审计报告

### ✅ 优势

1. **完整的跨平台支持**
   - 支持 Windows、macOS、Linux 三大平台
   - macOS 通用二进制文件支持 Intel 和 Apple Silicon

2. **全面的安全扫描**
   - 多层次安全检查（依赖、代码、密钥、许可证）
   - 定时扫描确保持续安全

3. **优化的构建流程**
   - 智能缓存策略减少构建时间
   - 并发构建提高效率

4. **自动化发布**
   - 基于标签的自动发布
   - 预发布版本自动识别

### ⚠️ 需要改进的地方

1. **构建优化**
   - 缺少构建产物大小监控
   - 没有性能基准测试

2. **测试覆盖**
   - 缺少端到端测试
   - 没有集成测试

3. **发布流程**
   - 发布说明需要手动更新
   - 缺少回滚机制

4. **监控和通知**
   - 缺少构建失败通知
   - 没有性能监控

## 最佳实践建议

### 1. 增强测试覆盖

```yaml
# 建议添加到 build.yml
- name: Run unit tests
  run: |
    yarn test:unit
    cargo test --manifest-path src-tauri/Cargo.toml --all-features

- name: Run integration tests
  run: yarn test:integration

- name: Run E2E tests
  run: yarn test:e2e
```

### 2. 构建产物分析

```yaml
# 添加构建大小分析
- name: Analyze bundle size
  run: |
    yarn build:analyze
    ls -la dist/
    du -sh src-tauri/target/release/bundle/
```

### 3. 性能基准测试

```yaml
# 添加性能测试
- name: Performance benchmarks
  run: |
    yarn benchmark
    cargo bench --manifest-path src-tauri/Cargo.toml
```

### 4. 通知配置

```yaml
# 添加 Slack/Discord 通知
- name: Notify on failure
  if: failure()
  uses: 8398a7/action-slack@v3
  with:
    status: failure
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

### 5. 代码签名

```yaml
# Windows 代码签名
windows:
  certificateThumbprint: ${{ secrets.WINDOWS_CERTIFICATE_THUMBPRINT }}
  digestAlgorithm: "sha256"
  timestampUrl: "http://timestamp.digicert.com"

# macOS 代码签名
macOS:
  signingIdentity: ${{ secrets.APPLE_SIGNING_IDENTITY }}
  providerShortName: ${{ secrets.APPLE_PROVIDER_SHORT_NAME }}
```

### 6. 环境变量管理

建议在 GitHub Secrets 中配置：

- `WINDOWS_CERTIFICATE_THUMBPRINT`: Windows 代码签名证书
- `APPLE_SIGNING_IDENTITY`: macOS 签名身份
- `SLACK_WEBHOOK`: 通知 Webhook
- `CODECOV_TOKEN`: 代码覆盖率报告

## 故障排查指南

### 常见问题

#### 1. 构建失败

**症状**: 构建过程中出现错误

**排查步骤**:
1. 检查依赖版本兼容性
2. 验证 Rust 工具链版本
3. 检查平台特定依赖
4. 查看详细错误日志

#### 2. 安全扫描失败

**症状**: 安全扫描报告漏洞或违规

**排查步骤**:
1. 查看具体漏洞详情
2. 更新受影响的依赖
3. 评估漏洞影响范围
4. 必要时添加例外规则

#### 3. 发布失败

**症状**: 标签推送后未自动发布

**排查步骤**:
1. 检查标签格式 (`v*`)
2. 验证 GitHub Token 权限
3. 检查构建产物是否生成
4. 查看 tauri-action 日志

### 调试技巧

#### 1. 本地复现

```bash
# 复现构建环境
act -j build

# 本地运行安全扫描
yarn audit
cargo audit
```

#### 2. 详细日志

```yaml
# 启用详细日志
- name: Debug info
  run: |
    echo "Runner OS: ${{ runner.os }}"
    echo "GitHub Ref: ${{ github.ref }}"
    echo "GitHub Event: ${{ github.event_name }}"
    node --version
    yarn --version
    cargo --version
```

## 维护和更新

### 定期维护任务

#### 每月
- [ ] 更新 GitHub Actions 版本
- [ ] 检查依赖安全更新
- [ ] 审查构建性能指标

#### 每季度
- [ ] 评估新的安全扫描工具
- [ ] 优化构建缓存策略
- [ ] 更新文档和最佳实践

#### 每年
- [ ] 全面安全审计
- [ ] 评估平台支持策略
- [ ] 更新代码签名证书

### 版本更新检查清单

#### GitHub Actions
- [ ] `actions/checkout@v4` → 最新版本
- [ ] `actions/setup-node@v4` → 最新版本
- [ ] `dtolnay/rust-toolchain@stable` → 检查更新
- [ ] `tauri-apps/tauri-action@v0` → 最新版本

#### 依赖更新
- [ ] Tauri CLI 版本
- [ ] Rust 工具链版本
- [ ] Node.js LTS 版本
- [ ] 安全扫描工具版本

### 监控指标

#### 构建性能
- 构建时间趋势
- 缓存命中率
- 构建产物大小

#### 安全指标
- 漏洞发现数量
- 修复时间
- 合规性状态

#### 发布指标
- 发布成功率
- 发布频率
- 下载统计

## 总结

当前的 GitHub Actions 配置已经实现了：

✅ **完整的跨平台构建支持**  
✅ **全面的安全扫描流程**  
✅ **自动化的发布流程**  
✅ **优化的缓存策略**  

建议的改进方向：

🔄 **增强测试覆盖率**  
🔄 **添加性能监控**  
🔄 **完善通知机制**  
🔄 **实现代码签名**  

通过持续优化和维护，可以进一步提升构建效率、安全性和可靠性。