// Copyright (C) 2024 Guyutongxue
// 
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.
// 
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
// 
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

/* @refresh reload */
// import "solid-devtools";
import { createEffect, createSignal } from "solid-js";
import { render } from "solid-js/web";

import data from "@gi-tcg/data";
import { DetailLogEntry, Game, GameIO, PlayerConfig } from "@gi-tcg/core";
import { decode } from "@gi-tcg/utils";
import { DetailLogViewer } from "@gi-tcg/detail-log-viewer";
import { createPlayer } from "./index";

const playerConfig0: PlayerConfig = {
  characters: [2204, 1313, 1403],
  cards: [
    323008, 
    332020, 332014, 332004, 332018, 332005, 332006, 332024, 332010, 331804,
    332023, 332017, 332012, 332021, 332013, 332008, 331802, 332004, 332001,
    332019, 331803, 332003, 332007, 332022, 331801, 332011, 
  ],
  noShuffle: import.meta.env.DEV,
  alwaysOmni: import.meta.env.DEV,
};
const playerConfig1: PlayerConfig = {
  characters: [1609, 1201, 1303],
  cards: [
    333015, 332009, 332002, 331602, 331302, 331402, 331502, 331102, 331202,
    331702, 331301, 331101, 331601, 331401, 331201, 331701, 331501, 332016,
    332023, 332017, 332012, 332021, 332013, 332008, 331802, 332004, 332001,
    332019, 331803, 332003, 332007, 332022, 331801, 332011, 330006, 330005,
  ],
  noShuffle: import.meta.env.DEV,
  // alwaysOmni: import.meta.env.DEV,
};

function App() {
  const [io0, Chessboard0] = createPlayer(0);
  const [io1, Chessboard1] = createPlayer(1);
  const [detailLog, setDetailLog] = createSignal<readonly DetailLogEntry[]>([]);

  const io: GameIO = {
    pause: async () => {
      setDetailLog([...game.detailLog]);
    },
    players: [io0, io1],
  };
  const game = new Game({
    data: data(),
    io,
    playerConfigs: [playerConfig0, playerConfig1],
  });
  game.start();
  Reflect.set(window, "game", game);

  return (
    <div class="min-w-180 flex flex-col gap-2">
      <Chessboard0 />
      <Chessboard1 />
      <DetailLogViewer logs={detailLog()} />
    </div>
  );
}

render(() => <App />, document.getElementById("root")!);
