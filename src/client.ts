import type { ExtractRouteInput, ExtractRouteOutput, HttpMethod, MiddlewareFactory, Routes } from "./shared-types.js";

// Define proper error type
export interface RequestError extends Error {
  status?: number;
  response?: unknown;
}

export interface ClientOptions {
  baseUrl?: string;
  headers?: Record<string, string> | (() => Record<string, string> | Promise<Record<string, string>>);
  onError?: (error: unknown) => void;
  validateResponses?: boolean;
}

type InputWithParams = { params: Record<string, unknown> };
type InputWithQuery = { query: Record<string, unknown> };
type InputWithBody = { body: unknown };

// biome-ignore lint/suspicious/noExplicitAny: Client accepts any routes structure, doesn't care about middleware
export class TypedClient<TRoutes extends Routes<any>> {
  private baseUrl: string;
  private options: ClientOptions;

  constructor(baseUrl = "", options: ClientOptions = {}) {
    this.baseUrl = baseUrl;
    this.options = {
      validateResponses: true,
      ...options,
    };
  }

  async request<TPath extends keyof TRoutes & string, TMethod extends keyof TRoutes[TPath] & HttpMethod>(
    method: TMethod,
    path: TPath,
    input?: ExtractRouteInput<TRoutes[TPath][TMethod]>,
  ): Promise<ExtractRouteOutput<TRoutes[TPath][TMethod]>> {
    try {
      // Build URL
      let url = this.baseUrl + path;
      let body: string | undefined;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      // Add custom headers
      const customHeaders =
        typeof this.options.headers === "function" ? await this.options.headers() : this.options.headers || {};

      Object.assign(headers, customHeaders);

      // Handle params in path
      if (input && typeof input === "object" && input !== null && "params" in input) {
        const typedInput = input as InputWithParams;
        const params = typedInput.params;
        for (const [key, value] of Object.entries(params)) {
          url = url.replace(`:${key}`, encodeURIComponent(String(value)));
        }
      }

      // Handle query parameters for GET requests
      if (method === "get" && input && typeof input === "object" && input !== null) {
        const queryInput = "query" in input ? (input as InputWithQuery).query : (input as Record<string, unknown>);
        const queryParams = new URLSearchParams();

        for (const [key, value] of Object.entries(queryInput)) {
          if (value !== undefined && key !== "params") {
            queryParams.append(key, String(value));
          }
        }

        const queryString = queryParams.toString();
        if (queryString) {
          url += `?${queryString}`;
        }
      }

      // Handle body for POST/PUT/PATCH requests
      if (["post", "put", "patch"].includes(method) && input && typeof input === "object" && input !== null) {
        // If input has both params and body, use body
        if ("body" in input) {
          body = JSON.stringify((input as InputWithBody).body);
        } else if ("params" in input) {
          // If only params, no body
          body = undefined;
        } else {
          // Otherwise, entire input is body
          body = JSON.stringify(input);
        }
      }

      // Make request
      const response = await fetch(url, {
        method: method.toUpperCase(),
        headers,
        body,
      });

      // Handle errors
      if (!response.ok) {
        const errorBody: unknown = await response.json().catch(() => ({ error: response.statusText }));
        const errorMessage =
          typeof errorBody === "object" &&
          errorBody !== null &&
          "error" in errorBody &&
          typeof (errorBody as Record<string, unknown>).error === "string"
            ? (errorBody as Record<string, unknown>).error
            : `Request failed with status ${response.status}`;
        const error: RequestError = new Error(errorMessage as string);
        error.status = response.status;
        error.response = errorBody;
        throw error;
      }

      // Parse response
      const data: unknown = await response.json();

      return data as ExtractRouteOutput<TRoutes[TPath][TMethod]>;
    } catch (error) {
      if (this.options.onError) {
        this.options.onError(error);
      }
      throw error;
    }
  }

  // Convenience methods with proper typing
  get<TPath extends keyof TRoutes & string>(
    path: TPath,
    input?: ExtractRouteInput<TRoutes[TPath]["get"]>,
  ): Promise<ExtractRouteOutput<TRoutes[TPath]["get"]>> {
    return this.request("get", path, input);
  }

  post<TPath extends keyof TRoutes & string>(
    path: TPath,
    input?: ExtractRouteInput<TRoutes[TPath]["post"]>,
  ): Promise<ExtractRouteOutput<TRoutes[TPath]["post"]>> {
    return this.request("post", path, input);
  }

  put<TPath extends keyof TRoutes & string>(
    path: TPath,
    input?: ExtractRouteInput<TRoutes[TPath]["put"]>,
  ): Promise<ExtractRouteOutput<TRoutes[TPath]["put"]>> {
    return this.request("put", path, input);
  }

  patch<TPath extends keyof TRoutes & string>(
    path: TPath,
    input?: ExtractRouteInput<TRoutes[TPath]["patch"]>,
  ): Promise<ExtractRouteOutput<TRoutes[TPath]["patch"]>> {
    return this.request("patch", path, input);
  }

  delete<TPath extends keyof TRoutes & string>(
    path: TPath,
    input?: ExtractRouteInput<TRoutes[TPath]["delete"]>,
  ): Promise<ExtractRouteOutput<TRoutes[TPath]["delete"]>> {
    return this.request("delete", path, input);
  }
}

// biome-ignore lint/suspicious/noExplicitAny: Client accepts any routes structure, doesn't care about middleware
export function createTypedClient<TRoutes extends Routes<any>>(
  _routes: TRoutes,
  baseUrl = "",
  options: ClientOptions = {},
): TypedClient<TRoutes> {
  return new TypedClient<TRoutes>(baseUrl, options);
}
