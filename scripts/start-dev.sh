docker build --target dev -t crypto-bot-dev -f Dockerfile .
docker run -d -p 3000:3000/tcp --name="crypto-bot" -v ./docker:/app/data crypto-bot-dev:latest
