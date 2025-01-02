import { ref, setup, Character, State, Status, Card, Equipment } from "#test";
import { MondstadtHashBrown } from "@gi-tcg/data/internal/cards/event/food";
import { test } from "bun:test";
import { ThunderManifestation, GrievingEcho, LightningRod, StrifefulLightning } from "@gi-tcg/data/internal/characters/electro/thunder_manifestation";

test("thunder manifestation: talent works on 'disposed' status", async () => {
  const target = ref();
  const talent = ref();
  const c = setup(
    <State>
      <Character opp active />
      <Character opp health={10} ref={target}>
        <Status def={LightningRod} />
      </Character>
      <Character my def={ThunderManifestation}>
        <Equipment def={GrievingEcho} ref={talent} />
      </Character>
      <Card my pile def={MondstadtHashBrown} />
    </State>,
  );
  c.expect("my hand cards").toBeArrayOfSize(0);
  await c.me.skill(StrifefulLightning);
  await c.stepToNextAction();
  // 雷鸣探知弃置，伤害 +1
  c.expect(`status with definition id ${LightningRod}`).toBeArrayOfSize(0);
  c.expect(`with id ${target.id}`).toHaveVariable("health", 6);
  // 我方抽牌
  c.expect("my hand cards").toBeArrayOfSize(1);
  // 我方天赋每回合使用次数归零
  c.expect(`with id ${talent.id}`).toHaveVariable("usagePerRound", 0);
});
