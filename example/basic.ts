import { createTypedClient, createTypedRouter, type RouteHandlers } from "@mariozechner/routetype";
import { Type } from "@sinclair/typebox";
import express from "express";

// Define your routes with input/output types
const routes = {
  "/api/users": {
    get: {
      input: Type.Object({
        limit: Type.Optional(Type.Number({ default: 10 })),
        offset: Type.Optional(Type.Number({ default: 0 })),
      }),
      output: Type.Array(
        Type.Object({
          id: Type.String(),
          name: Type.String(),
          email: Type.String(),
        }),
      ),
    },
    post: {
      input: Type.Object({
        name: Type.String({ minLength: 1 }),
        email: Type.String({ minLength: 3 }),
      }),
      output: Type.Object({
        id: Type.String(),
        name: Type.String(),
        email: Type.String(),
      }),
    },
  },

  "/api/users/:id": {
    get: {
      input: Type.Object({
        params: Type.Object({
          id: Type.String(),
        }),
      }),
      output: Type.Object({
        id: Type.String(),
        name: Type.String(),
        email: Type.String(),
      }),
    },
    delete: {
      input: Type.Object({
        params: Type.Object({
          id: Type.String(),
        }),
      }),
      output: Type.Object({
        success: Type.Boolean(),
      }),
    },
  },
} as const;

// Mock database
const users = new Map([
  ["1", { id: "1", name: "Alice", email: "alice@example.com" }],
  ["2", { id: "2", name: "Bob", email: "bob@example.com" }],
]);

// Implement handlers
const handlers: RouteHandlers<typeof routes, Record<string, never>> = {
  "/api/users": {
    get: async (input) => {
      const { limit = 10, offset = 0 } = input;
      const allUsers = Array.from(users.values());
      return allUsers.slice(offset, offset + limit);
    },
    post: async (input) => {
      const id = String(users.size + 1);
      const user = { id, ...input };
      users.set(id, user);
      return user;
    },
  },

  "/api/users/:id": {
    get: async (input) => {
      const user = users.get(input.params.id);
      if (!user) {
        throw new Error("User not found");
      }
      return user;
    },
    delete: async (input) => {
      if (!users.has(input.params.id)) {
        throw new Error("User not found");
      }
      users.delete(input.params.id);
      return { success: true };
    },
  },
};

// Create Express server
const app = express();
app.use(express.json());

const router = createTypedRouter(routes, handlers, {
  errorHandler: (err, _req, res) => {
    const error = err as { message?: string; status?: number } | undefined;
    console.error("Error:", error?.message || err);
    res.status(error?.status || 500).json({
      error: error?.message || "Internal server error",
    });
  },
});

app.use(router);
const server = app.listen();
const port = (server.address() as unknown as { port: string }).port;

// Example client usage (in a separate file in real app)
async function clientExample() {
  const client = createTypedClient(routes, `http://localhost:${port}`);

  // TypeScript knows the exact input/output types
  const users = await client.get("/api/users", { limit: 5 });
  console.log("Users:", users);

  const user = await client.get("/api/users/:id", {
    params: { id: "1" },
  });
  console.log("User 1:", user);

  const newUser = await client.post("/api/users", {
    name: "Charlie",
    email: "charlie@example.com",
  });
  console.log("Created user:", newUser);

  const result = await client.delete("/api/users/:id", {
    params: { id: "1" },
  });
  console.log("Delete result:", result.success);
  process.exit(0);
}

// Uncomment to test client (needs server running)
setTimeout(() => clientExample().catch(console.error), 1000);
