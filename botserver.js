'use strict';

var bot_token = '217323643:AAEeVPyjOLTDWmbouk8dixXTSdARmPa7SEE';
var tg = require('telegram-node-bot')(bot_token);

var users = require('./Controllers/users');
var log = require('./utils/logs');
log.configure({});

var util = require('util');
var funcs = require('./utils/funcs');
var c = funcs.cases;

var yamoney = require('./yamoney')(users, getTokenCallback, log);

tg.router
    .when(c(['start', 'help', 'О боте', 'привет', 'Привет']), 'startController')
    .when(c(['auth', 'авторизов']), 'authController')
    .otherwise('controller');


function sendError($, err) {
    log('Error| userid: %s, error: %s', $.user.id, err.message);
    $.sendMessage('Ой, у меня что-то пошло не так. Приношу свои извинения!\n' +
        'Повторите, пожалуйста, ваше последнее действие.')
}

var helpBotText =
    'Привет, я - бот для оплаты коммунальных платежей.' +
    'Я умею платить за свет, газ и ЖКХ.' +
    '%s' +
    '\n\nМеня сделали в рамках хакатона Яндекс.Денег';

tg.controller('startController', function ($) {
    users.get($.user.id, $.user, function (err, user) {
        $.sendMessage(util.format(helpBotText, (user.accessToken ? '' :
            'Для авторизации в Яндекс.Деньгах воспользуйтесь командой /auth.')));
    });
});

tg.controller('authController', function ($) {
    yamoney.getAuthURI($.user.id, function (err, url) {
        if (err) return sendError($, err);
        $.sendMessage(util.format('Для авторизации в Яндекс.Деньгах вам нужно перейти по ссылке:\n%s', url));
    });
});

// вызывается после авторизации в Яндекс.Деньгах
// токен авторизации уже хранится в user.accessToken
function getTokenCallback (user) {
    tg.sendMessage(user.id,
        'Вы успешно прошли авторизацию в Яндекс.Деньгах!' +
        'Теперь можете воспользоваться платными функциями.');
}

tg.controller('startController2', function ($) {
    $.sendMessage("Сейчас оплатим за газ.");
});

tg.controller('controller', function($) {
    users.get($.user.id, $.user, function (err, user) {
        $.sendMessage('Привет, ' + $.user.first_name);
    });
});