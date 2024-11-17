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

import type { DiceType } from "@gi-tcg/typings";

import { Image } from "./Image";
import { Match, Show, Switch, mergeProps } from "solid-js";

export interface DiceProps {
  type: number;
  selected?: boolean;
  size?: number;
  text?: string;
  color?: DiceColor;
}

export type DiceColor = "normal" | "increased" | "decreased";

export const DICE_COLOR: Record<number, string> = {
  0 /* DiceType.Void */: "void",
  1 /* DiceType.Cryo */: "cryo",
  2 /* DiceType.Hydro */: "hydro",
  3 /* DiceType.Pyro */: "pyro",
  4 /* DiceType.Electro */: "electro",
  5 /* DiceType.Anemo */: "anemo",
  6 /* DiceType.Geo */: "geo",
  7 /* DiceType.Dendro */: "dendro",
  8 /* DiceType.Omni */: "omni",
  9 /* DiceType.Energy */: "heal",
  10: "heal",
};

function EnergyIcon(props: { size: number }) {
  return (
    <svg // 能量图标
      width="14"
      height="14"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 15 15"
      style={{ height: `${props.size}px`, width: `${props.size}px` }}
    >
      <path
        d="M7.5 2.143c-.222 0-.623.548-1.02 1.188a4.301 4.301 0 00-3.15 3.152c-.64.396-1.187.797-1.187 1.017 0 .22.547.62 1.186 1.017a4.301 4.301 0 003.152 3.152c.396.64.797 1.188 1.019 1.188.222 0 .623-.548 1.02-1.188a4.301 4.301 0 003.149-3.15c.64-.396 1.188-.797 1.188-1.019 0-.22-.542-.619-1.178-1.013a4.301 4.301 0 00-3.166-3.166C8.119 2.685 7.72 2.143 7.5 2.143z"
        fill="#c6a370"
        fill-rule="evenodd"
        stroke="#997650"
        stroke-width=".40500054"
        stroke-linejoin="round"
        stroke-opacity=".988"
        paint-order="markers stroke fill"
      />
      <path
        d="M7.5 3.214C6.429 5.357 5.357 6.43 3.214 7.5 5.357 8.571 6.43 9.643 7.5 11.786 8.571 9.643 9.643 8.57 11.786 7.5 9.643 6.429 8.57 5.357 7.5 3.214z"
        fill="#ec9f38"
        stroke="#d78535"
        stroke-width=".202"
      />
      <path
        d="M7.5 1.071C6.964 6.43 6.429 6.964 1.071 7.5c5.358.536 5.893 1.071 6.429 6.429.536-5.358 1.071-5.893 6.429-6.429C8.57 6.964 8.036 6.429 7.5 1.071z"
        fill="#ffffdf"
      />
    </svg>
  );
}

function DiceIcon(props: { size: number; type: DiceType; selected: boolean }) {
  return (
    <svg // 骰子图标
      width="14"
      height="14"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 15 15"
      class="fill-current w-10 h-10"
      style={{
        height: `${props.size}px`,
        width: `${props.size}px`,
        color: `var(--c-${DICE_COLOR[props.type]})`,
      }}
    >
      <path
        d="M7.5 2.065L2.97 4.784v5.432l4.53 2.719 4.53-2.719V4.784z"
        stroke-width=".214"
        stroke-linejoin="round"
        fill="#FFF"
        stroke="gray"
      />
      <path
        d="M7.5 2.065L2.97 4.784v5.432l4.53 2.719 4.53-2.719V4.784z"
        opacity=".2"
      />
      <path
        d="M7.5 1.071L2.143 4.286v6.428L7.5 13.93l5.357-3.215V4.286L7.5 1.07zm0 .994l4.53 2.719v5.432L7.5 12.935l-4.53-2.719V4.784L7.5 2.065z"
        fill="#D4C0A5"
        stroke="#dc2626"
        stroke-width={props.selected ? 1 : 0}
        stroke-linejoin="round"
      />
      <path
        d="M7.5 7.5V2.065L2.97 4.784zM7.5 12.935V7.5l4.53 2.716z"
        opacity=".6"
      />
      <path d="M2.97 4.784L7.5 7.5l-4.53 2.716z" opacity=".9" />
      <path d="M7.5 12.935V7.5l-4.53 2.716zm0-10.87V7.5l4.53-2.716z" />
      <path d="M7.5 7.5l4.53-2.716v5.432z" opacity=".9" />
    </svg>
  );
}

export function Dice(props: DiceProps) {
  const merged = mergeProps({
    selected: false,
    size: 25,
    color: "normal" as DiceColor,
  }, props);

  return (
    <div class="relative flex items-center justify-center">
      <Show
        when={merged.type !== 9}
        fallback={<EnergyIcon size={merged.size} />}
      >
        <DiceIcon {...merged} />
      </Show>
      <Switch>
        <Match when={merged.text}>
          <span
            class="absolute text-outline"
            style={{
              "font-size": `${0.4 * merged.size}px`,
              color:
                merged.color === "increased"
                  ? "red"
                  : merged.color === "decreased"
                    ? "green"
                    : merged.type === 0
                      ? "white"
                      : "black",
            }}
          >
            {merged.text}
          </span>
        </Match>
        <Match when={merged.type >= 1 && merged.type <= 7}>
          <Image
            class="absolute"
            imageId={merged.type}
            height={0.6 * merged.size}
            width={0.6 * merged.size}
          />
        </Match>
      </Switch>
    </div>
  );
}
