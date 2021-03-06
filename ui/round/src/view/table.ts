import { h } from 'snabbdom'
import { VNode } from 'snabbdom/vnode'
import { Position, MaybeVNodes } from '../interfaces';
import { game, status, Player }  from 'game';
import { renderClock } from '../clock/clockView';
import renderCorresClock from '../corresClock/corresClockView';
import renderReplay from './replay';
import * as renderUser from './user';
import * as button from './button';
import RoundController from '../ctrl';

function playerAt(ctrl: RoundController, position: Position) {
  return (ctrl.flip as any) ^ ((position === 'top') as any) ? ctrl.data.opponent : ctrl.data.player;
}

function topPlayer(ctrl: RoundController) {
  return playerAt(ctrl, 'top');
}

function bottomPlayer(ctrl: RoundController) {
  return playerAt(ctrl, 'bottom');
}

function renderPlayer(ctrl: RoundController, player: Player) {
  return player.ai ? h('div.username.user_link.online', [
    h('i.line'),
    h('name', renderUser.aiName(ctrl, player))
  ]) :
  renderUser.userHtml(ctrl, player);
}

function isLoading(ctrl: RoundController): boolean {
  return ctrl.loading || ctrl.redirecting;
}

function loader() { return h('span.ddloader'); }

function renderTableWith(ctrl: RoundController, buttons: MaybeVNodes) {
  return [
    renderReplay(ctrl),
    h('div.control.buttons', buttons),
    renderPlayer(ctrl, bottomPlayer(ctrl))
  ];
}

function renderTableEnd(ctrl: RoundController) {
  return renderTableWith(ctrl, [
    isLoading(ctrl) ? loader() : (button.backToTournament(ctrl) || button.followUp(ctrl))
  ]);
}

function renderTableWatch(ctrl: RoundController) {
  return renderTableWith(ctrl, [
    isLoading(ctrl) ? loader() : button.watcherFollowUp(ctrl)
  ]);
}

function tournamentStartWarning(ctrl: RoundController) {
  return h('div.suggestion', [
    h('div.text', { attrs: {'data-icon': 'j'} },
      ctrl.trans('youHaveNbSecondsToMakeYourFirstMove', ctrl.data.tournament!.nbSecondsForFirstMove))
  ]);
}

function renderTablePlay(ctrl: RoundController) {
  const d = ctrl.data,
  loading = isLoading(ctrl),
  submit = button.submitMove(ctrl),
  icons = (loading || submit) ? [] : [
    game.abortable(d) ? button.standard(ctrl, undefined, 'L', 'abortGame', 'abort') :
    button.standard(ctrl, game.takebackable, 'i', 'proposeATakeback', 'takeback-yes', ctrl.takebackYes),
    ctrl.drawConfirm ? button.drawConfirm(ctrl) : button.standard(ctrl, ctrl.canOfferDraw, '2', 'offerDraw', 'draw-yes', () => ctrl.offerDraw(true)),
    ctrl.resignConfirm ? button.resignConfirm(ctrl) : button.standard(ctrl, game.resignable, 'b', 'resign', 'resign-confirm', () => ctrl.resign(true))
  ],
  buttons: MaybeVNodes = loading ? [loader()] : (submit ? [submit] : [
    button.forceResign(ctrl),
    button.threefoldClaimDraw(ctrl),
    button.cancelDrawOffer(ctrl),
    button.answerOpponentDrawOffer(ctrl),
    button.cancelTakebackProposition(ctrl),
    button.answerOpponentTakebackProposition(ctrl),
    (d.tournament && game.nbMoves(d, d.player.color) === 0) ? tournamentStartWarning(ctrl) : null
  ]);
  return [
    renderReplay(ctrl),
    h('div.control.icons', {
      class: { 'confirm': !!(ctrl.drawConfirm || ctrl.resignConfirm) }
    }, icons),
    h('div.control.buttons', buttons),
    renderPlayer(ctrl, bottomPlayer(ctrl))
  ];
}

function whosTurn(ctrl: RoundController, color: Color) {
  var d = ctrl.data;
  if (status.finished(d) || status.aborted(d)) return;
  return h('div.whos_turn',
    d.game.player === color ? (
      d.player.spectator ? ctrl.trans(d.game.player + 'Plays') : ctrl.trans(
        d.game.player === d.player.color ? 'yourTurn' : 'waitingForOpponent'
      )
    ) : ''
  );
}

function anyClock(ctrl: RoundController, position: Position) {
  var player = playerAt(ctrl, position);
  if (ctrl.clock) return renderClock(ctrl, player, position);
  else if (ctrl.data.correspondence && ctrl.data.game.turns > 1)
  return renderCorresClock(
    ctrl.corresClock!, ctrl.trans, player.color, position, ctrl.data.game.player
  );
  else return whosTurn(ctrl, player.color);
}

export default function(ctrl: RoundController): VNode {
  const contents: MaybeVNodes = [
    renderPlayer(ctrl, topPlayer(ctrl)),
    h('div.table_inner',
      ctrl.data.player.spectator ? renderTableWatch(ctrl) : (
        game.playable(ctrl.data) ? renderTablePlay(ctrl) : renderTableEnd(ctrl)
      )
    )
  ];
  return h('div.table_wrap', [
    anyClock(ctrl, 'top'),
    h('div.table', contents),
    anyClock(ctrl, 'bottom')
  ]);
};
