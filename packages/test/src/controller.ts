import {
  ActionRequest,
  ActionResponse,
  AnyState,
  ChooseActiveRequest,
  ChooseActiveResponse,
  Game,
  GameState,
  PlayCardAction,
  PlayerConfig,
  RpcMethod,
  RpcRequest,
  RpcResponse,
  SelectCardRequest,
  SelectCardResponse,
  SwitchActiveAction,
  SwitchHandsResponse,
  UseSkillAction,
} from "@gi-tcg/core";
import {
  CardHandle,
  CharacterHandle,
  DiceType,
  SkillHandle,
} from "@gi-tcg/core/builder";
import { Ref } from "./setup";
import { expect, Matchers } from "bun:test";

class IoController {
  constructor(
    private controller: TestController,
    private who: 0 | 1,
  ) {}

  private get awaitingRpc(): AwaitingRpc | null {
    // @ts-expect-error private prop
    const rpc = this.controller.awaitingRpc;
    return rpc;
  }

  private listAvailableActions() {
    const rpc = this.awaitingRpc;
    if (!rpc || rpc.method !== "action") {
      throw new Error("Not awaiting action");
    }
    if (rpc.who !== this.who) {
      throw new Error("Not your turn");
    }
    return rpc.request.action!.action;
  }

  private generateCost(length: number) {
    return Array.from({ length }, () => DiceType.Omni);
  }

  async skill(id: SkillHandle, ...targets: Ref[]) {
    await this.controller.stepToNextAction();
    const actions = this.listAvailableActions();
    const chosenActionIndex = actions.findIndex((a) => {
      if (!a.useSkill) return false;
      if (a.useSkill.skillId !== id) return false;
      if (a.useSkill.targetIds.length !== targets.length) return false;
      return a.useSkill.targetIds.every((t, i) => t === targets[i].id);
    });
    if (chosenActionIndex === -1) {
      throw new Error(`You cannot use skill ${id} (with given targets)`);
    }
    const action = actions[chosenActionIndex].useSkill!;
    const usedDice = this.generateCost(
      action.requiredCost.reduce(
        (a, { type, count }) => (a + type === DiceType.Energy ? 0 : count),
        0,
      ),
    );
    const response: ActionResponse = { chosenActionIndex, usedDice };
    this.awaitingRpc!.resolve({ action: response });
  }
  async card(targetOrId: CardHandle | Ref, ...targets: Ref[]) {
    await this.controller.stepToNextAction();
    const actions = this.listAvailableActions();
    let cardId: number;
    if (targetOrId instanceof Ref) {
      cardId = targetOrId.id;
    } else {
      const card = this.findHand(targetOrId);
      if (!card) {
        throw new Error(`Cannot find card ${targetOrId} in your hands`);
      }
      cardId = card.id;
    }
    const chosenActionIndex = actions.findIndex((a) => {
      if (!a.playCard) return false;
      if (a.playCard.cardId !== cardId) return false;
      if (a.playCard.targetIds.length !== targets.length) return false;
      return a.playCard.targetIds.every((t, i) => t === targets[i].id);
    });
    if (chosenActionIndex === -1) {
      throw new Error(`You cannot play card ${cardId} (with given targets)`);
    }
    const action = actions[chosenActionIndex].playCard!;
    const usedDice = this.generateCost(
      action.requiredCost.reduce(
        (a, { type, count }) => (a + type === DiceType.Energy ? 0 : count),
        0,
      ),
    );
    const response: ActionResponse = { chosenActionIndex, usedDice };
    this.awaitingRpc!.resolve({ action: response });
  }
  async tune(targetOrId: CardHandle | Ref) {
    await this.controller.stepToNextAction();
    const actions = this.listAvailableActions();
    let cardId: number;
    if (targetOrId instanceof Ref) {
      cardId = targetOrId.id;
    } else {
      const card = this.findHand(targetOrId);
      if (!card) {
        throw new Error(`Cannot find card ${targetOrId} in your hands`);
      }
      cardId = card.id;
    }
    const chosenActionIndex = actions.findIndex((a) => {
      if (!a.elementalTuning) return false;
      return a.elementalTuning.removedCardId === cardId;
    });
    if (chosenActionIndex === -1) {
      throw new Error(`You cannot tune card ${cardId}`);
    }
    const usedDice = this.generateCost(1);
    const response: ActionResponse = { chosenActionIndex, usedDice };
    this.awaitingRpc!.resolve({ action: response });
  }
  async switch(targetOrId: CharacterHandle | Ref) {
    await this.controller.stepToNextAction();
    const actions = this.listAvailableActions();
    let characterId: number;
    if (targetOrId instanceof Ref) {
      characterId = targetOrId.id;
    } else {
      const character = this.findCharacter(targetOrId);
      if (!character) {
        throw new Error(`Cannot find character ${targetOrId}`);
      }
      characterId = character.id;
    }
    const chosenActionIndex = actions.findIndex((a) => {
      if (!a.switchActive) return false;
      return a.switchActive.characterId === characterId;
    });
    if (chosenActionIndex === -1) {
      throw new Error(`You cannot switch to character ${characterId}`);
    }
    const action = actions[chosenActionIndex].switchActive!;
    const usedDice = this.generateCost(
      action.requiredCost.reduce(
        (a, { type, count }) => (a + type === DiceType.Energy ? 0 : count),
        0,
      ),
    );
    const response: ActionResponse = { chosenActionIndex, usedDice };
    this.awaitingRpc!.resolve({ action: response });
  }
  async end() {
    await this.controller.stepToNextAction();
    const actions = this.listAvailableActions();
    const chosenActionIndex = actions.findIndex((a) => a.declareEnd);
    if (chosenActionIndex === -1) {
      throw new Error("You cannot declare end (wtf?)");
    }
    const response: ActionResponse = { chosenActionIndex, usedDice: [] };
    this.awaitingRpc!.resolve({ action: response });
  }

