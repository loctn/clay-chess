clay-chess
==========

Minimum viable chess game in JavaScript.

Usage
-----

clay-chess does not enforce a board UI, but a working board is shown in [the example](https://rawgit.com/loctn/clay-chess/master/example/index.html).

Perhaps Later
-------------

- Game ending conditions: insufficient material, fifty-move rule, threefold repetition, and time control (some of these can be enforced by the UI)
- Undo/redo is easy to add using the existing `this.moves`, but a more elegant way is to make `this.board` immutable.

License
-------

[CC0](https://creativecommons.org/publicdomain/zero/1.0/)