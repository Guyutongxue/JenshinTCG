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

import { CardDefinition } from "../base/card";
import { CharacterDefinition } from "../base/character";
import { EntityDefinition, VariableConfig } from "../base/entity";
import { ExtensionDefinition } from "../base/extension";
import {
  InitiativeSkillDefinition,
  SkillDefinition,
} from "../base/skill";
import { GiTcgDataError } from "../error";
import {
  CURRENT_VERSION,
  Version,
  VersionInfo,
  WithVersionInfo,
  getCorrectVersion,
} from "../base/version";
import { freeze } from "immer";

let currentStore: DataStore | null = null;

export function beginRegistration() {
  if (currentStore !== null) {
    throw new GiTcgDataError("Already in registration");
  }
  currentStore = {
    characters: new Map(),
    entities: new Map(),
    cards: new Map(),
    initiativeSkills: new Map(),
    passiveSkills: new Map(),
    extensions: new Map(),
  };
}

interface CharacterEntry extends Omit<CharacterDefinition, "skills"> {
  skillIds: readonly number[];
}

// interface EntityEntry extends Omit<EntityDefinition, "initiativeSkills"> {
//   initiativeSkillIds: readonly number[];
// }

interface CharacterPassiveSkillEntry {
  __definition: "passiveSkills";
  id: number;
  type: "passiveSkill";
  version: VersionInfo;
  varConfigs: Record<string, VariableConfig>;
  skills: readonly SkillDefinition[];
}

interface CharacterInitiativeSkillEntry {
  __definition: "initiativeSkills";
  id: number;
  type: "initiativeSkill";
  version: VersionInfo;
  skill: InitiativeSkillDefinition;
}

type DefinitionMap = {
  characters: CharacterEntry;
  entities: EntityDefinition;
  cards: CardDefinition;
  extensions: ExtensionDefinition;
  initiativeSkills: CharacterInitiativeSkillEntry;
  passiveSkills: CharacterPassiveSkillEntry;
};

type RegisterCategory = keyof DefinitionMap;

export type DataStore = {
  [K in RegisterCategory]: Map<number, DefinitionMap[K][]>;
};

export interface GameData {
  readonly version: Version;
  readonly extensions: ReadonlyMap<number, ExtensionDefinition>;
  readonly characters: ReadonlyMap<number, CharacterDefinition>;
  readonly entities: ReadonlyMap<number, EntityDefinition>;
  readonly cards: ReadonlyMap<number, CardDefinition>;
}

function getCurrentStore(): DataStore {
  if (currentStore === null) {
    throw new GiTcgDataError("Not in registration");
  }
  return currentStore;
}

function register<C extends RegisterCategory>(
  type: C,
  value: DefinitionMap[C],
) {
  const store = getCurrentStore()[type];
  if (!store.has(value.id)) {
    store.set(value.id, []);
  }
  const allVersions = store.get(value.id)!;
  if (
    value.version.predicate === "since" &&
    allVersions.some(
      (obj) => "version" in obj && obj.version.predicate === "since",
    )
  ) {
    throw new GiTcgDataError(
      `Duplicate since version definition for ${type} id ${value.id}`,
    );
  } else {
    if (
      allVersions.some(
        (obj) =>
          "version" in obj &&
          obj.version.predicate === "until" &&
          obj.version.version === value.version.version,
      )
    ) {
      throw new GiTcgDataError(
        `Duplicate until version definition for ${type} id ${value.id}`,
      );
    }
  }
  allVersions.push(value);
}
export function registerCharacter(value: CharacterEntry) {
  register("characters", value);
}
export function registerEntity(value: EntityDefinition) {
  register("entities", value);
}
export function registerPassiveSkill(value: CharacterPassiveSkillEntry) {
  register("passiveSkills", value);
}
export function registerInitiativeSkill(value: CharacterInitiativeSkillEntry) {
  register("initiativeSkills", value);
}
export function registerCard(value: CardDefinition) {
  register("cards", value);
}
export function registerExtension(value: ExtensionDefinition) {
  register("extensions", value);
}

export type GameDataGetter = (version?: Version) => GameData;

function combineObject<T extends {}, U extends {}>(a: T, b: U): T & U {
  const combined = { ...a, ...b };
  const overlappingKeys = Object.keys(a).filter((key) => key in b);
  if (overlappingKeys.length > 0) {
    throw new Error(`Properties ${overlappingKeys.join(", ")} are overlapping`);
  }
  return combined;
}

function selectVersion<T extends WithVersionInfo>(
  version: Version,
  source: Map<number, T[]>,
): Map<number, T>;
function selectVersion<T extends WithVersionInfo, U>(
  version: Version,
  source: Map<number, T[]>,
  transformFn: (v: T) => U,
): Map<number, U>;
function selectVersion<T extends WithVersionInfo>(
  version: Version,
  source: Map<number, T[]>,
  transformFn?: (v: T) => unknown,
): Map<number, unknown> {
  const result = new Map<number, unknown>();
  for (const [id, defs] of source) {
    const chosen = getCorrectVersion(defs, version);
    if (!chosen) {
      continue;
    }
    const transformed = transformFn ? transformFn(chosen) : chosen;
    result.set(id, transformed);
  }
  return result;
}

export function endRegistration(): GameDataGetter {
  const store = getCurrentStore();
  return (version = CURRENT_VERSION): GameData => {
    const data: GameData = {
      version,
      extensions: selectVersion(version, store.extensions),
      entities: selectVersion(version, store.entities),
      cards: selectVersion(version, store.cards),
      characters: selectVersion(version, store.characters, (correctCh) => {
        const initiativeSkills = correctCh.skillIds
          .map((id) => store.initiativeSkills.get(id))
          .filter((e) => !!e)
          .map((e) => getCorrectVersion(e, version))
          .filter((e) => !!e);
        const passiveSkills = correctCh.skillIds
          .map((id) => store.passiveSkills.get(id))
          .filter((e) => !!e)
          .map((e) => getCorrectVersion(e, version))
          .filter((e) => !!e);
        const passiveSkillVarConfigs = passiveSkills.reduce(
          (acc, { varConfigs }) => combineObject(acc, varConfigs),
          <Record<string, VariableConfig>>{},
        );
        const skills: readonly SkillDefinition[] = [
          ...initiativeSkills.map((e) => e.skill),
          ...passiveSkills.flatMap((e) => e.skills),
        ];
        return {
          ...correctCh,
          varConfigs: combineObject(
            correctCh.varConfigs,
            passiveSkillVarConfigs,
          ),
          skills,
        };
      }),
    };
    return freeze(data);
  };
}
