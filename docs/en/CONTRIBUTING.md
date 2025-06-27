# Contributing to Ollama Pro

Thank you for your interest in contributing to Ollama Pro! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Code Style](#code-style)
- [Release Process](#release-process)

## Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct. Please be respectful and constructive in all interactions.

## Getting Started

### Prerequisites

- Node.js (LTS version)
- Yarn package manager
- Rust (latest stable)
- Git

### Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/your-username/ollama-gui.git
   cd ollama-gui
   ```

2. **Install Dependencies**
   ```bash
   yarn install
   ```

3. **Install Rust Dependencies**
   ```bash
   cd src-tauri
   cargo build
   cd ..
   ```

4. **Start Development Server**
   ```bash
   yarn tauri:dev
   ```

## Making Changes

### Branch Naming Convention

- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation updates
- `refactor/description` - Code refactoring
- `test/description` - Test improvements

### Commit Message Format

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
type(scope): description

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(ui): add dark mode toggle
fix(api): resolve connection timeout issue
docs(readme): update installation instructions
```

## Testing

### Running Tests

```bash
# Run all tests
yarn test

# Run frontend linting
yarn lint

# Run TypeScript type checking
yarn type-check

# Run Rust tests
cargo test --manifest-path src-tauri/Cargo.toml
```

### Writing Tests

- Write unit tests for new functions and components
- Add integration tests for new features
- Ensure all tests pass before submitting PR
- Aim for good test coverage

## Submitting Changes

### Pull Request Process

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**
   - Write clean, well-documented code
   - Follow the existing code style
   - Add tests for new functionality

3. **Test Your Changes**
   ```bash
   yarn test
   yarn build
   ```

4. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

5. **Push to Fork**
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Create Pull Request**
   - Use a clear, descriptive title
   - Provide detailed description of changes
   - Reference any related issues
   - Add screenshots for UI changes

### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tests pass locally
- [ ] Added tests for new functionality
- [ ] Manual testing completed

## Screenshots (if applicable)
[Add screenshots here]

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No breaking changes (or clearly documented)
```

## Code Style

### Frontend (TypeScript/React)

- Use TypeScript for type safety
- Follow ESLint configuration
- Use functional components with hooks
- Implement proper error handling
- Use meaningful variable and function names

### Backend (Rust)

- Follow Rust naming conventions
- Use `cargo fmt` for formatting
- Run `cargo clippy` for linting
- Handle errors properly with `Result<T, E>`
- Write documentation comments

### General Guidelines

- Keep functions small and focused
- Use descriptive names for variables and functions
- Add comments for complex logic
- Remove unused code and imports
- Follow DRY (Don't Repeat Yourself) principle

## Pre-commit Hooks

We use pre-commit hooks to ensure code quality:

```bash
# Install pre-commit
pip install pre-commit

# Install hooks
pre-commit install

# Run hooks manually
pre-commit run --all-files
```

## Release Process

### For Maintainers

1. **Update Version**
   ```bash
   # Windows
   .\scripts\release.ps1 v1.0.0
   
   # Linux/macOS
   ./scripts/release.sh v1.0.0
   ```

2. **GitHub Actions**
   - Automated builds for all platforms
   - Release artifacts uploaded automatically
   - Release notes generated from commits

### Version Numbering

We follow [Semantic Versioning](https://semver.org/):
- `MAJOR.MINOR.PATCH`
- Major: Breaking changes
- Minor: New features (backward compatible)
- Patch: Bug fixes (backward compatible)

## Getting Help

- **Issues**: Report bugs or request features
- **Discussions**: Ask questions or discuss ideas
- **Discord**: Join our community chat (if available)
- **Email**: Contact maintainers directly

## Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes
- GitHub contributors page

Thank you for contributing to Ollama Pro! 🚀