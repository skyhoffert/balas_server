const WebSocket = require('ws');

var players = [];

const wss = new WebSocket.Server({
  port: 5000
});

function resp_d(s, msg){
    s.send(JSON.stringify(msg));
}

wss.on('connection', function connection(ws){
    ws.on('message', function incoming(message){
        let obj = JSON.parse(message);

        // DEBUG
        //console.log(obj);

        switch (obj['type']){
            case 'connect':
                let id = players.length;
                players.push({'id': id, 'ws': ws});
                resp_d(ws, {'type': 'id', 'id': id});
                resp_d(ws, {'type': 'ping', 'time': (new Date().getTime())});
                break;
            case 'pong':
                let elapsed = (new Date().getTime()) - obj['time'];
                console.log('Ping: ' + elapsed + ' ms');
                resp_d(players[players.length-1]['ws'], {'type': 'ack', 'message': 'OK'});
                break;
            case 'ping':
                let resp = JSON.stringify({'type': 'pong', 'time': obj['time']});
                ws.send(resp);
                break;
            case 'player_position':
                for (let i = 0; i < players.length; i++){
                    if (obj['id'] != players[i]['id']){
                        if (players[i]['ws'].readyState != 'CLOSED'){
                            resp_d(players[i]['ws'], obj);
                        }
                    }
                }
                break;
            default:
                resp_d(ws, {'type': 'error', 'message': 'given type not found'});
                break;
        }
    });
});
