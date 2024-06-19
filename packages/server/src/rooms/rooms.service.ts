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
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import {
  type ActionRequest,
  type ActionResponse,
  type ChooseActiveRequest,
  type ChooseActiveResponse,
  type GameConfig,
  type GameStateLogEntry,
  GiTcgError,
  Game as InternalGame,
  type NotificationMessage,
  type PlayerConfig,
  type PlayerIO,
  type RerollDiceResponse,
  type RpcMethod,
  type RpcRequest,
  type RpcResponse,
  type SwitchHandsResponse,
  serializeGameStateLog,
  CORE_VERSION,
  VERSIONS,
  type Version
} from "@gi-tcg/core";
import data from "@gi-tcg/data";
import { type Deck, flip } from "@gi-tcg/utils";
import { BehaviorSubject, Observable, Subject, filter, startWith } from "rxjs";
import { verifyDeck } from "../utils";
import type {
  CreateRoomDto,
  PlayerActionResponseDto,
} from "./rooms.controller";
import { DecksService } from "../decks/decks.service";
import { UsersService, type UserNoPassword } from "../users/users.service";
import { GamesService } from "../games/games.service";

interface RoomConfig extends Partial<GameConfig> {
  initTotalActionTime: number; // defaults 45
  rerollTime: number; // defaults 40
  roundTotalActionTime: number; // defaults 60
  actionTime: number; // defaults 25
  watchable: boolean; // defaults false
  private: boolean; // defaults false
  gameVersion?: Version;
}

interface CreateRoomConfig extends RoomConfig {
  hostWho: 0 | 1;
}

interface PlayerIOWithError extends PlayerIO {
  // notify: (notification: NotificationMessage) => void;
  // rpc: (method: RpcMethod, params: RpcRequest[RpcMethod]) => Promise<any>;
  onError: (e: GiTcgError) => void;
}

interface PlayerInfo {
  userId: number;
  userName: string | null;
  deck: Deck;
}

export interface SSEInitialized {
  type: "initialized";
  who: 0 | 1;
  oppPlayerInfo: PlayerInfo;
}

export interface SSENotification {
  type: "notification";
  data: NotificationMessage;
}
export interface SSEError {
  type: "error";
  message: string;
}
export type SSEPayload = SSEInitialized | SSENotification | SSEError;

export interface SSERpc {
  type: "rpc";
  id: number;
  timeout: number;
  method: RpcMethod;
  params: RpcRequest[RpcMethod];
}

interface RpcResolver {
  id: number;
  method: RpcMethod;
  params: any;
  timeout: number;
  resolve: (response: any) => void;
}

class Player implements PlayerIOWithError {
  private readonly notificationSseSource = new Subject<SSEPayload>();
  public notificationSse$?: Observable<SSEPayload>;
  private readonly rpcSseSource = new BehaviorSubject<SSERpc | null>(null);
  public rpcSse$: Observable<SSERpc> = this.rpcSseSource.pipe(
    filter((rpc): rpc is SSERpc => rpc !== null),
  );
  constructor(
    public readonly user: UserNoPassword,
    public readonly deck: Deck,
  ) {}
  giveUp = false;

  private _nextRpcId = 0;
  private _rpcResolver: RpcResolver | null = null;
  private _timeoutConfig: RoomConfig | null = null;
  private _roundTimeout = Infinity;

  get playerInfo(): PlayerInfo {
    return {
      userId: this.user.id,
      userName: this.user.name,
      deck: this.deck,
    };
  }

  setTimeoutConfig(config: RoomConfig) {
    this._timeoutConfig = config;
    this._roundTimeout = this._timeoutConfig?.initTotalActionTime ?? Infinity;
  }
  resetRoundTimeout() {
    this._roundTimeout = this._timeoutConfig?.roundTotalActionTime ?? Infinity;
  }
  currentAction() {
    if (this._rpcResolver) {
      return {
        id: this._rpcResolver.id,
        timeout: this._rpcResolver.timeout,
        method: this._rpcResolver.method,
        params: this._rpcResolver.params,
      };
    } else {
      return null;
    }
  }

  receiveResponse(response: PlayerActionResponseDto) {
    if (!this._rpcResolver) {
      throw new NotFoundException(`No rpc now`);
    } else if (this._rpcResolver.id !== response.id) {
      throw new NotFoundException(`Rpc id not match`);
    }
    this._rpcResolver.resolve(response.response);
  }

