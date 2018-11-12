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
    ws.send(JSON.stringify({'type': 'ping', 'time': (new Date().getTime())}));
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
            ws.send(JSON.stringify({'type': 'ack', 'message': 'OK'}));
            break;
        case 'ping':
            let resp = JSON.stringify({'type': 'pong', 'time': obj['time']});
            ws.send(resp);
            break;
        case 'ack':
            console.log('ACK: ' + obj['message']);
            break;
        default:
            break;
    }
});

ws.on('error', function error(err){
    console.log('error: ' + err);
});

/*
let last_time = new Date().getTime();
while (1){
    while((new Date().getTime()) < last_time+(1000/30)){}
    
    if (ID != -1){
        ws.send(JSON.stringify({'type': 'ping', 'time': (new Date().getTime())}));
    }
}
*/