#!/bin/bash

###############################################################################
# Backup PostgreSQL Medusa Database
#
# Usage: ./scripts/backup-database.sh
#
# Ce script crée un dump de la base PostgreSQL Medusa locale
# avant migration vers Coolify
###############################################################################

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration (lire depuis .env)
DB_HOST="localhost"
DB_PORT="5433"
DB_NAME="medusa"
DB_USER="medusa"
DB_PASSWORD="medusa"

# Backup directory
BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE_DUMP="${BACKUP_DIR}/medusa-${TIMESTAMP}.dump"
BACKUP_FILE_SQL="${BACKUP_DIR}/medusa-${TIMESTAMP}.sql"

###############################################################################
# Functions
###############################################################################

print_step() {
    echo -e "${BLUE}==>${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

###############################################################################
# Main
###############################################################################

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║         Backup PostgreSQL Medusa Database                     ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Vérifier que PostgreSQL est installé
if ! command -v pg_dump &> /dev/null; then
    print_error "pg_dump n'est pas installé"
    echo "Installez PostgreSQL client:"
    echo "  Ubuntu/Debian: sudo apt install postgresql-client"
    echo "  macOS: brew install postgresql"
    exit 1
fi

# Créer le dossier backups
print_step "Création du dossier backups..."
mkdir -p "${BACKUP_DIR}"
print_success "Dossier créé: ${BACKUP_DIR}"

# Tester la connexion
print_step "Test de connexion à PostgreSQL..."
export PGPASSWORD="${DB_PASSWORD}"
if psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -c "SELECT version();" > /dev/null 2>&1; then
    print_success "Connexion réussie"
else
    print_error "Impossible de se connecter à PostgreSQL"
    echo "Vérifiez que:"
    echo "  - PostgreSQL est lancé (port ${DB_PORT})"
    echo "  - Les credentials sont corrects (user: ${DB_USER}, db: ${DB_NAME})"
    exit 1
fi

# Compter les données
print_step "Analyse des données à sauvegarder..."
PRODUCT_COUNT=$(psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -t -c "SELECT COUNT(*) FROM product;" 2>/dev/null | xargs || echo "0")
VARIANT_COUNT=$(psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -t -c "SELECT COUNT(*) FROM product_variant;" 2>/dev/null | xargs || echo "0")
TAG_COUNT=$(psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -t -c "SELECT COUNT(*) FROM product_tag;" 2>/dev/null | xargs || echo "0")

echo "  Produits: ${PRODUCT_COUNT}"
echo "  Variantes: ${VARIANT_COUNT}"
echo "  Tags: ${TAG_COUNT}"

if [ "${PRODUCT_COUNT}" -eq "0" ]; then
    print_warning "Aucun produit trouvé dans la base"
    read -p "Continuer quand même? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Créer le dump custom format (.dump)
print_step "Création du dump (format custom)..."
pg_dump -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" \
    --no-owner \
    --no-acl \
    -F c \
    -f "${BACKUP_FILE_DUMP}"

if [ -f "${BACKUP_FILE_DUMP}" ]; then
    DUMP_SIZE=$(du -h "${BACKUP_FILE_DUMP}" | cut -f1)
    print_success "Dump créé: ${BACKUP_FILE_DUMP} (${DUMP_SIZE})"
else
    print_error "Échec création dump custom"
    exit 1
fi

# Créer le dump SQL format (.sql)
print_step "Création du dump (format SQL)..."
pg_dump -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" \
    --no-owner \
    --no-acl \
    -f "${BACKUP_FILE_SQL}"

if [ -f "${BACKUP_FILE_SQL}" ]; then
    SQL_SIZE=$(du -h "${BACKUP_FILE_SQL}" | cut -f1)
    print_success "Dump créé: ${BACKUP_FILE_SQL} (${SQL_SIZE})"
else
    print_error "Échec création dump SQL"
    exit 1
fi

# Vérifier le contenu du dump
print_step "Vérification du dump..."
TABLES_COUNT=$(pg_restore -l "${BACKUP_FILE_DUMP}" 2>/dev/null | grep "TABLE DATA" | wc -l)
print_success "${TABLES_COUNT} tables sauvegardées"

# Résumé
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                   BACKUP RÉUSSI ✓                              ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Fichiers créés:${NC}"
echo "  📦 ${BACKUP_FILE_DUMP} (${DUMP_SIZE})"
echo "  📄 ${BACKUP_FILE_SQL} (${SQL_SIZE})"
echo ""
echo -e "${BLUE}Données sauvegardées:${NC}"
echo "  📊 ${PRODUCT_COUNT} produits"
echo "  📊 ${VARIANT_COUNT} variantes"
echo "  📊 ${TAG_COUNT} tags"
echo "  📊 ${TABLES_COUNT} tables"
echo ""
echo -e "${YELLOW}Prochaines étapes:${NC}"
echo "  1. Créer PostgreSQL sur Coolify"
echo "  2. Noter les credentials Coolify"
echo "  3. Restaurer avec:"
echo "     pg_restore -h HOST -p 5432 -U medusa -d medusa ${BACKUP_FILE_DUMP}"
echo ""
echo -e "${BLUE}Documentation complète:${NC} docs/COOLIFY_DATABASE_MIGRATION.md"
echo ""

# Nettoyer PGPASSWORD
unset PGPASSWORD
