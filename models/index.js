var Connection = require('./connection');
var util = require('util');
var config = require('../config.js').mongo;

var connection = new Connection(util.format('mongodb://%s:%s/%s', config.host, config.port, config.db), {
    autoClose: true,
    closeTimeout: 10
});

module.exports = connection;