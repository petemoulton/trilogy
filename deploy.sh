#!/bin/bash

# Trilogy AI System - Single Command Deployment Script
# This script deploys the entire Trilogy system and opens it in browser

set -e  # Exit on any error

echo "🚀 Starting Trilogy AI System Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to wait for service to be ready
wait_for_service() {
    local url=$1
    local service_name=$2
    local max_attempts=30
    local attempt=1
    
    print_info "Waiting for $service_name to be ready..."
    while [ $attempt -le $max_attempts ]; do
        if curl -s -f "$url" >/dev/null 2>&1; then
            print_status "$service_name is ready!"
            return 0
        fi
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    print_error "$service_name failed to start within timeout"
    return 1
}

# Function to wait for PostgreSQL specifically
wait_for_postgres() {
    local max_attempts=30
    local attempt=1
    
    print_info "Waiting for PostgreSQL to be ready..."
    while [ $attempt -le $max_attempts ]; do
        if docker exec trilogy-postgres pg_isready -U trilogy >/dev/null 2>&1; then
            print_status "PostgreSQL is ready!"
            return 0
        fi
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    print_error "PostgreSQL failed to start within timeout"
    return 1
}

# Function to cleanup previous deployment
cleanup_previous() {
    print_info "Cleaning up previous deployment..."
    
    # Kill any existing Node.js processes
    pkill -f "node start-system.js" 2>/dev/null || true
    pkill -f "npm start" 2>/dev/null || true
    
    # Stop and remove Docker containers
    docker stop trilogy-postgres trilogy-ai-system trilogy-mcp trilogy-nginx 2>/dev/null || true
    docker rm trilogy-postgres trilogy-ai-system trilogy-mcp trilogy-nginx 2>/dev/null || true
    
    # Remove Docker networks
    docker network rm docker_trilogy-network 2>/dev/null || true
    
    print_status "Cleanup completed"
}

# Function to check prerequisites
check_prerequisites() {
    print_info "Checking prerequisites..."
    
    # Check Node.js
    if ! command_exists node; then
        print_error "Node.js is not installed. Please install Node.js 18+ first."
        exit 1
    fi
    
    local node_version=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$node_version" -lt 18 ]; then
        print_error "Node.js version 18+ is required. Current version: $(node --version)"
        exit 1
    fi
    
    # Check npm
    if ! command_exists npm; then
        print_error "npm is not installed"
        exit 1
    fi
    
    # Check Docker
    if ! command_exists docker; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    # Check if Docker is running
    if ! docker info >/dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker first."
        exit 1
    fi
    
    print_status "All prerequisites satisfied"
}

# Function to install dependencies
install_dependencies() {
    print_info "Installing Node.js dependencies..."
    
    if [ ! -d "node_modules" ]; then
        npm install
    else
        print_info "Dependencies already installed, checking for updates..."
        npm ci
    fi
    
    print_status "Dependencies installed"
}

# Function to start PostgreSQL
start_postgresql() {
    print_info "Starting PostgreSQL database..."
    
    docker run -d \
        --name trilogy-postgres \
        -p 5432:5432 \
        -e POSTGRES_DB=trilogy \
        -e POSTGRES_USER=trilogy \
        -e POSTGRES_PASSWORD=trilogy123 \
        -v trilogy_postgres_data:/var/lib/postgresql/data \
        postgres:15-alpine
    
    # Wait for PostgreSQL to be ready
    wait_for_postgres
    sleep 5  # Additional buffer for full initialization
    
    print_status "PostgreSQL started successfully"
}

