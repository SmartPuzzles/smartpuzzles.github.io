/* Browser starters adapted from the owned Smart Sudoku / Smart Binairo puzzle banks.
 * Values are 0=empty; Binairo 1/2 display as 0/1 or sun/moon.
 * Coaching deliberately uses supported local deductions, never a guessed answer.
 */
const clone=x=>JSON.parse(JSON.stringify(x));
const coord=(r,c)=>`${String.fromCharCode(65+r)}${c+1}`;
const shape=(b,kind)=>Array.isArray(b)&&b.length>=4&&b.length<=14&&(kind==='sudoku'?[6,9].includes(b.length):b.length%2===0)&&b.every(r=>Array.isArray(r)&&r.length===b.length);

function validation(board,kind,signs=null,givens=null){
 if(!shape(board,kind))return {valid:false,complete:false,cells:[],rules:['shape']};
 const n=board.length,cells=new Set(),rules=new Set();
 const issue=(list,rule)=>{list.forEach(([r,c])=>cells.add(r*n+c));rules.add(rule);};
 for(let r=0;r<n;r++)for(let c=0;c<n;c++){
  const v=board[r][c];
  if(!Number.isInteger(v)||v<0||v>(kind==='sudoku'?n:2))issue([[r,c]],'value');
  if(givens?.[r]?.[c] && v!==givens[r][c])issue([[r,c]],'given');
 }
 const units=[];
 for(let r=0;r<n;r++)units.push(Array.from({length:n},(_,c)=>[r,c]));
 for(let c=0;c<n;c++)units.push(Array.from({length:n},(_,r)=>[r,c]));
 if(kind==='sudoku'){
  const br=n===6?2:3;
  for(let r=0;r<n;r+=br)for(let c=0;c<n;c+=3)units.push(Array.from({length:n},(_,i)=>[r+Math.floor(i/3),c+i%3]));
  for(const unit of units){const positions=new Map();for(const [r,c]of unit){const v=board[r][c];if(v>0){if(!positions.has(v))positions.set(v,[]);positions.get(v).push([r,c]);}}for(const ps of positions.values())if(ps.length>1)issue(ps,'duplicate');}
 }else{
  for(const unit of units){
   for(const value of [1,2]){const same=unit.filter(([r,c])=>board[r][c]===value);if(same.length>n/2)issue(same,'balance');}
   for(let i=0;i<n-2;i++){const three=unit.slice(i,i+3),v=board[three[0][0]][three[0][1]];if(v>0&&three.every(([r,c])=>board[r][c]===v))issue(three,'triple');}
  }
  for(const offset of [0,n])for(let a=0;a<n;a++){
   const ua=units[offset+a];if(ua.some(([r,c])=>board[r][c]===0))continue;
   for(let b=a+1;b<n;b++){const ub=units[offset+b];if(ub.every(([r,c],i)=>board[r][c]===board[ua[i][0]][ua[i][1]]))issue([...ua,...ub],'unique');}
  }
  if(signs){
   for(let r=0;r<n;r++)for(let c=0;c<n;c++)for(const [sign,rr,cc]of [[signs.h?.[r]?.[c],r,c+1],[signs.v?.[r]?.[c],r+1,c]]){
    if(sign==null)continue;
    if(!['=','x'].includes(sign)||rr>=n||cc>=n){issue([[r,c]],'sign');continue;}
    const a=board[r][c],b=board[rr][cc];if(a&&b&&((sign==='=')!==(a===b)))issue([[r,c],[rr,cc]],'sign');
   }
  }
 }
 const valid=rules.size===0;
 return {valid,complete:valid&&board.every(r=>r.every(v=>v>0)),cells:[...cells],rules:[...rules]};
}
export const validateSudoku=(board,givens=null)=>validation(board,'sudoku',null,givens);
export const validateBinairo=(board,signs=null,givens=null)=>validation(board,'binairo',signs,givens);

