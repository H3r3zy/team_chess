import { reactive } from 'vue';
import { io } from 'socket.io-client';
import { Chess } from 'chess.js';

export const state = reactive({
  connected: false,
  game: null,
  teams: {
    white: [],
    black: [],
    obs: [],
  },
  myTeam: null,
  myName: null,
  nextForcedMove: null,
});

// "undefined" means the URL will be computed from the `window.location` object
const URL = process.env.NODE_ENV === 'production' ? undefined : 'http://localhost:8548';

export const socket = io(URL);

socket.on('connect', () => {
  state.connected = true;
});

socket.on('disconnect', () => {
  state.connected = false;
});

socket.on('actualGame', ({ fen, teams, nextForcedMove }) => {
  state.game = new Chess(fen);
  state.teams = teams;
  state.nextForcedMove = nextForcedMove;
});

socket.on('join', ({ name, team }) => {
  if (!state.teams[team].find((e) => e.name === name)) {
    state.teams[team].push({ name });
  }
});

socket.on('leave', ({ name, team }) => {
  state.teams[team] = state.teams[team].filter((user) => user.name !== name);
});

socket.on('ready', ({ name, team }) => {
  state.teams[team] = state.teams[team].map((user) => {
    if (user.name === name) {
      // eslint-disable-next-line no-param-reassign
      user.hasNextMove = true;
    }
    return user;
  });
});

socket.on('nextForcedMove', (time) => {
  state.nextForcedMove = time;
});
