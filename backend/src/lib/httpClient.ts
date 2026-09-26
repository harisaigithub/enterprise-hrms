import { logger } from "./logger";
import {
  CircuitBreaker,
  CircuitOpenError,
} from "./circuitBreaker";

export interface HttpClientOptions {
  timeoutMs?: number;
  headers?: Record<string, string>;
  requestId?: string;

  retries?: number;
  retryDelayMs?: number;

  circuitBreaker?: CircuitBreaker;
}

export class HttpClientError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly responseBody?: unknown
  ) {
    super(message);
    this.name = "HttpClientError";
  }
}

function isRetryableError(error: unknown): boolean {
  if (error instanceof CircuitOpenError) {
    return false;
  }

  if (error instanceof HttpClientError) {
    return error.status === undefined || error.status >= 500;
  }

  if (error instanceof DOMException && error.name === "AbortError") {
    return true;
  }

  return true;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function request<T>(
  url: string,
  options: RequestInit = {},
  config: HttpClientOptions = {}
): Promise<T> {
  const timeoutMs = config.timeoutMs ?? 10_000;
  const retries = config.retries ?? 2;
  const retryDelayMs = config.retryDelayMs ?? 250;

  const executeRequest = async (): Promise<T> => {
    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,

        headers: {
          "Content-Type": "application/json",

          ...(config.requestId
            ? {
                "X-Request-ID": config.requestId,
              }
            : {}),

          ...config.headers,
          ...(options.headers ?? {}),
        },

        signal: controller.signal,
      });

      const contentType =
        response.headers.get("content-type") ?? "";

      const body = contentType.includes("application/json")
        ? await response.json()
        : await response.text();

      if (!response.ok) {
        throw new HttpClientError(
          `HTTP ${response.status} calling ${url}`,
          response.status,
          body
        );
      }

      return body as T;
    } catch (error) {
      if (error instanceof HttpClientError) {
        throw error;
      }

      if (
        error instanceof DOMException &&
        error.name === "AbortError"
      ) {
        throw new HttpClientError(
          `Request timeout after ${timeoutMs}ms: ${url}`
        );
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }
  };

  const executeWithRetry = async (): Promise<T> => {
    let lastError: unknown;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await executeRequest();
      } catch (error) {
        lastError = error;

        const canRetry =
          attempt < retries && isRetryableError(error);

        if (!canRetry) {
          throw error;
        }

        const delay =
          retryDelayMs * Math.pow(2, attempt);

        logger.warn(
          {
            url,
            attempt: attempt + 1,
            maxAttempts: retries + 1,
            delay,
            requestId: config.requestId,
            err: error,
          },
          "Retrying HTTP request"
        );

        await sleep(delay);
      }
    }

    throw lastError;
  };

  try {
    if (config.circuitBreaker) {
      return await config.circuitBreaker.execute(
        executeWithRetry,
        (error) => {
          if (error instanceof HttpClientError) {
            // 4xx errors are application errors,
            // not downstream availability failures.
            return (
              error.status === undefined ||
              error.status >= 500
            );
          }

          return true;
        }
      );
    }

    return await executeWithRetry();
  } catch (error) {
    if (error instanceof CircuitOpenError) {
      logger.warn(
        {
          url,
          requestId: config.requestId,
          serviceName: error.serviceName,
        },
        "HTTP request blocked by circuit breaker"
      );

      throw error;
    }

    logger.error(
      {
        err: error,
        url,
        requestId: config.requestId,
      },
      "HTTP request failed"
    );

    throw error;
  }
}

export const httpClient = {
  get<T>(
    url: string,
    config?: HttpClientOptions
  ) {
    return request<T>(
      url,
      {
        method: "GET",
      },
      config
    );
  },

  post<T>(
    url: string,
    body?: unknown,
    config?: HttpClientOptions
  ) {
    return request<T>(
      url,
      {
        method: "POST",
        body:
          body === undefined
            ? undefined
            : JSON.stringify(body),
      },
      config
    );
  },

  put<T>(
    url: string,
    body?: unknown,
    config?: HttpClientOptions
  ) {
    return request<T>(
      url,
      {
        method: "PUT",
        body:
          body === undefined
            ? undefined
            : JSON.stringify(body),
      },
      config
    );
  },

  delete<T>(
    url: string,
    config?: HttpClientOptions
  ) {
    return request<T>(
      url,
      {
        method: "DELETE",
      },
      config
    );
  },
};