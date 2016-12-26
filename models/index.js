import mongo from 'mongodb'
import monk from 'monk'
import config from '../config'

const db = monk(`${config.mongo.host}:${config.mongo.port}/${config.mongo.db}`, {auto_reconnect: true});

export const users = db.get('users');
export const auth = db.get('auth');

export function getTokenFromDB(userId) {
    return users.findOne({user: userId}).then(doc => {
        return (doc) ? doc.token : null
    });
}