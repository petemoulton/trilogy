# Trilogy AI System Dockerfile
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    git \
    sqlite \
    python3 \
    make \
    g++

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p /app/data /app/logs /app/memory

# Set permissions
RUN chmod +x /app/scripts/*.sh || true

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S trilogy -u 1001
RUN chown -R trilogy:nodejs /app
USER trilogy

# Expose ports
EXPOSE 8080 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Start command
CMD ["npm", "start"]