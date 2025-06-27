# Development Documentation

## 📋 Table of Contents

- [Development Environment Setup](#development-environment-setup)
- [Project Architecture](#project-architecture)
- [Development Standards](#development-standards)
- [API Documentation](#api-documentation)
- [Component Documentation](#component-documentation)
- [State Management](#state-management)
- [Style Guide](#style-guide)
- [Testing Guide](#testing-guide)
- [Build and Deployment](#build-and-deployment)
- [Troubleshooting](#troubleshooting)

## 🛠️ Development Environment Setup

### System Requirements

- **Operating System**: Windows 10+, macOS 10.15+, Linux
- **Node.js**: >= 18.0.0
- **Rust**: >= 1.70.0
- **Git**: Latest version

### Detailed Installation Steps

#### 1. Install Node.js
```bash
# Install Node.js using nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18
```

#### 2. Install Rust
```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env

# Verify installation
rustc --version
cargo --version
```

#### 3. Clone Project
```bash
git clone https://github.com/your-username/ollama-pro.git
cd ollama-pro
```

#### 4. Install Dependencies
```bash
# Install frontend dependencies
npm install

# Install Tauri CLI
npm install -g @tauri-apps/cli
```

#### 5. Development Environment Configuration
```bash
# Copy environment variables file
cp .env.example .env.local

# Edit environment variables
nano .env.local
```

### IDE Configuration

#### VS Code Recommended Extensions
```json
{
  "recommendations": [
    "tauri-apps.tauri-vscode",
    "rust-lang.rust-analyzer",
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-typescript-next"
  ]
}
```

#### VS Code Settings
```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.preferences.importModuleSpecifier": "relative"
}
```

## 🏗️ Project Architecture

### Overall Architecture

```
┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │
│   (React)       │◄──►│   (Tauri/Rust)  │
└─────────────────┘    └─────────────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌─────────────────┐
│   UI Layer      │    │   System APIs   │
│   (Components)  │    │   (File/Window) │
└─────────────────┘    └─────────────────┘
         │
         ▼
┌─────────────────┐
│   State Layer   │
│   (Zustand)     │
└─────────────────┘
```

### Frontend Architecture

#### Component Hierarchy
```
App
├── AppLayout
│   ├── Sidebar
│   ├── Toolbar
│   └── Content
│       ├── General (Dashboard)
│       ├── Models (Model Management)
│       ├── Chat (Chat Interface)
│       └── ModelDetail
```

#### State Management Architecture
```
┌─────────────────┐
│   Chat Store    │ ── Chat state, message history
├─────────────────┤
│   Model Store   │ ── Model list, current model
├─────────────────┤
│   UI Store      │ ── Interface state, theme settings
└─────────────────┘
```

### Data Flow

```
User Action → Component → Store → API Service → Backend → External API
     ↑                                                          │
     └──────────── UI Update ← Store Update ←──────────────────┘
```

## 📝 Development Standards

### Code Standards

#### TypeScript Standards
```typescript
// ✅ Good practice
interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
}

// ❌ Avoid this
const message: any = {
  id: "123",
  content: "hello"
};
```

#### React Component Standards
```typescript
// ✅ Function component + TypeScript
interface ChatMessageProps {
  message: ChatMessage;
  onEdit?: (id: string, content: string) => void;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ 
  message, 
  onEdit 
}) => {
  // Component logic
};

export default ChatMessage;
```

#### File Naming Standards
- **Component files**: PascalCase (e.g., `ChatMessage.tsx`)
- **Utility files**: camelCase (e.g., `dateUtils.ts`)
- **Constant files**: UPPER_SNAKE_CASE (e.g., `API_CONSTANTS.ts`)
- **Type files**: camelCase + `.types.ts` (e.g., `chat.types.ts`)

### Git Commit Standards

#### Commit Message Format
```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

#### Type Descriptions
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation update
- `style`: Code formatting
- `refactor`: Code refactoring
- `test`: Test related
- `chore`: Build tools, dependency updates

#### Example
```bash
feat(chat): add message editing functionality

- Add edit button to chat messages
- Implement inline editing with textarea
- Add save/cancel actions
- Update message store with edit method

Closes #123
```

## 🔌 API Documentation

### AI API Service

#### Basic Configuration
```typescript
interface AIConfig {
  provider: 'openai' | 'deepseek';
  apiKey: string;
  baseURL?: string;
  model: string;
}
```

#### Send Message
```typescript
async function sendMessage(
  messages: ChatMessage[],
  config: AIConfig,
  onChunk?: (chunk: string) => void
): Promise<string>
```

#### Usage Example
```typescript
import { aiApiService } from '@/services/aiApi';

const config: AIConfig = {
  provider: 'openai',
  apiKey: 'your-api-key',
  model: 'gpt-4o'
};

const response = await aiApiService.sendMessage(
  messages,
  config,
  (chunk) => console.log('Received:', chunk)
);
```

### Model API

#### Get Model List
```typescript
async function fetchModels(
  page: number,
  search?: string,
  categories?: string[],
  sort?: string
): Promise<ModelResponse>
```

#### Download Model
```typescript
async function downloadModel(
  modelName: string,
  onProgress?: (progress: number) => void
): Promise<void>
```

## 🧩 Component Documentation

### Core Components

#### ChatMessage Component
```typescript
interface ChatMessageProps {
  message: {
    id: string;
    content: string;
    sender: 'user' | 'assistant';
    timestamp: Date;
    model?: string;
  };
  onEdit?: (messageId: string, newContent: string) => void;
  onDelete?: (messageId: string) => void;
  onResend?: (messageId: string, content: string) => void;
}
```

**Features**:
- Message display and formatting
- Markdown rendering
- Edit/delete/resend operations
- Copy message content
- Timestamp display

#### MessageList Component
```typescript
interface MessageListProps {
  conversations: Conversation[];
  currentChatId?: string;
  onSelectChat: (chatId: string) => void;
  onCreateChat: () => void;
  onDeleteChat: (chatId: string) => void;
}
```

**Features**:
- Conversation list display
- Search conversations
- Create new conversation
- Delete conversation
- Adjustable width

#### CustomSelect Component
```typescript
interface CustomSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'ghost' | 'outline';
}
```

### UI Component Library

#### Button Component
```typescript
// Basic button
<Button variant="default" size="md">
  Click me
</Button>

// Icon button
<Button variant="ghost" size="icon">
  <Settings className="w-4 h-4" />
</Button>
```

#### Input Component
```typescript
// Text input
<Input
  type="text"
  placeholder="Please enter..."
  value={value}
  onChange={(e) => setValue(e.target.value)}
/>

// Textarea
<Textarea
  placeholder="Please enter message..."
  value={message}
  onChange={(e) => setMessage(e.target.value)}
  rows={3}
/>
```

## 🗄️ State Management

### Chat Store

#### State Structure
```typescript
interface ChatState {
  conversations: Conversation[];
  currentChatId: string | null;
  isLoading: boolean;
  error: string | null;
}
```

#### Main Methods
```typescript
interface ChatActions {
  createConversation: (title?: string) => string;
  deleteConversation: (id: string) => void;
  selectConversation: (id: string) => void;
  addMessage: (chatId: string, message: ChatMessage) => void;
  updateMessage: (chatId: string, messageId: string, content: string) => void;
  deleteMessage: (chatId: string, messageId: string) => void;
}
```

### Model Store

#### State Structure
```typescript
interface ModelState {
  models: Model[];
  currentModel: string | null;
  isLoading: boolean;
  downloadProgress: Record<string, number>;
}
```

### UI Store

#### State Structure
```typescript
interface UIState {
  theme: 'light' | 'dark';
  sidebarWidth: number;
  language: string;
  isSettingsOpen: boolean;
}
```

## 🎨 Style Guide

### Design System

#### Color Palette
```css
:root {
  /* Primary colors */
  --primary: 220 14% 96%;
  --primary-foreground: 220 9% 46%;
  
  /* Secondary colors */
  --secondary: 220 14% 96%;
  --secondary-foreground: 220 9% 46%;
  
  /* Accent colors */
  --accent: 220 14% 96%;
  --accent-foreground: 220 9% 46%;
}
```

#### Typography
```css
/* Headings */
.text-h1 { @apply text-4xl font-bold; }
.text-h2 { @apply text-3xl font-semibold; }
.text-h3 { @apply text-2xl font-medium; }

/* Body text */
.text-body { @apply text-base; }
.text-small { @apply text-sm; }
.text-xs { @apply text-xs; }
```

#### Spacing
```css
/* Consistent spacing scale */
.space-xs { @apply p-1; }
.space-sm { @apply p-2; }
.space-md { @apply p-4; }
.space-lg { @apply p-6; }
.space-xl { @apply p-8; }
```

### Component Styling

#### Button Variants
```tsx
// Primary button
<Button variant="default">Primary Action</Button>

// Secondary button
<Button variant="secondary">Secondary Action</Button>

// Ghost button
<Button variant="ghost">Subtle Action</Button>

// Destructive button
<Button variant="destructive">Delete</Button>
```

#### Layout Components
```tsx
// Card container
<Card className="p-6">
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>
    Content here
  </CardContent>
</Card>
```

## 🧪 Testing Guide

### Testing Strategy

#### Unit Testing
```typescript
// Component testing with React Testing Library
import { render, screen, fireEvent } from '@testing-library/react';
import ChatMessage from '@/components/ChatMessage';

describe('ChatMessage', () => {
  it('should render message content', () => {
    const message = {
      id: '1',
      content: 'Hello world',
      sender: 'user' as const,
      timestamp: new Date()
    };
    
    render(<ChatMessage message={message} />);
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });
});
```

#### Integration Testing
```typescript
// Store testing
import { renderHook, act } from '@testing-library/react';
import { useChatStore } from '@/stores/chatStore';

describe('ChatStore', () => {
  it('should create new conversation', () => {
    const { result } = renderHook(() => useChatStore());
    
    act(() => {
      result.current.createConversation('Test Chat');
    });
    
    expect(result.current.conversations).toHaveLength(1);
    expect(result.current.conversations[0].title).toBe('Test Chat');
  });
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test ChatMessage.test.tsx
```

## 🚀 Build and Deployment

### Development Build

```bash
# Start development server
npm run tauri dev

# Start frontend only
npm run dev

# Start with specific port
npm run dev -- --port 3000
```

### Production Build

```bash
# Build for production
npm run tauri build

# Build frontend only
npm run build

# Preview production build
npm run preview
```

### Build Configuration

#### Tauri Configuration
```json
{
  "build": {
    "beforeBuildCommand": "npm run build",
    "beforeDevCommand": "npm run dev",
    "devPath": "http://localhost:1421",
    "distDir": "../dist"
  }
}
```

#### Vite Configuration
```typescript
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-select']
        }
      }
    }
  }
});
```

## 🔧 Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Kill process using port 1421
npx kill-port 1421

# Or use different port
npm run dev -- --port 3000
```

#### Rust Compilation Errors
```bash
# Update Rust toolchain
rustup update

# Clean build cache
cargo clean

# Rebuild
npm run tauri build
```

#### Node Modules Issues
```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Performance Optimization

#### Bundle Analysis
```bash
# Analyze bundle size
npm run build:analyze

# Check for duplicate dependencies
npm ls --depth=0
```

#### Memory Optimization
```typescript
// Use React.memo for expensive components
const ExpensiveComponent = React.memo(({ data }) => {
  return <div>{/* Complex rendering */}</div>;
});

// Use useMemo for expensive calculations
const expensiveValue = useMemo(() => {
  return heavyCalculation(data);
}, [data]);
```

### Debugging

#### Frontend Debugging
```typescript
// Enable React DevTools
if (process.env.NODE_ENV === 'development') {
  window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = window.__REACT_DEVTOOLS_GLOBAL_HOOK__ || {};
}

// Debug store state
console.log('Current state:', useChatStore.getState());
```

#### Backend Debugging
```rust
// Enable debug logging
#[cfg(debug_assertions)]
println!("Debug: {:?}", value);

// Use Tauri DevTools
#[cfg(debug_assertions)]
app.get_window("main").unwrap().open_devtools();
```

## 📚 Resources

### Documentation
- [Tauri Documentation](https://tauri.app/)
- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)

### Tools
- [VS Code](https://code.visualstudio.com/)
- [React DevTools](https://react.dev/learn/react-developer-tools)
- [Tauri DevTools](https://github.com/tauri-apps/tauri-devtools)

### Community
- [Tauri Discord](https://discord.com/invite/tauri)
- [React Community](https://reactjs.org/community/support.html)
- [Rust Community](https://www.rust-lang.org/community)

---

This development documentation provides comprehensive guidance for contributing to the Ollama Pro project. For questions or suggestions, please open an issue or contact the development team. 