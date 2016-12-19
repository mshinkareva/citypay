var method_path;

if (require('os').platform() === 'linux') {
    method_path = 'zbarimg';
} else {
    method_path = require('path').dirname(process.mainModule.filename) + '/utils/bin/qr_win/zbarimg.exe';
}

var iconv = new require('iconv-lite');

module.exports = function (path, cb) {
    var spawn = require('child_process').spawn;

    try {
        var method_qr = spawn(method_path, [path]);

        var output = '';
        var error_text = '';

        method_qr.on('error', function (err) {
            error_text = err.message;
            return null;
        });

        method_qr.stdout.on('data', function (data) {
            output += '\n' + data.toString();
        });

        method_qr.stderr.on('data', function (data) {
            error_text += data.toString();
        });

        method_qr.on('close', function (code) {
            if (code !== 0)
                return cb(new Error(iconv.decode(error_text, 'win1251')));

            if (output.indexOf('Ãàçïðîì') >= 0) {
                output = iconv.decode(output, 'win1251');
            }
            return cb(null, output);
        });

    } catch (e) {
        // error will be received by on('close') callback with non-zero errorcode
    }
};