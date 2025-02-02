// Copyright (C) 2024-2025 Guyutongxue
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

import {
  DamageInfo,
  DamageOrHealEventArg,
  defineSkillInfo,
  DisposeEventArg,
  Event,
  EventAndRequest,
  EventArg,
  HealInfo,
  InitiativeSkillEventArg,
  SkillInfo,
  SwitchActiveEventArg,
  TriggeredSkillDefinition,
  UseSkillEventArg,
  ZeroHealthEventArg,
} from "./base/skill";
import { CharacterState, GameState, stringifyState } from "./base/state";
import { Aura, DamageType, ExposedMutation } from "@gi-tcg/typings";
import {
  allSkills,
  CallerAndTriggeredSkill,
  checkImmune,
  getActiveCharacterIndex,
  getEntityArea,
  getEntityById,
} from "./utils";
import { flip } from "@gi-tcg/utils";
import { DetailLogType } from "./log";
import { StateMutator } from "./mutator";
import { Mutation } from "./base/mutation";

export type GeneralSkillArg = EventArg | InitiativeSkillEventArg;

interface SkillExecutorConfig {
  readonly preview: boolean;
}

export class SkillExecutor {
  constructor(
    private mutator: StateMutator,
    private readonly config: SkillExecutorConfig,
  ) {}

  get state() {
    return this.mutator.state;
  }

  private mutate(mutation: Mutation) {
    this.mutator.mutate(mutation);
  }

  /**
   * 对技能返回的事件列表预处理。
   * - 将重复目标的“伤害事件”合并。
   * @param events
   */
  private static preprocessEventList(events: EventAndRequest[]) {
    const result: EventAndRequest[] = [];
    const damageEventIndexInResultBasedOnTarget = new Map<number, number>();
    for (const event of events) {
      const [name, arg] = event;
      if (name === "onDamageOrHeal" && arg.isDamageTypeDamage()) {
        const previousIndex = damageEventIndexInResultBasedOnTarget.get(
          arg.target.id,
        );
        if (previousIndex) {
          // combine current event with previous event
          const previousArg = result[
            previousIndex
          ][1] as DamageOrHealEventArg<DamageInfo>;
          const combinedDamageInfo: DamageInfo = {
            ...previousArg.damageInfo,
            value: previousArg.damageInfo.value + arg.damageInfo.value,
            causeDefeated:
              previousArg.damageInfo.causeDefeated ||
              arg.damageInfo.causeDefeated,
            fromReaction:
              previousArg.damageInfo.fromReaction ||
              arg.damageInfo.fromReaction,
          };
          result[previousIndex][1] = new DamageOrHealEventArg(
            previousArg.onTimeState,
            combinedDamageInfo,
          );
        } else {
          damageEventIndexInResultBasedOnTarget.set(
            arg.target.id,
            result.length,
          );
          result.push(event);
        }
      } else {
        result.push(event);
      }
    }
    return result;
  }

  /**
   * 执行并应用技能效果，返回执行过程中触发的事件列表
   * @param skillInfo
   * @param arg
   * @returns
   */
  private executeSkill(
    skillInfo: SkillInfo,
    arg: GeneralSkillArg,
  ): EventAndRequest[] {
    if (this.state.phase === "gameEnd") {
      return [];
    }
    using l = this.mutator.subLog(
      DetailLogType.Skill,
      `Using skill [skill:${skillInfo.definition.id}]${
        skillInfo.charged ? " (charged)" : ""
      }${skillInfo.plunging ? " (plunging)" : ""}`,
    );
    this.mutator.log(
      DetailLogType.Other,
      `skill caller: ${stringifyState(skillInfo.caller)}`,
    );
    const skillDef = skillInfo.definition;

    // const preExposedMutations: ExposedMutation[] = [];
    // if (
    //   skillInfo.caller.definition.skills.find((sk) => sk.id === skillDef.id)
    // ) {
    //   preExposedMutations.push({
    //     $case: "triggered",
    //     entityId: skillInfo.caller.id,
    //     entityDefinitionId: skillInfo.caller.definition.id,
    //   });
    // }
    this.mutator.notify({
      mutations: skillInfo.preExposedMutations,
    });

    const [newState, eventList] = (0, skillDef.action)(
      this.state,
      {
        ...skillInfo,
        isPreview: this.config.preview,
        mutatorConfig: this.mutator.config,
      },
      arg as any,
    );
    this.mutator.resetState(newState);
    return SkillExecutor.preprocessEventList(eventList);
  }

