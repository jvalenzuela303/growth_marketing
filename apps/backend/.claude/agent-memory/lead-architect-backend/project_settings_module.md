---
name: Settings Module — credential masking pattern
description: How tenant credential fields are masked in the Settings API and which fields exist on the Tenant model
type: project
---

Settings module lives at `src/modules/settings/`. All sensitive credential fields on the `Tenant` model are masked via `maskSecret(value)` which returns `'***...' + value.slice(-4)` or null — the frontend uses non-null to mean "configured".

Fields currently on the Tenant model (schema.prisma):
- `metaPixelId`, `metaCapiToken` — Meta Conversions API
- `metaWhatsappPhoneId`, `metaWhatsappToken` — WhatsApp Business
- `sendgridApiKey` — email delivery
- `ghlApiKey`, `ghlLocationId` — GoHighLevel CRM
- `hubspotApiKey` — HubSpot CRM

Fields being added by a parallel schema migration agent (not yet in schema.prisma as of 2026-05-08):
- `alertEmail`, `hotLeadAlertEnabled`, `dailyDigestEnabled`, `adAccountId`

These pending fields are accessed via `(tenant as any).fieldName` with `// @ts-ignore` in the select until the migration lands. Remove the casts once the schema is updated.

Masking rule: `metaPixelId`, `metaWhatsappPhoneId`, `ghlLocationId` are NOT masked (not secrets — used client-side or as identifiers). All `*Token`, `*Key`, `*ApiKey` fields are masked.

**Why:** Credentials must never be returned in plaintext over the API; masking also lets the frontend show a "connected" badge without a full round-trip.

**How to apply:** Any new credential field added to Tenant should go through `maskSecret` in `getSettings`. Non-secret IDs should pass through plain.
