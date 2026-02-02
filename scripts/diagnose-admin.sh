#!/bin/sh
# Script de diagnostic pour trouver où Medusa cherche l'admin

echo "==================================="
echo "Diagnostic Admin Medusa"
echo "==================================="

echo "\n1. Structure du répertoire /app:"
ls -la /app/

echo "\n2. Contenu de /app/.medusa:"
ls -la /app/.medusa/ 2>/dev/null || echo "Directory not found"

echo "\n3. Contenu de /app/.medusa/server:"
ls -la /app/.medusa/server/ 2>/dev/null || echo "Directory not found"

echo "\n4. Contenu de /app/.medusa/server/public:"
ls -la /app/.medusa/server/public/ 2>/dev/null || echo "Directory not found"

echo "\n5. Recherche de tous les fichiers index.html:"
find /app -name "index.html" 2>/dev/null || echo "No index.html found"

echo "\n6. Variables d'environnement NODE_ENV et MEDUSA:"
env | grep -E "(NODE_ENV|MEDUSA)" || echo "No relevant env vars"

echo "\n7. Contenu du package.json (scripts section):"
cat /app/package.json | grep -A 10 '"scripts"' || echo "Cannot read package.json"

echo "\n8. Vérification du répertoire attendu par Medusa:"
echo "Medusa cherche probablement dans: /app/.medusa/server/public/admin/"
if [ -f "/app/.medusa/server/public/admin/index.html" ]; then
    echo "✓ index.html EXISTE à cet emplacement"
else
    echo "✗ index.html N'EXISTE PAS à cet emplacement"
fi

echo "\n9. Vérification alternative - admin dans node_modules:"
ls -la /app/node_modules/@medusajs/admin-bundler/ 2>/dev/null | head -20

echo "\n==================================="
echo "Fin du diagnostic"
echo "==================================="
