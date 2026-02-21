# Documentation MyTechGear Medusa Backend

> **Projet** : MyTechGear - E-commerce Lunettes Connectées
> **Backend** : Medusa v2 (API-only mode)
> **Dernière mise à jour** : 2026-02-21

---

## 📚 Documentation Disponible

### 1. Taxonomie (Catégories & Collections) ⭐

**📂 Dossier** : [`taxonomy/`](./taxonomy/)

La taxonomie MyTechGear organise les produits par **technologie de verre** (Smart Tech vs Classic).

**Documents clés** :
- **[taxonomy/README.md](./taxonomy/README.md)** - Point d'entrée principal
- **[taxonomy/CURRENT_STATE.md](./taxonomy/CURRENT_STATE.md)** - État actuel détaillé (3 catégories)
- **[taxonomy/CHANGELOG.md](./taxonomy/CHANGELOG.md)** - Historique migrations
- **[taxonomy/MIGRATION_TECH_TAXONOMY.md](./taxonomy/MIGRATION_TECH_TAXONOMY.md)** - Guide migration

**Quick Links** :
```bash
# Vérifier structure actuelle
psql postgresql://medusa:medusa@localhost:5433/medusa -c "
SELECT id, name, handle FROM product_category ORDER BY rank;
"

# Dashboard admin
open http://localhost:3200/admin/categories
```

### 2. Scripts (Migrations & Imports)

**📂 Dossier** : [`../src/scripts/`](../src/scripts/)

**Scripts de taxonomie** :
- `migrate-to-tech-taxonomy.ts` - Migration vers structure par technologie ✅
- `cleanup-and-migrate-taxonomy.ts` - Migration Option C (obsolète)
- `validate-taxonomy-after-migration.ts` - Validation post-migration
- `assign-product-tags.ts` - Auto-assignation tags

**Scripts d'import produits** :
- `import-chamelo-*.ts` - Import produits Chamelo
- `assign-product-tags.ts` - Tags automatiques
- `fetch-shopify-images.ts` - Import images

**Utilisation** :
```bash
npm exec medusa exec ./src/scripts/migrate-to-tech-taxonomy.ts
```

### 3. Configuration

**Fichiers** :
- `medusa-config.ts` - Configuration Medusa principale
- `.env` - Variables d'environnement
- `src/config/` - Configs centralisées (à créer)

### 4. API Routes (Frontend)

**Frontend** : [`mytechgear-frontend/src/app/api/admin/`](../../mytechgear-frontend/src/app/api/admin/)

**Endpoints admin** :
- `/api/admin/categories` - GET (list), POST (create)
- `/api/admin/categories/[id]` - GET (detail), PUT (update), DELETE
- `/api/admin/collections` - GET (list), POST (create)
- `/api/admin/collections/[id]` - GET (detail), PUT (update), DELETE

---

## 🏗️ Architecture Actuelle

### Structure Taxonomie (v2.0.0)

```
Lunettes Connectées
├── Smart Tech (10 produits électroniques)
│   ├── Prismatic™ Color-changing (2)
│   ├── Eclipse™ Tint-Adjustable (2)
│   ├── HVL™ Tint-Adjustable (2)
│   ├── Electrochromic (3)
│   └── Liquid Crystal (1)
└── Classic Eyewear (6 produits standards)
```

**Détails** : Voir [taxonomy/CURRENT_STATE.md](./taxonomy/CURRENT_STATE.md)

### Base de Données

**PostgreSQL** : 17.7 (Docker)
```bash
# Connexion
psql postgresql://medusa:medusa@localhost:5433/medusa

# Tables principales
product                  # 16 produits
product_category         # 3 catégories
product_category_product # Relations (16 mappings)
product_collection       # 6 collections
product_tag              # ~37 tags
```

### Services Backend

**Medusa** : Port 9000 (API-only)
```bash
# Status
gmdev status mytechgear-medusa

# Logs
gmdev logs mytechgear-medusa

# Restart
gmdev restart mytechgear-medusa
```

### Frontend Admin

**Next.js** : Port 3200 (Custom Admin Dashboard)
```bash
# Dashboard categories
http://localhost:3200/admin/categories

# Dashboard collections
http://localhost:3200/admin/collections
```

---

## 🚀 Quick Start

### Setup Initial

```bash
# 1. Installer dépendances
npm install

# 2. Configurer .env
cp .env.example .env
# Éditer DATABASE_URL, etc.

# 3. Lancer services
gmdev start mytechgear-medusa
gmdev start mytechgear-frontend

# 4. Migrations DB (si besoin)
npx medusa db:migrate
```

### Vérifier Taxonomie

```bash
# Lister catégories
psql postgresql://medusa:medusa@localhost:5433/medusa -c "
SELECT id, name, handle, parent_category_id, rank
FROM product_category ORDER BY rank;
"

# Compter produits par catégorie
psql postgresql://medusa:medusa@localhost:5433/medusa -c "
SELECT c.name, COUNT(pcp.product_id) as products
FROM product_category c
LEFT JOIN product_category_product pcp ON c.id = pcp.product_category_id
GROUP BY c.name ORDER BY products DESC;
"
```

