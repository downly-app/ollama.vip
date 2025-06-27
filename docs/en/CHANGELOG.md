# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned Features
- File upload support
- Voice input functionality
- Plugin system
- Theme customization
- Multi-language support

## [0.1.0] - 2024-01-XX

### Added
- 🎉 Initial version release
- ✨ Basic chat functionality
  - Support for OpenAI GPT series models (gpt-4o, gpt-4o-mini, gpt-4-turbo)
  - Support for DeepSeek models (deepseek-chat, deepseek-reasoner)
  - Streaming response display
  - Message editing, deletion, copying, and resending
- 📊 Model management system
  - Browse Ollama model library
  - Model search and filtering
  - Model download and installation
  - Model details viewing
- 🎨 Modern user interface
  - Dark theme design
  - Responsive layout
  - Smooth animation effects
  - Unified scrollbar styling
- 💬 Conversation management
  - Create, delete, and search conversations
  - Conversation history persistence
  - Adjustable sidebar width
- 📝 Markdown rendering
  - Complete Markdown support
  - Code syntax highlighting
  - Tables, lists, quotes, and other formats
- ⚡ Performance optimization
  - Native performance based on Tauri
  - Efficient state management
  - Fast startup and response

### Tech Stack
- **Frontend**: React 18.3 + TypeScript 5.5 + Vite 6.3
- **Desktop**: Tauri 1.5 + Rust
- **UI**: Tailwind CSS 3.4 + Radix UI
- **State Management**: Zustand
- **Routing**: React Router
- **Icons**: Lucide React

### Architecture Features
- Modular component design
- Type-safe TypeScript
- Unified styling system
- Extensible plugin architecture
- Local data persistence

---

## Version Notes

### Version Number Format
This project uses semantic versioning: `MAJOR.MINOR.PATCH`

- **MAJOR**: Incompatible API changes
- **MINOR**: Backwards-compatible functionality additions
- **PATCH**: Backwards-compatible bug fixes

### Change Types
- `Added` - New features
- `Changed` - Changes to existing functionality
- `Deprecated` - Soon-to-be removed features
- `Removed` - Removed features
- `Fixed` - Bug fixes
- `Security` - Security-related fixes

### Release Cycle
- **Major versions**: Released based on significant feature updates
- **Minor versions**: Monthly releases with new features and improvements
- **Patch versions**: Released as needed, mainly for bug fixes 