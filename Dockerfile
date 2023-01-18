FROM node:18.13.0-bullseye-slim as base
USER node
WORKDIR /app
COPY package*.json ./

FROM base as build
RUN npm ci
COPY . .
RUN npm run build

FROM build as dev
ENV NODE_ENV development
EXPOSE 3000
CMD ["npm", "run", "start"]

FROM base as prod
ENV NODE_ENV production
RUN npm ci --omit=dev
COPY --from=build /app/dist /app/dist
EXPOSE 3000
CMD ["npm","run", "start"]

FROM build as test
ENV NODE_ENV development
EXPOSE 3000
CMD ["npm","run", "test"]

FROM base as register
ENV NODE_ENV production
RUN npm ci --omit=dev
COPY --from=build /app/dist /app/dist
EXPOSE 3000
CMD ["npm","run", "register"]