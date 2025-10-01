FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Vite will use port 5173 by default
RUN npm run build

# Use nginx mirror for production static file hosting
FROM nginx:1.25-alpine AS production

# Copy the built static file to nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Use your own nginx configuration (optional, support front-end routing)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]

