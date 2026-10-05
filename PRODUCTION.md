# Production Deployment

This single-host Docker Compose deployment keeps PostgreSQL on a private network, uses an externally managed MinIO/S3-compatible store, exposes only the frontend, and routes `/api` and `/uploads` through Nginx. It does not seed or reset application data.

## Requirements

- Docker Engine with the Compose plugin
- A TLS-terminating reverse proxy for public HTTPS traffic
- A production hostname and SMTP credentials if outbound email is required

## Configure

1. Copy `production.env.example` to `.env.production`.
2. Set `APP_ORIGIN` to the exact public HTTPS app origin. Set `MINIO_ENDPOINT` to an endpoint reachable from the API container and `MINIO_PUBLIC_ENDPOINT` to the endpoint reachable from users' browsers. Do not include schemes or paths in either MinIO endpoint.
3. Replace the database and JWT placeholders with unique random values. Inject your production MinIO/S3 access key and secret through a secret manager or a protected `.env.production` file; use a storage credential scoped to the `hrms-uploads` bucket, not a root account. Database passwords should use hexadecimal characters because the value is embedded in `DATABASE_URL`.
4. Keep `HTTP_BIND_ADDRESS=127.0.0.1` when the TLS proxy runs on the Docker host. If the TLS proxy is another container, put it on the Compose `edge` network and adjust the bind address deliberately.
5. Configure the TLS proxy to forward the app hostname to `http://127.0.0.1:8088` and preserve `Host`, `Origin`, and `X-Forwarded-Proto`. Configure the storage provider to permit browser CORS requests from `APP_ORIGIN`; expense receipts upload directly to the signed URL returned by the provider.

Do not commit `.env.production` or use the example secrets in a deployed environment.

## Deploy

```powershell
docker compose --env-file .env.production -f docker-compose.production.yml config
docker compose --env-file .env.production -f docker-compose.production.yml up -d --build
docker compose --env-file .env.production -f docker-compose.production.yml ps
```

The API runs `prisma migrate deploy` before starting. The deployment does not run the demo seed. Verify `https://your-host/api/health/ready` returns `READY` and the application login page loads through HTTPS.

## Operations

- Back up PostgreSQL and the external object store before deploying schema changes. Test restores outside the live stack.
- Review `docker compose ... logs --since=15m api frontend db minio` after deployment.
- Set up external monitoring, TLS renewal, database/object-store backups, alerting, and image vulnerability scanning. The Compose file is a secure single-host baseline, not a highly available deployment.
- Deploy schema changes using backward-compatible expand/migrate/contract steps before rolling out code that depends on them.