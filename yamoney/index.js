var yandexMoney = require("yandex-money-sdk");
var async = require('async');

var config = require('./config.json');
var connection = require('../models');
var funcs = require('../utils/funcs');

if (!config.appId) {
    config.appId = 6017472;
}

var log = console.log;
var users = {};
var getTokenCallback = null;

function getAuthURI(userId, cb) {
    var scope = ['payment-shop', 'operation-details'];
    url = yandexMoney.Wallet.buildObtainTokenUrl(config.clientId,
            config.redirectURI
            + '?appId='+ config.appId
            + '&userId=' + userId
            , scope) + '&instance_name=' + userId+config.appId;
    return cb(null, url);
}

function checkCodes() {
    async.waterfall([
        function (cb) {
            connection.getConnection(cb);
        },
        function (db, cb) {
            var authCollection = db.collection('authcodes');
            authCollection.find({appId: ''+config.appId}).toArray(function (err, codes) {
                if (err) return cb(err);
                return cb(null, authCollection, codes);
            });
        },
        function (authCollection, codes, cb) {
            async.map(codes, function (code, callback) {
                if (
                    (code.code   !== undefined) &&
                    (code.userId !== undefined) &&
                    (code.appId  !== undefined)
                ) {
                    yandexMoney.Wallet.getAccessToken(config.clientId, code.code, config.redirectURI, null,
                        function tokenComplete(err, data) {
                            if(err) return log('Error while get access token: %s', err.message);

                            var access_token = data.access_token;
                            log('user %s access token: %s', code.userId, access_token);

                            users.get(code.userId, function (err, user) {
                                if (err) log('Error while getting user %s: %s', userId, err.message);

                                user.accessToken = access_token;
                                if (getTokenCallback) getTokenCallback(user);
                            });
                        }
                    );
                }
                authCollection.remove({code: code.code}, callback);
            }, cb);
        }
    ], function (err) {
        if (err) log('checkAuthCodes error: ' + err.message);
    });
}
setInterval(checkCodes, 500);

function init (_users, _getTokenCallback, _logger) {
    if (!users) throw new Error('You should specify users to store access tokens');

    users = _users;
    if (_getTokenCallback) getTokenCallback = _getTokenCallback;
    if (_logger) log = _logger;

    var res = require('./payFunctions');
    res.getAuthURI = getAuthURI;

    return res;
}

module.exports = init;