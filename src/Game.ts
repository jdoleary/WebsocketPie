import chalk from 'chalk';
import { GameState, Player, SocketData} from './interfaces';

export default class Game {
    state: GameState;
    onGameEnded: ()=>void;
    emit: (name:string, data:object)=>void;
    constructor(onGameEnded:()=>void, emit:(name:string, data:object)=>void){
        this.state = {
            turn: 0,
            inProgress:false,
            players:[],
            BE_version:process.env.npm_package_version
        };
        this.onGameEnded = onGameEnded;
        this.emit = emit;
    }
    public begin(playerNames: string[]) {
      console.log(chalk.green('Game | Begin the game'));
      this.state.inProgress = true;

    }
    public onData(data:SocketData){
        console.log(chalk.blue(`Game | data: ${JSON.stringify(data, null, 2)}`));
        const {action, playerName} = data;

        const player = this.getPlayer(playerName);
        if(!player){
          console.log(chalk.red(`ERR: player ${playerName} does not exist`));
          return;
        }
        switch (action){
          case 'ready':
          break;
          case 'skip':
          break;
        } 
    }

    private endGame(){
      this.state.inProgress = false;
      this.state.turn = 0;
      this.state.players = [];
      // Tell the room that the game has ended:
      this.onGameEnded();
    }
    private getPlayer(name: string): Player | undefined{
        return this.state.players.find(p => p.name === name);
    }
    
    private checkWinConditions() {
        // if(win condition){
        //   this.endGame();
        // }
    
    }

}