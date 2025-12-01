#!/bin/sh
# wait-for-db.sh - Wait for PostgreSQL database to be ready

set -e

# Validate required environment variables
if [ -z "$DB_HOST" ]; then
  echo "❌ ERROR: DB_HOST is not set"
  exit 1
fi

if [ -z "$DB_USER" ]; then
  echo "❌ ERROR: DB_USER is not set"
  exit 1
fi

if [ -z "$DB_PASSWORD" ]; then
  echo "❌ ERROR: DB_PASSWORD is not set"
  exit 1
fi

host="$DB_HOST"
port="${DB_PORT:-5432}"
user="$DB_USER"
password="$DB_PASSWORD"
# SSL is usually required for managed PostgreSQL (DigitalOcean, AWS RDS, etc.)
ssl_mode="${DB_SSL:-require}"

echo "🔍 Attempting to connect to PostgreSQL..."
echo "   Host: $host"
echo "   Port: $port"
echo "   User: $user"
echo "   SSL Mode: $ssl_mode"
echo ""

# Wait with timeout (max 5 minutes = 150 attempts * 2 seconds)
attempts=0
max_attempts=150

# Use sslmode=require for managed PostgreSQL databases
until PGPASSWORD="$password" psql -h "$host" -p "$port" -U "$user" -d postgres "sslmode=$ssl_mode" -c '\q' 2>/dev/null; do
  attempts=$((attempts + 1))

  if [ $attempts -ge $max_attempts ]; then
    echo "❌ TIMEOUT: PostgreSQL not ready after $max_attempts attempts (5 minutes)"
    echo ""
    echo "🔍 Debug Info:"
    echo "   Can resolve host? $(nslookup "$host" 2>&1 | head -5)"
    echo ""
    echo "   Network connectivity:"
    nc -zv "$host" "$port" 2>&1 || echo "   Port $port is not reachable"
    exit 1
  fi

  echo "⏳ Waiting for PostgreSQL at $host:$port... (attempt $attempts/$max_attempts)"
  sleep 2
done

echo ""
echo "✅ PostgreSQL is ready at $host:$port"
echo ""

