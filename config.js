var config = {
    bot_token: process.env.BOT_TOKEN,
    yandex_money: {
        appId: process.env.APP_ID,
        redirectURI: process.env.REDIRECT_URI,
        clientId: process.env.CLIENT_ID,
        instance_name: process.env.INSTANCE_NAME,
        OAuth2: process.env.OAUTH2
    },
    mongo: {
        host: process.env.MONGO_HOST,
        port: process.env.MONGO_PORT,
        db: process.env.MONGO_DB
    }
};

module.exports = config;