#!/bin/sh
# wait-for-db.sh - Wait for PostgreSQL database to be ready

set -e

host="$DB_HOST"
port="${DB_PORT:-5432}"
user="$DB_USER"
password="$DB_PASSWORD"

until PGPASSWORD="$password" psql -h "$host" -p "$port" -U "$user" -d postgres -c '\q' 2>/dev/null; do
  echo "⏳ Waiting for PostgreSQL at $host:$port..."
  sleep 2
done

echo "✅ PostgreSQL is ready at $host:$port"

