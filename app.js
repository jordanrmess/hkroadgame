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
var PLAYER_LIST = {}; 

// Create a player, passes id as parameter
var Player = function(id) {
    var self = {
        x:250,
        y:250,
        id:id,
        number:"" + Math.floor(10*Math.random()),
        pressingRight:false,
        pressingLeft:false,
        pressingUp:false,
        pressingDown: false,
        maxSpd: 10,
    }

    // Will be called every frame
    self.updatePosition = function() {
        if(self.pressingRight)
            self.x+=self.maxSpd;
        if(self.pressingLeft)
            self.x-=self.maxSpd;
        if(self.pressingUp)
            self.y-= self.maxSpd;
        if(self.pressingDown)
            self.y += self.maxSpd;
    }
    return self; 
   
}

// Initializes an io Socket object 
var io = require('socket.io')(serv,{}); 

// Whenever a connection is established, the following function will be called.
io.sockets.on('connection',function(socket){
    // server assigns a unique id to the socket
    socket.id=Math.random();

    // sets the initial x and y coordinates to 0
    socket.x=0;
    socket.y=0; 

    // Every socket will have a random number between 0 and 1, will distinguish the different players. 
    socket.number = "" + Math.floor(10*Math.random());
    
    // Add it to the list of sockets currently online
    SOCKET_LIST[socket.id] = socket;

    // Also create a player with the socket id, and add to player list
    var player = Player(socket.id);
    PLAYER_LIST[socket.id] = player; 
    
    // Server listens to disconnects, and removes disconnected clients.
    socket.on('disconnect',function(){
        delete SOCKET_LIST[socket.id]; 
        delete PLAYER_LIST[socket.id];
    });

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

});

// Loops through every player in our player list, and will update the X and Y position.
setInterval(function(){

    // pack contains information about every single player in the game, and will be sent to every player conncted
    var pack = [];
    for(var i in PLAYER_LIST){
        var player = PLAYER_LIST[i];
        player.updatePosition();
        pack.push({
            x:player.x,
            y:player.y,
            number:player.number // player number added to package
        });
       
    }
    // Server emits the pack to each  connected client
    for(var i in SOCKET_LIST){
        var socket = SOCKET_LIST[i];
        socket.emit('newPositions',pack);
    }

// The game will run at 25 frames per second.   
},1000/25);