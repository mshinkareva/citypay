'use strict';

var fs = require('fs');
var path = require('path');
var async = require('async');

var Storage = function (filename, params, cb) {
    if (!filename) {
        throw new Error('FileName must be specified')
    }

    var _params = (typeof(params) === 'object') ? params : {};
    var _cb = (arguments.length === 3) ? cb : (typeof(params) === 'function') ? params : new Function();

    this.filename = filename;
    if (!fs.existsSync(path.dirname(filename))) {
        fs.mkdirSync(path.dirname(filename));
    }

    this.savePeriod = (!isNaN(parseInt(_params.savePeriod))) ? parseInt(_params.savePeriod) : 10;
    this.log = (_params.log === undefined) ? console.log : _params.log;

    var self = this;
    this.loadData(function (err) {
        if (err) throw err;
        _cb(self.data);
        self.demon();
    });
};

Storage.prototype = {
    fileAction: function (openFlag, cb, action) {
        var self = this;
        var fileHandle = 0;
        async.waterfall([
            function (callback) {
                fs.open(self.filename, openFlag, callback);
            },
            function (fh, callback) {
                fileHandle = fh;
                action(fileHandle, callback);
            }
        ], function (err) {
            if (err) self.log('Error while manipulating data in file %s: %s', self.filename, err.message);
            if (fileHandle === 0) return cb(err);
            fs.close(fileHandle, function (closingErr) {
                return cb(closingErr || err);
            });
        });
    },

    saveData: function (cb) {
        var strData = JSON.stringify(this.data);
        if (strData === this.strData)
            return cb(null);

        this.fileAction('w', cb, function (fileHandle, callback) {
            fs.writeFile(fileHandle, strData, callback);
        });
    },

    loadData: function (cb) {
        if (!fs.existsSync(this.filename)) {
            this.data = {};
            return cb(null);
        }

        var self = this;
        this.fileAction('r', cb, function (fileHandle, callback) {
            fs.readFile(fileHandle, 'utf8', function (err, content) {
                if (err) return callback(err);
                self.data = JSON.parse(content);
                return callback(null);
            });
        });
    },

    demon: function () {
        var self = this;
        self.saveData(function (err) {
            if (err) self.log('Error while saving data: %s', err.message);
            setTimeout(self.demon.bind(self), self.savePeriod*1000);
        });
    }
};

module.exports = Storage;