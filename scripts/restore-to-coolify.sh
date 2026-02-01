#!/bin/bash

###############################################################################
# Restore PostgreSQL Medusa Database to Coolify
#
# Usage: ./scripts/restore-to-coolify.sh <backup-file> <coolify-database-url>
#
# Example:
#   ./scripts/restore-to-coolify.sh \
#     backups/medusa-20260201-123456.dump \
#     postgres://medusa:PASSWORD@xxx.xxx.xxx.xxx:5432/medusa
###############################################################################

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

usage() {
    echo "Usage: $0 <backup-file> <coolify-database-url>"
    echo ""
    echo "Arguments:"
    echo "  backup-file          Chemin vers le fichier .dump ou .sql"
    echo "  coolify-database-url URL PostgreSQL Coolify"
    echo ""
    echo "Exemple:"
    echo "  $0 backups/medusa-20260201-123456.dump \\"
    echo "     postgres://medusa:PASSWORD@xxx.xxx.xxx.xxx:5432/medusa"
    exit 1
}

###############################################################################
# Main
###############################################################################

# Vérifier arguments
if [ $# -ne 2 ]; then
    usage
fi

BACKUP_FILE="$1"
DATABASE_URL="$2"

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║      Restore PostgreSQL Medusa Database to Coolify            ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Vérifier que le fichier backup existe
if [ ! -f "${BACKUP_FILE}" ]; then
    print_error "Fichier backup introuvable: ${BACKUP_FILE}"
    exit 1
fi

BACKUP_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
print_success "Fichier backup trouvé: ${BACKUP_FILE} (${BACKUP_SIZE})"

# Vérifier que pg_restore/psql est installé
if ! command -v pg_restore &> /dev/null && ! command -v psql &> /dev/null; then
    print_error "pg_restore/psql non installé"
    echo "Installez PostgreSQL client:"
    echo "  Ubuntu/Debian: sudo apt install postgresql-client"
    echo "  macOS: brew install postgresql"
    exit 1
fi

# Parser DATABASE_URL pour extraire les composants
print_step "Parsing de DATABASE_URL..."
# Format: postgres://user:password@host:port/database
if [[ $DATABASE_URL =~ postgres://([^:]+):([^@]+)@([^:]+):([^/]+)/(.+) ]]; then
    DB_USER="${BASH_REMATCH[1]}"
    DB_PASSWORD="${BASH_REMATCH[2]}"
    DB_HOST="${BASH_REMATCH[3]}"
    DB_PORT="${BASH_REMATCH[4]}"
    DB_NAME="${BASH_REMATCH[5]}"

    print_success "Host: ${DB_HOST}"
    print_success "Port: ${DB_PORT}"
    print_success "Database: ${DB_NAME}"
    print_success "User: ${DB_USER}"
else
    print_error "Format DATABASE_URL invalide"
    echo "Format attendu: postgres://user:password@host:port/database"
    exit 1
fi

# Tester la connexion
print_step "Test de connexion à Coolify PostgreSQL..."
export PGPASSWORD="${DB_PASSWORD}"
if psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -c "SELECT version();" > /dev/null 2>&1; then
    print_success "Connexion réussie"
else
    print_error "Impossible de se connecter à PostgreSQL Coolify"
    echo "Vérifiez que:"
    echo "  - Public Access est activé dans Coolify"
    echo "  - Le firewall autorise le port ${DB_PORT}"
    echo "  - Les credentials sont corrects"
    exit 1
fi

# Vérifier si la base contient déjà des données
print_step "Vérification de la base cible..."
TABLE_COUNT=$(psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | xargs || echo "0")

if [ "${TABLE_COUNT}" -gt "0" ]; then
    print_warning "La base contient déjà ${TABLE_COUNT} tables"
    echo ""
    read -p "⚠️  Voulez-vous DROP toutes les tables existantes? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_step "Suppression des tables existantes..."
        psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" > /dev/null 2>&1
        print_success "Tables supprimées"
    else
        print_error "Restauration annulée"
        exit 1
    fi
fi

# Restaurer selon le format du fichier
EXTENSION="${BACKUP_FILE##*.}"

if [ "${EXTENSION}" = "dump" ]; then
    print_step "Restauration du dump (format custom)..."
    pg_restore -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" \
        --no-owner \
        --no-acl \
        -v \
        "${BACKUP_FILE}"

    print_success "Restauration terminée"

elif [ "${EXTENSION}" = "sql" ]; then
    print_step "Restauration du dump (format SQL)..."
    psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" \
        -f "${BACKUP_FILE}"

    print_success "Restauration terminée"
else
    print_error "Format de fichier non supporté: ${EXTENSION}"
    echo "Formats acceptés: .dump, .sql"
    exit 1
fi

# Vérifier la restauration
print_step "Vérification de la restauration..."
RESTORED_TABLES=$(psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | xargs)
PRODUCT_COUNT=$(psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -t -c "SELECT COUNT(*) FROM product;" 2>/dev/null | xargs || echo "0")
VARIANT_COUNT=$(psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -t -c "SELECT COUNT(*) FROM product_variant;" 2>/dev/null | xargs || echo "0")
TAG_COUNT=$(psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -t -c "SELECT COUNT(*) FROM product_tag;" 2>/dev/null | xargs || echo "0")

print_success "${RESTORED_TABLES} tables restaurées"
print_success "${PRODUCT_COUNT} produits"
print_success "${VARIANT_COUNT} variantes"
print_success "${TAG_COUNT} tags"

# Optimisations post-restauration
print_step "Optimisations PostgreSQL..."
psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -c "ANALYZE;" > /dev/null 2>&1
psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -c "VACUUM ANALYZE;" > /dev/null 2>&1
print_success "Base optimisée"

# Résumé
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              RESTAURATION RÉUSSIE ✓                            ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Base Coolify:${NC}"
echo "  🌐 Host: ${DB_HOST}:${DB_PORT}"
echo "  🗄️  Database: ${DB_NAME}"
echo ""
echo -e "${BLUE}Données restaurées:${NC}"
echo "  📊 ${RESTORED_TABLES} tables"
echo "  📦 ${PRODUCT_COUNT} produits"
echo "  📦 ${VARIANT_COUNT} variantes"
echo "  🏷️  ${TAG_COUNT} tags"
echo ""
echo -e "${YELLOW}Prochaines étapes:${NC}"
echo "  1. Mettre à jour .env local avec DATABASE_URL Coolify"
echo "  2. Tester Medusa local avec DB Coolify: npm run dev"
echo "  3. Désactiver Public Access dans Coolify (sécurité)"
echo "  4. Déployer Medusa sur Coolify"
echo ""
echo -e "${BLUE}DATABASE_URL à utiliser:${NC}"
echo "  ${DATABASE_URL}"
echo ""

# Nettoyer PGPASSWORD
unset PGPASSWORD
