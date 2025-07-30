#!/bin/bash
echo "🛑 Stopping Trilogy AI System..."

# Stop main application
if [ -f trilogy.pid ]; then
    PID=$(cat trilogy.pid)
    kill $PID 2>/dev/null || true
    rm trilogy.pid
    echo "✅ Main application stopped"
fi

# Stop PostgreSQL
docker stop trilogy-postgres 2>/dev/null || true
docker rm trilogy-postgres 2>/dev/null || true
echo "✅ PostgreSQL stopped"

# Kill any remaining processes
pkill -f "node start-system.js" 2>/dev/null || true
pkill -f "npm start" 2>/dev/null || true

echo "✅ Trilogy AI System stopped completely"
