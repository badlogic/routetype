import type { TSchema } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { type NextFunction, type Request, type RequestHandler, type Response, Router } from "express";
import type { MiddlewareFactories, RouteHandlers } from "./server-types.js";
import type { HttpMethod, MiddlewareFactory, Routes } from "./shared-types.js";

export interface RouterOptions<TMiddleware extends Record<string, MiddlewareFactory<unknown, unknown>>> {
  middleware?: MiddlewareFactories<TMiddleware>;
  errorHandler?: (err: unknown, req: Request, res: Response, next: NextFunction) => void;
  basePath?: string;
}

export function createTypedRouter<
  TRoutes extends Routes<TMiddleware>,
  TMiddleware extends Record<string, MiddlewareFactory<unknown, unknown>> = Record<string, never>,
>(routes: TRoutes, handlers: RouteHandlers<TRoutes, TMiddleware>, options: RouterOptions<TMiddleware> = {}): Router {
  const router = Router();
  const { middleware: middlewareFactories, errorHandler, basePath = "" } = options;

  for (const [path, methods] of Object.entries(routes)) {
    for (const [method, routeConfig] of Object.entries(methods)) {
      if (!routeConfig) continue;

      const fullPath = basePath + path;
      const httpMethod = method as HttpMethod;

      const middlewares: RequestHandler[] = [];

      // Add configured middleware
      if (routeConfig.middleware && middlewareFactories) {
        for (const [middlewareName, middlewareConfig] of Object.entries(routeConfig.middleware)) {
          if (middlewareConfig !== undefined && middlewareName in middlewareFactories) {
            const factory = middlewareFactories[middlewareName as keyof typeof middlewareFactories];
            middlewares.push(factory(middlewareConfig));
          }
        }
      }

      // Add validation and handler middleware
      const validationMiddleware = createValidationMiddleware(routeConfig.input, routeConfig.output);
      const handlerMiddleware = createHandlerMiddleware(
        handlers[path]?.[httpMethod],
        routeConfig.input,
        routeConfig.output,
        routeConfig.middleware || {},
      );

      middlewares.push(validationMiddleware);
      middlewares.push(handlerMiddleware);

      // Register route
      router[httpMethod](fullPath, ...middlewares);
    }
  }

  // Add error handler if provided
  if (errorHandler) {
    router.use(errorHandler);
  }

  return router;
}

function createValidationMiddleware(inputSchema: TSchema, outputSchema: TSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Extract input from request
      const input = extractInput(req);

      // Validate input
      if (!Value.Check(inputSchema, input)) {
        const errors = [...Value.Errors(inputSchema, input)];
        return res.status(400).json({
          error: "Validation failed",
          details: errors.map((e) => ({
            path: e.path,
            message: e.message,
          })),
        });
      }
      // Store validated input
      const extendedReq = req as Request & { validatedInput: unknown; outputSchema: TSchema };
      extendedReq.validatedInput = Value.Decode(inputSchema, input);

      // Store output schema for response validation
      extendedReq.outputSchema = outputSchema;

      next();
    } catch (error) {
      next(error);
    }
  };
}

function createHandlerMiddleware<TMiddleware extends Record<string, unknown>>(
  handler: unknown,
  _inputSchema: TSchema,
  outputSchema: TSchema,
  _middlewareConfig: TMiddleware,
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!handler) {
        return res.status(501).json({ error: "Not implemented" });
      }

      // Get validated input
      const extendedReq = req as Request & {
        validatedInput?: unknown;
      };
      const input = extendedReq.validatedInput;

      // Pass req directly as context - it already has everything middleware added
      const context = req as Request & Record<string, unknown>;

      // Call handler
      if (typeof handler !== "function") {
        return res.status(501).json({ error: "Handler not a function" });
      }
      const result = await (
        handler as (input: unknown, context: Request & Record<string, unknown>) => Promise<unknown>
      )(input, context);

      // Validate output
      if (!Value.Check(outputSchema, result)) {
        console.error("Response validation failed:", [...Value.Errors(outputSchema, result)]);
        return res.status(500).json({ error: "Internal server error" });
      }

      // Send response
      res.json(result);
    } catch (error) {
      next(error);
    }
  };
}

function extractInput(req: Request): unknown {
  const input: Record<string, unknown> = {};

  // Add params if present
  if (req.params && Object.keys(req.params).length > 0) {
    input.params = req.params;
  }

  // Add query if present
  if (req.query && Object.keys(req.query).length > 0) {
    input.query = req.query;
  }

  // Add body for methods that support it
  if (req.method && ["POST", "PUT", "PATCH"].includes(req.method) && req.body) {
    // If there are params or query, nest body under 'body' key
    if (input.params || input.query) {
      input.body = req.body;
    } else {
      // Otherwise, body is the entire input
      Object.assign(input, req.body);
    }
  }

  // Return empty object if no input
  return Object.keys(input).length > 0 ? input : {};
}
