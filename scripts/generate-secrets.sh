#!/bin/bash

# =====================================================================
# Script de génération de secrets pour Medusa
# MyTechGear Medusa Backend
# =====================================================================

set -e

# Couleurs pour les messages
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   Génération de secrets pour Medusa${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Vérifier si openssl est installé
if ! command -v openssl &> /dev/null; then
  echo -e "${YELLOW}⚠️  openssl n'est pas installé${NC}"
  echo "Installez-le avec: sudo apt install openssl"
  exit 1
fi

echo -e "${YELLOW}Génération de JWT_SECRET...${NC}"
JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
echo -e "${GREEN}✅ JWT_SECRET généré${NC}"
echo ""

echo -e "${YELLOW}Génération de COOKIE_SECRET...${NC}"
COOKIE_SECRET=$(openssl rand -base64 64 | tr -d '\n')
echo -e "${GREEN}✅ COOKIE_SECRET généré${NC}"
echo ""

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}   ✅ Secrets générés avec succès${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

echo -e "${YELLOW}Copier ces valeurs dans Coolify → Environment Variables :${NC}"
echo ""
echo "JWT_SECRET=${JWT_SECRET}"
echo ""
echo "COOKIE_SECRET=${COOKIE_SECRET}"
echo ""

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}⚠️  IMPORTANT : Ne partagez JAMAIS ces secrets${NC}"
echo -e "${YELLOW}⚠️  Ne les commitez JAMAIS dans Git${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""
