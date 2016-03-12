'use strict';

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

module.exports = {
    getRandomInt: getRandomInt,
    getRandomElem: getRandomElem,
    cases: cases,
    log: log,
    chooseFromArray: chooseFromArray
};