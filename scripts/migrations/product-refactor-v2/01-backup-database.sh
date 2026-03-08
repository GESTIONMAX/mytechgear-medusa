#!/bin/bash
#
# Backup Database - Production Safety
#
# Creates a timestamped backup of the PostgreSQL database
# before any migration operations.
#
# Usage: ./01-backup-database.sh
#

set -e  # Exit on error

# ─── Configuration ───────────────────────────────────────────────────────────

BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/medusa-backup-${TIMESTAMP}.sql"
LOG_FILE="${BACKUP_DIR}/backup-${TIMESTAMP}.log"

# Database connection (from .env)
DATABASE_URL="${DATABASE_URL:-postgres://user:password@localhost:5433/medusa}"

# ─── Functions ───────────────────────────────────────────────────────────────

log() {
  echo "[$(date +%H:%M:%S)] $1" | tee -a "${LOG_FILE}"
}

error() {
  echo "[$(date +%H:%M:%S)] ❌ ERROR: $1" | tee -a "${LOG_FILE}"
  exit 1
}

# ─── Pre-flight Checks ───────────────────────────────────────────────────────

log "🔍 Pre-flight checks..."

# Create backup directory
mkdir -p "${BACKUP_DIR}"

# Check if pg_dump is available
if ! command -v pg_dump &> /dev/null; then
  error "pg_dump not found. Please install PostgreSQL client tools."
fi

# Check database connectivity
log "Testing database connection..."
if ! psql "${DATABASE_URL}" -c "SELECT 1" &> /dev/null; then
  error "Cannot connect to database. Check DATABASE_URL and tunnel."
fi

# ─── Backup Database ─────────────────────────────────────────────────────────

log "📦 Starting database backup..."
log "Target: ${BACKUP_FILE}"

# Execute backup
if pg_dump "${DATABASE_URL}" \
  --verbose \
  --no-owner \
  --no-acl \
  --format=plain \
  > "${BACKUP_FILE}" 2>> "${LOG_FILE}"; then

  log "✅ Backup completed successfully"
else
  error "Backup failed. Check ${LOG_FILE} for details."
fi

# ─── Verify Backup ───────────────────────────────────────────────────────────

log "🔍 Verifying backup integrity..."

# Check file size
BACKUP_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
log "Backup size: ${BACKUP_SIZE}"

# Check if backup contains data
if grep -q "CREATE TABLE" "${BACKUP_FILE}"; then
  log "✅ Backup contains table definitions"
else
  error "Backup appears incomplete (no table definitions found)"
fi

# Count products in backup
PRODUCT_COUNT=$(grep -c "INSERT INTO product" "${BACKUP_FILE}" || echo "0")
log "Products in backup: ${PRODUCT_COUNT}"

# ─── Compress Backup ─────────────────────────────────────────────────────────

log "🗜️  Compressing backup..."
gzip "${BACKUP_FILE}"
COMPRESSED_FILE="${BACKUP_FILE}.gz"
COMPRESSED_SIZE=$(du -h "${COMPRESSED_FILE}" | cut -f1)

log "✅ Compressed to: ${COMPRESSED_SIZE}"

# ─── Summary ─────────────────────────────────────────────────────────────────

echo ""
log "═══════════════════════════════════════════════════════════════"
log "✅ BACKUP COMPLETED SUCCESSFULLY"
log "═══════════════════════════════════════════════════════════════"
log ""
log "Backup file: ${COMPRESSED_FILE}"
log "Backup size: ${COMPRESSED_SIZE}"
log "Products: ${PRODUCT_COUNT}"
log "Log file: ${LOG_FILE}"
log ""
log "To restore this backup:"
log "  gunzip ${COMPRESSED_FILE}"
log "  psql \${DATABASE_URL} < ${BACKUP_FILE}"
log ""
log "═══════════════════════════════════════════════════════════════"

# ─── Exit ────────────────────────────────────────────────────────────────────

exit 0
