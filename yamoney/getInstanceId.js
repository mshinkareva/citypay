var yandexMoney = require("yandex-money-sdk");
var config = require('./config.json');
var fs = require('fs');

function getInstanceId(cb) {
    if (config.instanceId) return cb(null, config.instanceId);

    yandexMoney.ExternalPayment.getInstanceId(config.clientId,
        function getInstanceComplete(err, data) {
            if(err) return cb(err);

            var instanceId = data.instance_id;
            config.instanceId = instanceId;

            fs.writeFile('./config.json', JSON.stringify(config, null, '  '), function (err) {
                if (err) console.log('Error writing config file: %s', err.message);
                return cb(err, instanceId);
            });
        }
    );
}

module.exports = getInstanceId;