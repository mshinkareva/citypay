var async = require('async');
var yandexMoney = require("yandex-money-sdk");
var funcs = require('../utils/funcs');
var https = require('https');

function pay(token, params, cb) {
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

function payPhone (number, amount, token, cb) {
    var _number = number.replace(/[^0-9]/g,'');
    pay(token, {
        pattern_id: 'phone-topup',
        'phone-number': _number,
        amount: amount
    }, cb);
}

function getPaymentParams(wcid, cb) {
    var url = 'https://money.yandex.ru/api/showcase/' + wcid;
    async.waterfall([
        function (callback) {
            var res = '';
            var validationUrl = '';
            https.get(url, function (response) {
                validationUrl = response.headers.location;
                response.on('data', (d) => {
                    res += d.toString()
                });
            }).on('close', () => callback(null, res, validationUrl)).on('error', (err) => callback(err));
        },
        function (response, validationUrl, callback) {
            var form = JSON.parse(response);

            var fieldsToAsk = [];
            var fields = funcs.copyParams(form.form);
            keys = Object.keys(fields);
            for (i = 0; i < keys.length; i++) {
                if ((fields[keys[i]] !== null)
                  && (keys[i] !== 'sum')
                  && (keys[i] !== 'amount')) continue;
                fieldsToAsk.push(keys[i]);
            }

            funcs.copyParams(form.hidden_fields, fields);

            if (form.hidden_fields) {
                var keys = Object.keys(form.hidden_fields);
                for (var i = 0; i < keys.length; i++) {
                    fields[keys[i]] = form.hidden_fields[keys[i]];
                }
            }

            return callback(null, fields, fieldsToAsk, validationUrl);
        }
    ], cb);
}

function payPodorozhnik(customerNumber, amount, token, cb) {
    async.waterfall([
        function (callback) {
            getPaymentParams(4006, callback);
        },
        function (fields, fieldsToAsk, validationUrl, callback) {
            fields['customerNumber'] = customerNumber;
            fields['scid'] = 4006;
            fields['shn'] = 'Подорожник';
            fields['targetcurrency'] = '643';
            fields['ShowCaseID'] = 7;
            fields['secureparam5'] = '5';
            fields['netSum'] = amount;
            fields['net_sum'] = amount;
            fields['sum'] = (amount*1.03).toFixed(2);
            fields['ErrorTemplate'] = "ym2xmlerror";
            fields['SuccessTemplate'] = "ym2xmlsuccess";
            fields['try-payment'] = "true";
            fields['rnd'] = funcs.getRandomInt(553160000, 553169999);

            console.log(fields);

            require('request')({
                uri: validationUrl,
                form: fields,
                method: 'POST'
            }, callback);
        },
        function (response, body, callback) {
            if (response.statusCode !== 200) return callback(new Error('Incorrect data'));
            console.log(JSON.parse(body).params);
            callback(null, JSON.parse(body).params);
        },
        function (fields, callback) {
            pay(token, fields, callback);
        }
    ], cb);
}



function payPSB(abNum, sum, fio, countsDay, countsNight, token, cb) {
    async.waterfall([
        function (callback) {
            var time = new Date();
            var fields = {
                ErrorTemplate: "ym2xmlerror",
                FormComment: "Петроэлектросбыт",
                ShowCaseID: "7",
                SuccessTemplate: "ym2xmlsuccess",
                fio: fio,
                netSum: sum,
                rapida_param1: abNum,
                rapida_param4: countsDay,
                rapida_param5: countsNight,
                rnd: funcs.getRandomInt(99240000, 99249999),
                scid: "5670",
                secureparam5: "5",
                shn: "Петроэлектросбыт",
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

function payGas(abNum, sum, fio, token, cb) {
    async.waterfall([
        function (callback) {
            var time = new Date();
            var fields = {
                ErrorTemplate: "ym2xmlerror",
                FormComment: "Газпром",
                ShowCaseID: "7",
                SuccessTemplate: "ym2xmlsuccess",
                fio: fio,
                netSum: sum,
                rapida_param1: abNum,
                rapida_param4: countsDay,
                rapida_param5: countsNight,
                rnd: funcs.getRandomInt(99240000, 99249999),
                scid: "1353",
                secureparam5: "5",
                shn: "Газпром",
                sum: parseFloat(sum)+30,
                targetcurrency: "643",
                'try-payment': "true",
                month: ((time.getMonth()+1) < 10 ? '0'+(time.getMonth()+1) : ''+ (time.getMonth()+1)),
                year: time.getFullYear(),
                pattern_id: 1353
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

module.exports = {
    payPhone: payPhone,
    payPodorozhnik: payPodorozhnik,
    payPSB: payPSB,
    payGas: payGas
};

//payPSB('872306', 200, 'Шинкарева Мария Сергеевна', '9741', '',
//'410011787325344.ECE4F421A4D3248B0A4D124BA3AEEED72508EC674C1B3EC0F2C429F773E766743D3EB9EC46644F5E96BBE57488D8E4DBE6A959D7AEE0A118FC2E3341979425A242AAAD5FA7E23C1AE9616BDDC6B4DCE0679FFEA9584193BC9F6EECB6D9C6C364F641BD36459E1F388C987E250DF0126FDF36B8E0DDDBFE97CEA14D9D314AD3F7',
//function () {
//    console.log(arguments[1])
//});

//payPodorozhnik('9643307805933622219', 5,
//    '410011787325344.ECE4F421A4D3248B0A4D124BA3AEEED72508EC674C1B3EC0F2C429F773E766743D3EB9EC46644F5E96BBE57488D8E4DBE6A959D7AEE0A118FC2E3341979425A242AAAD5FA7E23C1AE9616BDDC6B4DCE0679FFEA9584193BC9F6EECB6D9C6C364F641BD36459E1F388C987E250DF0126FDF36B8E0DDDBFE97CEA14D9D314AD3F7',
//    function () {console.log(arguments)});

//payPodorozhnik('96433078360986449029655081', 1,
//    '410011787325344.ECE4F421A4D3248B0A4D124BA3AEEED72508EC674C1B3EC0F2C429F773E766743D3EB9EC46644F5E96BBE57488D8E4DBE6A959D7AEE0A118FC2E3341979425A242AAAD5FA7E23C1AE9616BDDC6B4DCE0679FFEA9584193BC9F6EECB6D9C6C364F641BD36459E1F388C987E250DF0126FDF36B8E0DDDBFE97CEA14D9D314AD3F7',
//    function () {console.log(arguments)});

//function payPodorozhnik()
//
//var api = new yandexMoney.Wallet('410011398386747.4529108E40EF1F1F2157AFFB173CE7AD0F52D9F205A7EDE0FC521C7AEA5D11AD177EC14FA16C2F81A9DE44975B6420B9D457A2BFBBFEE1FD18E58D1E4E0C01D9BA2FE7E946C0FFAAE635459FE3547F3B776F65C3048F3AB6E0307C472899E7DF3992E216E27E86CC956DCF1CB0278D83B230B9FEC267E800575D3422A98E88B7');
//api.operationDetails('511182432431110017', function () {
//    console.log(arguments);
//});

//payPhone('79811320901', 1, '410011398386747.B63D66AFF15A5155AC8657C59409C5EEA91EEBAC1CBF54A0BFA7ED141F6D54717F2A3A121998EF8C58893730BFA513619D8DFB47189A7EE54559D99885B82848F55B526D98DAC976955B4CAA933A805C4D4F9961DF8C0858C1A520E2635E4E9D5BED4791D7ED15C31D7CCC430871C4235FDFD9690AE4E363EE492837F7ECBC74',
//    function () {console.log(arguments)});