### Ajouter un Produit

```bash
# Via script
npm exec medusa exec ./src/scripts/import-chamelo-nouveau-produit.ts

# Ou via dashboard
open http://localhost:3200/admin/products/new
```

---

## 📊 Données Actuelles (2026-02-21)

| Ressource | Quantité | Notes |
|-----------|----------|-------|
| **Produits** | 16 | 10 Smart Tech + 6 Classic |
| **Catégories** | 3 | Root + Smart Tech + Classic |
| **Collections** | 6 | Prismatic, Lifestyle, Sport, etc. |
| **Tags** | ~37 | Technology, Features, Use-case |

---

## 🔄 Workflows Courants

### Migration Taxonomie

```bash
# 1. Backup
mkdir -p backups
psql $DATABASE_URL -c "\copy product_category TO 'backups/categories.csv' CSV HEADER"

# 2. Exécuter migration
npm exec medusa exec ./src/scripts/migrate-to-tech-taxonomy.ts

# 3. Vérifier
npm exec medusa exec ./src/scripts/validate-taxonomy-after-migration.ts
```

### Import Produits Chamelo

```bash
# 1. Créer script import
# src/scripts/import-chamelo-nouveau-produit.ts

# 2. Exécuter
npm exec medusa exec ./src/scripts/import-chamelo-nouveau-produit.ts

# 3. Assigner tags
npm exec medusa exec ./src/scripts/assign-product-tags.ts
```

### Backup & Restore

```bash
# Backup complet
pg_dump $DATABASE_URL > backups/full_backup_$(date +%Y%m%d).sql

# Restore
psql $DATABASE_URL < backups/full_backup_20260221.sql
```

---

## 🛠️ Outils & Services

### Base de Données

```bash
# Connexion psql
psql postgresql://medusa:medusa@localhost:5433/medusa

# GUI (optionnel)
open http://localhost:5050  # pgAdmin (si configuré)
```

### API Medusa

```bash
# Health check
curl http://localhost:9000/health

# Lister catégories (admin)
curl http://localhost:9000/admin/product-categories \
  -H "Authorization: Bearer YOUR_TOKEN"

# Lister produits (store)
curl http://localhost:9000/store/products
```

### Dashboard Admin

```bash
# Categories
open http://localhost:3200/admin/categories

# Collections
open http://localhost:3200/admin/collections

# Products
open http://localhost:3200/admin/products
```

---

## 📁 Structure Projet

```
mytechgear-medusa/
├── docs/
│   ├── README.md (ce fichier)
│   └── taxonomy/
│       ├── README.md
│       ├── CURRENT_STATE.md
│       ├── CHANGELOG.md
│       └── MIGRATION_TECH_TAXONOMY.md
├── src/
│   ├── scripts/
│   │   ├── migrate-to-tech-taxonomy.ts
│   │   ├── assign-product-tags.ts
│   │   └── import-chamelo-*.ts
│   ├── config/
│   │   └── taxonomy.ts (à créer)
│   └── ...
├── backups/ (git-ignored)
├── medusa-config.ts
└── package.json

mytechgear-frontend/
├── src/
│   └── app/
│       ├── admin/
│       │   ├── categories/
│       │   │   ├── page.tsx
│       │   │   └── [id]/page.tsx
│       │   └── collections/
│       │       ├── page.tsx
│       │       └── [id]/page.tsx
│       └── api/
│           └── admin/
│               ├── categories/
│               │   ├── route.ts
│               │   └── [id]/route.ts
│               └── collections/
│                   ├── route.ts
│                   └── [id]/route.ts
└── ...
```

---

## 🔗 Références Externes

- **Medusa v2 Docs** : https://docs.medusajs.com/v2
- **Chamelo (source produits)** : https://chamelo.com/
- **Next.js App Router** : https://nextjs.org/docs/app
- **PostgreSQL** : https://www.postgresql.org/docs/

---

## 📞 Support

### Documentation

1. **Taxonomie** : [taxonomy/README.md](./taxonomy/README.md)
2. **Scripts** : Voir code source `src/scripts/`
3. **API** : Medusa docs + code frontend `api/admin/`

### Troubleshooting

```bash
# Services pas démarrés
gmdev status
gmdev start mytechgear-medusa

# Erreurs DB
psql $DATABASE_URL -c "SELECT version();"

# Catégories manquantes
psql $DATABASE_URL -c "SELECT COUNT(*) FROM product_category;"

# Logs backend
gmdev logs mytechgear-medusa -f
```

### Contacts

- **Issues** : Créer issue GitHub
- **Questions** : Voir documentation taxonomy/

---

**Mainteneur** : Claude Code
**Projet** : MyTechGear Medusa Backend
**Version** : 2.0.0 (Taxonomie par Technologie)
**Dernière mise à jour** : 2026-02-21
