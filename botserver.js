'use strict';

var users = require('./Controllers/users');
var log = require('./utils/logs');

var bot_token = require('./config.js').bot_token;
var tg = require('telegram-node-bot')(bot_token);

console.log('Citypay bot started.');

log.configure({});

var util = require('util');
var funcs = require('./utils/funcs');
var c = funcs.cases;
var async = require('async');

var yamoney = require('./yamoney')(users, getTokenCallback, log);

tg.router
    .when(c(['start', 'help', 'О боте', 'привет', 'Привет']), 'startController')
    .when(c(['auth', 'авторизов']), 'authController')
    .when(c(['свет', 'электроэнергия', 'электричество']), 'electroController')
    .when(c(['мобильный', 'сотовый', 'сотка', 'связь', 'сота', 'тел', 'мтс', 'мегафон', 'билайн']), 'phoneInfoController')
    .otherwise('controller');


function setMenu($, text) {
    var kb = {
        reply_markup: JSON.stringify({
            hide_keyboard: true,
            resize_keyboard: true,
            one_time_keyboard: true,
            keyboard: [
                ['Электричество'],
                ['Газ'],
                ['Мобильная связь'],
                ['О боте']
            ]
        })
    };
    if (isNaN(parseInt($))) {
        $.sendMessage(text, kb);
    } else {
        tg.sendMessage($, text, kb);
    }
}

function sendError($, err) {
    log('Error| userid: %s, error: %s', $.user.id, err.message);
    $.sendMessage('Ой, у меня что-то пошло не так. Приношу свои извинения!\n' +
        'Повторите, пожалуйста, ваше последнее действие.')
}

var helpBotText =
    'Привет, я - бот для оплаты коммунальных платежей.' +
    'Я умею платить за свет. Несу свет людям, так сказать ☀. И за телефон умею.' +
    '%s' +
    '\n\nМеня сделали во время хакатона Яндекс.Денег';


tg.controller('controller', function($) {
    if (($.message.contact) || ($.message.text && ($.message.text.indexOf('+7') == 0))) {
        return payPhone($);
    }

    if ($.message.photo) {
        return funcs.recognizeQR(tg, $, function (err, text) {
            if (err) return $.sendMessage('Фото, которое вы мне прислали, не очень-то похоже на QR-код!'+
                'Попробуйте, пожалуйста, сделать более чёткое и контрастное фото');

            console.log(text);

            if (text.indexOf('Петроэлектросбыт') >= 0) {
                console.log('QR - PSB');
                return payPSB($, text);
            }
            if (text.indexOf('Газпром') >= 0) {
                console.log('QR - Gasprom');
                return payGas($, text);
            }
            else if(text.indexOf('Жилищное') >= 0) {
                console.log('QR - VCKP');
                return payKvarplata($, text);
            }
            $.sendMessage('К сожалению, я пока не умею платить в эту организацию. ' +
                'Но для вас я могу расшифровать этот QR-код: ' + text);
        });
    }

    if ($.message.text) {
        $.sendMessage('I can\'t recognize this organization');
    }

    users.get($.user.id, $.user, function (err, user) {
        var msgs = [
            util.format('Hello, %s', user.name),
            'Its too complicated for me!'
        ];
        $.sendMessage(funcs.getRandomElem(msgs));
    });
});

tg.controller('startController', function ($) {
    users.get($.user.id, $.user, function (err, user) {
        setMenu($, util.format(helpBotText, (user.accessToken ? '' :
            '\n\nВы можете сразу авторизоваться в Яндекс.Деньгах, чтобы потом без промедления платить за выбранные услуги.'+
            '\nДля этого воспользуйтесь командой /auth.')));
    });
});

tg.controller('authController', function ($) {
    console.log($.user.id)
    yamoney.getAuthURI($.user.id, function (err, url) {
        if (err) return sendError($, err);
        $.sendMessage(util.format('Для авторизации вам нужно перейти на сайт Яндекс.Денег по ссылке:\n%s', url));
    });
});

