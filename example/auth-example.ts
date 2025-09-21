import {
  createTypedClient,
  createTypedRouter,
  type MiddlewareFactories,
  type RouteHandlers,
} from "@mariozechner/routetype";
import { Type } from "@sinclair/typebox";
import express from "express";

// Define middleware type - this describes what auth middleware provides
type AppMiddleware = {
  auth: {
    config: boolean; // true = require auth
    provides: {
      user: {
        id: string;
        email: string;
        name: string;
      };
    };
  };
};

// Define routes with auth middleware
const routes = {
  "/api/public": {
    get: {
      input: Type.Object({}),
      output: Type.Object({
        message: Type.String(),
      }),
    },
  },

  "/api/profile": {
    get: {
      middleware: {
        auth: true,
      },
      input: Type.Object({}),
      output: Type.Object({
        user: Type.Object({
          id: Type.String(),
          email: Type.String(),
          name: Type.String(),
        }),
      }),
    },
  },

  "/api/update-profile": {
    post: {
      middleware: {
        auth: true,
      },
      input: Type.Object({
        name: Type.String(),
      }),
      output: Type.Object({
        success: Type.Boolean(),
        user: Type.Object({
          id: Type.String(),
          email: Type.String(),
          name: Type.String(),
        }),
      }),
    },
  },
} as const;

// Mock user database
const users = new Map([
  ["token-123", { id: "1", email: "alice@example.com", name: "Alice" }],
  ["token-456", { id: "2", email: "bob@example.com", name: "Bob" }],
]);

// Implement handlers - note how context.user is available when auth middleware is used
const handlers: RouteHandlers<typeof routes, AppMiddleware> = {
  "/api/public": {
    get: async () => {
      return {
        message: "This is a public endpoint - no auth required",
      };
    },
  },

  "/api/profile": {
    get: async (_input, context) => {
      // TypeScript knows context.user exists because auth: true
      console.log(`Profile accessed by user ${context.user.id}`);
      return {
        user: context.user,
      };
    },
  },

  "/api/update-profile": {
    post: async (input, context) => {
      // Update the user's name
      const user = users.get(context.headers.authorization?.replace("Bearer ", "") || "");
      if (user) {
        user.name = input.name;
      }

      return {
        success: true,
        user: {
          ...context.user,
          name: input.name,
        },
      };
    },
  },
};

// Create Express app
const app = express();
app.use(express.json());

// Create auth middleware factory
const authMiddleware = (required: boolean) => {
  return (req: express.Request & { user?: unknown }, res: express.Response, next: express.NextFunction) => {
    if (!required) {
      return next();
    }

    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    const user = users.get(token);
    if (!user) {
      return res.status(401).json({ error: "Invalid token" });
    }

    // Add user to request - this is what the middleware "provides"
    req.user = user;
    next();
  };
};

// Create typed router
const router = createTypedRouter(routes, handlers, {
  middleware: {
    auth: authMiddleware,
  } satisfies MiddlewareFactories<AppMiddleware>,
  errorHandler: (err, _req, res) => {
    console.error("Error:", err);
    res.status(500).json({ error: "Internal server error" });
  },
});

app.use(router);

// Start server on random port
const server = app.listen();
const port = (server.address() as unknown as { port: string }).port;
console.log(`Auth example server running at http://localhost:${port}`);

// Example client usage
async function clientExample() {
  const client = createTypedClient<typeof routes>(`http://localhost:${port}`, {
    headers: () => ({ Authorization: "Bearer token-123" }),
  });

  try {
    // Test public endpoint (no auth required)
    const publicMsg = await client.get("/api/public");
    console.log("\n1. Public endpoint:", publicMsg.message);

    // Test protected endpoint (auth required)
    const profile = await client.get("/api/profile");
    console.log("\n2. Profile (with auth):", profile.user);

    // Test update profile
    const updated = await client.post("/api/update-profile", {
      name: "Alice Smith",
    });
    console.log("\n3. Updated profile:", updated.user);

    // Test without auth token - should fail
    const clientNoAuth = createTypedClient<typeof routes>(`http://localhost:${port}`);
    try {
      await clientNoAuth.get("/api/profile");
    } catch (error) {
      console.log("\n4. Without auth token:", (error as { message?: string })?.message || "Error");
    }

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

// Run client example after server starts
setTimeout(() => clientExample().catch(console.error), 1000);
