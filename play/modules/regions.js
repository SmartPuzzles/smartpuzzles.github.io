import { crownPuzzles, shikakuPuzzles } from '../data/regions/puzzles.js';

const copy = value => JSON.parse(JSON.stringify(value));
function fingerprint(value){let hash=2166136261;for(const char of JSON.stringify(value))hash=Math.imul(hash^char.charCodeAt(0),16777619);return (hash>>>0).toString(36);}
const at = (r,c,n) => r*n+c;
const coord = (r,c) => `${String.fromCharCode(65+r)}${c+1}`;
const colors=['#203b54','#3f2f51','#315044','#59422d','#3e3f63','#4e3344','#28525a','#52502a'];
const translations={
 en:{new:'New puzzle',reset:'Reset',undo:'Undo',check:'Check',hint:'Logical hint',apply:'Apply this step',size:'Board size',draw:'Draw rectangle',erase:'Erase rectangle',crownRules:'Place one crown in every row, column and coloured region. Crowns cannot touch, even diagonally. Tap a cell to cycle empty → crown → cross.',shikakuRules:'Tap two opposite corners to draw a rectangle. It must contain exactly one numbered clue, match its area and shape, and not overlap another rectangle. Cover every cell.',shapeLegend:'■ square · ▰ wider than tall · ▮ taller than wide · ◇ any shape',blank:'empty',crown:'crown',cross:'crossed out',region:'region',solved:'Solved! Every rule is satisfied.',progress:'No current rule conflict. The puzzle is not complete yet.',conflict:'Some crowns break a row, column, region or touching rule. Highlighted cells need attention.',first:'First corner selected. Now tap the opposite corner.',removed:'Rectangle removed. Undo is available.',eraseTip:'Tap a rectangle to remove it.',drawTip:'Tap two opposite corners to draw.',nothing:'There is nothing to undo yet.',resetDone:'Puzzle reset.',noHint:'No single forced crown is proved by the current placements. Look for regions with few available cells, then use the row, column and touching rules.',wrongCrown:'A crown differs from this puzzle’s verified solution. Undo recent placements before asking for a guided step.',wrongPatch:'A rectangle passes local rules but differs from this puzzle’s verified tiling. Undo or erase it before taking a guided step.',crowns:'crowns',rectangles:'rectangles',selected:'selected',badRectangle:'That rectangle is not valid.',outside:'The rectangle is outside the board.',area:'Its area does not match the clue number.',clues:'A rectangle must contain exactly one clue.',shape:'Its proportions do not match the clue shape.',overlap:'It overlaps an existing rectangle.',invalid:'Invalid board data.',start:'Choose a puzzle and take your time.',hintRow:'Only one cell remains possible in this row.',hintCol:'Only one cell remains possible in this column.',hintRegion:'Only one cell remains possible in this coloured region.',hintExclude:'This cell is ruled out by an existing crown: same row, column, region or touching.',forcedPatch:'Only one legal rectangle remains for this clue. Its area, shape, other clues and existing rectangles rule out the alternatives.',noPatch:'No forced rectangle is proved yet. Compare factor pairs for the clue number, then eliminate rectangles crossing another clue.',impossiblePatch:'This clue has no legal rectangle with the current placements. Reconsider an earlier rectangle.',eraseEmpty:'There is no rectangle in that cell.'},
 'zh-Hant':{new:'新題目',reset:'重設',undo:'復原',check:'檢查',hint:'邏輯提示',apply:'應用呢一步',size:'棋盤大小',draw:'畫長方形',erase:'刪除長方形',crownRules:'每一行、每一列及每個顏色區域各放一頂皇冠。皇冠不可相鄰，斜角亦唔可以。點格子會依次切換：空白 → 皇冠 → 叉號。',shikakuRules:'點兩個相對角畫長方形。每個長方形只可包含一個數字提示，面積及形狀要吻合，亦唔可以重疊。填滿成個棋盤就完成。',shapeLegend:'■ 正方形 · ▰ 闊多於高 · ▮ 高多於闊 · ◇ 任何形狀',blank:'空白',crown:'皇冠',cross:'已劃叉',region:'區域',solved:'完成！所有規則都符合。',progress:'暫時冇規則衝突，題目仲未完成。',conflict:'有皇冠違反行、列、區域或相鄰規則，請留意標示格子。',first:'已選第一個角，請再點相對角。',removed:'已刪除長方形，可以復原。',eraseTip:'點一個長方形就可以刪除。',drawTip:'點兩個相對角畫長方形。',nothing:'暫時冇可以復原嘅步驟。',resetDone:'題目已重設。',noHint:'目前未證明到一個必然皇冠位置。先搵可用格較少嘅區域，再用行、列同相鄰規則排除。',wrongCrown:'有皇冠同呢題嘅已驗證答案唔一致。請先復原最近嘅落子，再要求逐步提示。',wrongPatch:'有長方形符合局部規則，但同呢題已驗證嘅完整分割唔一致。請先復原或刪除，再要求提示。',crowns:'頂皇冠',rectangles:'個長方形',selected:'已選',badRectangle:'呢個長方形唔符合規則。',outside:'長方形超出棋盤。',area:'面積同提示數字唔一致。',clues:'一個長方形必須只包含一個數字提示。',shape:'長闊比例同提示形狀唔一致。',overlap:'同已有長方形重疊。',invalid:'棋盤資料無效。',start:'揀一題，慢慢諗。',hintRow:'呢一行只剩低一個可以放皇冠嘅格子。',hintCol:'呢一列只剩低一個可以放皇冠嘅格子。',hintRegion:'呢個顏色區域只剩低一個可以放皇冠嘅格子。',hintExclude:'呢格被已有皇冠排除：同一行、列、區域，或者相鄰。',forcedPatch:'呢個提示只剩低一個合法長方形。面積、形狀、其他數字同已有長方形排除咗其餘可能。',noPatch:'暫時未證明到必然長方形。先比較提示數字嘅因數組合，再排除跨過其他數字嘅範圍。',impossiblePatch:'按目前落子，呢個提示冇合法長方形，請重新考慮之前嘅分割。',eraseEmpty:'呢格冇長方形。'},
 'zh-Hans':{new:'新题目',reset:'重置',undo:'撤销',check:'检查',hint:'逻辑提示',apply:'应用这一步',size:'棋盘大小',draw:'画矩形',erase:'删除矩形',crownRules:'每一行、每一列和每个颜色区域各放一顶皇冠。皇冠不能相邻，包括对角线。点击格子依次切换：空白 → 皇冠 → 叉号。',shikakuRules:'点击两个相对的角画矩形。每个矩形只能包含一个数字提示，面积和形状必须匹配，且不能重叠。覆盖整个棋盘即可完成。',shapeLegend:'■ 正方形 · ▰ 宽大于高 · ▮ 高大于宽 · ◇ 任意形状',blank:'空白',crown:'皇冠',cross:'已排除',region:'区域',solved:'完成！所有规则都满足。',progress:'目前没有规则冲突，题目尚未完成。',conflict:'部分皇冠违反行、列、区域或相邻规则，请检查标记位置。',first:'已选第一个角，请点击相对角。',removed:'已删除矩形，可以撤销。',eraseTip:'点击矩形将其删除。',drawTip:'点击两个相对角画矩形。',nothing:'没有可以撤销的步骤。',resetDone:'题目已重置。',noHint:'当前尚未证明一个必然皇冠位置。先找可用格较少的区域，再用行、列和相邻规则排除。',wrongCrown:'有皇冠与本题已验证的答案不一致。请先撤销最近的落子，再请求逐步提示。',wrongPatch:'某个矩形符合局部规则，但与本题已验证的完整分割不一致。请先撤销或删除，再请求提示。',crowns:'顶皇冠',rectangles:'个矩形',selected:'已选',badRectangle:'这个矩形不符合规则。',outside:'矩形超出棋盘。',area:'面积与提示数字不一致。',clues:'每个矩形必须只包含一个数字提示。',shape:'长宽比例与提示形状不一致。',overlap:'与已有矩形重叠。',invalid:'棋盘数据无效。',start:'选一题，慢慢想。',hintRow:'这一行只剩一个可以放皇冠的位置。',hintCol:'这一列只剩一个可以放皇冠的位置。',hintRegion:'这个颜色区域只剩一个可以放皇冠的位置。',hintExclude:'这个位置被已有皇冠排除：同一行、列、区域或相邻。',forcedPatch:'这个提示只剩一个合法矩形。面积、形状、其他数字和已有矩形排除了其余可能。',noPatch:'暂未证明必然矩形。先比较提示数字的因数组合，再排除跨过其他数字的范围。',impossiblePatch:'当前落子下，这个提示没有合法矩形，请重新考虑之前的分割。',eraseEmpty:'这个位置没有矩形。'},
 ja:{new:'新しい問題',reset:'リセット',undo:'元に戻す',check:'確認',hint:'論理ヒント',apply:'この一手を適用',size:'盤面サイズ',draw:'長方形を描く',erase:'長方形を消す',crownRules:'各行・列・色の領域に王冠を1つずつ置きます。王冠は斜めを含めて隣接できません。タップで空白 → 王冠 → ×に切り替わります。',shikakuRules:'向かい合う2つの角をタップして長方形を描きます。数字を1つだけ含み、面積と形が一致し、重ならないように全マスを埋めます。',shapeLegend:'■ 正方形 · ▰ 横長 · ▮ 縦長 · ◇ 形の制限なし',blank:'空白',crown:'王冠',cross:'除外',region:'領域',solved:'完成！すべてのルールを満たしています。',progress:'現在のルール違反はありません。まだ完成していません。',conflict:'王冠の行・列・領域・隣接ルールを確認してください。',first:'最初の角を選びました。反対側の角をタップしてください。',removed:'長方形を消しました。元に戻せます。',eraseTip:'長方形をタップすると消せます。',drawTip:'向かい合う2つの角をタップしてください。',nothing:'戻せる操作はありません。',resetDone:'リセットしました。',noHint:'確定できる王冠はまだ見つかりません。候補の少ない領域から考えましょう。',wrongCrown:'確認済みの解答と異なる王冠があります。最近の手を戻してからヒントをお試しください。',wrongPatch:'局所的なルールには合いますが、確認済みの分割と異なる長方形があります。ヒントの前に戻すか消してください。',crowns:'個の王冠',rectangles:'個の長方形',selected:'選択',badRectangle:'この長方形は置けません。',outside:'盤面の外です。',area:'面積と数字が一致しません。',clues:'長方形には数字を1つだけ含めます。',shape:'縦横の比率が形の指定と一致しません。',overlap:'ほかの長方形と重なっています。',invalid:'盤面データが無効です。',start:'一問選んで、ゆっくり考えましょう。',hintRow:'この行で王冠を置けるマスは1つだけです。',hintCol:'この列で王冠を置けるマスは1つだけです。',hintRegion:'この色の領域で王冠を置けるマスは1つだけです。',hintExclude:'既存の王冠と同じ行・列・領域、または隣接するため除外できます。',forcedPatch:'この数字に置ける長方形は1つだけです。面積、形、ほかの数字と既存の長方形が候補を絞ります。',noPatch:'確定する長方形はまだありません。数字の因数と、ほかの数字をまたぐ形を確認しましょう。',impossiblePatch:'現在の配置では、この数字に置ける長方形がありません。前の配置を見直してください。',eraseEmpty:'このマスには長方形がありません。'},
 ko:{new:'새 퍼즐',reset:'초기화',undo:'되돌리기',check:'확인',hint:'논리 힌트',apply:'이 단계 적용',size:'보드 크기',draw:'직사각형 그리기',erase:'직사각형 지우기',crownRules:'각 행, 열, 색상 영역에 왕관을 하나씩 놓으세요. 왕관은 대각선을 포함해 서로 닿을 수 없습니다. 탭하면 빈칸 → 왕관 → ×로 바뀝니다.',shikakuRules:'마주 보는 두 모서리를 탭해 직사각형을 그리세요. 숫자 하나만 포함하고 넓이와 모양이 일치해야 합니다. 겹치지 않게 모든 칸을 덮으면 완료됩니다.',shapeLegend:'■ 정사각형 · ▰ 가로로 긴 모양 · ▮ 세로로 긴 모양 · ◇ 제한 없음',blank:'빈칸',crown:'왕관',cross:'제외',region:'영역',solved:'완료! 모든 규칙을 만족합니다.',progress:'현재 규칙 위반은 없습니다. 아직 완료되지 않았습니다.',conflict:'표시된 왕관의 행, 열, 영역 또는 인접 규칙을 확인하세요.',first:'첫 모서리를 선택했습니다. 반대 모서리를 탭하세요.',removed:'직사각형을 지웠습니다. 되돌릴 수 있습니다.',eraseTip:'직사각형을 탭해 지우세요.',drawTip:'마주 보는 두 모서리를 탭하세요.',nothing:'되돌릴 단계가 없습니다.',resetDone:'퍼즐을 초기화했습니다.',noHint:'아직 확정할 왕관을 찾지 못했습니다. 가능한 칸이 적은 영역부터 살펴보세요.',wrongCrown:'검증된 정답과 다른 왕관이 있습니다. 최근 수를 되돌린 뒤 힌트를 요청하세요.',wrongPatch:'국소 규칙은 만족하지만 검증된 분할과 다른 직사각형이 있습니다. 힌트 전에 되돌리거나 지우세요.',crowns:'개 왕관',rectangles:'개 직사각형',selected:'선택',badRectangle:'이 직사각형은 놓을 수 없습니다.',outside:'보드 밖으로 나갔습니다.',area:'넓이가 숫자와 일치하지 않습니다.',clues:'직사각형에는 숫자가 하나만 있어야 합니다.',shape:'가로세로 비율이 모양 조건과 다릅니다.',overlap:'기존 직사각형과 겹칩니다.',invalid:'보드 데이터가 올바르지 않습니다.',start:'퍼즐을 골라 천천히 생각하세요.',hintRow:'이 행에서 왕관이 가능한 칸은 하나뿐입니다.',hintCol:'이 열에서 왕관이 가능한 칸은 하나뿐입니다.',hintRegion:'이 색상 영역에서 왕관이 가능한 칸은 하나뿐입니다.',hintExclude:'기존 왕관과 같은 행, 열, 영역이거나 인접해 있어 제외됩니다.',forcedPatch:'이 숫자에 가능한 직사각형은 하나뿐입니다. 넓이, 모양, 다른 숫자와 기존 직사각형이 나머지 후보를 제외합니다.',noPatch:'아직 확정된 직사각형이 없습니다. 숫자의 약수 조합과 다른 숫자를 가로지르는 모양을 확인하세요.',impossiblePatch:'현재 배치에서 이 숫자에 가능한 직사각형이 없습니다. 이전 배치를 다시 확인하세요.',eraseEmpty:'이 칸에는 직사각형이 없습니다.'}
};
function words(locale){return translations[locale]||translations.en;}
function load(key){try{return JSON.parse(localStorage.getItem(key));}catch{return null;}}
function save(key,value){try{localStorage.setItem(key,JSON.stringify(value));}catch{/* Storage may be unavailable in private browsing. */}}