// вызывается после авторизации в Яндекс.Деньгах
// токен авторизации уже хранится в user.accessToken
function getTokenCallback (user) {
    setMenu(user.id,
        'Вы успешно прошли авторизацию в Яндекс.Деньгах!' +
        'Теперь можете воспользоваться платными функциями.');

    if (user.waitedPhone) {
        var phone = user.waitedPhone.phone;
        var amount = user.waitedPhone.amount;
        yamoney.payPhone(phone, amount, user.accessToken, function (err) {
            if (err) {
                console.log(err);
                return;
            }
            user.waitedPhone = null;
            tg.sendMessage(user.id, util.format('Мы с вами пополнили баланс телефона +%s на %sруб.! Командная работа!', phone, amount));
        });
    }

    // yamoney.payPSB(user.PSB.abNum, user.PSB.sum, user.fullName, user.PSB.countsDay, user.PSB.countsNight, user.accessToken,
    //     function (err) {
    //         if (err) return tg.sendMessage(user.id, 'К сожалению, при платеже возникла ошибка :(');
    //         user.PSB.sum = null;
    //         user.PSB.countsDay = null;
    //         user.PSB.countsNight = null;
    //         tg.sendMessage(user.id, 'Оплата счета за электричество прошла успешно! Так держать!');
    //     }
    // );
}

tg.controller('phoneInfoController', function($) {
    var messages = [
        'Сейчас я пополню баланс абсолютно любого мобильного, который вы дадите (если он российский 🇷🇺). Просто отправьте мне контакт или номер телефона в виде +7...',
        'Умею оплату мобильной связи, люблю, практикую. На какой номер класть 😏?',
        'Пришлите мне контакт из адресной книги или номер телефона (начинающийся с +7) для пополнения баланса мобильного'
    ];
    $.sendMessage(funcs.getRandomElem(messages));
});

function payPhone($) {
    var phone = '';
    if ($.message.contact) {
        phone = $.message.contact.phone_number;
    } else {
        var text = ($.message.text || '').replace(/[^0-9]/g, '');
        if (text.length === 11) phone = text;
    }

    if (phone == '')
        return $.sendMessage('У меня не получилось распознать введенный номер телефона. Попробуйте еще раз!');

    $.sendMessage(util.format('Всё уже готово, чтобы пополнить баланс номера +%s. Сколько нужно положить на счет телефона?', phone), {
        reply_markup: JSON.stringify({
            hide_keyboard: true,
            resize_keyboard: true,
            one_time_keyboard: true,
            keyboard: [ ['Отмена'] ]
        })
    });
    $.waitForRequest(function($) {
        if (!$.message.text) return $.routeTo('other');
        if (isNaN(parseFloat($.message.text))) return setMenu($,
            'Счет мобильного телефона пополнен не будет. Может сделаете что-нибудь еще?');

        users.get($.user.id, $.user, function (err, user) {
            if (err) return sendError($, err);
            var amount = parseFloat($.message.text);

            if (!user.accessToken) {
                user.waitedPhone = {
                    phone: phone,
                    amount: amount
                };
                $.sendMessage('Для оплаты телефона вам понадобиться авторизоваться в Яндекс.Деньгах.');
                return $.routeTo('/auth');
            }

            yamoney.payPhone(phone, amount, user.accessToken, function (err) {
                if (err) return $.sendMessage('К сожалению, из-за ошибки у меня не получилось пополнить баланс вашего телефона');
                user.waitedPhone = null;
                $.sendMessage(util.format('Мы с вами пополнили баланс телефона +%s на %sруб.! Командная работа!', phone, amount));
            });
        });
    });
}
//оплата электричества
tg.controller('electroController', function ($) {
    payPSB($);
});

