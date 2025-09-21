// Browser-safe exports only - no Express dependencies

export { createTypedClient, TypedClient } from "./client.js";

export type {
  ExtractRouteInput,
  ExtractRouteOutput,
  HttpMethod,
  MiddlewareFactory,
  RouteDefinition,
  Routes,
} from "./shared-types.js";
