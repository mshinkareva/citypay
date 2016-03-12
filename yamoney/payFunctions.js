var async = require('async');
var yandexMoney = require("yandex-money-sdk");

function payPhone (number, amount, token, cb) {
    var _number = number.replace(/[^0-9]/g,'');
    var params = {
        pattern_id: 'phone-topup',
        'phone-number': _number,
        amount: amount
    };

    var api = new yandexMoney.Wallet(token);

    async.waterfall([
        function (callback) {
            api.requestPayment(params, callback);
        },
        function (data) {
            var callback = arguments[arguments.length - 1];
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

module.exports = {
    payPhone: payPhone
};