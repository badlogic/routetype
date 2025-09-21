# routetype Example

This example demonstrates how to use `@mariozechner/routetype` to build a type-safe API with Express.

## Setup

```bash
npm install
```

## Running the Example

1. Start the server:
```bash
npm run dev
```

2. In another terminal, test the client:
```bash
npx tsx client.ts
```

## What's Included

- **shared.ts** - Route definitions with input/output schemas using TypeBox
- **server.ts** - Express server with typed route handlers
- **client.ts** - Typed HTTP client demonstrating all endpoints

## Testing with curl

```bash
# Get all users
curl http://localhost:3000/api/users

# Get specific user
curl http://localhost:3000/api/users/1

# Create a new user
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","name":"Test User"}'

# Get todos for a user
curl "http://localhost:3000/api/todos?userId=1&completed=false"

# Create a todo
curl -X POST http://localhost:3000/api/todos \
  -H "Content-Type: application/json" \
  -d '{"userId":"1","title":"New task"}'
```

## Type Safety Features

- Input validation: Try sending invalid data to see validation errors
- Type inference: Full autocomplete in your IDE
- Runtime validation: Requests and responses are validated against schemas
- Shared types: Client and server use the exact same type definitions