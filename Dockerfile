FROM node:14-alpine
WORKDIR /app
ADD . .
RUN npm install
RUN npm run build
RUN npm prune --production
CMD ["node", "./dist/main.js"]
