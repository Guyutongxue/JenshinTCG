// Copyright (C) 2024 theBowja, Guyutongxue
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

import { readJson } from "./json";
import { collateSkill, type SkillRawData } from "./skills";
import {
  getExcel,
  getLanguage,
  getPropNameWithMatch,
  sanitizeDescription,
  getDescriptionReplaced,
  sanitizeName,
  xcardview,
  propPlayingDescription2,
} from "./utils";

const xcard = getExcel("GCGCardExcelConfigData");

export interface EntityRawData {
  id: number;
  type: string;
  name: string;
  englishName: string;
  tags: string[];
  skills: SkillRawData[];
  rawDescription: string;
  description: string;
  rawPlayingDescription?: string;
  playingDescription?: string;

  hidden: boolean;
  buffType?: string;
  hintType?: string;
  shownToken?: string;

  /** summons only */
  cardFace?: string;

  /** status / combat status only */
  buffIcon?: string;
  buffIconHash?: string;
}

function getBuffIconFileName(iconHash?: number | bigint): string | undefined {
  const data = readJson(`${import.meta.dirname}/mappings/buff_icons.json`);
  return iconHash ? data[String(iconHash)] : void 0;
}

export async function collateEntities(langCode: string) {
  const locale = getLanguage(langCode);
  const english = getLanguage("EN");
  const result: EntityRawData[] = [];
  for (const obj of xcard) {
    if (
      ![
        "GCG_CARD_STATE", // 状态
        "GCG_CARD_MODIFY", // 装备
        "GCG_CARD_ONSTAGE", // 出战状态
        "GCG_CARD_SUMMON", // 召唤物
        "GCG_CARD_ASSIST", // 支援牌
      ].includes(obj.cardType)
    ) {
      // GCG_CARD_EVENT
      // console.log(obj.cardType);
      continue;
    }
    const hidden = !!obj.isHidden;

    if (!locale[obj.nameTextMapHash]) {
      continue;
    }

    const id = obj.id;
    if ([50, 51, 52, 53, 54, 17, 18].includes(Math.floor(id / 10000))) {
      // 热斗模式
      continue;
    }
    if (Math.floor(id / 10) === 13309) {
      // 骗骗花就算了吧
      continue;
    }
    const type = obj.cardType;
    const [name, englishName] = [locale, english].map((lc) =>
      sanitizeName(lc[obj.nameTextMapHash] ?? ""),
    );
    if (name === "") {
      continue;
    }

    const tags = obj.tagList.filter((e: any) => e !== "GCG_TAG_NONE");
    const skills: SkillRawData[] = [];
    // 当这是一张特技装备时，查找特技的技能定义
    if (tags.includes("GCG_TAG_VEHICLE")) {
      for (const skillId of obj.skillList) {
        const data = await collateSkill(langCode, skillId);
        if (data) {
          skills.push(data);
        }
      }
    }

    const rawDescription = locale[obj.descTextMapHash] ?? "";
    const descriptionReplaced = getDescriptionReplaced(rawDescription, locale);
    const description = sanitizeDescription(descriptionReplaced, true);

    const rawPlayingDescription: string | undefined =
      locale[obj.descOnTableTextMapHash] ??
      locale[obj[propPlayingDescription2]];
    let playingDescription: string | undefined = void 0;
    if (rawPlayingDescription) {
      const playingDescriptionReplaced = getDescriptionReplaced(
        rawPlayingDescription,
        locale,
      );
      playingDescription = sanitizeDescription(playingDescriptionReplaced);
    }

    const buffType = obj.stateBuffType;
    const hintType = obj.hintType;
    const shownToken = obj.tokenToShow;
    const buffIcon = getBuffIconFileName(obj.buffIconHash);
    if (obj.buffIconHash && !buffIcon) {
      console.warn(
        `Entity ${id} ${name}'s icon (${obj.buffIconHash}) file name is missing now`,
      );
    }
    const buffIconHash = obj.buffIconHash ? String(obj.buffIconHash) : void 0;

    const data: EntityRawData = {
      id,
      type,
      name,
      englishName,
      tags,
      skills,
      rawDescription,
      description,
      rawPlayingDescription,
      playingDescription,
      buffType,
      hintType,
      shownToken,
      hidden,
      buffIcon,
      buffIconHash,
    };

    if (type === "GCG_CARD_SUMMON") {
      const cardPrefabName = xcardview.find(
        (e) => e.id === obj.id,
      )!.cardPrefabName;
      data.cardFace = `UI_${cardPrefabName}`;
    }
    result.push(data);
  }
  return result;
}
