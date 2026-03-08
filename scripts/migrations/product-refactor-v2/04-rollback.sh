#!/bin/bash
#
# Rollback Migration - Restore Database Backup
#
# Restores the PostgreSQL database from a backup file.
# Use this if migration fails or you need to undo changes.
#
# Usage: ./04-rollback.sh [backup-file.sql.gz]
#

set -e  # Exit on error

# ─── Configuration ───────────────────────────────────────────────────────────

BACKUP_DIR="./backups"
DATABASE_URL="${DATABASE_URL:-postgres://user:password@localhost:5433/medusa}"
LOG_FILE="${BACKUP_DIR}/rollback-$(date +%Y%m%d-%H%M%S).log"

# ─── Functions ───────────────────────────────────────────────────────────────

log() {
  echo "[$(date +%H:%M:%S)] $1" | tee -a "${LOG_FILE}"
}

error() {
  echo "[$(date +%H:%M:%S)] ❌ ERROR: $1" | tee -a "${LOG_FILE}"
  exit 1
}

confirm() {
  read -p "$1 (yes/no): " response
  if [ "$response" != "yes" ]; then
    echo "Cancelled by user"
    exit 0
  fi
}

# ─── Select Backup File ──────────────────────────────────────────────────────

echo "═══════════════════════════════════════════════════════════════"
echo "  Database Rollback - Restore from Backup"
echo "  ⚠️  THIS WILL OVERWRITE YOUR CURRENT DATABASE"
echo "═══════════════════════════════════════════════════════════════"
echo ""

if [ -n "$1" ]; then
  # Backup file provided as argument
  BACKUP_FILE="$1"
