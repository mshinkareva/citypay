import fs from 'fs'
import async from 'async';


function download(url, dest, cb) {
    var file = fs.createWriteStream(dest);
    require('https').get(url, function(response) {
        response.pipe(file);
        file.on('finish', function() {
            file.close(cb);
        });
    });
}

function getBiggestImage(tg, images, cb) {
    images.sort((a, b) => (b.file_size - a.file_size));

    if (images.length > 0) {
        return tg.getFile(images[0].file_id, function (data) {
            if (!data.ok) return cb(new Error('File getting failed'));
            return cb(null, data.result);
        });
    }

    cb(new Error('File not found'));
}


export function getRandomInt(min, max) {
  return Math.random() * (max - min) + min;
}


export function recognizeQR(tg, photo, cb) {
    if (!photo) return cb(new Error('photo not found'));
    async.waterfall([
        function (callback) {
            getBiggestImage(tg, photo, callback);
        },
        function (result, callback) {
            var url = require('util').format('https://api.telegram.org/file/bot%s/%s',
                tg._token, result.file_path);
            var temp = result.file_path.split('.');
            var dest = './temp/' + getRandomInt(1000, 9999) + '.' + temp[temp.length - 1];
            download(url, dest, function (err) {
                return callback(err, dest);
            });
        },
        function (dest, callback) {
            require('./qr')(dest, function (err, text) {
                return fs.unlink(dest, function () {
                    callback(err, text);
                });
            });
        }
    ], cb);
}