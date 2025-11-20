# ---- Build stage ----
FROM node:20-alpine AS build
WORKDIR /app

# Install deps
COPY package.json ./
# If you use package-lock.json, also:
# COPY package-lock.json ./
RUN npm install

# Copy the rest of the code and build
COPY . .
RUN npm run build

# ---- Runtime stage ----
FROM node:20-alpine
WORKDIR /app

COPY package.json ./
# If you have a lock file, copy/adjust this too
# COPY package-lock.json ./
RUN npm install --omit=dev

# Copy built files from previous stage
COPY --from=build /app/dist ./dist

ENV PORT=8080
CMD ["node", "dist/main.js"]
