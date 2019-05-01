// Express code
var express = require('express');
var app = express();
var serv = require('http').Server(app); 

// If query is '/' (nothing)
app.get('/',function(req,res){
    res.sendFile(__dirname + '/client/index.html');
});

// If query is '/client'. Client can only request things from client folder
app.use('/client',express.static(__dirname + '/client')); 

// Server starts listening on port 2000
serv.listen(2000);
console.log("Server started");

// Socket list keeps track of all clients connected to the server. 
var SOCKET_LIST = {};

// Player list keeps track of all players.
// *** var PLAYER_LIST = {}; 

var POINTS_LIST = {};


// Constructor for keeping track of points in current game session
var Points = function(){
    var self = {
        player1:0,
        player2:0,
    }
    self.updateScore = function(player){
        if(player === 1){
            self.player1 ++;
        }
        else if(player === 2){
            self.player2 ++;
        }
    }
}

var Entity = function(){
    var self = {
        x:250,
        y:250,
        spdX:0,
        spdY:0,
        id:""
    }
    self.update = function(){
        self.updatePosition();
    }
    self.updatePosition = function(){
        self.x += self.spdX;
        self.y += self.spdY;
    }
    return self;
}


// Create a player, passes id as parameter
var Player = function(id) {
    var self = Entity();
    self.id = id; 
    self.number = "" + Math.floor(10*Math.random());
    self.pressingRigh = false;
    self.pressingLeft = false;
    self.pressingUp = false;
    self.pressingDown = false;
    self.maxSpd = 10;
    
    var super_update = self.update;
    self.update = function(){
        self.updateSpd();
        super_update();
    }

    self.updateSpd = function(){
        if(self.pressingRight){
            self.spdX = self.maxSpd;
        }
        else if(self.pressingLeft){
            self.spdX = -self.maxSpd;
        }
        else{
            self.spdX=0;
        }

        if(self.pressingDown){
            self.spdY = self.maxSpd;
        }
        else if(self.pressingUp){
            self.spdY = -self.maxSpd;
        }
        else{
            self.spdY=0;
        }
    }
    Player.list[id] = self;
    return self; 
   
}
Player.list = {};

Player.onConnect = function(socket){
    console.log("hello");
    var player = Player(socket.id);
    // Listens to client key presses, updates states of client accordingly
    socket.on('keyPress',function(data){
        if(data.inputId ==='left'){
            player.pressingLeft = data.state; 
        }else if(data.inputId ==='right'){
            player.pressingRight = data.state; 
        }else if(data.inputId ==='up'){
            player.pressingUp = data.state; 
        }else if(data.inputId ==='down'){
            player.pressingDown = data.state; 
        }
    });
}

Player.onDisconnect = function(socket){
    delete Player.list[socket.id];
}

Player.update = function(){
    var pack = [];
    for(var i in Player.list){
        var player = Player.list[i];
        player.update();
        pack.push({
            x:player.x,
            y:player.y,
            number:player.number
        });
    }
    return pack;
}

var Car = function(){
    var self = Entity();
    self.id = Math.random();
    self.spdX = 0;
    self.spdY = 30;
}


// Initializes an io Socket object 
var io = require('socket.io')(serv,{}); 

// Whenever a connection is established, the following function will be called.
io.sockets.on('connection',function(socket){
    // server assigns a unique id to the socket
    socket.id=Math.random();
    // Add it to the list of sockets currently online
    SOCKET_LIST[socket.id] = socket;
   
    Player.onConnect(socket);
    
    // Server listens to disconnects, and removes disconnected clients.
    socket.on('disconnect',function(){
        delete SOCKET_LIST[socket.id]; 
        Player.onDisconnect(socket);
    });
});

// Loops through every player in our player list, and will update the X and Y position.
setInterval(function(){

    // pack contains information about every single player in the game, and will be sent to every player conncted
    var pack = {
        player:Player.update(),
    }

    // Server emits the pack to each  connected client
    for(var i in SOCKET_LIST){
        var socket = SOCKET_LIST[i];
        socket.emit('newPositions',pack);
    }

// The game will run at 25 frames per second.   
},1000/25);