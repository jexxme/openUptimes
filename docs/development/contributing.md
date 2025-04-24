# Contributing to OpenUptimes

We welcome contributions to OpenUptimes! This document provides guidelines and instructions for contributing to the project.

## Getting Started

### Prerequisites

- Node.js 18 or later
- Redis (local or remote)
- Git

### Setting Up Development Environment

1. Fork the repository on GitHub
2. Clone your fork:

```bash
git clone https://github.com/your-username/openuptimes.git
cd openuptimes
```

3. Install dependencies:

```bash
npm install
```

4. Set up your environment:

```bash
cp .env.example .env.local
```

5. Edit `.env.local` with your Redis connection:

```
REDIS_URL=redis://localhost:6379
NEXT_PUBLIC_SITE_NAME="OpenUptimes Dev"
NEXT_PUBLIC_SITE_DESCRIPTION="Development Environment"
NEXT_PUBLIC_REFRESH_INTERVAL=60000
```

6. Start the development server:

```bash
npm run dev
```

## Development Workflow

### Branching

Follow these guidelines for branches:

- `main`: Production-ready code
- `dev`: Development branch for upcoming features
- `feature/x`: Feature-specific branches
- `bugfix/x`: Bug fix branches

Always branch from `dev` for new features or bug fixes.

### Coding Style

We use ESLint and Prettier to enforce coding standards. Ensure your code passes linting:

```bash
npm run lint
```

### Testing

Write tests for new features and ensure existing tests pass:

```bash
npm run test
```

### Commit Message Format

We follow a simplified version of Conventional Commits:

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code changes that neither fix bugs nor add features
- `test`: Adding or updating tests
- `chore`: Changes to the build process or auxiliary tools

Example: `feat: add service testing feature`

## Pull Request Process

1. Create a pull request against the `dev` branch
2. Ensure your code passes linting and tests
3. Update documentation if needed
4. Add a clear description of your changes
5. Wait for code review and address any feedback

## Code Structure

Understanding the codebase structure helps make better contributions:

```
openuptimes/
├── app/                # Next.js App Router
│   ├── api/            # API routes
│   ├── admin/          # Admin interface
│   ├── debug/          # Debug interfaces
│   └── ...             # Other app pages
├── components/         # React components
├── hooks/              # Custom React hooks
├── lib/                # Utility functions and libraries
│   ├── redis/          # Redis-related utilities
│   ├── services/       # Service management
│   └── ...             # Other utilities
├── public/             # Static assets
└── scripts/            # Build and helper scripts
```

## Feature Requests and Bug Reports

- Use the GitHub Issues section for bug reports and feature requests
- Search existing issues before creating a new one
- Provide as much information as possible when reporting bugs
- For feature requests, describe the proposed feature and its use case

## Documentation

Update documentation when adding or modifying features:

1. Update relevant files in the `docs/` directory
2. Update inline code comments for complex functionality
3. Update the README.md if needed

## Community Guidelines

- Be respectful and inclusive
- Provide constructive feedback
- Help other contributors when possible
- Focus on the issue, not the person

## License

By contributing to OpenUptimes, you agree that your contributions will be licensed under the project's [PolyForm Noncommercial License 1.0.0](https://github.com/openuptimes/openuptimes/blob/main/LICENSE).

## Questions?

If you have any questions, feel free to open an issue or reach out to the maintainers.

Thank you for contributing to OpenUptimes! 