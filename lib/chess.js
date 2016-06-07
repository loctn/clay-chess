'use strict';

const KNIGHT_DELTAS     = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];
const KING_DELTAS       = [[0, 1], [1, 1], [1, 0], [1, -1], [0, -1], [-1, -1], [-1, 0], [-1, 1]];
const BISHOP_DIRECTIONS = [[1, 1], [1, -1], [-1, -1], [-1, 1]];
const ROOK_DIRECTIONS   = [[0, 1], [1, 0], [0, -1], [-1, 0]];


class ChessGame {

  constructor() {
    this.resetBoard();
  }

  get turn() {
    return this.moves.length % 2;
  }

  get lastMove() {
    return this.moves[this.moves.length - 1];
  }

  get isGameOver() {
    return ~(this.lastMove || '').indexOf('-');
  }  

  get isCheck() {
    return this.isAttackedBy(!this.turn, this.kings[this.turn].x, this.kings[this.turn].y);
  }

  get isMate() {
    return !this.board.some(file => file.some(square => square && square.color === this.turn && square.options.length));
  }

  resetBoard() {
    this.board     = [[]];
    this.moves     = [];
    this.kings     = [{ x: 4, y: 0 }, { x: 4, y: 7 }];
    this.prisoners = [[], []];

    let pieces = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
    for (let x = 0; x < 8; x++) {
      this.board[x][7] = { piece: pieces[x], color: 1, moveCount: 0, options: [] };
      this.board[x][6] = { piece: 'pawn',    color: 1, moveCount: 0, options: [] };
      this.board[x][1] = { piece: 'pawn',    color: 0, moveCount: 0, options: [] };
      this.board[x][0] = { piece: pieces[x], color: 0, moveCount: 0, options: [] };
    }
    this.evalOptions();
  }

  isInsideBoard(x, y) {
    return x >= 0 && x < 8 && y >= 0 && y < 8;
  }

  isClear(x, y) {
    return this.isInsideBoard(x, y) && !this.board[x][y];
  }

  isOpponent(color, x, y) {
    return this.board[x][y] && this.board[x][y].color === +color;
  }

  // Does not include en passant danger
  isAttackedByPawn(color, x, y) {
    let fromDirection = color ? 1 : -1;
    return [-1, 1].some(side => {
      let square = this.board[x + side][y + fromDirection];
      return square && square.piece === 'pawn' && square.color === +color;
    });
  }

  isAttackedByKnight(color, x, y) {
    return KNIGHT_DELTAS.some(delta => {
      let square = this.board[x + delta[0]][y + delta[1]];
      return square && square.piece === 'knight' && square.color === +color;
    });
  }

  isAttackedByLine(color, x, y, isDiagonal) {
    let directions = isDiagonal ? BISHOP_DIRECTIONS : ROOK_DIRECTIONS;
    let piece = isDiagonal ? 'bishop' : 'rook';
    return directions.some(direction => {
      let tx = x, ty = y;
      do {
        tx += direction[0];
        ty += direction[1];
        let square = this.board[tx][ty];
        if (square && (square.piece === piece || square.piece === 'queen') && square.color === +color) return true;
      } while (this.isInsideBoard(tx, ty));
    });
  }

  isAttackedByKing(color, x, y) {
    return KING_DELTAS.some(delta => {
      let square = this.board[x + delta[0]][y + delta[1]];
      return square && square.piece === 'king' && square.color === +color;
    });
  }

  isAttackedBy(color, x, y) {
    return this.isAttackedByPawn(color, x, y) || this.isAttackedByKnight(color, x, y) || this.isAttackedByLine(color, x, y, true) || this.isAttackedByLine(color, x, y) || this.isAttackedByKing(color, x, y);
  }

  isNotChecked(sx, sy, dx, dy) {
    let color = this.board[sx][sy].color;
    let temp  = this.board[dx][dy];
    this.board[dx][dy] = this.board[sx][sy];
    this.board[sx][sy] = null;
    let result = !this.isAttackedBy(!color, this.kings[color].x, this.kings[color].y);
    this.board[sx][sy] = this.board[dx][dy];
    this.board[dx][dy] = temp;
    temp = null;
    return result;
  }

  getPawnOptions(x, y) {
    let src = this.board[x][y];
    let options = [];
    let direction = src.color ? -1 : 1;

    // Up one
    let move = { x: x, y: y + direction };
    if (this.isClear(move.x, move.y)) {
      if (this.isNotChecked(x, y, move.x, move.y)) options.push(move);
      // Up two
      if (!src.moveCount) {
        move = { x: x, y: y + 2 * direction };
        if (this.isClear(move.x, move.y) && this.isNotChecked(x, y, move.x, move.y)) options.push(move);
      }
    }    

    [-1, 1].forEach(side => {
      // Take diagonal
      move = { x: x + side, y: y + direction };
      if (this.isOpponent(!src.color, move.x, move.y) && this.isNotChecked(x, y, move.x, move.y)) options.push(move);
      // Take en passant
      let passed = this.board[move.x][y];
      if (passed && passed.piece === 'pawn' && passed.color !== src.color && passed.moveCount === 1 && this.isClear(move.x, move.y) && this.isNotChecked(x, y, move.x, move.y)) options.push(move);
    });

    return options;
  }

  getDeltaOptions(x, y, isKnight) {
    let src = this.board[x][y];
    let options = [];
    let deltas = isKnight ? KNIGHT_DELTAS : KING_DELTAS;
    deltas.forEach(delta => {
      let move = { x: x + delta[0], y: y + delta[1] };
      if ((this.isClear(move.x, move.y) || this.isOpponent(!src.color, move.x, move.y)) && this.isNotChecked(x, y, move.x, move.y)) options.push(move);
    });
    return options;
  }