/** Validate the actual one-crown-per-unit rules, accepting any valid completed board. */
export function checkCrownfall(board,regions){
 const n=regions?.length;
 if(!Number.isInteger(n)||n<1||!regions.every(r=>Array.isArray(r)&&r.length===n)||!Array.isArray(board)||board.length!==n*n||board.some(v=>![-1,0,1].includes(v)))return {valid:false,complete:false,conflicts:[],reason:'invalid'};
 const conflicts=new Set(),groups=new Map();let count=0;
 for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(board[at(r,c,n)]===1){
  const i=at(r,c,n);count++;
  for(const key of [`r${r}`,`c${c}`,`g${regions[r][c]}`]){const a=groups.get(key)||[];a.push(i);groups.set(key,a);}
  for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++)if(dr||dc){const rr=r+dr,cc=c+dc;if(rr>=0&&rr<n&&cc>=0&&cc<n&&board[at(rr,cc,n)]===1){conflicts.add(i);conflicts.add(at(rr,cc,n));}}
 }
 for(const a of groups.values())if(a.length>1)a.forEach(i=>conflicts.add(i));
 const regionCount=new Set(regions.flat()).size;
 return {valid:conflicts.size===0,complete:conflicts.size===0&&count===n&&regionCount===n,conflicts:[...conflicts],count};
}
function crownAllowed(board,regions,i){
 const n=regions.length,r=Math.floor(i/n),c=i%n;
 return !board.some((v,j)=>v===1&&(Math.floor(j/n)===r||j%n===c||regions[Math.floor(j/n)][j%n]===regions[r][c]||(Math.abs(Math.floor(j/n)-r)<=1&&Math.abs(j%n-c)<=1)));
}
export function findCrownHint(board,puzzle){
 const n=puzzle.regions.length,result=checkCrownfall(board,puzzle.regions);
 if(!result.valid)return {kind:'message',key:'conflict'};
 if(result.complete)return {kind:'message',key:'solved'};
 if(board.some((v,i)=>v===1&&puzzle.solution[Math.floor(i/n)][i%n]!==1))return {kind:'message',key:'wrongCrown'};
 const available=board.map((_,i)=>i).filter(i=>board[i]!==1&&crownAllowed(board,puzzle.regions,i));
 const regionIds=[...new Set(puzzle.regions.flat())];
 for(const [kind,units] of [['hintRegion',regionIds],['hintRow',Array.from({length:n},(_,i)=>i)],['hintCol',Array.from({length:n},(_,i)=>i)]])for(const unit of units){
  const matches=i=>kind==='hintRow'?Math.floor(i/n)===unit:kind==='hintCol'?i%n===unit:puzzle.regions[Math.floor(i/n)][i%n]===unit;
  if(board.some((v,i)=>v===1&&matches(i)))continue;
  const candidates=available.filter(matches);
  if(candidates.length===1){const index=candidates[0];if(puzzle.solution[Math.floor(index/n)][index%n]===1)return {kind:'crown',key:kind,index};}
 }
 for(let i=0;i<board.length;i++)if(board[i]===0&&!crownAllowed(board,puzzle.regions,i))return {kind:'exclude',key:'hintExclude',index:i};
 return {kind:'message',key:'noHint'};
}

