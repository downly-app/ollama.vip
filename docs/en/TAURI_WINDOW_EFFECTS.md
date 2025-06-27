# 🪟 Tauri Window Effects Implementation Guide

Based on the window effects analysis of downly-app, this document details how to implement the following effects in Tauri applications:

## 🎯 Implemented Features

1. ✅ **Auto-center on application startup with adaptive resolution**
2. ✅ **Hide original window title bar, use custom frontend window toolbar**
3. ✅ **Application window rounded corners effect**
4. ✅ **Resizable window with window state persistence**
5. ✅ **Title bar drag functionality**
6. ✅ **Window control buttons (minimize, maximize, close)**

## 📁 File Structure

```
src/
├── components/
│   ├── WindowControls.tsx          # Window control buttons component
│   └── layouts/
│       ├── AppLayout.tsx           # Main app layout (with drag)
│       └── TitleBar.tsx            # Title bar component (with drag)
├── styles/
│   └── titlebar.css                # Drag and window styles
└── App.tsx                         # Main app component

src-tauri/
├── src/
│   └── lib.rs                      # Rust backend window control logic
├── tauri.conf.json                 # Tauri configuration file
└── Cargo.toml                      # Rust dependencies configuration
```

## ⚙️ Configuration Files

### 1. Tauri Configuration (`src-tauri/tauri.conf.json`)

```json
{
  "app": {
    "windows": [
      {
        "title": "ollama-pro",
        "width": 1200,
        "height": 900,
        "minWidth": 1000,
        "minHeight": 700,
        "decorations": false,    // 🔑 Hide system title bar
        "transparent": true,     // 🔑 Enable transparency effects
        "resizable": true,       // 🔑 Allow resizing
        "center": true          // 🔑 Center on startup
      }
    ]
  },
  "permissions": [
    "core:window:allow-close",
    "core:window:allow-hide",
    "core:window:allow-show",
    "core:window:allow-maximize",
    "core:window:allow-minimize",
    "core:window:allow-unmaximize",
    "core:window:allow-unminimize",
    "core:window:allow-start-dragging",
    "core:window:allow-is-maximized",
    "core:window:allow-outer-position",
    "core:window:allow-outer-size",
    "core:window:allow-set-position",
    "core:window:allow-set-size"
  ]
}
```

### 2. Rust Dependencies Configuration (`src-tauri/Cargo.toml`)

```toml
[dependencies]
tauri = { version = "2", features = ["tray-icon", "image-ico", "image-png"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
dirs = "5.0"  # For getting configuration directory
```

## 🦀 Rust Backend Implementation

### Window State Management (`src-tauri/src/lib.rs`)

```rust
use tauri::{Manager, Window, PhysicalPosition, PhysicalSize};
use serde::{Serialize, Deserialize};
use std::fs;
use std::path::PathBuf;

// Window state structure
#[derive(Serialize, Deserialize, Debug, Clone)]
struct WindowState {
    x: i32,
    y: i32,
    width: u32,
    height: u32,
    maximized: bool,
}

// Window control commands
#[tauri::command]
fn minimize_window(window: Window) {
    let _ = window.minimize();
}

#[tauri::command]
fn maximize_window(window: Window) {
    if window.is_maximized().unwrap_or(false) {
        let _ = window.unmaximize();
    } else {
        let _ = window.maximize();
    }
}

#[tauri::command]
fn close_window(window: Window) {
    save_window_state(&window);  // Save state before closing
    let _ = window.close();
}

#[tauri::command]
fn start_dragging(window: Window) {
    let _ = window.start_dragging();
}
```

## 🎨 Frontend Implementation

### 1. Window Control Component (`src/components/WindowControls.tsx`)

```tsx
import React from 'react';
import { Minimize2, Maximize, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { invoke } from '@tauri-apps/api/tauri';

const WindowControls = () => {
  const handleMinimize = async () => {
    try {
      await invoke('minimize_window');
    } catch (error) {
      console.error('Failed to minimize window:', error);
    }
  };

  const handleMaximize = async () => {
    try {
      await invoke('maximize_window');
    } catch (error) {
      console.error('Failed to maximize window:', error);
    }
  };

  const handleClose = async () => {
    try {
      await invoke('close_window');
    } catch (error) {
      console.error('Failed to close window:', error);
    }
  };

  return (
    <div className="flex items-center space-x-1">
      <Button onClick={handleMinimize} aria-label="Minimize">
        <Minimize2 size={14} />
      </Button>
      <Button onClick={handleMaximize} aria-label="Maximize/Restore">
        <Maximize size={14} />
      </Button>
      <Button onClick={handleClose} aria-label="Close">
        <X size={14} />
      </Button>
    </div>
  );
};

export default WindowControls;
```

