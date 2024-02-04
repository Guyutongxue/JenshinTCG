import { DiceType } from "@gi-tcg/typings";
import {
  ActionInfo,
  DamageModifier0,
  DamageModifier1,
  SkillType,
  UseDiceModifier,
} from "../base/skill";
import { CardTag } from "../base/card";

/**
 * 检查该实体是否可以执行“切换角色行动视为快速行动”
 *
 * 若当前行动不是切换角色，或者切换角色已经是快速行动时，返回 `false`。
 * @param c `"beforeUseDice"` 的 `SkillContext`
 * @returns
 */
export function canSwitchFast(c: UseDiceModifier) {
  return c.currentAction.type === "switchActive" && !c.currentFast;
}

/**
 * 检查该实体是否可以执行“切换角色行动减少元素骰”
 *
 * 若当前行动不是切换角色，或者切换角色已经不消耗骰子时，返回 `false`。
 * @param c `"beforeUseDice"` 的 `SkillContext`
 * @returns
 */
export function canSwitchDeductCost(c: UseDiceModifier) {
  return c.currentAction.type === "switchActive" && c.currentCost.length >= 1;
}

/**
 * 检查该实体是否可以执行“打出手牌行动减少元素骰”
 *
 * 若当前行动不是打出手牌，或者切换角色已经不消耗骰子时，返回 `false`。
 * @param c `"beforeUseDice"` 的 `SkillContext`
 * @returns
 */
export function canPlayCardDeductCost(c: UseDiceModifier) {
  return c.currentAction.type === "playCard" && c.currentCost.length >= 1;
}

/**
 * 检查该实体是否可以执行“减少 x 元素骰”。
 * 如果当前骰子需求没有这种元素骰，则返回 `false`
 * @param c `"beforeUseDice"` 的 `SkillContext`
 * @returns
 */
export function canDeductCostType(c: UseDiceModifier, diceType: DiceType) {
  return c.currentCost.includes(diceType);
}

/**
 * 检查修改伤害的来源技能是否为普通攻击、元素战技或元素爆发
 * @param c `"beforeSkillDamage"` 的 `SkillContext`
 * @returns
 */
export function checkDamageSkillType(
  c: DamageModifier0 | DamageModifier1,
  skillType: SkillType,
) {
  return c.damageInfo.via.definition.skillType === skillType;
}

/**
 * 检查修改骰子的来源是否为普通攻击、元素战技或元素爆发
 * @param c `"beforeUseDice"` 的 `SkillContext`
 * @returns
 */
export function checkUseDiceSkillType(c: UseDiceModifier, skillType: SkillType) {
  return c.currentAction.type === "useSkill" && c.currentAction.skill.definition.skillType === skillType;
}

/**
 * 检查修改骰子的来源是否为“打出带某一标签的手牌”
 * @param c `"beforeUseDice"` 的 `SkillContext`
 * @param cardTag 要检查的标签
 * @returns
 */
export function checkCardTag(c: UseDiceModifier, cardTag: CardTag) {
  return (
    c.currentAction.type === "playCard" &&
    c.currentAction.card.definition.tags.includes(cardTag)
  );
}
