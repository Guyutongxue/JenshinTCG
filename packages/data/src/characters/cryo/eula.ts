import { character, skill, summon, status, card, DamageType } from "@gi-tcg/core/builder";

/**
 * @id 111062
 * @name 光降之剑
 * @description
 * 优菈使用「普通攻击」或「元素战技」时：此牌累积2点「能量层数」，但是优菈不会获得充能。
 * 结束阶段：弃置此牌，造成3点物理伤害；每有1点「能量层数」，都使此伤害+1。
 * （影响此牌「可用次数」的效果会作用于「能量层数」。）
 */
const LightfallSword = summon(111062)
  // TODO
  .done();

/**
 * @id 111061
 * @name 冷酷之心
 * @description
 * 所附属角色使用冰潮的涡旋时：移除此状态，使本次伤害+3。
 */
const Grimheart = status(111061)
  // TODO
  .done();

/**
 * @id 11061
 * @name 西风剑术·宗室
 * @description
 * 造成2点物理伤害。
 */
const FavoniusBladeworkEdel = skill(11061)
  .type("normal")
  .costCryo(1)
  .costVoid(2)
  // TODO
  .done();

/**
 * @id 11062
 * @name 冰潮的涡旋
 * @description
 * 造成2点冰元素伤害，如果本角色未附属冷酷之心，则使其附属冷酷之心。
 */
const IcetideVortex = skill(11062)
  .type("elemental")
  .costCryo(3)
  // TODO
  .done();

/**
 * @id 11063
 * @name 凝浪之光剑
 * @description
 * 造成2点冰元素伤害，召唤光降之剑。
 */
const GlacialIllumination = skill(11063)
  .type("burst")
  .costCryo(3)
  .costEnergy(2)
  // TODO
  .done();

/**
 * @id 1106
 * @name 优菈
 * @description
 * 这只是一场游戏，无论是取胜或落败，你都不会因此被添上罪状。
 */
const Eula = character(1106)
  .tags("cryo", "claymore", "mondstadt")
  .skills(FavoniusBladeworkEdel, IcetideVortex, GlacialIllumination)
  .done();

/**
 * @id 211061
 * @name 战欲涌现
 * @description
 * 战斗行动：我方出战角色为优菈时，装备此牌。
 * 优菈装备此牌后，立刻使用一次凝浪之光剑。
 * 装备有此牌的优菈使用冰潮的涡旋时：额外为光降之剑累积1点「能量层数」。
 * （牌组中包含优菈，才能加入牌组）
 */
const WellspringOfWarlust = card(211061)
  .costCryo(3)
  .costEnergy(2)
  .talentOf(Eula)
  .equipment()
  // TODO
  .done();
