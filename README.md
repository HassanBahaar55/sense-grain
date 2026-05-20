# Sense Grain

Sense Grain is a cross-platform grain monitoring platform designed for mobile field use, web-based operations, Firebase-backed data services, and future hardware telemetry integration.

## Project Overview

- Mobile app: React Native for operators, field teams, and device setup.
- Web dashboard: Next.js and React for monitoring, administration, reporting, and analytics.
- Backend: Firebase for authentication, Firestore, Cloud Storage, Cloud Functions, and local emulators.
- Shared design: Centralized tokens and UI guidelines to keep mobile and web experiences consistent.
- Collaboration: GitHub, VS Code, and AI-assisted development with Claude/Codex.

## Repository Structure

```text
sense-grain/
  mobile-app/        React Native mobile application
  web-app/           Next.js dashboard application
  firebase/          Firebase configuration, rules, emulators, and functions
  shared-design/     Shared design tokens, assets, and cross-platform UI guidance
  docs/              Architecture, setup, environment, hardware, and process docs
  .github/           GitHub templates and repository automation
  .vscode/           Recommended VS Code workspace settings
```

## Architecture Principles

- Keep mobile, web, backend, and design concerns separated.
- Share design decisions through tokens instead of duplicated styling.
- Isolate Firebase access behind service modules.
- Reserve hardware-specific code for explicit hardware and telemetry modules.
- Keep configuration in environment files and never commit secrets.
- Prefer clear domain naming such as `grainReadings`, `devices`, `telemetry`, and `storageBins`.

## Getting Started

Prerequisites:

- Node.js 20+
- npm 10+
- Git
- Firebase CLI
- React Native development environment
- VS Code

Clone and install when dependencies are added:

```bash
git clone <github-repository-url>
cd sense-grain
npm install
```

Common commands:

```bash
npm run mobile
npm run web
npm run firebase:emulators
npm run lint
npm run typecheck
```

## Environment Files

Use the example files as templates and keep real secrets out of git:

- `.env.example`
- `mobile-app/.env.example`
- `web-app/.env.local.example`
- `firebase/.env.example`
- `firebase/functions/.env.example`

## Firebase Preparation

Firebase placeholders are included for:

- Project aliases with `.firebaserc.example`
- Emulator configuration in `firebase/firebase.json`
- Firestore rules and indexes
- Storage rules
- Cloud Functions source structure
- Future hardware telemetry processing modules

## GitHub Workflow

Recommended branch flow:

- `main`: production-ready history
- `develop`: integration branch when the team grows
- `feature/<short-name>`: focused feature branches
- `fix/<short-name>`: bug fixes

Pull requests should include:

- Summary of changes
- Screenshots for UI work
- Firebase rule or schema impact
- Test notes
- Hardware integration impact, when relevant

## AI Agent Notes

Use `AGENTS.md` and `CLAUDE.md` for repository-specific guidance when working with Codex or Claude. AI-generated changes should stay scoped, avoid secret handling, and preserve the app boundaries in this repository.
