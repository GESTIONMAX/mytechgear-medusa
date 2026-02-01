#!/bin/bash

# =====================================================================
# Script de Migration PostgreSQL vers Coolify
# MyTechGear Medusa Backend
# =====================================================================

set -e  # Arrêter en cas d'erreur

# Couleurs pour les messages
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# URLs de connexion
LOCAL_DB="postgres://medusa:medusa@localhost:5433/medusa"
COOLIFY_DB="postgres://medusa:xhgcpIOO6ABnhTvAYqCPpUNVSHk8zCx1oUbwtcpwOEZ3xmeK6gDxRLrLKKw90jXU@78.47.79.58:5432/medusa"

# Extraction des paramètres Coolify
COOLIFY_USER="medusa"
COOLIFY_PASSWORD="xhgcpIOO6ABnhTvAYqCPpUNVSHk8zCx1oUbwtcpwOEZ3xmeK6gDxRLrLKKw90jXU"
COOLIFY_HOST="78.47.79.58"
COOLIFY_PORT="5432"
COOLIFY_DBNAME="medusa"

# Timestamp pour les fichiers
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR="backups"
BACKUP_FILE="$BACKUP_DIR/medusa-$TIMESTAMP.dump"

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   Migration PostgreSQL Medusa vers Coolify${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# =====================================================================
# ÉTAPE 1 : Créer un backup de la base locale
# =====================================================================

echo -e "${YELLOW}[1/6] Création du backup de la base locale...${NC}"

# Créer le dossier backups s'il n'existe pas
mkdir -p "$BACKUP_DIR"

# Créer le dump
echo "Dump PostgreSQL local → $BACKUP_FILE"
pg_dump -h localhost -p 5433 -U medusa -d medusa \
  --no-owner \
  --no-acl \
  -F c \
  -f "$BACKUP_FILE"

# Vérifier le fichier
if [ -f "$BACKUP_FILE" ]; then
  BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
  echo -e "${GREEN}✅ Backup créé : $BACKUP_FILE ($BACKUP_SIZE)${NC}"
else
  echo -e "${RED}❌ Erreur : Backup non créé${NC}"
  exit 1
fi

# Compter les tables dans le dump
TABLE_COUNT=$(pg_restore -l "$BACKUP_FILE" | grep -c "TABLE DATA" || true)
echo "   Tables trouvées : $TABLE_COUNT"
echo ""

# =====================================================================
# ÉTAPE 2 : Tester la connexion à Coolify
# =====================================================================

echo -e "${YELLOW}[2/6] Test de la connexion à Coolify...${NC}"

# Tester la connexion
if PGPASSWORD="$COOLIFY_PASSWORD" psql -h "$COOLIFY_HOST" -p "$COOLIFY_PORT" -U "$COOLIFY_USER" -d "$COOLIFY_DBNAME" -c "SELECT version();" > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Connexion réussie à Coolify PostgreSQL${NC}"

  # Afficher la version
  PG_VERSION=$(PGPASSWORD="$COOLIFY_PASSWORD" psql -h "$COOLIFY_HOST" -p "$COOLIFY_PORT" -U "$COOLIFY_USER" -d "$COOLIFY_DBNAME" -t -c "SELECT version();")
  echo "   $PG_VERSION"
else
  echo -e "${RED}❌ Erreur : Impossible de se connecter à Coolify${NC}"
  echo "   Vérifiez :"
  echo "   - L'IP et le port : $COOLIFY_HOST:$COOLIFY_PORT"
  echo "   - Le mot de passe"
  echo "   - Le firewall / Public Access dans Coolify"
  exit 1
fi
echo ""

# =====================================================================
# ÉTAPE 3 : Vérifier que la base Coolify est vide
# =====================================================================

echo -e "${YELLOW}[3/6] Vérification de l'état de la base Coolify...${NC}"

TABLE_COUNT_COOLIFY=$(PGPASSWORD="$COOLIFY_PASSWORD" psql -h "$COOLIFY_HOST" -p "$COOLIFY_PORT" -U "$COOLIFY_USER" -d "$COOLIFY_DBNAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | tr -d ' ')

if [ "$TABLE_COUNT_COOLIFY" -gt 0 ]; then
  echo -e "${YELLOW}⚠️  La base Coolify contient déjà $TABLE_COUNT_COOLIFY tables${NC}"
  read -p "Voulez-vous continuer et écraser les données ? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}❌ Migration annulée${NC}"
    exit 1
  fi

  # Supprimer toutes les tables
  echo "   Suppression des tables existantes..."
  PGPASSWORD="$COOLIFY_PASSWORD" psql -h "$COOLIFY_HOST" -p "$COOLIFY_PORT" -U "$COOLIFY_USER" -d "$COOLIFY_DBNAME" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
  echo -e "${GREEN}✅ Tables supprimées${NC}"
else
  echo -e "${GREEN}✅ Base Coolify vide, prête pour la migration${NC}"
fi
echo ""

# =====================================================================
# ÉTAPE 4 : Restaurer le dump sur Coolify
# =====================================================================

echo -e "${YELLOW}[4/6] Restauration du dump sur Coolify...${NC}"
echo "   Cela peut prendre quelques minutes..."

# Restaurer le dump
PGPASSWORD="$COOLIFY_PASSWORD" pg_restore \
  -h "$COOLIFY_HOST" \
  -p "$COOLIFY_PORT" \
  -U "$COOLIFY_USER" \
  -d "$COOLIFY_DBNAME" \
  --no-owner \
  --no-acl \
  -v \
  "$BACKUP_FILE" 2>&1 | grep -E "(processing|creating|TABLE DATA)" || true

if [ $? -eq 0 ] || [ $? -eq 141 ]; then
  echo -e "${GREEN}✅ Dump restauré sur Coolify${NC}"
else
  echo -e "${RED}❌ Erreur lors de la restauration${NC}"
  exit 1
fi
echo ""

# =====================================================================
# ÉTAPE 5 : Vérifier les données migrées
# =====================================================================

echo -e "${YELLOW}[5/6] Vérification des données migrées...${NC}"

# Compter les produits
PRODUCT_COUNT=$(PGPASSWORD="$COOLIFY_PASSWORD" psql -h "$COOLIFY_HOST" -p "$COOLIFY_PORT" -U "$COOLIFY_USER" -d "$COOLIFY_DBNAME" -t -c "SELECT COUNT(*) FROM product;" | tr -d ' ')
echo "   Produits : $PRODUCT_COUNT"

# Compter les variantes
VARIANT_COUNT=$(PGPASSWORD="$COOLIFY_PASSWORD" psql -h "$COOLIFY_HOST" -p "$COOLIFY_PORT" -U "$COOLIFY_USER" -d "$COOLIFY_DBNAME" -t -c "SELECT COUNT(*) FROM product_variant;" | tr -d ' ')
echo "   Variantes : $VARIANT_COUNT"

# Compter les tags
TAG_COUNT=$(PGPASSWORD="$COOLIFY_PASSWORD" psql -h "$COOLIFY_HOST" -p "$COOLIFY_PORT" -U "$COOLIFY_USER" -d "$COOLIFY_DBNAME" -t -c "SELECT COUNT(*) FROM product_tag;" | tr -d ' ')
echo "   Tags : $TAG_COUNT"

# Compter les collections
COLLECTION_COUNT=$(PGPASSWORD="$COOLIFY_PASSWORD" psql -h "$COOLIFY_HOST" -p "$COOLIFY_PORT" -U "$COOLIFY_USER" -d "$COOLIFY_DBNAME" -t -c "SELECT COUNT(*) FROM product_collection;" | tr -d ' ')
echo "   Collections : $COLLECTION_COUNT"

# Vérifier les données
if [ "$PRODUCT_COUNT" -gt 0 ] && [ "$VARIANT_COUNT" -gt 0 ]; then
  echo -e "${GREEN}✅ Données migrées avec succès${NC}"
else
  echo -e "${RED}❌ Erreur : Données manquantes${NC}"
  exit 1
fi
echo ""

# =====================================================================
# ÉTAPE 6 : Mettre à jour le .env
# =====================================================================

echo -e "${YELLOW}[6/6] Mise à jour du .env...${NC}"

# Backup .env actuel
cp .env ".env.backup-local-$TIMESTAMP"
echo "   Backup : .env.backup-local-$TIMESTAMP"

# Remplacer DATABASE_URL
sed -i "s|DATABASE_URL=postgres://medusa:medusa@localhost:5433/medusa|DATABASE_URL=$COOLIFY_DB|g" .env

echo -e "${GREEN}✅ .env mis à jour avec la DATABASE_URL Coolify${NC}"
echo ""

# =====================================================================
# RÉSUMÉ
# =====================================================================

echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}   ✅ Migration terminée avec succès !${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo "Résumé :"
echo "  • Backup local : $BACKUP_FILE ($BACKUP_SIZE)"
echo "  • Produits : $PRODUCT_COUNT"
echo "  • Variantes : $VARIANT_COUNT"
echo "  • Tags : $TAG_COUNT"
echo "  • Collections : $COLLECTION_COUNT"
echo ""
echo "Prochaines étapes :"
echo "  1. Redémarrer Medusa : npm run dev"
echo "  2. Vérifier l'admin : http://localhost:9000/app"
echo "  3. Vérifier le Store API : http://localhost:9000/store/products"
echo ""
echo -e "${BLUE}Rollback (si problème) :${NC}"
echo "  cp .env.backup-local-$TIMESTAMP .env"
echo ""
