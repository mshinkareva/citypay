'use strict';

var bot_token = '217323643:AAEeVPyjOLTDWmbouk8dixXTSdARmPa7SEE';
var tg = require('telegram-node-bot')(bot_token);

var users = require('./Controllers/users');
var log = require('./utils/logs');
log.configure({});

var funcs = require('./utils/funcs');
var c = funcs.cases;

tg.router
    .when(c(['start', 'help', 'О боте', 'привет', 'Привет']), 'startController')
    .when(c(['газ', '222']), 'startController2')
    .otherwise('controller');



var helpBotText =
    'Некий текст о боте.' +
    '\n\nРазработчик: topa [anybot@tomsha.ru]';

tg.controller('startController', function ($) {
    $.sendMessage(helpBotText);
});

tg.controller('startController2', function ($) {
    $.sendMessage("Сейчас оплатим за газ.");
});

tg.controller('controller', function($) {
    users.get($.user.id, $.user, function (err, user) {
        $.sendMessage('Привет, ' + $.user.first_name);
    });
});