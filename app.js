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

    // Check which player, and give different spawning points
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
        car: Car.getAllInitPack()
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
var Car = function(x,y){
    var self = Entity();
    self.x =x; 
    self.y=y;
    self.id = Math.random();
    self.spdX = 0;
    //self.spdY = 10;
    // self.drivingDown = false;
    // self.drivingUp = false;
    //self.victim = victim;
    self.toRemove = false;
    var super_update = self.update;

    self.update = function(){
       // console.log("line 179");
        super_update();
    }
    self.getInitPack = function(){
        return{
            id:self.id,
            x:self.x,
            y:self.y
        }
    }

    self.getUpdatePack = function(){
        return{
            id:self.id,
            x:self.x,
            y:self.y
        }
    }

    Car.list[self.id] = self;    
    initPack.car.push(self.getInitPack());

    return self; 

}
Car.list = {}; 

Car.onConnect = function(){
    var car = Car(95,100);
   // console.log("Car list: " + Car.list[car.id]);
}
Car.update = function(){
     var pack = [];
     for(var i in Car.list){
         var car = Car.list[i]; 
         //console.log(car);
         car.update(); 

         pack.push({
             id:car.id,
             x:car.x,
             y:car.y
         });
     }
     return pack
}

Car.getAllInitPack = function(){

    var cars = [];
    for(var i in Car.list){
        cars.push(Car.list[i].getInitPack());
    }
    console.log(cars);
    return cars;
}

// Initializes an io Socket object 

var io = require('socket.io')(serv,{}); 
var maxConnections=2;
var currentConnections=0;
// var car = Car();
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

var initPack = {player:[],car:[]};
var removePack = {player:[]};

var initializeServer = true;

// Loops through every player in our player list, and will update the X and Y position.
setInterval(function(){
    // pack contains information about every single player in the game, and will be sent to every player conncted
    if(initializeServer){
        Car.onConnect(); 
        initializeServer = false;
    }
    var pack = {
        player:Player.update(),
        car:Car.update()
    }
    // Server emits the pack to each  connected client
    for(var i in SOCKET_LIST){
        var socket = SOCKET_LIST[i];
        socket.emit("init", initPack);
        socket.emit("update",pack);
        socket.emit("remove", removePack);
    }
    initPack.player = [];
    initPack.car = []; 
    removePack.player = [];


},1000/25);