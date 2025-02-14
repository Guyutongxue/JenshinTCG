// Copyright (C) 2025 Guyutongxue
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

import { createMemo, Show } from "solid-js";
import { cssPropertyOfTransform } from "../ui_state";
import type { EntityInfo } from "./Chessboard";
import { Image } from "./Image";

export interface EntityProps extends EntityInfo {}

export function Entity(props: EntityProps) {
  const data = createMemo(() => props.data);
  return (
    <div
      class="absolute left-0 top-0 h-18 w-15 transition-transform rounded-lg"
      style={cssPropertyOfTransform(props.uiState.transform)}
      bool:data-entering={props.animation === "entering"}
      bool:data-disposing={props.animation === "disposing"}
      bool:data-triggered={props.triggered}
    >
      <Image
        class="absolute h-full w-full rounded-lg b-white b-2"
        imageId={data().definitionId}
      />
      <Show when={data().hasUsagePerRound}>
        <div
          class="absolute inset-2px animate-[entity-highlight] animate-duration-2000 animate-ease-in-out animate-alternate animate-count-infinite"
        />
      </Show>
      <Show when={typeof data().variableValue === "number"}>
        <div class="w-6 h-6 absolute top--2 right--2 rounded-full bg-white b-1 b-black flex items-center justify-center line-height-none">
          {data().variableValue}
        </div>
      </Show>
      <Show when={typeof data().hintIcon === "number"}>
        <div class="absolute h-5 min-w-0 left-0 bottom-0 bg-white bg-opacity-70 flex items-center">
          <Image imageId={data().hintIcon!} class="h-4 w-4" />
          {data().hintText}
        </div>
      </Show>
    </div>
  );
}
