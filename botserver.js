import fs from 'fs';
import async from 'async';
import config from './config'
import { users, auth, getTokenFromDB} from './models'
import * as yamoney from './yamoney';
import { recognizeQR } from './utils/funcs'

const tg = require('telegram-node-bot')(config.bot_token, {
    localization: [require('./localization/EN.json')]
});

console.log('Citypay started!!!');

//  For downloaded pictures
if (!fs.existsSync('./temp')) {
    fs.mkdirSync('./temp');
}


const aboutChoices = ['О боте', 'about'];
const helloChoices = ['start', 'помощь', 'помоги', 'help', 'привет, hello'];
const authChoices = ['auth', 'авторизация', 'авторизоваться'];
const confirmAuthChoices = ['confirmAuth'];
const electroChoices = ['свет', 'электроэнергия', 'электричество'];
const cellChoices = ['mobile', 'мобильный', 'сотовый', 'сотка', 'связь', 'тел', 'мтс', 'мегафон', 'билайн'];


const ABOUT_CONTROLLER = 'aboutController';
const HELLO_CONTROLLER = 'helloController';
const AUTH_CONTROLLER = 'authController';
const CONFIRM_AUTH_CONTROLLER = 'confirmAuthController';
const DEFAULT_CONTROLLER = 'defaultController';
const CELLPHONE_CONTROLLER = 'cellPhoneController';
const ELECTRO_CONTROLLER = 'electroController';


tg.router
    .when(aboutChoices, ABOUT_CONTROLLER)
    .when(helloChoices, HELLO_CONTROLLER)
    .when(authChoices, AUTH_CONTROLLER)
    .when(confirmAuthChoices, CONFIRM_AUTH_CONTROLLER)
    .when(electroChoices, ELECTRO_CONTROLLER)
    .when(cellChoices, CELLPHONE_CONTROLLER)
    .otherwise(DEFAULT_CONTROLLER);

tg.controller(ABOUT_CONTROLLER, $ => {
    console.log(tg._localization);
    const aboutBot =
        `Привет, я - бот для оплаты коммунальных платежей. Я умею платить за свет. Несу свет людям, так сказать ☀. И за телефон умею. Меня сделали во время хакатона Яндекс.Денег.`;
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
                    'Использовать QR код': () => { $.sendMessage('Пришлите фотографию QR кода с квитанции.') },
                    'Пополнить баланс телефона': () => { $.routeTo('/mobile') }
                })
            } else {
                $.runMenu({message: `Уважаемый ${user_name}, Вы можете сразу авторизоваться в Яндекс.Деньгах, чтобы потом без промедления платить за выбранные услуги.`,
                    'Авторизация в Яндекс.Деньгах': () => { $.routeTo('/auth') },
                    'О боте': () => { $.routeTo('/about') }
                });
            }
        });
});


tg.controller(DEFAULT_CONTROLLER, $ => {
    users.findOne({user: $.user.id})
        .then(doc => {
            if (!doc) {
                $.sendMessage('Вы не авторизованы в Яндекс.Деньгах. Чтобы продолжить работу со мной, давайте пройдем эту небольшую процедуру =)');
                $.routeTo('/start');
            } else {
                if (($.message.contact) || ($.message.text && ($.message.text.startsWith('+7')))) {
                    let phone = parsePhoneNumber($.message);
                    if (phone) return payPhone($, phone);
                }

                if ($.message.photo) {
                    return recognizeQR(tg, $.message.photo, (err, text) => {
                        if (err) return $.sendMessage('Фото, которое вы мне прислали, не очень-то похоже на QR-код!'+
                            'Попробуйте, пожалуйста, сделать более чёткое и контрастное фото');
                        if (text.includes('Петроэлектросбыт')) {
                            console.log(text);
                            return payPSB($, text);
                        } else {
                            $.sendMessage('К сожалению, я пока не умею платить в эту организацию. ' +
                                'Но для вас я могу расшифровать этот QR-код: ' + text);
                        }
                    });
                }

                if ($.message.text) {
                    $.sendMessage('Не удалось распознать команду =(. Давайте попробуем то, что я умею!');
                    $.routeTo('/start')
                } else {
                    $.sendMessage('Могу распознать QR код с квитанций. Пришлите фото и я попробую!')
                }
            }
        }
    );
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

                        console.log(data)

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
        let phone = parsePhoneNumber($.message);
        if (phone) {
            payPhone($, phone);
        } else {
            $.sendMessage('У меня не получилось распознать введенный номер телефона. Попробуйте еще раз!');
        }
    });
});


function parsePhoneNumber(message) {
    let phone = null;
    if (message.contact) {
        phone = message.contact.phone_number;
    } else {
        let text = (message.text || '').replace(/[^0-9]/g, '');
        if (text.length === 11) phone = text;
    }
    return phone
}


function payPhone($, phone) {
    $.sendMessage(`Всё уже готово, чтобы пополнить баланс номера ${phone}. Сколько нужно положить на счет телефона (не больше 500 р.)?`);
    $.waitForRequest($ => {
        const amount = parseInt($.message.text);
        if (amount && amount < 100) {
            getTokenFromDB($.user.id).then(token => {
                yamoney.payPhone(phone, amount, token, err => {
                    if (err) {
                        console.log(err);
                        $.sendMessage('К сожалению, из-за ошибки у меня не получилось пополнить баланс вашего телефона');
                    } else {
                        $.sendMessage(`Мы с вами пополнили баланс телефона ${phone} на ${amount} р.! Командная работа!`);
                    }
                });
            });
        } else {
            $.sendMessage('Указана неверная сумма.')
        }
    })
}


function payPSB($, text) {
    const abNum = text.split('|').map((x) => x.split('=')).filter((x) => x[0] == 'Persacc')[0][1];
    $.sendMessage('Введите ваши Ф.И.О. для указания в квитанции на оплату:');
    $.waitForRequest($ => {
        const fullName = $.message.text;
        $.sendMessage('Сколько денег вы хотите потратить на оплату электричества?');
        $.waitForRequest($ => {
            const sum = parseInt($.message.text);
            if (sum) {
                $.sendMessage('Введите данные счетчиков за день и ночь через пробел (если счетчик однотарифный, ночной можете не вводить :) ).');
                $.waitForRequest($ => {
                    const counts = $.message.text.split(' ');
                    const countsDay = counts[0];
                    const countsNight = (counts.length > 1) ? counts[1] : '';

                    getTokenFromDB($.user.id).then(token => {
                        yamoney.payPSB(abNum, sum, fullName, countsDay, countsNight, token,
                            (err) => {
                                console.log(err);
                                if (err) return $.sendMessage('К сожалению, при платеже возникла ошибка :(');
                                $.sendMessage('Оплата счета за электричество прошла успешно! Так держать!');
                            });
                    })
                });
            } else {
                $.sendMessage('Указана неверная сумма');
            }
        });
    });
}