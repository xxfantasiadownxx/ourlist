# Build frontend
FROM node:20-alpine AS frontend-build

WORKDIR /frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ .
RUN npm run build

# Build backend
FROM node:20-alpine

WORKDIR /app

COPY backend/package*.json ./
RUN npm install --omit=dev

COPY backend/ .

# Copy React build output into backend
COPY --from=frontend-build /frontend/build ./public

EXPOSE 3001

CMD ["node", "server.js"]
