# ══════════════════════════════════════════════════════════════════════════════
# MinIO Bootstrap — 100% CLI (aucune dépendance à la console web)
# ══════════════════════════════════════════════════════════════════════════════
#
# Prérequis: MinIO Client (mc) installé
#   macOS:   brew install minio-mc
#   Linux:   wget https://dl.min.io/client/mc/release/linux-amd64/mc && chmod +x mc
#
# Usage:
#   make minio-alias       # Configurer l'alias mc (local ou prod)
#   make minio-bootstrap   # Créer bucket + user + policy
#   make minio-keys        # Générer service account (AccessKey/SecretKey)
#
# ══════════════════════════════════════════════════════════════════════════════

# ─── Variables d'environnement ────────────────────────────────────────────────

# Connexion MinIO (admin root)
ENDPOINT         ?= http://localhost:9000
MINIO_ROOT_USER  ?= minioadmin
MINIO_ROOT_PASSWORD ?= minioadmin

# Configuration bucket + user
ALIAS        ?= local
BUCKET       ?= mytechgear-assets
USER         ?= mytechgear-app
POLICY_NAME  ?= mytechgear-rw

# ─── Targets ──────────────────────────────────────────────────────────────────

.PHONY: help
help: ## Afficher l'aide
	@echo ""
	@echo "════════════════════════════════════════════════════════════════════"
	@echo "MinIO Bootstrap — 100% CLI"
	@echo "════════════════════════════════════════════════════════════════════"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo ""

.PHONY: minio-alias
minio-alias: ## Configurer l'alias mc (ENDPOINT, ROOT_USER, ROOT_PASSWORD)
	@echo "▸ Configuration de l'alias '$(ALIAS)' → $(ENDPOINT)"
	@mc alias set $(ALIAS) $(ENDPOINT) $(MINIO_ROOT_USER) $(MINIO_ROOT_PASSWORD)
	@echo "✓ Alias configuré"
	@echo ""
	@echo "Tester la connexion:"
	@echo "  mc admin info $(ALIAS)"
	@echo ""

.PHONY: minio-bootstrap
minio-bootstrap: ## Exécuter bootstrap.sh (créer bucket, user, policy)
	@chmod +x ./bootstrap.sh
	@ALIAS=$(ALIAS) BUCKET=$(BUCKET) USER=$(USER) POLICY_NAME=$(POLICY_NAME) ./bootstrap.sh

.PHONY: minio-keys
minio-keys: ## Générer un Service Account (AccessKey/SecretKey)
	@echo ""
	@echo "════════════════════════════════════════════════════════════════════"
	@echo "Génération Service Account pour $(USER)"
	@echo "════════════════════════════════════════════════════════════════════"
	@echo ""
	@mc admin user svcacct add $(ALIAS) $(USER) --name "$(USER)-svcacct" 2>&1 | tee /tmp/minio-svcacct.txt
	@echo ""
	@echo "════════════════════════════════════════════════════════════════════"
	@echo "⚠️  Sauvegarder ces clés dans .env:"
	@echo "════════════════════════════════════════════════════════════════════"
	@echo ""
	@echo "S3_ACCESS_KEY_ID=$$(grep 'Access Key' /tmp/minio-svcacct.txt | awk '{print $$3}')"
	@echo "S3_SECRET_ACCESS_KEY=$$(grep 'Secret Key' /tmp/minio-svcacct.txt | awk '{print $$3}')"
	@echo ""
	@echo "════════════════════════════════════════════════════════════════════"

.PHONY: minio-status
minio-status: ## Vérifier l'état du bucket et des permissions
	@echo ""
	@echo "════════════════════════════════════════════════════════════════════"
	@echo "MinIO Status — $(ALIAS)"
	@echo "════════════════════════════════════════════════════════════════════"
	@echo ""
	@echo "▸ Bucket: $(BUCKET)"
	@mc ls $(ALIAS)/$(BUCKET) 2>&1 | head -5 || echo "  (vide ou inaccessible)"
	@echo ""
	@echo "▸ User: $(USER)"
	@mc admin user info $(ALIAS) $(USER) 2>/dev/null || echo "  User non trouvé"
	@echo ""
	@echo "▸ Policy: $(POLICY_NAME)"
	@mc admin policy info $(ALIAS) $(POLICY_NAME) 2>/dev/null || echo "  Policy non trouvée"
	@echo ""
	@echo "════════════════════════════════════════════════════════════════════"

.PHONY: minio-clean
minio-clean: ## ⚠️  Supprimer le bucket et le user (DANGER)
	@echo "⚠️  Cette commande va SUPPRIMER:"
	@echo "  - Bucket: $(BUCKET)"
	@echo "  - User:   $(USER)"
	@echo ""
	@read -p "Confirmer la suppression (tapez 'yes'): " confirm; \
	if [ "$$confirm" = "yes" ]; then \
		echo "▸ Suppression du bucket..."; \
		mc rb --force $(ALIAS)/$(BUCKET) 2>/dev/null || echo "  Bucket déjà supprimé"; \
		echo "▸ Suppression du user..."; \
		mc admin user remove $(ALIAS) $(USER) 2>/dev/null || echo "  User déjà supprimé"; \
		echo "✓ Nettoyage terminé"; \
	else \
		echo "Annulé"; \
	fi

# ─── Exemples de configuration ────────────────────────────────────────────────

.PHONY: example-local
example-local: ## Exemple: setup local (localhost:9000)
	@echo "make minio-alias ENDPOINT=http://localhost:9000 MINIO_ROOT_USER=minioadmin MINIO_ROOT_PASSWORD=minioadmin"
	@echo "make minio-bootstrap"
	@echo "make minio-keys"

.PHONY: example-prod
example-prod: ## Exemple: setup prod (réseau Docker Coolify)
	@echo "make minio-alias ALIAS=prod ENDPOINT=http://minio:9000 MINIO_ROOT_USER=admin MINIO_ROOT_PASSWORD=****"
	@echo "make minio-bootstrap ALIAS=prod"
	@echo "make minio-keys ALIAS=prod"
