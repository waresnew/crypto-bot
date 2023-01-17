FROM node:18.13.0 as base
WORKDIR /app
COPY package*.json ./

FROM base as dev
ENV NODE_ENV development
RUN npm ci
COPY . .
EXPOSE 3000
RUN npm run build
CMD ["npm", "start"]

FROM base as prod
ENV NODE_ENV production
RUN npm ci --omit=dev
COPY ./dist .
EXPOSE 3000
CMD ["npm", "start"]

FROM base as test
ENV NODE_ENV development
RUN npm ci
COPY . .
EXPOSE 3000
CMD ["npm", "test"]

FROM base as register
ENV NODE_ENV production
RUN npm ci --omit=dev
COPY . .
EXPOSE 3000
RUN npm run build
CMD ["npm", "register"]