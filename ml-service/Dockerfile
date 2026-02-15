# Use Node.js LTS (Long Term Support) version
FROM node:20-slim AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies including devDependencies for building
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript code
RUN npm run build

# --- Production Stage ---
FROM node:20-slim

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist

# Create uploads directory for temporary file storage
RUN mkdir -p uploads

# Expose port (Cloud Run sets PORT=8080 automatically)
EXPOSE 8080

# Start the application
CMD ["npm", "start"]
