import type { Static, TSchema } from "@sinclair/typebox";
import type { Request, RequestHandler } from "express";
import type { MiddlewareFactory } from "./shared-types.js";

export type MiddlewareFactories<T extends Record<string, MiddlewareFactory<unknown, unknown>>> = {
  [K in keyof T]: (config: T[K]["config"]) => RequestHandler;
};

export type ExtractMiddlewareContext<
  TMiddleware extends Record<string, MiddlewareFactory<unknown, unknown>>,
  TUsed extends Partial<TMiddleware>,
> = UnionToIntersection<
  {
    [K in keyof TUsed]: K extends keyof TMiddleware ? TMiddleware[K]["provides"] : never;
  }[keyof TUsed]
>;

type UnionToIntersection<U> = (U extends unknown ? (k: U) => void : never) extends (k: infer I) => void ? I : never;

export type RouteContext<TMiddlewareProvides = Record<string, never>> = Request & TMiddlewareProvides;

export type RouteHandler<
  TInput extends TSchema,
  TOutput extends TSchema,
  TMiddleware extends Record<string, MiddlewareFactory<unknown, unknown>>,
  TUsed,
> = (
  input: Static<TInput>,
  context: RouteContext<ExtractMiddlewareContext<TMiddleware, TUsed & Partial<TMiddleware>>>,
) => Promise<Static<TOutput>> | Static<TOutput>;

export type RouteHandlers<
  TRoutes extends import("./shared-types.js").Routes<TMiddleware>,
  TMiddleware extends Record<string, MiddlewareFactory<unknown, unknown>>,
> = {
  [Path in keyof TRoutes]: {
    [Method in keyof TRoutes[Path]]: TRoutes[Path][Method] extends import("./shared-types.js").RouteDefinition<
      infer TInput extends TSchema,
      infer TOutput extends TSchema,
      infer TUsedConfig extends Record<string, unknown>
    >
      ? RouteHandler<
          TInput,
          TOutput,
          TMiddleware,
          {
            [K in keyof TUsedConfig]: K extends keyof TMiddleware ? TMiddleware[K] : never;
          }
        >
      : never;
  };
};

export interface TypedRequest<T = unknown> extends Request {
  body: T;
  user?: unknown;
  file?: unknown;
  files?: unknown;
}