export function getSudokuCandidates(board,row,col){
 if(!shape(board,'sudoku')||board[row]?.[col]!==0)return [];
 const n=board.length,br=n===6?2:3,used=new Set();
 for(let i=0;i<n;i++){used.add(board[row][i]);used.add(board[i][col]);}
 for(let r=Math.floor(row/br)*br;r<Math.floor(row/br)*br+br;r++)for(let c=Math.floor(col/3)*3;c<Math.floor(col/3)*3+3;c++)used.add(board[r][c]);
 return Array.from({length:n},(_,i)=>i+1).filter(v=>!used.has(v));
}
export function findSudokuHint(board){
 if(!validateSudoku(board).valid)return null;
 const n=board.length,br=n===6?2:3,poss=board.map((row,r)=>row.map((v,c)=>v?[]:getSudokuCandidates(board,r,c)));
 for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(poss[r][c].length===1)return {row:r,col:c,value:poss[r][c][0],rule:'single'};
 const units=[];
 for(let r=0;r<n;r++)units.push({type:'row',index:r,cells:Array.from({length:n},(_,c)=>[r,c])});
 for(let c=0;c<n;c++)units.push({type:'column',index:c,cells:Array.from({length:n},(_,r)=>[r,c])});
 for(let r=0;r<n;r+=br)for(let c=0;c<n;c+=3)units.push({type:'box',index:Math.floor(r/br)*(n/3)+Math.floor(c/3),cells:Array.from({length:n},(_,i)=>[r+Math.floor(i/3),c+i%3])});
 for(const unit of units)for(let value=1;value<=n;value++){
  const slots=unit.cells.filter(([r,c])=>poss[r][c].includes(value));
  if(slots.length===1)return {row:slots[0][0],col:slots[0][1],value,rule:'hidden',unit:unit.type,index:unit.index};
 }
 return null;
}
export function findBinairoHint(board,signs=null){
 if(!validateBinairo(board,signs).valid)return null;
 const n=board.length;
 for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(board[r][c]===0){
  for(const [sign,rr,cc]of [[signs?.h?.[r]?.[c-1],r,c-1],[signs?.h?.[r]?.[c],r,c+1],[signs?.v?.[r-1]?.[c],r-1,c],[signs?.v?.[r]?.[c],r+1,c]]){
   if(rr<0||cc<0||rr>=n||cc>=n||!board[rr][cc]||!['=','x'].includes(sign))continue;
   const value=sign==='='?board[rr][cc]:3-board[rr][cc];
   const test=clone(board);test[r][c]=value;
   if(validateBinairo(test,signs).valid)return {row:r,col:c,value,rule:sign==='='?'equal':'opposite',other:[rr,cc]};
  }
  const candidates=[],rejected={};
  for(const value of [1,2]){const test=clone(board);test[r][c]=value;const result=validateBinairo(test,signs);if(result.valid)candidates.push(value);else rejected[value]=result.rules[0];}
  if(candidates.length===1){
   const value=candidates[0],bad=3-value,rule=rejected[bad],test=clone(board);test[r][c]=bad;
   const proof={};
   for(const [unit,index,cells]of [['row',r,Array.from({length:n},(_,cc)=>[r,cc])],['column',c,Array.from({length:n},(_,rr)=>[rr,c])]]){
    if(rule==='balance'&&cells.filter(([rr,cc])=>test[rr][cc]===bad).length>n/2){Object.assign(proof,{unit,index,limit:n/2});break;}
    if(rule==='triple')for(let i=0;i<n-2;i++){const three=cells.slice(i,i+3);if(three.every(([rr,cc])=>test[rr][cc]===bad)){Object.assign(proof,{unit,index,witnesses:three});break;}}
    if(rule==='unique'&&cells.every(([rr,cc])=>test[rr][cc]))for(let other=0;other<n;other++)if(other!==index){const peer=Array.from({length:n},(_,k)=>unit==='row'?[other,k]:[k,other]);if(peer.every(([rr,cc],i)=>test[rr][cc]===test[cells[i][0]][cells[i][1]])){Object.assign(proof,{unit,index,peerIndex:other});break;}}
    if(proof.unit)break;
   }
   return {row:r,col:c,value,rule,rejected:bad,...proof};
  }
 }
 return null;
}

