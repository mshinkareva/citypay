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
    .when(c(['транспорт']), 'startControllerTransport')
    .when(c(['свет', 'электроэнергия', 'электричество']), 'startControllerElectro')
    .when(c(['газ']), 'startControllerGas')
    .when(c(['мобильный', 'сотовый', 'сотка', 'связь']), 'startControllerPhone')
    .otherwise('controller');


function setMenu($, text) {
    users.get($.user.id, $.user, function (err, user){
        $.runMenu({
            message: text,
            'транспорт' : function () { $.routeTo('транспорт') },
            'электричество': function () { $.routeTo('свет') },
            'мобильная связь': function () { $.routeTo('мобильный') },
            'газ'   : function () { $.routeTo('газ') },
            'История': function () { $.routeTo('historyController') },
            'О боте' : function () { $.routeTo('start') }
            
        });
    });
}


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
        setMenu($, util.format(helpBotText, (user.accessToken ? '' :
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

tg.controller('startControllerGas', function ($) {
    $.sendMessage("Сейчас оплатим за газ.");
    

});


tg.controller('startControllerElectro', function ($) {
    $.sendMessage("Сейчас оплатим за электричество.");
});


tg.controller('startControllerTransport', function ($) {
    $.sendMessage("Сейчас пополним баланс транспортной карты.Кстати, а какая карта?");
    $.waitForRequest(($) => {
        var nums = $.message.text.replace(/[^0-9]/g, '');
        if(nums.length<=10){$.sendMessage('Это тройка'+ nums.length)}
        else{$.sendMessage('ОЙ, ВСЕ!')}
                     });
})




    


tg.controller('startControllerPhone', function($) {
    $.sendMessage('Минуточку, сейчас пополним баланс мобильного, просто отправьте контакт (ваш, либо любого другого человека из списка контактов)');
});



tg.controller('controller', function($) {
    users.get($.user.id, $.user, function (err, user) {
        $.sendMessage('Привет, ' + $.user.first_name);
    });
});
