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
serv.listen(process.env.PORT || 2000);
console.log("Server started");

// Socket list keeps track of all clients connected to the server. 
var SOCKET_LIST = {};
var PLAYER_DIRECTIONS = {"up":3,"down":0,"right":2,"left":1};
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
    self.getDistance = function(pt){
        return Math.sqrt(Math.pow(self.x-pt.x,2) + Math.pow(self.y-pt.y,2));
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
    self.xDeathPos = 0;
    self.yDeathPos = 0;
    self.successCoords = []; 
    self.walkingCounter = 0;
    self.playerDirection = PLAYER_DIRECTIONS["right"];
    self.walkingMod = self.walkingCounter%3;
    self.alive = true;
    self.maxSpd = 5;
    self.count = 0;

    // Check which player, and give different spawning points

    self.setStartingPosition = function(){
       // self.alive = true;
        if(self.number === "1"){
            self.x = 42;
            self.y = 150;
        } else if(self.number === "2"){
            self.x = 42;
            self.y = 220;
        }   
    }

    var super_update = self.update;
    
    self.update = function(){
        self.walkingCounter ++;
        self.updateSpd();
        super_update();

        if(self.x >= 680){
            self.count++; // BUNNY MADE IT TO OTHER SIDE
            self.successCoords.push([self.x,self.y]); 
            self.setStartingPosition();
        }
    }

    self.updateSpd = function(){
        if(self.pressingRight && self.x<680){
            self.spdX = self.maxSpd;
            self.playerDirection = PLAYER_DIRECTIONS["right"];
            self.walkingCounter += 0.001;
            self.walkingMod = Math.floor(self.walkingCounter%3);

        }
        else if(self.pressingLeft && self.x>22){
            self.spdX = -self.maxSpd;
            self.playerDirection = PLAYER_DIRECTIONS["left"];
            self.walkingCounter += 0.001;
            self.walkingMod = Math.floor(self.walkingCounter%3);

        }
        else{
            self.spdX=0;
            if(self.playerDirection === PLAYER_DIRECTIONS["right"]){

            }
        }

        if(self.pressingDown && self.y < 390){
            self.spdY = self.maxSpd;
            self.playerDirection = PLAYER_DIRECTIONS["down"];
            self.walkingCounter += 0.001;
            self.walkingMod = Math.floor(self.walkingCounter%3);

        }
        else if(self.pressingUp && self.y > 25){
            self.spdY = -self.maxSpd;
            self.playerDirection = PLAYER_DIRECTIONS["up"];
            self.walkingCounter += 0.001;
            self.walkingMod = Math.floor(self.walkingCounter%3);

        }
        else{
            self.spdY=0;
        }
        //self.walkingMod ++;
    }
    
    self.getInitPack = function(){
        return{
            id:self.id,
            x:self.x,
            y:self.y,
            alive:self.alive,
            number:self.number,
            count:self.count,
            successCoords: self.successCoords,
            walkingMod:self.walkingMod,
            playerDirection: self.playerDirection,
            walkingCounter: self.walkingCounter

        }
    }

    // sent every single frame
    self.getUpdatePack = function(){
        return{
            id:self.id,
            x:self.x,
            y:self.y,
            xDeathPos:self.xDeathPos,
            yDeathPos:self.yDeathPos,
            alive:self.alive,    
            count:self.count,
            successCoords: self.successCoords,
            walkingMod:self.walkingMod,
            playerDirection:self.playerDirection
        }
    }

    self.setStartingPosition();
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
        car: Car.getAllInitPack(),
        game:currentGame.getInitPack()
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
        player.alive=true;
    }
    return pack;
}
var Car = function(x,y, spdY, drivingDown){
    var self = Entity();
    self.x =x; 
    self.y=y;
    self.id = Math.random();
    self.spdX = 0;
    self.spdY = spdY;
    self.drivingDown = drivingDown;
    self.toRemove = false;
    var super_update = self.update;

    self.update = function(){
        if(self.drivingDown){
            if(self.y > 464){
                self.y=-450;
            }else{
                self.y += self.spdY;
            }
        } else{
            if(self.y<-40){     
                self.y=490
            }else{
                self.y -= self.spdY;
            }
        }
        for(var i in Player.list){
            p = Player.list[i];
            if(self.getDistance(p) < 45){
                p.alive = false;
                p.xDeathPos = p.x;
                p.yDeathPos = p.y;
                p.setStartingPosition();
            }
        }
        //super_update();
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
    drivingDown = true;
    var car1 = Car(123.5, 0, 5, drivingDown);
    var car2 = Car(195.5, 0, 8, drivingDown);
    var car3 = Car(265.5, -100,5, drivingDown);

    drivingDown = false;
    var car4 = Car(455.5, 0, 5, drivingDown);
    var car5 = Car(525.5, 0, 7, drivingDown);
    var car6 = Car(600.5, 0, 5, drivingDown);

    //var car3 = Car();
   // console.log("Car list: " + Car.list[car.id]);
}
Car.update = function(){
     var pack = [];
     for(var i in Car.list){
         var car = Car.list[i]; 
      //   console.log("car.y BEFORE update ",car.y);
         car.update(); 
      //   console.log("car.y AFTER update ",car.y);


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
 //   console.log(cars);
    return cars;
}

//Game object stores important information about the current game
var Game = function(){

    //Time starts at 30 seconds
    var self = {
        timeRemaining:10
        // numConnections:0
    }
   

    self.startTimer = function() {
        if(self.timeRemaining > 0){
            self.timeRemaining-=1; 
            setTimeout(self.startTimer,1000)
        }else{
            //Time has run out, alert the clients
            io.emit("GAME_OVER",Player.update()); 
        }
        
    }

    self.getInitPack = function(){
        return {
            timeRemaining: self.timeRemaining,
            // numConnections: self.numConnections
        }
    }

    self.getUpdatePack = function() {
        return{
            timeRemaining: self.timeRemaining
            // numConnections: self.numConnections
        }
    }

    initPack.game = (self.getInitPack()); 
    return self; 
}

//Creating game object
Game.init = function(){
    currentGame = Game();
}


// Initializes an io Socket object 

var io = require('socket.io')(serv,{}); 
var currentGame;

var maxConnections=2;
var currentConnections=0;
// var car = Car();
io.sockets.on('connection',function(socket){
    // server assigns a unique id to the socket
    if(currentConnections === maxConnections){
        socket.emit("denyPermission");
        socket.disconnect();

    }

   
    socket.id=Math.random();
    // Add it to the list of sockets currently online
    SOCKET_LIST[socket.id] = socket;
    Player.onConnect(socket);
    currentConnections++;

    if(currentConnections===2){ 
        io.emit("GAME_STARTED");
        //Start timer method
        currentGame.startTimer(io); 
    }
    
    // Server listens to disconnects, and removes disconnected clients.
    socket.on('disconnect',function(){
        delete SOCKET_LIST[socket.id]; 
        Player.onDisconnect(socket);
        currentConnections--;
    });
});

var initPack = {player:[],car:[],game:[]};
var removePack = {player:[]};

var initializeServer = true;

// Loops through every player in our player list, and will update the X and Y position.
setInterval(function(){
    // pack contains information about every single player in the game, and will be sent to every player conncted
    if(initializeServer){
        Car.onConnect(); 
        Game.init();
        initializeServer = false;
    }
    var pack = {
        player:Player.update(),
        car:Car.update(),
        game:currentGame.getUpdatePack()
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
    initPack.game=[];
    removePack.player = [];


},1000/25);