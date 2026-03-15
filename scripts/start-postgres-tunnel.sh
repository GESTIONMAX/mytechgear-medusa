#!/bin/bash

# Script pour établir le tunnel SSH vers PostgreSQL Coolify
# Usage: ./scripts/start-postgres-tunnel.sh

TUNNEL_PORT=5555
REMOTE_HOST="78.47.79.58"
REMOTE_PORT=5432
SSH_KEY="$HOME/.ssh/id_ed25519"

echo "🔐 Tunnel SSH PostgreSQL Coolify"
echo "================================="
echo ""

# Vérifier si le tunnel existe déjà
if lsof -Pi :$TUNNEL_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
  PID=$(lsof -Pi :$TUNNEL_PORT -sTCP:LISTEN -t | head -1)
  echo "✅ Tunnel déjà actif (PID: $PID, Port: $TUNNEL_PORT)"
  exit 0
fi

# Établir le tunnel
echo "🚀 Établissement du tunnel SSH..."
echo "   Local Port: $TUNNEL_PORT"
echo "   Remote: $REMOTE_HOST:$REMOTE_PORT"
echo ""

ssh -i "$SSH_KEY" \
    -p 22 \
    -o StrictHostKeyChecking=no \
    -o UserKnownHostsFile=/dev/null \
    -o ServerAliveInterval=60 \
    -o ServerAliveCountMax=3 \
    -N \
    -L $TUNNEL_PORT:127.0.0.1:$REMOTE_PORT \
    root@$REMOTE_HOST &

# Attendre que le tunnel soit établi
sleep 2

# Vérifier
if lsof -Pi :$TUNNEL_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
  PID=$(lsof -Pi :$TUNNEL_PORT -sTCP:LISTEN -t | head -1)
  echo "✅ Tunnel établi avec succès!"
  echo "   PID: $PID"
  echo "   Port local: $TUNNEL_PORT"
  echo ""
  echo "📊 Test de connexion..."

  if psql "postgres://medusa:xhgcpIOO6ABnhTvAYqCPpUNVSHk8zCx1oUbwtcpwOEZ3xmeK6gDxRLrLKKw90jXU@localhost:$TUNNEL_PORT/medusa" \
     -c "SELECT 'Connexion OK' as status, COUNT(*) as product_count FROM product;" 2>/dev/null; then
    echo ""
    echo "✅ Base Coolify accessible via tunnel"
  else
    echo "⚠️  Tunnel actif mais connexion DB échouée"
  fi
else
  echo "❌ Échec de l'établissement du tunnel"
  exit 1
fi
