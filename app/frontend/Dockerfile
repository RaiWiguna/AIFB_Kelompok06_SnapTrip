FROM node:22-alpine AS runtime

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

ARG NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_API_KEY

ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL} \
    NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_API_KEY=${NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_API_KEY}

COPY app/frontend/package.json app/frontend/package-lock.json app/frontend/.npmrc ./
RUN npm ci --legacy-peer-deps

COPY app/frontend ./
RUN npm run build
RUN npm prune --omit=dev

ENV NODE_ENV=production

EXPOSE 3000

CMD ["npm", "run", "start", "--", "--hostname", "0.0.0.0", "--port", "3000"]
