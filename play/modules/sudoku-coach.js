/**
 * Pure browser Sudoku coaching. Owned native detector port, bounded to singles,
 * naked/hidden subsets (2–4), locked candidates and X-Wing. No backtracking,
 * solution reveal, React/DOM/network dependency or implicit application.
 * Detectors originate from SmartSudoku/src/utils/aiCoach.js; browser adapters
 * validate inputs and provide complete five-language locate/reason/action steps.
 * Candidate notes represent previously reasoned eliminations, as in the native
 * coach. Optional known solution is a safety check, never an explanation source.
 */
const getBoxDims = (size) => size === 6 ? { boxRows: 2, boxCols: 3 } : { boxRows: 3, boxCols: 3 };

const isValidPlacement = (board, row, col, num) => {
  const size = board.length;
  const { boxRows, boxCols } = getBoxDims(size);
  for (let x = 0; x < size; x++) {
    if (board[row][x] === num) return false;
  }
  for (let x = 0; x < size; x++) {
    if (board[x][col] === num) return false;
  }
  const sr = row - (row % boxRows), sc = col - (col % boxCols);
  for (let i = 0; i < boxRows; i++)
    for (let j = 0; j < boxCols; j++)
      if (board[sr + i][sc + j] === num) return false;
  return true;
};

const buildCandidateMap = (board) => {
  const size = board.length;
  const map = {};
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (board[r][c] === 0) {
        const cands = [];
        for (let n = 1; n <= size; n++) {
          if (isValidPlacement(board, r, c, n)) cands.push(n);
        }
        map[`${r},${c}`] = cands;
      }
    }
  }
  return map;
};

const cellsSeeEachOther = (r1, c1, r2, c2, size = 9) => {
  if (r1 === r2) return true;
  if (c1 === c2) return true;
  const { boxRows, boxCols } = getBoxDims(size);
  if (Math.floor(r1/boxRows) === Math.floor(r2/boxRows) && Math.floor(c1/boxCols) === Math.floor(c2/boxCols)) return true;
  return false;
};

function getCombinations(arr, size) {
  const result = [];
  function combine(start, combo) {
    if (combo.length === size) { result.push([...combo]); return; }
    for (let i = start; i < arr.length; i++) {
      combo.push(arr[i]);
      combine(i + 1, combo);
      combo.pop();
    }
  }
  combine(0, []);
  return result;
}

const getUnits = (size = 9) => {
  const { boxRows, boxCols } = getBoxDims(size);
  const units = [];
  for (let r = 0; r < size; r++) {
    const row = [];
    for (let c = 0; c < size; c++) row.push({ row: r, col: c });
    units.push(row);
  }
  for (let c = 0; c < size; c++) {
    const col = [];
    for (let r = 0; r < size; r++) col.push({ row: r, col: c });
    units.push(col);
  }
  for (let br = 0; br < size / boxRows; br++) {
    for (let bc = 0; bc < size / boxCols; bc++) {
      const box = [];
      for (let r = 0; r < boxRows; r++)
        for (let c = 0; c < boxCols; c++)
          box.push({ row: br*boxRows+r, col: bc*boxCols+c });
      units.push(box);
    }
  }
  return units;
};

const UNITS_CACHE = {};
const getUnitsForSize = (size) => {
  if (!UNITS_CACHE[size]) UNITS_CACHE[size] = getUnits(size);
  return UNITS_CACHE[size];
};

const ALL_UNITS = getUnits(9);

// ==================== TECHNIQUE DETECTORS (from generator) ====================

const findNakedSingle = (board, cm) => {
  const size = board.length;
  const { boxRows, boxCols } = getBoxDims(size);
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++) {
      const k = `${r},${c}`;
      if (cm[k]?.length === 1) {
        // Find constraining cells (cells with values in same row, column, box)
        const constrainingCells = [];
        // Row constraints
        for (let col = 0; col < size; col++) {
          if (col !== c && board[r][col] !== 0) {
            constrainingCells.push({ row: r, col, number: board[r][col], type: 'row' });
          }
        }
        // Column constraints
        for (let row = 0; row < size; row++) {
          if (row !== r && board[row][c] !== 0) {
            constrainingCells.push({ row, col: c, number: board[row][c], type: 'column' });
          }
        }
        // Box constraints
        const boxRow = Math.floor(r / boxRows) * boxRows;
        const boxCol = Math.floor(c / boxCols) * boxCols;
        for (let row = boxRow; row < boxRow + boxRows; row++) {
          for (let col = boxCol; col < boxCol + boxCols; col++) {
            if ((row !== r || col !== c) && board[row][col] !== 0) {
              if (!constrainingCells.some(cell => cell.row === row && cell.col === col)) {
                constrainingCells.push({ row, col, number: board[row][col], type: 'box' });
              }
            }
          }
        }
        return {
          type: 'naked_single',
          row: r,
          col: c,
          number: cm[k][0],
          difficulty: 'basic',
          action: 'place',
          constrainingCells
        };
      }
    }
  return null;
};

const findHiddenSingle = (board, cm) => {
  const size = board.length;
  const units = getUnitsForSize(size);
  for (const unit of units) {
    for (let num = 1; num <= size; num++) {
      const positions = unit.filter(({ row, col }) => cm[`${row},${col}`]?.includes(num));
      if (positions.length === 1) {
        const targetRow = positions[0].row;
        const targetCol = positions[0].col;

        // Find cells in the unit that block this number from going elsewhere
        const constrainingCells = unit
          .filter(({ row, col }) => {
            // Skip the target cell
            if (row === targetRow && col === targetCol) return false;
            // Include cells that already have a value
            if (board[row][col] !== 0) return true;
            // Include cells where this number is not a candidate (blocked)
            const candidates = cm[`${row},${col}`] || [];
            return !candidates.includes(num);
          })
          .map(({ row, col }) => ({
            row,
            col,
            number: board[row][col],
            blocksNumber: num
          }));

        // Find cells that contain this number and actually block empty cells in the unit.
        // An empty cell in the unit is one that has no value and is not the target cell.
        const emptyCellsInUnit = unit.filter(({ row, col }) =>
          !(row === targetRow && col === targetCol) && board[row][col] === 0
        );
        const blockingNumberCells = [];
        for (let r = 0; r < size; r++) {
          for (let c = 0; c < size; c++) {
            if (board[r][c] === num) {
              // Only include this cell if it shares a row, column, or box with at least one
              // empty cell in the unit (i.e., it geometrically blocks a cell in the unit).
              const blocksUnit = emptyCellsInUnit.some(({ row, col }) => {
                const sameRow = r === row;
                const sameCol = c === col;
                const sameBox = Math.floor(r / 3) === Math.floor(row / 3) &&
                                Math.floor(c / 3) === Math.floor(col / 3);
                return sameRow || sameCol || sameBox;
              });
              if (blocksUnit) {
                blockingNumberCells.push({ row: r, col: c, number: num });
              }
            }
          }
        }

        // Determine unit type
        const isRow = unit.every(cell => cell.row === targetRow);
        const isColumn = unit.every(cell => cell.col === targetCol);
        const unitType = isRow ? 'row' : isColumn ? 'column' : 'box';

        return {
          type: 'hidden_single',
          row: targetRow,
          col: targetCol,
          number: num,
          difficulty: 'basic',
          action: 'place',
          constrainingCells,
          blockingNumberCells,
          unitType
        };
      }
    }
  }
  return null;
};

