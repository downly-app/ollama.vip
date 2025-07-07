# 开发者指南 🚀

本文档提供了 Ollama Pro 项目的完整开发指南，包含工具链、最佳实践、测试流程等。

## 目录

- [快速开始](#快速开始)
- [开发工具链](#开发工具链)
- [代码规范](#代码规范)
- [测试指南](#测试指南)
- [性能优化](#性能优化)
- [调试工具](#调试工具)
- [部署流程](#部署流程)
- [常见问题](#常见问题)

## 快速开始

### 1. 环境要求

- **Node.js**: >= 18.0.0 (推荐 LTS 版本)
- **Yarn**: >= 1.22.0
- **Rust**: 最新稳定版
- **Git**: >= 2.20.0

### 2. 安装依赖

```bash
# 克隆项目
git clone <repository-url>
cd ollama.vip

# 安装依赖
yarn install

# 安装 Rust 依赖
cargo install tauri-cli
```

### 3. 开发服务器

```bash
# 启动开发服务器
yarn dev

# 或者启动 Tauri 开发模式
yarn tauri:dev
```

## 开发工具链

### 代码格式化

项目使用 **Prettier** 进行代码格式化：

```bash
# 格式化代码
yarn format

# 检查格式
yarn format:check
```

#### Prettier 配置

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "importOrder": ["^react", "^@tauri-apps/(.*)$", "^@/(.*)$", "^[./]"],
  "importOrderSeparation": true
}
```

### 代码检查

使用 **ESLint** 进行代码质量检查：

```bash
# 检查代码
yarn lint

# 修复可修复的问题
yarn lint:fix
```

#### ESLint 规则

- TypeScript 推荐规则
- React Hooks 规则
- React Refresh 规则
- 自定义规则调整

### 类型检查

使用 **TypeScript** 进行类型检查：

```bash
# 类型检查
yarn type-check
```

### Git 钩子

项目使用 **Husky** 和 **lint-staged** 进行提交前检查：

```bash
# 自动安装 Git 钩子
yarn postinstall
```

#### 提交前检查

- 代码格式化
- ESLint 检查
- TypeScript 类型检查

## 代码规范

### 文件命名

- **组件**: PascalCase (`MyComponent.tsx`)
- **Hook**: camelCase (`useMyHook.ts`)
- **工具函数**: camelCase (`myUtils.ts`)
- **类型定义**: PascalCase (`MyTypes.ts`)
- **样式文件**: kebab-case (`my-component.css`)

### 目录结构

```
src/
├── components/          # React 组件
│   ├── ui/             # UI 基础组件
│   ├── layouts/        # 布局组件
│   └── dialogs/        # 对话框组件
├── hooks/              # 自定义 Hook
├── pages/              # 页面组件
├── services/           # API 服务
├── stores/             # 状态管理
├── utils/              # 工具函数
├── types/              # 类型定义
├── styles/             # 样式文件
└── test/               # 测试文件
```

### 组件开发规范

#### 1. 组件文件结构

```typescript
// MyComponent.tsx
import React from 'react';
import { ComponentProps } from './types';

export interface MyComponentProps {
  title: string;
  onAction?: () => void;
}

export const MyComponent: React.FC<MyComponentProps> = ({ title, onAction }) => {
  return (
    <div className="my-component">
      <h1>{title}</h1>
      {onAction && <button onClick={onAction}>Action</button>}
    </div>
  );
};
```

#### 2. Hook 开发规范

```typescript
// useMyHook.ts
import { useState, useEffect } from 'react';

export interface UseMyHookOptions {
  enabled?: boolean;
}

export const useMyHook = (options: UseMyHookOptions = {}) => {
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Hook 逻辑...

  return { state, loading, error };
};
```

#### 3. 服务开发规范

```typescript
// myService.ts
import { BaseService } from './BaseService';

export interface MyServiceConfig {
  baseUrl: string;
  timeout?: number;
}

export class MyService extends BaseService {
  constructor(config: MyServiceConfig) {
    super(config);
  }

  async getData(id: string): Promise<MyData> {
    return this.get(`/data/${id}`);
  }
}
```

### 样式规范

#### 1. CSS 模块化

```typescript
// MyComponent.module.css
.container {
  display: flex;
  flex-direction: column;
}

.title {
  font-size: 1.5rem;
  font-weight: bold;
}

// MyComponent.tsx
import styles from './MyComponent.module.css';

export const MyComponent = () => {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Title</h1>
    </div>
  );
};
```

#### 2. Tailwind CSS

```typescript
// 使用 Tailwind 类
<div className="flex flex-col gap-4 p-4 bg-white rounded-lg shadow-md">
  <h1 className="text-xl font-bold text-gray-900">Title</h1>
</div>
```

## 测试指南

### 测试框架

项目使用 **Vitest** 作为测试框架：

```bash
# 运行测试
yarn test

# 运行测试并监听变化
yarn test:watch

# 生成测试覆盖率报告
yarn test:coverage

# 打开测试 UI
yarn test:ui
```

### 单元测试

#### 1. 组件测试

```typescript
// MyComponent.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('should render title correctly', () => {
    render(<MyComponent title="Test Title" />);
    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  it('should handle action click', () => {
    const mockAction = vi.fn();
    render(<MyComponent title="Test" onAction={mockAction} />);
    
    const button = screen.getByText('Action');
    fireEvent.click(button);
    
    expect(mockAction).toHaveBeenCalled();
  });
});
```

#### 2. Hook 测试

```typescript
// useMyHook.test.ts
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMyHook } from './useMyHook';

describe('useMyHook', () => {
  it('should return initial state', () => {
    const { result } = renderHook(() => useMyHook());
    
    expect(result.current.state).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });
});
```

#### 3. 服务测试

```typescript
// myService.test.ts
import { describe, it, expect, vi } from 'vitest';
import { MyService } from './myService';

describe('MyService', () => {
  it('should fetch data correctly', async () => {
    const mockData = { id: '1', name: 'Test' };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    const service = new MyService({ baseUrl: 'http://test.com' });
    const result = await service.getData('1');

    expect(result).toEqual(mockData);
    expect(fetch).toHaveBeenCalledWith('http://test.com/data/1');
  });
});
```

### E2E 测试

项目使用 **Playwright** 进行端到端测试：

```bash
# 运行 E2E 测试
yarn test:e2e

# 打开 E2E 测试 UI
yarn test:e2e:ui
```

#### E2E 测试示例

```typescript
// app.spec.ts
import { test, expect } from '@playwright/test';

test('应用基本功能', async ({ page }) => {
  await page.goto('/');
  
  // 检查标题
  await expect(page.getByText('Ollama Pro')).toBeVisible();
  
  // 测试导航
  await page.click('text=Models');
  await expect(page.getByText('Available Models')).toBeVisible();
});
```

## 性能优化

### 性能监控工具

项目提供了完整的性能监控工具：

```typescript
// 在组件中使用性能监控
import { usePerformanceMonitor } from '@/utils/devTools';

export const MyComponent = () => {
  const { measureRender } = usePerformanceMonitor('MyComponent');
  
  // 组件逻辑...
};
```

### 性能监控 API

```typescript
// 访问全局性能监控工具
const devTools = window.__DEV_TOOLS__;

// 获取性能指标
const metrics = devTools.performance.getAllMetrics();

// 获取内存使用情况
const memoryStats = devTools.memory.getMemoryStats();

// 获取组件渲染统计
const componentStats = devTools.reactPerformance.getAllComponentStats();
```

### 构建优化

```bash
# 分析打包体积
yarn build:analyze

# 检查 bundle 大小
yarn perf:bundle
```

#### Bundle 大小限制

- 主 JS 文件: < 500KB (gzip)
- 主 CSS 文件: < 50KB (gzip)
- Vendor JS 文件: < 800KB (gzip)

### 性能最佳实践

1. **组件优化**
   - 使用 React.memo 缓存组件
   - 使用 useMemo 缓存计算结果
   - 使用 useCallback 缓存回调函数

2. **代码分割**
   - 使用 React.lazy 懒加载组件
   - 按路由分割代码
   - 按功能分割代码

3. **图片优化**
   - 使用 WebP 格式
   - 实现图片懒加载
   - 提供不同尺寸的图片

## 调试工具

### 开发工具

在开发环境中，可以访问以下调试工具：

```javascript
// 在浏览器控制台中
window.__DEV_TOOLS__.debug.log('调试信息', { data: 'test' });
window.__DEV_TOOLS__.debug.warn('警告信息');
window.__DEV_TOOLS__.debug.error('错误信息');

// 导出日志
const logs = window.__DEV_TOOLS__.debug.exportLogs();
console.log(logs);
```

### 环境检测

```typescript
import { DevEnvironmentChecker } from '@/utils/devTools';

// 检查环境
const isDevMode = DevEnvironmentChecker.isDevMode();
const isTauriDev = DevEnvironmentChecker.isTauriDev();
const isWebDev = DevEnvironmentChecker.isWebDev();

// 获取环境信息
const envInfo = DevEnvironmentChecker.getEnvironmentInfo();
```

### 错误处理

```typescript
import { defaultErrorHandler, addBreadcrumb } from '@/utils/errorHandler';

try {
  // 业务逻辑
} catch (error) {
  // 添加面包屑
  addBreadcrumb('用户操作', 'user');
  
  // 处理错误
  const enhancedError = defaultErrorHandler.createEnhancedError(error, {
    code: 'BUSINESS_ERROR',
    context: { userId: '123' }
  });
  
  // 错误上报或用户提示
}
```

## 部署流程

### 本地构建

```bash
# 构建前端
yarn build

# 构建应用
yarn tauri:build

# 构建调试版本
yarn tauri:build:debug
```

### 自动化部署

项目使用 GitHub Actions 进行自动化部署：

1. **推送到 main 分支** - 自动构建和测试
2. **创建版本标签** - 自动构建并发布到 GitHub Releases
3. **Pull Request** - 自动运行测试和安全检查

### 版本发布

```bash
# 使用发布脚本
yarn release v1.0.0

# 或者手动创建标签
git tag v1.0.0
git push origin v1.0.0
```

## 常见问题

### 1. 开发服务器启动失败

**问题**: 端口被占用

**解决方案**:
```bash
# 使用其他端口
yarn dev --port 3001

# 或者杀死占用端口的进程
npx kill-port 3000
```

### 2. 类型检查失败

**问题**: TypeScript 类型错误

**解决方案**:
```bash
# 清除类型缓存
rm -rf node_modules/.cache
yarn install

# 重新生成类型
yarn type-check
```

### 3. 测试失败

**问题**: 测试环境问题

**解决方案**:
```bash
# 清除测试缓存
yarn test --clearCache

# 重新安装依赖
yarn clean:all
yarn install
```

### 4. 构建失败

**问题**: 构建过程中出错

**解决方案**:
```bash
# 清理构建缓存
yarn clean

# 重新构建
yarn build
```

### 5. Tauri 开发模式问题

**问题**: Tauri 开发模式无法启动

**解决方案**:
```bash
# 检查 Rust 工具链
rustup update

# 重新安装 Tauri CLI
cargo install tauri-cli --force

# 清理 Rust 缓存
cargo clean
```

## 贡献指南

### 提交规范

使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
feat: 添加新功能
fix: 修复问题
docs: 文档更新
style: 代码格式调整
refactor: 代码重构
test: 测试相关
chore: 构建或工具相关
```

### 分支策略

- **main**: 生产分支
- **develop**: 开发分支
- **feature/***: 功能分支
- **hotfix/***: 紧急修复分支

### Pull Request 流程

1. 从 develop 分支创建功能分支
2. 开发功能并添加测试
3. 提交 Pull Request
4. 代码审查和测试
5. 合并到 develop 分支

## 附录

### 依赖管理

```bash
# 检查依赖更新
yarn deps:check

# 交互式更新依赖
yarn deps:update

# 安全审计
yarn deps:audit
```

### 清理命令

```bash
# 清理构建产物
yarn clean

# 完全清理
yarn clean:all
```

### 开发调试

```bash
# 启动 HTTPS 开发服务器
yarn dev:https

# 启动网络访问
yarn dev:host

# 启动调试模式
yarn dev:debug
```

---

## 总结

本开发指南涵盖了项目开发的各个方面，从环境搭建到部署上线。遵循这些指南可以确保：

- ✅ 代码质量和一致性
- ✅ 高效的开发流程
- ✅ 全面的测试覆盖
- ✅ 优秀的性能表现
- ✅ 稳定的部署流程

如有任何问题或建议，请提交 Issue 或 Pull Request。

**Happy Coding! 🚀** 