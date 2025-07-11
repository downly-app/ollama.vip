#!/bin/bash

# Ubuntu 22.04 ARM64 Build Dependencies Setup Script
# This script ensures all required dependencies are installed for ARM64 Tauri builds

set -e

echo "🔧 Setting up Ubuntu 22.04 ARM64 build environment..."

# Update package lists
echo "📦 Updating package lists..."
sudo apt-get update

# Install essential build tools
echo "🛠️ Installing essential build tools..."
sudo apt-get install -y \
    build-essential \
    pkg-config \
    curl \
    wget \
    git \
    unzip

# Install GTK and WebKit dependencies
echo "🖥️ Installing GTK and WebKit dependencies..."
sudo apt-get install -y \
    libgtk-3-dev \
    libgdk-pixbuf2.0-dev \
    libpango1.0-dev \
    libatk1.0-dev \
    libcairo-gobject2 \
    libgtk-3-0 \
    libgdk-pixbuf2.0-0

# Install WebKit2GTK specifically
echo "🌐 Installing WebKit2GTK..."
sudo apt-get install -y \
    libwebkit2gtk-4.0-dev \
    libjavascriptcoregtk-4.0-dev

# Install additional Tauri dependencies
echo "📱 Installing Tauri-specific dependencies..."
sudo apt-get install -y \
    libappindicator3-dev \
    librsvg2-dev \
    patchelf \
    libsoup2.4-dev \
    libglib2.0-dev

# Install system libraries that might be missing
echo "🔗 Installing additional system libraries..."
sudo apt-get install -y \
    libdrm-dev \
    libdrm-amdgpu1 \
    libssl-dev \
    libudev-dev

# Verify critical dependencies
echo "✅ Verifying dependencies..."
echo "Checking GTK3..."
if pkg-config --exists gtk+-3.0; then
    echo "  ✅ GTK3: $(pkg-config --modversion gtk+-3.0)"
else
    echo "  ❌ GTK3: Missing"
    exit 1
fi

echo "Checking GDK3..."
if pkg-config --exists gdk-3.0; then
    echo "  ✅ GDK3: $(pkg-config --modversion gdk-3.0)"
else
    echo "  ❌ GDK3: Missing"
    exit 1
fi

echo "Checking WebKit2GTK..."
if pkg-config --exists webkit2gtk-4.0; then
    echo "  ✅ WebKit2GTK: $(pkg-config --modversion webkit2gtk-4.0)"
else
    echo "  ❌ WebKit2GTK: Missing"
    exit 1
fi

echo "Checking JavaScriptCore..."
if pkg-config --exists javascriptcoregtk-4.0; then
    echo "  ✅ JavaScriptCore: $(pkg-config --modversion javascriptcoregtk-4.0)"
else
    echo "  ❌ JavaScriptCore: Missing"
    exit 1
fi

echo "Checking GLib..."
if pkg-config --exists glib-2.0; then
    echo "  ✅ GLib: $(pkg-config --modversion glib-2.0)"
else
    echo "  ❌ GLib: Missing"
    exit 1
fi

echo "Checking GDK-PixBuf..."
if pkg-config --exists gdk-pixbuf-2.0; then
    echo "  ✅ GDK-PixBuf: $(pkg-config --modversion gdk-pixbuf-2.0)"
else
    echo "  ❌ GDK-PixBuf: Missing"
    exit 1
fi

# Display environment information
echo "📋 Environment Information:"
echo "  Architecture: $(uname -m)"
echo "  OS: $(lsb_release -d | cut -f2)"
echo "  Kernel: $(uname -r)"
echo "  Available cores: $(nproc)"
echo "  Available memory: $(free -h | awk '/^Mem:/ {print $2}')"

# List available WebKit/GTK packages for debugging
echo "📦 Available WebKit/GTK packages:"
pkg-config --list-all | grep -E "(webkit|gtk|javascript|gdk)" | head -20

echo "🎉 Ubuntu 22.04 ARM64 build environment setup completed successfully!"
echo "💡 You can now proceed with the Tauri build process."