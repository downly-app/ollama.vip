# 多架构构建支持文档

## 概述

本项目支持多架构构建，当前专注于主流平台以确保稳定性和可靠性。通过GitHub Actions自动构建以下平台的安装包：

## 当前支持的平台和架构

### Windows
- **x64 (64位)**: `x86_64-pc-windows-msvc`
- **x86 (32位)**: `i686-pc-windows-msvc`

### macOS
- **Intel (x64)**: `x86_64-apple-darwin`
- **Apple Silicon (ARM64)**: `aarch64-apple-darwin` (原生构建)

### Linux
- **x64 (64位)**: `x86_64-unknown-linux-gnu`

## 暂时移除的架构支持

由于技术限制和构建复杂性，以下架构暂时从自动构建中移除：

### Linux ARM64 (aarch64)
- **原因**: GitHub Actions ARM64 运行器不支持私有仓库
- **技术状态**: 配置已就绪，等待 GitHub 支持私有仓库
- **替代方案**: 手动构建或使用 Docker 交叉编译

### Linux 32位 (i686)
- **原因**: `pkg-config` 交叉编译配置复杂，依赖包兼容性问题
- **替代方案**: 手动构建或使用 AppImage

### MIPS64 (mips64-unknown-linux-gnuabi64)
- **原因**: Rust 官方不再支持，`rust-std` 组件不可用
- **替代方案**: 使用旧版本 Rust 或其他架构

## 当前构建产物

每次发布会生成以下文件：

### Windows
- `ollama-pro_v{version}_x64_en-US.msi` (64位MSI安装包)
- `ollama-pro_v{version}_x64-setup.exe` (64位EXE安装包)
- `ollama-pro_v{version}_x86_en-US.msi` (32位MSI安装包)
- `ollama-pro_v{version}_x86-setup.exe` (32位EXE安装包)

### macOS
- `ollama-pro_v{version}_x64.dmg` (Intel Mac)
- `ollama-pro_v{version}_aarch64.dmg` (Apple Silicon Mac)

### Linux
- `ollama-pro_v{version}_amd64.deb` (x64 DEB包)
- `ollama-pro_v{version}_amd64.AppImage` (x64 AppImage)

## 技术限制和解决方案

### 1. 交叉编译挑战
- **pkg-config配置**: Linux交叉编译需要复杂的sysroot配置
- **依赖包兼容性**: 不同架构的系统库可能不完整或不兼容
- **工具链支持**: 某些架构的Rust工具链支持有限

### 2. 当前策略
- **原生构建优先**: macOS ARM64使用原生构建而非交叉编译
- **主流平台专注**: 优先保证x64平台的稳定性
- **私有仓库限制**: GitHub Actions ARM64运行器暂不支持私有仓库

### 3. 性能考虑
- 32位版本在内存使用上有4GB限制
- ARM64架构在某些场景下具有更好的性能功耗比
- WebView组件在不同架构上的性能可能有差异
- 构建时间已从8个架构优化到5个架构

## 发布流程

1. **创建版本标签**:
   ```bash
   git tag v1.3.5
   git push origin v1.3.5
   ```

2. **自动构建**: GitHub Actions会自动为所有支持的架构构建安装包

3. **发布验证**: 检查生成的Release中是否包含所有预期的文件

4. **用户反馈**: 收集不同平台用户的使用反馈

## 故障排除

### 构建失败常见问题
1. **交叉编译错误**: 检查目标架构的工具链是否正确安装
2. **依赖包缺失**: 验证系统依赖是否完整安装
3. **Rust目标不可用**: 确认目标架构在当前Rust版本中可用

### 手动构建指南
如果需要在不支持的架构上构建：
```bash
# 安装目标架构工具链
rustup target add <target-architecture>

# 配置交叉编译环境
export PKG_CONFIG_ALLOW_CROSS=1
export PKG_CONFIG_PATH=/usr/lib/<arch>/pkgconfig

# 构建
yarn tauri build --target <target-architecture>
```

### 运行时问题
1. 检查系统依赖是否完整
2. 验证WebView组件是否正常工作
3. 查看应用日志获取详细错误信息

## 未来改进计划

### 短期目标
1. **优化现有构建**: 改进缓存策略，减少构建时间
2. **增强测试**: 为每个支持的架构添加基本功能测试
3. **监控GitHub更新**: 关注ARM64运行器对私有仓库的支持进展

### 中期目标
1. **ARM64 Linux支持**: 等待GitHub Actions对私有仓库开放ARM64运行器
2. **改进交叉编译**: 为剩余架构配置proper sysroot和pkg-config
3. **用户反馈收集**: 建立架构需求调研机制

### 长期目标
1. **国产平台专项支持**: 与国产硬件厂商合作测试
2. **自定义构建服务**: 允许用户请求特定架构构建
3. **性能优化**: 针对不同架构的特定优化

## 联系和反馈

如果您在特定架构上遇到问题，请通过GitHub Issues报告，并提供：
- 操作系统和架构信息
- 详细的错误日志
- 复现步骤

我们会优先处理主流平台的问题，并根据用户反馈调整对特定架构的支持策略。