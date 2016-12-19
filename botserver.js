import async from 'async';

import config from './config'

import { users, auth, getTokenFromDB} from './models'

var tg = require('telegram-node-bot')(config.bot_token);

var funcs = require('./utils/funcs');

import * as yamoney from './yamoney';


tg.router
    .when(aboutChoices, ABOUT_CONTROLLER)
    .when(helloChoices, HELLO_CONTROLLER)
    .when(authChoices, AUTH_CONTROLLER)
    .when(confirmAuthChoices, CONFIRM_AUTH_CONTROLLER)
    .when(electroChoices, ELECTRO_CONTROLLER)
    .when(cellChoices, CELLPHONE_CONTROLLER)
    .otherwise(DEFAULT_CONTROLLER);


tg.controller(ABOUT_CONTROLLER, $ => {
    const aboutBot =
        `Привет, я - бот для оплаты коммунальных платежей
        Я умею платить за свет. Несу свет людям, так сказать ☀. И за телефон умею.
        Меня сделали во время хакатона Яндекс.Денег.`;
    $.sendMessage(aboutBot);
});


tg.controller(HELLO_CONTROLLER, $ => {
    const user_name = $.user.first_name;
    users.findOne({user: $.user.id})
        .then(doc => {
            if (doc) {
                console.log(`User ${user_name} connected!`);
                $.runMenu({
                    message: `${user_name}, Вы уже успешно авторизованы ы Яндекс.Деньгах. Что хотели бы оплатить?`,
                    'Использовать QR код': () => { $.sendMessage('Пришлите фотографию квитанции с QR кодом') },
                    'Пополнить баланс телефона': () => { $.routeTo('/mobile') }
                })
            } else {
                $.runMenu({message: `Уважаемый ${user_name}, Вы можете сразу авторизоваться в Яндекс.Деньгах,
                чтобы потом без промедления платить за выбранные услуги.`,
                    'Авторизация в Яндекс.Деньгах': () => { $.routeTo('/auth') },
                    'О боте': () => { $.routeTo('/about') }
                });
            }
        });
});


tg.controller(DEFAULT_CONTROLLER, $ => {
    if (($.message.contact) || ($.message.text && ($.message.text.startsWith('+7')))) {
        $.routeTo('/help');
    }

    if ($.message.photo) {
        return funcs.recognizeQR(tg, $, function (err, text) {
            if (err) return $.sendMessage('Фото, которое вы мне прислали, не очень-то похоже на QR-код!'+
                'Попробуйте, пожалуйста, сделать более чёткое и контрастное фото');

            if (text.includes('Петроэлектросбыт')) {
                return payPSB($, text);
            } else {
                $.sendMessage('К сожалению, я пока не умею платить в эту организацию. ' +
                    'Но для вас я могу расшифровать этот QR-код: ' + text);
            }
        });
    }

    if ($.message.text) {
        $.sendMessage('Не удалось распознать команду');
    }
});


tg.controller(AUTH_CONTROLLER, $ => {
    const authUrl = yamoney.getAuthURI($.user.id);
    $.runMenu({
        message: `Для авторизации вам нужно перейти на сайт Яндекс.Денег по ссылке:\n${authUrl}\n` +
        'Как только авторизация будет закончена, нажмите подтвердить',
        'Подтвердить авторизацию': () => { $.routeTo('/confirmAuth') }
    });
});


tg.controller(CONFIRM_AUTH_CONTROLLER, $ => {
    const userId = $.user.id;

    auth.findOne({user: userId})
        .then(doc => {
            if (doc) {
                console.log(`Found temp code for user ${userId}. Trying to generate access token`);
                yamoney.getToken(config.yandex_money.clientId, doc.code, config.yandex_money.redirectURI,
                    (err, data) => {
                        if (err) {
                            console.log(`Error while get access token: ${err.message}`);
                            return
                        }

                        users.findOne({user: userId}).then(userRecord => {
                            if (userRecord) {
                                users.update({user: userId}, { $set: {token: data.access_token} }).then(() => {
                                    console.log(`User ${userId} updated access token`);
                                    $.sendMessage('Вы успешно обновили токен авторизации Яндекс.Денег!');
                                });
                            } else {
                                users.insert({user: userId, token: data.access_token}).then(() => {
                                    console.log(`User ${userId} obtained new access token`);
                                    $.sendMessage('Вы успешно прошли авторизацию в Яндекс.Деньгах!' +
                                        'Теперь можете воспользоваться платными функциями.');
                                });
                            }
                        })
                    });
            } else {
                $.runMenu({
                    message: 'Не удалось подтвердить авторизацию =(.' +
                    'Перейдите по ссылке еще раз и попробуйте снова',
                    'Подтвердить авторизацию': () => { $.routeTo('/confirmAuth') },
                    'Отмена': () => $.sendMessage('Без авторизации вы не сможете осуществлять платежи. ' +
                        'Если возникли проблемы, обратитесь в службу Яндекс.Деньги или к моему создателю.')
                })
            }
        });
});


tg.controller(CELLPHONE_CONTROLLER, $ => {
    let message =
        'Сейчас я пополню баланс абсолютно любого мобильного, который вы дадите (если он российский 🇷🇺).' +
        'Просто отправьте мне контакт из телефонной книги или номер телефона в виде XXXXXXX (без +7)';
    $.sendMessage(message);
    $.waitForRequest($ => {
        let phone = null;
        if ($.message.contact) {
            phone = $.message.contact.phone_number;
        } else {
            let text = ($.message.text || '').replace(/[^0-9]/g, '');
            if (text.length === 11) phone = text;
        }
        if (phone) {
            $.sendMessage(`Всё уже готово, чтобы пополнить баланс номера +7${phone}. Сколько нужно положить на счет телефона (не больше 500)?`);
            $.waitForRequest($ => {
                const amount = parseInt($.message.text);
                if (amount && amount < 100) {
                    getTokenFromDB($.user.id.toString()).then(token => {
                        yamoney.payPhone(phone, amount, token, err => {
                            if (err) {
                                console.log(err);
                                $.sendMessage('К сожалению, из-за ошибки у меня не получилось пополнить баланс вашего телефона');
                            } else {
                                $.sendMessage(`Мы с вами пополнили баланс телефона +7${phone} на ${amount} р.! Командная работа!`);
                            }
                        });
                    });
                } else {
                    $.sendMessage('Указана неверная сумма')
                }
            })
        } else {
            $.sendMessage('У меня не получилось распознать введенный номер телефона. Попробуйте еще раз!');
        }
    });
});


tg.controller(ELECTRO_CONTROLLER, $ => {
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
});