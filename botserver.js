import fs from 'fs';
import async from 'async';
import config from './config'
import { users, auth, getTokenFromDB} from './models'
import * as yamoney from './yamoney';
import { recognizeQR } from './utils/funcs'
var Telegram = require('telegram-node-bot');

const tg = require('telegram-node-bot')(config.bot_token);
import localization from './localization/EN'

console.log('Citypay bot started');

//    "telegram-node-bot": "^2.0.5",

//const tg = new Telegram.Telegram(config.bot_token, {
//    localization: [require('./localization/EN.json')]
//});

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
    const aboutBot = localization.aboutText;
    $.sendMessage(aboutBot);
});


tg.controller(HELLO_CONTROLLER, $ => {
    const user_name = $.user.first_name;
    users.findOne({user: $.user.id})
        .then(doc => {
            if (doc) {
                console.log(`User ${user_name} connected!`);
                $.runMenu({
                    message: `${user_name} ${localization.successfulAuthorizationText}`,
                    [localization.useQRCodeMenuText]: () => { $.sendMessage(localization.sendQRText) },
                    [localization.replenishBalanceMenuText]: () => { $.routeTo('/mobile') }
                })
            } else {
                $.runMenu({message: localization.authorizationOfferText,
                    [localization.authorizeMenuText]: () => { $.routeTo('/auth') },
                    [localization.aboutMenuText]: () => { $.routeTo('/about') }
                });
            }
        });
});


tg.controller(DEFAULT_CONTROLLER, $ => {
    users.findOne({user: $.user.id})
        .then(doc => {
            if (!doc) {
                $.sendMessage(localization.notAuthorizedText);
                $.routeTo('/start');
            } else {
                if (($.message.contact) || ($.message.text && ($.message.text.startsWith('+7')))) {
                    let phone = parsePhoneNumber($.message);
                    if (phone) return payPhone($, phone);
                }

                if ($.message.photo) {
                    return recognizeQR(tg, $.message.photo, (err, text) => {
                        if (err) return $.sendMessage(localization.cannotRecognizeQRText);
                        if (text.includes('Петроэлектросбыт')) {
                            console.log(text);
                            return payPSB($, text);
                        } else {
                            $.sendMessage(localization.cannotPayForOrganizationText);
                            $.sendMessage(text);
                        }
                    });
                }

                if ($.message.text) {
                    $.sendMessage(localization.failedToRecognizeCommandText);
                    $.routeTo('/start')
                } else {
                    $.sendMessage(localization.canRecognizeQRText)
                }
            }
        }
    );
});


tg.controller(AUTH_CONTROLLER, $ => {
    const authUrl = yamoney.getAuthURI($.user.id);
    $.runMenu({
        message: `${localization.authorizeYandexMoneyText}\n${authUrl}\n` + localization.endYandexMoneyAuthText,
        [localization.confirmAuthMenuText]: () => { $.routeTo('/confirmAuth') }
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
                        if (err || data.access_token === '') {
                            console.log(`Error while get access token: ${err}`);
                            return
                        }

                        users.findOne({user: userId}).then(userRecord => {
                            if (userRecord) {
                                users.update({user: userId}, { $set: {token: data.access_token} }).then(() => {
                                    console.log(`User ${userId} updated access token`);
                                    $.sendMessage(localization.successfullyUpdatedTokenText);
                                });
                            } else {
                                users.insert({user: userId, token: data.access_token}).then(() => {
                                    console.log(`User ${userId} obtained new access token`);
                                    $.sendMessage(localization.authorizationCompletedText);
                                });
                            }
                        })
                    });
            } else {
                $.runMenu({
                    message: localization.failedToConfirmAuthorizationText,
                    [localization.confirmAuthMenuText]: () => { $.routeTo('/confirmAuth') },
                    [localization.cancelMenuText]: () => $.sendMessage(localization.authorizationWarningText)
                })
            }
        });
});


tg.controller(CELLPHONE_CONTROLLER, $ => {
    const message = localization.payPhoneStartText;
    $.sendMessage(message);
    $.waitForRequest($ => {
        let phone = parsePhoneNumber($.message);
        if (phone) {
            payPhone($, phone);
        } else {
            $.sendMessage(localization.failedToRecognizePhoneText);
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
    $.sendMessage(`${localization.preparePayPhoneText} ${phone}?`);
    $.waitForRequest($ => {
        const amount = parseInt($.message.text);
        if (amount && amount < 100) {
            getTokenFromDB($.user.id).then(token => {
                yamoney.payPhone(phone, amount, token, err => {
                    if (err) {
                        console.log(err);
                        $.sendMessage(localization.failedToPayPhoneText);
                    } else {
                        $.sendMessage(localization.successfullyPayedPhoneText);
                    }
                });
            });
        } else {
            $.sendMessage(localization.invalidAmountText)
        }
    })
}


function payPSB($, text) {
    const abNum = text.split('|').map((x) => x.split('=')).filter((x) => x[0] == 'Persacc')[0][1];
    $.sendMessage(localization.credentialsDialogText);
    $.waitForRequest($ => {
        const fullName = $.message.text;
        $.sendMessage(localization.howMuchFundsToSpendText);
        $.waitForRequest($ => {
            const sum = parseInt($.message.text);
            if (sum) {
                $.sendMessage(localization.lightCountersDialogText);
                $.waitForRequest($ => {
                    const counts = $.message.text.split(' ');
                    const countsDay = counts[0];
                    const countsNight = (counts.length > 1) ? counts[1] : '';

                    getTokenFromDB($.user.id).then(token => {
                        yamoney.payPSB(abNum, sum, fullName, countsDay, countsNight, token,
                            (err) => {
                                console.log(err);
                                if (err) return $.sendMessage(localization.paymentErrorText);
                                $.sendMessage(localization.electricityPaymentSuccessText);
                            });
                    })
                });
            } else {
                $.sendMessage(localization.invalidAmountText);
            }
        });
    });
}