var http = require('http');
var Connection = require('./connection');

var connection = new Connection('mongodb://localhost:27017/phonedepobot', {
    autoClose: true,
    closeTimeout: 1
});

function getCode(referer) {
    var x = referer.split('yamoney_oauth?code=');
    if (x.length < 2) return "";
    return x[x.length-1].trim();
}

function addParamsToDB(referer) {
    if (referer.indexOf('yamoney_oauth?') < 0) return null;
    var params = referer.split('yamoney_oauth?')[1].split('&');
    params = params.reduce((res, p) => {
        x = p.split('=');
        res[x[0]] = x[1];
        return res;
    }, {});
    connection.getConnection(function (err, db) {
        if (err) return console.log('GetConnection error: %s', err.messge);
        db.collection('authcodes').insert(params, function (err) {
            if (err) return console.log('Insert code to db error: %s', err.message);
        });
    });
}

var hostname = '0.0.0.0';
var port = 3001;

http.createServer((req, res) => {
    var referer = req.headers.referer;
if (referer) {
    var code = getCode(referer);
    if (code.length) {
        console.log('Code: %s', code);
        console.log('Referer: %s', referer);
        connection.getConnection(function (err, db) {
            if (err) return console.log('GetConnection error: %s', err.messge);
            db.collection('authcodes').insert({code: code}, function (err) {
                if (err) return console.log('Insert code to db error: %s', err.message);
            });
        });
    } else {
        console.log('Referer: %s', referer);
    }
} else {
    console.log('No referer');
}

res.writeHead(200, { 'Content-Type': 'text/plain' });
res.end('');
}).listen(port, hostname, () => {
    console.log('Server started at %s:%s', hostname, port);
});