const findNakedSubset = (board, cm) => {
  const types = { 2: 'naked_pair', 3: 'naked_triple', 4: 'naked_quad' };
  const units = getUnitsForSize(board.length);
  for (const unit of units) {
    const cells = unit.filter(({ row, col }) => cm[`${row},${col}`]).map(({ row, col }) => ({ row, col, cands: cm[`${row},${col}`] }));
    for (let size = 2; size <= 4 && size <= cells.length; size++) {
      const combos = getCombinations(cells, size);
      for (const combo of combos) {
        const allCands = [...new Set(combo.flatMap(c => c.cands))];
        if (allCands.length === size) {
          const eliminations = [];
          for (const cell of cells) {
            if (combo.some(c => c.row === cell.row && c.col === cell.col)) continue;
            const toElim = cell.cands.filter(n => allCands.includes(n));
            if (toElim.length > 0) eliminations.push({ row: cell.row, col: cell.col, numbers: toElim });
          }
          if (eliminations.length > 0) {
            const lockedCells = combo.map(c => ({ row: c.row, col: c.col }));
            const unitRows = [...new Set(unit.map(c => c.row))];
            const unitCols = [...new Set(unit.map(c => c.col))];
            const unitType = unitRows.length === 1 ? 'row' : unitCols.length === 1 ? 'column' : 'box';
            return { type: types[size], eliminations, action: 'eliminate', difficulty: 'basic', numbers: allCands, lockedCells, unitType };
          }
        }
      }
    }
  }
  return null;
};

const findHiddenSubset = (board, cm) => {
  const size = board.length;
  const types = { 2: 'hidden_pair', 3: 'hidden_triple', 4: 'hidden_quad' };
  const units = getUnitsForSize(size);
  for (const unit of units) {
    const cells = unit.filter(({ row, col }) => cm[`${row},${col}`]).map(({ row, col }) => ({ row, col, cands: cm[`${row},${col}`] }));
    if (cells.length < 3) continue;
    const numPositions = {};
    for (let num = 1; num <= size; num++) {
      const positions = cells.filter(c => c.cands.includes(num));
      if (positions.length >= 2 && positions.length <= 4) numPositions[num] = positions;
    }
    const nums = Object.keys(numPositions).map(Number);
    for (let size = 2; size <= 4 && size <= nums.length; size++) {
      const numCombos = getCombinations(nums, size);
      for (const numCombo of numCombos) {
        const involvedCells = [...new Set(numCombo.flatMap(n => numPositions[n].map(c => `${c.row},${c.col}`)))];
        if (involvedCells.length === size) {
          const eliminations = [];
          for (const key of involvedCells) {
            const [r, c] = key.split(',').map(Number);
            const toElim = cm[key].filter(n => !numCombo.includes(n));
            if (toElim.length > 0) eliminations.push({ row: r, col: c, numbers: toElim });
          }
          if (eliminations.length > 0) {
            const lockedCells = involvedCells.map(key => { const [r, c] = key.split(',').map(Number); return { row: r, col: c }; });
            const unitRows = [...new Set(unit.map(c => c.row))];
            const unitCols = [...new Set(unit.map(c => c.col))];
            let unitType, unitIndex;
            if (unitRows.length === 1) { unitType = 'row'; unitIndex = unitRows[0]; }
            else if (unitCols.length === 1) { unitType = 'col'; unitIndex = unitCols[0]; }
            else { unitType = 'box'; unitIndex = Math.floor(unitRows[0] / 3) * 3 + Math.floor(unitCols[0] / 3); }
            return { type: types[size], eliminations, action: 'eliminate', difficulty: 'basic', numbers: numCombo, lockedCells, unitType, unitIndex };
          }
        }
      }
    }
  }
  return null;
};

const findPointingPair = (board, cm) => {
  const size = board.length;
  const { boxRows, boxCols } = getBoxDims(size);
  for (let br = 0; br < size / boxRows; br++) {
    for (let bc = 0; bc < size / boxCols; bc++) {
      for (let num = 1; num <= size; num++) {
        const positions = [];
        for (let r = 0; r < boxRows; r++)
          for (let c = 0; c < boxCols; c++) {
            const row = br*boxRows+r, col = bc*boxCols+c;
            if (cm[`${row},${col}`]?.includes(num)) positions.push({ row, col });
          }
        if (positions.length < 2 || positions.length > 3) continue;
        const rows = [...new Set(positions.map(p => p.row))];
        if (rows.length === 1) {
          const eliminations = [];
          for (let c = 0; c < size; c++) {
            if (Math.floor(c/boxCols) === bc) continue;
            if (cm[`${rows[0]},${c}`]?.includes(num)) eliminations.push({ row: rows[0], col: c, numbers: [num] });
          }
          if (eliminations.length > 0) return { type: positions.length === 2 ? 'pointing_pair' : 'pointing_triple', eliminations, action: 'eliminate', difficulty: 'basic', number: num, lockedCells: positions, unitType: 'row' };
        }
        const cols = [...new Set(positions.map(p => p.col))];
        if (cols.length === 1) {
          const eliminations = [];
          for (let r = 0; r < size; r++) {
            if (Math.floor(r/boxRows) === br) continue;
            if (cm[`${r},${cols[0]}`]?.includes(num)) eliminations.push({ row: r, col: cols[0], numbers: [num] });
          }
          if (eliminations.length > 0) return { type: positions.length === 2 ? 'pointing_pair' : 'pointing_triple', eliminations, action: 'eliminate', difficulty: 'basic', number: num, lockedCells: positions, unitType: 'column' };
        }
      }
    }
  }
  return null;
};

