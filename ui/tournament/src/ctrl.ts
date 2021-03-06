import makeSocket from './socket';
import xhr from './xhr';
import { myPage, players } from './pagination';
import * as sound from './sound';
import * as tour from './tournament';
import { TournamentData, TournamentOpts, Pages, PlayerInfo } from './interfaces';
import { TournamentSocket } from './socket';

export default class TournamentController {

  opts: TournamentOpts;
  data: TournamentData;
  trans: Trans;
  socket: TournamentSocket;
  page: number;
  pages: Pages = {};
  lastPageDisplayed: number | undefined;
  focusOnMe: boolean;
  joinSpinner: boolean = false;
  playerInfo: PlayerInfo = {};
  disableClicks: boolean = true;
  redraw: () => void;

  private watchingGameId: string;
  private lastStorage = window.lichess.storage.make('last-redirect');

  constructor(opts: TournamentOpts, redraw: () => void) {
    this.opts = opts;
    this.data = opts.data;
    this.redraw = redraw;
    this.trans = window.lichess.trans(opts.i18n);
    this.socket = makeSocket(opts.socketSend, this);
    this.page = this.data.standing.page;
    this.focusOnMe = tour.isIn(this);
    setTimeout(() => this.disableClicks = false, 1500);
    this.loadPage(this.data.standing);
    this.scrollToMe();
    sound.end(this.data);
    sound.countDown(this.data);
    this.redirectToMyGame();
    if (this.data.featured) this.startWatching(this.data.featured.id);
  }

  reload = (data: TournamentData): void => {
    // if (this.data.isStarted !== data.isStarted) m.redraw.strategy('all');
    this.data = data;
    if (data.playerInfo && data.playerInfo.player.id === this.playerInfo.id)
      this.playerInfo.data = data.playerInfo;
    this.loadPage(data.standing);
    if (this.focusOnMe) this.scrollToMe();
    if (data.featured) this.startWatching(data.featured.id);
    sound.end(data);
    sound.countDown(data);
    this.joinSpinner = false;
    this.redirectToMyGame();
  };

  private redirectToMyGame() {
    const gameId = tour.myCurrentGameId(this);
    if (gameId) this.redirectFirst(gameId);
  }

  redirectFirst = (gameId: string, rightNow?: boolean) => {
    const delay = (rightNow || document.hasFocus()) ? 10 : (1000 + Math.random() * 500);
    setTimeout(() => {
      if (this.lastStorage.get() !== gameId) {
        this.lastStorage.set(gameId);
        location.href = '/' + gameId;
      }
    }, delay);
  };

  loadPage = (data: TournamentData) => {
    this.pages[data.page] = data.players;
  }

  setPage = (page: number) => {
    this.page = page;
    xhr.loadPage(this, page);
  };

  userSetPage = (page: number) => {
    this.focusOnMe = false;
    this.setPage(page);
  };

  userNextPage = () => this.userSetPage(this.page + 1);
  userPrevPage = () => this.userSetPage(this.page - 1);
  userLastPage = () => this.userSetPage(players(this).nbPages);

  withdraw = () => {
    xhr.withdraw(this);
    this.joinSpinner = true;
    this.focusOnMe = false;
  };

  join = (password?: string) => {
    if (!this.data.verdicts.accepted)
    return this.data.verdicts.list.forEach(function(v) {
      if (v.verdict !== 'ok') alert(v.verdict);
    });
    xhr.join(this, password);
    this.joinSpinner = true;
    this.focusOnMe = true;
  };

  private startWatching(id: string) {
    if (id !== this.watchingGameId) {
      this.watchingGameId = id;
      setTimeout(() => this.socket.send("startWatching", id), 1000);
    }
  };

  scrollToMe = () => {
    const page = myPage(this);
    if (page && page !== this.page) this.setPage(page);
  };

  toggleFocusOnMe = () => {
    if (!this.data.me) return;
    this.focusOnMe = !this.focusOnMe;
    if (this.focusOnMe) this.scrollToMe();
  };

  showPlayerInfo = (player) => {
    const userId = player.name.toLowerCase();
    this.playerInfo = {
      id: this.playerInfo.id === userId ? null : userId,
      player: player,
      data: null
    };
    if (this.playerInfo.id) xhr.playerInfo(this, this.playerInfo.id);
  };

  setPlayerInfoData = (data) => {
    if (data.player.id !== this.playerInfo.id) return;
    this.playerInfo.data = data;
  };
}
