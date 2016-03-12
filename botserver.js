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
    .when(c(['транспорт']), 'startControllerTransport')
    .when(c(['свет', 'электроэнергия', 'электричество']), 'startControllerElectro')
    .when(c(['газ']), 'startControllerGas')
    .when(c(['мобильный', 'сотовый', 'сотка', 'связь']), 'startControllerPhone')
    .otherwise('controller');



var helpBotText =
    'Некий текст о боте.' +
    '\n\nРазработчик: topa [anybot@tomsha.ru]';

tg.controller('startController', function ($) {
    $.sendMessage(helpBotText);
});

tg.controller('startControllerGas', function ($) {
    $.sendMessage("Сейчас оплатим за газ.");
    
});


tg.controller('startControllerElectro', function ($) {
    $.sendMessage("Сейчас оплатим за электричество.");
});


tg.controller('startControllerElectro', function ($) {
    $.sendMessage("Сейчас пополним баланс транспортной карты. Кстати, а какая карта?");
});





tg.controller('controller', function($) {
    users.get($.user.id, $.user, function (err, user) {
        $.sendMessage('Привет, ' + $.user.first_name);
    });
});