# Soft Transit SaaS — Instructions pour Claude Code

## Stack technique
- **Frontend** : React + Vite → Cloudflare Pages (https://softtransit.net)
- **Backend** : Express.js → Railway (https://softtransitsaasclaudecode-production.up.railway.app)
- **Base de données** : MySQL sur Railway (host: shuttle.proxy.rlwy.net:12965)
- **Auth** : JWT + bcrypt

## ⚠️ Règle critique — Noms de tables MySQL
MySQL sur Railway (Linux) est **case-sensitive**. Toujours utiliser les noms en **minuscules** :
- `agents`, `clients`, `dossiers`, `ordrestransit`
- `incoterm`, `regimeot`, `typesdocumentsot`
- `liaisonregimeot`, `liaisonotdocumentsaremettre`
- `liaisoncotationsrubriques`, `comptesclients`

Ne JAMAIS écrire : `INSERT INTO Agents`, `FROM Dossiers`, etc.

## Workflow Git — Branches obligatoires

**Ne jamais committer directement sur `main`.** La branche `main` est protégée.

### Workflow à suivre :
```bash
# 1. Créer une branche depuis main
git checkout main && git pull
git checkout -b fix/nom-du-bug        # ou feat/nom-feature

# 2. Faire les modifications + commits
git add <fichiers>
git commit -m "fix: description claire"

# 3. Pousser et créer la PR
git push -u origin fix/nom-du-bug
gh pr create --title "..." --body-file .github/pull_request_template.md

# 4. Merger via GitHub (pas en local)
```

### Conventions de nommage des branches :
- `fix/soft-delete-stats` — correction de bug
- `feat/export-excel` — nouvelle fonctionnalité
- `refactor/auth-middleware` — refactoring
- `hotfix/login-500` — correction urgente production

## Soft delete
Les dossiers supprimés ont `Facturable = -1`. Toutes les requêtes SELECT doivent filtrer :
```sql
WHERE (Facturable IS NULL OR Facturable != -1)
```

## Variables d'environnement
- Backend : `backend/.env` (DB_HOST, DB_PORT=12965, DB_USER, DB_PASSWORD, DB_NAME=railway, JWT_SECRET)
- Frontend : `frontend/.env` (VITE_API_URL=https://softtransitsaasclaudecode-production.up.railway.app/api)
