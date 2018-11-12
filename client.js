const WebSocket = require('ws');

var IP = 'ec2-54-147-97-99.compute-1.amazonaws.com';
//const IP = 'localhost';
var PORT = '5000';

if (process.argv.length > 2){
    IP = process.argv[2];
    PORT = process.argv[3];
}

const ws = new WebSocket('ws://' + IP + ':' + PORT);

var ID = -1;

const INIT_MSG = {
    'type': 'connect',
};

function key_msg(code, down=true) {
    return {
        'type': 'key',
        'down': down,
        'code': code
    };
}

ws.on('open', function open() {
    let start = new Date().getTime();
    ws.send(JSON.stringify(INIT_MSG));
});

ws.on('message', function incoming(data) {
    let obj = JSON.parse(data);

    // DEBUG
    //console.log(obj);

    switch (obj['type']){
        case 'id':
            ID = obj['id'];
            console.log('ID: ' + ID);
            break;
        case 'pong':
            let elapsed = (new Date().getTime()) - obj['time'];
            console.log('Ping: ' + elapsed + ' ms');
            ws.send(JSON.stringify({'type': 'ack', 'id': ID, 'message': 'OK'}));
            break;
        case 'ping':
            let resp = JSON.stringify({'type': 'pong', 'id': obj['id'], 'time': obj['time']});
            ws.send(resp);
            break;
        case 'ack':
            console.log('ACK: ' + obj['message']);
            break;
        case 'player_position':
            console.log('Updated player ' + obj['id'] + ' position to ' + obj['x'] + ', ' + obj['y']);
            break;
        default:
            break;
    }
});

ws.on('error', function error(err){
    console.log('error: ' + err);
});

var tick = 0;
var x = 0.0;
var y = 0.0;

setInterval(function update() {
    if (ws.readyState === 1){
        if (ID != -1){
            if (tick % 15 === 0){
                ws.send(JSON.stringify({'type': 'ping', 'id': ID, 'time': (new Date().getTime())}));
            } else {
                ws.send(JSON.stringify({'type': 'player_position', 'id': ID, 'x': x, 'y': y}));
            }
            x += 0.1;
            y += 0.1;
            tick++;
        }
    } else if (ws.readyState === 3){
        return;
    }
}, 1000/30);