# Function to start the main application
start_application() {
    print_info "Starting Trilogy AI System..."
    
    # Set environment variables
    export NODE_ENV=development
    export POSTGRES_HOST=localhost
    export POSTGRES_PORT=5432
    export POSTGRES_DB=trilogy
    export POSTGRES_USER=trilogy
    export POSTGRES_PASSWORD=trilogy123
    export DATABASE_URL=postgresql://trilogy:trilogy123@localhost:5432/trilogy
    export MEMORY_BACKEND=postgresql
    
    # Start the application in background
    nohup npm start > trilogy-deployment.log 2>&1 &
    local app_pid=$!
    
    # Wait for the application to be ready
    wait_for_service "http://localhost:3100/health" "Trilogy Main Application"
    wait_for_service "http://localhost:3101/health" "MCP Server"
    
    print_status "Trilogy AI System started successfully (PID: $app_pid)"
    
    # Save PID for cleanup
    echo $app_pid > trilogy.pid
}

# Function to verify deployment
verify_deployment() {
    print_info "Verifying deployment..."
    
    # Check main application
    if curl -s -f "http://localhost:3100/health" >/dev/null; then
        print_status "Main application health check passed"
    else
        print_error "Main application health check failed"
        return 1
    fi
    
    # Check MCP server
    if curl -s -f "http://localhost:3101/health" >/dev/null; then
        print_status "MCP server health check passed"
    else
        print_error "MCP server health check failed"
        return 1
    fi
    
    # Check agent pool
    if curl -s -f "http://localhost:3100/agents/pool/status" >/dev/null; then
        print_status "Agent pool status check passed"
    else
        print_warning "Agent pool status check failed (this may be normal during startup)"
    fi
    
    print_status "Deployment verification completed"
}

# Function to open browsers
open_dashboards() {
    print_info "Opening dashboards in browser..."
    
    # Wait a moment for services to fully initialize
    sleep 3
    
    if command_exists open; then
        # macOS
        open "http://localhost:3100" 2>/dev/null || true
        sleep 1
        open "http://localhost:3101/dashboard" 2>/dev/null || true
    elif command_exists xdg-open; then
        # Linux
        xdg-open "http://localhost:3100" 2>/dev/null || true
        sleep 1
        xdg-open "http://localhost:3101/dashboard" 2>/dev/null || true
    elif command_exists start; then
        # Windows
        start "http://localhost:3100" 2>/dev/null || true
        sleep 1
        start "http://localhost:3101/dashboard" 2>/dev/null || true
    else
        print_warning "Could not detect browser opener. Please manually open:"
        print_info "Main Dashboard: http://localhost:3100"
        print_info "MCP Dashboard: http://localhost:3101/dashboard"
    fi
    
    print_status "Browser dashboards opened"
}

# Function to display deployment summary
show_summary() {
    echo ""
    echo "🎉 Trilogy AI System Deployment Complete!"
    echo "============================================"
    echo ""
    echo "📊 Main Dashboard:     http://localhost:3100"
    echo "🌐 MCP Dashboard:      http://localhost:3101/dashboard"
    echo "🔗 API Health:         http://localhost:3100/health"
    echo "🤖 Agent Pool:         http://localhost:3100/agents/pool/status"
    echo "📝 Logs:               tail -f trilogy-deployment.log"
    echo ""
    echo "🛑 To stop the system: ./stop.sh or kill \$(cat trilogy.pid)"
    echo "📋 PostgreSQL:         docker stop trilogy-postgres"
    echo ""
    echo "✨ The system is now running and ready for use!"
}

# Function to create stop script
create_stop_script() {
    cat > stop.sh << 'EOF'
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
EOF
    chmod +x stop.sh
}

# Main deployment flow
main() {
    echo "🚀 Trilogy AI System - Single Command Deployment"
    echo "================================================"
    echo ""
    
    # Run deployment steps
    cleanup_previous
    check_prerequisites
    install_dependencies
    start_postgresql
    start_application
    verify_deployment
    create_stop_script
    open_dashboards
    show_summary
    
    echo ""
    print_status "Deployment completed successfully! 🎉"
}

# Handle script interruption
trap 'print_error "Deployment interrupted. Run ./stop.sh to clean up."; exit 1' INT TERM

# Run main function
main "$@"