function payPSB($, text) {
    var user = {};
    async.waterfall([
        function (callback) {
            users.get($.user.id, $.user, callback);
        },
        function (auser, callback) {
            user = auser;
            if (!user.PSB) user.PSB = {};
            if (text) {
                try {
                    user.PSB.abNum = text.split('|').map((x) => x.split('=')).filter((x) => x[0] == 'Persacc')[0][1];
                } catch (e) {
                    user.PSB.abNum = '';
                }
            }
            callback(null);
        },
        function (callback) {
            if (user.PSB.abNum) return callback(null);
            $.sendMessage('Введите номер вашего абонентского номера для оплаты счетов по электричеству, или отправьте мне фотографию QR-кода с квитанции.');
        },
        function (callback) {
            if (user.fullName) return callback(null);
            $.sendMessage('Введите ваши Ф.И.О. для указания в квитанции на оплату:');
            $.waitForRequest(function ($) {
                user.fullName = $.message.text;
                return callback(null);
            });
        }, //First Name, Second Name, patronymic
        function (callback) {
            $.sendMessage('Сколько денег вы хотите потратить на оплату электричества?');
            $.waitForRequest(function ($) {
                user.PSB.sum = $.message.text;
                return callback(null);
            });
        },//sum
        function (callback) {
            $.sendMessage('Введите данные счетчиков за день и ночь через пробел (если счетчик однотарифный, ночной можете не вводить :) ).');
            $.waitForRequest(function ($) {
                var counts = $.message.text.split(' ');
                user.PSB.countsDay = counts[0];
                user.PSB.countsNight = (counts.length > 1) ? counts[1] : '';
                return callback(null);
            });
        }
            //counters
    ], function (err) {
        if (err && (err.message == 'cancelled')) return setMenu($, 'Не будем сейчас платить за свет. Но мы можем заплатить за что-нибудь еще!');
        if (err) return sendError($, err);

        if (!user.accessToken) {
            $.sendMessage('Перед оплатой квитанции вам нужно будет авторизоваться в Яндекс.Деньгах.');
            return $.routeTo('/auth');
        }
        

        yamoney.payPSB(user.PSB.abNum, user.PSB.sum, user.fullName, user.PSB.countsDay, user.PSB.countsNight, user.accessToken,
            function (err) {
                if (err) return $.sendMessage('К сожалению, при платеже возникла ошибка :(');
                $.sendMessage('Оплата счета за электричество прошла успешно! Так держать!');
            });
    });
}

tg.controller('kvarplataController', function ($) {
    payKvarplata($);
});

function payKvarplata($, text) {
    var user = {};
    async.waterfall([
        function (callback) {
            users.get($.user.id, $.user, callback);
        },
        function (auser, callback) {
            user = auser;
            if (!user.Kvarplata) user.Kvarplata = {};
            if (text) {
                try {
                    user.Kvarplata.abNum = text.split('|').map((x) => x.split('=')).filter((x) => x[0] == 'PersAcc')[0][1];
                } catch (e) {
                    user.Kvarplata.abNum = '';
                }
            }
            callback(null);
        },
        function (callback) {
            if (user.Kvarplata.abNum) return callback(null);
            $.sendMessage('Введите номер вашего абонентского номера для оплаты счетов по кварплате, или отправьте мне фотографию QR-кода с квитанции.');
        },
        function (callback) {
            if (user.fullName) return callback(null);
            $.sendMessage('Введите ваши Ф.И.О. для указания в квитанции на оплату:');
            $.waitForRequest(function ($) {
                user.fullName = $.message.text;
                return callback(null);
            });
        }, //First Name, Second Name, patronymic
        function (callback) {
            $.sendMessage('Сколько денег вы хотите потратить на оплату кварплаты?');
            $.waitForRequest(function ($) {
                user.Kvarplata.sum = $.message.text;
                return callback(null);
            });
        }//sum
        /*
        function (callback) {
            $.sendMessage('Введите данные счетчиков за холодную и горячую воду, но можете не вводить :) ).');
            $.waitForRequest(function ($) {
                var counts = $.message.text.split(' ');
                user.Kvarplata.countsCold = counts[0];
                user.Kvarplata.countsHot =  counts[1];
                return callback(null);
            });
        }
        */
        //counters
    ], function (err) {
        if (err && (err.message == 'cancelled')) return setMenu($, 'Не будем сейчас платить за кварплату. Но мы можем заплатить за что-нибудь еще!');
        if (err) return sendError($, err);

        if (!user.accessToken) {
            $.sendMessage('Перед оплатой квитанции вам нужно будет авторизоваться в Яндекс.Деньгах.');
            return $.routeTo('/auth');
        }
        yamoney.payKvarplata(user.Kvarplata.abNum, user.Kvarplata.sum,  user.accessToken,
            function (err) {
                console.log(err);
                if (err) return $.sendMessage('К сожалению, при платеже возникла ошибка :(');
                $.sendMessage('Оплата счета за кварплату прошла успешно! Так держать!');
            });
    });
}
