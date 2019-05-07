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

// Entity object is the object type for all entities in the game (cars and players)
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

    // updates the coordinates (position) of the entity
    self.updatePosition = function(){
        self.x += self.spdX;
        self.y += self.spdY;
    }

    // measures the distance between itself and another object (Entity)
    self.getDistance = function(pt){
        return Math.sqrt(Math.pow(self.x-pt.x,2) + Math.pow(self.y-pt.y,2));
    }

    return self;
}

// Player object is the object type for every active bunny (player), 
// socket id of the client is passed as an argument.
var Player = function(id) {

    var self = Entity();   // inherits the Entity object's attributes and methods
    self.id = id; 
    self.number = "" + AVAILABLE_PLAYERS.shift(); // assigns the player a number (1 or 2)
    self.pressingRight = false;
    self.pressingLeft = false;
    self.pressingUp = false;
    self.pressingDown = false;
    self.maxSpd = 10;
    self.canMove = false; // at the start of the game, no player shall be able to move
    
    // used for drawing blood spatters, and successful bunnies on right hand side
    self.xDeathPos = 0;   
    self.yDeathPos = 0;   
    self.successCoords = [];
    self.alive = true;

    // used for bunny animation
    self.walkingCounter = 0; 
    self.playerDirection = PLAYER_DIRECTIONS["right"];
    self.walkingMod = self.walkingCounter%3;

    // keeps track of no. of saved bunnies 
    self.count = 0;     

    // check which player, and give different spawning points
    self.setStartingPosition = function(){
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

        // scenario when bunny made it to the other side
        if(self.x >= 680){
            self.count++; 
            self.successCoords.push([self.x,self.y]); 

            //respawn
            self.setStartingPosition();
        }
    }

    // updates the coordinates of the player and checks that player can't escape canvas
    self.updateSpd = function(){
        if(self.pressingRight && self.x<680){
            self.spdX = self.maxSpd;

            // player animation
            self.playerDirection = PLAYER_DIRECTIONS["right"];
            self.walkingCounter += 0.001;
            self.walkingMod = Math.floor(self.walkingCounter%3);

        }
        else if(self.pressingLeft && self.x>22){
            self.spdX = -self.maxSpd;

            // player animation
            self.playerDirection = PLAYER_DIRECTIONS["left"];
            self.walkingCounter += 0.001;
            self.walkingMod = Math.floor(self.walkingCounter%3);

        }
        else{
            self.spdX=0;
        }

        if(self.pressingDown && self.y < 390){
            self.spdY = self.maxSpd;

            // player animation
            self.playerDirection = PLAYER_DIRECTIONS["down"];
            self.walkingCounter += 0.001;
            self.walkingMod = Math.floor(self.walkingCounter%3);

        }
        else if(self.pressingUp && self.y > 25){
            self.spdY = -self.maxSpd;

            // player animation
            self.playerDirection = PLAYER_DIRECTIONS["up"];
            self.walkingCounter += 0.001;
            self.walkingMod = Math.floor(self.walkingCounter%3);

        }
        else{
            self.spdY=0;
        }
    }
    
    // get initialization pack containing initialization data about player, 
    // this is later sent to client
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
            walkingCounter: self.walkingCounter,
        }
    }

    // get update pack containing information about the player that we will need to update
    // throughout the game
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

    // add player to the dictionary Player.list containing all Player objects active in the game
    // we will have 2 entries in this dictionary at most in each game session
    Player.list[id] = self;

    // push the player's initialization pack to the general initPack dictionary
    initPack.player.push(self.getInitPack());
    return self;   
}

// Create Player dictionary that stores all player objects
Player.list = {};


