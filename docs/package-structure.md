# Recommended Package Structure

The repository is prepared as an npm workspace monorepo.

## Workspaces

```text
@sense-grain/mobile-app
@sense-grain/web-app
@sense-grain/shared-design
@sense-grain/firebase-functions
```

## Mobile App

```text
mobile-app/src/
  app/
  assets/
  components/
  config/
  features/
  hooks/
  navigation/
  screens/
  services/
  state/
  theme/
  types/
  utils/
```

## Web App

```text
web-app/src/
  app/
  components/
  config/
  features/
  lib/
  services/
  styles/
  types/
```

## Firebase Functions

```text
firebase/functions/src/
  config/
  modules/
  types/
  index.ts
```

## Shared Design

```text
shared-design/src/
  assets/
  components/
  tokens/
  index.ts
```
