# Markdown 渲染器功能展示

这个文档展示了优化后的 React Markdown 渲染器的所有功能。

## 📋 功能特性

- ✅ **数学公式支持** - 使用 KaTeX 渲染数学公式
- ✅ **增强的代码块** - 语法高亮和复制功能
- ✅ **任务列表** - 完整的 GitHub 风格任务列表
- ✅ **警告框** - 支持多种类型的警告提示
- ✅ **响应式表格** - 美观的表格样式
- ✅ **外链支持** - 自动添加外链图标
- ✅ **图片懒加载** - 优化的图片加载体验

## 🧮 数学公式

### 内联数学公式

这是一个内联数学公式：$E = mc^2$，还有 $\int_0^1 x^2 dx = \frac{1}{3}$

### 块级数学公式

$$
\begin{aligned}
\nabla \times \vec{\mathbf{B}} -\, \frac1c\, \frac{\partial\vec{\mathbf{E}}}{\partial t} &= \frac{4\pi}{c}\vec{\mathbf{j}} \\
\nabla \cdot \vec{\mathbf{E}} &= 4 \pi \rho \\
\nabla \times \vec{\mathbf{E}}\, +\, \frac1c\, \frac{\partial\vec{\mathbf{B}}}{\partial t} &= \vec{\mathbf{0}} \\
\nabla \cdot \vec{\mathbf{B}} &= 0
\end{aligned}
$$

## 💻 代码块

### JavaScript 代码

```javascript
// 斐波那契数列
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

// 使用记忆化优化
const fibMemo = (function() {
  const cache = {};
  return function(n) {
    if (n in cache) return cache[n];
    if (n <= 1) return n;
    cache[n] = fibMemo(n - 1) + fibMemo(n - 2);
    return cache[n];
  };
})();

console.log(fibMemo(10)); // 55
```

### Python 代码

```python
import numpy as np
import matplotlib.pyplot as plt

# 生成数据
x = np.linspace(0, 10, 100)
y = np.sin(x) * np.exp(-x/10)

# 创建图表
plt.figure(figsize=(10, 6))
plt.plot(x, y, 'b-', linewidth=2, label='sin(x) * exp(-x/10)')
plt.xlabel('x')
plt.ylabel('y')
plt.title('衰减正弦波')
plt.legend()
plt.grid(True, alpha=0.3)
plt.show()
```

### Shell 命令

```bash
# 构建项目
yarn install
yarn build

# 启动开发服务器
yarn dev

# 运行测试
yarn test
```

## 📝 任务列表

### 开发任务

- [x] 实现基础 Markdown 渲染
- [x] 添加语法高亮
- [x] 实现数学公式支持
- [ ] 添加图表支持
- [ ] 实现 PDF 导出
- [ ] 添加主题切换功能

### 设计任务

- [x] 设计深色主题
- [x] 优化移动端适配
- [ ] 添加动画效果
- [ ] 实现自定义主题

## 🎨 样式元素

### 文本样式

这是 **粗体文本**，这是 *斜体文本*，这是 ~~删除线文本~~。

你也可以使用 `内联代码` 来突出显示代码片段。

### 链接

- [内部链接](./build.md)
- [外部链接](https://github.com)
- [邮箱链接](mailto:example@example.com)

## 📊 表格

| 功能 | 状态 | 优先级 | 预计完成时间 |
|------|------|--------|-------------|
| 数学公式 | ✅ 完成 | 高 | 2024-01-15 |
| 代码高亮 | ✅ 完成 | 高 | 2024-01-10 |
| 任务列表 | ✅ 完成 | 中 | 2024-01-20 |
| 图表支持 | 🔄 进行中 | 中 | 2024-02-01 |
| PDF 导出 | ⏳ 待开始 | 低 | 2024-02-15 |

## 💡 引用块

### 标准引用

> 这是一个标准的引用块。引用块可以包含多行文本，
> 并且会保持特殊的样式。引用块通常用于突出显示
> 重要的信息或者引用他人的话语。

### 嵌套引用

> 这是第一层引用
> 
> > 这是第二层引用
> > 
> > > 这是第三层引用

## 🚨 警告框

### 信息提示

> [!NOTE]
> 这是一个信息提示框，用于显示一般性的信息。

### 重要提示

> [!IMPORTANT]
> 这是一个重要提示框，用于显示重要的信息。

### 警告提示

> [!WARNING]
> 这是一个警告提示框，用于显示需要注意的信息。

### 错误提示

> [!CAUTION]
> 这是一个错误提示框，用于显示危险或错误的信息。

## 📸 图片

### 标准图片

![示例图片](https://via.placeholder.com/600x300/4A90E2/FFFFFF?text=Markdown+Image+Example)

### 带标题的图片

![响应式设计示例](https://via.placeholder.com/800x400/7B68EE/FFFFFF?text=Responsive+Design "响应式设计示例")

## 📋 列表

### 无序列表

- 水果
  - 苹果
  - 香蕉
  - 橙子
- 蔬菜
  - 胡萝卜
  - 西兰花
  - 菠菜

### 有序列表

1. 第一步：准备开发环境
2. 第二步：创建项目结构
3. 第三步：实现核心功能
   1. 设置路由
   2. 创建组件
   3. 添加样式
4. 第四步：测试和优化

## 🎯 其他功能

### 水平分割线

---

### 键盘快捷键

使用 <kbd>Ctrl</kbd> + <kbd>C</kbd> 复制，<kbd>Ctrl</kbd> + <kbd>V</kbd> 粘贴。

### 标记文本

这是一段包含 ==高亮文本== 的段落。

### 脚注

这是一个带脚注的文本[^1]。

[^1]: 这是脚注的内容。

### 缩略语

HTML 是 *[HTML]: HyperText Markup Language 的缩写。

## 🔧 技术细节

### 性能优化

1. **组件记忆化**：使用 `React.memo` 优化组件渲染
2. **懒加载**：图片使用 `loading="lazy"` 属性
3. **代码分割**：动态导入减少初始加载时间
4. **缓存策略**：合理使用 `useMemo` 和 `useCallback`

### 可访问性

- 支持键盘导航
- 正确的 ARIA 标签
- 高对比度模式支持
- 屏幕阅读器友好

### 响应式设计

- 移动端优化
- 触摸友好的交互
- 自适应字体大小
- 横屏模式支持

## 📝 结论

这个优化后的 Markdown 渲染器提供了丰富的功能和优秀的用户体验。通过整合多个插件和自定义组件，我们实现了：

- 🎨 美观的视觉效果
- 🚀 优秀的性能表现
- 📱 完整的响应式支持
- ♿ 良好的可访问性
- 🔧 高度的可定制性

希望这个渲染器能够满足您的需求！ 