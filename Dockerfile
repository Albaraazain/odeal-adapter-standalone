# Use official Node.js runtime as base image
FROM node:20-slim

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application source
COPY src/ ./src/

# Create non-root user for security
RUN useradd -r -u 1001 -g root appuser
RUN chown -R appuser:root /app
USER appuser

# Expose port (Railway/Render auto-detect this)
EXPOSE 8787

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8787/health || exit 1

# Start the application
CMD ["npm", "start"]