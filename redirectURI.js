import express from 'express';
import db from './models';

var port = 3001;

const app = express();

app.get('/:userId(\\d+)', (req, res) => {
    const userId = req.params.userId;
    const code = req.query.code;

    console.log(`User ${userId} requested authorization`);

    const successAuthText = 'Вы успешно прошли авторизацию. ' +
                            'Нажмите "ПОДТВЕРДИТЬ" в приложении Telegram (время действия временного токена - 1 минута)';

    const authCollection = db.get('auth');

    authCollection.findOne({user: userId})
        .then(doc => {
            if (doc) {
                authCollection.update(doc, { $set: {code: code} }).then(() => {
                        res.send(successAuthText)
                    }
                )
            } else {
                authCollection.insert({user: userId, code: code});
                res.send(successAuthText)
            }
        });
});

app.listen(port, () => console.log('Redirect authentication server started.'));