Player.onConnect = function(socket){    
    var player = Player(socket.id);

    // Listens to client key presses, updates states of client accordingly
    socket.on('keyPress',function(data){
        if(player.canMove){
            if(data.inputId ==='left'){
                player.pressingLeft = data.state; 
            }else if(data.inputId ==='right'){
                player.pressingRight = data.state; 
            }else if(data.inputId ==='up'){
                player.pressingUp = data.state; 
            }else if(data.inputId ==='down'){
                player.pressingDown = data.state; 
            }
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

}
Car.update = function(){
     var pack = [];
     for(var i in Car.list){
         var car = Car.list[i]; 
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
    return cars;
}

//Game object stores important information about the current game
var Game = function(){

    //Time starts at 30 seconds
    var self = {
        timeRemaining:30,
    }
   
    self.startTimer = function() {
        if(self.timeRemaining > 0){
            self.timeRemaining-=1; 
            setTimeout(self.startTimer,1000)
        }else{
            //Time has run out, alert the clients
            io.emit("GAME_OVER",Player.update()); 
            self.resetTimer;
        }
    }

    self.getInitPack = function(){
        return {
            timeRemaining: self.timeRemaining,
        }
    }

    self.getUpdatePack = function() {
        return{
            timeRemaining: self.timeRemaining
        }
    }

    self.resetTimer = function(){
        self.timeRemaining = 30;
    }

    initPack.game = (self.getInitPack()); 
    return self; 
}

var io = require('socket.io')(serv,{}); 
var currentGame;

var maxConnections=2;
var currentConnections=0;
var SOCKET_OBJECTS = [];
var SOCKET_IDS = [];

// called on new client connection
io.sockets.on('connection',function(socket){
    
    // disconnects newly connected client if connections > 2.
    if(currentConnections === maxConnections){
        socket.disconnect();

    }else{
        SOCKET_OBJECTS.push(socket);
        socket.id=Math.random();

        // Adds  to the list of sockets currently online
        SOCKET_LIST[socket.id] = socket;
        SOCKET_IDS.push(socket.id);
        Player.onConnect(socket);
        currentConnections = SOCKET_IDS.length;

        // reset and start timer and allow players to move once two players have connected
        if(currentConnections===2){ 
            currentGame.resetTimer();

            // allow players to move
            for(i in Player.list){
                var p = Player.list[i];
                p.canMove = true
            }

            currentGame.startTimer(io); 
        }
    }
    
    // when one player disconnects, all players in the game are disconnected
    socket.on('disconnect',function(){
        currentGame.active = false; 
        currentGame.resetTimer();

        for(i in SOCKET_OBJECTS){
            io.emit("GAME_OVER", null);
            SOCKET_OBJECTS[i].disconnect();
        }

        // remove disconnected player info
        delete SOCKET_LIST[socket.id];
        SOCKET_IDS.splice(SOCKET_IDS.indexOf(socket.id), 1); 
        Player.onDisconnect(socket);

        //update no. of currentConnections
        currentConnections = SOCKET_IDS.length;

    // reset important game variables when all players have disconnected
    if (currentConnections === 0){
        // reset available player numbers that can be assigned
        AVAILABLE_PLAYERS = [1,2];
        restart = true;
    }
    });
});

// dictionaries used for passing data to all clients
var initPack = {player:[],car:[],game:[]};
var removePack = {player:[]};

// set up important flags
var initializeServer = true;
var restart = false;

// called 25 frames per second
setInterval(function(){
    // create cars and the game object
    if(initializeServer){
        Car.onConnect(); 
        currentGame = Game();
        initializeServer = false;
    }
    // if there is a restart (new game session) a new game object is created
    if(restart){
        currentGame = Game();
        restart=false;
    }
    
    // construct pack that will contain updated data about players, cars and game
    var pack = {
        player:Player.update(),
        car:Car.update(),
        game:currentGame.getUpdatePack()
    }

    // server emits the pack to each connected client
    for(var i in SOCKET_LIST){
        var socket = SOCKET_LIST[i];
        socket.emit("init", initPack);
        socket.emit("update",pack);
        socket.emit("remove", removePack);
    }

    // reset initPack and removePack
    initPack.player = [];
    initPack.car = []; 
    initPack.game=[];
    removePack.player = [];

},1000/25);