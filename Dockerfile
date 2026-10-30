FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Build step if any (none for plain Express)

# Runtime stage
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app .

# Expose port (Supabase expects env PORT)
EXPOSE 3000

# Set production environment
ENV NODE_ENV=production

CMD ["node", "server.js"]
