var yandexMoney = require("yandex-money-sdk");
var async = require('async');
var request = require('request');

var config = require('../config.js').yandex_money;
var connection = require('../models');
var funcs = require('../utils/funcs');


var log = console.log;
var users = {};
var getTokenCallback = null;

function getAuthURI(userId, cb) {
    var scope = ['payment-shop', 'operation-details'];
    var url = yandexMoney.Wallet.buildObtainTokenUrl(config.clientId,
            config.redirectURI
            + '?appId='+ config.appId
            + '&userId=' + userId
            , scope) + '&instance_name=' + userId+config.appId;
    return cb(null, url);
}

// This workaround is just because of non-working yandex money api - no "grant_type" field
function getToken(clientId, code, redirectURI, clientSecret, callback) {
    var full_url = "https://sp-money.yandex.ru/oauth/token";
    request.post({
            "url": full_url,
            "form": {
                "code": code,
                "client_id": clientId,
                "redirect_uri": redirectURI,
                "grant_type": "authorization_code",
                "client_secret": clientSecret
            }
        }, (err, httpResponse, body) => {
            callback(err, JSON.parse(body))
        }
    )
}


function checkCodes() {
    async.waterfall([
        function (cb) {
            connection.getConnection(cb);
        },
        function (db, cb) {
            var authCollection = db.collection('authcodes');
            authCollection.find({"appId": config.appId.toString()}).toArray(function (err, codes) {
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
                    getToken(config.clientId, code.code, config.redirectURI, config.OAuth2,
                        (err, data) => {
                            if(err) return log('Error while get access token: %s', err.message);

                            var access_token = data.access_token;
                            log('user %s got access token', code.userId);

                            users.get(code.userId, function (err, user) {
                                if (err) log('Error while getting user %s: %s', user, err.message);

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
setInterval(checkCodes, 1000);

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