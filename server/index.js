/* eslint-disable */
const path = require('node:path');
const { createServer } = require('node:http');
const express = require('express');
const { Server } = require('socket.io');
const serveStatic = require('serve-static');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:8080',
  },
});


app.use(serveStatic('./dist'));

const chess = require('chess.js');

const game = new chess.Chess();
const teams = {
  white: {},
  black: {},
  obs: {},
};

const TEAM = { [chess.WHITE]: 'white', [chess.BLACK]: 'black' };

function makeMove(team) {
  const players = Object.values(teams[team]).filter((e) => !!e.nextMove);

  clearTimeout(timer);
  if (!players.length) {
    console.log('no one made a move');
    createTimer();
    return;
  }

  const randomPlayer = players[Math.floor(Math.random() * players.length)];
  console.log(randomPlayer.name + ' made the move ' + randomPlayer.nextMove);
  const move = randomPlayer.nextMove;
  game.move(move);
  players.forEach((e) => {
    e.wasMoveChosen = e.nextMove === move;
    e.move = e.nextMove;
    e.nextMove = undefined;
  });
  createTimer();
  io.emit('move', {
    move,
    fen: game.fen(),
    pgn: game.pgn(),
    teams: {
      white: Object.values(teams.white).map((user) => ({
        name: user.name,
        move: user.move,
        hasNextMove: !!user.nextMove,
        wasMoveChosen: user.wasMoveChosen,
      })),
      black: Object.values(teams.black).map((user) => ({
        name: user.name,
        move: user.move,
        hasNextMove: !!user.nextMove,
        wasMoveChosen: user.wasMoveChosen,
      })),
    },
  });
  Object.entries(teams[team]).forEach(([name, user]) => {
    if (user.willDisconnect) {
      delete teams[team][name];
      io.emit('leave', { team, name });
    }
  });
}

function checkIfEveryoneHasMove() {
  const team = teams[TEAM[game.turn()]];

  const everyoneOnTeamMoved = Object.values(team).every((user) => !!user.nextMove);
  if (everyoneOnTeamMoved) {
    console.log(`everyone on team "${game.turn()}" moved`);
    makeMove(TEAM[game.turn()]);
  }
}

let timer;
let nextForcedMove = 0;
function createTimer() {
  const time = 60 * 60 * 1000; // 1 hour
  timer = setTimeout(() => {
    makeMove(TEAM[game.turn()]);
  }, time); // Every hour a move is made
  nextForcedMove = Date.now() + time;
  io.emit('nextForcedMove', nextForcedMove);
}
createTimer();

io.on('connection', (socket) => {
  socket.emit('actualGame', {
    fen: game.fen(),
    pgn: game.pgn(),
    teams: {
      white: Object.values(teams.white).map((user) => ({
        name: user.name,
        move: user.move,
        hasNextMove: !!user.nextMove,
        wasMoveChosen: user.wasMoveChosen,
      })),
      black: Object.values(teams.black).map((user) => ({
        name: user.name,
        move: user.move,
        hasNextMove: !!user.nextMove,
        wasMoveChosen: user.wasMoveChosen,
      })),
      obs: Object.values(teams.obs).map((user) => ({ name })),
    },
    nextForcedMove,
  });

  let user = { socket };

  socket.on('join', ({ team, name }, cb) => {
    if (!name || !team) {
      return cb(false);
    }
    console.log('user: ', name, ' team: ', team, 'joined');
    user.name = name;
    user.team = team;
    teams[team][name] = user;
    io.emit('join', { team, name });
    return cb(true);
  });

  socket.on('move', (move, cb) => {
    console.log('user: ', user.name, ' move: ', move);
    if (game.moves().includes(move)) {
      user.nextMove = move;

      checkIfEveryoneHasMove();
      io.emit('ready', { team: user.team, name: user.name });
      return cb(true);
    }
    return cb(false);
  });

  socket.on("disconnect", () => {
    if (user.team) {
      if (user.nextMove) {
        teams[user.team][user.name].willDisconnect = true;
      } else {
        delete teams[user.team][user.name];
        io.emit('leave', { team: user.team, name: user.name });
      }
    }
  });
});

server.listen(8548, () => {
  console.log('server running at http://localhost:8548');
});
