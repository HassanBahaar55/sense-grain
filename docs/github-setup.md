# GitHub Setup

## Create and Push

If GitHub CLI is installed and authenticated:

```bash
gh repo create sense-grain --private --source=. --remote=origin --push
```

If the repository already exists:

```bash
git remote add origin https://github.com/<owner>/sense-grain.git
git push -u origin main
```

## Recommended Repository Settings

- Default branch: `main`
- Require pull requests before merging
- Require status checks when CI is expanded
- Enable secret scanning
- Enable Dependabot alerts
- Protect production Firebase credentials
