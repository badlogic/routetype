# routetype

Type-safe, validated routing for Express with shared client-server types. Define your API once, use it everywhere with full type safety and runtime validation.

## Features

- **Full type safety** - Share types between client and server
- **Runtime validation** - Automatic request/response validation using TypeBox
- **Zero code generation** - No build step, just TypeScript
- **Extensible middleware** - Type-safe middleware with custom context
- **Tiny footprint** - Minimal dependencies
- **Express compatible** - Works with your existing Express app

## Installation

```bash
npm install routetype @sinclair/typebox express
```

## Quick Start

### 1. Define your routes

```typescript
// shared/routes.ts
import { Type } from '@sinclair/typebox'

export const routes = {
  '/api/users': {
    get: {
      input: Type.Object({
        limit: Type.Optional(Type.Number()),
        offset: Type.Optional(Type.Number())
      }),
      output: Type.Array(Type.Object({
        id: Type.String(),
        name: Type.String(),
        email: Type.String()
      }))
    },
    post: {
      input: Type.Object({
        name: Type.String({ minLength: 1 }),
        email: Type.String({ format: 'email' })
      }),
      output: Type.Object({
        id: Type.String(),
        name: Type.String(),
        email: Type.String()
      })
    }
  },
  '/api/users/:id': {
    get: {
      input: Type.Object({
        params: Type.Object({
          id: Type.String()
        })
      }),
      output: Type.Object({
        id: Type.String(),
        name: Type.String(),
        email: Type.String()
      })
    },
    delete: {
      input: Type.Object({
        params: Type.Object({
          id: Type.String()
        })
      }),
      output: Type.Object({
        success: Type.Boolean()
      })
    }
  }
} as const
```

### 2. Implement the server

```typescript
// server.ts
import express from 'express'
import { createTypedRouter } from 'routetype'
import { routes } from './shared/routes'

const app = express()
app.use(express.json())

const handlers = {
  '/api/users': {
    get: async (input) => {
      const { limit = 10, offset = 0 } = input
      // input is fully typed!
      return fetchUsers(limit, offset) // Must return the defined output type
    },
    post: async (input) => {
      // input.name and input.email are validated and typed
      return createUser(input.name, input.email)
    }
  },
  '/api/users/:id': {
    get: async (input) => {
      // input.params.id is typed as string
      return fetchUser(input.params.id)
    },
    delete: async (input) => {
      await deleteUser(input.params.id)
      return { success: true }
    }
  }
}

const router = createTypedRouter(routes, handlers)
app.use(router)

app.listen(3000)
```

### 3. Use the typed client

```typescript
// client.ts
import { createTypedClient } from 'routetype/client'
import { routes } from './shared/routes'

const client = createTypedClient<typeof routes>('http://localhost:3000')

// Fully typed requests!
const users = await client.get('/api/users', { limit: 20, offset: 0 })
// users is typed as Array<{ id: string, name: string, email: string }>

const newUser = await client.post('/api/users', {
  name: 'Alice',
  email: 'alice@example.com'
})
// newUser is typed as { id: string, name: string, email: string }

await client.delete('/api/users/:id', {
  params: { id: newUser.id }
})
```

## Advanced: Middleware

Define typed middleware that adds context to your handlers:

```typescript
// middleware-types.ts
export type AppMiddleware = {
  auth: {
    config: true | 'admin'
    provides: {
      user: {
        id: string
        email: string
        role: 'user' | 'admin'
      }
    }
  }
  rateLimit: {
    config: { max: number, window: number }
    provides: {
      remaining: number
    }
  }
}
```

Use middleware in routes:

```typescript
// routes.ts
const routes = {
  '/api/admin/users': {
    get: {
      middleware: {
        auth: 'admin' as const,
        rateLimit: { max: 100, window: 60000 }
      },
      input: Type.Object({}),
      output: Type.Array(UserSchema)
    }
  }
}

// server.ts
const router = createTypedRouter(routes, handlers, {
  middleware: {
    auth: (config) => {
      if (config === 'admin') return requireAdminMiddleware
      return requireAuthMiddleware
    },
    rateLimit: (config) => {
      return createRateLimiter(config)
    }
  }
})

// Handler gets typed context from middleware
const handlers = {
  '/api/admin/users': {
    get: async (input, context) => {
      console.log(context.user.role) // Typed from auth middleware!
      console.log(context.remaining) // Typed from rateLimit middleware!
      return getUsers()
    }
  }
}
```

## API

### `createTypedRouter(routes, handlers, options?)`

Creates an Express router with type-safe routes and automatic validation.

- `routes` - Route definitions with input/output schemas
- `handlers` - Implementation for each route
- `options` - Optional configuration
  - `middleware` - Middleware factories
  - `errorHandler` - Custom error handler
  - `basePath` - Base path for all routes

### `createTypedClient(baseUrl, options?)`

Creates a typed HTTP client for your API.

- `baseUrl` - Base URL for API requests
- `options` - Optional configuration
  - `headers` - Headers to include in requests
  - `onError` - Error handler
  - `validateResponses` - Validate responses against schema (default: true)

## TypeBox Schemas

routetype uses [TypeBox](https://github.com/sinclairzx81/typebox) for runtime validation. TypeBox provides:

- JSON Schema compatible validation
- TypeScript type inference
- Excellent performance
- Rich validation options

Common schema examples:

```typescript
import { Type } from '@sinclair/typebox'

// Basic types
Type.String()
Type.Number()
Type.Boolean()
Type.Null()

// Objects
Type.Object({
  name: Type.String(),
  age: Type.Number({ minimum: 0 })
})

// Arrays
Type.Array(Type.String())

// Unions
Type.Union([
  Type.Literal('draft'),
  Type.Literal('published')
])

// Optional fields
Type.Object({
  required: Type.String(),
  optional: Type.Optional(Type.String())
})

// String formats
Type.String({ format: 'email' })
Type.String({ format: 'uri' })
Type.String({ format: 'uuid' })
Type.String({ format: 'date-time' })

// String patterns
Type.String({ pattern: '^[a-z]+$' })

// Number constraints
Type.Number({ minimum: 0, maximum: 100 })
Type.Integer({ multipleOf: 5 })
```

## License

MIT