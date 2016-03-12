var Connection = require('./connection');
var util = require('util');

var connection = new Connection(util.format('mongodb://%s:%s/%s', config.host, config.port, config.dbname), {
    autoClose: true,
    closeTimeout: 10
});

module.exports = connection;