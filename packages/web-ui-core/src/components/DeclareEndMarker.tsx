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

import type { PbPhaseType } from "@gi-tcg/typings";
import type { ActionStep } from "../action";
import { createEffect, Show } from "solid-js";
import type { StepActionStateHandler } from "./Chessboard";
import { Button } from "./Button";

export interface DeclareEndMarkerProps {
  class?: string;
  markerStep: ActionStep | null;
  buttonStep: ActionStep | null;
  opp: boolean;
  roundNumber: number;
  phase: PbPhaseType;
  onStepActionState: StepActionStateHandler;
}

export function DeclareEndMarker(props: DeclareEndMarkerProps) {
  return (
    <div
      class={`flex flex-row items-center pointer-events-none select-none gap-3 ${
        props.class ?? ""
      }`}
    >
      <div
        class="pointer-events-auto h-16 w-16 rounded-full data-[opp=true]:bg-blue-300 data-[opp=false]:bg-yellow-300 b-white b-3 flex flex-col items-center justify-center cursor-not-allowed data-[clickable]:cursor-pointer data-[clickable]:hover:bg-yellow-400 transition-colors"
        data-opp={props.opp}
        onClick={(e) => {
          e.stopPropagation();
          if (props.markerStep) {
            props.onStepActionState(props.markerStep, []);
          }
        }}
        bool:data-clickable={props.markerStep}
      >
        T{props.roundNumber}
      </div>
      <div
        class="opacity-0 data-[shown]:pointer-events-auto data-[shown]:opacity-100 transition-opacity"
        bool:data-shown={props.buttonStep}
      >
        <Button
          onClick={(e) => {
            e.stopPropagation();
            if (props.buttonStep) {
              props.onStepActionState(props.buttonStep, []);
            }
          }}
        >
          宣布结束
        </Button>
      </div>
    </div>
  );
}
