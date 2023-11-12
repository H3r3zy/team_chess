const { Chess } = require('chess.js')

module.exports = class Game {
  constructor() {
    this.game = new chess.Chess();
  }
}