const TEXT={
 en:{loading:'Loading a puzzle…',loadError:'The puzzle could not load. Check your connection and try again.',retry:'Try again',size:'Board',difficulty:'Difficulty',easy:'Starter',medium:'Practice',newGame:'New puzzle',reset:'Restart',undo:'Undo',check:'Check',coach:'Coach',pencil:'Pencil marks',auto:'Auto Pencil',erase:'Erase',apply:'Apply this step',close:'Close',theme:'Symbols',numeric:'0 / 1',sunmoon:'Sun / Moon',empty:'empty',given:'fixed clue',selected:'Selected cell',saved:'Progress is saved in this browser.',ready:'Choose a cell to begin.',correct:'No incorrect entries so far. Keep going.',wrong:'Review the highlighted entries. They do not match this puzzle’s solution.',solved:'Puzzle complete. Nicely reasoned!',readonly:'This is a fixed clue. Choose an empty or editable cell.',noteFirst:'Erase the value before adding pencil marks.',none:'No supported forced step was found. You can keep playing, inspect the candidate notes, or try another puzzle.',review:'Review the highlighted entries before asking for a logical step.',sudokuRules:'Fill every row, column and box with each digit once. Select a cell, then a digit. Arrow keys move; Delete erases. Pencil marks record possibilities.',binairoRules:'Use equal numbers of each symbol in every row and column. Never place three alike in a line. Complete rows and columns must be different. Between cells, = means same and × means different. Click a cell to cycle; keys 0 and 1 enter symbols.',single:'Only candidate',hidden:'Only place in a unit',equal:'Equal-sign link',opposite:'Opposite-sign link',triple:'Avoid three in a line',balance:'Balance the symbols',unique:'Keep complete lines different',sign:'Respect the sign',where:'Look at',reason:'Why it works',action:'Your next step',unitRow:'row',unitColumn:'column',unitBox:'box'},
 'zh-Hant':{loading:'正在載入題目…',loadError:'題目未能載入。請檢查網絡再試。',retry:'再試一次',size:'棋盤',difficulty:'難度',easy:'入門',medium:'練習',newGame:'新題目',reset:'重新開始',undo:'復原',check:'檢查',coach:'教練',pencil:'鉛筆筆記',auto:'自動鉛筆',erase:'清除',apply:'應用呢一步',close:'關閉',theme:'符號',numeric:'0 / 1',sunmoon:'太陽／月亮',empty:'空格',given:'固定提示',selected:'所選格子',saved:'進度會儲存喺呢個瀏覽器。',ready:'揀一格開始。',correct:'暫時未有錯誤，繼續諗。',wrong:'請檢查著色格，呢啲輸入同題目解答唔一致。',solved:'完成！今次諗通咗。',readonly:'呢格係固定提示，請揀其他格。',noteFirst:'先清除數字，再加鉛筆筆記。',none:'暫時搵唔到支援嘅必然一步。你仍可繼續玩、檢查候選數，或者開另一題。',review:'先檢查著色格嘅輸入，再搵下一步推理。',sudokuRules:'每行、每列同每宮都要各有一個數字。揀格後撳數字；方向鍵移動，Delete 清除。鉛筆筆記用嚟記低候選數。',binairoRules:'每行、每列兩種符號嘅數量要相同，唔可以連續三個一樣，完成嘅行列亦唔可以重複。格之間 = 代表相同，× 代表不同。撳格輪換；鍵盤 0、1 輸入兩種符號。',single:'唯一候選數',hidden:'單位內唯一位置',equal:'相同符號連結',opposite:'不同符號連結',triple:'避免連續三個',balance:'兩種符號要平衡',unique:'避免重複行列',sign:'依照格邊符號',where:'留意',reason:'點解係咁',action:'你嘅下一步',unitRow:'行',unitColumn:'列',unitBox:'宮'},
 'zh-Hans':{loading:'正在载入题目…',loadError:'题目未能载入。请检查网络后重试。',retry:'重试',size:'棋盘',difficulty:'难度',easy:'入门',medium:'练习',newGame:'新题目',reset:'重新开始',undo:'撤销',check:'检查',coach:'教练',pencil:'铅笔笔记',auto:'自动铅笔',erase:'清除',apply:'应用这一步',close:'关闭',theme:'符号',numeric:'0 / 1',sunmoon:'太阳／月亮',empty:'空格',given:'固定提示',selected:'所选单元格',saved:'进度保存在此浏览器。',ready:'选择一个位置开始。',correct:'暂时没有错误，继续思考。',wrong:'请检查着色位置，这些输入与题目解答不一致。',solved:'完成！这次想通了。',readonly:'这是固定提示，请选择其他位置。',noteFirst:'先清除数字，再添加铅笔笔记。',none:'暂时没有找到支持的必然步骤。你仍可继续玩、检查候选数，或打开另一题。',review:'先检查着色位置的输入，再寻找下一步推理。',sudokuRules:'每行、每列、每宫都要各有一个数字。选格后按数字；方向键移动，Delete 清除。铅笔笔记用于记录候选数。',binairoRules:'每行、每列两种符号的数量要相同，不能连续三个相同，完成的行列也不能重复。格间 = 表示相同，× 表示不同。点击轮换；键盘 0、1 输入两种符号。',single:'唯一候选数',hidden:'单元内唯一位置',equal:'相同符号连接',opposite:'不同符号连接',triple:'避免连续三个',balance:'两种符号平衡',unique:'避免重复行列',sign:'遵守格边符号',where:'观察',reason:'为什么',action:'下一步',unitRow:'行',unitColumn:'列',unitBox:'宫'},
 ja:{loading:'問題を読み込み中…',loadError:'問題を読み込めませんでした。接続を確認して再試行してください。',retry:'再試行',size:'盤面',difficulty:'難易度',easy:'入門',medium:'練習',newGame:'新しい問題',reset:'最初から',undo:'元に戻す',check:'確認',coach:'コーチ',pencil:'候補メモ',auto:'自動メモ',erase:'消す',apply:'この一手を適用',close:'閉じる',theme:'記号',numeric:'0 / 1',sunmoon:'太陽／月',empty:'空き',given:'固定数字',selected:'選択したマス',saved:'進捗はこのブラウザーに保存されます。',ready:'マスを選んで始めましょう。',correct:'今のところ間違いはありません。',wrong:'色のついた入力を確認してください。問題の解答と一致しません。',solved:'完成です！',readonly:'ここは固定されたマスです。別のマスを選んでください。',noteFirst:'数字を消してから候補をメモしてください。',none:'対応する確定手は見つかりませんでした。候補を見直す、続けて考える、別の問題を選ぶことができます。',review:'色のついた入力を見直してから次の一手を探しましょう。',sudokuRules:'行・列・ブロックに各数字を一度ずつ入れます。マスと数字を選択。矢印キーで移動、Deleteで消去。候補メモも使えます。',binairoRules:'各行・各列で2種類の記号を同数にし、同じ記号を3つ続けないようにします。完成した行同士・列同士は異なる必要があります。= は同じ、× は異なる記号です。クリックで切り替え、キー0・1で入力。',single:'唯一の候補',hidden:'単位内の唯一の位置',equal:'同じ記号のリンク',opposite:'異なる記号のリンク',triple:'3連続を避ける',balance:'記号の数をそろえる',unique:'同じ行列を避ける',sign:'リンクに従う',where:'注目するマス',reason:'理由',action:'次の一手',unitRow:'行',unitColumn:'列',unitBox:'ブロック'},
 ko:{loading:'퍼즐을 불러오는 중…',loadError:'퍼즐을 불러오지 못했습니다. 연결을 확인하고 다시 시도하세요.',retry:'다시 시도',size:'보드',difficulty:'난이도',easy:'입문',medium:'연습',newGame:'새 퍼즐',reset:'처음부터',undo:'되돌리기',check:'확인',coach:'코치',pencil:'후보 메모',auto:'자동 메모',erase:'지우기',apply:'이 수 적용',close:'닫기',theme:'기호',numeric:'0 / 1',sunmoon:'태양／달',empty:'빈칸',given:'고정 단서',selected:'선택한 칸',saved:'진행 상황은 이 브라우저에 저장됩니다.',ready:'칸을 선택해 시작하세요.',correct:'현재까지 잘못된 입력이 없습니다.',wrong:'색이 표시된 입력을 확인하세요. 퍼즐의 해답과 일치하지 않습니다.',solved:'퍼즐 완성!',readonly:'고정 단서입니다. 다른 칸을 선택하세요.',noteFirst:'숫자를 지운 후 후보를 메모하세요.',none:'지원하는 확정 수를 찾지 못했습니다. 후보를 검토하거나 계속 풀거나 다른 퍼즐을 선택할 수 있습니다.',review:'색이 표시된 입력을 검토한 뒤 다음 논리 단계를 찾아보세요.',sudokuRules:'각 행·열·구역에 숫자를 한 번씩 넣으세요. 칸을 선택한 뒤 숫자를 누르세요. 방향키로 이동, Delete로 지우기. 후보 메모도 가능합니다.',binairoRules:'각 행과 열에 두 기호를 같은 수로 넣고 같은 기호가 세 개 연속되지 않게 하세요. 완성된 행끼리와 열끼리는 서로 달라야 합니다. =는 같음, ×는 다름입니다. 클릭으로 순환하고 0·1 키로 입력하세요.',single:'유일한 후보',hidden:'단위 내 유일한 위치',equal:'같은 기호 연결',opposite:'다른 기호 연결',triple:'세 개 연속 피하기',balance:'기호 수 맞추기',unique:'행과 열 중복 피하기',sign:'연결 기호 따르기',where:'살펴볼 칸',reason:'이유',action:'다음 수',unitRow:'행',unitColumn:'열',unitBox:'구역'}
};
function explain(h,locale,display){
 const t=TEXT[locale]||TEXT.en,c=coord(h.row,h.col),v=display(h.value),other=h.other?coord(...h.other):'',bad=display(h.rejected||3-h.value);
 const unitName=h.unit?t['unit'+h.unit[0].toUpperCase()+h.unit.slice(1)]:'',unitIndex=h.unit==='row'?String.fromCharCode(65+h.index):String(h.index+1),unit=`${unitName} ${unitIndex}`,peer=h.unit==='row'?String.fromCharCode(65+h.peerIndex):String(h.peerIndex+1),witnesses=h.witnesses?.map(p=>coord(...p)).join(', ');
 let precise='';
 if(h.rule==='balance'&&h.unit)precise=locale==='zh-Hant'?`${unit} 已經有 ${h.limit} 個 ${bad}，再加就會超過一半。所以 ${c} 要放 ${v}。`:locale==='zh-Hans'?`${unit} 已经有 ${h.limit} 个 ${bad}，再加就会超过一半。因此 ${c} 必须放 ${v}。`:locale==='ja'?`${unit}には${bad}がすでに${h.limit}個あります。半数を超えられないので、${c}は${v}です。`:locale==='ko'?`${unit}에 ${bad}가 이미 ${h.limit}개 있습니다. 절반을 넘을 수 없으므로 ${c}는 ${v}여야 합니다.`:`${unit} already has ${h.limit} ${bad} symbols. Another would exceed half the line, so ${c} must contain ${v}.`;
 if(h.rule==='triple'&&witnesses)precise=locale==='zh-Hant'?`如果 ${c} 放 ${bad}，${witnesses} 就會連續三個相同。要避免呢個情況，${c} 要放 ${v}。`:locale==='zh-Hans'?`如果在 ${c} 放 ${bad}，${witnesses} 就会连续三个相同。为避免这种情况，${c} 必须放 ${v}。`:locale==='ja'?`${c}に${bad}を入れると${witnesses}が3つ連続して同じになります。それを避けるため、${c}は${v}です。`:locale==='ko'?`${c}에 ${bad}를 넣으면 ${witnesses}에서 같은 기호가 세 개 연속됩니다. 이를 피하려면 ${v}를 넣어야 합니다.`:`Putting ${bad} in ${c} would make ${witnesses} three identical neighbours. Use ${v} to avoid that triple.`;
 if(h.rule==='unique'&&h.unit)precise=locale==='zh-Hant'?`如果 ${c} 放 ${bad}，${unit} 就會同 ${unitName} ${peer} 完全相同。完成嘅行列唔可以重複，所以要放 ${v}。`:locale==='zh-Hans'?`如果在 ${c} 放 ${bad}，${unit} 就会与 ${unitName} ${peer} 完全相同。完成的行列不能重复，因此必须放 ${v}。`:locale==='ja'?`${c}に${bad}を入れると${unit}は${unitName} ${peer}と同じになります。完成した行列は異なる必要があるため${v}です。`:locale==='ko'?`${c}에 ${bad}를 넣으면 ${unit}이 ${unitName} ${peer}와 같아집니다. 완성된 행과 열은 서로 달라야 하므로 ${v}가 필요합니다.`:`Putting ${bad} in ${c} would make ${unit} identical to ${unitName} ${peer}. Complete lines must differ, so use ${v}.`;
 if(precise)return {title:t[h.rule]||t.sign,where:c,reason:precise,action:locale==='zh-Hant'?`試下喺 ${c} 放 ${v}。`:locale==='zh-Hans'?`尝试在 ${c} 放 ${v}。`:locale==='ja'?`${c}に${v}を入れてみましょう。`:locale==='ko'?`${c}에 ${v}를 놓아 보세요.`:`Try placing ${v} in ${c}.`};
 if(locale==='zh-Hant'||locale==='zh-Hans'){
  const tc=locale==='zh-Hant';
  const reason=h.rule==='single'?(tc?`檢查 ${c} 所在嘅行、列同宮後，其他數字都被排除，只剩 ${v}。`:`检查 ${c} 所在的行、列和宫后，其他数字均被排除，只剩 ${v}。`):h.rule==='hidden'?(tc?`${t['unit'+h.unit[0].toUpperCase()+h.unit.slice(1)]}內嘅 ${v} 只可以放喺 ${c}，其他空格都唔容許呢個候選數。`:`所在单元内的 ${v} 只能放在 ${c}，其他空格均不允许这个候选数。`):h.rule==='equal'?(tc?`${c} 同 ${other} 之間有 =，所以兩格要相同。${other} 已經係 ${v}。`:`${c} 与 ${other} 之间有 =，两格必须相同。${other} 已经是 ${v}。`):h.rule==='opposite'?(tc?`${c} 同 ${other} 之間有 ×，所以兩格要不同。另一格嘅符號已知，呢格就要係 ${v}。`:`${c} 与 ${other} 之间有 ×，两格必须不同。另一格的符号已知，这格必须是 ${v}。`):(tc?`如果 ${c} 放 ${bad}，就會違反「${t[h.rule]||t.sign}」。兩種符號只剩 ${v} 可以放。`:`如果在 ${c} 放 ${bad}，会违反「${t[h.rule]||t.sign}」。两种符号中只剩 ${v} 可以放。`);
  return {title:t[h.rule]||t.sign,where:c,reason,action:tc?`試下喺 ${c} 放 ${v}。`:`尝试在 ${c} 放 ${v}。`};
 }
 if(locale==='ja')return {title:t[h.rule]||t.sign,where:c,reason:h.rule==='single'?`${c}の行・列・ブロックの数字を除くと、候補は${v}だけです。`:h.rule==='hidden'?`この単位で${v}を置けるのは${c}だけです。`:h.rule==='equal'?`${c}と${other}は「=」で結ばれ、同じ${v}になります。`:h.rule==='opposite'?`${c}と${other}は「×」で結ばれ、異なる記号が必要なので${v}です。`:`${c}に${bad}を入れると「${t[h.rule]||t.sign}」に違反します。${v}だけが可能です。`,action:`${c}に${v}を入れてみましょう。`};
 if(locale==='ko')return {title:t[h.rule]||t.sign,where:c,reason:h.rule==='single'?`${c}의 행·열·구역에서 사용한 숫자를 제외하면 후보는 ${v}뿐입니다.`:h.rule==='hidden'?`이 단위에서 ${v}을 놓을 수 있는 칸은 ${c}뿐입니다.`:h.rule==='equal'?`${c}와 ${other}는 =로 연결되어 같은 ${v}이어야 합니다.`:h.rule==='opposite'?`${c}와 ${other}는 ×로 연결되어 서로 달라야 하므로 ${v}입니다.`:`${c}에 ${bad}를 놓으면 「${t[h.rule]||t.sign}」 규칙을 어깁니다. ${v}만 가능합니다.`,action:`${c}에 ${v}를 놓아 보세요.`};
 return {title:t[h.rule]||t.sign,where:c,reason:h.rule==='single'?`After checking the digits already used in its row, column and box, ${c} has just one candidate: ${v}.`:h.rule==='hidden'?`In this ${h.unit}, ${v} has only one possible position: ${c}. Every other empty cell excludes it.`:h.rule==='equal'?`The = link means ${c} and ${other} must match. ${other} already contains ${v}.`:h.rule==='opposite'?`The × link means ${c} and ${other} must differ. The neighbouring symbol is known, so ${c} must be ${v}.`:`Putting ${bad} in ${c} would break the rule “${t[h.rule]||t.sign}”. Of the two symbols, only ${v} remains legal.`,action:`Try placing ${v} in ${c}.`};
}

