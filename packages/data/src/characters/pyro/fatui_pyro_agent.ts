import { character, skill, status, card, DamageType, SkillHandle } from "@gi-tcg/core/builder";

/**
 * @id 123012
 * @name 潜行
 * @description
 * 所附属角色受到的伤害-1，造成的伤害+1。
 * 可用次数：3
 * 所附属角色造成的物理伤害变为火元素伤害。
 */
export const Stealth01 = status(123012)
  .conflictWith(123011)
  .variable("usage", 3)
  .on("beforeDamaged")
  .decreaseDamage(1)
  .addVariable("usage", -1)
  .if((c) => c.getVariable("usage") <= 0)
  .dispose()
  .on("modifySkillDamage")
  .increaseDamage(1)
  .addVariable("usage", -1)
  .if((c) => c.getVariable("usage") <= 0)
  .dispose()
  .on("modifySkillDamageType", (c, e) => e.type === DamageType.Physical)
  .changeDamageType(DamageType.Pyro)
  .done();

/**
 * @id 123011
 * @name 潜行
 * @description
 * 所附属角色受到的伤害-1，造成的伤害+1。
 * 可用次数：2
 */
export const Stealth = status(123011)
  .conflictWith(123012)
  .variable("usage", 2)
  .on("beforeDamaged")
  .decreaseDamage(1)
  .addVariable("usage", -1)
  .if((c) => c.getVariable("usage") <= 0)
  .dispose()
  .on("modifySkillDamage")
  .increaseDamage(1)
  .addVariable("usage", -1)
  .if((c) => c.getVariable("usage") <= 0)
  .dispose()
  .done();

/**
 * @id 23011
 * @name 突刺
 * @description
 * 造成2点物理伤害。
 */
export const Thrust = skill(23011)
  .type("normal")
  .costPyro(1)
  .costVoid(2)
  .damage(DamageType.Physical, 2)
  .done();

/**
 * @id 23012
 * @name 伺机而动
 * @description
 * 造成1点火元素伤害，本角色附属潜行。
 */
export const Prowl: SkillHandle = skill(23012)
  .type("elemental")
  .costPyro(3)
  .damage(DamageType.Pyro, 1)
  .if((c) => c.self.hasEquipment(PaidInFull))
  .characterStatus(Stealth01)
  .else()
  .characterStatus(Stealth)
  .done();

/**
 * @id 23013
 * @name 焚毁之锋
 * @description
 * 造成5点火元素伤害。
 */
export const BladeAblaze = skill(23013)
  .type("burst")
  .costPyro(3)
  .costEnergy(2)
  .damage(DamageType.Pyro, 5)
  .done();

/**
 * @id 23014
 * @name 潜行大师
 * @description
 * 【被动】战斗开始时，初始附属潜行。
 */
export const StealthMaster = skill(23014)
  .type("passive")
  .on("battleBegin")
  .characterStatus(Stealth)
  .done();

/**
 * @id 2301
 * @name 愚人众·火之债务处理人
 * @description
 * 「死债不可免，活债更难逃…」
 */
export const FatuiPyroAgent = character(2301)
  .tags("pyro", "fatui")
  .health(9)
  .energy(2)
  .skills(Thrust, Prowl, BladeAblaze, StealthMaster)
  .done();

/**
 * @id 223011
 * @name 悉数讨回
 * @description
 * 战斗行动：我方出战角色为愚人众·火之债务处理人时，装备此牌。
 * 愚人众·火之债务处理人装备此牌后，立刻使用一次伺机而动。
 * 装备有此牌的愚人众·火之债务处理人生成的潜行获得以下效果：
 * 初始可用次数+1，并且使所附属角色造成的物理伤害变为火元素伤害。
 * （牌组中包含愚人众·火之债务处理人，才能加入牌组）
 */
export const PaidInFull = card(223011)
  .costPyro(3)
  .talent(FatuiPyroAgent)
  .on("enter")
  .useSkill(Prowl)
  .done();