  async finalizeSkill(
    skillInfo: SkillInfo,
    arg: GeneralSkillArg,
  ): Promise<void> {
    if (this.state.phase === "gameEnd") {
      return;
    }
    const eventList = this.executeSkill(skillInfo, arg);
    await this.mutator.notifyAndPause();

    const nonDamageEvents: EventAndRequest[] = [];
    const damageEventArgs: DamageOrHealEventArg<DamageInfo>[] = [];
    const zeroHealthEventArgs: ZeroHealthEventArg[] = [];

    const failedPlayers = new Set<0 | 1>();

    for (const event of eventList) {
      const [name, arg] = event;
      if (name === "onDamageOrHeal" && arg.isDamageTypeDamage()) {
        if (arg.damageInfo.causeDefeated) {
          // Wrap original EventArg to ZeroHealthEventArg
          const zeroHealthEventArg = new ZeroHealthEventArg(
            arg.onTimeState,
            arg.damageInfo,
          );
          if (checkImmune(this.state, zeroHealthEventArg)) {
            zeroHealthEventArgs.push(zeroHealthEventArg);
          } else {
            const { id } = arg.target;
            const ch = getEntityById(this.state, id) as CharacterState;
            const { who } = getEntityArea(this.state, id);
            if (ch.variables.alive) {
              this.mutator.log(
                DetailLogType.Primitive,
                `${stringifyState(ch)} is defeated (and no immune available)`,
              );
              this.mutate({
                type: "modifyEntityVar",
                state: ch,
                varName: "alive",
                value: 0,
              });
              this.mutate({
                type: "modifyEntityVar",
                state: ch,
                varName: "energy",
                value: 0,
              });
              this.mutate({
                type: "modifyEntityVar",
                state: ch,
                varName: "aura",
                value: Aura.None,
              });
              this.mutate({
                type: "setPlayerFlag",
                who,
                flagName: "hasDefeated",
                value: true,
              });
              const player = this.state.players[who];
              const aliveCharacters = player.characters.filter(
                (ch) => ch.variables.alive,
              );
              if (aliveCharacters.length === 0) {
                failedPlayers.add(who);
              }
            }
          }
          damageEventArgs.push(zeroHealthEventArg);
        } else {
          damageEventArgs.push(arg);
        }
      } else {
        nonDamageEvents.push(event);
      }
    }

    if (failedPlayers.size === 2) {
      this.mutator.log(
        DetailLogType.Other,
        `Both player has no alive characters, set winner to null`,
      );
      this.mutate({
        type: "changePhase",
        newPhase: "gameEnd",
      });
      await this.mutator.notifyAndPause();
      return;
    } else if (failedPlayers.size === 1) {
      const who = [...failedPlayers.values()][0];
      this.mutator.log(
        DetailLogType.Other,
        `player ${who} has no alive characters, set winner to ${flip(who)}`,
      );
      this.mutate({
        type: "changePhase",
        newPhase: "gameEnd",
      });
      this.mutate({
        type: "setWinner",
        winner: flip(who),
      });
      await this.mutator.notifyAndPause();
      return;
    }
    const safeDamageEvents = damageEventArgs.filter(
      (arg) => !arg.damageInfo.causeDefeated,
    );
    const criticalDamageEvents = damageEventArgs.filter(
      (arg) => arg.damageInfo.causeDefeated,
    );
    if (criticalDamageEvents.length > 0) {
      await this.mutator.notifyAndPause();
    }

    for (const arg of zeroHealthEventArgs) {
      nonDamageEvents.push(
        ...this.handleEventShallow(["modifyZeroHealth", arg]),
      );
      if (arg._immuneInfo !== null) {
        this.mutator.log(
          DetailLogType.Primitive,
          `${stringifyState(arg.target)} is immune to defeated. Revive him to ${
            arg._immuneInfo.newHealth
          }`,
        );
        const source = arg._immuneInfo.skill.caller;
        const healValue = arg._immuneInfo.newHealth;
        const healInfo: HealInfo = {
          type: DamageType.Heal,
          cancelled: false,
          healKind: "revive",
          source,
          via: arg._immuneInfo.skill,
          target: arg.target,
          expectedValue: healValue,
          value: healValue,
          causeDefeated: false,
          fromReaction: null,
        };
        this.mutate({
          type: "modifyEntityVar",
          state: arg.target,
          varName: "health",
          value: healValue,
        });
        await this.mutator.notifyAndPause({
          mutations: [
            {
              $case: "damage",
              damageType: healInfo.type,
              value: healInfo.value,
              sourceId: healInfo.source.id,
              sourceDefinitionId: healInfo.source.definition.id,
              targetId: healInfo.target.id,
              targetDefinitionId: healInfo.target.definition.id,
            },
          ],
        });
        const healEventArg = new DamageOrHealEventArg(
          arg.onTimeState,
          healInfo,
        );
        nonDamageEvents.push(
          ...this.handleEventShallow(["onDamageOrHeal", healEventArg]),
        );
      }
    }

    if (
      skillInfo.caller.definition.type === "character" &&
      skillInfo.definition.triggerOn === "initiative"
    ) {
      // 增加此回合技能计数
      const ch = getEntityById(
        this.state,
        skillInfo.caller.id,
      ) as CharacterState;
      this.mutate({
        type: "pushRoundSkillLog",
        // intentional bug here: 使用技能发起时的定义 id 而非当前的定义 id
        // e.g. 艾琳不会对导致变身的若陀龙王的技能计数
        caller: /* ch */ skillInfo.caller as CharacterState,
        skillId: skillInfo.definition.id,
      });
      // 增加充能
      if (skillInfo.definition.initiativeSkillConfig.gainEnergy) {
        if (ch.variables.alive) {
          this.mutator.log(
            DetailLogType.Other,
            `using skill gain 1 energy for ${stringifyState(ch)}`,
          );
          const currentEnergy = ch.variables.energy;
          const newEnergy = Math.min(currentEnergy + 1, ch.variables.maxEnergy);
          this.mutate({
            type: "modifyEntityVar",
            state: ch,
            varName: "energy",
            value: newEnergy,
          });
          await this.mutator.notifyAndPause();
        }
      }
    }

    await this.handleEvent(...nonDamageEvents);
    for (const arg of safeDamageEvents) {
      await this.handleEvent(["onDamageOrHeal", arg]);
    }
    for (const arg of criticalDamageEvents) {
      await this.handleEvent(["onDamageOrHeal", arg]);
    }
    // 接下来处理出战角色倒下后的切人
    // 仅当本次技能的使用造成倒下时才会处理
    if (criticalDamageEvents.length === 0) {
      return;
    }
    const switchEvents: [
      null | Promise<SwitchActiveEventArg>,
      null | Promise<SwitchActiveEventArg>,
    ] = [null, null];
    for (const who of [0, 1] as const) {
      const player = this.state.players[who];
      const [activeCh] = player.characters.shiftLeft(
        getActiveCharacterIndex(player),
      );
      if (activeCh.variables.alive) {
        continue;
      }
      this.mutator.log(
        DetailLogType.Other,
        `Active character of player ${who} is defeated. Waiting user choice`,
      );
      switchEvents[who] = this.mutator.chooseActive(who).then(
        (to) =>
          new SwitchActiveEventArg(this.state, {
            type: "switchActive",
            who,
            from: activeCh,
            to,
            fromReaction: false,
          }),
      );
    }
    const args = await Promise.all(switchEvents);
    const currentTurn = this.state.currentTurn;
    for (const arg of args) {
      if (arg) {
        using l = this.mutator.subLog(
          DetailLogType.Primitive,
          `Player ${arg.switchInfo.who} switch active from ${stringifyState(
            arg.switchInfo.from,
          )} to ${stringifyState(arg.switchInfo.to)}`,
        );
        this.mutate({
          type: "switchActive",
          who: arg.switchInfo.who,
          value: arg.switchInfo.to,
        });
        this.mutator.notify({
          mutations: [
            {
              $case: "switchActive",
              who: arg.switchInfo.who,
              characterId: arg.switchInfo.to.id,
              characterDefinitionId: arg.switchInfo.to.definition.id,
            },
          ],
        });
      }
    }
    for (const who of [currentTurn, flip(currentTurn)]) {
      const arg = args[who];
      if (arg) {
        await this.handleEvent(["onSwitchActive", arg]);
      }
    }
  }

