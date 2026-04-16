# API Integration Tests

This directory contains comprehensive integration tests for the CSYFinproj API using Vitest.

## Overview

- **Framework**: Vitest 3.0.0
- **Database**: MySQL (test database)
- **Location**: `tests/` directory
- **Configuration**: `vitest.config.ts`

## Test Structure

```
tests/
├── setup.ts                 # Test database setup and cleanup
├── factories.ts             # Data factory utilities
├── helpers.ts               # HTTP request and auth helpers
└── integration/
    ├── auth.test.ts         # Authentication tests (8 tests)
    ├── motorcycles.test.ts   # Motorcycle CRUD tests (8 tests)
    ├── customers.test.ts     # Customer management tests (7 tests)
    ├── sales.test.ts         # Sales and installment tests (9 tests)
    ├── payments.test.ts      # Payment processing tests (7 tests)
    └── addons.test.ts        # Add-on service tests (8 tests)
```

## Setup

### 1. Environment Variables

Create or update your `.env.test` file in the `apps/api` directory:

```env
# Test Database
TEST_DATABASE_URL=mysql://test:test@localhost:3306/csyfinproj_test
NODE_ENV=test

# JWT
JWT_SECRET=test-secret-change-in-production
```

### 2. Database Setup

```bash
# Create test database
mysql -u root -p -e "CREATE DATABASE csyfinproj_test;"

# Run migrations on test database
export DATABASE_URL=mysql://test:test@localhost:3306/csyfinproj_test
npx prisma migrate deploy
```

### 3. Dependencies

All required dependencies should be installed:

```bash
cd apps/api
npm install
```

## Running Tests

### All Tests

```bash
npm test
```

### Specific Test Suite

```bash
# Auth tests only
npm test -- auth.test.ts

# Customer tests only
npm test -- customers.test.ts
```

### With Coverage

```bash
npm test -- --coverage
```

### Watch Mode

```bash
npm test -- --watch
```

## Test Utilities

### Data Factories (`tests/factories.ts`)

Create test data easily:

```typescript
import { factories } from "./factories";

const admin = await factories.createAdmin();
const customer = await factories.createCustomer();
const motorcycle = await factories.createMotorcycle();
const sale = await factories.createSale(customer.id, motorcycle.id, admin.id);
```

### Helpers (`tests/helpers.ts`)

Make authenticated HTTP requests:

```typescript
import { generateToken, makeRequest, jsonResponse } from "./helpers";

const token = generateToken({ email: "user@test.local", role: "admin" }, userId);

const response = await makeRequest("POST", "/api/v1/auth/login", undefined, {
  email: "user@test.local",
  password: "Test1234!",
});

const data = await jsonResponse<{ token: string }>(response);
```

## Test Examples

### Auth Test

```typescript
it("should login with valid credentials", async () => {
  const user = await factories.createUser({
    email: "user@test.local",
  });

  const response = await makeRequest("POST", "/api/v1/auth/login", undefined, {
    email: "user@test.local",
    password: "Test1234!",
  });

  expect(response.status).toBe(200);
  const data = await jsonResponse<{ token: string }>(response);
  expect(data.token).toBeDefined();
});
```

### Motorcycle Test

```typescript
it("should list motorcycles with pagination", async () => {
  const user = await factories.createAdmin();
  const token = generateToken({ email: user.email, role: "admin" }, user.id);

  await factories.createMotorcycle();
  await factories.createMotorcycle();

  const response = await makeRequest("GET", "/api/v1/motorcycles?page=1&limit=10", token);

  expect(response.status).toBe(200);
  const data = await jsonResponse<{ data: unknown[]; total: number }>(response);
  expect(data.total).toBeGreaterThanOrEqual(2);
});
```

## Key Features

### Automatic Cleanup

Tests automatically clean up data after each test run. The `afterEach` hook in `setup.ts` deletes all test data in the correct order (respecting foreign key constraints):

```typescript
afterEach(async () => {
  // Cleanup order matters for foreign keys
  await testPrisma.notificationLog.deleteMany({});
  await testPrisma.payment.deleteMany({});
  await testPrisma.installment.deleteMany({});
  await testPrisma.sale.deleteMany({});
  // ... etc
});
```

### Authentication

Tests can create JWT tokens for authenticated endpoints:

