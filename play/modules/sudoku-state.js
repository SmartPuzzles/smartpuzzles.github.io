import {getSudokuCandidates} from './numbers.js';
export const SUDOKU_COLOURS=['#b74648','#c67c29','#a99a28','#3f966f','#388bad','#576bd0','#9855bc','#bb6096'];
export const DEFAULT_SUDOKU_SETTINGS=Object.freeze({autoCancel:true,coordinates:false,highlightAreas:true,highlightIdentical:true,highlightNotes:true});
const copy=x=>JSON.parse(JSON.stringify(x));
const clean=(v,n)=>Array.isArray(v)?[...new Set(v.filter(x=>Number.isInteger(x)&&x>=1&&x<=n))].sort((a,b)=>a-b):[];
const indexOK=(s,i)=>Number.isInteger(i)&&i>=0&&i<s.board.length**2;
export function areSudokuPeers(a,b,n){const br=n===6?2:3;return a!==b&&(Math.floor(a/n)===Math.floor(b/n)||a%n===b%n||(Math.floor(Math.floor(a/n)/br)===Math.floor(Math.floor(b/n)/br)&&Math.floor((a%n)/3)===Math.floor((b%n)/3)));}
export function createSudokuState(puzzle,saved=null){
 const n=puzzle.size,empty=()=>Array.from({length:n*n},()=>[]);
 const state={key:puzzle.key,board:copy(puzzle.puzzle),corner:empty(),center:empty(),colors:Array(n*n).fill(null),selected:puzzle.puzzle.flat().findIndex(v=>!v),mode:'regular',settings:{...DEFAULT_SUDOKU_SETTINGS}};
 if(!saved||saved.key!==puzzle.key)return state;
 const valid=Array.isArray(saved.board)&&saved.board.length===n&&saved.board.every((row,r)=>Array.isArray(row)&&row.length===n&&row.every((v,c)=>Number.isInteger(v)&&v>=0&&v<=n&&(!puzzle.puzzle[r][c]||puzzle.puzzle[r][c]===v)));
 if(!valid)return state;
 state.board=copy(saved.board);
 for(const kind of ['corner','center']){const source=saved[kind]||(kind==='center'?saved.notes:null);if(Array.isArray(source)&&source.length===n*n)state[kind]=source.map((v,i)=>state.board[Math.floor(i/n)][i%n]?[]:clean(v,n));}
 if(Array.isArray(saved.colors)&&saved.colors.length===n*n)state.colors=saved.colors.map(v=>Number.isInteger(v)&&v>=0&&v<SUDOKU_COLOURS.length?v:null);
 if(indexOK(state,saved.selected))state.selected=saved.selected;
 if(['regular','corner','center','color'].includes(saved.mode))state.mode=saved.mode;else if(saved.pencil)state.mode='center';
 for(const k of Object.keys(state.settings))if(typeof saved.settings?.[k]==='boolean')state.settings[k]=saved.settings[k];
 return state;
}
export function updateSudokuEntry(state,puzzle,index,value,mode=state.mode){
 if(!indexOK(state,index)||!Number.isInteger(value)||value<1||value>state.board.length)return {state,changed:false,reason:'invalid'};
 const n=state.board.length,r=Math.floor(index/n),c=index%n;
 if(puzzle.puzzle[r][c])return {state,changed:false,reason:'readonly'};
 if(mode==='color')return {state,changed:false,reason:'invalid'};
 if(mode!=='regular'&&state.board[r][c])return {state,changed:false,reason:'notesOnFilled'};
 const next=copy(state);next.selected=index;
 if(mode==='corner'||mode==='center')next[mode][index]=state[mode][index].includes(value)?state[mode][index].filter(v=>v!==value):[...state[mode][index],value].sort((a,b)=>a-b);
 else{
  if(state.board[r][c]===value)return {state,changed:false,reason:'noChange'};
  next.board[r][c]=value;next.corner[index]=[];next.center[index]=[];
  if(state.settings.autoCancel&&puzzle.solution[r][c]===value)for(let i=0;i<n*n;i++)if(areSudokuPeers(index,i,n)){next.corner[i]=next.corner[i].filter(v=>v!==value);next.center[i]=next.center[i].filter(v=>v!==value);}
 }
 return {state:next,changed:true,reason:null};
}
export function eraseSudokuEntry(state,puzzle,index,mode=state.mode){
 if(!indexOK(state,index))return {state,changed:false,reason:'invalid'};
 const n=state.board.length,r=Math.floor(index/n),c=index%n;
 if(mode!=='color'&&puzzle.puzzle[r][c])return {state,changed:false,reason:'readonly'};
 const next=copy(state);
 if(mode==='color')next.colors[index]=null;
 else if(mode==='corner'||mode==='center')next[mode][index]=[];
 else{next.board[r][c]=0;next.corner[index]=[];next.center[index]=[];}
 return {state:next,changed:JSON.stringify(state)!==JSON.stringify(next),reason:null};
}
export function setSudokuColor(state,index,color){
 if(!indexOK(state,index)||!(color===null||(Number.isInteger(color)&&color>=0&&color<SUDOKU_COLOURS.length)))return state;
 const next=copy(state);next.colors[index]=state.colors[index]===color?null:color;return next;
}
export function autoPencilState(state,puzzle){
 const next=copy(state);const n=next.board.length;
 for(let i=0;i<n*n;i++){
  const r=Math.floor(i/n),c=i%n;if(next.board[r][c]){next.center[i]=[];continue;}
  const candidates=getSudokuCandidates(next.board,r,c),old=state.center[i];
  const surviving=old.filter(v=>candidates.includes(v));
  next.center[i]=old.length&&surviving.length&&surviving.includes(puzzle.solution[r][c])?surviving:candidates;
 }
 next.mode='center';return next;
}
export function getSudokuHighlights(state,index){
 const n=state.board.length,s=state.selected,value=state.board[Math.floor(s/n)]?.[s%n];
 return {peer:state.settings.highlightAreas&&areSudokuPeers(s,index,n),identical:Boolean(state.settings.highlightIdentical&&value&&state.board[Math.floor(index/n)][index%n]===value),matchingNotes:Boolean(state.settings.highlightNotes&&value&&!state.board[Math.floor(index/n)][index%n]&&(state.center[index].includes(value)||state.corner[index].includes(value)))};
}