  getLineOptions(x, y, isDiagonal) {
    let src = this.board[x][y];
    let options = [];
    let directions = isDiagonal ? BISHOP_DIRECTIONS : ROOK_DIRECTIONS;

    directions.forEach(direction => {
      let move = { x: x, y: y };
      do {
        move.x += direction[0];
        move.y += direction[1];
        if ((this.isClear(move.x, move.y) || this.isOpponent(!src.color, move.x, move.y)) && this.isNotChecked(x, y, move.x, move.y)) options.push(move);
      } while (this.isInsideBoard(move.x, move.y) && !this.isOpponent(!src.color, move.x, move.y));
    });

    return options;
  }

  getKingOptions(x, y) {
    let src = this.board[x][y];
    let options = this.getDeltaOptions(x, y);

    if (!src.moveCount && !this.isAttackedBy(!src.color, x, y)) {
      // Castle King's side
      if (this.isClear(5, y) && this.isClear(6, y) && !this.board[7][y].moveCount && !this.isAttackedBy(!src.color, 5, y) && !this.isAttackedBy(!src.color, 6, y)) {
        if (this.isNotChecked(x, y, 6, y)) options.push({ x: 6, y: y });
      }
      // Castle Queen's side
      if (this.isClear(3, y) && this.isClear(2, y) && this.isClear(1, y) && !this.board[0][y].moveCount && !this.isAttackedBy(!src.color, 3, y) && !this.isAttackedBy(!src.color, 2, y)) {
        if (this.isNotChecked(x, y, 2, y)) options.push({ x: 2, y: y });
      }
    }

    return options;
  }

  getOptions(x, y) {
    let src = this.board[x][y];
    if (!src || src.color !== this.turn) return [];
    
    switch (src.piece) {
    case 'pawn':
      return this.getPawnOptions(x, y);
    case 'knight':
      return this.getDeltaOptions(x, y, true);
    case 'bishop':
      return this.getLineOptions(x, y, true);
    case 'rook':
      return this.getLineOptions(x, y);
    case 'queen':
      return this.getLineOptions(x, y, true).concat(this.getLineOptions(x, y));
    case 'king':
      return this.getKingOptions(x, y);
    }
  }

  piece(piece) {
    if (piece === 'pawn') {
      return '';
    } else if (piece === 'knight') {
      return 'N';
    }
    return piece[0].toUpperCase();
  }

  file(x) {
    return 'abcdefgh'[x];
  }

  rank(y) {
    return '' + (y + 1);
  }

  disambiguate(sx, sy, dx, dy) {
    let src = this.board[sx][sy];
    let disambiguate = '';
    let ambiguousMoves = this.board.reduce((sub, file, x) => {
      return sub.concat(file.map((square, y) => {
        return (x !== sx || y !== sy) && square.piece === src.piece && square.color === src.color && square.options.some(move => move.x === dx && move.y === dy) ? { x: x, y: y } : null;
      }).filter(move => move));
    }, []);

    let hasAmbiguousRank = ambiguousMoves.some(move => move.y === sy);
    let hasAmbiguousFile = ambiguousMoves.some(move => move.x === sx);
    if (hasAmbiguousRank) {
      disambiguate += this.file(sx) + (hasAmbiguousFile ? this.rank(sy) : '');
    } else if (hasAmbiguousFile) {
      disambiguate += this.rank(sy);
    }

    return disambiguate;
  }

  movePiece(sx, sy, dx, dy) {
    this.board[dx][dy] = this.board[sx][sy];
    this.board[sx][sy] = null;
    let dst = this.board[dx][dy];
    dst.moveCount++;
    if (dst.piece === 'king') {
      this.kings[dst.color] = { x: dx, y: dy };
    }
  }

  evalOptions() {
    for (let x = 0; x < 8; x++) {
      for (let y = 0; y < 8; y++) {
        if (this.board[x][y]) {
          this.board[x][y].options = this.getOptions(x, y);
        }
      }
    }
  }

  evalMates() {
    let isCheck     = this.isCheck;
    let isMate      = this.isMate;
    let isCheckmate = isCheck && isMate;
    let isStalemate = !isCheck && isMate;
    
    if (isCheckmate) {
      this.moves[this.moves.length - 1] += '#';
      this.win();
    } else if (isStalemate) {
      this.draw();
    } else if (isCheck) {
      this.moves[this.moves.length - 1] += '+';
    }
  }

  move(sx, sy, dx, dy) {
    let src = this.board[sx][sy];
    if (!src.options.some(move => move.x === dx && move.y === dy)) return;

    let dst = this.board[dx][dy];
    if (dst) this.prisoners[src.color].push(dst.piece);

    let fileDistance = dx - sx;
    if (src.piece === 'king' && fileDistance !== 1) {
      if (fileDistance === 2) {
        this.moves.push('0-0');
        this.movePiece(7, dy, 5, dy);
      }
      if (fileDistance === -2) {
        this.moves.push('0-0-0');
        this.movePiece(0, dy, 3, dy);
      }
    } else {
      this.moves.push(this.piece(src.piece) + this.disambiguate(sx, sy, dx, dy) + (dst ? 'x' : '') + this.file(dx) + this.rank(dy));
      this.movePiece(sx, sy, dx, dy);
    }
    
    this.evalOptions();
    this.evalMates();
  }

  win() {
    if (!this.isGameOver) {
      this.moves.push(this.turn ? '1-0' : '0-1');
    }
  }

  draw() {
    if (!this.isGameOver) {
      this.moves.push('\u00BD-\u00BD');
    }
  }

}