  /**
   * 将事件广播到当前棋盘，查找响应该事件的全部技能定义
   * @param event
   * @returns 响应该事件的技能定义及其 caller 的列表
   */
  private broadcastEvent(event: Event) {
    const [name, arg] = event;
    const callerAndSkills: CallerAndTriggeredSkill[] = [];
    // 对于弃置事件，额外地使被弃置的实体本身也能响应
    if (arg instanceof DisposeEventArg) {
      const caller = arg.entity;
      const onDisposeSkills = caller.definition.skills.filter(
        (sk): sk is TriggeredSkillDefinition => sk.triggerOn === name,
      );
      callerAndSkills.push(
        ...onDisposeSkills.map((skill) => ({ caller, skill })),
      );
    }
    // 收集其它待响应技能
    callerAndSkills.push(...allSkills(this.state, name));
    return callerAndSkills;
  }

  /**
   * 执行监听 `event` 事件的技能。此过程并不结算这些技能：技能中引发的级联事件将作为结果返回。
   * @param event
   * @returns
   */
  private handleEventShallow(event: Event) {
    const [name, arg] = event;
    const callerAndSkills = this.broadcastEvent(event);
    const emittedEvents: EventAndRequest[] = [];
    for (const { caller, skill } of callerAndSkills) {
      const skillInfo = defineSkillInfo({
        caller,
        definition: skill,
      });
      if (!(0, skill.filter)(this.state, skillInfo, arg)) {
        continue;
      }
      arg._currentSkillInfo = skillInfo;
      emittedEvents.push(...this.executeSkill(skillInfo, arg));
    }
    return emittedEvents;
  }

