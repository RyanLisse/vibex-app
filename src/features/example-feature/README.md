# Example Feature Template

This is a template for creating new features following TDD principles and our project structure.

## Feature Structure

```
src/features/example-feature/
├── README.md                    # Feature documentation
├── index.ts                     # Public API exports
├── types.ts                     # TypeScript types and interfaces
├── schemas.ts                   # Zod validation schemas
├── hooks/                       # React hooks
│   ├── use-example.ts
│   └── use-example.test.ts
├── components/                  # React components
│   ├── ExampleComponent.tsx
│   ├── ExampleComponent.test.tsx
│   └── ExampleComponent.stories.tsx
├── services/                    # Business logic and API calls
│   ├── example-service.ts
│   └── example-service.test.ts
├── store/                       # State management (if needed)
│   ├── example-store.ts
│   └── example-store.test.ts
└── utils/                       # Feature-specific utilities
    ├── example-utils.ts
    └── example-utils.test.ts
```

## Implementation Steps

1. **Define Types and Schemas**
2. **Write Tests First (TDD)**
3. **Implement Components**
4. **Create Stories**
5. **Integration Tests**
6. **Documentation**

## Example Implementation

See the implementation files in this directory for a complete TDD example.
