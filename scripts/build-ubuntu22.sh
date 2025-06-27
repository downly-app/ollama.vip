#!/bin/bash

# Ubuntu 22.04 LTS 构建脚本
# 为 Ollama Pro 提供稳定的构建体验

set -e

echo "🚀 Ollama Pro Ubuntu 22.04 LTS 构建脚本"
echo "============================================"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查系统版本
check_ubuntu_version() {
    echo -e "${BLUE}检查 Ubuntu 版本...${NC}"
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        if [[ "$VERSION_ID" == "22.04" ]]; then
            echo -e "${GREEN}✅ Ubuntu 22.04 LTS 检测成功${NC}"
        else
            echo -e "${YELLOW}⚠️  检测到 Ubuntu $VERSION_ID，建议使用 Ubuntu 22.04 LTS${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  无法检测 Ubuntu 版本${NC}"
    fi
}

# 检查必需的系统依赖
check_system_dependencies() {
    echo -e "${BLUE}检查系统依赖...${NC}"
    
    local missing_deps=()
    local deps=(
        "pkg-config"
        "build-essential"
        "libwebkit2gtk-4.0-dev"
        "libjavascriptcoregtk-4.0-dev"
        "libappindicator3-dev"
        "librsvg2-dev"
        "libglib2.0-dev"
        "libgtk-3-dev"
        "libgdk-pixbuf2.0-dev"
        "libpango1.0-dev"
        "libatk1.0-dev"
        "libcairo-gobject2"
        "libgtk-3-0"
        "libgdk-pixbuf2.0-0"
        "libdrm-dev"
        "libdrm-amdgpu1"
        "patchelf"
        "libsoup2.4-dev"
        "curl"
        "wget"
        "file"
        "libssl-dev"
    )
    
    for dep in "${deps[@]}"; do
        if ! dpkg -l | grep -q "^ii  $dep "; then
            missing_deps+=("$dep")
        fi
    done
    
    if [ ${#missing_deps[@]} -eq 0 ]; then
        echo -e "${GREEN}✅ 所有系统依赖已安装${NC}"
    else
        echo -e "${RED}❌ 缺少以下依赖:${NC}"
        printf '%s\n' "${missing_deps[@]}"
        echo -e "${YELLOW}请运行以下命令安装缺少的依赖:${NC}"
        echo "sudo apt-get update && sudo apt-get install -y ${missing_deps[*]}"
        exit 1
    fi
}

# 检查 pkg-config 库
check_pkg_config() {
    echo -e "${BLUE}验证 pkg-config 库...${NC}"
    
    local libs=(
        "gtk+-3.0"
        "webkit2gtk-4.0"
        "javascriptcoregtk-4.0"
        "glib-2.0"
        "gdk-pixbuf-2.0"
    )
    
    for lib in "${libs[@]}"; do
        if pkg-config --exists "$lib"; then
            echo -e "${GREEN}✅ $lib 可用${NC}"
        else
            echo -e "${RED}❌ $lib 不可用${NC}"
        fi
    done
}

# 检查 Node.js 和 Yarn
check_node_yarn() {
    echo -e "${BLUE}检查 Node.js 和 Yarn...${NC}"
    
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        echo -e "${GREEN}✅ Node.js: $NODE_VERSION${NC}"
    else
        echo -e "${RED}❌ Node.js 未安装${NC}"
        exit 1
    fi
    
    if command -v yarn &> /dev/null; then
        YARN_VERSION=$(yarn --version)
        echo -e "${GREEN}✅ Yarn: $YARN_VERSION${NC}"
    else
        echo -e "${RED}❌ Yarn 未安装${NC}"
        exit 1
    fi
}

# 检查 Rust
check_rust() {
    echo -e "${BLUE}检查 Rust 工具链...${NC}"
    
    if command -v rustc &> /dev/null; then
        RUST_VERSION=$(rustc --version)
        echo -e "${GREEN}✅ Rust: $RUST_VERSION${NC}"
    else
        echo -e "${RED}❌ Rust 未安装${NC}"
        echo -e "${YELLOW}请访问 https://rustup.rs/ 安装 Rust${NC}"
        exit 1
    fi
    
    if command -v cargo &> /dev/null; then
        CARGO_VERSION=$(cargo --version)
        echo -e "${GREEN}✅ Cargo: $CARGO_VERSION${NC}"
    else
        echo -e "${RED}❌ Cargo 未安装${NC}"
        exit 1
    fi
}

# 安装前端依赖
install_frontend_deps() {
    echo -e "${BLUE}安装前端依赖...${NC}"
    yarn install
    echo -e "${GREEN}✅ 前端依赖安装完成${NC}"
}

# 构建应用
build_app() {
    echo -e "${BLUE}开始构建应用...${NC}"
    
    # 设置环境变量以优化构建
    export RUST_BACKTRACE=1
    export PKG_CONFIG_PATH="/usr/lib/x86_64-linux-gnu/pkgconfig:/usr/share/pkgconfig"
    
    # 构建应用
    if [ "$1" = "--debug" ]; then
        echo -e "${YELLOW}构建调试版本...${NC}"
        yarn tauri build --debug
    else
        echo -e "${YELLOW}构建发布版本...${NC}"
        yarn tauri build
    fi
    
    echo -e "${GREEN}✅ 应用构建完成${NC}"
}

# 显示构建结果
show_build_results() {
    echo -e "${BLUE}构建结果:${NC}"
    
    if [ -d "src-tauri/target/release/bundle" ]; then
        echo -e "${GREEN}发布版本构建文件:${NC}"
        find src-tauri/target/release/bundle -name "*.deb" -o -name "*.AppImage" | head -5
    fi
    
    if [ -d "src-tauri/target/debug/bundle" ]; then
        echo -e "${GREEN}调试版本构建文件:${NC}"
        find src-tauri/target/debug/bundle -name "*.deb" -o -name "*.AppImage" | head -5
    fi
}

# 主函数
main() {
    echo -e "${GREEN}=== Ubuntu 22.04 优化构建脚本 ===${NC}"
    
    check_ubuntu_version
    check_system_dependencies
    check_pkg_config
    check_node_yarn
    check_rust
    install_frontend_deps
    build_app "$1"
    show_build_results
    
    echo -e "${GREEN}🎉 构建完成！${NC}"
}

# 运行主函数
main "$@"