# 构建指南

本文档介绍如何在不同平台上构建 Ollama Pro 应用程序。

> 📋 **注意**: 本项目托管在 GitHub: [https://github.com/downly-app/ollama.vip](https://github.com/downly-app/ollama.vip)，所有构建和发布流程都通过 GitHub Actions 自动化处理。

## 🚀 快速开始

### 前置要求

#### 所有平台
- [Node.js](https://nodejs.org/) >= 18.0.0 (推荐 LTS 版本)
- [Yarn](https://yarnpkg.com/) 包管理器
- [Rust](https://rustup.rs/) (最新稳定版)
- Git

#### Windows
- Visual Studio Build Tools 或 Visual Studio Community
- Windows 10 SDK

#### Linux (Ubuntu/Debian)

**Ubuntu 22.04 LTS (推荐)**

Ubuntu 22.04 LTS 提供了最佳的兼容性和稳定性。使用我们的构建脚本：

```bash
# 使用构建脚本（推荐）
chmod +x scripts/build-ubuntu22.sh
./scripts/build-ubuntu22.sh

# 或者构建调试版本
./scripts/build-ubuntu22.sh --debug
```

**手动安装依赖（所有 Ubuntu/Debian 版本）**

```bash
sudo apt-get update
# Ubuntu 22.04 LTS 标准依赖安装
sudo apt-get install -y \
    libwebkit2gtk-4.0-dev \
    libjavascriptcoregtk-4.0-dev \
    libappindicator3-dev \
    librsvg2-dev \
    patchelf \
    libsoup2.4-dev \
    libglib2.0-dev \
    libgtk-3-dev \
    libgdk-pixbuf2.0-dev \
    libpango1.0-dev \
    libatk1.0-dev \
    libcairo-gobject2 \
    libgtk-3-0 \
    libgdk-pixbuf2.0-0 \
    libdrm-dev \
    libdrm-amdgpu1 \
    build-essential \
    pkg-config
```

**Linux (Fedora/RHEL)**
```bash
sudo dnf install -y webkit2gtk4.0-devel libappindicator-gtk3-devel librsvg2-devel patchelf glib2-devel gtk3-devel gdk-pixbuf2-devel pango-devel atk-devel cairo-gobject-devel
```

**Linux (Arch)**
```bash
sudo pacman -S --needed webkit2gtk libappindicator-gtk3 librsvg patchelf glib2 gtk3 gdk-pixbuf2 pango atk cairo
```

#### macOS
- Xcode Command Line Tools: `xcode-select --install`

### 1. 克隆项目
```bash
git clone https://github.com/downly-app/ollama.vip.git
cd ollama.vip
```

### 2. 安装依赖
```bash
# 安装前端依赖
yarn install

# 安装 Tauri CLI (如果尚未安装)
cargo install tauri-cli
```

### 3. 开发模式
```bash
# 启动开发服务器
yarn tauri:dev

# 或者分别启动
yarn dev          # 启动前端开发服务器
cargo tauri dev   # 启动 Tauri 开发模式
```

## 🔨 构建生产版本

### 本地构建

#### 使用脚本构建 (推荐)

**Windows:**
```powershell
.\scripts\build-all.ps1
```

**Linux/macOS:**
```bash
./scripts/build-all.sh
```

#### 手动构建
```bash
# 构建前端
yarn build

# 构建应用
cargo tauri build
```

### 可用脚本

#### 开发脚本
```bash
# 启动开发服务器
yarn dev
yarn tauri:dev

# 类型检查
yarn type-check

# 代码检查
yarn lint
yarn lint:fix

# 测试
yarn test
```

#### 构建脚本
```bash
# 仅构建前端
yarn build
yarn build:prod

# 构建并分析包大小
yarn build:analyze

# 构建 Tauri 应用
yarn tauri:build
yarn tauri:build:debug
```

#### 发布脚本
```bash
# Windows
yarn release v1.0.0
# 或直接使用
.\scripts\release.ps1 v1.0.0

# Linux/macOS
yarn release:unix v1.0.0
# 或直接使用
./scripts/release.sh v1.0.0
```

#### 维护脚本
```bash
# 清理构建产物
yarn clean

# 更新依赖
yarn deps:update

# 安全审计
yarn deps:audit
```

## 📦 构建产物

构建完成后，产物将位于 `src-tauri/target/release/bundle/` 目录下：

### Windows
- `*.exe` - 可执行文件
- `*.msi` - Windows 安装包

### Linux
- `*.deb` - Debian/Ubuntu 包
- `*.rpm` - Red Hat/Fedora 包 (如果系统支持)
- `*.AppImage` - 通用 Linux 应用包

### macOS
- `*.app` - macOS 应用包
- `*.dmg` - macOS 磁盘镜像

## 🌐 跨平台构建

### 使用 GitHub Actions (推荐)

项目已配置 GitHub Actions 工作流，支持以下平台的自动构建：

- **Windows**: x64, x86
- **macOS**: Intel (x64), Apple Silicon (ARM64)
- **Linux**: x64, ARM64

#### 触发自动构建

1. 推送代码到 GitHub
2. 创建版本标签触发构建：
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```
3. 在 GitHub Actions 中查看构建进度
4. 构建完成后在 Releases 页面下载对应平台的安装包

#### 构建矩阵

| 平台 | 架构 | 运行环境 | Rust Target |
|------|------|----------|-------------|
| Windows | x64 | windows-latest | x86_64-pc-windows-msvc |
| Windows | x86 | windows-latest | i686-pc-windows-msvc |
| macOS | Intel | macos-latest | x86_64-apple-darwin |
| macOS | Apple Silicon | macos-latest | aarch64-apple-darwin |
| Linux | x64 | ubuntu-22.04 | x86_64-unknown-linux-gnu |
| Linux | ARM64 | ubuntu-22.04-arm | aarch64-unknown-linux-gnu |

### 本地跨平台构建限制

由于平台限制，本地只能构建当前平台的应用。要构建其他平台，需要：

1. 使用虚拟机或容器
2. 使用云构建服务 (如 GitHub Actions)
3. 在对应平台的机器上构建

## ⚙️ 高级配置

### 特性标志

项目支持可选的 GPU 监控功能，可以通过特性标志控制：

```bash
# 禁用 GPU 监控（提高兼容性）
cargo build --no-default-features --features custom-protocol

# 启用特定 GPU 支持
cargo build --features gpu-nvidia  # NVIDIA GPU
cargo build --features gpu-amd     # AMD GPU
```

### Tauri 配置

主要配置文件：`src-tauri/tauri.conf.json`

- `bundle.targets`: 构建目标 (默认为 "all")
- `bundle.identifier`: 应用标识符
- `windows`: 窗口配置
- `security`: 安全配置

### 构建优化

#### 减小包体积
```toml
# 在 src-tauri/Cargo.toml 中添加
[profile.release]
lto = true
codegen-units = 1
panic = "abort"
strip = true
```

#### 启用特定功能
```json
// 在 tauri.conf.json 中
{
  "tauri": {
    "bundle": {
      "targets": ["msi", "deb", "dmg"]
    }
  }
}
```

## 🔧 故障排除

### 常见问题

1. **构建失败 - 缺少依赖**
   - 确保安装了所有前置要求
   - 检查系统特定的依赖

2. **Windows 上的 MSVC 错误**
   - 安装 Visual Studio Build Tools
   - 确保 Windows SDK 已安装

3. **Linux 上的 WebKit 错误**
   - 安装 webkit2gtk 开发包
   - 更新系统包管理器

4. **macOS 上的签名问题**
   - 对于开发构建，可以跳过签名
   - 生产构建需要 Apple 开发者证书

5. **Node.js 版本问题**
   - 确保使用 Node.js >= 18.0.0
   - 推荐使用 Node.js LTS 版本

### 清理构建缓存
```bash
# 清理 Rust 缓存
cargo clean

# 清理前端缓存
yarn cache clean
rm -rf node_modules
yarn install

# 使用项目脚本清理
yarn clean
```

### 验证系统依赖 (Linux)
```bash
echo "验证 Ubuntu 22.04 系统依赖..."
pkg-config --exists gtk+-3.0 && echo "✅ GTK3 found" || echo "❌ GTK3 missing"
pkg-config --exists webkit2gtk-4.0 && echo "✅ WebKit2GTK 4.0 found" || echo "❌ WebKit2GTK 4.0 missing"
pkg-config --exists javascriptcoregtk-4.0 && echo "✅ JavaScriptCore 4.0 found" || echo "❌ JavaScriptCore 4.0 missing"
```

## 🚀 发布流程

### 自动发布 (推荐)

1. 更新版本号
   - `package.json`
   - `src-tauri/Cargo.toml`
   - `src-tauri/tauri.conf.json`

2. 创建发布标签
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

3. GitHub Actions 自动构建并创建 Release

4. 发布包含以下文件：
   - **Windows x64**: `ollama-pro_v1.0.0_x64_en-US.msi`, `ollama-pro_v1.0.0_x64-setup.exe`
   - **Windows x86**: `ollama-pro_v1.0.0_x86_en-US.msi`, `ollama-pro_v1.0.0_x86-setup.exe`
   - **macOS Intel**: `ollama-pro_v1.0.0_x64.dmg`
   - **macOS Apple Silicon**: `ollama-pro_v1.0.0_aarch64.dmg`
   - **Linux x64**: `ollama-pro_v1.0.0_amd64.deb`, `ollama-pro_v1.0.0_amd64.AppImage`
   - **Linux ARM64**: `ollama-pro_v1.0.0_arm64.deb`, `ollama-pro_v1.0.0_arm64.AppImage`

### 手动发布

使用项目提供的发布脚本：

```bash
# Windows
.\scripts\release.ps1 v1.0.0

# Linux/macOS
./scripts/release.sh v1.0.0
```

## 📚 更多信息

- [项目 GitHub 仓库](https://github.com/downly-app/ollama.vip)
- [Tauri 官方文档](https://tauri.app/)
- [Tauri 构建指南](https://tauri.app/v1/guides/building/)
- [跨平台构建](https://tauri.app/v1/guides/building/cross-platform/)
- [GitHub Actions 工作流](.github/workflows/release.yml)

## 📄 许可证

本项目基于开源许可证发布，详见 [LICENSE](../LICENSE) 文件。

---

如有问题或建议，请在 [GitHub Issues](https://github.com/downly-app/ollama.vip/issues) 中提出。