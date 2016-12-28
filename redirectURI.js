import express from 'express';
import { auth } from './models';
import localization from './localization/EN'

const port = 3001;
const app = express();

app.get('/:userId(\\d+)', (req, res) => {
    const userId = req.params.userId;
    const code = req.query.code;

    console.log(`User ${userId} requested authorization`);

    const successAuthText = localization.yamoneyAuthorizationCompletedText;

    auth.findOne({user: userId})
        .then(doc => {
            if (doc) {
                auth.update(doc, { $set: {code: code} }).then(() => {
                        res.send(successAuthText)
                    }
                )
            } else {
                auth.insert({user: parseInt(userId), code: code});
                res.send(successAuthText)
            }
        });
});

app.listen(port, () => console.log('Redirect authentication server started.'));
