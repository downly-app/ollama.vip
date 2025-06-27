#!/bin/bash
# Ubuntu 22.04 兼容性检查脚本
# 检查系统是否满足 Ollama Pro 在 Ubuntu 22.04 上的构建要求

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Ubuntu 22.04 兼容性检查 ===${NC}"

# 检查结果统计
PASSED=0
FAILED=0
WARNINGS=0

# 检查函数
check_pass() {
    echo -e "${GREEN}✅ $1${NC}"
    ((PASSED++))
}

check_fail() {
    echo -e "${RED}❌ $1${NC}"
    ((FAILED++))
}

check_warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    ((WARNINGS++))
}

# 1. 检查操作系统版本
echo -e "\n${BLUE}1. 检查操作系统版本${NC}"
if [ -f /etc/os-release ]; then
    . /etc/os-release
    echo "检测到: $PRETTY_NAME"
    
    if [[ "$ID" == "ubuntu" ]]; then
        if [[ "$VERSION_ID" == "22.04" ]];
        then
            check_pass "Ubuntu 22.04 LTS - 完全支持"
        elif [[ "$VERSION_ID" == "24.04" ]];
        then
            check_warn "Ubuntu 22.04 LTS - 完全支持，推荐版本"
        elif [[ "$VERSION_ID" == "20.04" ]]; then
            check_warn "Ubuntu 20.04 LTS - 可能存在兼容性问题"
        else
            check_warn "Ubuntu $VERSION_ID - 未经测试的版本"
        fi
    else
        check_warn "非 Ubuntu 系统: $ID - 可能需要额外配置"
    fi
else
    check_fail "无法检测操作系统版本"
fi

# 2. 检查系统架构
echo -e "\n${BLUE}2. 检查系统架构${NC}"
ARCH=$(uname -m)
echo "检测到架构: $ARCH"
case $ARCH in
    x86_64)
        check_pass "x86_64 架构 - 完全支持"
        ;;
    aarch64|arm64)
        check_warn "ARM64 架构 - 基本支持，某些依赖可能需要编译"
        ;;
    *)
        check_fail "不支持的架构: $ARCH"
        ;;
esac

