import { logger } from "./logger";

type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

export interface CircuitBreakerOptions {
  failureThreshold?: number;
  resetTimeoutMs?: number;
  halfOpenMaxCalls?: number;
}

export class CircuitOpenError extends Error {
  constructor(public readonly serviceName: string) {
    super(`Circuit breaker is OPEN for ${serviceName}`);
    this.name = "CircuitOpenError";
  }
}

export class CircuitBreaker {
  private state: CircuitState = "CLOSED";
  private failures = 0;
  private openedAt = 0;
  private halfOpenCalls = 0;

  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;
  private readonly halfOpenMaxCalls: number;

  constructor(
    private readonly serviceName: string,
    options: CircuitBreakerOptions = {}
  ) {
    this.failureThreshold = options.failureThreshold ?? 5;
    this.resetTimeoutMs = options.resetTimeoutMs ?? 10_000;
    this.halfOpenMaxCalls = options.halfOpenMaxCalls ?? 1;
  }

  getState(): CircuitState {
    if (
      this.state === "OPEN" &&
      Date.now() - this.openedAt >= this.resetTimeoutMs
    ) {
      this.state = "HALF_OPEN";
      this.halfOpenCalls = 0;

      logger.info(
        { serviceName: this.serviceName },
        "Circuit breaker moved to HALF_OPEN"
      );
    }

    return this.state;
  }

  async execute<T>(
    action: () => Promise<T>,
    shouldCountAsFailure: (error: unknown) => boolean = () => true
  ): Promise<T> {
    const state = this.getState();

    if (state === "OPEN") {
      throw new CircuitOpenError(this.serviceName);
    }

    if (
      state === "HALF_OPEN" &&
      this.halfOpenCalls >= this.halfOpenMaxCalls
    ) {
      throw new CircuitOpenError(this.serviceName);
    }

    if (state === "HALF_OPEN") {
      this.halfOpenCalls++;
    }

    try {
      const result = await action();

      this.recordSuccess();

      return result;
    } catch (error) {
      if (!shouldCountAsFailure(error)) {
        throw error;
      }

      this.recordFailure(error);

      throw error;
    }
  }

  private recordSuccess(): void {
    if (this.state !== "CLOSED") {
      logger.info(
        { serviceName: this.serviceName },
        "Circuit breaker recovered"
      );
    }

    this.state = "CLOSED";
    this.failures = 0;
    this.halfOpenCalls = 0;
  }

  private recordFailure(error: unknown): void {
    this.failures++;

    logger.warn(
      {
        serviceName: this.serviceName,
        failures: this.failures,
        threshold: this.failureThreshold,
        state: this.state,
        err: error,
      },
      "Circuit breaker recorded failure"
    );

    if (
      this.state === "HALF_OPEN" ||
      this.failures >= this.failureThreshold
    ) {
      this.state = "OPEN";
      this.openedAt = Date.now();
      this.halfOpenCalls = 0;

      logger.error(
        {
          serviceName: this.serviceName,
          failures: this.failures,
          resetTimeoutMs: this.resetTimeoutMs,
        },
        "Circuit breaker OPENED"
      );
    }
  }
}