export function normalizeShikakuPuzzle(raw,size){return {size,clues:raw.c.map(([row,col,number,shape])=>({row,col,number,shape})),solution:raw.s.map(([row,col,width,height],clueIndex)=>({row,col,width,height,clueIndex}))};}
const shapeFits=(shape,w,h)=>shape===3||(shape===0?w===h:shape===1?w>h:shape===2?h>w:false);
export function rectangleCells(rect,size){const a=[];for(let r=rect.row;r<rect.row+rect.height;r++)for(let c=rect.col;c<rect.col+rect.width;c++)a.push(at(r,c,size));return a;}
export function validateShikakuRectangle(rect,puzzle,placed=[]){
 const n=puzzle.size;
 if(!rect||![rect.row,rect.col,rect.width,rect.height].every(Number.isInteger)||rect.width<1||rect.height<1||rect.row<0||rect.col<0||rect.row+rect.height>n||rect.col+rect.width>n)return {valid:false,reason:'outside'};
 const cells=rectangleCells(rect,n),inside=puzzle.clues.map((clue,i)=>({...clue,i})).filter(c=>cells.includes(at(c.row,c.col,n)));
 if(inside.length!==1)return {valid:false,reason:'clues'};
 const clue=inside[0];if(rect.width*rect.height!==clue.number)return {valid:false,reason:'area'};
 if(!shapeFits(clue.shape,rect.width,rect.height))return {valid:false,reason:'shape'};
 const used=new Set(placed.flatMap(p=>rectangleCells(p,n)));if(cells.some(i=>used.has(i)))return {valid:false,reason:'overlap'};
 return {valid:true,clueIndex:clue.i};
}
export function checkShikaku(placed,puzzle){
 if(!Array.isArray(placed)||!Number.isInteger(puzzle?.size)||!Array.isArray(puzzle?.clues))return {valid:false,complete:false,reason:'invalid'};
 const accepted=[];
 for(const patch of placed){const result=validateShikakuRectangle(patch,puzzle,accepted);if(!result.valid)return {...result,complete:false};accepted.push({...patch,clueIndex:result.clueIndex});}
 const covered=accepted.reduce((sum,p)=>sum+p.width*p.height,0);
 return {valid:true,complete:covered===puzzle.size*puzzle.size&&accepted.length===puzzle.clues.length,covered,count:accepted.length};
}
export function shikakuCandidates(puzzle,clueIndex,placed=[]){
 const clue=puzzle.clues[clueIndex],n=puzzle.size;if(!clue)return [];
 if(placed.some(p=>rectangleCells(p,n).includes(at(clue.row,clue.col,n))))return [];
 const result=[];
 for(let width=1;width<=n;width++){
  if(clue.number%width)continue;const height=clue.number/width;if(height>n||!shapeFits(clue.shape,width,height))continue;
  for(let row=Math.max(0,clue.row-height+1);row<=clue.row&&row+height<=n;row++)for(let col=Math.max(0,clue.col-width+1);col<=clue.col&&col+width<=n;col++){
   const rect={row,col,width,height,clueIndex};if(validateShikakuRectangle(rect,puzzle,placed).valid)result.push(rect);
  }
 }
 return result;
}
export function findShikakuHint(placed,puzzle){
 const checked=checkShikaku(placed,puzzle);if(!checked.valid)return {kind:'message',key:checked.reason};if(checked.complete)return {kind:'message',key:'solved'};
 placed=placed.map(p=>({...p,clueIndex:validateShikakuRectangle(p,puzzle).clueIndex}));
 for(const p of placed){const s=puzzle.solution[p.clueIndex];if(!s||['row','col','width','height'].some(k=>p[k]!==s[k]))return {kind:'message',key:'wrongPatch'};}
 let least=null;
 for(let i=0;i<puzzle.clues.length;i++)if(!placed.some(p=>p.clueIndex===i)){
  const candidates=shikakuCandidates(puzzle,i,placed);
  if(!candidates.length)return {kind:'message',key:'impossiblePatch',clueIndex:i};
  if(candidates.length===1)return {kind:'rectangle',key:'forcedPatch',clueIndex:i,rectangle:candidates[0]};
  if(!least||candidates.length<least.candidates)least={kind:'message',key:'noPatch',clueIndex:i,candidates:candidates.length};
 }
 return least||{kind:'message',key:'noPatch'};
}