  notify(notification: NotificationMessage) {
    this.notificationSseSource.next({
      type: "notification",
      data: notification,
    });
  }

  private timeoutRpc(method: RpcMethod, params: RpcRequest[RpcMethod]) {
    if (method === "action") {
      const { candidates } = params as ActionRequest;
      const declareEndIdx = candidates.findIndex(
        (c) => c.type === "declareEnd",
      );
      const result: ActionResponse = {
        chosenIndex: declareEndIdx,
        cost: [],
      };
      return result;
    } else if (method === "chooseActive") {
      const { candidates } = params as ChooseActiveRequest;
      const result: ChooseActiveResponse = {
        active: candidates[0]!,
      };
      return result;
    } else if (method === "rerollDice") {
      const result: RerollDiceResponse = {
        rerollIndexes: [],
      };
      return result;
    } else if (method === "switchHands") {
      const result: SwitchHandsResponse = {
        removedHands: [],
      };
      return result;
    }
  }

  async rpc(method: RpcMethod, params: RpcRequest[RpcMethod]): Promise<any> {
    const id = this._nextRpcId++;
    // 当前回合剩余时间
    const roundTimeout = this._roundTimeout;
    // 本行动可用时间
    let timeout: number;
    // 行动结束后，计算新的回合剩余时间
    let setRoundTimeout: (remained: number) => void;
    if (method === "rerollDice") {
      timeout = this._timeoutConfig?.rerollTime ?? Infinity;
      setRoundTimeout = () => {};
    } else {
      timeout = roundTimeout + (this._timeoutConfig?.actionTime ?? Infinity);
      setRoundTimeout = (remain) => {
        this._roundTimeout = Math.min(roundTimeout, remain + 1);
      };
    }
    const payload: SSERpc = { type: "rpc", id, timeout, method, params };
    this.rpcSseSource.next(payload);
    return new Promise((resolve) => {
      const resolver: RpcResolver = {
        id,
        method,
        params,
        timeout,
        resolve: (r) => {
          clearInterval(interval);
          setRoundTimeout(resolver.timeout);
          this._rpcResolver = null;
          resolve(r);
        },
      };
      this._rpcResolver = resolver;
      const interval = setInterval(() => {
        resolver.timeout--;
        if (resolver.timeout <= -2) {
          clearInterval(interval);
          setRoundTimeout(0);
          this._rpcResolver = null;
          resolve(this.timeoutRpc(method, params));
        }
      }, 1000);
    });
  }

  onError(e: GiTcgError) {
    this.notificationSseSource.next({ type: "error", message: e.message });
  }
  onInitialized(who: 0 | 1, opp: PlayerInfo) {
    this.notificationSse$ = this.notificationSseSource.pipe(
      startWith<SSEPayload>({
        type: "initialized",
        who,
        oppPlayerInfo: opp,
      }),
    );
  }
  complete() {
    this.notificationSseSource.complete();
    this.rpcSseSource.complete();
  }
}

type GameStopHandler = (room: Room, game: InternalGame) => void;

export interface RoomInfo {
  id: number;
  started: boolean;
  watchable: boolean;
  players: PlayerInfo[];
}

class Room {
  public static readonly CORE_VERSION = CORE_VERSION;
  private game: InternalGame | null = null;
  private hostWho: 0 | 1;
  private host: Player | null = null;
  private guest: Player | null = null;
  private stateLog: GameStateLogEntry[] = [];
  private terminated = false;
  private onStopHandlers: GameStopHandler[] = [];

  constructor(public readonly config: CreateRoomConfig) {
    this.hostWho = config.hostWho;
  }
  getHost() {
    return this.host;
  }
  getGuest() {
    return this.guest;
  }
  private get players(): [Player | null, Player | null] {
    return this.hostWho === 0 ? [this.host, this.guest] : [this.guest, this.host];
  }
  getPlayer(who: 0 | 1): Player | null {
    return this.players[who];
  }
  getPlayers(): Player[] {
    return this.players.filter((player): player is Player => player !== null);
  }
  get started() {
    return this.game !== null;
  }

