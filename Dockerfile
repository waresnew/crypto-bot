FROM node:18.13.0-bullseye-slim as base
LABEL org.opencontainers.image.source=https://github.com/waresnew/crypto-bot
WORKDIR /app
RUN apt-get update \
    && apt-get install -y --no-install-recommends dumb-init python3 python3-pip \
    && useradd -u 1001 newwares \
    && mkdir /home/newwares \
    && chown -R newwares /home/newwares \
    && chown newwares -R /app
USER newwares
COPY package*.json ./
COPY src/mplfinance/graphServer.py ./
COPY requirements.txt ./

FROM base as build
RUN npm ci
RUN pip install --no-cache-dir --upgrade -r requirements.txt
COPY . .
RUN npm run build

FROM build as dev
ENV NODE_ENV development
EXPOSE 3000
EXPOSE 9229
CMD ["dumb-init","npm", "run", "debug"]

FROM base as prod
ENV NODE_ENV production
RUN npm ci --omit=dev
COPY --from=build /app/dist /app/dist
EXPOSE 3000
CMD ["dumb-init","npm","run", "start"]

FROM base as register
ENV NODE_ENV production
RUN npm ci --omit=dev
COPY --from=build /app/dist /app/dist
EXPOSE 3000
CMD ["dumb-init","npm","run", "register"]