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

import {
  Show,
  createResource,
  Switch,
  Match,
  For,
  createSignal,
} from "solid-js";
import { useUserContext } from "../App";
import { Layout } from "../layouts/Layout";
import { A, useNavigate } from "@solidjs/router";
import axios from "axios";
import { DeckBriefInfo } from "../components/DeckBriefInfo";
import { CreateRoomDialog } from "../components/CreateRoomDialog";
import { JoinRoomDialog } from "../components/JoinRoomDialog";

export function Home() {
  const { user } = useUserContext();
  const navigate = useNavigate();
  const [decks] = createResource(() => axios.get("decks"));

  const [roomNumberValid, setRoomNumberValid] = createSignal(false);
  let createRoomDialogEl: HTMLDialogElement;
  let joinRoomDialogEl: HTMLDialogElement;
  const [roomNumber, setRoomNumber] = createSignal("");

  const createRoom = () => {
    if (!decks()?.data.count) {
      alert("请先创建一组牌组");
      navigate("/decks/new");
      return;
    }
    createRoomDialogEl.showModal();
  };
  const joinRoom = (e: SubmitEvent) => {
    e.preventDefault();
    if (!decks()?.data.count) {
      alert("请先创建一组牌组");
      navigate("/decks/new");
      return;
    }
    const form = new FormData(e.target as HTMLFormElement);
    setRoomNumber(form.get("roomNumber") as string);
    joinRoomDialogEl.showModal();
  };

  return (
    <Layout>
      <div class="container mx-auto">
        <Show
          when={user()}
          fallback={
            <div class="flex flex-row gap-1 justify-center text-xl my-8">
              请先
              <A href="/login" class="text-blue-500">
                登录
              </A>
              或
              <A href="/register" class="text-blue-500">
                注册
              </A>
            </div>
          }
        >
          {(user) => (
            <div class="flex flex-col">
              <div class="flex-shrink-0 mb-8">
                <h2 class="text-3xl font-light">
                  {user().name ?? `旅行者 ${user().id}`}，欢迎你！
                </h2>
              </div>
              <div class="flex flex-row h-120 gap-8">
                <div class="h-full w-60 flex flex-col bottom-opacity-gradient">
                  <A
                    href="/decks"
                    class="text-xl font-bold text-blue-500 hover:underline mb-4"
                  >
                    我的牌组
                  </A>
                  <Switch>
                    <Match when={decks.loading}>
                      <div class="text-gray-500">牌组信息加载中…</div>
                    </Match>
                    <Match when={decks.error}>
                      <div class="text-gray-500">牌组信息加载失败</div>
                    </Match>
                    <Match when={decks()}>
                      {(decks) => (
                        <div class="flex flex-col gap-2">
                          <For
                            each={decks().data.data}
                            fallback={
                              <div class="text-gray-500">
                                暂无牌组，
                                <A href="/decks/new" class="text-blue-500">
                                  前往添加
                                </A>
                              </div>
                            }
                          >
                            {(deckData) => <DeckBriefInfo {...deckData} />}
                          </For>
                        </div>
                      )}
                    </Match>
                  </Switch>
                </div>
                <div class="b-r-gray-200 b-1" />
                <div class="flex-grow flex flex-col">
                  <h4 class="text-xl font-bold mb-5">开始游戏</h4>
                  <div class="flex flex-row gap-5 items-center mb-8">
                    <button
                      class="flex-shrink-0 w-[20%] btn btn-solid-green text-1em gap-0.5em"
                      onClick={createRoom}
                    >
                      创建房间
                    </button>
                    或者
                    <form
                      class="flex-grow flex flex-row gap-3"
                      onSubmit={joinRoom}
                    >
                      <input
                        class="input input-outline"
                        name="roomNumber"
                        placeholder="输入房间号"
                        inputmode="numeric"
                        pattern="\d{6}"
                        onInput={(e) =>
                          setRoomNumberValid(e.target.checkValidity())
                        }
                        autofocus
                        required
                      />
                      <button
                        type="submit"
                        class="flex-shrink-0 btn btn-solid text-1em gap-0.5em"
                        disabled={!roomNumberValid()}
                      >
                        加入房间
                      </button>
                    </form>
                  </div>
                  <h4 class="text-xl font-bold mb-5">可观战的对局</h4>
                </div>
              </div>
            </div>
          )}
        </Show>
        <CreateRoomDialog ref={createRoomDialogEl!} />
        <JoinRoomDialog ref={joinRoomDialogEl!} roomNumber={roomNumber()} />
      </div>
    </Layout>
  );
}
