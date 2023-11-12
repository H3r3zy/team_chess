<template>
  <div class="row full-width full-height">
    <div class="team white column">
      <div class="title">Violet</div>
      <div
        v-for="user of white"
        :key="'w-' + user.name"
        class="row space-between full-width user"
        :class="{
          me: myTeam === 'white' && myName === user.name,
          ready: user.hasNextMove,
        }"
      >
        <div>{{ user.name }}</div>
        <div v-if="user.move" class="move" :class="{ chosen: user.wasMoveChosen }">{{ user.move }}</div>
      </div>
    </div>

    <div class="column justify-center col">
      <div class="column pa-md" style="z-index: 5">
        <div v-if="!myName || !myTeam" class="row">
          <label for="name">Name
            <input v-model.trim="name" placeholder="Name" name="name" />
          </label>

          <label for="team">Team
            <select v-model="team" name="team">
              <option value="white">Violet</option>
              <option value="black">Bleu</option>
            </select>
          </label>

          <button :disabled="!name || !team" @click="join">Join</button>
        </div>
      </div>

      <TheChessboard
        v-if="game"
        reactiveConfig
        class="board"
        :class="classes"
        @move="onMove"
        @boardCreated="onBoardCreated"
      />

      <div v-if="nextMoveIn" class="column nextMove" style="text-align: center">
        <div>
          Prochain coup forcé dans <strong>{{ nextMoveIn }}</strong>
        </div>
        <span style="font-size: 12px">
          (Si au moins une personne de l'équipe a joué un coup)
        </span>
      </div>
    </div>

    <div class="team black column">
      <div class="title">Bleu</div>
      <div
        v-for="user of black"
        :key="'b-' + user.name"
        class="row space-between full-width user"
        :class="{
          me: myTeam === 'black' && myName === user.name,
          ready: user.hasNextMove,
        }"
      >
        <div>{{ user.name }}</div>
        <div v-if="user.move" class="move" :class="{ chosen: user.wasMoveChosen }">{{ user.move }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
/* eslint-disable-next-line import/no-unresolved */
import { TheChessboard } from 'vue3-chessboard';
import { state, socket } from './socket';

const white = computed(() => state.teams.white);
const black = computed(() => state.teams.black);
const myTeam = computed(() => state.myTeam);
const myName = computed(() => state.myName);
const game = computed(() => state.game);
const nextMoveIn = ref('');

setInterval(() => {
  if (!state.nextForcedMove) {
    nextMoveIn.value = undefined;
  }
  const nbMs = state.nextForcedMove - Date.now();
  const nbS = Math.round(nbMs / 1000);
  const nbM = Math.round(nbS / 60);
  if (nbS < 1) {
    nextMoveIn.value = 'Maintenant';
  }
  if (nbM < 1) {
    nextMoveIn.value = `${nbS} secondes`;
  }
  nextMoveIn.value = `${nbM} minutes`;
}, 1000);
const team = ref('');
const name = ref('');
const lastMove = ref('');
const board = ref(null);

const playerColor = computed(() => (myTeam.value || 'white'));
const classes = ref({});

function verifyClasses() {
  classes.value = {
    [board.value?.getTurnColor()]: true,
    checkmate: board.value?.getIsCheckmate(),
    check: board.value?.getIsCheck(),
    stalemate: board.value?.getIsStalemate(),
    draw: board.value?.getIsDraw(),
    repetition: board.value?.getIsThreefoldRepetition(),
    insufficient: board.value?.getIsInsufficientMaterial(),
  };
  console.log(board.value?.getMaterialCount());
  console.log(board.value?.getCapturedPieces());
}

function setGame() {
  board.value.setConfig({
    fen: game.value.fen(),
    orientation: playerColor.value,
    coordinates: true,
    viewOnly: !myTeam.value || board.value.getTurnColor() !== myTeam.value,
    premovable: {
      enabled: false,
    },
    movable: {
      color: playerColor.value,
    },
  });
  verifyClasses();
}

function join() {
  socket.emit('join', { name: name.value, team: team.value }, (success) => {
    if (success) {
      state.myTeam = team.value;
      state.myName = name.value;
      setGame();
    }
  });
}

function onMove($event) {
  socket.emit('move', $event.san, (success) => {
    if (!success) {
      board.value.undoLastMove();
    }
  });
}

function onBoardCreated(api) {
  board.value = api;
  setGame();
  verifyClasses();
}

socket.on('move', ({ pgn, teams, move }) => {
  lastMove.value = move;
  board.value.loadPgn(pgn);
  if (myTeam.value) {
    board.value.setConfig({ viewOnly: board.value.getTurnColor() !== myTeam.value });
  }
  state.teams = teams;
  verifyClasses();
});
</script>

<style>
.full-width {
  width: 100%;
}
.full-height {
  height: 100%;
}
.col {
  flex: 1;
}
body {
  background: #11263a;
  font-family: "JetBrains Mono", monospace;
  color: white;
}
.board {
  margin-top: 50px;
  max-width: 696px !important;
  max-height: 696px !important;
  position: relative;
  --color: rgba(45,255,196,0.9);
  transition: box-shadow 0.5s ease-in-out;
  box-shadow: 0 0 105px 20px var(--color);
  padding: 3px;
}
.board.white {
  --color: rgba(175,61,234,0.9);
}
.board.black {
  --color: rgba(0,151,154,0.9);
}
.board.check::after {
  content: 'Echec';
  animation: event 1s ease-in-out forwards;
}
.board.checkmate::after {
  content: 'Mat';
  animation: event2 1s ease-in-out forwards;
}
.board.stalemate::after {
  content: 'PAT';
}
.board.draw::after {
  content: 'égalité';
}
.board.repetition::after {
  content: 'Répétition';
}
.board.insufficient::after {
  content: 'Matériel';
}
.board::after {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(10deg);
  color: white;
  text-transform: uppercase;
  font-size: 90px;
  z-index: 1000;
  pointer-events: none;
  text-shadow:
  0 0 7px var(--color),
  0 0 10px var(--color),
  0 0 21px var(--color),
  0 0 42px var(--color),
  0 0 82px var(--color),
  0 0 92px var(--color),
  0 0 102px var(--color),
  0 0 151px var(--color);
  animation: event2 1s ease-in-out forwards;
}
@keyframes event {
    0% {
        opacity: 0;
        transform: translate(-50%, -50%) rotate(0deg) scale(0.5);
    }
    50% {
        opacity: 1;
        transform: translate(-50%, -50%) rotate(10deg) scale(1.2);
    }
    75% {
        opacity: 1;
        transform: translate(-50%, -50%) rotate(10deg) scale(1);
    }
    100% {
        opacity: 0;
        transform: translate(-50%, -50%) rotate(10deg) scale(1);
    }
}
@keyframes event2 {
    0% {
        opacity: 0;
        transform: translate(-50%, -50%) rotate(0deg) scale(0.5);
    }
    50% {
        opacity: 1;
        transform: translate(-50%, -50%) rotate(10deg) scale(1.2);
    }
    100% {
        opacity: 1;
        transform: translate(-50%, -50%) rotate(10deg) scale(1);
    }
}

.column {
  display: flex;
  flex-direction: column;
}
.row {
  display: flex;
  flex-direction: row;
}
.justify-center {
  justify-content: center;
}
.space-between {
  justify-content: space-between;
}
.column.justify-center {
  align-items: center;
}
.pa-md {
  padding: 16px;
}

.team {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 250px;
  margin: 50px;
  color: white;
  font-size: 20px;
  border-radius: 10px;
  padding: 6px 12px;
  z-index: 5;
  background: #00000044;
}

.team.white {
  --color: rgba(175,61,234,0.9);
}

.team.black {
  --color: rgba(0,151,154,0.9);
}

.team .title {
  position: relative;
  width: 100%;
  text-align: center;
  text-transform: uppercase;
  margin-bottom: 25px;
}

.team .title::before {
  content: ' ';
  position: absolute;
  top: 75%;
  left: 5%;
  width: 90%;
  height: 25px;
  filter: blur(2px);
  background: linear-gradient(to bottom, var(--color) 25%, #00000000 100%);
}

.move {
  color: grey;
}
.move.chosen {
  color: white;
  font-weight: bolder;
}

.user {
  margin-bottom: 3px;
  padding: 6px 12px;
  border-radius: 10px;
  font-size: 16px;
  background: #00000044;
  color: lightgray;
  position: relative;
}
.user.me {
  font-weight: bold;
  color: white;
}
@keyframes gradient {
  0% {
    opacity: 0;
    background: linear-gradient(to right, var(--color) 0px, transparent 10px);
  }
  50% {
    opacity: 0.8;
    background: linear-gradient(to right, var(--color) 5px, transparent 40px);
  }
  100% {
    opacity: 0.5;
    background: linear-gradient(to right, var(--color) 10px, transparent 30px);
  }
}
.user.ready::before {
  position: absolute;
  content: ' ';
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0.5;
  background: linear-gradient(to right, var(--color) 5px, transparent 30px);
  animation: gradient 1s ease-in-out forwards;
}

cg-board piece.white.pawn {
  background-image: url('assets/wP.svg');
}
cg-board piece.white.bishop {
    background-image: url('assets/wB.svg');
}
cg-board piece.white.knight {
    background-image: url('assets/wN.svg');
}
cg-board piece.white.king {
    background-image: url('assets/wK.svg');
}
cg-board piece.white.queen {
    background-image: url('assets/wQ.svg');
}
cg-board piece.white.rook {
    background-image: url('assets/wR.svg');
}
cg-board piece.black.pawn {
    background-image: url('assets/bP.svg');
}
cg-board piece.black.bishop {
    background-image: url('assets/bB.svg');
}
cg-board piece.black.knight {
    background-image: url('assets/bN.svg');
}
cg-board piece.black.king {
    background-image: url('assets/bK.svg');
}
cg-board piece.black.queen {
    background-image: url('assets/bQ.svg');
}
cg-board piece.black.rook {
    background-image: url('assets/bR.svg');
}

cg-board {
    background-image: url('assets/board.svg') !important;
}
.files coord, .ranks coord {
    color: white !important;
}
.nextMove {
  color: white;
  margin-top: 20px;
}
</style>
