# Build Guide

This document describes how to build the Ollama Pro application on different platforms.

> 📋 **Note**: This project is hosted on GitHub: [https://github.com/downly-app/ollama.vip](https://github.com/downly-app/ollama.vip). All build and release processes are automated through GitHub Actions.

## 🚀 Quick Start

### Prerequisites

#### All Platforms
- [Node.js](https://nodejs.org/) >= 18.0.0 (LTS version recommended)
- [Yarn](https://yarnpkg.com/) package manager
- [Rust](https://rustup.rs/) (latest stable version)
- Git

#### Windows
- Visual Studio Build Tools or Visual Studio Community
- Windows 10 SDK

#### Linux (Ubuntu/Debian)

**Ubuntu 22.04 LTS (Recommended)**

Ubuntu 22.04 LTS provides the best compatibility and stability. Use our build script:

```bash
# Use build script (recommended)
chmod +x scripts/build-ubuntu22.sh
./scripts/build-ubuntu22.sh

# Or build debug version
./scripts/build-ubuntu22.sh --debug
```

**Manual dependency installation (All Ubuntu/Debian versions)**

```bash
sudo apt-get update
# Ubuntu 22.04 LTS standard dependency installation
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

### 1. Clone the Project
```bash
git clone https://github.com/downly-app/ollama.vip.git
cd ollama.vip
```

### 2. Install Dependencies
```bash
# Install frontend dependencies
yarn install

# Install Tauri CLI (if not already installed)
cargo install tauri-cli
```

### 3. Development Mode
```bash
# Start development server
yarn tauri:dev

# Or start separately
yarn dev          # Start frontend development server
cargo tauri dev   # Start Tauri development mode
```

## 🔨 Build Production Version

### Local Build

#### Using Build Scripts (Recommended)

**Windows:**
```powershell
.\scripts\build-all.ps1
```

**Linux/macOS:**
```bash
./scripts/build-all.sh
```

#### Manual Build
```bash
# Build frontend
yarn build

# Build application
cargo tauri build
```

### Available Scripts

#### Development Scripts
```bash
# Start development server
yarn dev
yarn tauri:dev

# Type checking
yarn type-check

# Linting
yarn lint
yarn lint:fix

# Testing
yarn test
```

#### Build Scripts
```bash
# Build frontend only
yarn build
yarn build:prod

# Build with bundle analysis
yarn build:analyze

# Build Tauri application
yarn tauri:build
yarn tauri:build:debug
```

#### Release Scripts
```bash
# Windows
yarn release v1.0.0
# Or directly
.\scripts\release.ps1 v1.0.0

# Linux/macOS
yarn release:unix v1.0.0
# Or directly
./scripts/release.sh v1.0.0
```

#### Maintenance Scripts
```bash
# Clean build artifacts
yarn clean

# Update dependencies
yarn deps:update

# Security audit
yarn deps:audit
```

## 📦 Build Artifacts

After building, artifacts will be located in the `src-tauri/target/release/bundle/` directory:

### Windows
- `*.exe` - Executable files
- `*.msi` - Windows installer packages

### Linux
- `*.deb` - Debian/Ubuntu packages
- `*.rpm` - Red Hat/Fedora packages (if system supports)
- `*.AppImage` - Universal Linux application packages

### macOS
- `*.app` - macOS application bundles
- `*.dmg` - macOS disk images

## 🌐 Cross-Platform Building

### Using GitHub Actions (Recommended)

The project has configured GitHub Actions workflows that support automatic building for the following platforms:

- **Windows**: x64, x86
- **macOS**: Intel (x64), Apple Silicon (ARM64)
- **Linux**: x64, ARM64

#### Trigger Automatic Build

1. Push code to GitHub
2. Create a version tag to trigger the build:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```
3. View build progress in GitHub Actions
4. Download platform-specific installers from the Releases page after build completion

#### Build Matrix

| Platform | Architecture | Runtime Environment | Rust Target |
|----------|--------------|-------------------|-------------|
| Windows | x64 | windows-latest | x86_64-pc-windows-msvc |
| Windows | x86 | windows-latest | i686-pc-windows-msvc |
| macOS | Intel | macos-latest | x86_64-apple-darwin |
| macOS | Apple Silicon | macos-latest | aarch64-apple-darwin |
| Linux | x64 | ubuntu-22.04 | x86_64-unknown-linux-gnu |
| Linux | ARM64 | ubuntu-22.04-arm | aarch64-unknown-linux-gnu |

### Local Cross-Platform Build Limitations

Due to platform limitations, local builds can only target the current platform. To build for other platforms, you need:

1. Use virtual machines or containers
2. Use cloud build services (like GitHub Actions)
3. Build on the corresponding platform machines

## ⚙️ Advanced Configuration

### Feature Flags

The project supports optional GPU monitoring functionality, which can be controlled through feature flags:

```bash
# Disable GPU monitoring (improve compatibility)
cargo build --no-default-features --features custom-protocol

# Enable specific GPU support
cargo build --features gpu-nvidia  # NVIDIA GPU
cargo build --features gpu-amd     # AMD GPU
```

### Tauri Configuration

Main configuration file: `src-tauri/tauri.conf.json`

- `bundle.targets`: Build targets (default "all")
- `bundle.identifier`: Application identifier
- `windows`: Window configuration
- `security`: Security configuration

### Build Optimization

#### Reduce Bundle Size
```toml
# Add to src-tauri/Cargo.toml
[profile.release]
lto = true
codegen-units = 1
panic = "abort"
strip = true
```

#### Enable Specific Features
```json
// In tauri.conf.json
{
  "tauri": {
    "bundle": {
      "targets": ["msi", "deb", "dmg"]
    }
  }
}
```

## 🔧 Troubleshooting

### Common Issues

1. **Build failure - Missing dependencies**
   - Ensure all prerequisites are installed
   - Check system-specific dependencies

2. **MSVC errors on Windows**
   - Install Visual Studio Build Tools
   - Ensure Windows SDK is installed

3. **WebKit errors on Linux**
   - Install webkit2gtk development packages
   - Update system package manager

4. **Signing issues on macOS**
   - For development builds, signing can be skipped
   - Production builds require Apple Developer certificates

5. **Node.js version issues**
   - Ensure using Node.js >= 18.0.0
   - Recommended to use Node.js LTS version

### Clean Build Cache
```bash
# Clean Rust cache
cargo clean

# Clean frontend cache
yarn cache clean
rm -rf node_modules
yarn install

# Use project script to clean
yarn clean
```

### Verify System Dependencies (Linux)
```bash
echo "Verifying Ubuntu 22.04 system dependencies..."
pkg-config --exists gtk+-3.0 && echo "✅ GTK3 found" || echo "❌ GTK3 missing"
pkg-config --exists webkit2gtk-4.0 && echo "✅ WebKit2GTK 4.0 found" || echo "❌ WebKit2GTK 4.0 missing"
pkg-config --exists javascriptcoregtk-4.0 && echo "✅ JavaScriptCore 4.0 found" || echo "❌ JavaScriptCore 4.0 missing"
```

## 🚀 Release Process

### Automatic Release (Recommended)

1. Update version numbers
   - `package.json`
   - `src-tauri/Cargo.toml`
   - `src-tauri/tauri.conf.json`

2. Create release tag
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

3. GitHub Actions automatically builds and creates Release

4. Release includes the following files:
   - **Windows x64**: `ollama-pro_v1.0.0_x64_en-US.msi`, `ollama-pro_v1.0.0_x64-setup.exe`
   - **Windows x86**: `ollama-pro_v1.0.0_x86_en-US.msi`, `ollama-pro_v1.0.0_x86-setup.exe`
   - **macOS Intel**: `ollama-pro_v1.0.0_x64.dmg`
   - **macOS Apple Silicon**: `ollama-pro_v1.0.0_aarch64.dmg`
   - **Linux x64**: `ollama-pro_v1.0.0_amd64.deb`, `ollama-pro_v1.0.0_amd64.AppImage`
   - **Linux ARM64**: `ollama-pro_v1.0.0_arm64.deb`, `ollama-pro_v1.0.0_arm64.AppImage`

### Manual Release

Use the release scripts provided by the project:

```bash
# Windows
.\scripts\release.ps1 v1.0.0

# Linux/macOS
./scripts/release.sh v1.0.0
```

## 📚 More Information

- [Project GitHub Repository](https://github.com/downly-app/ollama.vip)
- [Tauri Official Documentation](https://tauri.app/)
- [Tauri Build Guide](https://tauri.app/v1/guides/building/)
- [Cross-Platform Building](https://tauri.app/v1/guides/building/cross-platform/)
- [GitHub Actions Workflow](.github/workflows/release.yml)

## 📄 License

This project is released under an open source license. See the [LICENSE](../LICENSE) file for details.

---

If you have any questions or suggestions, please submit them in [GitHub Issues](https://github.com/downly-app/ollama.vip/issues).