const style=`.crownfall-game,.shikaku-game{max-width:650px;margin:auto}.regions-controls{display:flex;flex-wrap:wrap;gap:9px;margin:16px 0}.regions-controls button,.regions-controls select,.regions-controls label{font:inherit}.regions-controls button,.regions-controls select{padding:10px 13px;min-height:44px;border:1px solid #526584;border-radius:8px;background:#17243a;color:#f6f8fc;cursor:pointer}.regions-controls button:hover{background:#263d60}.regions-controls button:disabled{opacity:.45;cursor:default}.regions-controls button[aria-pressed=true]{background:#305d9c}.regions-controls label{display:flex;gap:9px;align-items:center;color:#c1cede}.regions-rule{color:#bdcbe0;line-height:1.75;font-size:15px}.regions-board{display:grid;grid-template-columns:repeat(var(--size),minmax(0,1fr));width:min(100%,500px);aspect-ratio:1;margin:20px auto;border:2px solid #94a8c5;gap:0;touch-action:manipulation}.regions-board .cell{position:relative;min-width:0;min-height:0;aspect-ratio:1;border:1px solid #596d87;border-radius:0;color:#fff;padding:0;font:600 clamp(18px,4.4vw,32px)/1 system-ui;cursor:pointer;background:#122034}.regions-board .cell:focus-visible{outline:3px solid #fff;outline-offset:-5px;z-index:3}.regions-board .cell .region-id{position:absolute;left:5px;top:5px;font:10px/1 system-ui;opacity:.65}.regions-board .cell .shape-icon{position:absolute;right:4px;bottom:4px;font:12px/1 system-ui;color:#ffcf8f}.regions-board .cell.is-conflict{box-shadow:inset 0 0 0 4px #ff7e7e}.regions-board .cell.is-hint{box-shadow:inset 0 0 0 4px #ffca69}.regions-board .cell.is-corner{box-shadow:inset 0 0 0 4px #9bc3ff}.regions-board .cell.crossed{color:#d2dbea}.regions-message{min-height:52px;color:#dce7f7;line-height:1.7;padding:13px 15px;background:#14233a;border-left:3px solid #8eb9ff;margin:16px 0}.regions-message.error{border-left-color:#ff8585}.regions-message.success{border-left-color:#79d9a3}.regions-progress{font-size:13px;color:#b2c3da}.regions-apply{display:none}.regions-apply.visible{display:inline-block}.regions-legend{font-size:12px;color:#d3bc98;line-height:1.7}@media(max-width:390px){.regions-controls button,.regions-controls select{padding:9px;font-size:13px}.regions-rule{font-size:14px}.regions-board .cell .region-id{font-size:8px;left:3px;top:3px}}`;
function scaffold(root,w,sizes,extra=''){
 root.innerHTML=`<style>${style}</style><p class="regions-rule"></p><div class="regions-controls"><label>${w.size} <select data-action="size">${sizes.map(n=>`<option value="${n}">${n}×${n}</option>`).join('')}</select></label><button type="button" data-action="new">${w.new}</button><button type="button" data-action="undo">${w.undo}</button><button type="button" data-action="reset">${w.reset}</button></div>${extra}<div class="game-board regions-board" role="group"></div><p class="regions-progress"></p><div class="regions-controls"><button type="button" data-action="check">${w.check}</button><button type="button" data-action="hint">${w.hint}</button><button type="button" class="regions-apply" data-action="apply">${w.apply}</button></div><p class="game-message regions-message" role="status" aria-live="polite"></p>`;
 return {board:root.querySelector('.regions-board'),rule:root.querySelector('.regions-rule'),message:root.querySelector('.regions-message'),progress:root.querySelector('.regions-progress'),size:root.querySelector('select'),apply:root.querySelector('[data-action=apply]'),undo:root.querySelector('[data-action=undo]')};
}
function arrowKeys(event,board,n){
 if(!event.target.matches('[data-index]'))return;
 const delta={ArrowUp:-n,ArrowDown:n,ArrowLeft:-1,ArrowRight:1}[event.key];if(delta===undefined)return;
 event.preventDefault();const i=Math.max(0,Math.min(n*n-1,Number(event.target.dataset.index)+delta));board.querySelector(`[data-index="${i}"]`)?.focus();
}
export function mountCrownfall(root,options={}){
 const w=words(options.locale),key='smartpuzzles.web.crownfall.v1',saved=load(key);let size=[5,6,7].includes(saved?.size)?saved.size:5,index=Number.isInteger(saved?.index)?Math.max(0,saved.index):0;
 let puzzle,identity,board,history=[],pending=null,conflicts=[],announced=false,started=Date.now();const abort=new AbortController();root.classList.add('crownfall-game');const ui=scaffold(root,w,[5,6,7]);ui.rule.textContent=w.crownRules;
 const persist=()=>save(key,{size,index,puzzleId:identity,board});
 function announce(){const result=checkCrownfall(board,puzzle.regions);if(result.complete&&!announced){announced=true;options.onComplete?.({gameId:'crownfall',puzzleId:identity,size,seconds:Math.round((Date.now()-started)/1000)});}return result;}
 function render(message='',tone=''){
  ui.size.value=String(size);ui.board.style.setProperty('--size',size);ui.board.setAttribute('aria-label',`Crownfall ${size}×${size}`);
  ui.board.innerHTML=board.map((v,i)=>{const r=Math.floor(i/size),c=i%size,region=puzzle.regions[r][c],fixed=puzzle.givenCells?.[r]?.[c],edges=`border-top-width:${r&&puzzle.regions[r-1][c]!==region?3:1}px;border-left-width:${c&&puzzle.regions[r][c-1]!==region?3:1}px;`;return `<button type="button" class="cell ${v===-1?'crossed ':''}${conflicts.includes(i)?'is-conflict ':''}${pending?.index===i?'is-hint':''}" data-index="${i}" tabindex="${i===0?0:-1}" style="background:var(--sp-region-${region%colors.length},${colors[region%colors.length]});${edges}" aria-label="${coord(r,c)}, ${w.region} ${region+1}, ${v===1?w.crown:v===-1?w.cross:w.blank}" ${fixed?'disabled':''}><span class="region-id" aria-hidden="true">${region+1}</span>${v===1?'♛':v===-1?'×':''}</button>`;}).join('');
  ui.progress.textContent=`${board.filter(v=>v===1).length} / ${size} ${w.crowns} · #${index%crownPuzzles[size].length+1}`;ui.undo.disabled=!history.length;ui.apply.classList.toggle('visible',Boolean(pending&&['crown','exclude'].includes(pending.kind)));
  if(message){ui.message.textContent=message;ui.message.className=`game-message regions-message ${tone}`;}
  persist();
 }
 function start(restore=false){puzzle=crownPuzzles[size][index%crownPuzzles[size].length];identity=`crownfall-${size}-${index%crownPuzzles[size].length}-${fingerprint(puzzle)}`;board=Array(size*size).fill(0);if(restore&&saved?.puzzleId===identity&&Array.isArray(saved?.board)&&saved.board.length===board.length&&saved.board.every(v=>[-1,0,1].includes(v)))board=[...saved.board];for(let r=0;r<size;r++)for(let c=0;c<size;c++)if(puzzle.givenCells?.[r]?.[c])board[at(r,c,size)]=1;history=[];pending=null;conflicts=[];announced=false;started=Date.now();render(w.start);}
 function change(i,value){history.push([...board]);if(history.length>200)history.shift();board[i]=value;pending=null;conflicts=[];const result=announce();conflicts=result.conflicts;render(result.complete?w.solved:result.valid?w.progress:w.conflict,result.complete?'success':result.valid?'':'error');ui.board.querySelector(`[data-index="${i}"]`)?.focus();}
 root.addEventListener('change',event=>{if(event.target.dataset.action==='size'){size=Number(event.target.value);index=0;start();}},{signal:abort.signal});
 root.addEventListener('keydown',event=>arrowKeys(event,ui.board,size),{signal:abort.signal});
 root.addEventListener('click',event=>{
  const cell=event.target.closest('[data-index]');if(cell&&ui.board.contains(cell)){const i=Number(cell.dataset.index);if(puzzle.givenCells?.[Math.floor(i/size)]?.[i%size])return;change(i,board[i]===0?1:board[i]===1?-1:0);return;}
  const action=event.target.closest('[data-action]')?.dataset.action;
  if(action==='new'){index++;start();}else if(action==='reset'){start();render(w.resetDone);}else if(action==='undo'){if(!history.length){render(w.nothing);return;}board=history.pop();pending=null;announced=false;const result=checkCrownfall(board,puzzle.regions);conflicts=result.conflicts;render(result.valid?w.progress:w.conflict,result.valid?'':'error');}else if(action==='check'){const result=announce();conflicts=result.conflicts;render(result.complete?w.solved:result.valid?w.progress:w.conflict,result.complete?'success':result.valid?'':'error');}else if(action==='hint'){pending=findCrownHint(board,puzzle);const label=pending.index!==undefined?`${coord(Math.floor(pending.index/size),pending.index%size)} — `:'';render(label+w[pending.key]);}else if(action==='apply'&&pending&&['crown','exclude'].includes(pending.kind)){change(pending.index,pending.kind==='crown'?1:-1);}
 },{signal:abort.signal});
 start(true);return {destroy(){abort.abort();root.classList.remove('crownfall-game');root.replaceChildren();}};
}

