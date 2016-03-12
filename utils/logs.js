'use strict';

var util = require('util');
var fs = require('fs');
var async = require('async');
var path = require('path');

var logs = [];
var logParams = {
    path: '',
    savePeriod: 0
};

/**
 * @return {string}
 */
function NToS(N) {
    return (N < 10) ? '0' + N : N;
}

var log = function (s) {
    var _s = [];
    var dt = new Date();
    var sdt = [NToS(dt.getDate()),'.',NToS(dt.getMonth()+1),'.',dt.getFullYear(),
        ' ',NToS(dt.getHours()),':',NToS(dt.getMinutes()),':',NToS(dt.getSeconds()),':'].join('');
    if (typeof(s) == 'string')
        _s.push(sdt + ' ' + s);
    else {
        _s.push(sdt);
        _s.push(s);
    }
    for (var i = 1; i < arguments.length; i++) _s.push(arguments[i]);

    var logString = util.format.apply(util, _s);
    logs.push(logString);

    return console.log(logString);
};

function getFileName() {
    var dt = new Date();
    var fName = util.format('log-%s.%s.%s.txt', dt.getFullYear(), NToS(dt.getMonth()+1), NToS(dt.getDate()));
    return path.join(logParams.path, fName);
}

function saveToFileDemon() {
    if (logs.length === 0) {
        return setTimeout(saveToFileDemon, logParams.savePeriod * 1000);
    }

    async.waterfall([
        function (cb) {
            var currentFileName = getFileName();

            if ((logParams.filePath === currentFileName) && (logParams.fileHandle)) {
                return cb(null, currentFileName);
            }

            if (!logParams.fileHandle) {
                return cb(null, currentFileName);
            }

            fs.close(logParams.fileHandle, function (err) {
                if (err) {
                    log('Error while closing log file: %s', err.message);
                } else {
                    logParams.fileHandle = undefined;
                }

                return cb(err, currentFileName);
            });
        },
        function (fileName, cb) {
            if (logParams.fileHandle) {
                return cb(null, logParams.fileHandle);
            }

            fs.open(fileName, 'a', function (err, fileHandle) {
                if (!err) {
                    logParams.fileHandle = fileHandle;
                    logParams.filePath = fileName;
                }

                return cb(err, fileHandle);
            });
        },
        function (fileHandle, cb) {
            var logsString = logs.join('\n\n').trim();
            if (logsString !== '') logsString += '\n\n';
            logs = [];

            fs.appendFile(fileHandle, logsString, cb);
        }
    ], function (err) {
        if (err) log('error while creating log file: %s', err.message);
        setTimeout(saveToFileDemon, logParams.savePeriod * 1000);
    });
}

log.configure = function (params) {
    if (this.configured !== undefined) return;
    this.configured = true;

    function setDefault(paramName, defaultValue) { if (params[paramName] === undefined) params[paramName] = defaultValue }

    setDefault('path', require('path').dirname(process.mainModule.filename) + '/logs');
    setDefault('savePeriod', 10);

    logParams.path = (params.path !== '') ? path.normalize(params.path) : '';
    logParams.savePeriod = params.savePeriod;

    if (!fs.existsSync(logParams.path)) {
        fs.mkdirSync(logParams.path);
    }

    logs = [];
    saveToFileDemon();
};

module.exports = log;