# Sense Grain Agent Guide

## Scope

This repository contains separate surfaces for mobile, web, Firebase, shared design, and documentation. Keep changes scoped to the surface requested unless a cross-surface update is clearly required.

## Conventions

- Use `Sense Grain` for the product name in user-facing text.
- Use `sense-grain` for repository, package, environment, and slug names.
- Use `@sense-grain/*` for workspace package names.
- Keep Firebase access inside `services/firebase` or Firebase function modules.
- Keep hardware integration code inside `services/hardware`, `modules/hardware`, or documented hardware folders.
- Never commit real `.env` files, Firebase service account keys, or production credentials.

## Validation

Prefer focused checks:

- Mobile changes: React Native lint, typecheck, and device-specific smoke tests.
- Web changes: Next.js lint, typecheck, and browser smoke tests.
- Firebase changes: emulator tests, rules review, and function typecheck.
- Shared design changes: verify both mobile and web consumers.
