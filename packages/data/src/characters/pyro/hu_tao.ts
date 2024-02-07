import { character, skill, status, card, DamageType } from "@gi-tcg/core/builder";

/**
 * @id 113072
 * @name 血梅香
 * @description
 * 结束阶段：对所附属角色造成1点火元素伤害。
 * 可用次数：1
 */
export const BloodBlossom = status(113072)
  .on("endPhase")
  .damage(DamageType.Pyro, 1, "@master")
  .done();

/**
 * @id 113071
 * @name 彼岸蝶舞
 * @description
 * 所附属角色造成的物理伤害变为火元素伤害，且角色造成的火元素伤害+1。
 * 所附属角色进行重击时：目标角色附属血梅香。
 * 持续回合：2
 */
export const ParamitaPapilio = status(113071)
  .duration(2)
  .on("modifySkillDamageType", (c, e) => e.type === DamageType.Physical)
  .changeDamageType(DamageType.Pyro)
  .on("modifySkillDamage", (c, e) => e.type === DamageType.Pyro)
  .increaseDamage(1)
  .done();

/**
 * @id 13071
 * @name 往生秘传枪法
 * @description
 * 造成2点物理伤害。
 */
export const SecretSpearOfWangsheng = skill(13071)
  .type("normal")
  .costPyro(1)
  .costVoid(2)
  .damage(DamageType.Physical, 2)
  .if((c) => c.self.hasStatus(ParamitaPapilio) && c.skillInfo.charged)
  .characterStatus(BloodBlossom, "opp active")
  .done();

/**
 * @id 13072
 * @name 蝶引来生
 * @description
 * 本角色附属彼岸蝶舞。
 */
export const GuideToAfterlife = skill(13072)
  .type("elemental")
  .costPyro(2)
  .characterStatus(ParamitaPapilio)
  .done();

/**
 * @id 13073
 * @name 安神秘法
 * @description
 * 造成4点火元素伤害，治疗自身2点。如果本角色生命值不多于6，则造成的伤害和治疗各+1。
 */
export const SpiritSoother = skill(13073)
  .type("burst")
  .costPyro(3)
  .costEnergy(3)
  .do((c) => {
    if (c.self.health <= 6) {
      c.damage(DamageType.Pyro, 5);
      c.heal(3, "@self");
    } else {
      c.damage(DamageType.Pyro, 4);
      c.heal(2, "@self");
    }
  })
  .done();

/**
 * @id 1307
 * @name 胡桃
 * @description
 * 「送走，全送走。」
 */
export const HuTao = character(1307)
  .tags("pyro", "pole", "liyue")
  .health(10)
  .energy(3)
  .skills(SecretSpearOfWangsheng, GuideToAfterlife, SpiritSoother)
  .done();

/**
 * @id 213071
 * @name 血之灶火
 * @description
 * 战斗行动：我方出战角色为胡桃时，装备此牌。
 * 胡桃装备此牌后，立刻使用一次蝶引来生。
 * 装备有此牌的胡桃在生命值不多于6时：造成的火元素伤害+1。
 * （牌组中包含胡桃，才能加入牌组）
 */
export const SanguineRouge = card(213071)
  .costPyro(2)
  .talent(HuTao)
  .on("enter")
  .useSkill(GuideToAfterlife)
  .on("modifySkillDamage", (c) => c.self.master().health <= 6)
  .increaseDamage(1)
  .done();
