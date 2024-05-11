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

import { Reaction, DamageType } from "@gi-tcg/typings";
import { SkillDescription } from "../base/skill";
import { SkillBuilder, enableShortcut } from "./skill";
import { TypedSkillContext } from "./context";
import { CombatStatusHandle, StatusHandle, SummonHandle } from "./type";

export const CALLED_FROM_REACTION: unique symbol = Symbol();

const Frozen = 106 as StatusHandle;
const Crystallize = 111 as CombatStatusHandle;
const BurningFlame = 115 as SummonHandle;
const DendroCore = 116 as CombatStatusHandle;
const CatalyzingField = 117 as CombatStatusHandle;

export interface ReactionDescriptionEventArg {
  /** 元素反应发生于 */
  where: "my" | "opp";
  /** 元素反应发生角色 id */
  id: number;
  isActive: boolean;
  /** 要生成的实体位于  */
  here: "my" | "opp";
}

type ReactionDescription = SkillDescription<ReactionDescriptionEventArg>;
const REACTION_DESCRIPTION: Record<Reaction, ReactionDescription> = {} as any;

type ReactionContextMeta = {
  readonly: false;
  callerVars: never;
  eventArgType: ReactionDescriptionEventArg;
  callerType: any;
};

type ReactionAction = (
  c: TypedSkillContext<ReactionContextMeta>,
  e: ReactionDescriptionEventArg,
) => void;

const pierceToOther: ReactionAction = (c, e) => {
  c.damage(
    DamageType.Piercing,
    1,
    `${e.where} characters and not with id ${e.id}`,
  );
};

const crystallize: ReactionAction = (c, e) => {
  c.combatStatus(Crystallize, e.here);
};

type SwirlableElement =
  | DamageType.Cryo
  | DamageType.Hydro
  | DamageType.Pyro
  | DamageType.Electro;

const swirl = (srcElement: SwirlableElement): ReactionAction => {
  return (c, e) => {
    c.damage(srcElement, 1, `${e.where} characters and not with id ${e.id}`);
  };
};

function initialize() {
  // 此处有循环依赖。若 ReactionBuilder 在顶级，
  // 且打包后比 SkillBuilder 出现的位置更早，则会发生错误
  class ReactionBuilder extends SkillBuilder<ReactionContextMeta> {
    constructor(private reaction: Reaction) {
      super(reaction);
    }
    done() {
      REACTION_DESCRIPTION[this.reaction] = (st, id, d) => {
        return this.getAction(d)(st, id);
      };
    }
  }

  function reaction(reaction: Reaction) {
    return enableShortcut(new ReactionBuilder(reaction)).do((c) => {
      Reflect.set(c, CALLED_FROM_REACTION, reaction);
    });
  }

  reaction(Reaction.Overloaded)
    .do((c, e) => {
      if (e.isActive) {
        c.switchActive(`${e.where} next`);
      }
    })
    .done();

  reaction(Reaction.Superconduct).do(pierceToOther).done();

  reaction(Reaction.ElectroCharged).do(pierceToOther).done();

  reaction(Reaction.Frozen)
    .do((c, e) => {
      c.characterStatus(Frozen, `character with id ${e.id}`);
    })
    .done();

  reaction(Reaction.SwirlCryo).do(swirl(DamageType.Cryo)).done();

  reaction(Reaction.SwirlHydro).do(swirl(DamageType.Hydro)).done();

  reaction(Reaction.SwirlPyro).do(swirl(DamageType.Pyro)).done();

  reaction(Reaction.SwirlElectro).do(swirl(DamageType.Electro)).done();

  reaction(Reaction.CrystallizeCryo).do(crystallize).done();

  reaction(Reaction.CrystallizeHydro).do(crystallize).done();

  reaction(Reaction.CrystallizePyro).do(crystallize).done();

  reaction(Reaction.CrystallizeElectro).do(crystallize).done();

  reaction(Reaction.Burning)
    .do((c, e) => {
      c.summon(BurningFlame, e.here);
    })
    .done();

  reaction(Reaction.Bloom)
    .do((c, e) => {
      if (!c.$(`${e.here} combat status with definition id 112081`)) {
        // 如果没有金杯的丰馈（妮露），就生成草原核
        c.combatStatus(DendroCore, e.here);
      }
    })
    .done();

  reaction(Reaction.Quicken)
    .do((c, e) => {
      c.combatStatus(CatalyzingField, e.here);
    })
    .done();
}

let initialized = false;
export function getReactionDescription(
  reaction: Reaction,
): ReactionDescription | null {
  if (!initialized) {
    initialized = true;
    initialize();
  }
  return REACTION_DESCRIPTION[reaction] ?? null;
}
