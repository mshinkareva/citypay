var mainDir = require('path').dirname(process.mainModule.filename);
var models = require(mainDir + '/models');

function getHistory (cb) {
    models.getConnection(function (err, db) {
        if (err) return cb(err);
        return cb(null, db.collection('history'));
    });
}

module.exports = {
    getHistoryCollection: getHistory
};