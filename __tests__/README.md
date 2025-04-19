# API Testing Framework

This directory contains tests for the API endpoints in OpenUptimes. The tests are designed to be database-agnostic and can be used with any database implementation.

## Structure

- `__tests__/setup.ts` - Global test setup
- `__tests__/lib/redis-mock.ts` - Mock implementation of Redis functions
- `__tests__/api/` - API endpoint tests by route
- `__tests__/api/endpoint-template.txt` - Template for creating new API endpoint tests

## Running Tests

```bash
# Run all tests
npm test

# Run tests for a specific file
npm test -- __tests__/api/services/services.test.ts

# Run tests with coverage report
npm test -- --coverage
```

## Test Design Philosophy

Tests are designed to be:

1. **Fast** - No actual network or database calls
2. **Isolated** - Each test runs in its own environment 
3. **Repeatable** - Tests behave consistently on any environment
4. **Self-verifying** - Tests should fail or pass with no ambiguity
5. **Database agnostic** - Tests work regardless of the actual database used

## Creating Tests for New API Endpoints

1. Copy the template from `__tests__/api/endpoint-template.txt` to create a new test file
2. Follow the instructions in the template to customize it for your endpoint
3. Implement test cases for each HTTP method your endpoint supports
4. Run the tests to ensure your implementation is working correctly

Example:
```bash
# Copy the template for a new 'status' endpoint test
cp __tests__/api/endpoint-template.txt __tests__/api/status/status.test.ts
# Edit the file to update the imports and test cases
```

## Extending for New Database Implementations

### Creating a Database-Agnostic Test Suite

The tests are designed to be database-agnostic by:

1. Mocking all database interactions
2. Using a consistent interface for database operations
3. Focusing on testing the API contract, not implementation details

### Steps to Add Support for a New Database

1. Create a new mock implementation file similar to `redis-mock.ts`
2. Implement the same interface functions that the application code uses
3. Update jest.mock() calls in the test files to use your new mock

### Example: Adding MongoDB Support

1. Create `__tests__/lib/mongodb-mock.ts` with the same interface as redis-mock.ts:

```typescript
// __tests__/lib/mongodb-mock.ts
import { ServiceStatus } from '../../lib/redis'; // Reuse types
import { ServiceConfig } from '../../lib/config';

// In-memory storage for tests
const mockStorage: Record<string, any> = {
  'config:services': JSON.stringify([]),
  'setup:complete': 'true'
};

// Mock implementation for MongoDB
export function resetMockMongoDB() {
  // Reset in-memory storage
}

// Mock MongoDB functions with the same interface as Redis
// This ensures tests will work with either implementation
export const getMongoDBClient = jest.fn().mockResolvedValue({
  // Implement methods that match your MongoDB client interface
  // but with the same function signatures as Redis
  findOne: async (collection, query) => {
    // Mock implementation
  },
  // etc.
});

// Additional functions with the same interface as Redis
export const setServiceStatus = jest.fn().mockImplementation(async (name, data) => {
  // Mock implementation
  return true;
});

// etc.
```

2. In your test files, update the mock:

```typescript
// Change this
jest.mock('../../../lib/redis', () => {
  return {
    ...jest.requireActual('../../lib/redis-mock'),
  };
});

// To this
jest.mock('../../../lib/mongodb', () => {
  return {
    ...jest.requireActual('../../lib/mongodb-mock'),
  };
});
```

## Mock Database Implementation

The mock database implementation provides:

- In-memory storage for test data
- Functions that mirror the real database client
- Helper functions for setting up test data
- Reset functionality to clear between tests

## Best Practices

1. Always reset the mock database between tests
2. Test the full request/response cycle
3. Avoid testing implementation details
4. Focus on testing the API contract
5. Add mocks for any external services

## Test Coverage

The current test coverage is focused on the API endpoints. You can view the coverage report by running:

```bash
npm test -- --coverage
```

This will generate a coverage report in the `coverage` directory, which you can view in your browser 