FROM node:18.13.0-bullseye-slim as base
LABEL org.opencontainers.image.source=https://github.com/waresnew/crypto-bot
WORKDIR /app
RUN apt-get update \
    && apt-get install -y --no-install-recommends dumb-init python3.9-dev python3-pip wget build-essential
RUN wget https://prdownloads.sourceforge.net/ta-lib/ta-lib-0.4.0-src.tar.gz && \
  tar -xvzf ta-lib-0.4.0-src.tar.gz && \
  cd ta-lib/ && \
  wget -O config.guess 'https://git.savannah.gnu.org/gitweb/?p=config.git;a=blob_plain;f=config.guess' && \
  wget -O config.sub 'https://git.savannah.gnu.org/gitweb/?p=config.git;a=blob_plain;f=config.sub' && \
  ./configure --prefix=/usr && \
  make && \
  make install
COPY requirements.txt ./
COPY package*.json ./
RUN pip install --no-cache-dir --upgrade -r requirements.txt

FROM base as build
RUN npm ci
COPY . .
RUN npm run build

FROM build as dev
ENV NODE_ENV development
ENV PYTHONPATH "${PYTHONPATH}:/app/"
EXPOSE 3000
EXPOSE 9229
CMD ["dumb-init","npm", "run", "debug"]

FROM base as prod
ENV NODE_ENV production
RUN npm ci --omit=dev
ENV PYTHONPATH "${PYTHONPATH}:/app/"
COPY --from=build /app/dist /app/dist
COPY --from=build /app/python /app/python
EXPOSE 3000
CMD ["dumb-init","npm","run", "start"]

FROM base as register
ENV NODE_ENV production
RUN npm ci --omit=dev
COPY --from=build /app/dist /app/dist
EXPOSE 3000
CMD ["dumb-init","npm","run", "register"]