### 2. Drag Styles (`src/styles/titlebar.css`)

```css
/* 🔑 Define draggable region */
.drag-region {
  -webkit-app-region: drag;
  -webkit-user-select: none;
  user-select: none;
  cursor: default;
}

/* 🔑 Define non-draggable region for interactive elements like buttons */
.no-drag {
  -webkit-app-region: no-drag;
  -webkit-user-select: auto;
  user-select: auto;
  cursor: default;
}

/* 🔑 Application container styles - Implement rounded corners effect */
.app-container {
  height: 100vh;
  width: 100vw;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: transparent;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  position: relative;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}
```

### 3. Draggable Layout Component

```tsx
import { invoke } from '@tauri-apps/api/tauri';
import '@/styles/titlebar.css';

const AppLayout = ({ children, showTitleBar = true }) => {
  const handleDragStart = async () => {
    try {
      await invoke('start_dragging');
    } catch (error) {
      console.error('Failed to start dragging:', error);
    }
  };

  return (
    <div className="app-container">
      {showTitleBar && (
        <div 
          className="drag-region"  // 🔑 Draggable region
          onMouseDown={handleDragStart}
        >
          <div className="drag-region">
            {/* Title content */}
          </div>
          
          <div className="no-drag">  {/* 🔑 Non-draggable region */}
            <WindowControls />
          </div>
        </div>
      )}
      
      <div className="main-content">
        {children}
      </div>
    </div>
  );
};
```

## 🚀 Usage Methods

### 1. Use in Your Component

```tsx
import { AppLayout } from '@/components/layouts';
import { TitleBar } from '@/components/layouts';

// Method 1: Use AppLayout
function MyApp() {
  return (
    <AppLayout 
      showTitleBar={true}
      title="My Application"
      subtitle="v1.0.0"
    >
      {/* Your application content */}
    </AppLayout>
  );
}

// Method 2: Use TitleBar
function MyCustomLayout() {
  return (
    <div className="app-container">
      <TitleBar
        title="My Application"
        currentModel="gpt-4"
        onModelChange={handleModelChange}
        models={modelOptions}
      />
      {/* Your application content */}
    </div>
  );
}
```

### 2. Add Custom Right Actions

```tsx
<TitleBar
  title="My Application"
  rightActions={
    <>
      <Button variant="ghost" size="sm">
        Settings
      </Button>
      <Button variant="ghost" size="sm">
        Help
      </Button>
    </>
  }
/>
```

## 🎯 Key Points

### ✅ Required Configuration Items

1. **Tauri Configuration**: `decorations: false`, `transparent: true`
2. **Permission Configuration**: Window control related permissions
3. **CSS Classes**: `.drag-region` and `.no-drag`
4. **Rust Commands**: Window control and drag commands
5. **Dependency Installation**: `@tauri-apps/api`

### ⚠️ Notes

1. **Drag Region**: Ensure title bar area adds `drag-region` class
2. **Button Area**: Interactive elements must add `no-drag` class
3. **Event Handling**: Use `onMouseDown` instead of `onClick` to trigger drag
4. **Window State**: Automatically save and restore window position and size
5. **Transparent Background**: Ensure HTML/CSS background is set to transparent

## 🔧 Troubleshooting

### Common Issues

1. **Dragging Not Working**: Check CSS classes and permission configuration
2. **Button Not Responding**: Ensure `no-drag` class is added
3. **Window State Not Saved**: Check file write permissions
4. **Rounded Corners Not Displayed**: Ensure container styles are correctly applied

### Debugging Tips

```tsx
// Add debugging logs
const handleDragStart = async () => {
  console.log('Starting drag...');
  try {
    await invoke('start_dragging');
    console.log('Drag started successfully');
  } catch (error) {
    console.error('Failed to start dragging:', error);
  }
};
```

## 📚 Reference Resources

- [Tauri Window API Documentation](https://tauri.app/v1/api/js/window)
- [CSS -webkit-app-region Attribute](https://developer.mozilla.org/en-US/docs/Web/CSS/-webkit-app-region)
- [Downly-app Source Code Reference](./downly-app/)

---

With the above configuration, your Tauri application will have the same modern window effects as downly-app!🎉 