const findBoxLineReduction = (board, cm) => {
  const size = board.length;
  const { boxRows, boxCols } = getBoxDims(size);
  for (let num = 1; num <= size; num++) {
    for (let r = 0; r < size; r++) {
      const cols = [];
      for (let c = 0; c < size; c++) if (cm[`${r},${c}`]?.includes(num)) cols.push(c);
      if (cols.length < 2 || cols.length > 3) continue;
      const boxes = [...new Set(cols.map(c => Math.floor(c/boxCols)))];
      if (boxes.length === 1) {
        const bc = boxes[0];
        const br = Math.floor(r/boxRows);
        const eliminations = [];
        for (let ri = 0; ri < boxRows; ri++) {
          const row = br*boxRows+ri;
          if (row === r) continue;
          for (let ci = 0; ci < boxCols; ci++) {
            const col = bc*boxCols+ci;
            if (cm[`${row},${col}`]?.includes(num)) eliminations.push({ row, col, numbers: [num] });
          }
        }
        if (eliminations.length > 0) {
          const lockedCells = cols.map(c => ({ row: r, col: c }));
          return { type: 'box_line_reduction', eliminations, action: 'eliminate', difficulty: 'basic', number: num, lockedCells, unitType: 'row' };
        }
      }
    }
    for (let c = 0; c < size; c++) {
      const rows = [];
      for (let r = 0; r < size; r++) if (cm[`${r},${c}`]?.includes(num)) rows.push(r);
      if (rows.length < 2 || rows.length > 3) continue;
      const boxes = [...new Set(rows.map(r => Math.floor(r/boxRows)))];
      if (boxes.length === 1) {
        const br = boxes[0];
        const bc = Math.floor(c/boxCols);
        const eliminations = [];
        for (let ci = 0; ci < boxCols; ci++) {
          const col = bc*boxCols+ci;
          if (col === c) continue;
          for (let ri = 0; ri < boxRows; ri++) {
            const row = br*boxRows+ri;
            if (cm[`${row},${col}`]?.includes(num)) eliminations.push({ row, col, numbers: [num] });
          }
        }
        if (eliminations.length > 0) {
          const lockedCells = rows.map(r => ({ row: r, col: c }));
          return { type: 'box_line_reduction', eliminations, action: 'eliminate', difficulty: 'basic', number: num, lockedCells, unitType: 'column' };
        }
      }
    }
  }
  return null;
};

const findXWing = (board, cm) => {
  for (let num = 1; num <= 9; num++) {
    const rowPos = [];
    for (let r = 0; r < 9; r++) {
      const cols = [];
      for (let c = 0; c < 9; c++) if (cm[`${r},${c}`]?.includes(num)) cols.push(c);
      if (cols.length === 2) rowPos.push({ row: r, cols });
    }
    for (let i = 0; i < rowPos.length; i++) {
      for (let j = i+1; j < rowPos.length; j++) {
        if (rowPos[i].cols[0] === rowPos[j].cols[0] && rowPos[i].cols[1] === rowPos[j].cols[1]) {
          const eliminations = [];
          for (let r = 0; r < 9; r++) {
            if (r === rowPos[i].row || r === rowPos[j].row) continue;
            for (const c of rowPos[i].cols)
              if (cm[`${r},${c}`]?.includes(num)) eliminations.push({ row: r, col: c, numbers: [num] });
          }
          if (eliminations.length > 0) {
            const lockedCells = [
              { row: rowPos[i].row, col: rowPos[i].cols[0] }, { row: rowPos[i].row, col: rowPos[i].cols[1] },
              { row: rowPos[j].row, col: rowPos[j].cols[0] }, { row: rowPos[j].row, col: rowPos[j].cols[1] },
            ];
            return {
              type: 'x_wing',
              eliminations,
              action: 'eliminate',
              difficulty: 'tough',
              number: num,
              lockedCells,
              unitType: 'row',
              baseSet: [rowPos[i].row, rowPos[j].row],
              coverSet: [rowPos[i].cols[0], rowPos[i].cols[1]],
              patternCells: lockedCells
            };
          }
        }
      }
    }
    const colPos = [];
    for (let c = 0; c < 9; c++) {
      const rows = [];
      for (let r = 0; r < 9; r++) if (cm[`${r},${c}`]?.includes(num)) rows.push(r);
      if (rows.length === 2) colPos.push({ col: c, rows });
    }
    for (let i = 0; i < colPos.length; i++) {
      for (let j = i+1; j < colPos.length; j++) {
        if (colPos[i].rows[0] === colPos[j].rows[0] && colPos[i].rows[1] === colPos[j].rows[1]) {
          const eliminations = [];
          for (let c = 0; c < 9; c++) {
            if (c === colPos[i].col || c === colPos[j].col) continue;
            for (const r of colPos[i].rows)
              if (cm[`${r},${c}`]?.includes(num)) eliminations.push({ row: r, col: c, numbers: [num] });
          }
          if (eliminations.length > 0) {
            const lockedCells = [
              { row: colPos[i].rows[0], col: colPos[i].col }, { row: colPos[i].rows[1], col: colPos[i].col },
              { row: colPos[j].rows[0], col: colPos[j].col }, { row: colPos[j].rows[1], col: colPos[j].col },
            ];
            return {
              type: 'x_wing',
              eliminations,
              action: 'eliminate',
              difficulty: 'tough',
              number: num,
              lockedCells,
              unitType: 'column',
              baseSet: [colPos[i].col, colPos[j].col],
              coverSet: [colPos[i].rows[0], colPos[i].rows[1]],
              patternCells: lockedCells
            };
          }
        }
      }
    }
  }
  return null;
};

