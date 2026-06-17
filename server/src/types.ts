export type PlayerSide = "A" | "B";

export interface MoveDTO {
  rotation: number;
  px: number;
  hardDrop: true;
}

export interface PieceDefDTO {
  id: string;
  name: string;
  custom: boolean;
  cells: { x: number; y: number; element: number }[];
}

export type ClientMessage =
  | { type: "queue"; name: string; bag?: PieceDefDTO[] }
  | { type: "cancelQueue" }
  | { type: "turn"; matchId: string; turnIndex: number; move: MoveDTO }
  | { type: "leave"; matchId: string }
  | { type: "ping"; t: number };

export type ServerMessage =
  | { type: "queued" }
  | {
      type: "matchFound";
      matchId: string;
      seed: number;
      you: PlayerSide;
      opponent: { name: string };
      bags: { A: PieceDefDTO[]; B: PieceDefDTO[] };
    }
  | { type: "turn"; matchId: string; turnIndex: number; by: PlayerSide; move: MoveDTO }
  | { type: "opponentLeft"; matchId: string }
  | { type: "pong"; t: number }
  | { type: "error"; code: string; message: string };
