import { ContextOfEvent, EventHandlers, getSummon, SummonInfoWithId } from "@gi-tcg/data";
import { Entity, shallowClone } from "./entity.js";
import { SummonData } from "@gi-tcg/typings";
import { ContextFactory } from "./context.js";

export class Summon extends Entity {
  private readonly info: SummonInfoWithId;
  private handler: EventHandlers;
  private usage: number;
  shouldDispose = false;

  constructor(id: number) {
    super(id);
    this.info = getSummon(id);
    this.handler = new this.info.handlerCtor();
    this.usage = this.info.usage;
  }

  getData(): SummonData {
    return {
      entityId: this.entityId,
      id: this.id,
      value: this.usage,
    };
  }

  handleEvent<E extends keyof EventHandlers>(
    e: E,
    cf: ContextFactory<ContextOfEvent<E>>
  ) {
    const ctx = cf(this.entityId);
    if (ctx && typeof this.handler[e] === "function") {
      // @ts-ignore
      const result = await this.handler[e](c);
      if (result !== false) {
        this.usage--;
        if (this.usage === 0) {
          this.shouldDispose = true;
        }
      }
    }
  }

  clone() {
    const clone = shallowClone(this);
    clone.handler = shallowClone(this.handler);
    return clone;
  }
}