  findCharacter(definitionId: number) {
    const player = this.controller.state.players[this.who];
    return player.characters.find((c) => c.definition.id === definitionId);
  }
  findHand(definitionId: number) {
    const player = this.controller.state.players[this.who];
    return player.hands.find((c) => c.definition.id === definitionId);
  }

  async selectCard(id: number) {
    await this.controller.stepToNextAction();
    const rpc = this.awaitingRpc;
    if (!rpc || rpc.method !== "selectCard") {
      throw new Error("Not awaiting selectCard");
    }
    if (rpc.who !== this.who) {
      throw new Error("Not your turn");
    }
    const candidates = rpc.request.selectCard!.candidateDefinitionIds;
    if (!candidates.includes(id)) {
      throw new Error(`Cannot select card ${id}`);
    }
    const response: SelectCardResponse = { selectedDefinitionId: id };
    rpc.resolve({ selectCard: response });
  }
  async chooseActive(targetOrId: CharacterHandle | Ref) {
    await this.controller.stepToNextAction();
    const rpc = this.awaitingRpc;
    if (!rpc || rpc.method !== "chooseActive") {
      throw new Error("Not awaiting chooseActive");
    }
    if (rpc.who !== this.who) {
      throw new Error("Not your turn");
    }
    let activeCharacterId: number;
    if (targetOrId instanceof Ref) {
      activeCharacterId = targetOrId.id;
    } else {
      const character = this.findCharacter(targetOrId);
      if (!character) {
        throw new Error(`Cannot find character ${targetOrId}`);
      }
      activeCharacterId = character.id;
    }
    const candidates = rpc.request.chooseActive!.candidateIds;
    if (!candidates.includes(activeCharacterId)) {
      throw new Error(`Cannot choose character ${activeCharacterId}`);
    }
    const response: ChooseActiveResponse = { activeCharacterId };
    rpc.resolve({ chooseActive: response });
  }
  async switchHands(removed: (CardHandle | Ref)[]) {
    await this.controller.stepToNextAction();
    const rpc = this.awaitingRpc;
    if (!rpc || rpc.method !== "switchHands") {
      throw new Error("Not awaiting switchHands");
    }
    if (rpc.who !== this.who) {
      throw new Error("Not your turn");
    }
    let removedHandIds: number[] = [];
    // 先移除指定 id 的（Ref），再移除通过定义指定的
    for (const card of removed) {
      if (card instanceof Ref) {
        removedHandIds.push(card.id);
      }
    }
    for (const card of removed) {
      if (!(card instanceof Ref)) {
        const found = this.findHand(card);
        if (!found) {
          throw new Error(`Cannot find card ${card} in your hands`);
        }
        removedHandIds.push(found.id);
      }
    }
    const response = { removedHandIds };
    rpc.resolve({ switchHands: response });
  }
  // async reroll() {}
}

class AwaitingRpc {
  private readonly resolver: PromiseWithResolvers<RpcResponse> =
    Promise.withResolvers();
  constructor(
    public readonly who: 0 | 1,
    public readonly method: RpcMethod,
    public readonly request: RpcRequest,
  ) {}

  resolve(response: RpcResponse) {
    if (!(this.method in response)) {
      throw new Error(`Response does not have ${this.method}`);
    }
    this.resolver.resolve(response);
  }

  get promise() {
    return this.resolver.promise;
  }
}

export class TestController {
  public readonly me = new IoController(this, 0);
  public readonly opp = new IoController(this, 1);

  public readonly game: Game;

  constructor(initState: GameState) {
    this.game = new Game(initState);
    // TODO: enable reroll
    const playerConfig: PlayerConfig = {
      allowTuningAnyDice: true,
      alwaysOmni: true,
    };
    this.game.players[0].config = playerConfig;
    this.game.players[1].config = playerConfig;
    this.game.players[0].io.rpc = async (request) => {
      const response = await this.rpc(0, request);
      return response;
    };
    this.game.onIoError = console.error;
    this.game.players[1].io.rpc = async (request) => {
      const response = await this.rpc(1, request);
      return response;
    };
  }

  start() {
    this.game.start().then((winner) => {
      this.stepping?.reject(new Error("Game ended, no more action"));
    });
  }

  private stepping = Promise.withResolvers<void>();
  private awaitingRpc: AwaitingRpc | null = null;
  private async rpc(who: 0 | 1, request: RpcRequest) {
    const method = Object.keys(request)[0] as RpcMethod;
    if (this.awaitingRpc) {
      throw new Error(
        `Previous rpc (${this.awaitingRpc.who} ${this.awaitingRpc.method}) is not resolved, cannot send another rpc (${who} ${method})`,
      );
    }
    this.awaitingRpc = new AwaitingRpc(who, method, request);
    this.stepping.resolve();
    const response = await this.awaitingRpc.promise;
    this.awaitingRpc = null;
    this.stepping = Promise.withResolvers();
    return response;
  }

  get state() {
    return this.game.state;
  }

  query(query: string): AnyState[] {
    return this.game.query(0, query);
  }

  expect(query: string): Matchers;
  expect(ref: Ref): Matchers;
  expect(what: string | Ref): Matchers {
    if (what instanceof Ref) {
      what = `any with id ${what.id}`;
    }
    return expect(this.query(what));
  }

  /** 步进到下一次行动 */
  async stepToNextAction() {
    await this.stepping.promise;
    return this;
  }
}
