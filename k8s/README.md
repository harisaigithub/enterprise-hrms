# HRMS K8s Full Package

This is the complete Kubernetes manifest set for the current HRMS service layout.

## Common configuration

Every backend service consumes:

- `hrms-common-config`
- `hrms-common-secret`

Only `SERVICE_NAME` remains service-specific because the existing Express route loader uses it to mount the service's routes.

## Backend image

`enterprise-hrms-main-asset-service:k8s-otel-fix`

All backend services use this same image and select their routes with `SERVICE_NAME`.

## Services

auth, security, organization, employees, recruitment, attendance, leave, payroll, search, workflow, performance, helpdesk, onboarding, lms, task, asset, separation, policies, compliance, reports, dashboard, notifications, requests, expense, travel, ess

## IMPORTANT: one-by-one rollout

Do NOT apply the whole directory at once.

First keep the currently working `db`, `minio`, and `asset-service` resources.

Then for each service:
1. Apply its Deployment.
2. Apply its Service.
3. Wait for Ready.
4. Test its health/API.
5. Apply its HPA only after the service is healthy.

Example:
`kubectl apply -f services/auth-service-deployment.yaml`
`kubectl apply -f services/auth-service-service.yaml`
`kubectl get pods -n hrms -w`
`kubectl apply -f autoscaling/auth-service-hpa.yaml`

## Migration Job

`services/hrms-db-migrate-job.yaml` is provided for schema changes only.

Do NOT run it on every service rollout. Your existing database is already migrated.

## Existing Asset resources

This package intentionally keeps the resource names `asset-service`, `db`, `minio`, and namespace `hrms`.

Do not delete the existing working Asset resources just to install this package.

## Jaeger

Apply `observability/jaeger.yaml` when you want tracing.

Port-forward:
`kubectl port-forward svc/jaeger -n hrms 16686:16686`

UI:
`http://localhost:16686`

## Gateway

Apply `gateway/gateway.yaml` after the required backend services are healthy.

The gateway is a Kubernetes Service and will load-balance across ready pods behind each ClusterIP service.

## Frontend

`gateway/frontend.yaml` is optional. Verify your actual frontend image name before applying it.

## HPA

Each backend service has:
- minReplicas: 2
- maxReplicas: 10
- CPU target: 70%
- scaleDown stabilization: 300s

Metrics Server must be available.
