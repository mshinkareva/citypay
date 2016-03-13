'use strict';

var fs = require('fs');
var async = require('async');

function getRandomInt (min, max) {
    return Math.floor((max-min+1)*Math.random()) + min;
}

function getRandomElem (arr) {
    return arr[getRandomInt(0, arr.length - 1)];
}

function cases (cmdArray) {
    var res = [];
    function addToRes (cmd) {if (res.indexOf(cmd) < 0) res.push(cmd)}
    for (var i = 0; i < cmdArray.length; i++) {
        var cmd = cmdArray[i].toLowerCase();
        addToRes(cmd);
        addToRes(cmd.charAt(0).toUpperCase() + cmd.substring(1, cmd.length));
    }
    return res;
}

function log(s) {
    var _s = [];
    var dt = new Date();
    var sdt = [dt.getDate(),'.',(dt.getMonth()+1),'.',dt.getFullYear(),' ',dt.getHours(),':',dt.getMinutes(),':',dt.getSeconds(),':'].join('');
    if (typeof(s) == 'string')
        _s.push(sdt + ' ' + s);
    else {
        _s.push(sdt);
        _s.push(s);
    }
    for (var i = 1; i < arguments.length; i++) _s.push(arguments[i]);
    return console.log.apply(console, _s);
}

function chooseFromArray(message, arr, $, maxCount, cb, cancelCb) {
    function getArrPage(num) {
        function getCBbyElem(i) { return function () { return cb(null, arr[i], i) }; }
        var N = Math.min(maxCount*(num+1), arr.length);
        var pages = { message: message };

        if (num !== 0)
            pages['назад'] = function () {
                $.runMenu(getArrPage(num-1));
            };

        for (var i = maxCount*num; i < N; i++)
            pages[arr[i]] = getCBbyElem(i);

        if (arr.length > N)
            pages['далее'] = function () {
                $.runMenu(getArrPage(num+1));
            };

        pages['Отмена'] = function () {
            return cancelCb(null);
        };

        return pages;
    }
    $.runMenu(getArrPage(0));
}

function download(url, dest, cb) {
    var file = fs.createWriteStream(dest);
    require('https').get(url, function(response) {
        response.pipe(file);
        file.on('finish', function() {
            file.close(cb);
        });
    });
}

function getBiggestImage(tg, images, cb) {
    images.sort((a, b) => (b.file_size - a.file_size));

    if (images.length > 0) {
        return tg.getFile(images[0].file_id, function (data) {
            if (!data.ok) return cb(new Error('File getting failed'));
            return cb(null, data.result);
        });
    }

    cb(new Error('File not found'));
}


if (!fs.existsSync('./temp')) {
    fs.mkdirSync('./temp');
}
function recognizeQR(tg, $, cb) {
    if (!$.message.photo) return cb(new Error('photo not found'));
    async.waterfall([
        function (callback) {
            getBiggestImage(tg, $.message.photo, callback);
        },
        function (result, callback) {
            var url = require('util').format('https://api.telegram.org/file/bot%s/%s',
                tg._token, result.file_path);
            var temp = result.file_path.split('.');
            var dest = './temp/' + getRandomInt(1000, 9999) + '.' + temp[temp.length - 1];
            download(url, dest, function (err) {
                return callback(err, dest);
            });
        },
        function (dest, callback) {
            require('./qr')(dest, function (err, text) {
                return fs.unlink(dest, function () {
                    callback(err, text);
                });
            });
        }
    ], cb);
}

function copyParams(obj, res) {
    if (res === undefined) res = {};

    if (obj instanceof Array) {
        for (var i = 0; i < obj.length; i++) {
            copyParams(obj[i], res);
        }
    } else if (obj.items && (obj.items instanceof Array)) {
        for (i = 0; i < obj.items.length; i++) {
            copyParams(obj.items[i], res);
        }
    } else if (obj instanceof Object) {
        if (obj.name) {
            res[obj.name] = (obj.value ? obj.value : null);
        }
    }
    return res;
}

module.exports = {
    getRandomInt: getRandomInt,
    getRandomElem: getRandomElem,
    cases: cases,
    log: log,
    chooseFromArray: chooseFromArray,
    recognizeQR: recognizeQR,
    copyParams: copyParams
};