  /**
   * 处理事件 `events`。监听它们的技能将会被递归结算。
   * @param events
   */
  async handleEvent(...events: EventAndRequest[]) {
    for (const event of events) {
      const [name, arg] = event;
      if (name === "requestReroll") {
        using l = this.mutator.subLog(
          DetailLogType.Event,
          `request player ${arg.who} to reroll`,
        );
        await this.mutator.reroll(arg.who, arg.times);
      } else if (name === "requestSwitchHands") {
        using l = this.mutator.subLog(
          DetailLogType.Event,
          `request player ${arg.who} to switch hands`,
        );
        await this.mutator.switchHands(arg.who);
      } else if (name === "requestSelectCard") {
        using l = this.mutator.subLog(
          DetailLogType.Event,
          `request player ${arg.who} to select card`,
        );
        const events = await this.mutator.selectCard(arg.who, arg.info);
        await this.handleEvent(...events);
      } else if (name === "requestUseSkill") {
        using l = this.mutator.subLog(
          DetailLogType.Event,
          `another skill [skill:${arg.requestingSkillId}] is requested:`,
        );
        const player = this.state.players[arg.who];
        const activeCh = player.characters[getActiveCharacterIndex(player)];
        const callerArea = getEntityArea(this.state, activeCh.id);
        if (
          activeCh.entities.find((et) =>
            et.definition.tags.includes("disableSkill"),
          )
        ) {
          this.mutator.log(
            DetailLogType.Other,
            `Skill [skill:${
              arg.requestingSkillId
            }] (requested by ${stringifyState(
              arg.via.caller,
            )}) is requested, but current active character ${stringifyState(
              activeCh,
            )} is marked as skill-disabled`,
          );
          continue;
        }
        const skillDef = activeCh.definition.skills.find(
          (sk) => sk.id === arg.requestingSkillId,
        );
        if (!skillDef || !skillDef.initiativeSkillConfig) {
          this.mutator.log(
            DetailLogType.Other,
            `Skill [skill:${
              arg.requestingSkillId
            }] (requested by ${stringifyState(
              arg.via.caller,
            )}) is not available on current active character ${stringifyState(
              activeCh,
            )}`,
          );
          continue;
        }
        const skillType = skillDef.initiativeSkillConfig.skillType;
        const charged = skillType === "normal" && player.canCharged;
        const plunging =
          skillType === "normal" &&
          (player.canPlunging ||
            activeCh.entities.some((et) =>
              et.definition.tags.includes("normalAsPlunging"),
            ));
        const skillInfo = defineSkillInfo({
          caller: activeCh,
          definition: skillDef,
          requestBy: arg.via,
          charged,
          plunging,
        });
        await this.finalizeSkill(skillInfo, { targets: [] });
        await this.handleEvent([
          "onUseSkill",
          new UseSkillEventArg(this.state, callerArea, skillInfo),
        ]);
      } else if (name === "requestTriggerEndPhaseSkill") {
        using l = this.mutator.subLog(
          DetailLogType.Event,
          `Triggering end phase skills of ${arg.requestedEntity}`,
        );
        for (const skill of arg.requestedEntity.definition.skills) {
          if (skill.triggerOn !== "onEndPhase") {
            continue;
          }
          const skillInfo = defineSkillInfo({
            caller: arg.requestedEntity,
            definition: skill,
            requestBy: arg.via,
          });
          const eventArg = new EventArg(this.state);
          await this.finalizeSkill(skillInfo, eventArg);
        }
      } else {
        using l = this.mutator.subLog(
          DetailLogType.Event,
          `Handling event ${name} (${arg.toString()}):`,
        );
        const callerAndSkills = this.broadcastEvent(event);
        for (const { caller, skill } of callerAndSkills) {
          const skillInfo = defineSkillInfo({
            caller,
            definition: skill,
            preExposedMutations: [
              {
                $case: "triggered",
                entityId: caller.id,
                entityDefinitionId: caller.definition.id,
              },
            ],
          });
          if (!(0, skill.filter)(this.state, skillInfo, arg)) {
            continue;
          }
          arg._currentSkillInfo = skillInfo;
          await this.finalizeSkill(skillInfo, arg);
        }
      }
    }
  }

  getState() {
    return this.state;
  }

  static async executeSkill(
    mutator: StateMutator,
    skill: SkillInfo,
    arg: GeneralSkillArg,
  ) {
    const executor = new SkillExecutor(mutator, { preview: false });
    await executor.finalizeSkill(skill, arg);
    return executor.state;
  }
  static async handleEvent(mutator: StateMutator, ...event: EventAndRequest) {
    return SkillExecutor.handleEvents(mutator, [event]);
  }
  static async handleEvents(mutator: StateMutator, events: EventAndRequest[]) {
    const executor = new SkillExecutor(mutator, { preview: false });
    await executor.handleEvent(...events);
    return executor.state;
  }
}
