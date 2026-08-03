FROM node:22-bookworm-slim

WORKDIR /app

# Install dependencies in a cacheable layer. The lock file makes the
# development environment reproducible.
COPY --chown=node:node package.json package-lock.json ./
COPY --chown=node:node scripts ./scripts
RUN npm ci \
    && mkdir -p /app/.wrangler \
    && chown -R node:node /app/node_modules /app/public/vendor /app/.wrangler

COPY --chown=node:node . .

ENV NODE_ENV=development
ENV CHOKIDAR_USEPOLLING=true

EXPOSE 3000

USER node

# Vite must listen beyond localhost to be reachable from the host machine.
CMD ["npm", "run", "dev", "--", "--hostname", "0.0.0.0"]