```typescript
const token = generateToken(
  { email: "admin@test.local", role: "admin" },
  adminUserId
);

const response = await makeRequest("POST", "/api/v1/motorcycles", token, {
  // ... request body
});
```

### Database Isolation

Each test runs against a dedicated test database. Data is cleaned up between tests, ensuring test isolation.

## Test Coverage

### Auth (8 tests)
- ✅ Login with valid credentials
- ✅ Login with invalid credentials
- ✅ Register as admin
- ✅ Register with insufficient role
- ✅ Register with duplicate email
- ✅ Request validation errors

### Motorcycles (8 tests)
- ✅ Create motorcycle
- ✅ List with pagination
- ✅ Filter by status
- ✅ Search by model
- ✅ Get detail
- ✅ Update motorcycle
- ✅ Authentication requirement

### Customers (7 tests)
- ✅ Create customer
- ✅ List with pagination
- ✅ Get with debt summary
- ✅ Duplicate ID card validation
- ✅ Update customer
- ✅ Search customers

### Sales (9 tests)
- ✅ Create sale with installments
- ✅ Generate installment schedule
- ✅ Attach add-ons
- ✅ List with filters
- ✅ Get detail with installments
- ✅ Status transitions (active → completed/cancelled)

### Payments (7 tests)
- ✅ Record payment
- ✅ Handle slip upload
- ✅ Verify payment
- ✅ Update installment status
- ✅ Track overdue installments

### Add-ons (8 tests)
- ✅ List active add-ons
- ✅ Create add-on
- ✅ Validate add-on data
- ✅ Attach to sales
- ✅ Record price at sale time

## Troubleshooting

### Database Connection Error

```
Error: connect ECONNREFUSED 127.0.0.1:3306
```

**Solution**: Ensure MySQL is running and accessible:
```bash
# Check MySQL status
mysql -u test -p -h localhost -e "SELECT 1;"

# Or start MySQL if not running
brew services start mysql  # macOS
# or
sudo systemctl start mysql  # Linux
```

### Test Database Not Found

```
Error: Unknown database 'csyfinproj_test'
```

**Solution**: Create the test database:
```bash
mysql -u root -p -e "CREATE DATABASE csyfinproj_test;"
```

### Migration Errors

```
Error: Prisma migration not found
```

**Solution**: Run migrations on test database:
```bash
export TEST_DATABASE_URL=mysql://test:test@localhost:3306/csyfinproj_test
npx prisma migrate deploy
```

### Tests Hang or Timeout

**Solution**: Check if API server is running on `localhost:4000`:
```bash
# In another terminal
cd apps/api
npm run dev
```

## API Server Requirements

Integration tests require the API server to be running. The tests make HTTP requests to `http://localhost:4000`.

### Start the API Server

```bash
# Terminal 1
cd apps/api
npm run dev
```

### Run Tests

```bash
# Terminal 2
cd apps/api
npm test
```

## CI/CD Integration

### GitHub Actions Example

```yaml
- name: Run Integration Tests
  run: |
    cd apps/api
    npm run dev &  # Start server in background
    sleep 2        # Wait for server to start
    npm test       # Run tests
```

## Best Practices

1. **Use Factories**: Always use factories to create test data consistently
2. **Test Authentication**: Always test both authenticated and unauthenticated paths
3. **Test Validation**: Include tests for invalid inputs and edge cases
4. **Isolation**: Don't rely on test execution order; each test should be independent
5. **Cleanup**: The setup hooks handle cleanup automatically
6. **Descriptive Names**: Use clear, descriptive test names that explain what is being tested

## Contributing New Tests

When adding new endpoints or features:

1. Create a new test file in `tests/integration/`
2. Follow the existing test structure
3. Use factories to create test data
4. Test happy path and error scenarios
5. Update this README with new test coverage
6. Update `docs/04_QA_REPORTS.yml` with test results

## References

- [Vitest Documentation](https://vitest.dev/)
- [Prisma Testing Guide](https://www.prisma.io/docs/guides/testing)
- [Express Testing Best Practices](https://expressjs.com/en/guide/testing.html)
- API Contract: [docs/03_API_CONTRACT.yml](/docs/03_API_CONTRACT.yml)
- QA Report: [docs/04_QA_REPORTS.yml](/docs/04_QA_REPORTS.yml)
