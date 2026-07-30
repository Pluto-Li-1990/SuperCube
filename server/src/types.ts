export type PlayerSide = "A" | "B";
export type GameMode = "assault" | "survival" | "frenzy";

export interface MoveDTO {
  rotation: number;
  px: number;
  hardDrop: boolean;
  score?: number;
  gameOver?: boolean;
  linesCleared?: number;
  final?: boolean;
}

export interface PieceDefDTO {
  id: string;
  name: string;
  custom: boolean;
  cells: { x: number; y: number; element: number }[];
}

export type ClientMessage =
  | {
      type: "queue";
      name: string;
      bag?: PieceDefDTO[];
      selfBag?: PieceDefDTO[];
      oppBag?: PieceDefDTO[];
      accountToken?: string;
      gameMode?: GameMode;
    }
  | { type: "cancelQueue" }
  | { type: "turn"; matchId: string; turnIndex: number; move: MoveDTO }
  | { type: "finish"; matchId: string; score: number }
  | { type: "leave"; matchId: string }
  | { type: "ping"; t: number };

export type ServerMessage =
  | { type: "queued"; gameMode?: GameMode }
  | {
      type: "matchFound";
      matchId: string;
      seed: number;
      gameMode: GameMode;
      you: PlayerSide;
      opponent: { name: string };
      bags: { A: PieceDefDTO[]; B: PieceDefDTO[] };
    }
  | { type: "turn"; matchId: string; turnIndex: number; by: PlayerSide; move: MoveDTO }
  | { type: "finish"; matchId: string; by: PlayerSide; score: number }
  | { type: "opponentLeft"; matchId: string }
  | { type: "pong"; t: number }
  | { type: "error"; code: string; message: string };