export function mountShikaku(root,options={}){
 const w=words(options.locale),key='smartpuzzles.web.shikaku.v1',saved=load(key);let size=[4,5,6].includes(saved?.size)?saved.size:4,index=Number.isInteger(saved?.index)?Math.max(0,saved.index):0;
 let puzzle,identity,placed=[],history=[],first=null,pending=null,mode='draw',announced=false,started=Date.now();const abort=new AbortController();root.classList.add('shikaku-game');const ui=scaffold(root,w,[4,5,6],`<p class="regions-legend">${w.shapeLegend}</p><div class="regions-controls"><button type="button" data-action="draw" aria-pressed="true">${w.draw}</button><button type="button" data-action="erase" aria-pressed="false">${w.erase}</button></div>`);ui.rule.textContent=w.shikakuRules;
 const persist=()=>save(key,{size,index,puzzleId:identity,placed});
 function announce(){const result=checkShikaku(placed,puzzle);if(result.complete&&!announced){announced=true;options.onComplete?.({gameId:'shikaku',puzzleId:identity,size,seconds:Math.round((Date.now()-started)/1000)});}return result;}
 function render(message='',tone=''){
  ui.size.value=String(size);ui.board.style.setProperty('--size',size);ui.board.setAttribute('aria-label',`Shikaku ${size}×${size}`);
  const occupied=new Map();placed.forEach((p,j)=>rectangleCells(p,size).forEach(i=>occupied.set(i,j)));const hintCells=pending?.rectangle?rectangleCells(pending.rectangle,size):[];
  ui.board.innerHTML=Array.from({length:size*size},(_,i)=>{const r=Math.floor(i/size),c=i%size,clue=puzzle.clues.find(p=>p.row===r&&p.col===c),patchIndex=occupied.get(i),patch=patchIndex!==undefined?placed[patchIndex]:null,regionStyle=patch?`background:var(--sp-region-${patchIndex%colors.length},${colors[patchIndex%colors.length]});border-top-width:${r===patch.row?3:1}px;border-bottom-width:${r===patch.row+patch.height-1?3:1}px;border-left-width:${c===patch.col?3:1}px;border-right-width:${c===patch.col+patch.width-1?3:1}px;`:'';const glyph=clue?['■','▰','▮','◇'][clue.shape]:'';return `<button type="button" class="cell ${first===i?'is-corner ':''}${hintCells.includes(i)||(pending?.clueIndex!==undefined&&clue===puzzle.clues[pending.clueIndex])?'is-hint':''}" data-index="${i}" tabindex="${i===0?0:-1}" style="${regionStyle}" aria-label="${coord(r,c)}${clue?`, ${clue.number}, ${glyph}`:''}${patch?`, ${w.selected}`:''}">${clue?clue.number:''}${clue?`<span class="shape-icon" aria-hidden="true">${glyph}</span>`:''}</button>`;}).join('');
  ui.progress.textContent=`${placed.length} / ${puzzle.clues.length} ${w.rectangles} · ${placed.reduce((sum,p)=>sum+p.width*p.height,0)} / ${size*size} · #${index%shikakuPuzzles[size].length+1}`;ui.undo.disabled=!history.length;ui.apply.classList.toggle('visible',Boolean(pending?.kind==='rectangle'));
  root.querySelector('[data-action=draw]').setAttribute('aria-pressed',String(mode==='draw'));root.querySelector('[data-action=erase]').setAttribute('aria-pressed',String(mode==='erase'));
  if(message){ui.message.textContent=message;ui.message.className=`game-message regions-message ${tone}`;}persist();
 }
 function start(restore=false){puzzle=normalizeShikakuPuzzle(shikakuPuzzles[size][index%shikakuPuzzles[size].length],size);identity=`shikaku-${size}-${index%shikakuPuzzles[size].length}-${fingerprint(puzzle)}`;placed=[];if(restore&&saved?.puzzleId===identity&&Array.isArray(saved?.placed)&&checkShikaku(saved.placed,puzzle).valid)placed=saved.placed.map(p=>({...p,clueIndex:validateShikakuRectangle(p,puzzle).clueIndex}));history=[];first=null;pending=null;announced=false;started=Date.now();render(w.drawTip);}
 function commit(rect){const result=validateShikakuRectangle(rect,puzzle,placed);if(!result.valid){first=null;render(`${w.badRectangle} ${w[result.reason]}`,'error');return;}history.push(copy(placed));if(history.length>200)history.shift();placed.push({...rect,clueIndex:result.clueIndex});first=null;pending=null;const complete=announce().complete;render(complete?w.solved:w.drawTip,complete?'success':'');}
 root.addEventListener('change',event=>{if(event.target.dataset.action==='size'){size=Number(event.target.value);index=0;start();}},{signal:abort.signal});root.addEventListener('keydown',event=>arrowKeys(event,ui.board,size),{signal:abort.signal});
 root.addEventListener('click',event=>{
  const cell=event.target.closest('[data-index]');if(cell&&ui.board.contains(cell)){
   const i=Number(cell.dataset.index);pending=null;
   if(mode==='erase'){const patchIndex=placed.findIndex(p=>rectangleCells(p,size).includes(i));if(patchIndex<0){render(w.eraseEmpty);return;}history.push(copy(placed));placed.splice(patchIndex,1);first=null;announced=false;render(w.removed);}
   else if(first===null){first=i;render(`${coord(Math.floor(i/size),i%size)} — ${w.first}`);}else{const r=Math.floor(i/size),c=i%size,fr=Math.floor(first/size),fc=first%size;commit({row:Math.min(r,fr),col:Math.min(c,fc),width:Math.abs(c-fc)+1,height:Math.abs(r-fr)+1});}
   ui.board.querySelector(`[data-index="${i}"]`)?.focus();return;
  }
  const action=event.target.closest('[data-action]')?.dataset.action;
  if(action==='new'){index++;start();}else if(action==='reset'){start();render(w.resetDone);}else if(action==='undo'){if(!history.length){first=null;pending=null;render(w.nothing);return;}placed=history.pop();first=null;pending=null;announced=false;render(w.drawTip);}else if(action==='check'){const result=announce();render(result.complete?w.solved:result.valid?w.progress:w[result.reason],result.complete?'success':result.valid?'':'error');}else if(action==='draw'||action==='erase'){mode=action;first=null;pending=null;render(mode==='draw'?w.drawTip:w.eraseTip);}else if(action==='hint'){mode='draw';first=null;pending=findShikakuHint(placed,puzzle);const clue=puzzle.clues[pending.clueIndex];render((clue?`${coord(clue.row,clue.col)} (${clue.number}) — `:'')+w[pending.key]+(pending.rectangle?` ${pending.rectangle.width}×${pending.rectangle.height}.`:''));}else if(action==='apply'&&pending?.kind==='rectangle'){commit(pending.rectangle);}
 },{signal:abort.signal});start(true);return {destroy(){abort.abort();root.classList.remove('shikaku-game');root.replaceChildren();}};
}
