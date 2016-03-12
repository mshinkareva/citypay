var MongoClient = require('mongodb').MongoClient;

var Connection = function (url, params) {
    this.url = url;
    this.db = null;

    var _params = params || {};
    this.closeTimeout = _params.closeTimeout || 10;
    this.autoClose = (_params.autoClose !== false);
};

Connection.prototype = {
    getConnection: function (cb) {
        var self = this;

        if (this.db) {
            if (this.autoClose) {
                if (this.closeTimer) {
                    clearTimeout(this.closeTimer);
                }

                this.closeTimer = setTimeout(function () {
                    self.close();
                }, this.closeTimeout * 1000);
            }

            return cb(null, this.db);
        }

        if (!this.waitConnection) {
            return this.connect(cb);
        }

        setTimeout(function () {
            self.getConnection(cb);
        }, 100);
    },

    connect: function (cb) {
        var self = this;
        self.waitConnection = true;
        MongoClient.connect(this.url, function (err, db) {
            if (!err) {
                self.db = db;
                if (self.autoClose) {
                    self.closeTimer = setTimeout(function () {
                        self.close();
                    }, self.closeTimeout*1000);
                }
            }
            self.waitConnection = false;
            return cb(err, db);
        });
    },

    close: function (cb) {
        if (!this.db) {
            this.closeTimer = null;
            return cb(null);
        }

        var db = this.db;
        this.db = null;
        db.close();
    }
};


module.exports = Connection;