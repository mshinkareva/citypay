'use strict';

var log = console.log;
var defaultValue = {};

var Storage = require('../utils/fileStorage');
var users = {};
var usersStorage = new Storage(require('path').dirname(process.mainModule.filename) + '/users/users.json', {
        log: log
    }, function (data) {
        users = data;
    }
);

function getUser(id, opts, cb) {
    var _opts = (arguments.length == 2) ? {} : opts;
    var _cb = (arguments.length == 2) ? opts : cb;

    if (users[id]) return _cb(null, users[id]);
    var user = require('deepcopy')(defaultValue);

    var ks = Object.keys(_opts);
    for (var i = 0; i < ks.length; i++) {
        var k = ks[i];
        user[k] = _opts[k];
    }

    users[id] = user;
    return _cb(null, user);
}

var res = function configure(params) {
    if (params.logger) log = params.logger;
    if (params.defaultValue) defaultValue = params.defaultValue;
};

res.get = getUser;

module.exports = res;