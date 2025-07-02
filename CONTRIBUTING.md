# Contributing to Lion Football Academy

🦁 **Welcome to the Lion Football Academy community!** 

We appreciate your interest in contributing to this project. This guide will help you understand how to contribute effectively.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing Requirements](#testing-requirements)
- [Pull Request Process](#pull-request-process)
- [Issue Guidelines](#issue-guidelines)
- [Security Considerations](#security-considerations)

## 🤝 Code of Conduct

This project adheres to a code of conduct that we expect all contributors to follow:

- **Be respectful** and inclusive in all interactions
- **Be collaborative** and helpful to other contributors
- **Be professional** in all communications
- **Focus on the project** and avoid personal attacks
- **Report inappropriate behavior** to project maintainers

## 🚀 Getting Started

### Prerequisites

Before contributing, ensure you have:

- **Node.js 18.x** or higher installed
- **Git** configured with your GitHub account
- **npm** package manager
- Basic knowledge of **React.js** and **Node.js**

### Local Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/your-username/lion-football-academy.git
   cd lion-football-academy
   ```

2. **Install Dependencies**
   ```bash
   # Backend
   cd backend
   npm install
   
   # Frontend
   cd ../frontend
   npm install
   ```

3. **Environment Setup**
   ```bash
   # Copy environment templates
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```

4. **Start Development Servers**
   ```bash
   # Terminal 1: Backend
   cd backend && npm run dev
   
   # Terminal 2: Frontend
   cd frontend && npm start
   ```

5. **Verify Setup**
   - Backend API: http://localhost:5001
   - Frontend: http://localhost:3000
   - Test login: admin / admin123

## 🔄 Development Workflow

### Branch Strategy

We use **Git Flow** branching model:

- **`main`**: Production-ready code
- **`develop`**: Integration branch for features
- **`feature/*`**: New features (e.g., `feature/player-statistics`)
- **`bugfix/*`**: Bug fixes (e.g., `bugfix/authentication-error`)
- **`hotfix/*`**: Critical production fixes

### Creating Feature Branches

```bash
# Start from develop branch
git checkout develop
git pull origin develop

# Create feature branch
git checkout -b feature/your-feature-name

# Work on your feature...
git add .
git commit -m "feat: add your feature description"

# Push to your fork
git push origin feature/your-feature-name
```

### Commit Message Convention

We follow **Conventional Commits** specification:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```bash
feat: add player performance analytics dashboard
fix: resolve authentication token expiration issue
docs: update API documentation for match endpoints
test: add unit tests for user authentication
```

## 📏 Coding Standards

### JavaScript/React Standards

- **ES6+** modern JavaScript syntax
- **Functional components** with hooks (preferred)
- **ESLint** compliance (run `npm run lint`)
- **Prettier** formatting (run `npm run format`)
- **JSDoc** comments for complex functions

### Component Structure

```jsx
import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';

/**
 * Component description
 * @param {Object} props - Component props
 * @param {string} props.title - Component title
 */
const MyComponent = ({ title }) => {
  const [data, setData] = useState([]);
  
  const fetchData = useCallback(async () => {
    // Implementation
  }, []);
  
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  return (
    <div className="my-component">
      <h2>{title}</h2>
      {/* Component content */}
    </div>
  );
};

MyComponent.propTypes = {
  title: PropTypes.string.isRequired,
};

export default MyComponent;
```

### API Endpoint Standards

```javascript
// Use descriptive route names
router.get('/api/players/:id/statistics', getPlayerStatistics);

// Proper error handling
const getPlayerStatistics = async (req, res) => {
  try {
    const { id } = req.params;
    const statistics = await playerService.getStatistics(id);
    res.json({ success: true, data: statistics });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch player statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
```

## 🧪 Testing Requirements

### Before Submitting

All contributions must include appropriate tests:

#### Frontend Testing
```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- PlayerStatistics.test.js
```

#### Backend Testing
```bash
# Run API tests
npm test

# Run specific test suite
npm test -- --grep "Authentication"
```

### Test Categories

1. **Unit Tests**: Individual component/function testing
2. **Integration Tests**: API endpoint testing
3. **E2E Tests**: Complete user workflow testing
4. **Performance Tests**: Bundle size and load time validation

### Writing Tests

```javascript
// Component test example
import { render, screen, fireEvent } from '@testing-library/react';
import PlayerList from '../PlayerList';

describe('PlayerList Component', () => {
  test('displays player list correctly', () => {
    const mockPlayers = [
      { id: 1, name: 'John Doe', position: 'Forward' }
    ];
    
    render(<PlayerList players={mockPlayers} />);
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Forward')).toBeInTheDocument();
  });
});
```

## 📝 Pull Request Process

### Before Creating a PR

1. **Sync with latest changes**
   ```bash
   git checkout develop
   git pull upstream develop
   git checkout feature/your-feature
   git rebase develop
   ```

2. **Run quality checks**
   ```bash
   npm run lint
   npm test
   npm run build
   ```

3. **Update documentation** if needed

### PR Requirements

- **Clear title** describing the change
- **Detailed description** of what was changed and why
- **Link to related issues** (e.g., "Fixes #123")
- **Screenshots** for UI changes
- **Test evidence** showing the feature works
- **Breaking changes** clearly documented

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Screenshots (if applicable)
Add screenshots here

## Related Issues
Fixes #(issue number)
```

### Review Process

1. **Automated checks** must pass (CI/CD, linting, tests)
2. **Code review** by at least one maintainer
3. **Manual testing** for significant features
4. **Documentation review** for public API changes
5. **Security review** for authentication/authorization changes

## 🐛 Issue Guidelines

### Bug Reports

Use the **Bug Report** template:

```markdown
**Bug Description**
Clear description of the bug

**Steps to Reproduce**
1. Go to '...'
2. Click on '...'
3. Scroll down to '...'
4. See error

**Expected Behavior**
What should happen

**Screenshots**
If applicable, add screenshots

**Environment**
- OS: [e.g. macOS, Windows, Linux]
- Browser: [e.g. Chrome, Firefox, Safari]
- Version: [e.g. 1.0.0]
```

### Feature Requests

Use the **Feature Request** template:

```markdown
**Feature Description**
Clear description of the proposed feature

**Problem it Solves**
What problem does this feature address?

**Proposed Solution**
How should this feature work?

**Alternatives Considered**
Other solutions you've considered

**Additional Context**
Any other context, mockups, or examples
```

## 🔒 Security Considerations

### Security Guidelines

- **Never commit** sensitive data (passwords, keys, tokens)
- **Use environment variables** for configuration
- **Validate all inputs** on both frontend and backend
- **Follow authentication best practices**
- **Report security vulnerabilities** privately

### Reporting Security Issues

For security vulnerabilities:

1. **DO NOT** create public issues
2. **Email** security@lionfootballacademy.com
3. **Include** detailed information about the vulnerability
4. **Wait** for response before public disclosure

## 📚 Additional Resources

### Documentation

- **API Documentation**: [backend/API_DOCUMENTATION.md](backend/API_DOCUMENTATION.md)
- **User Guide**: [backend/USER_GUIDE.md](backend/USER_GUIDE.md)
- **System Architecture**: [backend/SYSTEM_ARCHITECTURE.md](backend/SYSTEM_ARCHITECTURE.md)
- **Testing Guide**: [frontend/TESTING.md](frontend/TESTING.md)

### Learning Resources

- **React Documentation**: https://reactjs.org/docs
- **Node.js Best Practices**: https://github.com/goldbergyoni/nodebestpractices
- **JavaScript Style Guide**: https://github.com/airbnb/javascript
- **Testing Best Practices**: https://github.com/goldbergyoni/javascript-testing-best-practices

### Community

- **GitHub Discussions**: For general questions and ideas
- **GitHub Issues**: For bugs and specific feature requests
- **Code Review**: Participate in reviewing other contributions

## 🎉 Recognition

Contributors will be recognized in:

- **README.md** contributors section
- **Release notes** for significant contributions
- **GitHub contributors** graph
- **Annual contributor acknowledgments**

## 📞 Getting Help

If you need help contributing:

1. **Check existing documentation** first
2. **Search closed issues** for similar questions
3. **Create a discussion** for general questions
4. **Ask in your PR** for code-specific help
5. **Contact maintainers** for urgent issues

---

**Thank you for contributing to Lion Football Academy! 🦁⚽**

*Your contributions help build better football academy management for communities worldwide.*