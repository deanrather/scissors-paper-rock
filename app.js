var app = require('http').createServer(handler)
  , io = require('socket.io').listen(app)
  , fs = require('fs')

app.listen(12345);

function handler (req, res) {
  fs.readFile(__dirname + '/index.html',
  function (err, data) {
    if (err) {
      res.writeHead(500);
      return res.end('Error loading index.html');
    }

    res.writeHead(200);
    res.end(data);
  });
}

var games = [];
var waiting = null;

io.sockets.on('connection', function (socket) {

  socket.on('name', function (name) {
    socket.name = name;
    socket.choice = null;
    socket.score = 0;
    if(waiting)
    {
      waiting.opponent = socket;
      waiting.emit('opponent', socket.name);
      socket.opponent = waiting;
      socket.emit('opponent', socket.opponent.name);
      waiting = null;
    }
    else
    {
      socket.opponent = null;
      waiting = socket;
    }
  });

  socket.on('choice', function (choice) {
    socket.choice = choice;
    console.log(socket.name + ' chose ' + choice);
    if(choice == 'Quit')
    {
        socket.disconnect();
        return;
    }

    if(socket.opponent)
    {
      console.log("and he has an opponent " + socket.opponent.name);
      if(socket.opponent.choice)
      {
        console.log("and the opponent chose " + socket.opponent.choice);
        var myChoice = choice;
        var theirChoice = socket.opponent.choice;
        socket.choice = null;
        socket.opponent.choice = null;
        var outcome = null;
        var points = null;
        if(myChoice == 'scissors' && theirChoice == 'scissors') { outcome = 'tie';  points = 0; }
        if(myChoice == 'scissors' && theirChoice == 'paper')    { outcome = 'win';  points = 3; }
        if(myChoice == 'scissors' && theirChoice == 'rock')     { outcome = 'lose'; points = 10; }
        if(myChoice == 'paper'    && theirChoice == 'scissors') { outcome = 'lose'; points = 3; }
        if(myChoice == 'paper'    && theirChoice == 'paper')    { outcome = 'tie';  points = 0; }
        if(myChoice == 'paper'    && theirChoice == 'rock')     { outcome = 'win';  points = 1; }
        if(myChoice == 'rock'     && theirChoice == 'scissors') { outcome = 'win';  points = 10; }
        if(myChoice == 'rock'     && theirChoice == 'paper')    { outcome = 'lose'; points = 1; }
        if(myChoice == 'rock'     && theirChoice == 'rock')     { outcome = 'tie';  points = 0; }
        console.log("OUTCOME: " + outcome);
        if(outcome == 'win')
        {
          socket.score += points;
          socket.emit("status", myChoice + " VS " + theirChoice + " WINNER!");
          socket.opponent.emit("status", theirChoice + " VS " + myChoice + " LOSER!");
        }
        else if(outcome == 'lose')
        {
          socket.opponent.score += points;
          socket.emit("status", myChoice + " VS " + theirChoice + " LOSER!");
          socket.opponent.emit("status",  theirChoice + " VS " + myChoice + " WINNER!");
        }
        else
        {
          socket.emit("status", myChoice + " VS " + theirChoice + " TIE!");
          socket.opponent.emit("status",  theirChoice + " VS " + myChoice + " TIE!");
        }
        socket.emit("my_score", socket.score);
        socket.emit("their_score", socket.opponent.score);
        socket.opponent.emit("my_score", socket.opponent.score);
        socket.opponent.emit("their_score", socket.score);
      }
      else
      {
        socket.emit("status", "Chose " + socket.choice + ". Waiting for " + socket.opponent.name);
      }
    }
      else
      {
        socket.emit("status", "Waiting for opponent...");
      }
  });

  socket.on('disconnect', function() {
    console.log(socket.name + ' dcd');
    if(socket.opponent)
    {
      socket.opponent.emit("status", "won game");
      socket.opponent.opponent = null;
      socket.opponent.disconnect();
    }
  });

});
