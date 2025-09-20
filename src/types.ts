import type { Static, TSchema } from '@sinclair/typebox'
import type { Request, Response, NextFunction, RequestHandler } from 'express'

export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete'

export type RouteDefinition<
  TInput extends TSchema = TSchema,
  TOutput extends TSchema = TSchema,
  TMiddleware extends Record<string, any> = Record<string, any>
> = {
  input: TInput
  output: TOutput
  middleware?: Partial<TMiddleware>
}

export type Routes<TMiddleware extends Record<string, any> = Record<string, any>> = {
  [path: string]: {
    [method in HttpMethod]?: RouteDefinition<TSchema, TSchema, TMiddleware>
  }
}

export type MiddlewareFactory<TConfig, TProvides> = {
  config: TConfig
  provides: TProvides
}

export type MiddlewareFactories<T extends Record<string, MiddlewareFactory<any, any>>> = {
  [K in keyof T]: (config: T[K]['config']) => RequestHandler
}

export type ExtractMiddlewareContext<
  TMiddleware extends Record<string, MiddlewareFactory<any, any>>,
  TUsed extends Partial<TMiddleware>
> = UnionToIntersection<
  {
    [K in keyof TUsed]: K extends keyof TMiddleware ? TMiddleware[K]['provides'] : never
  }[keyof TUsed]
>

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never

export type RouteContext<TMiddlewareProvides = {}> = TMiddlewareProvides & {
  req: Request
  res: Response
}

export type RouteHandler<
  TInput extends TSchema,
  TOutput extends TSchema,
  TMiddleware extends Record<string, MiddlewareFactory<any, any>>,
  TUsed
> = (
  input: Static<TInput>,
  context: RouteContext<ExtractMiddlewareContext<TMiddleware, TUsed & Partial<TMiddleware>>>
) => Promise<Static<TOutput>> | Static<TOutput>

export type RouteHandlers<
  TRoutes extends Routes<TMiddleware>,
  TMiddleware extends Record<string, MiddlewareFactory<any, any>>
> = {
  [Path in keyof TRoutes]: {
    [Method in keyof TRoutes[Path]]: TRoutes[Path][Method] extends RouteDefinition<
      infer TInput,
      infer TOutput,
      infer TUsed
    >
      ? RouteHandler<TInput, TOutput, TMiddleware, TUsed>
      : never
  }
}

export type ExtractRouteInput<T> = T extends RouteDefinition<infer I, any, any> ? Static<I> : never
export type ExtractRouteOutput<T> = T extends RouteDefinition<any, infer O, any> ? Static<O> : never

export interface TypedRequest<T = any> extends Request {
  body: T
  user?: any
  file?: any
  files?: any
}