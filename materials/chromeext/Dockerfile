FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache sqlite

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Create data directory
RUN mkdir -p /app/data

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S mcp -u 1001
RUN chown -R mcp:nodejs /app
USER mcp

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Start command
CMD ["npm", "start"]