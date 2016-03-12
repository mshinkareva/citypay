var Connection = require('./connection');

var connection = new Connection('mongodb://localhost:27017/bot', {
    autoClose: true,
    closeTimeout: 10
});

module.exports = connection;