# 3. 检查必需的系统包
echo -e "\n${BLUE}3. 检查系统包${NC}"
REQUIRED_PACKAGES=(
    "build-essential"
    "pkg-config"
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

MISSING_PACKAGES=()
for package in "${REQUIRED_PACKAGES[@]}"; do
    if dpkg -l | grep -q "^ii  $package "; then
        check_pass "$package 已安装"
    else
        check_fail "$package 未安装"
        MISSING_PACKAGES+=("$package")
    fi
done

if [ ${#MISSING_PACKAGES[@]} -gt 0 ]; then
    echo -e "\n${YELLOW}缺少的包可以通过以下命令安装:${NC}"
    echo "sudo apt-get update && sudo apt-get install -y ${MISSING_PACKAGES[*]}"
fi

# 4. 检查 pkg-config 库
echo -e "\n${BLUE}4. 检查 pkg-config 库${NC}"
PKG_LIBS=(
    "gtk+-3.0"
    "webkit2gtk-4.0"
    "javascriptcoregtk-4.0"
    "glib-2.0"
    "gdk-pixbuf-2.0"
    "pango"
    "atk"
    "cairo-gobject"
)

for lib in "${PKG_LIBS[@]}"; do
    if pkg-config --exists "$lib" 2>/dev/null; then
        VERSION=$(pkg-config --modversion "$lib" 2>/dev/null || echo "unknown")
        check_pass "$lib (版本: $VERSION)"
    else
        check_fail "$lib 不可用"
    fi
done

# 5. 检查开发工具
echo -e "\n${BLUE}5. 检查开发工具${NC}"

# Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')
    if [ "$NODE_MAJOR" -ge 18 ]; then
        check_pass "Node.js $NODE_VERSION (推荐版本)"
    elif [ "$NODE_MAJOR" -ge 16 ]; then
        check_warn "Node.js $NODE_VERSION (最低支持版本)"
    else
        check_fail "Node.js $NODE_VERSION (版本过低，需要 >= 16)"
    fi
else
    check_fail "Node.js 未安装"
fi

# Yarn
if command -v yarn &> /dev/null; then
    YARN_VERSION=$(yarn --version)
    check_pass "Yarn $YARN_VERSION"
else
    check_fail "Yarn 未安装"
fi

# Rust
if command -v rustc &> /dev/null; then
    RUST_VERSION=$(rustc --version)
    check_pass "Rust: $RUST_VERSION"
else
    check_fail "Rust 未安装"
fi

# Cargo
if command -v cargo &> /dev/null; then
    CARGO_VERSION=$(cargo --version)
    check_pass "Cargo: $CARGO_VERSION"
else
    check_fail "Cargo 未安装"
fi

# 6. 检查环境变量
echo -e "\n${BLUE}6. 检查环境变量${NC}"

if [ -n "$PKG_CONFIG_PATH" ]; then
    check_pass "PKG_CONFIG_PATH 已设置: $PKG_CONFIG_PATH"
else
    check_warn "PKG_CONFIG_PATH 未设置，可能需要手动配置"
fi

if [ -n "$RUST_BACKTRACE" ]; then
    check_pass "RUST_BACKTRACE 已设置: $RUST_BACKTRACE"
else
    check_warn "RUST_BACKTRACE 未设置，建议设置为 1 以便调试"
fi

# 7. 检查磁盘空间
echo -e "\n${BLUE}7. 检查磁盘空间${NC}"
AVAILABLE_SPACE=$(df . | awk 'NR==2 {print $4}')
AVAILABLE_GB=$((AVAILABLE_SPACE / 1024 / 1024))

if [ "$AVAILABLE_GB" -ge 10 ]; then
    check_pass "可用磁盘空间: ${AVAILABLE_GB}GB (充足)"
elif [ "$AVAILABLE_GB" -ge 5 ]; then
    check_warn "可用磁盘空间: ${AVAILABLE_GB}GB (基本够用)"
else
    check_fail "可用磁盘空间: ${AVAILABLE_GB}GB (不足，建议至少 5GB)"
fi

# 8. 检查内存
echo -e "\n${BLUE}8. 检查系统内存${NC}"
TOTAL_MEM=$(free -g | awk 'NR==2{print $2}')
AVAIL_MEM=$(free -g | awk 'NR==2{print $7}')

if [ "$TOTAL_MEM" -ge 8 ]; then
    check_pass "总内存: ${TOTAL_MEM}GB (推荐)"
elif [ "$TOTAL_MEM" -ge 4 ]; then
    check_warn "总内存: ${TOTAL_MEM}GB (最低要求)"
else
    check_fail "总内存: ${TOTAL_MEM}GB (不足，建议至少 4GB)"
fi

if [ "$AVAIL_MEM" -ge 2 ]; then
    check_pass "可用内存: ${AVAIL_MEM}GB (充足)"
else
    check_warn "可用内存: ${AVAIL_MEM}GB (可能不足)"
fi

# 9. 检查 GPU 支持（可选）
echo -e "\n${BLUE}9. 检查 GPU 支持 (可选)${NC}"
if command -v nvidia-smi &> /dev/null; then
    check_pass "NVIDIA GPU 驱动已安装"
elif lspci | grep -i nvidia &> /dev/null; then
    check_warn "检测到 NVIDIA GPU，但驱动未安装"
fi

if lspci | grep -i amd | grep -i vga &> /dev/null; then
    check_warn "检测到 AMD GPU"
fi

if lspci | grep -i intel | grep -i vga &> /dev/null; then
    check_pass "检测到 Intel 集成显卡"
fi

# 10. 生成总结报告
echo -e "\n${BLUE}=== 兼容性检查总结 ===${NC}"
echo -e "${GREEN}通过: $PASSED${NC}"
echo -e "${YELLOW}警告: $WARNINGS${NC}"
echo -e "${RED}失败: $FAILED${NC}"

if [ "$FAILED" -eq 0 ]; then
    if [ "$WARNINGS" -eq 0 ]; then
        echo -e "\n${GREEN}🎉 系统完全兼容 Ubuntu 22.04 构建要求！${NC}"
        exit 0
    else
        echo -e "\n${YELLOW}⚠️  系统基本兼容，但有一些警告需要注意。${NC}"
        exit 0
    fi
else
    echo -e "\n${RED}❌ 系统存在兼容性问题，请解决上述失败项后重试。${NC}"
    exit 1
fi