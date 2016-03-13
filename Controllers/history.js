var mainDir = require('path').dirname(process.mainModule.filename);
var models = require(mainDir + '/models');
var async = require('async');

function getHistoryCollection (cb) {
    models.getConnection(function (err, db) {
        if (err) return cb(err);
        return cb(null, db.collection('history'));
    });
}

function addHistory(userId, str, cb) {
    async.waterfall([
        function (callback) {
            getHistoryCollection(callback);
        },
        function (historyCollection, callback) {
            historyCollection.insertOne({
                userId: userId,
                text: str
            }, callback);
        }
    ], cb);
}

function getHistory(userId, cb) {
    async.waterfall([
        function (callback) {
            getHistoryCollection(callback);
        },
        function (historyCollection, callback) {
            historyCollection.find({ userId: userId }, callback);
        }
    ], cb);
}

module.exports = {
    getHistoryCollection: getHistoryCollection,
    addHistory: addHistory,
    getHistory: getHistory
};