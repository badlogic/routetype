// TypeBox types should be imported directly from @sinclair/typebox
// since it's a peer dependency

// Client exports (browser-safe)
export { createTypedClient, TypedClient } from "./client.js";
// Server exports (Node.js only - requires Express)
export { createTypedRouter } from "./router.js";
export type {
  ExtractMiddlewareContext,
  MiddlewareFactories,
  RouteContext,
  RouteHandler,
  RouteHandlers,
} from "./server-types.js";
// Shared types (browser-safe)
export type {
  ExtractRouteInput,
  ExtractRouteOutput,
  HttpMethod,
  MiddlewareFactory,
  RouteDefinition,
  Routes,
} from "./shared-types.js";
