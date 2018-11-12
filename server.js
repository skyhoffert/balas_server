// balas
// November 12, 2018

const WebSocket = require('ws');

const SEED_INIT = 1;

const WIDTH = 1600;
const HEIGHT = 900;
const UPDATE_RATE = 1000/60;

const BALL_SPEED = 6;
const BALL_SIZE = 12;

const PLAYER_SPEED = 4;
const PLAYER_SIZE = 32;

const CODE_A = 65;
const CODE_D = 68;
const CODE_W = 87;
const CODE_S = 83;
const CODE_SPACE = 32;

/* GLOBAL VARIABLES ****************************************************************************************************/
var seed = SEED_INIT;
var score_l = 0;
var score_r = 0;

/* FUNCTIONS ***********************************************************************************************************/
// Standard Normal variate using Box-Muller transform.
function random_bm(mean=0.5, sigma=0.125) {
    let u = 0, v = 0;
    while(u === 0) u = random(); //Converting [0,1) to (0,1)
    while(v === 0) v = random();
    let num = Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
    num = num / 10.0 + 0.5; // Translate to 0 -> 1
    let diff_mean = mean - 0.5;
    let diff_stddev = sigma / 0.125;
    // bring value down to be around 0 and scale/translate
    num -= 0.5;
    num *= diff_stddev;
    num += diff_mean + 0.5;
    return num;
}

// Random uniform value between 0 and 1
function random(min=0, max=1) {
    let x = Math.sin(seed++) * 10000;
    x = x - Math.floor(x);
    let range = max - min;
    x *= range;
    x += min;
    return x;
}

// round a floating point value with given significant figures
function round_to_sigfigs(val, sigfigs){
    return Number.parseFloat(val.toPrecision(sigfigs));
}

/* *************************************************************************************************************************************************************/
/* BEGIN CLASSES ***********************************************************************************************************************************************/
/* *************************************************************************************************************************************************************/

class Entity {
    constructor(x, y, w, h){
        this.x = x;
        this.y = y;
        this.width = w;
        this.height = h;
        this.velx = 0;
        this.vely = 0;
        this.kinematic = false;
        this.id = '';
    }

    move(){
        if (this.kinematic){
            this.x += this.velx;
            this.y += this.vely;
        }
    }
    
    wall_collision(walls){ }
}

class Ball extends Entity {
    constructor(x, y){
        super(x, y, BALL_SIZE, BALL_SIZE);
        this.color = 'red';
        this.velx = random(-1,1);
        this.vely = random(-1,1);
        this.speed = BALL_SPEED;
        this.kinematic = true;
        this.id = 'ball';
        this.grabbed = false;
        this.scored = 0;

        this.normalize_velocity();
    }
    
    move(){
        super.move();
        
        if (this.x < WIDTH*1/8-16){
            this.kinematic = false;
            this.scored = 1;
        } else if (this.x > WIDTH*7/8+16){
            this.kinematic = false;
            this.scored = -1;
        }
    }

    normalize_velocity(){
        let mag = magnitude(this.velx, this.vely);
        this.velx = this.velx / mag * this.speed;
        this.vely = this.vely / mag * this.speed;
    }

    wall_collision(walls){
        for (let i = 0; i < walls.length; i++){
            let w = walls[i]
            // check vertical
            if (this.x > w.x-w.width/2 && this.x < w.x+w.width/2){
                let dist = w.y - this.y;
                if (Math.abs(dist) <= this.height/2 + w.height/2 && Math.sign(dist) === Math.sign(this.vely)){
                    this.vely = -this.vely;
                }
            } else if (this.y > w.y-w.height/2 && this.y < w.y+w.height/2){
                let dist = w.x - this.x;
                if (Math.abs(dist) <= this.width/2 + w.width/2 && Math.sign(dist) === Math.sign(this.velx)){
                    this.velx = -this.velx;
                }
            }
        }
    }
}

