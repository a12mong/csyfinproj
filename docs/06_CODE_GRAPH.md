# Code Graph

## Module Dependency Map

```
csyfinproj/
├── apps/
│   ├── web/          (Next.js frontend)
│   │   └── depends: @csyfinproj/shared
│   └── api/          (Express backend)
│       └── depends: @csyfinproj/shared, prisma
└── packages/
    └── shared/       (shared types & utilities)
        └── depends: (none)
```

## API Module Map

```
apps/api/src/
├── modules/
│   ├── auth/         → POST /auth/login, POST /auth/register
│   ├── inventory/    → CRUD /motorcycles
│   ├── sales/        → CRUD /sales
│   ├── customers/    → CRUD /customers
│   ├── finance/      → GET /installments
│   ├── payments/     → POST /payments, PATCH /payments/:id/verify
│   ├── notifications/→ POST /notifications/send-reminders, GET /notifications/logs
│   └── addons/       → CRUD /addons
├── middleware/
│   ├── auth.ts       → JWT verification
│   └── validation.ts → Request validation
└── utils/
```

## Frontend Page Map

```
apps/web/src/app/
├── (auth)/login/
├── (dashboard)/
│   ├── page.tsx          → Dashboard
│   ├── inventory/        → Motorcycle inventory
│   ├── sales/            → Sales management
│   ├── customers/        → Customer management
│   ├── finance/          → Installment tracking
│   └── payments/         → Payment collection
```