let bankPromise;
function getBank(){
 if(!bankPromise){
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);
  bankPromise=fetch(new URL('../data/numbers/starter.json',import.meta.url),{signal:controller.signal}).then(r=>{if(!r.ok)throw new Error('Puzzle download failed');return r.json();}).catch(e=>{bankPromise=null;throw e;}).finally(()=>clearTimeout(timeout));
 }
 return bankPromise;
}
const CSS=`
.numbers-game{color:inherit;max-width:680px;margin:auto}.numbers-game *{box-sizing:border-box}.numbers-game .number-options{display:flex;flex-wrap:wrap;gap:14px;margin:16px 0}.numbers-game label{display:flex;gap:8px;align-items:center;font-size:14px}.numbers-game select,.numbers-game button{font:inherit}.numbers-game select{padding:9px;background:#15243a;color:#f4f6fb;border:1px solid #486080;border-radius:8px;min-height:44px}.numbers-game .game-note{font-size:14px;color:#b5c4d8;line-height:1.7}.numbers-game .number-board{--size:9;display:grid;grid-template-columns:repeat(var(--size),minmax(0,1fr));gap:2px;border:2px solid #9baac0;border-radius:8px;background:#43536d;overflow:visible;width:100%;margin:22px 0 18px}.numbers-game .cell{position:relative;aspect-ratio:1;min-width:0;min-height:0;border:0;padding:0;display:flex;align-items:center;justify-content:center;background:#152035;color:#7db2ff;font-size:clamp(17px,4vw,29px);cursor:pointer;touch-action:manipulation;line-height:1.1;border-radius:0}.numbers-game .cell.given{color:#f4f6fb;font-weight:700;background:#101a2b}.numbers-game .cell.selected{background:#285698;box-shadow:inset 0 0 0 2px #b2d0ff;z-index:2}.numbers-game .cell.peer:not(.selected){background:#20334b}.numbers-game .cell.error{box-shadow:inset 0 0 0 2px #ff9186;background:#592a35}.numbers-game .cell.hint{outline:3px solid #ffb45a;outline-offset:-3px}.numbers-game .cell.box-right{border-right:2px solid #9baac0}.numbers-game .cell.box-bottom{border-bottom:2px solid #9baac0}.numbers-game .cell:focus-visible{outline:3px solid #ffbd75;outline-offset:1px;z-index:5}.numbers-game .notes{display:grid;grid-template-columns:repeat(3,1fr);width:92%;height:90%;font-size:clamp(8px,1.9vw,12px);color:#bdcbe0;align-items:center;text-align:center}.numbers-game .edge-h,.numbers-game .edge-v{position:absolute;z-index:4;background:#18283e;color:#ffe0aa;border-radius:4px;min-width:15px;min-height:15px;font:700 12px/15px system-ui;text-align:center;pointer-events:none}.numbers-game .edge-h{right:-9px;top:calc(50% - 7px)}.numbers-game .edge-v{bottom:-9px;left:calc(50% - 7px)}.numbers-game .game-toolbar,.numbers-game .number-pad{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}.numbers-game .game-toolbar button,.numbers-game .number-pad button,.numbers-game .coach-panel button,.numbers-game .retry{min-height:44px;min-width:44px;border:1px solid #4d6687;border-radius:9px;background:#1b304e;color:#f4f6fb;padding:10px 14px;cursor:pointer}.numbers-game .game-toolbar button:hover,.numbers-game .number-pad button:hover{background:#2a4871}.numbers-game button:focus-visible,.numbers-game select:focus-visible{outline:3px solid #ffbd75;outline-offset:3px}.numbers-game button[aria-pressed=true]{background:#2a5b9d;border-color:#b9d8ff}.numbers-game button:disabled{opacity:.45;cursor:default}.numbers-game .number-pad button{flex:1;padding:8px;min-width:35px;font-weight:700}.numbers-game .game-message{padding:13px 0;color:#d2e2fa;min-height:50px;line-height:1.6}.numbers-game .coach-panel{border:1px solid #c48a47;background:#282619;border-radius:12px;padding:18px;margin:18px 0;line-height:1.7}.numbers-game .coach-panel:empty{display:none}.numbers-game .coach-panel h3{font-size:19px;margin:0 0 15px}.numbers-game .coach-panel h4{font-size:13px;color:#ffce8b;margin:15px 0 5px}.numbers-game .coach-panel p{margin:0}.numbers-game .coach-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:16px}.numbers-game .local-note{font-size:12px;color:#94a8c2}.numbers-game .board-heading{font-size:15px;color:#c5d6ef;margin:12px 0}.binairo-game .number-board{gap:4px}.binairo-game .cell{font-size:clamp(24px,6vw,39px)}@media(prefers-reduced-motion:reduce){.numbers-game *{scroll-behavior:auto}}
`;
const safeStorage={get(key){try{return JSON.parse(localStorage.getItem(key));}catch{return null;}},set(key,v){try{localStorage.setItem(key,JSON.stringify(v));}catch{}}};

