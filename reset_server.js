const WebSocket = require('ws');

var IP = '35.171.151.27';
//var IP = 'localhost';
var PORT = '5000';

if (process.argv.length > 2){
    IP = process.argv[2];
    PORT = process.argv[3];
}

const ws = new WebSocket('ws://' + IP + ':' + PORT);

ws.on('open', function open() {
    let start = new Date().getTime();
    ws.send(JSON.stringify({'type': 'reset'}));
    ws.close();
});

ws.on('error', function error(err){
    console.log('error: ' + err);
});