class Wall extends Entity {
    constructor(x, y, w, h, c, a){
        super(x, y, w, h);
        this.color = c;
        this.angle = a;
        this.id = 'wall';
        this.width = w;
        this.height = h;
    }
}

class Player extends Entity {
    constructor(x, y){
        super(x, y, PLAYER_SIZE, PLAYER_SIZE);
        this.color = "#"+((1<<24)*Math.random()|0).toString(16);
        this.vely = 0;
        this.velx = 0;
        this.kinematic = true;
        this.id = 'player';
        this.speed = PLAYER_SPEED;
        this.keys = {65: false, 68: false, 87: false, 83: false, 32: false};
        this.grab_range = this.width*3/2;
        this.grab_ball = null;
        this.grab_angle = 0;
        this.grab_time = 0;
    }

    keydown(code){
        this.keys[code] = true;
    }

    keyup(code){
        this.keys[code] = false;

        if (code == CODE_SPACE){
            if (this.grab_ball != null && this.grab_ball.grabbed){
                let curtime = new Date().getTime();
                let ang = this.grab_angle + (curtime - this.grab_time) * this.grab_ball.speed/1000 * this.grab_dir;
                this.grab_ball.velx = Math.cos(ang) * this.grab_dir;
                this.grab_ball.vely = -Math.sin(ang) * this.grab_dir;
                this.grab_ball.normalize_velocity();
                this.grab_ball.kinematic = true;
                this.grab_ball.grabbed = false;
                this.grab_dir = 1;
                this.grab_ball = null;
            }
        }
    }

    interact(b){
        if (this.keys[CODE_SPACE]){
            if (!b.grabbed){
                this.grab_ball = b;
                let dist = distance_to(this.x, this.y, this.grab_ball.x, this.grab_ball.y);
                if (dist < this.grab_range && dist > this.width/2){
                    this.grab_ball.kinematic = false;
                    this.grab_ball.grabbed = true;
                    this.grab_time = new Date().getTime();
                    let dy = this.y - this.grab_ball.y;
                    let dx = this.x - this.grab_ball.x;
                    this.grab_angle = Math.atan2(-dy,dx) - Math.PI/2;
                    let cross = cross_product(dx, dy, this.grab_ball.velx, this.grab_ball.vely);
                    if (cross > 0){
                        this.grab_dir = 1;
                    } else if (cross < 0){
                        this.grab_dir = -1;
                    }
                }
            } else {
                if (this.grab_ball != null){
                    let curtime = new Date().getTime();
                    this.grab_ball.x = this.x + Math.sin(this.grab_angle + (curtime - this.grab_time) * this.grab_ball.speed/1000 * this.grab_dir) * this.grab_range;
                    this.grab_ball.y = this.y + Math.cos(this.grab_angle + (curtime - this.grab_time) * this.grab_ball.speed/1000 * this.grab_dir) * this.grab_range;
                }
            }
        }
    }

    move(){
        let lr = this.keys[CODE_A] ? -this.speed : this.keys[CODE_D] ? this.speed : 0.0;
        let ud = this.keys[CODE_W] ? -this.speed : this.keys[CODE_S] ? this.speed : 0.0;
        if (Math.abs(lr) > 0 && Math.abs(ud) > 0){
            lr /= Math.sqrt(2);
            ud /= Math.sqrt(2);
        }
        this.velx = lr;
        this.vely = ud;
        super.move();
    }
    
    wall_collision(walls){
        for (let i = 0; i < walls.length; i++){
            let w = walls[i]
            // check vertical
            if (this.x > w.x-w.width/2 && this.x < w.x+w.width/2){
                let dist = w.y - this.y;
                if (Math.abs(dist) <= this.height/2 + w.height/2 && Math.sign(dist) === Math.sign(this.vely)){
                    this.vely = 0;
                }
            } else if (this.y > w.y-w.height/2 && this.y < w.y+w.height/2){
                let dist = w.x - this.x;
                if (Math.abs(dist) <= this.width/2 + w.width/2 && Math.sign(dist) === Math.sign(this.velx)){
                    this.velx = 0;
                }
            }
        }
    }
}

