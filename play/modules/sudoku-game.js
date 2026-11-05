import {validateSudoku} from './numbers.js';
import {getSudokuCoach,applySudokuCoachAction} from './sudoku-coach.js?v=20261105-reason';
import {createSudokuState,updateSudokuEntry,eraseSudokuEntry,setSudokuColor,autoPencilState,getSudokuHighlights,SUDOKU_COLOURS} from './sudoku-state.js';
import {SUDOKU_UI_TEXT} from './sudoku-ui-text.js?v=20261105-notice';
import {createWebRewards,createGoogleWebRewardProvider} from './web-rewards.js';
const copy=x=>JSON.parse(JSON.stringify(x));
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const colourInk=['#fff','#000','#000','#000','#000','#fff','#fff','#000'];
const coordinate=(r,c)=>String.fromCharCode(65+r)+(c+1);
const read=k=>{try{return JSON.parse(localStorage.getItem(k))}catch{return null}};
const save=(k,x)=>{try{localStorage.setItem(k,JSON.stringify(x))}catch{}};

export function mountSudoku(root,options={}){
 const locale=SUDOKU_UI_TEXT[options.locale]?options.locale:'en',t=SUDOKU_UI_TEXT[locale];
 const text=(key,values={})=>Object.entries(values).reduce((v,[k,x])=>v.replaceAll(`{${k}}`,x),t[key]||key);
 const storageKey='smartpuzzles:web:sudoku:v2';
 const rewards=options.rewards||createWebRewards({provider:createGoogleWebRewardProvider()});
 let dead=false,bank=[],puzzle=null,state=null,history=[],future=[],lesson=null,step=0,applied=false,settingsOpen=false,paused=false,elapsed=0,message=t.ready,errors=[],ad=null,request=null,resolvePrompt=null,celebrated=false,rewardGeneration=0,expanded=false;
 const abort=new AbortController();
 if(!document.querySelector('link[data-sudoku-tools]')){const link=document.createElement('link');link.rel='stylesheet';link.href=new URL('./sudoku-game.css',import.meta.url).href;link.dataset.sudokuTools='';document.head.append(link)}
 root.classList.add('sudoku-tools');
 const button=(name,label,extra='')=>`<button type="button" data-action="${name}" ${extra}>${esc(label)}</button>`;
 const disabled=()=>paused||rewards.busy||Boolean(lesson);
 function persist(){if(state)save(storageKey,{...state,elapsed,celebrated})}
 function remember(){history.push(copy(state));if(history.length>100)history.shift();future=[]}
 function wrong(){const result=[];state.board.forEach((row,r)=>row.forEach((v,c)=>{if(v&&v!==puzzle.solution[r][c])result.push(r*puzzle.size+c)}));return result}
 function analyse(){return getSudokuCoach(state.board,{notes:state.center,locale,solution:puzzle.solution,givens:puzzle.puzzle})}
 function complete(){if(validateSudoku(state.board,puzzle.puzzle).complete){message=t.solved;if(!celebrated){celebrated=true;options.onComplete?.({gameId:'sudoku',puzzleId:puzzle.key,size:puzzle.size})}}}
 function choose(size=9,difficulty='easy',next=false,saved=null){
  const pool=bank.filter(p=>p.size===size&&p.difficulty===difficulty);if(!pool.length)return;
  const prior=pool.findIndex(p=>p.key===puzzle?.key);
  puzzle=(saved&&bank.find(p=>p.key===saved.key))||pool[next?(prior+1)%pool.length:0];
  state=createSudokuState(puzzle,saved);history=[];future=[];lesson=null;errors=[];elapsed=Number.isFinite(saved?.elapsed)?Math.max(0,saved.elapsed):0;celebrated=Boolean(saved?.celebrated);paused=false;message=t.ready;render();persist();
 }
 function showMessage(key){message=t[key]||key;render()}
 function mutate(result){if(!result.changed){showMessage(result.reason||'noChange');return}remember();state=result.state;errors=[];message=t.ready;complete();render();persist()}
 function timer(){return `${Math.floor(elapsed/60)}:${String(elapsed%60).padStart(2,'0')}`}
 function lessonHTML(){
  if(!lesson)return '';
  const s=lesson.steps?.[step];
  const guide=lesson.status==='needs-notes',canApply=['place','eliminate'].includes(lesson.action?.type);
  return `<aside class="sudoku-coach-sheet" role="region" aria-label="${esc(t.coach)}"><header><h2>${esc(lesson.title||t.coach)}</h2>${button('close-coach',t.close,'class="close-coach"')}</header><p class="step-counter">${esc(text('step',{n:step+1,total:lesson.steps?.length||1}))}</p><h3>${esc(s?.title||'')}</h3><p>${esc(s?.text||(guide?t.needsNotes:t.noStep))}</p><div class="coach-controls">${button('previous',t.previous,step===0?'disabled':'')}${button('next',t.next,step>=(lesson.steps?.length||1)-1?'disabled':'')}${guide?button('guide-auto',t.auto):canApply?button('apply',applied?t.coachApplied:t.apply,applied||step<(lesson.steps?.length||1)-1?'disabled':''):''}</div></aside>`;
 }
 function adHTML(){
  if(!ad)return '';
  const headline=ad.type==='confirm'?t[ad.kind==='coach'?'adCoach':'adHint']:ad.type==='info'?(ad.fallback?t.adFailedTitle:t.notice):t.adLoading;
  const body=ad.type==='confirm'?t.adPrompt:ad.type==='info'?ad.message:t.adLoading;
  return `<div class="reward-overlay"><section class="reward-dialog" role="dialog" aria-modal="true" aria-labelledby="reward-title"><h2 id="reward-title">${esc(headline)}</h2><p>${esc(body)}</p>${ad.type==='confirm'?button('begin-reward',t.continue):ad.type==='prompt'?button('show-reward',text('adWatch',{n:ad.n,total:ad.total})):''}<div class="reward-actions">${button('cancel-reward',ad.type==='info'?t.confirm:t.cancel)}</div></section></div>`;
 }
 function render(focus=false){
  if(dead||!state)return;
  const active=document.activeElement,focusWasInside=Boolean(active&&root.contains(active));
  const focusAttribute=focusWasInside?['action','setting','option','digit','colour'].find(key=>/^[A-Za-z0-9-]+$/.test(active.dataset?.[key]||'')):null;
  const focusSelector=focusAttribute?`[data-${focusAttribute}="${active.dataset[focusAttribute]}"]:not([disabled])`:null;
  root.classList.toggle('sudoku-expanded',expanded);
  const n=puzzle.size,br=n===6?2:3,sr=Math.floor(state.selected/n),sc=state.selected%n;
  const selectedValue=state.board[sr][sc];const usage=rewards.usage();
  const currentCells=lesson?.steps?.[step]?.cells||[];
  const activeCells=new Set(currentCells.map(c=>c.row*n+c.col));
  const cells=state.board.map((row,r)=>row.map((value,c)=>{
   const i=r*n+c,highlight=getSudokuHighlights(state,i),given=Boolean(puzzle.puzzle[r][c]);
   const classes=['s-cell',given?'given':'',highlight.peer?'peer':'',highlight.identical?'identical':'',highlight.matchingNotes?'matching-notes':'',i===state.selected?'selected':'',errors.includes(i)?'error':'',activeCells.has(i)?'coach-cell':'',c<n-1&&(c+1)%3===0?'box-right':'',r<n-1&&(r+1)%br===0?'box-bottom':''];
   const corner=state.corner[i].map(v=>`<span class="${v===selectedValue?'matching-digit':''}">${v}</span>`).join('');
   const center=state.center[i].map(v=>`<span class="${v===selectedValue?'matching-digit':''}">${v}</span>`).join(' ');
   const style=state.colors[i]===null?'':`--user-colour:${SUDOKU_COLOURS[state.colors[i]]};--annotation-ink:${colourInk[state.colors[i]]};`;
   const label=`${coordinate(r,c)}: ${value||t.empty}${given?', '+t.given:''}${state.corner[i].length?', '+t.corner+': '+state.corner[i].join(', '):''}${state.center[i].length?', '+t.center+': '+state.center[i].join(', '):''}`;
   return `<button type="button" role="gridcell" class="${classes.filter(Boolean).join(' ')}" style="${style}" data-cell="${i}" aria-label="${esc(label)}" aria-readonly="${given}" aria-selected="${i===state.selected}" tabindex="${i===state.selected?0:-1}">${value?`<span class="cell-value">${value}</span>`:`<span class="corner-notes" aria-hidden="true">${corner}</span><span class="center-notes" aria-hidden="true">${center}</span>`}</button>`;
  }).join('')).join('');
  const optionsHTML=['autoCancel','coordinates','highlightAreas','highlightIdentical','highlightNotes'].map(k=>`<label><input type="checkbox" data-setting="${k}" ${state.settings[k]?'checked':''}>${esc(t[k])}</label>`).join('');
  const numberPad=state.mode==='color'?SUDOKU_COLOURS.map((color,i)=>`<button type="button" class="colour-choice" data-colour="${i}" ${disabled()?'disabled':''} style="--choice:${color}" aria-label="${esc(t.color)} ${i+1}"><span>${i+1}</span></button>`).join(''):Array.from({length:n},(_,i)=>`<button type="button" data-digit="${i+1}" ${disabled()?'disabled':''}>${i+1}</button>`).join('');
  root.innerHTML=`<p class="sudoku-intro">${esc(t.intro)}</p><div class="sudoku-top"><label>${esc(t.board)}<select data-option="size" ${disabled()?'disabled':''}>${[6,9].map(size=>`<option value="${size}" ${n===size?'selected':''}>${size}×${size}</option>`).join('')}</select></label><label>${esc(t.difficulty)}<select data-option="difficulty" ${disabled()?'disabled':''}>${['easy','medium'].map(d=>`<option value="${d}" ${puzzle.difficulty===d?'selected':''}>${esc(t[d])}</option>`).join('')}</select></label><span class="game-timer" aria-label="${esc(t.timer)}" data-timer>${timer()}</span>${button('pause',paused?t.resume:t.pause,lesson?'disabled':'')}${button('fullscreen',document.fullscreenElement||expanded?t.exitFullscreen:t.fullscreen)}</div><div class="sudoku-toolbar">${button('new',t.newGame,disabled()?'disabled':'')}${button('restart',t.reset,disabled()?'disabled':'')}${button('undo',t.undo,!history.length||disabled()?'disabled':'')}${button('redo',t.redo,!future.length||disabled()?'disabled':'')}${button('settings',t.settings,`aria-expanded="${settingsOpen}"`)}</div><section class="sudoku-settings" ${settingsOpen?'':'hidden'}>${optionsHTML}</section><p class="selected-label">${esc(t.selected)}: ${coordinate(sr,sc)}</p><div class="sudoku-board-wrap ${state.settings.coordinates?'with-coordinates':''}">${state.settings.coordinates?`<div class="col-labels" aria-hidden="true">${Array.from({length:n},(_,i)=>`<span>${i+1}</span>`).join('')}</div><div class="row-labels" aria-hidden="true">${Array.from({length:n},(_,i)=>`<span>${String.fromCharCode(65+i)}</span>`).join('')}</div>`:''}<div class="sudoku-board ${paused?'paused-board':''}" style="--n:${n}" role="grid" aria-label="Sudoku" aria-rowcount="${n}" aria-colcount="${n}">${cells}</div>${paused?`<div class="pause-cover">${button('pause',t.resume)}</div>`:''}</div><div class="sudoku-modes" role="group" aria-label="${esc(t.settings)}">${['regular','corner','center','color'].map(mode=>button('mode-'+mode,t[mode],`aria-pressed="${state.mode===mode}" ${disabled()?'disabled':''}`)).join('')}</div><div class="sudoku-pad" aria-label="${esc(state.mode==='color'?t.palette:t.regular)}">${numberPad}</div><div class="sudoku-actions">${button('erase',t.erase,disabled()?'disabled':'')}${button('auto',t.auto,disabled()?'disabled':'')}${button('hint',t.hint,disabled()?'disabled':'')}${button('coach',t.coach,disabled()?'disabled':'')}${button('check',t.check,disabled()?'disabled':'')}</div><p class="usage-line">${esc(text('hintFree',{n:3-usage.freeHints}))} · ${esc(text('coachLeft',{n:3-usage.coach}))}</p><p class="sudoku-message" role="status" aria-live="polite">${esc(message)}</p><p class="save-note">${esc(t.saved)}</p>${lessonHTML()}${adHTML()}`;
  if(ad)root.querySelector('.reward-dialog button')?.focus({preventScroll:true});
  else if(focus)root.querySelector(`[data-cell="${state.selected}"]`)?.focus({preventScroll:true});
  else if(focusWasInside)(focusSelector&&root.querySelector(focusSelector)||root.querySelector(lesson?'[data-action="close-coach"]':`[data-cell="${state.selected}"]`))?.focus({preventScroll:true});
 }
 function openLesson(value){lesson=value;step=0;applied=false;message=value.status==='needs-notes'?t.needsNotes:t.coach;render()}
 function applyLesson(value){
  const result=applySudokuCoachAction(state.board,state.center,value);
  if(!result.applied)return {changed:false,state,reason:'stale'};
  if(value.action?.type==='place')return updateSudokuEntry(state,puzzle,value.action.row*puzzle.size+value.action.col,value.action.value,'regular');
  return {changed:result.applied,state:result.applied?{...copy(state),board:result.board,center:result.notes}:state,reason:result.applied?null:'stale'};
 }
 async function useReward(kind,value){
  const generation=++rewardGeneration;ad={type:'loading',kind};render();
  const result=await rewards.acquire(kind,{onProgress:({n,total})=>{if(!dead&&generation===rewardGeneration){ad={type:'loading',kind,n,total};render()}},onPrompt:({n,total})=>new Promise(resolve=>{if(dead||generation!==rewardGeneration){resolve(false);return}resolvePrompt=resolve;ad={type:'prompt',kind,n,total};render()})});
  if(dead||generation!==rewardGeneration){result.cancel?.();return}
  if(result.status==='cancelled'){ad=null;message=t.adCancelled;render();return}
  if(result.status!=='granted'){message=t[{offline:'adOffline',cancelled:'adCancelled',limit:'coachLimit',unavailable:'adUnavailable',busy:'busy'}[result.status]||'adRetry'];ad={type:'info',message};render();return}
  if(kind==='hint'){
   const next=applyLesson(value);if(!next.changed){result.cancel();ad={type:'info',message:t.stale};render();return}
   if(!result.commit()){ad={type:'info',message:t.stale};render();return}
   remember();state=next.state;errors=[];message=t.hintUsed;complete();persist();
  }else{
   // Board selection is allowed while a sheet is open; board edits are not.
   if(!result.commit()){ad={type:'info',message:t.coachLimit};render();return}
   openLesson(value);
  }
  ad=result.fallback?{type:'info',fallback:true,message:t.adFailed}:null;render();
 }
 function requestHelp(kind){
  errors=wrong();if(errors.length){showMessage('wrong');return}
  const value=analyse();
  if(value.status==='needs-notes'){openLesson(value);return}
  if(value.status!=='hint'){if(value.status==='solved')showMessage('solved');else openLesson(value);return}
  if(kind==='coach'&&rewards.usage().coach>=3){ad={type:'info',message:t.coachLimit};render();return}
  if(kind==='hint'&&rewards.usage().freeHints<3){void useReward(kind,value);return}
  request={kind,value};ad={type:'confirm',kind};render();
 }
 async function onClick(event){
  const target=event.target.closest('button');if(!target||!root.contains(target)||!state)return;
  if(target.dataset.action==='cancel-reward'){const wasInfo=ad?.type==='info';rewardGeneration++;resolvePrompt?.(false);resolvePrompt=null;rewards.cancel();ad=null;request=null;if(!wasInfo)message=t.adCancelled;render();return}
  if(target.dataset.action==='show-reward'){const resolve=resolvePrompt;resolvePrompt=null;ad={type:'loading'};render();resolve?.(true);return}
  if(target.dataset.action==='begin-reward'){const next=request;request=null;if(next)void useReward(next.kind,next.value);return}
  if(ad||rewards.busy)return;
  if(target.dataset.cell!==undefined){if(paused)return;state.selected=Number(target.dataset.cell);render(true);persist();return}
  const name=target.dataset.action;
  if(name==='close-coach'){lesson=null;render();return}
  if(name==='previous'||name==='next'){step=Math.max(0,Math.min((lesson?.steps.length||1)-1,step+(name==='next'?1:-1)));render();return}
  if(name==='guide-auto'){remember();state=autoPencilState(state,puzzle);lesson=null;message=t.noteAutoDone;render();persist();return}
  if(name==='apply'&&lesson&&!applied){const result=applyLesson(lesson);if(result.changed){remember();state=result.state;applied=true;message=t.coachApplied;complete();persist();render()}else showMessage('stale');return}
  if(name==='settings'){settingsOpen=!settingsOpen;render();return}
  if(name==='pause'&&!lesson){paused=!paused;render();return}
  if(name==='fullscreen'){if(document.fullscreenElement){try{await document.exitFullscreen()}catch{}expanded=false}else if(expanded)expanded=false;else if(typeof root.requestFullscreen==='function'){try{await root.requestFullscreen()}catch{expanded=true}}else expanded=true;render();return}
  if(disabled())return;
  if(target.dataset.digit){mutate(updateSudokuEntry(state,puzzle,state.selected,Number(target.dataset.digit)));return}
  if(target.dataset.colour!==undefined){remember();state=setSudokuColor(state,state.selected,Number(target.dataset.colour));render(true);persist();return}
  if(name?.startsWith('mode-')){state.mode=name.slice(5);render();persist();return}
  if(name==='erase'){mutate(eraseSudokuEntry(state,puzzle,state.selected));return}
  if(name==='auto'){if(wrong().length){errors=wrong();showMessage('notesWarning')}else{remember();state=autoPencilState(state,puzzle);message=t.noteAutoDone;render();persist()}return}
  if(name==='hint'||name==='coach'){requestHelp(name);return}
  if(name==='check'){errors=wrong();message=errors.length?t.wrong:t.correct;complete();render();return}
  if(name==='undo'&&history.length){future.push(copy(state));state=history.pop();errors=[];render();persist();return}
  if(name==='redo'&&future.length){history.push(copy(state));state=future.pop();errors=[];render();persist();return}
  if(name==='new'){if(confirm(t.newConfirm))choose(puzzle.size,puzzle.difficulty,true);return}
  if(name==='restart'&&confirm(t.resetConfirm)){remember();state=createSudokuState(puzzle);errors=[];elapsed=0;celebrated=false;render();persist()}
 }
 function onChange(event){
  if(!state||ad)return;const setting=event.target.dataset.setting;
  if(setting){state.settings[setting]=event.target.checked;render();persist();return}
  if(disabled())return;
  if(event.target.dataset.option==='size')choose(Number(event.target.value),puzzle.difficulty);
  if(event.target.dataset.option==='difficulty')choose(puzzle.size,event.target.value);
 }
 function onKey(event){
  if(ad){if(event.key==='Tab'){const buttons=[...root.querySelectorAll('.reward-dialog button:not([disabled])')],first=buttons[0],last=buttons.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus()}}return}
  if(!state||paused||event.ctrlKey||event.metaKey||event.altKey||['INPUT','SELECT','TEXTAREA'].includes(event.target.tagName))return;
  const n=puzzle.size,r=Math.floor(state.selected/n),c=state.selected%n,arrows={ArrowLeft:[r,Math.max(0,c-1)],ArrowRight:[r,Math.min(n-1,c+1)],ArrowUp:[Math.max(0,r-1),c],ArrowDown:[Math.min(n-1,r+1),c]};
  if(arrows[event.key]){event.preventDefault();const [rr,cc]=arrows[event.key];state.selected=rr*n+cc;render(true);persist();return}
  if(disabled())return;
  if(event.key==='Delete'||event.key==='Backspace'){event.preventDefault();mutate(eraseSudokuEntry(state,puzzle,state.selected))}
  if(/^[1-9]$/.test(event.key)&&Number(event.key)<=n){event.preventDefault();if(state.mode==='color'){const colour=Number(event.key)-1;if(colour<SUDOKU_COLOURS.length){remember();state=setSudokuColor(state,state.selected,colour);render(true);persist()}}else mutate(updateSudokuEntry(state,puzzle,state.selected,Number(event.key)))}
 }
 const ownerDocument=root.ownerDocument;
 const onFullscreenChange=()=>render();
 ownerDocument.addEventListener('fullscreenchange',onFullscreenChange);
 root.addEventListener('click',onClick);root.addEventListener('change',onChange);root.addEventListener('keydown',onKey);
 const interval=setInterval(()=>{if(dead||!state||paused||lesson||ad||document.hidden)return;elapsed++;const timerNode=root.querySelector('[data-timer]');if(timerNode)timerNode.textContent=timer();if(elapsed%10===0)persist()},1000);
 root.textContent=t.loading;
 const timeout=setTimeout(()=>abort.abort(),12000);
 const ready=fetch(new URL('../data/numbers/starter.json',import.meta.url),{signal:abort.signal}).then(r=>{if(!r.ok)throw Error('load');return r.json()}).then(data=>{
  if(dead)return;bank=data.sudoku;const saved=read(storageKey)||read('smartpuzzles:web:sudoku:v1');const existing=saved&&bank.find(p=>p.key===saved.key);choose(existing?.size||9,existing?.difficulty||'easy',false,existing?saved:null);
 }).catch(()=>{if(!dead){root.innerHTML=`<p>${esc(t.loadError)}</p>${button('reload',t.retry)}`;root.querySelector('button').addEventListener('click',()=>location.reload(),{once:true})}}).finally(()=>clearTimeout(timeout));
 return {ready,destroy(){dead=true;root.classList.remove('sudoku-expanded');persist();resolvePrompt?.(false);rewards.cancel();abort.abort();clearTimeout(timeout);clearInterval(interval);ownerDocument.removeEventListener('fullscreenchange',onFullscreenChange);root.removeEventListener('click',onClick);root.removeEventListener('change',onChange);root.removeEventListener('keydown',onKey)}};
}