function mountNumbers(root,options,kind){
 const locale=TEXT[options.locale]?options.locale:'en',t=TEXT[locale],storageKey=`smartpuzzles:web:${kind}:v1`;
 let dead=false,bank=[],puzzle=null,board=[],notes=[],selected=0,pencil=false,theme=kind==='binairo'?'sunmoon':'numeric',history=[],errors=[],hint=null,celebrated=false,size=kind==='sudoku'?9:6,difficulty='easy',message=t.ready;
 const display=v=>v?(kind==='sudoku'?String(v):(theme==='sunmoon'?(v===1?'☀':'☾'):String(v-1))):'';
 const button=(action,label,extra='')=>`<button type="button" data-action="${action}" ${extra}>${label}</button>`;
 const check=()=>kind==='sudoku'?validateSudoku(board,puzzle.puzzle):validateBinairo(board,puzzle.signs,puzzle.puzzle);
 function persist(){if(puzzle)safeStorage.set(storageKey,{key:puzzle.key,board,notes,selected,pencil,theme,celebrated});}
 function remember(){history.push({board:clone(board),notes:clone(notes),selected});if(history.length>150)history.shift();}
 function wrongCells(){const cells=[];for(let r=0;r<size;r++)for(let c=0;c<size;c++)if(board[r][c]&&board[r][c]!==puzzle.solution[r][c])cells.push(r*size+c);return cells;}
 function complete(){const result=check();if(result.complete){message=t.solved;if(!celebrated){celebrated=true;try{options.onComplete?.({gameId:kind,puzzleId:puzzle.key,size});}catch{}}}return result;}
 function shell(){
  root.classList.add('numbers-game',`${kind}-game`);
  root.innerHTML=`<style>${CSS}</style><p class="game-note">${t[kind+'Rules']}</p><div class="number-options"><label>${t.size}<select data-select="size">${(kind==='sudoku'?[6,9]:[6,8]).map(n=>`<option value="${n}">${n}×${n}</option>`).join('')}</select></label><label>${t.difficulty}<select data-select="difficulty"><option value="easy">${t.easy}</option><option value="medium">${t.medium}</option></select></label>${kind==='binairo'?`<label>${t.theme}<select data-select="theme"><option value="sunmoon">${t.sunmoon}</option><option value="numeric">${t.numeric}</option></select></label>`:''}</div><div class="game-toolbar">${button('new',t.newGame)}${button('reset',t.reset)}${button('undo',t.undo)}${button('check',t.check)}${button('hint',t.coach)}</div><p class="board-heading" data-heading></p><div class="game-board number-board" role="grid" aria-label="${kind==='sudoku'?'Sudoku':'Binairo'}"></div><div class="number-pad"></div>${kind==='sudoku'?`<div class="game-toolbar">${button('pencil',t.pencil,'aria-pressed="false"')}${button('auto',t.auto)}${button('erase',t.erase)}</div>`:`<div class="game-toolbar">${button('erase',t.erase)}</div>`}<div class="game-message" role="status" aria-live="polite"></div><div class="coach-panel" aria-live="polite"></div><p class="local-note">${t.saved}</p>`;
 }
 function choose(next=false,restore=null){
  const pool=bank.filter(p=>p.size===size&&p.difficulty===difficulty);if(!pool.length)return;
  const old=pool.findIndex(p=>p.key===puzzle?.key);
  puzzle=restore?bank.find(p=>p.key===restore.key):pool[next?(old+1)%pool.length:0];
  if(!puzzle)puzzle=pool[0];size=puzzle.size;difficulty=puzzle.difficulty;
  board=clone(puzzle.puzzle);notes=Array.from({length:size*size},()=>[]);selected=board.flat().findIndex(v=>!v);if(selected<0)selected=0;
  pencil=false;history=[];hint=null;errors=[];message=t.ready;celebrated=false;
  if(restore&&shape(restore.board,kind)&&restore.board.length===size&&restore.board.every((row,r)=>row.every((v,c)=>Number.isInteger(v)&&v>=0&&v<=(kind==='sudoku'?size:2)&&(!puzzle.puzzle[r][c]||v===puzzle.puzzle[r][c])))){
   board=clone(restore.board);selected=Number.isInteger(restore.selected)&&restore.selected>=0&&restore.selected<size*size?restore.selected:selected;pencil=kind==='sudoku'&&Boolean(restore.pencil);theme=['sunmoon','numeric'].includes(restore.theme)?restore.theme:theme;celebrated=Boolean(restore.celebrated);
   if(Array.isArray(restore.notes)&&restore.notes.length===size*size)notes=restore.notes.map(ns=>Array.isArray(ns)?[...new Set(ns.filter(v=>Number.isInteger(v)&&v>=1&&v<=size))]:[]);
  }
  render();persist();
 }
 function render(focus=false){
  if(dead||!puzzle)return;
  const grid=root.querySelector('.number-board');grid.style.setProperty('--size',String(size));grid.setAttribute('aria-rowcount',size);grid.setAttribute('aria-colcount',size);
  const sr=Math.floor(selected/size),sc=selected%size,br=size===6?2:3;
  grid.innerHTML=board.map((row,r)=>row.map((v,c)=>{
   const i=r*size+c,fixed=Boolean(puzzle.puzzle[r][c]),classes=['cell',fixed?'given':'',i===selected?'selected':'',errors.includes(i)?'error':'',hint&&hint.row===r&&hint.col===c?'hint':''];
   if(kind==='sudoku'){if(r===sr||c===sc||(Math.floor(r/br)===Math.floor(sr/br)&&Math.floor(c/3)===Math.floor(sc/3)))classes.push('peer');if(c<size-1&&(c+1)%3===0)classes.push('box-right');if(r<size-1&&(r+1)%br===0)classes.push('box-bottom');}
   const noteHTML=kind==='sudoku'&&!v&&notes[i].length?`<span class="notes" aria-hidden="true">${Array.from({length:size},(_,k)=>`<span>${notes[i].includes(k+1)?k+1:''}</span>`).join('')}</span>`:'';
   const h=kind==='binairo'?puzzle.signs?.h?.[r]?.[c]:null,vert=kind==='binairo'?puzzle.signs?.v?.[r]?.[c]:null;
   const signs=(h?`<span class="edge-h" aria-hidden="true">${h==='x'?'×':'='}</span>`:'')+(vert?`<span class="edge-v" aria-hidden="true">${vert==='x'?'×':'='}</span>`:'');
   const label=`${coord(r,c)}: ${v?display(v):t.empty}${fixed?', '+t.given:''}${!v&&notes[i].length?', '+t.pencil+': '+notes[i].join(', '):''}`;
   return `<button type="button" role="gridcell" class="${classes.filter(Boolean).join(' ')}" data-cell="${i}" aria-label="${label}" aria-readonly="${fixed}" aria-selected="${i===selected}" tabindex="${i===selected?0:-1}">${noteHTML||display(v)||'<span aria-hidden="true">·</span>'}${signs}</button>`;
  }).join('')).join('');
  root.querySelector('[data-heading]').textContent=`${size}×${size} · ${t[difficulty]} · ${t.selected}: ${coord(sr,sc)}`;
  root.querySelector('[data-select=size]').value=String(size);root.querySelector('[data-select=difficulty]').value=difficulty;
  if(kind==='binairo')root.querySelector('[data-select=theme]').value=theme;
  root.querySelector('[data-action=undo]').disabled=history.length===0;
  if(kind==='sudoku')root.querySelector('[data-action=pencil]').setAttribute('aria-pressed',String(pencil));
  root.querySelector('.number-pad').innerHTML=(kind==='sudoku'?Array.from({length:size},(_,i)=>i+1):[1,2]).map(v=>`<button type="button" data-value="${v}">${display(v)}</button>`).join('');
  root.querySelector('.game-message').textContent=message;
  const panel=root.querySelector('.coach-panel');
  if(hint){const h=explain(hint,locale,display);panel.innerHTML=`<h3>${t.coach}: ${h.title}</h3><h4>${t.where}</h4><p>${h.where}</p><h4>${t.reason}</h4><p>${h.reason}</p><h4>${t.action}</h4><p>${h.action}</p><div class="coach-actions">${button('apply',t.apply)}${button('close',t.close)}</div>`;}else panel.replaceChildren();
  if(focus)root.querySelector(`[data-cell="${selected}"]`)?.focus({preventScroll:true});
 }
 function enter(value){
  const r=Math.floor(selected/size),c=selected%size;if(puzzle.puzzle[r][c]){message=t.readonly;render(true);return;}
  if(!Number.isInteger(value)||value<0||value>(kind==='sudoku'?size:2))return;
  if(kind==='sudoku'&&pencil&&value){if(board[r][c]){message=t.noteFirst;render(true);return;}remember();notes[selected]=notes[selected].includes(value)?notes[selected].filter(v=>v!==value):[...notes[selected],value].sort((a,b)=>a-b);}else{if(board[r][c]===value&&notes[selected].length===0)return;remember();board[r][c]=value;notes[selected]=[];}
  errors=[];hint=null;message=t.ready;complete();render(true);persist();
 }
 function action(name){
  if(name==='new'){choose(true);return;}
  if(name==='reset'){remember();board=clone(puzzle.puzzle);notes=Array.from({length:size*size},()=>[]);errors=[];hint=null;message=t.ready;}
  if(name==='undo'){const prev=history.pop();if(prev){board=prev.board;notes=prev.notes;selected=prev.selected;errors=[];hint=null;message=t.ready;}}
  if(name==='erase'){const was=pencil;pencil=false;enter(0);pencil=was;render(true);persist();return;}
  if(name==='pencil')pencil=!pencil;
  if(name==='auto'){
   if(wrongCells().length){errors=wrongCells();message=t.review;}else{remember();notes=board.flatMap((row,r)=>row.map((v,c)=>v?[]:getSudokuCandidates(board,r,c)));message=t.auto;}
  }
  if(name==='check'){errors=wrongCells();message=errors.length?t.wrong:t.correct;if(!errors.length)complete();}
  if(name==='hint'){
   errors=wrongCells();if(errors.length){hint=null;message=t.review;}else{hint=kind==='sudoku'?findSudokuHint(board):findBinairoHint(board,puzzle.signs);message=hint?t.coach:t.none;if(hint)selected=hint.row*size+hint.col;}
  }
  if(name==='apply'&&hint){const move=hint;selected=move.row*size+move.col;const was=pencil;pencil=false;enter(move.value);pencil=was;render(true);persist();return;}
  if(name==='close')hint=null;
  render();persist();
 }
 const onClick=e=>{
  const target=e.target.closest('button');if(!target||!root.contains(target)||!puzzle)return;
  if(target.dataset.cell!==undefined){selected=Number(target.dataset.cell);if(kind==='binairo'){const r=Math.floor(selected/size),c=selected%size;if(!puzzle.puzzle[r][c])enter((board[r][c]+1)%3);else{message=t.readonly;render(true);}}else render(true);persist();}
  else if(target.dataset.value)enter(Number(target.dataset.value));else if(target.dataset.action)action(target.dataset.action);
 };
 const onChange=e=>{if(!puzzle)return;const type=e.target.dataset.select;if(type==='size'){size=Number(e.target.value);choose(false);}if(type==='difficulty'){difficulty=e.target.value;choose(false);}if(type==='theme'){theme=e.target.value;render();persist();}};
 const onKey=e=>{
  if(!puzzle||['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)||e.ctrlKey||e.metaKey||e.altKey)return;
  const r=Math.floor(selected/size),c=selected%size,arrows={ArrowLeft:[r,Math.max(0,c-1)],ArrowRight:[r,Math.min(size-1,c+1)],ArrowUp:[Math.max(0,r-1),c],ArrowDown:[Math.min(size-1,r+1),c]};
  if(arrows[e.key]){e.preventDefault();const [rr,cc]=arrows[e.key];selected=rr*size+cc;render(true);persist();return;}
  if(e.key==='Backspace'||e.key==='Delete'){e.preventDefault();action('erase');return;}
  if(kind==='sudoku'&&/^[1-9]$/.test(e.key)&&Number(e.key)<=size){e.preventDefault();enter(Number(e.key));}
  if(kind==='binairo'&&/^[01]$/.test(e.key)){e.preventDefault();enter(Number(e.key)+1);}
 };
 function load(){
  root.classList.add('numbers-game');root.textContent=t.loading;
  return getBank().then(data=>{
   if(dead)return;bank=data[kind];if(!Array.isArray(bank)||!bank.length)throw new Error('Empty puzzle pool');
   shell();root.addEventListener('click',onClick);root.addEventListener('change',onChange);root.addEventListener('keydown',onKey);
   const saved=safeStorage.get(storageKey);const existing=saved&&bank.find(p=>p.key===saved.key);if(existing){size=existing.size;difficulty=existing.difficulty;}choose(false,existing?saved:null);
  }).catch(()=>{if(dead)return;root.removeEventListener('click',onClick);root.removeEventListener('change',onChange);root.removeEventListener('keydown',onKey);root.innerHTML=`<p class="game-message">${t.loadError}</p><button type="button" class="retry">${t.retry}</button>`;root.querySelector('button').addEventListener('click',load,{once:true});});
 }
 const ready=load();
 return {ready,destroy(){dead=true;root.removeEventListener('click',onClick);root.removeEventListener('change',onChange);root.removeEventListener('keydown',onKey);root.classList.remove('numbers-game','sudoku-game','binairo-game');}};
}
export const mountSudoku=(root,options={})=>mountNumbers(root,options,'sudoku');
export const mountBinairo=(root,options={})=>mountNumbers(root,options,'binairo');
