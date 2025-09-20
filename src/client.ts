import { type TSchema } from '@sinclair/typebox'
import type { Routes, ExtractRouteInput, ExtractRouteOutput, HttpMethod } from './types.js'

export interface ClientOptions {
  baseUrl?: string
  headers?: Record<string, string> | (() => Record<string, string> | Promise<Record<string, string>>)
  onError?: (error: any) => void
  validateResponses?: boolean
}

export class TypedClient<TRoutes extends Routes<any>> {
  private baseUrl: string
  private options: ClientOptions

  constructor(baseUrl: string = '', options: ClientOptions = {}) {
    this.baseUrl = baseUrl
    this.options = {
      validateResponses: true,
      ...options
    }
  }

  async request<
    TPath extends keyof TRoutes & string,
    TMethod extends keyof TRoutes[TPath] & HttpMethod
  >(
    method: TMethod,
    path: TPath,
    input?: ExtractRouteInput<TRoutes[TPath][TMethod]>
  ): Promise<ExtractRouteOutput<TRoutes[TPath][TMethod]>> {
    try {
      // Build URL
      let url = this.baseUrl + path
      let body: any = undefined
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }

      // Add custom headers
      const customHeaders = typeof this.options.headers === 'function'
        ? await this.options.headers()
        : this.options.headers || {}

      Object.assign(headers, customHeaders)

      // Handle params in path
      if (input && typeof input === 'object' && input !== null && 'params' in input) {
        const params = (input as any).params
        for (const [key, value] of Object.entries(params)) {
          url = url.replace(`:${key}`, encodeURIComponent(String(value)))
        }
      }

      // Handle query parameters for GET requests
      if (method === 'get' && input && typeof input === 'object' && input !== null) {
        const queryInput = 'query' in input ? (input as any).query : input
        const queryParams = new URLSearchParams()

        for (const [key, value] of Object.entries(queryInput)) {
          if (value !== undefined && key !== 'params') {
            queryParams.append(key, String(value))
          }
        }

        const queryString = queryParams.toString()
        if (queryString) {
          url += '?' + queryString
        }
      }

      // Handle body for POST/PUT/PATCH requests
      if (['post', 'put', 'patch'].includes(method) && input && typeof input === 'object' && input !== null) {
        // If input has both params and body, use body
        if ('body' in input) {
          body = JSON.stringify((input as any).body)
        } else if ('params' in input) {
          // If only params, no body
          body = undefined
        } else {
          // Otherwise, entire input is body
          body = JSON.stringify(input)
        }
      }

      // Make request
      const response = await fetch(url, {
        method: method.toUpperCase(),
        headers,
        body,
      })

      // Handle errors
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ error: response.statusText }))
        const errorMessage = (errorBody as any).error || `Request failed with status ${response.status}`
        const error = new Error(errorMessage)
        ;(error as any).status = response.status
        ;(error as any).response = errorBody
        throw error
      }

      // Parse response
      const data = await response.json()

      return data as ExtractRouteOutput<TRoutes[TPath][TMethod]>
    } catch (error) {
      if (this.options.onError) {
        this.options.onError(error)
      }
      throw error
    }
  }

  // Convenience methods
  get<TPath extends keyof TRoutes & string>(
    path: TPath,
    input?: ExtractRouteInput<TRoutes[TPath]['get']>
  ): Promise<ExtractRouteOutput<TRoutes[TPath]['get']>> {
    return this.request('get' as any, path, input)
  }

  post<TPath extends keyof TRoutes & string>(
    path: TPath,
    input?: ExtractRouteInput<TRoutes[TPath]['post']>
  ): Promise<ExtractRouteOutput<TRoutes[TPath]['post']>> {
    return this.request('post' as any, path, input)
  }

  put<TPath extends keyof TRoutes & string>(
    path: TPath,
    input?: ExtractRouteInput<TRoutes[TPath]['put']>
  ): Promise<ExtractRouteOutput<TRoutes[TPath]['put']>> {
    return this.request('put' as any, path, input)
  }

  patch<TPath extends keyof TRoutes & string>(
    path: TPath,
    input?: ExtractRouteInput<TRoutes[TPath]['patch']>
  ): Promise<ExtractRouteOutput<TRoutes[TPath]['patch']>> {
    return this.request('patch' as any, path, input)
  }

  delete<TPath extends keyof TRoutes & string>(
    path: TPath,
    input?: ExtractRouteInput<TRoutes[TPath]['delete']>
  ): Promise<ExtractRouteOutput<TRoutes[TPath]['delete']>> {
    return this.request('delete' as any, path, input)
  }
}

export function createTypedClient<TRoutes extends Routes<any>>(
  baseUrl: string = '',
  options: ClientOptions = {}
): TypedClient<TRoutes> {
  return new TypedClient<TRoutes>(baseUrl, options)
}