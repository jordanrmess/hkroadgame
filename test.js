
var express = require('express');

var mongoose = require('mongoose');

var app = express();


// var uri = "mongodb://jordanrmess:Class2020!@ds051943.mlab.com:51943/bunnycrossing";
// mongoose.connect(uri, {
//     useNewUrlParser: true
// });
// mongoose.connection.on('error', function (err) {
//     console.log(err);
//     throw err;
//     process.exit(1);
// });




const MongoClient = require('mongodb').MongoClient;
const uri = "mongodb+srv://jordanrmess:Class2020%21@bunnycrossing-pef6d.mongodb.net/test?retryWrites=true";
const client = new MongoClient(uri, { useNewUrlParser: true });
client.connect(err => {
    console.log(err);
//   const collection = client.db("test").collection("devices");
  // perform actions on the collection object
  client.close();
});

app.listen( 3000, function () {
    console.log('listening on port 3000!');
});