  setHost(player: Player) {
    if (this.host !== null) {
      throw new ConflictException("host already set");
    }
    this.host = player;
    return this.hostWho;
  }
  setGuest(player: Player) {
    if (this.guest !== null) {
      throw new ConflictException("guest already set");
    }
    this.guest = player;
    return flip(this.hostWho);
  }
  start() {
    if (this.terminated) {
      throw new ConflictException("room terminated");
    }
    const [player0, player1] = this.players;
    if (player0 === null || player1 === null) {
      throw new ConflictException("player not ready");
    }
    verifyDeck(player0.deck);
    verifyDeck(player1.deck);
    player0.setTimeoutConfig(this.config);
    player1.setTimeoutConfig(this.config);
    const game = new InternalGame({
      data: data(this.config.gameVersion),
      gameConfig: this.config,
      playerConfigs: [player0.deck, player1.deck],
      io: {
        pause: async (state, mutations, canResume) => {
          this.stateLog.push({ state, canResume });
          for (const mut of mutations) {
            if (mut.type === "changePhase" && mut.newPhase === "roll") {
              player0.resetRoundTimeout();
              player1.resetRoundTimeout();
            }
          }
        },
        players: [player0, player1],
        onIoError: (e) => {
          player0.onError(e);
          player1.onError(e);
        },
      },
    });
    player0.onInitialized(0, player1.playerInfo);
    player1.onInitialized(1, player0.playerInfo);
    (async () => {
      try {
        this.game = game;
        await game.start();
      } catch (e) {
        if (e instanceof GiTcgError) {
          player0.onError(e);
          player1.onError(e);
        } else {
          throw e;
        }
      }
      player0.complete();
      player1.complete();
      for (const cb of this.onStopHandlers) {
        cb(this, game);
      }
    })();
  }

  onStop(cb: GameStopHandler) {
    this.onStopHandlers.push(cb);
  }

  getStateLog() {
    return serializeGameStateLog(this.stateLog);
  }

  getRoomInfo(id: number): RoomInfo {
    return {
      id,
      started: this.started,
      watchable: this.config.watchable,
      players: this.getPlayers().map((player) => player.playerInfo),
    };
  }
}

// const A = 48271;
// const A_INV = 371631; // A^-1 in Z_1000000

@Injectable()
export class RoomsService {
  private rooms: (Room | null)[] = Array.from(
    { length: 1_000_000 },
    () => null,
  );

  constructor(
    private users: UsersService,
    private decks: DecksService,
    private games: GamesService,
  ) {}

  async createRoom(hostUserId: number, params: CreateRoomDto) {
    const allRooms = this.getAllRooms();
    const user = await this.users.findById(hostUserId);
    if (user === null) {
      throw new NotFoundException(`User ${hostUserId} not found`);
    }
    if (
      allRooms.some((room) =>
        room.players.some((player) => player.userId === hostUserId),
      )
    ) {
      throw new ConflictException(`User ${hostUserId} is already in a room`);
    }
    const deck = await this.decks.getDeck(hostUserId, params.hostDeckId);
    if (deck === null) {
      throw new NotFoundException(`Deck ${params.hostDeckId} not found`);
    }

    const hostWho =
      typeof params.hostFirst === "undefined"
        ? Math.random() > 0.5
          ? 0
          : 1
        : params.hostFirst
          ? 0
          : 1;
    const roomConfig: CreateRoomConfig = {
      hostWho,
      randomSeed: params.randomSeed,
      gameVersion: params.gameVersion,
      initTotalActionTime: params.initTotalActionTime ?? 45,
      rerollTime: params.rerollTime ?? 40,
      roundTotalActionTime: params.roundTotalActionTime ?? 60,
      actionTime: params.actionTime ?? 25,
      watchable: params.watchable ?? false,
      private: params.private ?? false,
    };
    const roomId = this.rooms.indexOf(null);
    if (roomId === -1) {
      throw new InternalServerErrorException("no room available");
    }
    const room = new Room(roomConfig);
    this.rooms[roomId] = room;
    room.onStop(() => {
      this.rooms[roomId] = null;
    });
    room.setHost(new Player(user, deck));
    return {
      roomId,
    };
  }

  deleteRoom(userId: number, roomId: number) {
    const room = this.rooms[roomId];
    if (!room) {
      throw new NotFoundException(`Room ${roomId} not found`);
    }
    if (room.started) {
      throw new ConflictException(`Room ${roomId} already started`);
    }
    if (room.getHost()?.user.id !== userId) {
      throw new UnauthorizedException(`You are not the host of room ${roomId}`);
    }
    this.rooms[roomId] = null;
  }

