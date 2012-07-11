package lila
package ai

import chess.{ Game, Move }
import game.DbGame
import analyse.Analysis

import scalaz.effects._
import akka.dispatch.Future

trait Ai {

  def play(dbGame: DbGame, initialFen: Option[String]): Future[Valid[(Game, Move)]]

  def analyse(dbGame: DbGame, initialFen: Option[String]): Future[Valid[Analysis]]
}

object Ai {

  val levels = 1 to 8

  val levelBox = intBox(1 to 8) _
}