const LANGS=['en','zh-Hant','zh-Hans','ja','ko'];
const local=(locale,...values)=>values[Math.max(0,LANGS.indexOf(locale))];
const pos=({row,col})=>`${String.fromCharCode(65+row)}${col+1}`;
const positions=cells=>cells.map(pos).join(', ');
const uniqueCells=cells=>[...new Map(cells.map(c=>[`${c.row},${c.col}`,{row:c.row,col:c.col}])).values()];
const boardKey=board=>JSON.stringify(board);
const cleanNotes=(notes,size)=>Array.from({length:[6,9].includes(size)?size*size:0},(_,i)=>Array.isArray(notes?.[i])?[...new Set(notes[i].filter(n=>Number.isInteger(n)&&n>0&&n<=size))].sort((a,b)=>a-b):[]);
const notesKey=(notes,size)=>JSON.stringify(cleanNotes(notes,size));
const validShape=board=>Array.isArray(board)&&[6,9].includes(board.length)&&board.every(row=>Array.isArray(row)&&row.length===board.length&&row.every(n=>Number.isInteger(n)&&n>=0&&n<=board.length));
const techNames={
 naked_single:['Only candidate','唯一候選數','唯一候选数','唯一の候補','유일한 후보'],
 hidden_single:['Only position in a unit','單位內唯一位置','单元内唯一位置','単位内の唯一の位置','단위 내 유일한 위치'],
 naked_pair:['Naked pair','顯性數對','显性数对','ネイキッドペア','네이키드 페어'],
 naked_triple:['Naked triple','顯性三數組','显性三数组','ネイキッドトリプル','네이키드 트리플'],
 naked_quad:['Naked quadruple','顯性四數組','显性四数组','ネイキッドクワッド','네이키드 쿼드'],
 hidden_pair:['Hidden pair','隱性數對','隐性数对','隠れペア','숨은 페어'],
 hidden_triple:['Hidden triple','隱性三數組','隐性三数组','隠れトリプル','숨은 트리플'],
 hidden_quad:['Hidden quadruple','隱性四數組','隐性四数组','隠れクワッド','숨은 쿼드'],
 pointing_pair:['Pointing pair','指向數對','指向数对','ポイントペア','포인팅 페어'],
 pointing_triple:['Pointing triple','指向三數組','指向三数组','ポイントトリプル','포인팅 트리플'],
 box_line_reduction:['Box–line reduction','行列宮排除','行列宫排除','ボックス・ライン削減','박스–라인 제거'],
 x_wing:['X-Wing','X-Wing（X 翼）','X-Wing（X 翼）','Xウィング','X-윙']
};
function label(locale,values){return local(locale,...values);}
function unitInfo(cells,size){
 const rows=[...new Set(cells.map(c=>c.row))],cols=[...new Set(cells.map(c=>c.col))],{boxRows}=getBoxDims(size);
 return rows.length===1?{type:'row',index:rows[0]}:cols.length===1?{type:'column',index:cols[0]}:{type:'box',index:Math.floor(rows[0]/boxRows)*(size/3)+Math.floor(cols[0]/3)};
}
function unitLabel(unit,locale){
 const names=unit.type==='row'?['Row','行','行','行','행']:unit.type==='column'?['Column','列','列','列','열']:['Box','宮','宫','ブロック','구역'];
 return `${label(locale,names)} ${unit.type==='row'?String.fromCharCode(65+unit.index):unit.index+1}`;
}
function step(kind,text,cells,locale){
 const titles=kind==='locate'?['Where to look','留意位置','观察位置','注目する場所','살펴볼 위치']:kind==='reason'?['Why it works','推理原因','推理原因','成り立つ理由','성립하는 이유']:['Your next step','下一步','下一步','次の一手','다음 단계'];
 return {kind,title:label(locale,titles),text,cells:uniqueCells(cells||[])};
}
function messageLesson(status,board,notes,locale,title,reason,actionText,action={type:'none'},cells=[]){
 return {status,technique:null,title,boardKey:boardKey(board),notesKey:notesKey(notes,board.length||0),steps:[step('locate',positions(cells)||label(locale,['Review the current board.','先睇返目前棋盤。','先查看当前棋盘。','現在の盤面を確認します。','현재 보드를 확인하세요.']),cells,locale),step('reason',reason,cells,locale),step('action',actionText,cells,locale)],action,highlights:{pattern:[],targets:uniqueCells(cells)}};
}
function noteGuidance(board,notes,locale){
 return messageLesson('needs-notes',board,notes,locale,label(locale,['Prepare the candidate notes','先準備鉛筆筆記','先准备铅笔笔记','候補メモを準備','후보 메모 준비']),label(locale,['No single or unique position is available from the entered digits. The next supported patterns compare candidate notes across cells.','目前已填數字未能得出唯一候選數或唯一位置。下一類技巧要比較幾格之間嘅候選數。','当前已填数字没有得出唯一候选数或唯一位置。下一类技巧需要比较多个位置的候选数。','入力済みの数字だけでは唯一の候補や位置は見つかりません。次の技法では複数のマスの候補を比較します。','입력된 숫자만으로는 유일한 후보나 위치를 찾지 못했습니다. 다음 기법은 여러 칸의 후보를 비교합니다.']),label(locale,['Add all legal candidates yourself, or choose Auto Pencil. Then ask the coach to inspect the notes.','你可以自己填齊合法候選數，或者揀「自動鉛筆」。填好後再請教練分析筆記。','你可以自行填齐合法候选数，或选择“自动铅笔”。完成后再请教练分析笔记。','候補を自分で全部記入するか「自動メモ」を選び、その後コーチでメモを調べましょう。','가능한 후보를 직접 모두 적거나 자동 메모를 선택한 뒤 코치에게 다시 분석을 요청하세요.']),{type:'auto-pencil'});
}
export function getAutoPencilMarks(board){
 if(!validShape(board))return [];
 const cm=buildCandidateMap(board);
 return board.flatMap((row,r)=>row.map((value,c)=>value?[]:[...(cm[`${r},${c}`]||[])]));
}
function explainHint(h,board,cm,notes,locale){
 const n=board.length,target=h.row===undefined?null:{row:h.row,col:h.col},pattern=h.lockedCells||h.constrainingCells||[],targets=h.eliminations||[target],value=h.number,nums=(h.numbers||[value]).join(', '),ps=positions(pattern),ts=positions(targets),at=target?pos(target):'',title=label(locale,techNames[h.type]);
 let where='',why='';
 if(h.type==='naked_single'){
  const used=[...new Set(h.constrainingCells.map(c=>c.number))].sort((a,b)=>a-b).join(', '),remaining=cm[`${h.row},${h.col}`].join(', ');
  where=label(locale,[`Look at ${at} and the filled cells in its row, column and box.`,`留意 ${at}，同埋同行、同列、同宮已填嘅數字。`,`观察 ${at}，以及同行、同列、同宫已填的数字。`,`${at}と同じ行・列・ブロックの入力済み数字を見ます。`,`${at}와 같은 행·열·구역에 입력된 숫자를 보세요.`]);
  why=label(locale,[`The digits ${used} already occur in its row, column or box and cannot repeat here. After applying those restrictions, ${at} has only ${remaining} left.`,`同行、同列或同宮已經有 ${used}，所以呢啲數唔可以再填喺 ${at}。排除呢啲數之後，呢格只剩 ${remaining}。`,`同行、同列或同宫已经有 ${used}，这些数字不能再填入 ${at}。排除这些数字后，此格只剩 ${remaining}。`,`同じ行・列・ブロックに${used}があるため、ここには重ねられません。これらの制約を適用すると、${at}に残るのは${remaining}だけです.`,`같은 행·열·구역에 이미 ${used}가 있어 이 칸에 반복할 수 없습니다. 이 제약을 적용하면 ${at}에는 ${remaining}만 남습니다.`]);
  const boardCandidates=buildCandidateMap(board)[`${h.row},${h.col}`]||[];
  if(boardCandidates.length>1){const prior=boardCandidates.join(', ');why=label(locale,[`The entered digits still allow ${prior} at ${at}. Your recorded eliminations have reduced its notes to ${remaining}. This single depends on those earlier eliminations being justified; if you have not established them, restore the legal candidates with Auto Pencil before applying it.`,`${at} 單靠已填數字仍然可以係 ${prior}；你之前記錄嘅候選數排除令筆記只剩 ${remaining}。呢個唯一候選數依賴之前嘅排除有推理根據；如果未證明過，先用「自動鉛筆」還原合法候選數，再決定下一步。`,`${at} 仅根据已填数字仍可为 ${prior}；之前记录的候选数排除使笔记只剩 ${remaining}。此唯一候选数依赖之前排除有推理依据；若尚未证明，请先用“自动铅笔”恢复合法候选数，再决定下一步。`,`${at}は入力済み数字だけなら${prior}が可能ですが、記録済みの削除でメモは${remaining}だけです。このシングルは以前の削除が正当であることに依存します。まだ根拠を確かめていなければ、自動メモで合法な候補を戻してから適用してください。`,`${at}는 입력된 숫자만 보면 ${prior}가 가능하지만 기록된 제거로 메모에는 ${remaining}만 남았습니다. 이 싱글은 이전 제거가 타당해야 성립합니다. 근거를 확인하지 않았다면 자동 메모로 가능한 후보를 복원한 뒤 적용하세요.`]);}
 }else if(h.type==='hidden_single'){
  const unit=getUnitsForSize(n).find(u=>u.some(c=>c.row===h.row&&c.col===h.col)&&u.filter(c=>cm[`${c.row},${c.col}`]?.includes(value)).length===1),name=unitLabel(unitInfo(unit,n),locale),others=positions(unit.filter(c=>c.row!==h.row||c.col!==h.col));
  where=label(locale,[`Compare the possible positions of ${value} in ${name}.`,`比較 ${name} 入面，${value} 可以放嘅位置。`,`比较 ${name} 中 ${value} 可以放的位置。`,`${name}で${value}を置ける場所を比べます。`,`${name}에서 ${value}를 놓을 수 있는 위치를 비교하세요.`]);
  why=label(locale,[`Every digit must appear once in ${name}. ${others} are filled or exclude ${value} from their current legal candidates. Only ${at} still allows ${value}, so it is the unique position.`,`${name} 每個數字都要出現一次。${others} 已填咗數字，或者目前合法候選數已排除 ${value}；只有 ${at} 仲可以放 ${value}，所以呢個係唯一位置。`,`${name} 每个数字都要出现一次。${others} 已填数字，或当前合法候选数已排除 ${value}；只有 ${at} 仍可填 ${value}，因此这是唯一位置。`,`${name}では各数字が1回必要です。${others}は入力済みか、現在の合法な候補に${value}がありません。${value}を置けるのは${at}だけです。`,`${name}에는 각 숫자가 한 번 필요합니다. ${others}는 채워졌거나 현재 가능한 후보에서 ${value}가 제외되었습니다. ${value}를 허용하는 곳은 ${at}뿐입니다.`]);
 }else if(h.type.startsWith('naked_')||h.type.startsWith('hidden_')){
  const unit=unitLabel(unitInfo(pattern,n),locale),count=pattern.length,hidden=h.type.startsWith('hidden_');
  where=label(locale,[`Compare ${ps} in ${unit}, using candidates ${nums}.`,`留意 ${unit} 嘅 ${ps}，比較候選數 ${nums}。`,`观察 ${unit} 中的 ${ps}，比较候选数 ${nums}。`,`${unit}の${ps}で候補${nums}を比べます。`,`${unit}의 ${ps}에서 후보 ${nums}를 비교하세요.`]);
  why=hidden?label(locale,[`In ${unit}, the ${count} digits ${nums} can appear only in these ${count} cells: ${ps}. Each digit needs a place, so those cells are reserved for this set. Other candidates in those cells can be removed.`,`${unit} 入面，${count} 個數 ${nums} 只可以放喺 ${ps} 呢 ${count} 格。每個數都要有位置，所以呢幾格要留畀呢組數，可以刪走格內其他候選數。`,`${unit} 中，${count} 个数字 ${nums} 只能填在 ${ps} 这 ${count} 格。每个数字都需要位置，因此这些格保留给这组数字，可删除格内其他候选数。`,`${unit}で${count}個の数字${nums}を置けるのは${ps}の${count}マスだけです。各数字の場所を確保するため、このマス群はその数字専用となり、ほかの候補を削除できます。`,`${unit}에서 ${count}개 숫자 ${nums}가 들어갈 곳은 ${ps}의 ${count}칸뿐입니다. 각 숫자의 자리를 확보해야 하므로 이 칸들은 그 집합 전용이며 다른 후보를 지울 수 있습니다.`]):label(locale,[`The ${count} cells ${ps} have only the ${count} candidates ${nums} between them. They must use those digits in some order. Since ${unit} cannot repeat a digit, remove ${nums} from its other cells.`,`${ps} 呢 ${count} 格合共只剩 ${count} 個候選數 ${nums}，所以必須以某個次序用晒呢組數。${unit} 唔可以重複數字，因此其他格可以排除 ${nums}。`,`${ps} 这 ${count} 格合计只剩 ${count} 个候选数 ${nums}，必须以某种顺序使用这组数字。${unit} 不能重复数字，因此其他格可排除 ${nums}。`,`${ps}の${count}マスに残る候補は合わせて${count}個の${nums}だけです。順序は未定でもこの数字を使い切るため、${unit}のほかのマスから${nums}を削除できます。`,`${ps}의 ${count}칸에 남은 후보는 합쳐서 ${count}개인 ${nums}뿐입니다. 순서는 몰라도 이 숫자들을 모두 써야 하므로 ${unit}의 다른 칸에서 ${nums}를 제거합니다.`]);
 }else if(h.type==='x_wing'){
  const [a,b,c,d]=h.lockedCells.map(pos),base=h.unitType==='row',baseName=label(locale,base?['rows','行','行','行','행']:['columns','列','列','列','열']),coverName=label(locale,base?['columns','列','列','列','열']:['rows','行','行','行','행']);
  where=label(locale,[`Candidate ${value} has only two positions in each of the two ${baseName}: ${a}/${b} and ${c}/${d}. The four cells share the same two ${coverName}.`,`候選數 ${value} 喺兩${baseName}各自只得兩個位置：${a}／${b} 同 ${c}／${d}。四格同時對齊另外兩${coverName}。`,`候选数 ${value} 在两${baseName}各自只有两个位置：${a}／${b} 和 ${c}／${d}。四格同时对齐另外两${coverName}。`,`候補${value}は2本の${baseName}で${a}/${b}と${c}/${d}の2か所ずつに限られ、同じ2本の${coverName}にそろっています。`,`후보 ${value}는 두 ${baseName}에서 각각 ${a}/${b}, ${c}/${d} 두 곳에만 있으며 같은 두 ${coverName}에 맞춰져 있습니다.`]);
  why=label(locale,[`If ${a} is ${value}, ${c} cannot repeat it in the same ${coverName.slice(0,-1)}, so ${d} must be ${value}. If ${b} is ${value}, ${d} is blocked and ${c} must be ${value}. Either diagonal uses ${value} once in each shared ${coverName.slice(0,-1)}. Therefore the other cells in those ${coverName} cannot contain ${value}.`,`如果 ${a} 係 ${value}，同${coverName}嘅 ${c} 就唔可以重複，所以 ${d} 一定係 ${value}。如果 ${b} 係 ${value}，${d} 就被排除，${c} 一定係 ${value}。兩種對角情況都會喺兩${coverName}各放一個 ${value}，所以呢兩${coverName}其他格可以排除 ${value}。`,`如果 ${a} 是 ${value}，同${coverName}的 ${c} 不能重复，因此 ${d} 必须是 ${value}。如果 ${b} 是 ${value}，${d} 被排除，${c} 必须是 ${value}。两种对角情况都会在两${coverName}各放一个 ${value}，因此这些${coverName}的其他格可排除 ${value}。`,`${a}が${value}なら、同じ${coverName}の${c}には重ねられず、${d}が${value}になります。${b}が${value}なら${d}には置けず、${c}が${value}です。どちらの対角線でも共通の2本の${coverName}に1個ずつ入るため、その${coverName}のほかのマスから${value}を削除できます。`,`${a}가 ${value}이면 같은 ${coverName}의 ${c}에는 반복할 수 없어 ${d}가 ${value}입니다. ${b}가 ${value}이면 ${d}가 막혀 ${c}가 ${value}입니다. 어느 대각선이든 공통된 두 ${coverName}에 하나씩 들어가므로 그 ${coverName}의 다른 칸에서 ${value}를 제거할 수 있습니다.`]);
 }else{
  const line=unitLabel(unitInfo(pattern,n),locale),box=unitLabel({type:'box',index:Math.floor(pattern[0].row/(n===6?2:3))*(n/3)+Math.floor(pattern[0].col/3)},locale),point=h.type.startsWith('pointing_');
  where=label(locale,[`Track candidate ${value} at ${ps}, where ${line} crosses ${box}.`,`留意 ${ps} 嘅候選數 ${value}，佢哋喺 ${line} 同 ${box} 嘅交集。`,`观察 ${ps} 的候选数 ${value}，它们在 ${line} 与 ${box} 的交集。`,`${line}と${box}が交わる${ps}の候補${value}を見ます。`,`${line}과 ${box}가 교차하는 ${ps}의 후보 ${value}를 보세요.`]);
  why=point?label(locale,[`Inside ${box}, ${value} can occur only at ${ps}, all in ${line}. The box must contain ${value}, so it will occupy that line. Remove ${value} from the same line outside the box.`,`${box} 入面，${value} 只可以喺 ${ps}，而且全部都喺 ${line}。宮內一定要有 ${value}，所以會佔用呢條行列，宮外同行列嘅格可以排除 ${value}。`,`${box} 中，${value} 只能位于 ${ps}，且全部在 ${line}。宫内必须有 ${value}，因此会占用这条行列，宫外同行列可排除 ${value}。`,`${box}で${value}を置ける${ps}はすべて${line}にあります。ブロックに${value}が必要なため、その行列を使い、ブロック外の同じ行列から${value}を削除できます。`,`${box}에서 ${value}를 놓을 수 있는 ${ps}가 모두 ${line}에 있습니다. 구역에는 ${value}가 필요하므로 그 행·열을 차지하며, 구역 밖 같은 행·열에서 ${value}를 제거할 수 있습니다.`]):label(locale,[`In ${line}, all positions for ${value} are ${ps}, inside ${box}. The line must place ${value} somewhere in this box. Other cells of the box therefore cannot contain ${value}.`,`${line} 入面，${value} 所有位置都係 ${ps}，全部喺 ${box}。呢條行列一定要喺呢個宮放 ${value}，所以宮內其他格可以排除 ${value}。`,`${line} 中，${value} 的所有位置都是 ${ps}，全部在 ${box}。这条行列必须在此宫放 ${value}，因此宫内其他格可排除 ${value}。`,`${line}で${value}を置ける${ps}はすべて${box}内です。この行列はそのブロック内に${value}を置くため、ブロック内のほかのマスから${value}を削除できます。`,`${line}에서 ${value}의 모든 위치인 ${ps}가 ${box} 안에 있습니다. 이 행·열은 해당 구역 안에 ${value}를 놓아야 하므로 구역의 다른 칸에서 ${value}를 제거할 수 있습니다.`]);
 }
 const eliminationText=h.eliminations?.map(e=>`${pos(e)}: ${e.numbers.join(', ')}`).join('; '),action=h.action==='place'?{type:'place',row:h.row,col:h.col,value}:{type:'eliminate',eliminations:h.eliminations.map(e=>({row:e.row,col:e.col,numbers:[...e.numbers]}))};
 const next=h.action==='place'?label(locale,[`Select ${at} and enter ${value}. Then check what this changes in its peers.`,`揀 ${at}，填入 ${value}，再睇下同行、同列同宮有咩變化。`,`选择 ${at} 并填入 ${value}，再观察同行、同列、同宫的变化。`,`${at}に${value}を入力し、同じ行・列・ブロックの変化を確かめましょう。`,`${at}에 ${value}를 입력하고 같은 행·열·구역의 변화를 확인하세요.`]):label(locale,[`Remove only these candidate notes: ${eliminationText}. Do not fill a value yet; inspect the remaining candidates next.`,`只刪走以下候選筆記：${eliminationText}。今步未係填數字，刪完再睇剩低嘅候選數。`,`只删除这些候选笔记：${eliminationText}。此步不是填数字，删除后再观察剩余候选数。`,`次の候補メモだけを削除します：${eliminationText}。まだ数字は入力せず、残った候補を確認しましょう。`,`다음 후보 메모만 제거하세요: ${eliminationText}. 아직 숫자를 채우지 말고 남은 후보를 확인하세요.`]);
 return {status:'hint',technique:h.type,title,boardKey:boardKey(board),notesKey:notesKey(notes,n),steps:[step('locate',where,h.type==='hidden_single'?getUnitsForSize(n).find(u=>u.some(c=>c.row===h.row&&c.col===h.col)&&u.filter(c=>cm[`${c.row},${c.col}`]?.includes(value)).length===1):pattern,locale),step('reason',why,pattern,locale),step('action',next,targets,locale)],action,highlights:{pattern:uniqueCells(pattern),targets:uniqueCells(targets)}};
}
/** Return a lesson only; displaying or advancing it never changes the board. */
export function getSudokuCoach(input,{notes=[],locale='en',solution=null,givens=null}={}){
 const board=Array.isArray(input)?input:[];locale=LANGS.includes(locale)?locale:'en';
 const fail=(cells,noteProblem=false)=>messageLesson('invalid',board,notes,locale,label(locale,noteProblem?['Review candidate notes','檢查候選筆記','检查候选笔记','候補メモを確認','후보 메모 확인']:['Review the board','檢查棋盤','检查棋盘','盤面を確認','보드 확인']),label(locale,noteProblem?['Some recorded candidates conflict with the board or omit a required candidate. A pattern based on incomplete notes could teach a false move.','部分候選筆記同棋盤衝突，或者漏咗需要保留嘅候選數。用唔完整筆記推理可能會得出錯誤一步。','部分候选笔记与棋盘冲突，或遗漏了需要保留的候选数。用不完整笔记推理可能得到错误步骤。','候補メモの一部が盤面と矛盾しているか、必要な候補が抜けています。不完全なメモで推論すると誤った手を教えてしまいます。','일부 후보 메모가 보드와 충돌하거나 필요한 후보가 빠져 있습니다. 불완전한 메모로 추론하면 잘못된 수를 가르칠 수 있습니다.']:['The highlighted entries conflict with this puzzle, or an empty cell has no legal candidate. Review them before using a logical lesson.','著色位置同題目有衝突，或者空格已經冇合法候選數。先檢查輸入，再繼續推理教學。','着色位置与题目存在冲突，或空格已无合法候选数。请先检查输入，再继续推理教学。','色の付いた入力が問題と矛盾しているか、空きマスに合法な候補がありません。論理の説明を使う前に入力を確認してください。','표시된 입력이 퍼즐과 충돌하거나 빈칸에 가능한 후보가 없습니다. 논리 설명을 사용하기 전에 입력을 확인하세요.']),label(locale,noteProblem?['Restore all legal candidates with Auto Pencil, or repair the notes yourself, then ask again.','可以用「自動鉛筆」補返全部合法候選數，或者自己修正筆記，再請教練分析。','可用“自动铅笔”恢复全部合法候选数，或自行修正笔记，再请教练分析。','自動メモですべての合法な候補を戻すか、自分でメモを直してから、もう一度調べましょう。','자동 메모로 가능한 후보를 모두 복원하거나 직접 메모를 수정한 뒤 다시 요청하세요.']:['Review or erase the highlighted editable entries, then ask again. No answer has been filled for you.','先檢查或清除著色嘅可編輯輸入，再試一次；教練未有替你填入答案。','先检查或清除着色的可编辑输入，再重试；教练没有替你填入答案。','色の付いた編集可能な入力を確認または消去し、再試行してください。答えは入力していません。','표시된 편집 가능한 입력을 확인하거나 지운 뒤 다시 요청하세요. 정답은 대신 입력하지 않았습니다.']),{type:noteProblem?'auto-pencil':'none'},cells);
 if(!validShape(board))return fail([]);
 const n=board.length,known=validShape(solution)&&solution.every(row=>row.every(v=>v>0)),bad=[];
 for(const unit of getUnitsForSize(n)){
  const seen=new Map();for(const cell of unit){const v=board[cell.row][cell.col];if(!v)continue;if(!seen.has(v))seen.set(v,[]);seen.get(v).push(cell);}for(const same of seen.values())if(same.length>1)bad.push(...same);
 }
 for(let r=0;r<n;r++)for(let c=0;c<n;c++)if((givens?.[r]?.[c]&&board[r][c]!==givens[r][c])||(known&&board[r][c]&&board[r][c]!==solution[r][c]))bad.push({row:r,col:c});
 if(bad.length)return fail(uniqueCells(bad));
 const full=buildCandidateMap(board),emptyCells=Object.keys(full).map(k=>{const[row,col]=k.split(',').map(Number);return {row,col};});
 if(!emptyCells.length)return messageLesson('solved',board,notes,locale,label(locale,['Puzzle complete','題目完成','题目完成','完成しました','퍼즐 완성']),label(locale,['Every row, column and box contains each digit exactly once. There is no next empty cell to teach.','每行、每列、每宮都已經各有一個數字，棋盤冇空格需要再教下一步。','每行、每列、每宫都已各有一个数字，棋盘没有空格需要继续下一步。','各行・列・ブロックに各数字が1回ずつ入り、次の手を教える空きマスはありません。','각 행·열·구역에 각 숫자가 한 번씩 들어갔으며 다음 수를 가르칠 빈칸이 없습니다.']),label(locale,['Start another puzzle when you are ready to practise again.','想再練習嘅時候，可以開另一題。','想继续练习时，可以打开另一题。','また練習したくなったら新しい問題を始めましょう。','다시 연습할 준비가 되면 새 퍼즐을 시작하세요.']));
 const impossible=emptyCells.filter(c=>full[`${c.row},${c.col}`].length===0);if(impossible.length)return fail(impossible);
 const normalized=cleanNotes(notes,n),cm={};let hasNotes=false;
 const badMarks=[];
 for(const cell of emptyCells){
  const key=`${cell.row},${cell.col}`,ns=normalized[cell.row*n+cell.col];
  if(ns.length){hasNotes=true;cm[key]=full[key].filter(v=>ns.includes(v));if(!cm[key].length||(known&&!ns.includes(solution[cell.row][cell.col])))badMarks.push(cell);}
  else cm[key]=[...full[key]];
 }
 if(badMarks.length)return fail(badMarks,true);
 let h=findNakedSingle(board,full)||findHiddenSingle(board,full);
 if(!h&&!hasNotes)return noteGuidance(board,notes,locale);
 if(!h)h=findNakedSingle(board,cm)||findHiddenSingle(board,cm)||findNakedSubset(board,cm)||findHiddenSubset(board,cm)||findPointingPair(board,cm)||findBoxLineReduction(board,cm)||(n===9?findXWing(board,cm):null);
 if(h){
  const effective=h.action==='place'&&full[`${h.row},${h.col}`]?.length===1?full:cm;
  const valid= h.action==='place'?(!known||solution[h.row][h.col]===h.number):h.eliminations.every(e=>e.numbers.every(v=>(!known||solution[e.row][e.col]!==v)&&cm[`${e.row},${e.col}`]?.includes(v)));
  if(valid)return explainHint(h,board,effective,notes,locale);
 }
 return messageLesson('no-supported-step',board,notes,locale,label(locale,['No supported deduction found','暫未搵到支援嘅推理','暂未找到支持的推理','対応する推論が見つかりません','지원하는 추론을 찾지 못했습니다']),label(locale,['The supported singles, candidate sets, locked candidates and X-Wing checks found no change. This does not prove that guessing is necessary.','唯一候選數、數組、鎖定候選數同 X-Wing 等支援技巧暫時搵唔到可改變嘅一步，唔代表一定要估。','唯一候选数、数组、锁定候选数和 X-Wing 等支持技巧暂未找到可改变的步骤，不代表必须猜测。','対応するシングル・候補集合・ロック候補・Xウィングでは変更を見つけられませんでした。推測が必要と証明されたわけではありません。','지원하는 싱글·후보 집합·잠긴 후보·X-윙 검사에서 변경을 찾지 못했습니다. 추측이 필요하다는 뜻은 아닙니다.']),label(locale,['Review the candidate notes, continue reasoning yourself, or choose another puzzle. No guessed answer will be inserted.','你可以檢查候選筆記、繼續自己推理，或者開另一題；教練唔會猜一個答案填入。','你可以检查候选笔记、继续自行推理，或打开另一题；教练不会猜一个答案填入。','候補メモを見直す、自分で考え続ける、別の問題を選ぶことができます。推測した答えは入力しません。','후보 메모를 검토하거나 직접 계속 추론하거나 다른 퍼즐을 선택하세요. 추측한 정답을 입력하지 않습니다.']));
}
/** Apply only a current lesson. Callers own history, givens, quota and UI locks. */
export function applySudokuCoachAction(board,notes,lesson){
 const copy=Array.isArray(board)?board.map(r=>Array.isArray(r)?[...r]:r):[],n=board?.length||0,nextNotes=cleanNotes(notes,n),result={board:copy,notes:cleanNotes(notes,n),applied:false,reason:'invalid-action'};
 if(!validShape(board)||!lesson||lesson.boardKey!==boardKey(board)||lesson.notesKey!==notesKey(notes,n))return {...result,reason:'stale'};
 const action=lesson.action;if(!action)return result;
 if(action.type==='auto-pencil')return {...result,notes:getAutoPencilMarks(board),applied:true,reason:null};
 if(lesson.status!=='hint')return result;
 if(action.type==='place'){
  const{row,col,value}=action;if(!Number.isInteger(row)||!Number.isInteger(col)||!Number.isInteger(value)||board[row]?.[col]!==0||!buildCandidateMap(board)[`${row},${col}`]?.includes(value))return result;
  copy[row][col]=value;const legal=buildCandidateMap(copy);
  for(let r=0;r<n;r++)for(let c=0;c<n;c++){const i=r*n+c;nextNotes[i]=copy[r][c]?[]:nextNotes[i].filter(v=>legal[`${r},${c}`]?.includes(v));}
  return {...result,board:copy,notes:nextNotes,applied:true,reason:null};
 }
 if(action.type==='eliminate'&&Array.isArray(action.eliminations)&&action.eliminations.length){
  const full=getAutoPencilMarks(board);let changed=false;
  for(const e of action.eliminations){
   if(!Number.isInteger(e.row)||!Number.isInteger(e.col)||board[e.row]?.[e.col]!==0||!Array.isArray(e.numbers)||e.numbers.some(v=>!Number.isInteger(v)||v<1||v>n))return result;
   const i=e.row*n+e.col,prior=nextNotes[i].length?nextNotes[i]:full[i],remaining=prior.filter(v=>!e.numbers.includes(v));
   if(!remaining.length)return result;
   if(prior.length!==remaining.length)changed=true;nextNotes[i]=remaining;
  }
  return changed?{...result,notes:nextNotes,applied:true,reason:null}:result;
 }
 return result;
}
