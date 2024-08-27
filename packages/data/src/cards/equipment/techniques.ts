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

import { card } from "@gi-tcg/core/builder";

/**
 * @id 115102
 * @name 竹星
 * @description
 * 特技：仙力助推
 * 可用次数：2
 * （角色最多装备1个「特技」）
 * 【仙力助推】治疗所附属角色2点，并使其下次普通攻击视为下落攻击，伤害+1，并且技能结算后造成1点风元素伤害。
 */
export const Starwicker = card(115102)
  .technique()
  .since("v5.0.0")
  // TODO
  .done();

/**
 * @id 122051
 * @name 水泡史莱姆
 * @description
 * 特技：水泡战法
 * 可用次数：2
 * （角色最多装备1个「特技」）
 * 【水泡战法】（需准备1个行动轮）造成1点水元素伤害，敌方出战角色附属水泡围困。
 * 【水泡封锁】造成1点水元素伤害，敌方出战角色附属水泡围困。
 * 【水泡封锁】造成1点水元素伤害，敌方出战角色附属水泡围困。
 */
export const MistBubbleSlime = card(122051)
  .technique()
  .since("v5.0.0")
  // TODO
  .done();

/**
 * @id 313001
 * @name 异色猎刀鳐
 * @description
 * 特技：原海水刃
 * 可用次数：2
 * （角色最多装备1个「特技」）
 * 【原海水刃】造成2点物理伤害。
 */
export const XenochromaticHuntersRay = card(313001)
  .technique()
  .since("v5.0.0")
  // TODO
  .done();

/**
 * @id 313002
 * @name 匿叶龙
 * @description
 * 特技：钩物巧技
 * 可用次数：2
 * （角色最多装备1个「特技」）
 * 【钩物巧技】造成1点物理伤害，窃取1张原本元素骰费用最高的对方手牌。
 * 如果我方手牌数不多于2，此特技少花费1个元素骰。
 * 【】
 */
export const Yumkasaurus = card(313002)
  .costSame(1)
  .technique()
  .since("v5.0.0")
  // TODO
  .done();

/**
 * @id 313003
 * @name 鳍游龙
 * @description
 * 特技：游隙灵道
 * 可用次数：2
 * （角色最多装备1个「特技」）
 * 【游隙灵道】选择一个我方「召唤物」，立刻触发其「结束阶段」效果。（每回合最多使用1次）
 * 【】
 */
export const Koholasaurus = card(313003)
  .costSame(2)
  .technique()
  .since("v5.0.0")
  // TODO
  .done();
