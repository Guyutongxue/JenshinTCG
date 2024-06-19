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
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

import { For, Match, Show, Switch, createResource, createEffect } from "solid-js";
import { useUserContext } from "../App";
import { Layout } from "../layouts/Layout";
import axios from "axios";
import { A, useNavigate } from "@solidjs/router";
import { DeckBriefInfo } from "../components/DeckBriefInfo";

export function Decks() {
  const { user } = useUserContext();
  const [decks, { refetch }] = createResource(() => axios.get("decks"));
  createEffect(() => {
    console.log(user());
    // console.log(decks()?.data);
  })
  return (
    <Layout>
      <Show when={user()}>
        {(user) => (
          <div class="container mx-auto">
            <div class="flex flex-row gap-4 items-center mb-5">
              <h2 class="text-2xl font-bold">我的牌组</h2>
              <A class="btn btn-outline-green" href="/decks/new">
                <i class="i-mdi-plus" /> 添加
              </A>
            </div>
            <Switch>
              <Match when={decks.loading}>正在加载中...</Match>
              <Match when={decks.error}>加载失败，请刷新页面重试</Match>
              <Match when={decks()}>
                {(decks) => (
                  <ul class="flex flex-row flex-wrap gap-3">
                    <For
                      each={decks().data.data}
                      fallback={
                        <li class="p-4 text-gray-5">暂无牌组，可点击 + 添加</li>
                      }
                    >
                      {(deckData) => (
                        <DeckBriefInfo
                          editable
                          onDelete={() => refetch()}
                          {...deckData}
                        />
                      )}
                    </For>
                  </ul>
                )}
              </Match>
            </Switch>
          </div>
        )}
      </Show>
    </Layout>
  );
}