/* *************************************************************************************************************************************************************/
/* END CLASSES *************************************************************************************************************************************************/
/* *************************************************************************************************************************************************************/

var players = {};

var b = new Ball(WIDTH/2, HEIGHT/2);

var ball = {'entity': b};

var walls = [];

walls.push(new Wall(WIDTH*1/2, HEIGHT*1/8, WIDTH*3/4 + 16, 16, 'blue', 0));
walls.push(new Wall(WIDTH*1/2, HEIGHT*7/8, WIDTH*3/4 + 16, 16, 'blue', 0));
walls.push(new Wall(WIDTH*1/8, HEIGHT*1/4, 16, HEIGHT*1/4, 'blue', 0));
walls.push(new Wall(WIDTH*1/8, HEIGHT*3/4, 16, HEIGHT*1/4, 'blue', 0));
walls.push(new Wall(WIDTH*7/8, HEIGHT*1/4, 16, HEIGHT*1/4, 'blue', 0));
walls.push(new Wall(WIDTH*7/8, HEIGHT*3/4, 16, HEIGHT*1/4, 'blue', 0));

const wss = new WebSocket.Server({
  port: 5000
});

function resp_d(s, msg){
    if (s.readyState === 1){
        s.send(JSON.stringify(msg));
    }
}

wss.on('connection', function connection(ws){
    ws.on('message', function incoming(message){
        let obj = JSON.parse(message);

        // DEBUG
        //console.log(obj);

        switch (obj['type']){
            case 'ack':
                break;
            case 'connect':
                let id = Object.keys(players).length;
                console.log(id + ' given');
                players[id] = {'ws': ws, 'entity': new Player(WIDTH/2, HEIGHT/2)};
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
                    if (players[id]['ws'].readyState === 1){
                        resp_d(players[id]['ws'], obj);
                    }
                }
                break;
            case 'key':
                if (obj['down']){
                    players[obj['id']]['entity'].keydown(obj['code']);
                } else {
                    players[obj['id']]['entity'].keyup(obj['code']);
                }
                break;
            default:
                console.log(obj);
                resp_d(ws, {'type': 'error', 'message': 'given type not found'});
                break;
        }
    });
});

// set frame rate to UPDATE_RATE
setInterval(update, UPDATE_RATE);

function update(){
    for (let i = 0; i < Object.keys(players).length; i++){
        ent = players[Object.keys(players)[i]]['entity'];
        ent.interact(ball['entity']);
        ent.move();
        ent.wall_collision(walls);
    }

    ball['entity'].move();
    ball['entity'].wall_collision(walls);

    if (ball['entity'].scored){
        score_l += ball['entity'].scored > 0 ? 1 : 0;
        score_r += ball['entity'].scored < 0 ? 1 : 0;
        reset_game();
    }

    send_state();
}

function reset_game(){
    ball['entity'] = new Ball(WIDTH/2, HEIGHT/2);
}

function send_state(){
    let ps = {};
    for (let i = 0; i < Object.keys(players).length; i++){
        ps[i] = players[Object.keys(players)[i]]['entity'];
    }

    for (let i = 0; i < Object.keys(players).length; i++){
        resp_d(players[Object.keys(players)[i]]['ws'], {'type': 'tick', 'players': ps, 'ball': ball['entity']});
    }
}

/*
Find the vector distance between 2 points
    @arg x1: int; point x1
    @arg y1: int; point y1
    @arg x2: int; point x2
    @arg y2: int; point y2
    @return: float; distance between the two points
*/
function distance_to(x1, y1, x2, y2){
    return Math.sqrt((x2-x1)**2 + (y2-y1)**2);
}

function magnitude(x, y){
    return Math.sqrt(x**2 + y**2)
}

function cross_product(x1, y1, x2, y2){
    return x1*y2 - y1*x2;
}
