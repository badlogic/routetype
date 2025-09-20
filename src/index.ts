export { createTypedRouter } from './router.js'
export { createTypedClient, TypedClient } from './client.js'
export type {
  Routes,
  RouteDefinition,
  RouteHandler,
  RouteHandlers,
  RouteContext,
  HttpMethod,
  MiddlewareFactory,
  MiddlewareFactories,
  ExtractRouteInput,
  ExtractRouteOutput,
  ExtractMiddlewareContext
} from './types.js'

// Re-export commonly used TypeBox types for convenience
export { Type, type Static } from '@sinclair/typebox'