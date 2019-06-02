export type Action = 'ready' |  'skip';

// Client is a user connected via a socket
export interface Client {
  name: string;
  ready:boolean;
}
// Player is a client connected to a live game
export interface Player {
  name: string;

}
export interface GameState {
  turn:number;
  inProgress:boolean;
  players:Player[];
  BE_version:string;// Version of backend code
}

export interface SocketData {
  action:Action;
  playerName:string;
}