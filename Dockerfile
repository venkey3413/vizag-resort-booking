FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000 3001 3002

CMD ["sh", "-c", "node server.js & node admin-server.js & node booking-server.js & wait"]