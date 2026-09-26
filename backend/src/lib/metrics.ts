import client from "prom-client";

const {
  Counter,
  Histogram,
  Registry,
  collectDefaultMetrics,
} = client;

export const metricsRegistry = new Registry();

collectDefaultMetrics({
  register: metricsRegistry,
  prefix: "hrms_",
});

export const httpRequestsTotal = new Counter({
  name: "hrms_http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["service", "method", "route", "status_code"] as const,
  registers: [metricsRegistry],
});

export const httpRequestDuration = new Histogram({
  name: "hrms_http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["service", "method", "route", "status_code"] as const,
  buckets: [
    0.005,
    0.01,
    0.025,
    0.05,
    0.1,
    0.25,
    0.5,
    1,
    2,
    5,
    10,
  ],
  registers: [metricsRegistry],
});

export const httpErrorsTotal = new Counter({
  name: "hrms_http_errors_total",
  help: "Total number of HTTP 4xx and 5xx responses",
  labelNames: ["service", "method", "route", "status_code"] as const,
  registers: [metricsRegistry],
});