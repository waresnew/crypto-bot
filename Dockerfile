from node:18.13.0
env NODE_ENV production
workdir /app
copy . .
run npm ci --omit=dev
expose 3000
cmd ["npm", "start"]