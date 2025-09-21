import type { Static, TSchema } from "@sinclair/typebox";

export type HttpMethod = "get" | "post" | "put" | "patch" | "delete";

export type RouteDefinition<
  TInput extends TSchema = TSchema,
  TOutput extends TSchema = TSchema,
  TMiddlewareConfig extends Record<string, unknown> = Record<string, unknown>,
> = {
  input: TInput;
  output: TOutput;
  middleware?: Partial<TMiddlewareConfig>;
};

export type Routes<TMiddleware extends Record<string, MiddlewareFactory<unknown, unknown>> = Record<string, never>> = {
  [path: string]: {
    [method in HttpMethod]?: RouteDefinition<
      TSchema,
      TSchema,
      {
        [K in keyof TMiddleware]: TMiddleware[K]["config"];
      }
    >;
  };
};

export type MiddlewareFactory<TConfig, TProvides> = {
  config: TConfig;
  provides: TProvides;
};

export type ExtractRouteInput<T> = T extends RouteDefinition<infer I, TSchema, any> ? Static<I> : never;
export type ExtractRouteOutput<T> = T extends RouteDefinition<TSchema, infer O, any> ? Static<O> : never;
