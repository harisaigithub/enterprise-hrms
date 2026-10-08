# Leave day-count correction patch

This patch fixes Leave request day values after submission/listing and keeps half-day portions consistent across:

- request list serialization
- pending balance calculation
- application/approval/cancellation calculations
- frontend duration preview

It does not change the Prisma schema.
