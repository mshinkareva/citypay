export default {
    bot_token: process.env.BOT_TOKEN,
    yandex_money: {
        redirectURI: process.env.REDIRECT_URI,
        clientId: process.env.CLIENT_ID
    },
    mongo: {
        host: process.env.MONGO_HOST,
        port: process.env.MONGO_PORT,
        db: process.env.MONGO_DB
    }
};