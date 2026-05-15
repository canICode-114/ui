FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build
FROM nginx:1.27-alpine
ENV AUTH_API_UPSTREAM=http://signin-signup:8082
ENV BACKEND_API_UPSTREAM=http://web-backend:8081
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
