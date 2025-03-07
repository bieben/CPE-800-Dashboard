# Features Directory Structure

This directory contains all the feature modules of the application. Each feature module follows a consistent structure:

```
features/
├── auth/           # Authentication feature
│   ├── components/ # React components
│   ├── contexts/   # Context providers
│   ├── hooks/      # Custom hooks
│   └── types/      # TypeScript types
│
├── models/         # Models management feature
│   ├── components/
│   ├── context/
│   └── types/
│
├── deployments/    # Deployments feature
│   ├── components/
│   └── types/
│
├── analytics/      # Analytics feature
│   ├── components/
│   └── types/
│
├── dashboard/      # Dashboard feature
│   └── components/
│
└── shared/         # Shared components and utilities
    └── components/

```

## Feature Module Guidelines

1. Each feature module should be self-contained
2. Shared components go in the `shared` directory
3. Each module can have its own:
   - Components
   - Types
   - Contexts
   - Hooks
   - Utils (if needed)
4. Page components stay in the `app/(routes)` directory 