# Multi-stage build for optimal production images
FROM node:18-alpine AS base

# Set working directory
WORKDIR /app

# Install dependencies only when needed
FROM base AS deps
# Copy package files
COPY package*.json ./
# Install dependencies with exact versions for reproducibility
RUN npm ci --only=production && npm cache clean --force

# Development stage
FROM base AS development
# Copy package files
COPY package*.json ./
# Install all dependencies including dev dependencies
RUN npm ci
# Copy source code
COPY . .
# Expose port
EXPOSE 3000
# Set environment
ENV NODE_ENV=development
# Start development server with hot reload
CMD ["npm", "start"]

# Build stage
FROM base AS builder
# Copy package files
COPY package*.json ./
# Install all dependencies
RUN npm ci
# Copy source code
COPY . .
# Set build environment
ENV NODE_ENV=production
# Build the app
RUN npm run build

# Production stage
FROM nginx:alpine AS production
# Copy built app from builder stage
COPY --from=builder /app/build /usr/share/nginx/html
# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Expose port
EXPOSE 80
# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/ || exit 1
# Start nginx
CMD ["nginx", "-g", "daemon off;"] 