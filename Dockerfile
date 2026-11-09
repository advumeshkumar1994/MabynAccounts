FROM node:24-bookworm-slim
WORKDIR /app
COPY package.json ./
COPY src ./src
COPY db ./db
ENV NODE_ENV=production PORT=10000
EXPOSE 10000
CMD ["npm","start"]