else
  # List available backups
  echo "Available backups in ${BACKUP_DIR}:"
  echo ""

  backups=($(ls -t ${BACKUP_DIR}/medusa-backup-*.sql.gz 2>/dev/null))

  if [ ${#backups[@]} -eq 0 ]; then
    error "No backup files found in ${BACKUP_DIR}"
  fi

  # Display backups with index
  for i in "${!backups[@]}"; do
    backup="${backups[$i]}"
    size=$(du -h "$backup" | cut -f1)
    timestamp=$(basename "$backup" | sed 's/medusa-backup-\(.*\)\.sql\.gz/\1/')
    echo "  [$i] $backup"
    echo "      Size: $size"
    echo "      Date: $timestamp"
    echo ""
  done

  # Ask user to select
  read -p "Select backup number to restore (0-$((${#backups[@]} - 1))): " selection

  if ! [[ "$selection" =~ ^[0-9]+$ ]] || [ "$selection" -ge ${#backups[@]} ]; then
    error "Invalid selection"
  fi

  BACKUP_FILE="${backups[$selection]}"
fi

# ─── Verify Backup File ──────────────────────────────────────────────────────

log "🔍 Verifying backup file..."

if [ ! -f "$BACKUP_FILE" ]; then
  error "Backup file not found: $BACKUP_FILE"
fi

BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
log "Backup file: $BACKUP_FILE"
log "Backup size: $BACKUP_SIZE"

# ─── Pre-flight Checks ───────────────────────────────────────────────────────

log "🔍 Pre-flight checks..."

# Check if gunzip is available
if ! command -v gunzip &> /dev/null; then
  error "gunzip not found. Please install gzip tools."
fi

# Check if psql is available
if ! command -v psql &> /dev/null; then
  error "psql not found. Please install PostgreSQL client tools."
fi

# Check database connectivity
log "Testing database connection..."
if ! psql "${DATABASE_URL}" -c "SELECT 1" &> /dev/null; then
  error "Cannot connect to database. Check DATABASE_URL and tunnel."
fi

# ─── Final Confirmation ──────────────────────────────────────────────────────

echo ""
echo "⚠️  CRITICAL WARNINGS:"
echo "   1. This will DELETE ALL DATA in your current database"
echo "   2. This will RESTORE data from: $(basename $BACKUP_FILE)"
echo "   3. This operation CANNOT BE UNDONE"
echo "   4. Make sure you have a backup of CURRENT state if needed"
echo ""

confirm "Are you ABSOLUTELY SURE you want to restore from backup?"

# ─── Create Backup of Current State ──────────────────────────────────────────

log "📦 Creating backup of current state before rollback..."

CURRENT_BACKUP="${BACKUP_DIR}/pre-rollback-$(date +%Y%m%d-%H%M%S).sql"

if pg_dump "${DATABASE_URL}" \
  --no-owner \
  --no-acl \
  --format=plain \
  > "${CURRENT_BACKUP}" 2>> "${LOG_FILE}"; then

  gzip "${CURRENT_BACKUP}"
  CURRENT_BACKUP_SIZE=$(du -h "${CURRENT_BACKUP}.gz" | cut -f1)
  log "✅ Current state backed up: ${CURRENT_BACKUP}.gz (${CURRENT_BACKUP_SIZE})"
else
  error "Failed to backup current state. Aborting rollback."
fi

# ─── Decompress Backup ───────────────────────────────────────────────────────

log "🗜️  Decompressing backup..."

TEMP_SQL="${BACKUP_FILE%.gz}"

if [ "$BACKUP_FILE" != "$TEMP_SQL" ]; then
  # File is gzipped
  gunzip -c "$BACKUP_FILE" > "$TEMP_SQL"
  log "✅ Decompressed to: $TEMP_SQL"
else
  # File is already decompressed
  TEMP_SQL="$BACKUP_FILE"
  log "Using uncompressed file: $TEMP_SQL"
fi

# ─── Drop and Recreate Database ──────────────────────────────────────────────

log "🗑️  Dropping current database..."

# Extract database name from URL
DB_NAME=$(echo "$DATABASE_URL" | sed -n 's/.*\/\([^?]*\).*/\1/p')

log "Database name: $DB_NAME"

# Terminate existing connections
psql "${DATABASE_URL}" -c "
  SELECT pg_terminate_backend(pg_stat_activity.pid)
  FROM pg_stat_activity
  WHERE pg_stat_activity.datname = '$DB_NAME'
    AND pid <> pg_backend_pid();
" &>> "${LOG_FILE}" || true

# Drop database
psql "${DATABASE_URL}" -c "DROP DATABASE IF EXISTS ${DB_NAME};" &>> "${LOG_FILE}" || {
  # If drop fails, try to connect to postgres database
  POSTGRES_URL="${DATABASE_URL%/*}/postgres"
  psql "${POSTGRES_URL}" -c "DROP DATABASE IF EXISTS ${DB_NAME};" &>> "${LOG_FILE}"
}

log "✅ Database dropped"

# Recreate database
POSTGRES_URL="${DATABASE_URL%/*}/postgres"
psql "${POSTGRES_URL}" -c "CREATE DATABASE ${DB_NAME};" &>> "${LOG_FILE}"

log "✅ Database recreated"

# ─── Restore Backup ──────────────────────────────────────────────────────────

log "📥 Restoring backup..."

if psql "${DATABASE_URL}" < "$TEMP_SQL" &>> "${LOG_FILE}"; then
  log "✅ Backup restored successfully"
else
  error "Failed to restore backup. Check ${LOG_FILE} for details."
fi

# ─── Cleanup ─────────────────────────────────────────────────────────────────

if [ "$BACKUP_FILE" != "$TEMP_SQL" ]; then
  rm -f "$TEMP_SQL"
  log "Cleaned up temporary file"
fi

# ─── Verify Restoration ──────────────────────────────────────────────────────

log "🔍 Verifying restoration..."

# Check if database is accessible
if psql "${DATABASE_URL}" -c "SELECT 1" &> /dev/null; then
  log "✅ Database is accessible"
else
  error "Database restoration failed - database not accessible"
fi

# Count products
PRODUCT_COUNT=$(psql "${DATABASE_URL}" -t -c "SELECT COUNT(*) FROM product;" 2>/dev/null | xargs)

if [ -n "$PRODUCT_COUNT" ]; then
  log "Products in database: $PRODUCT_COUNT"
else
  log "⚠️  Could not count products (table might not exist)"
fi

# ─── Summary ─────────────────────────────────────────────────────────────────

echo ""
log "═══════════════════════════════════════════════════════════════"
log "✅ ROLLBACK COMPLETED SUCCESSFULLY"
log "═══════════════════════════════════════════════════════════════"
log ""
log "Restored from: $(basename $BACKUP_FILE)"
log "Database: $DB_NAME"
log "Products: $PRODUCT_COUNT"
log ""
log "Backup of pre-rollback state: ${CURRENT_BACKUP}.gz"
log "Log file: ${LOG_FILE}"
log ""
log "Next steps:"
log "1. Verify database state"
log "2. Run 02-analyze-current-state.ts to check products"
log "3. Test application functionality"
log ""
log "═══════════════════════════════════════════════════════════════"

# ─── Exit ────────────────────────────────────────────────────────────────────

exit 0
