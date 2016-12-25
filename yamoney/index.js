var https = require('https');
var async = require('async');
var request = require('request');

var yandexMoney = require("yandex-money-sdk");
import config from '../config';
import  { getRandomInt } from '../utils/funcs'


export function getAuthURI(userId) {
    const scope = ['payment-shop', 'operation-details'];
    return yandexMoney.Wallet.buildObtainTokenUrl(config.yandex_money.clientId,
            config.yandex_money.redirectURI + userId
            , scope);
}


// This workaround is just because of non-working yandex money api - no "grant_type" field
export function getToken(clientId, code, redirectURI, callback) {
    var full_url = "https://sp-money.yandex.ru/oauth/token";
    request.post({
            "url": full_url,
            "form": {
                "code": code,
                "client_id": clientId,
                "redirect_uri": redirectURI,
                "grant_type": "authorization_code"
            }
        }, (err, httpResponse, body) => {
            callback(err, JSON.parse(body))
        }
    )
}


function pay(token, params, cb) {
    var api = new yandexMoney.Wallet(token);

    async.waterfall([
        function (callback) {
            api.requestPayment(params, callback);
        },
        function (data) {
            var callback = arguments[arguments.length - 1];
            console.log(data.status);
            if (data.status !== 'success') {

                if (data.error === 'not_enough_funds') {
                    return callback(new Error('not_enough_funds'));
                }
                return callback(new Error('Request payment status is ' + data.status + ', error: ' + data.error));
            }

            api.processPayment({
                "request_id": data.request_id
            }, callback);
        }
    ], cb);
}


export function payPhone(number, amount, token, cb) {
    var _number = number.replace(/[^0-9]/g, '');
    pay(token, {
        pattern_id: 'phone-topup',
        'phone-number': _number,
        amount: amount
    }, cb);
}


export function payPSB(abNum, sum, fio, countsDay, countsNight, token, cb) {
    async.waterfall([
        function (callback) {
            var time = new Date();
            var fields = {
                ErrorTemplate: "ym2xmlerror",
                FormComment: "����������������",
                ShowCaseID: "7",
                SuccessTemplate: "ym2xmlsuccess",
                fio: fio,
                netSum: sum,
                rapida_param1: abNum,
                rapida_param4: countsDay,
                rapida_param5: countsNight,
                rnd: getRandomInt(99240000, 99249999),
                scid: "5670",
                secureparam5: "5",
                shn: "����������������",
                sum: parseFloat(sum)+30,
                targetcurrency: "643",
                'try-payment': "true",
                month: ((time.getMonth()+1) < 10 ? '0'+(time.getMonth()+1) : ''+ (time.getMonth()+1)),
                year: time.getFullYear(),
                pattern_id: 5670
            };

            console.log(fields);
            callback(null, fields);
        },
        function (fields, callback) {
            pay(token, fields, callback);
        }
    ], function (err, data) {
        if (err) return cb(err);
        if (data.status !== 'success') return cb(new Error(data.status));
        console.log('Success payment from %s on sum %srub.', fio, sum);
        return cb(err, data);
    });
}