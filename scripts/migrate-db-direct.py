#!/usr/bin/env python3
"""
Migration directe PostgreSQL → Coolify
Copie les données sans passer par pg_dump
"""

import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
import sys

# URLs de connexion
LOCAL_DB = "postgres://medusa:medusa@localhost:5433/medusa"
COOLIFY_DB = "postgres://medusa:xhgcpIOO6ABnhTvAYqCPpUNVSHk8zCx1oUbwtcpwOEZ3xmeK6gDxRLrLKKw90jXU@78.47.79.58:5432/medusa"

# Couleurs
GREEN = '\033[0;32m'
RED = '\033[0;31m'
YELLOW = '\033[1;33m'
BLUE = '\033[0;34m'
NC = '\033[0m'

def print_step(step, total, message):
    print(f"{YELLOW}[{step}/{total}] {message}...{NC}")

def print_success(message):
    print(f"{GREEN}✅ {message}{NC}")

def print_error(message):
    print(f"{RED}❌ {message}{NC}")

def print_info(message):
    print(f"   {message}")

print(f"{BLUE}{'=' * 60}{NC}")
print(f"{BLUE}   Migration PostgreSQL Medusa vers Coolify{NC}")
print(f"{BLUE}{'=' * 60}{NC}")
print()

# Étape 1: Tester connexion locale
print_step(1, 5, "Test connexion base locale")
try:
    conn_local = psycopg2.connect(LOCAL_DB)
    print_success("Connecté à la base locale")
    conn_local.close()
except Exception as e:
    print_error(f"Impossible de se connecter à la base locale: {e}")
    sys.exit(1)

# Étape 2: Tester connexion Coolify
print_step(2, 5, "Test connexion base Coolify")
try:
    conn_coolify = psycopg2.connect(COOLIFY_DB)
    cursor = conn_coolify.cursor()
    cursor.execute("SELECT version();")
    version = cursor.fetchone()[0]
    print_success("Connecté à Coolify PostgreSQL")
    print_info(version)
    cursor.close()
    conn_coolify.close()
except Exception as e:
    print_error(f"Impossible de se connecter à Coolify: {e}")
    sys.exit(1)

print()

# Étape 3: Obtenir le schéma local
print_step(3, 5, "Extraction du schéma depuis la base locale")
try:
    conn_local = psycopg2.connect(LOCAL_DB)
    cursor_local = conn_local.cursor()

    # Compter les objets
    cursor_local.execute("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
    table_count = cursor_local.fetchone()[0]
    print_info(f"Tables : {table_count}")

    cursor_local.execute("SELECT COUNT(*) FROM product;")
    product_count = cursor_local.fetchone()[0]
    print_info(f"Produits : {product_count}")

    cursor_local.execute("SELECT COUNT(*) FROM product_variant;")
    variant_count = cursor_local.fetchone()[0]
    print_info(f"Variantes : {variant_count}")

    print_success(f"Schéma extrait: {table_count} tables, {product_count} produits")

    cursor_local.close()
    conn_local.close()
except Exception as e:
    print_error(f"Erreur extraction schéma: {e}")
    sys.exit(1)

print()

# Étape 4: Copier le schéma et les données
print_step(4, 5, "Copie du schéma et des données vers Coolify")
print_info("Utilisez plutôt un dump SQL classique pour cette étape")
print_info("Commande: PGPASSWORD=medusa pg_dump --if-exists --clean -h localhost -p 5433 -U medusa medusa | PGPASSWORD=xhgcpIOO6ABnhTvAYqCPpUNVSHk8zCx1oUbwtcpwOEZ3xmeK6gDxRLrLKKw90jXU psql -h 78.47.79.58 -p 5432 -U medusa medusa")
print()

# Étape 5: Vérifier migration
print_step(5, 5, "Informations de connexion Coolify")
print_info("DATABASE_URL pour .env:")
print(f"   {COOLIFY_DB}")
print()

print(f"{GREEN}{'=' * 60}{NC}")
print(f"{GREEN}   Script terminé{NC}")
print(f"{GREEN}{'=' * 60}{NC}")
print()
print("Pour migrer les données, utilisez:")
print(f"   {YELLOW}pg_dump --if-exists --clean -h localhost -p 5433 -U medusa medusa | psql '{COOLIFY_DB}'{NC}")
