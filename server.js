const WebSocket = require('ws');

var players = {};

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
                let id = Object.keys(players).length;
                players[id] = {'ws': ws};
                resp_d(ws, {'type': 'id', 'id': id});
                resp_d(ws, {'type': 'ping', 'id': id, 'time': (new Date().getTime())});
                break;
            case 'pong':
                let elapsed = (new Date().getTime()) - obj['time'];
                console.log('Ping: ' + elapsed + ' ms');
                resp_d(players[obj['id']]['ws'], {'type': 'ack', 'id': obj['id'], 'message': 'OK'});
                break;
            case 'ping':
                let resp = JSON.stringify({'type': 'pong', 'id': obj['id'], 'time': obj['time']});
                ws.send(resp);
                break;
            case 'player_position':
                for (let i = 0; i < Object.keys(players).length; i++){
                    let id = Object.keys(players)[i];
                    console.log(id);
                    if (obj['id'] != id){
                        if (players[id]['ws'].readyState === 1){
                            resp_d(players[id]['ws'], obj);
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
