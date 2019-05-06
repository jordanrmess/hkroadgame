// Express code
var express = require('express');
var app = express();
var serv = require('http').Server(app); 
// var MongoClient = require('mongodb').MongoClient;
var bodyParser = require('body-parser');
// var mongoose = require('mongoose');
var mongojs = require("mongojs");
var db= mongojs('localhost:27017/users',['users']);



//Connect to database 

// var uri = "mongodb://jordanrmess:Class2020!@ds051943.mlab.com:51943/bunnycrossing";
// mongoose.connect(uri,{
//     useNewUrlParser: true
// });

// let db = mongoose.connection;

// db.on('error', console.error.bind(console, 'connection error:'));

// db.once('open', function callback() {
//     console.log("db connected");
// });


//Setup Express App

// app.use(bodyParser.json());
// app.use(bodyParser.urlencoded({
//     extended: false
// }));


// If query is '/' (nothing)
app.get('/',function(req,res){
    res.sendFile(__dirname + '/client/index.html');
});

// If query is '/client'. Client can only request things from client folder
app.use('/client',express.static(__dirname + '/client')); 


app.post('/api/user', function (req, res) {
    var user = new User({
        username: req.body.username,
        password: req.body.password,
        max_score: 0
    });

    user.save(function (err) {
        if (err) throw err;
        return res.send('Succesfully added user.');
    });
});

// Server starts listening on port 2000
serv.listen((process.env.PORT || 2000), () => {console.log("Server started");});

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
    self.maxSpd = 10;
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
        game: currentGame.getInitPack()
    })
    
    Game.numConnections++;
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
 

//Callback functions mock database promises
var isValidPassword = function(data,cb){
    db.users.find({username:data.username,password:data.password},function(err,res){
        if(res.length > 0)
            cb(true);
        else 
            cb(false);
    });
}

var userExists = function(data,cb){

    db.users.find({username:data.username},function(err,res){
        if(res.length >0){
            cb(true);
        }else{
            cb(false);
        }
    });
}

var addUser = function(data,cb){
    db.users.insert({username:data.username,password:data.password,score:0},function(err,res){
        cb();
    });

}

var getTopPlayers = function(cb){
    var all_scores = [];
    var top_scores = []; 
    db.user_info.find(function(err,res){

        console.log(res);
        res.forEach(function (user) {
            all_scores.push({username:user.username,score:user.score});
        });
        top_scores = all_scores.sort((a,b) => a.score<b.score).slice(0,3);
        cb(top_scores);

     });
}
    

var io = require('socket.io')(serv,{}); 
var currentGame;

//Game object stores important information about the current game
var Game = function(){

    //Time starts at 30 seconds
    var self = {
        timeRemaining:5, 
        numConnections:0
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
            numConnections: self.numConnections
        }
    }

    self.getUpdatePack = function() {
        return{
            timeRemaining: self.timeRemaining,
            numConnections: self.numConnections
        }
    }

    initPack.game = (self.getInitPack()); 
    return self; 
}

//Creating game object
Game.init = function(){
    currentGame = Game();
}

//Game cannot have more than 2 players

var maxConnections=2;
var players_ready=0; 

//.maxConnections = 2;

io.sockets.on('connection',function(socket){
   console.log("established a");
   if(currentGame.numConnections === maxConnections){
        console.log("max connections");
        socket.disconnect(true);
        console.log("disconnect socket. number of connections are %s", currentgame.numConnections);
        
    }
    currentGame.numConnections ++;

    // server assigns a unique id to the socket
    socket.id=Math.random();
    // Add it to the list of sockets currently online
    SOCKET_LIST[socket.id] = socket;
    socket.on("SIGN_IN_REQUEST", function(data){
        isValidPassword(data,function(res){
            if(res){
                Player.onConnect(socket);
                socket.emit("SIGN_IN_RESPONSE",{success:true});
            }else{
                socket.emit("SIGN_IN_RESPONSE",{success:false});
            }
        })
    });

    //Adding a new user to mock database 
    socket.on("SIGN_UP_REQUEST",function(data){
        userExists(data,function(res){
            if(res){
                socket.emit("SIGN_UP_RESPONSE",{success:false});
            }else{
                addUser(data,function(res){
                    socket.emit("SIGN_UP_RESPONSE",{success:true});
                })
            }
        });
    });

    //If the game has 2 players, start game
    socket.on("START_GAME",function(){ 
        players_ready +=1; 
       // console.log(players_ready);
        if(players_ready ==2){
            io.emit("GAME_STARTED");
            currentGame.startTimer(io); 
        }else{
            socket.emit("START_RESPONSE", {ready:false}); 
        }
    }); 

    socket.on("NEW_SCORE_REQUEST",function(data){
        // console.log("username: " + data.username + " incoming score: " + data.score);
        var current_socket_score=0;
        // var current_socket_score = JSON.parse(JSON.stringify(db.user_info.find({username:data.username},{score:1})));
        var query = db.users.find({username:data.username});
        query.toArray(function (err, docs) {
            if(err){console.log("error accessing record" + err);}
            docs.forEach(function (doc) {
                current_socket_score = doc.score;
            });
              //if client has a new score
            if(data.score>current_socket_score){
                db.users.update({username:data.username},{username: data.username,password:data.password,score:data.score});
                console.log("new high score for: " + data.username+ " of "  + data.score);
            }
            });

    });

    socket.on("CLIENT_LEADERBOARD_REQUEST",function(){
        getTopPlayers(function(res){
            socket.emit("SERVER_LEADERBOARD_RESPONSE",res);
        });
    })

    // Server listens to disconnects, and removes disconnected clients.
    socket.on('disconnect',function(){
        delete SOCKET_LIST[socket.id]; 
        console.log("socket",socket.id);   
        Player.onDisconnect(socket);
        currentGame.numConnections--;
    });
});








var initPack = {player:[],car:[],game:[]};
var removePack = {player:[],game:[]};

var initializeServer = true;

// Loops through every player in our player list, and will update the X and Y position.
setInterval(function(){
    // pack contains information about every single player in the game, and will be sent to every player conncted
    if(initializeServer){
        //Init Game object 
        Game.init();
        Car.onConnect(); 
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
    initPack.game = []; 
    removePack.player = [];


},1000/25);