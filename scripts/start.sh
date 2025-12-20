docker run -d -p 3000:3000/tcp --restart=unless-stopped --name="crypto-bot" -v /home/newwares/programs/crypto-bot/docker:/app/data ghcr.io/waresnew/crypto-bot-prod:latest
