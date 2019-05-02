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

var AVAILABLE_PLAYERS = [1,2];

// Player list keeps track of all players.
// *** var PLAYER_LIST = {}; 



// Constructor for keeping track of points in current game session
// var Points = function(){
//     var self = {
//         player1:0,
//         player2:0,
//     }
//     self.updateScore = function(player){
//         if(player === 1){
//             self.player1 ++;
//         }
//         else if(player === 2){
//             self.player2 ++;
//         }
//     }
// }

var Entity = function(){
    var self = {
        x:0,
        y:0,
        spdX:0,
        spdY:0,
        id:"",
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
    self.number = "" + AVAILABLE_PLAYERS.shift();
    self.pressingRight = false;
    self.pressingLeft = false;
    self.pressingUp = false;
    self.pressingDown = false;
    self.maxSpd = 10;
    self.score = 0;

    if(self.number === "1"){
        self.x = 42;
        self.y = 150;
    } else if(self.number === "2"){
        self.x = 42;
        self.y = 220;
    }
    
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
    
    self.getInitPack = function(){
        return{
            id:self.id,
            x:self.x,
            y:self.y,
            number:self.number,
            score:self.score,
        }
    }

    // sent every single frame
    self.getUpdatePack = function(){
        return{
            id:self.id,
            x:self.x,
            y:self.y,    
            score:self.score,
        }
    }

    Player.list[id] = self;

    initPack.player.push(self.getInitPack());
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

    socket.emit("init",{
        // Server tells client "hey, you have this socket id"
        selfId:socket.id,
        player:Player.getAllInitPack(),
    })
}

Player.getAllInitPack = function(){
    var players = [];
    for(var i in Player.list){
        players.push(Player.list[i].getInitPack());
    }
    return players;
}

Player.onDisconnect = function(socket){
    delete Player.list[socket.id];
    removePack.player.push(socket.id);
}

Player.update = function(){
    var pack = [];
    for(var i in Player.list){
        var player = Player.list[i];
        player.update();
        pack.push(player.getUpdatePack());
    }
    return pack;
}

var Car = function(){
    var self = Entity();
    self.id = Math.random();
    self.spdX = 0;
    self.spdY = 30;
    self.drivingDown = false;
    self.drivingUp = false;
    //self.victim = victim;
    self.toRemove = false;
    var super_update = self.update;

 //   self.update = function() {
 //       for (var i in Player.list){
 //           var p = Player.list[i];
 //       } vid 11
                
 //   }

}


// Initializes an io Socket object 

var io = require('socket.io')(serv,{}); 
var maxConnections=2;
var currentConnections=0;

io.sockets.on('connection',function(socket){
    // server assigns a unique id to the socket
    if(currentConnections === maxConnections){
        socket.disconnect();
    }

    socket.id=Math.random();
    // Add it to the list of sockets currently online
    SOCKET_LIST[socket.id] = socket;
    Player.onConnect(socket);
    currentConnections++;
    
    // Server listens to disconnects, and removes disconnected clients.
    socket.on('disconnect',function(){
        delete SOCKET_LIST[socket.id]; 
        Player.onDisconnect(socket);
        currentConnections--;
    });
});

var initPack = {player:[]};
var removePack = {player:[]};


// Loops through every player in our player list, and will update the X and Y position.
setInterval(function(){
    // pack contains information about every single player in the game, and will be sent to every player conncted
    var pack = {
        player:Player.update(),
    }
    // Server emits the pack to each  connected client
    for(var i in SOCKET_LIST){
        var socket = SOCKET_LIST[i];
        socket.emit("init", initPack);
        socket.emit("update",pack);
        socket.emit("remove", removePack);
    }
    initPack.player = [];
    removePack.player = [];

},1000/25);