  async joinRoom(userId: number, roomId: number, deckId: number) {
    const allRooms = this.getAllRooms();
    const room = this.rooms[roomId];
    if (!room) {
      throw new NotFoundException(`Room ${roomId} not found`);
    }
    if (room.started) {
      throw new ConflictException(`Room ${roomId} already started`);
    }
    const user = await this.users.findById(userId);
    if (user === null) {
      throw new NotFoundException(`User ${userId} not found`);
    }
    if (
      allRooms.some((room) =>
        room.players.some((player) => player.userId === userId),
      )
    ) {
      throw new ConflictException(`User ${userId} is already in a room`);
    }
    const deck = await this.decks.getDeck(userId, deckId);
    if (deck === null) {
      throw new NotFoundException(`Deck ${deckId} not found`);
    }
    room.setGuest(new Player(user, deck));
    // Add to game database when room stopped
    room.onStop((room, game) => {
      const playerIds = room.getPlayers().map((player) => player.user.id);
      const winnerWho = game.state.winner;
      const winner = winnerWho === null ? null : room.getPlayer(winnerWho);
      this.games.addGame({
        coreVersion: Room.CORE_VERSION,
        gameVersion: game.gameVersion,
        data: JSON.stringify(room.getStateLog()),
        winnerId: winner?.user.id ?? null,
        playerIds,
      });
    });
    room.start();
  }

  getRoom(roomId: number): RoomInfo {
    const room = this.rooms[roomId];
    if (!room) {
      throw new NotFoundException(`Room not found`);
    }
    return room.getRoomInfo(roomId);
  }

  getAllRooms(): RoomInfo[] {
    const result: RoomInfo[] = [];
    for (let i = 0; i < this.rooms.length; i++) {
      const room = this.rooms[i];
      if (room && !room.config.private) {
        result.push(room.getRoomInfo(i));
      }
    }
    return result;
  }

  playerNotification(
    roomId: number,
    visitorUserId: number,
    watchingUserId: number,
  ): Observable<SSEPayload> {
    const room = this.rooms[roomId];
    if (!room) {
      throw new NotFoundException(`Room not found`);
    }
    const players = room.getPlayers();
    const playerUserIds = players.map((player) => player.user.id);
    if (!playerUserIds.includes(watchingUserId)) {
      throw new NotFoundException(`User ${watchingUserId} not in room`);
    }
    if (!room.config.watchable && visitorUserId !== watchingUserId) {
      throw new UnauthorizedException(
        `Room ${roomId} cannot be watched by other user`,
      );
    }
    if (
      playerUserIds.includes(visitorUserId) &&
      visitorUserId !== watchingUserId
    ) {
      throw new UnauthorizedException(
        `You cannot watch ${watchingUserId}, he is your opponent!`,
      );
    }
    for (const player of players) {
      if (player.user.id === watchingUserId) {
        const observable = player.notificationSse$;
        if (!observable) {
          throw new ConflictException(`Player has not been initialized`);
        }
        return observable;
      }
    }
    throw new InternalServerErrorException("unreachable");
  }

  playerAction(roomId: number, userId: number) {
    const room = this.rooms[roomId];
    if (!room) {
      throw new NotFoundException(`Room not found`);
    }
    const players = room.getPlayers();
    for (const player of players) {
      if (player.user.id === userId) {
        return player.rpcSse$;
      }
    }
    throw new NotFoundException(`User ${userId} not in room`);
  }

  receivePlayerResponse(
    roomId: number,
    userId: number,
    response: PlayerActionResponseDto,
  ) {
    const room = this.rooms[roomId];
    if (!room) {
      throw new NotFoundException(`Room not found`);
    }
    const players = room.getPlayers();
    for (const player of players) {
      if (player.user.id === userId) {
        player.receiveResponse(response);
        return;
      }
    }
    throw new NotFoundException(`User ${userId} not in room`);
  }

  receivePlayerGiveUp(roomId: number, userId: number) {
    const room = this.rooms[roomId];
    if (!room) {
      throw new NotFoundException(`Room not found`);
    }
    const players = room.getPlayers();
    for (const player of players) {
      if (player.user.id === userId) {
        player.giveUp = true;
        return;
      }
    }
    throw new NotFoundException(`User ${userId} not in room`);
  }
}
