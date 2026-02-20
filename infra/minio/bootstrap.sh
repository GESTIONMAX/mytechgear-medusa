#!/usr/bin/env bash
#
# bootstrap.sh — MinIO setup 100% CLI (idempotent)
#
# Usage:
#   ALIAS=local BUCKET=mytechgear-assets USER=mytechgear-app POLICY_NAME=mytechgear-rw ./bootstrap.sh
#
# Variables requises:
#   ALIAS        — alias mc configuré (ex: local, prod)
#   BUCKET       — nom du bucket à créer
#   USER         — nom du user applicatif
#   POLICY_NAME  — nom de la policy RW bucket-scoped
#

set -euo pipefail

# ─── Variables ────────────────────────────────────────────────────────────────

ALIAS="${ALIAS:?ALIAS requis (ex: local)}"
BUCKET="${BUCKET:?BUCKET requis (ex: mytechgear-assets)}"
USER="${USER:?USER requis (ex: mytechgear-app)}"
POLICY_NAME="${POLICY_NAME:?POLICY_NAME requis (ex: mytechgear-rw)}"
USER_PASSWORD="${USER_PASSWORD:-$(openssl rand -base64 32 | tr -d '\n')}"

echo "════════════════════════════════════════════════════════════════════════"
echo "MinIO Bootstrap — Configuration 100% CLI"
echo "════════════════════════════════════════════════════════════════════════"
echo "Alias        : $ALIAS"
echo "Bucket       : $BUCKET"
echo "User         : $USER"
echo "Policy       : $POLICY_NAME"
echo "════════════════════════════════════════════════════════════════════════"

# ─── 1. Créer le bucket ───────────────────────────────────────────────────────

echo ""
echo "▸ 1/5 Création du bucket $BUCKET..."

if mc mb --ignore-existing "$ALIAS/$BUCKET" 2>/dev/null; then
  echo "  ✓ Bucket créé ou déjà existant"
else
  echo "  ⚠ Bucket existe déjà (ignoré)"
fi

# ─── 2. Configurer accès public (download only) ──────────────────────────────

echo ""
echo "▸ 2/5 Configuration accès public (download)..."

mc anonymous set download "$ALIAS/$BUCKET" >/dev/null
echo "  ✓ Policy publique: download (lecture seule anonyme)"

# ─── 3. Créer le user applicatif ──────────────────────────────────────────────

echo ""
echo "▸ 3/5 Création du user $USER..."

if mc admin user info "$ALIAS" "$USER" >/dev/null 2>&1; then
  echo "  ⚠ User $USER existe déjà (ignoré)"
else
  mc admin user add "$ALIAS" "$USER" "$USER_PASSWORD" >/dev/null
  echo "  ✓ User créé: $USER"
  echo "  ⚠ Password (à sauvegarder): $USER_PASSWORD"
fi

# ─── 4. Créer/update policy RW bucket-scoped ──────────────────────────────────

echo ""
echo "▸ 4/5 Création/update de la policy $POLICY_NAME..."

POLICY_FILE="/tmp/${POLICY_NAME}.json"

cat > "$POLICY_FILE" <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::${BUCKET}",
        "arn:aws:s3:::${BUCKET}/*"
      ]
    }
  ]
}
EOF

mc admin policy create "$ALIAS" "$POLICY_NAME" "$POLICY_FILE" 2>/dev/null || \
  mc admin policy update "$ALIAS" "$POLICY_NAME" "$POLICY_FILE" >/dev/null

echo "  ✓ Policy $POLICY_NAME créée/mise à jour"

rm -f "$POLICY_FILE"

# ─── 5. Attacher la policy au user ────────────────────────────────────────────

echo ""
echo "▸ 5/5 Attachement de la policy au user..."

mc admin policy attach "$ALIAS" "$POLICY_NAME" --user "$USER" >/dev/null
echo "  ✓ Policy $POLICY_NAME attachée à $USER"

# ─── Résumé ───────────────────────────────────────────────────────────────────

echo ""
echo "════════════════════════════════════════════════════════════════════════"
echo "✅ Bootstrap terminé avec succès"
echo "════════════════════════════════════════════════════════════════════════"
echo ""
echo "Prochaines étapes:"
echo ""
echo "  1. Générer les clés applicatives (Service Account):"
echo "     mc admin user svcacct add $ALIAS $USER"
echo ""
echo "  2. Utiliser les clés dans .env:"
echo "     S3_ACCESS_KEY_ID=<access-key>"
echo "     S3_SECRET_ACCESS_KEY=<secret-key>"
echo "     S3_ENDPOINT=http://localhost:19000  # dev (via SSH tunnel)"
echo "     S3_ENDPOINT=http://minio:9000       # prod (réseau Docker)"
echo "     FILE_URL=https://s3.assets.mytechgear.eu"
echo ""
echo "  3. Tester l'accès:"
echo "     mc ls $ALIAS/$BUCKET"
echo ""
echo "════════════════════════════════════════════════════════════════════════"
