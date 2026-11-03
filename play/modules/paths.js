import { ZIP_PUZZLES, WORD_PUZZLES, SCOWL_WORDS } from '../data/paths/web-bank.js';

export { ZIP_PUZZLES, WORD_PUZZLES };
export const WORD_DICTIONARY = new Set(SCOWL_WORDS);
const colors = ['#78aaff', '#ffb36b', '#74d9b4', '#d2a0ff', '#f89cb8', '#a6d66e', '#79d4df'];
const clone = value => JSON.parse(JSON.stringify(value));
const coordinate = (index, size) => String.fromCharCode(65 + Math.floor(index / size)) + (index % size + 1);
export const adjacent = (a, b, size) => Number.isInteger(a) && Number.isInteger(b) && Math.abs(Math.floor(a / size) - Math.floor(b / size)) + Math.abs(a % size - b % size) === 1;
const neighbors = (index, size) => [index - size, index + 1, index + size, index - 1].filter(i => i >= 0 && i < size * size && adjacent(index, i, size));
const failure = reason => ({ valid: false, complete: false, reason });

/** Ordinal anchors, not internal native-bank path-position numbers. */
export function validateZiglinePath(puzzle, path, requireComplete = false) {
  if (!puzzle || !Number.isInteger(puzzle.size) || puzzle.size < 2 || puzzle.size > 15 || !Array.isArray(path) || !Array.isArray(puzzle.anchors)) return failure('invalid');
  const total = puzzle.size * puzzle.size;
  if (puzzle.anchors.some(a => !a || !Number.isInteger(a.index) || !Number.isInteger(a.label))) return failure('invalid');
  const anchors = [...puzzle.anchors].sort((a, b) => a.label - b.label);
  if (anchors.length < 2 || anchors.some((a, i) => a.label !== i + 1 || a.index < 0 || a.index >= total)) return failure('invalid');
  if (new Set(anchors.map(a => a.index)).size !== anchors.length) return failure('invalid');
  if (path.length > total || new Set(path).size !== path.length) return failure('repeated');
  let visitedAnchors = 0;
  for (let step = 0; step < path.length; step++) {
    const index = path[step];
    if (!Number.isInteger(index) || index < 0 || index >= total) return failure('invalid');
    if (step === 0 && index !== anchors[0].index) return failure('start');
    if (step > 0 && !adjacent(path[step - 1], index, puzzle.size)) return failure('adjacency');
    const anchor = anchors.find(a => a.index === index);
    if (anchor) {
      if (anchor.label !== visitedAnchors + 1) return failure('anchor-order');
      if (anchor.label === anchors.length && step !== total - 1) return failure('finish-early');
      visitedAnchors++;
    }
  }
  const complete = path.length === total && visitedAnchors === anchors.length && path.at(-1) === anchors.at(-1).index;
  if (requireComplete && !complete) return failure('incomplete');
  return { valid: true, complete, visitedAnchors, reason: '' };
}

export function ziglineLegalMoves(puzzle, path) {
  if (!validateZiglinePath(puzzle, path).valid) return [];
  if (!path.length) return [puzzle.anchors.find(a => a.label === 1).index];
  return neighbors(path.at(-1), puzzle.size).filter(i => validateZiglinePath(puzzle, [...path, i]).valid);
}

/** Necessary graph conditions only: no unbounded solving and no answer lookup. */
export function hasZiglineContinuation(puzzle, path) {
  const result = validateZiglinePath(puzzle, path);
  if (!result.valid) return false;
  if (result.complete) return true;
  if (!path.length) return true;
  const head = path.at(-1), visited = new Set(path.slice(0, -1));
  const remaining = new Set(Array.from({ length: puzzle.size ** 2 }, (_, i) => i).filter(i => !visited.has(i)));
  const queue = [head], reached = new Set(queue);
  for (let q = 0; q < queue.length; q++) for (const next of neighbors(queue[q], puzzle.size)) if (remaining.has(next) && !reached.has(next)) { reached.add(next); queue.push(next); }
  if (reached.size !== remaining.size) return false;
  const finish = puzzle.anchors.find(a => a.label === puzzle.anchors.length).index;
  for (const cell of remaining) {
    const degree = neighbors(cell, puzzle.size).filter(i => remaining.has(i)).length;
    if (degree < ((cell === head || cell === finish) ? 1 : 2)) return false;
  }
  return true;
}

export function ziglineHint(puzzle, path) {
  const status = validateZiglinePath(puzzle, path);
  if (status.complete) return { kind: 'complete', cells: [] };
  const legal = ziglineLegalMoves(puzzle, path);
  const viable = legal.filter(i => hasZiglineContinuation(puzzle, [...path, i]));
  const nextAnchor = puzzle.anchors.find(a => a.label === (status.visitedAnchors || 0) + 1);
  if (!viable.length) return { kind: 'dead-end', cells: [], nextAnchor };
  if (viable.length === 1) return { kind: 'forced', cells: viable, reason: legal.length === 1 ? 'only-legal' : 'connectivity', nextAnchor };
  return { kind: 'choice', cells: viable, nextAnchor };
}

const gridLetters = puzzle => puzzle.grid.join('').toLowerCase();
function validWordPuzzle(puzzle) {
  return !!puzzle && Number.isInteger(puzzle.size) && puzzle.size >= 2 && puzzle.size <= 8 && Array.isArray(puzzle.grid) && puzzle.grid.length === puzzle.size && puzzle.grid.every(row => typeof row === 'string' && row.length === puzzle.size && /^[a-z#]+$/i.test(row)) && Array.isArray(puzzle.lengths) && puzzle.lengths.every(n => Number.isInteger(n) && n >= 3 && n <= 10);
}
export function remainingWordLengths(puzzle, locked = []) {
  if (!validWordPuzzle(puzzle) || !Array.isArray(locked) || locked.some(entry => !entry || !Array.isArray(entry.path))) return null;
  const left = [...puzzle.lengths];
  for (const entry of locked) {
    const at = left.indexOf(entry.path?.length);
    if (at < 0) return null;
    left.splice(at, 1);
  }
  return left;
}

export function validateWordvineTrace(puzzle, path, locked = [], dictionary = WORD_DICTIONARY) {
  if (!validWordPuzzle(puzzle) || !Array.isArray(path) || !Array.isArray(locked) || locked.some(entry => !entry || !Array.isArray(entry.path)) || typeof dictionary?.has !== 'function') return failure('invalid');
  const size = puzzle.size, letters = gridLetters(puzzle), occupied = new Set(locked.flatMap(w => w.path));
  if (path.length < 3 || path.length > 10) return failure('length');
  if (new Set(path).size !== path.length) return failure('repeated');
  for (let step = 0; step < path.length; step++) {
    const cell = path[step];
    if (!Number.isInteger(cell) || cell < 0 || cell >= size ** 2 || letters[cell] === '#') return failure('blocked');
    if (occupied.has(cell)) return failure('overlap');
    if (step && !adjacent(path[step - 1], cell, size)) return failure('adjacency');
  }
  const left = remainingWordLengths(puzzle, locked);
  if (!left || !left.includes(path.length)) return failure('no-slot');
  const word = path.map(i => letters[i]).join('');
  // Reading order is deliberate. Do not silently accept a backwards nonword.
  if (!dictionary.has(word)) return failure('not-word');
  return { valid: true, complete: false, word, path: [...path], reason: '' };
}

/** Rules-based exact coverage; it does not compare against the supplied solution. */
export function checkWordvine(puzzle, locked, dictionary = WORD_DICTIONARY) {
  if (!validWordPuzzle(puzzle) || !Array.isArray(locked) || locked.some(entry => !entry || !Array.isArray(entry.path) || typeof entry.word !== 'string')) return failure('invalid');
  const accepted = [];
  for (const entry of locked) {
    const result = validateWordvineTrace(puzzle, entry.path, accepted, dictionary);
    if (!result.valid) return result;
    if (entry.word && entry.word.toLowerCase() !== result.word) return failure('letters');
    accepted.push(result);
  }
  const left = remainingWordLengths(puzzle, accepted);
  const open = [...gridLetters(puzzle)].filter(c => c !== '#').length;
  return { valid: true, complete: left.length === 0 && accepted.reduce((sum, w) => sum + w.path.length, 0) === open, remaining: left, reason: '' };
}

const prefixes = new Set();
for (const word of WORD_DICTIONARY) for (let n = 1; n <= word.length; n++) prefixes.add(word.slice(0, n));

/** Enumerates only actual dictionary paths; bounded so Hint cannot hang a page. */
export function enumerateWordvinePaths(puzzle, locked = [], { nodeLimit = 30000, pathLimit = 5000 } = {}) {
  const left = remainingWordLengths(puzzle, locked);
  if (!left?.length) return { options: [], complete: true, nodes: 0 };
  const wanted = new Set(left), maximum = Math.max(...left), letters = gridLetters(puzzle);
  const occupied = new Set(locked.flatMap(w => w.path)), options = [], seenFootprints = new Set();
  let nodes = 0, truncated = false;
  function walk(path, word) {
    if (++nodes > nodeLimit || options.length >= pathLimit) { truncated = true; return; }
    if (!prefixes.has(word)) return;
    if (wanted.has(path.length) && WORD_DICTIONARY.has(word)) {
      const key = [...path].sort((a, b) => a - b).join(',');
      if (!seenFootprints.has(key)) { seenFootprints.add(key); options.push({ word, path: [...path] }); }
    }
    if (path.length === maximum) return;
    for (const next of neighbors(path.at(-1), puzzle.size)) {
      if (!truncated && letters[next] !== '#' && !occupied.has(next) && !path.includes(next)) walk([...path, next], word + letters[next]);
    }
  }
  for (let i = 0; i < letters.length && !truncated; i++) if (letters[i] !== '#' && !occupied.has(i)) walk([i], letters[i]);
  return { options, complete: !truncated, nodes };
}

export function wordvineHint(puzzle, locked = []) {
  const state = checkWordvine(puzzle, locked);
  if (!state.valid) return { kind: 'dead-end', cells: [] };
  if (state.complete) return { kind: 'complete', cells: [] };
  const found = enumerateWordvinePaths(puzzle, locked), occupied = new Set(locked.flatMap(w => w.path));
  if (!found.complete) return { kind: 'strategy', cells: [], exhaustive: false };
  for (let i = 0; i < puzzle.size ** 2; i++) {
    if (gridLetters(puzzle)[i] === '#' || occupied.has(i)) continue;
    const covering = found.options.filter(option => option.path.includes(i));
    if (!covering.length) return { kind: 'dead-end', cells: [i], uncovered: i };
    if (covering.length === 1) return { kind: 'forced', cells: covering[0].path, word: covering[0].word, necessaryCell: i, exhaustive: true };
  }
  return { kind: 'strategy', cells: [], exhaustive: true };
}

const translations = {
  en: {
    new: 'New puzzle', reset: 'Restart', undo: 'Undo', hint: 'Reasoning hint', check: 'Check', submit: 'Submit word', clear: 'Clear trace', unlock: 'Unlock selected word', five: '5 × 5', six: '6 × 6',
    zipRules: 'Start at 1. Tap or drag through neighbouring cells to visit the numbered anchors in order. Use every square once and reach the final anchor last. Numbers are anchor order, not the number of steps. Tap an earlier part of your path to go back.',
    wordRules: 'Trace English words using up, down, left and right, then press Submit word. Fill the displayed word lengths and cover every open letter once. Read in the order you tap; backwards nonwords do not count. A valid word may still leave a dead end: undo or unlock a word to try another arrangement.',
    zipProgress: (n, total, anchors, max) => `${n} / ${total} squares · ${anchors} / ${max} anchors`,
    wordProgress: (n, total) => `${n} / ${total} words found`,
    badZip: 'That square is not a legal next step. Move up, down, left or right; visit anchors in order, and save the final anchor for the last square.',
    zipGood: 'Your path follows the rules so far. Every square still needs to be visited.',
    zipDead: 'This route strands a square or leaves no legal continuation. Undo a step or tap an earlier part of your path.',
    zipForced: (c, why) => why === 'only-legal' ? `Look at ${c}. It is the only neighbouring square allowed by the anchor order and no-repeat rules. Extend there next.` : `Look at ${c}. Other immediate choices disconnect the remaining squares or trap a non-final square. A complete path needs all remaining squares connected, with an entrance and exit for each internal square.`,
    zipChoice: (label) => `There is more than one possible next step. Keep a route to anchor ${label || 'the next number'}, avoid cutting the unused squares into separate islands, and keep the final anchor for last. No forced step is being claimed.`,
    won: 'Puzzle complete — all rules satisfied!',
    wordGood: 'Your committed words are valid so far. Fill the remaining lengths and cover all open letters.',
    wordForced: (c, word) => `${c} must belong to a word. Among the remaining word lengths and the bundled English dictionary, only this highlighted group can cover that square. Read the highlighted path to form ${word.toUpperCase()}.`,
    wordDead: 'The remaining letters have no available word path covering at least one square. Try undoing or unlocking a committed word.',
    wordStrategy: 'Each unused letter must belong to one word. Start with a corner or a narrow corridor, then look for a word of one of the remaining lengths. Several arrangements are still possible; no answer is being claimed.',
    selected: word => `${word.toUpperCase()} selected. Use Unlock to try a different route.`,
    trace: word => `Current trace: ${word || '—'}`,
    length: 'Use a path of 3–10 letters.', repeated: 'A word cannot use the same square twice.', blocked: 'Blocked squares cannot be used.', overlap: 'That path overlaps a committed word.', adjacency: 'Use only up, down, left or right; no jumps or diagonals.', 'no-slot': 'No empty word row has that length.', 'not-word': 'Those letters, in that reading order, are not in the web dictionary. Keep tracing or clear the path.', letters: 'The path does not match its word.', invalid: 'The board state is invalid. Restart this puzzle.',
    notice: 'English web word list: filtered SCOWL 2020.12.07 (levels 10/20). Some uncommon words accepted in the app may not be in this compact web list.', licenses: 'Word-list notices', starter: (n, count) => `Starter puzzle ${n} / ${count}`,
  },
  zh: {
    new: '新題目', reset: '重新開始', undo: '復原', hint: '推理提示', check: '檢查', submit: '提交單字', clear: '清除路徑', unlock: '解鎖所選單字', five: '5 × 5', six: '6 × 6',
    zipRules: '由 1 開始，逐格點選或拖曳，按順序經過所有數字。上下左右移動，每格只用一次，最後一格先到最後一個數字。數字代表經過順序，唔係步數。點選已走過嘅位置可以退返去。',
    wordRules: '沿上下左右相鄰字母拼出英文單字，再按「提交單字」。配合下方顯示嘅長度，每個空白字母格都要用一次。按點選順序讀字母，倒轉唔成字就唔算。有效單字仍可能令剩低位置行唔通，可以復原或解鎖再試。',
    zipProgress: (n, total, anchors, max) => `${n} / ${total} 格 · ${anchors} / ${max} 個數字`,
    wordProgress: (n, total) => `已找到 ${n} / ${total} 個單字`,
    badZip: '呢格唔係合法下一步。請上下左右移動，按順序經過數字，最後一格先進入最後數字。',
    zipGood: '目前路徑符合規則，繼續走勻其餘格子。',
    zipDead: '呢條路會隔開剩低格子，或者令某格無路可行。復原一步，或點選較早位置退返去。',
    zipForced: (c, why) => why === 'only-legal' ? `留意 ${c}：按數字順序同唔重複行格嘅規則，只有呢個相鄰格可以繼續。` : `留意 ${c}：其他即時選擇會隔開剩低格子，或者令非終點格冇足夠出入口。完整路徑要保持餘下格子相連，中途每格都要可以入同出。`,
    zipChoice: label => `下一步仍然有多個可能。保留去數字 ${label || '下一個'} 嘅路，避免將剩低格子分成孤島，最後數字要留到最後。呢度未有必然下一步。`,
    won: '完成！所有規則都符合。',
    wordGood: '已提交單字符合規則。繼續填滿餘下長度，覆蓋所有字母格。',
    wordForced: (c, word) => `${c} 一定要屬於某個單字。按剩低長度同網頁詞庫，只有著色嘅呢組格子可以覆蓋佢。跟住著色路徑讀，可以拼成 ${word.toUpperCase()}。`,
    wordDead: '餘下某個字母已經冇可用單字路徑覆蓋。試下復原或解鎖一個已提交單字。',
    wordStrategy: '每個未用字母都要屬於一個單字。可以由角落或狹窄通道開始，配合餘下長度搵字。目前仍有多個安排，未有必然答案。',
    selected: word => `已選取 ${word.toUpperCase()}。按「解鎖」可以嘗試其他路徑。`,
    trace: word => `目前路徑：${word || '—'}`,
    length: '請用 3–10 個字母。', repeated: '同一單字唔可以重複用一格。', blocked: '障礙格唔可以使用。', overlap: '路徑同已提交單字重疊。', adjacency: '只可以上下左右相連，唔可以跳格或斜行。', 'no-slot': '已經冇呢個長度嘅空白單字列。', 'not-word': '按目前順序讀出嘅字母，唔喺網頁詞庫入面。可以繼續拼，或者清除路徑。', letters: '路徑同單字唔相符。', invalid: '棋盤狀態無效，請重新開始呢題。',
    notice: '英文網頁詞庫：SCOWL 2020.12.07 第 10／20 級，經篩選。App 接受嘅部分罕見字，可能唔喺呢個精簡網頁詞庫入面。', licenses: '詞庫授權聲明', starter: (n, count) => `入門題庫 ${n} / ${count}`,
  },
};

translations['zh-Hans'] = {
  new: '新题目', reset: '重新开始', undo: '撤销', hint: '推理提示', check: '检查', submit: '提交单词', clear: '清除路径', unlock: '解锁所选单词', five: '5 × 5', six: '6 × 6',
  zipRules: '从 1 开始，逐格点击或拖动，按顺序经过所有数字。上下左右移动，每格只能使用一次，最后一格才到达最后一个数字。数字表示经过顺序，并非步数。点击经过的位置可以回退。',
  wordRules: '沿上下左右相邻字母拼出英文单词，再按“提交单词”。配合下方显示的长度，每个开放字母格都要使用一次。按点击顺序读取字母，倒过来不成词就不算。有效单词仍可能让剩余位置无法完成，可以撤销或解锁后重试。',
  zipProgress: (n,total,a,max) => `${n} / ${total} 格 · ${a} / ${max} 个数字`, wordProgress: (n,total) => `已找到 ${n} / ${total} 个单词`,
  badZip: '这不是合法的下一步。请上下左右移动，按顺序经过数字，最后一格才能进入最后的数字。', zipGood: '当前路径符合规则，请继续走遍剩余格子。', zipDead: '这条路径会隔开剩余格子，或让某格无法继续。请撤销一步，或点击较早的位置回退。',
  zipForced: (c,why) => why === 'only-legal' ? `注意 ${c}：按照数字顺序和不重复格子的规则，只有这个相邻格可以继续。` : `注意 ${c}：其他即时选择会隔开剩余格子，或让非终点格没有足够的入口和出口。完整路径需要保持剩余格子连通，中间每格都能进入和离开。`,
  zipChoice: label => `下一步仍有多个可能。保留到数字 ${label || '下一个'} 的路径，避免把剩余格子分成孤岛，最后的数字要留到最后。目前没有必然的下一步。`,
  won: '完成！所有规则均符合。', wordGood: '已提交的单词符合规则。请继续填满剩余长度，覆盖所有字母格。',
  wordForced: (c,word) => `${c} 必须属于某个单词。根据剩余长度和网页词库，只有高亮的这组格子能够覆盖它。沿高亮路径读取，可以拼出 ${word.toUpperCase()}。`,
  wordDead: '剩余的某个字母已经没有可用单词路径覆盖。请尝试撤销或解锁已提交的单词。', wordStrategy: '每个未使用的字母都要属于一个单词。可以从角落或狭窄通道开始，配合剩余长度找词。目前仍有多个安排，没有必然答案。',
  selected: word => `已选择 ${word.toUpperCase()}。按“解锁”可以尝试其他路径。`, trace: word => `当前路径：${word || '—'}`,
  length: '请使用 3–10 个字母。', repeated: '同一单词不能重复使用一格。', blocked: '障碍格不能使用。', overlap: '路径与已提交的单词重叠。', adjacency: '只允许上下左右相连，不能跳格或斜行。', 'no-slot': '没有这个长度的空白单词行。', 'not-word': '按当前顺序读取的字母不在网页词库中。可以继续拼词，或清除路径。', letters: '路径与单词不符。', invalid: '棋盘状态无效，请重新开始本题。',
  notice: '英文网页词库：SCOWL 2020.12.07 第 10／20 级，经过筛选。App 接受的部分罕见词可能不在这个精简网页词库中。', licenses: '词库授权声明', starter: (n,count) => `入门题库 ${n} / ${count}`,
};
translations.ja = {
  new: '次の問題', reset: '最初から', undo: '戻す', hint: '推論ヒント', check: '確認', submit: '単語を確定', clear: '選択を消す', unlock: '選んだ単語を解除', five: '5 × 5', six: '6 × 6',
  zipRules: '1から始め、上下左右の隣のマスをタップまたはドラッグして、数字を順番に通ります。すべてのマスを一度だけ通り、最後の数字を終点にします。数字は通る順番で、歩数ではありません。通ったマスをタップすると戻れます。',
  wordRules: '上下左右につながる文字で英単語を作り、「単語を確定」を押します。表示された文字数を満たし、すべての空き文字を一度ずつ使います。選んだ順番で読み、逆から読んだだけの非単語は認められません。有効な単語でも行き詰まることがあります。戻すか解除して別の配置を試してください。',
  zipProgress: (n,total,a,max) => `${n} / ${total} マス · ${a} / ${max} 個の数字`, wordProgress: (n,total) => `${n} / ${total} 語を発見`,
  badZip: 'そのマスには進めません。上下左右に動き、数字を順番に通り、最後の数字は最後のマスまで残してください。', zipGood: 'ここまでの経路はルールに合っています。残りのマスもすべて通りましょう。', zipDead: '残りのマスが分断されるか、進めないマスができます。一手戻すか、前のマスをタップして戻ってください。',
  zipForced: (c,why) => why === 'only-legal' ? `${c}に注目。数字の順番と、同じマスを二度通れないルールにより、進める隣のマスはここだけです。` : `${c}に注目。ほかの選択では残りのマスが分断されるか、終点以外のマスに十分な出入口がなくなります。残りをつなぎ、中間のマスには入口と出口を残す必要があります。`,
  zipChoice: label => `次の一手には複数の候補があります。数字${label || '次'}への道を残し、空きマスを孤立させず、最後の数字を終点にしましょう。必然の一手とは断定していません。`,
  won: '完成！すべてのルールを満たしました。', wordGood: '確定済みの単語は有効です。残りの文字数を満たし、空き文字をすべて使いましょう。',
  wordForced: (c,word) => `${c}は必ずどれかの単語に含まれます。残りの文字数とウェブ版の辞書では、このマスを覆える組み合わせは色のついたものだけです。順に読むと${word.toUpperCase()}になります。`,
  wordDead: '残りの文字の中に、有効な単語の経路で覆えないマスがあります。戻すか、確定済みの単語を解除してみましょう。', wordStrategy: '空き文字はそれぞれ一つの単語に含まれます。角や細い通路から、残りの文字数に合う単語を探しましょう。複数の配置があり、答えを断定してはいません。',
  selected: word => `${word.toUpperCase()}を選択中。「解除」で別の経路を試せます。`, trace: word => `選択中：${word || '—'}`,
  length: '3〜10文字の経路を作ってください。', repeated: '一つの単語で同じマスを二度使えません。', blocked: '障害物のマスは使えません。', overlap: '確定済みの単語と重なっています。', adjacency: '上下左右の隣のマスのみ使えます。斜めや飛び越しはできません。', 'no-slot': 'その文字数の空き単語欄はありません。', 'not-word': 'その読み順の文字列はウェブ版の辞書にありません。続けて文字を選ぶか、選択を消してください。', letters: '単語と経路の文字が一致しません。', invalid: '盤面の状態が無効です。この問題を最初からやり直してください。',
  notice: '英単語の辞書：SCOWL 2020.12.07のレベル10／20を選別。アプリで使える一部の珍しい単語は、このウェブ版の小型辞書に含まれない場合があります。', licenses: '辞書のライセンス', starter: (n,count) => `スターター問題 ${n} / ${count}`,
};
translations.ko = {
  new: '다음 퍼즐', reset: '다시 시작', undo: '되돌리기', hint: '추론 힌트', check: '확인', submit: '단어 확정', clear: '경로 지우기', unlock: '선택한 단어 해제', five: '5 × 5', six: '6 × 6',
  zipRules: '1에서 시작해 상하좌우 이웃 칸을 탭하거나 드래그하며 숫자를 순서대로 지나가세요. 모든 칸을 한 번씩 사용하고 마지막 숫자에서 끝내야 합니다. 숫자는 이동 횟수가 아니라 지나가는 순서입니다. 이미 지난 칸을 탭하면 그곳까지 되돌아갑니다.',
  wordRules: '상하좌우로 이어진 글자로 영어 단어를 만든 뒤 “단어 확정”을 누르세요. 표시된 단어 길이를 맞추고 열린 글자 칸을 모두 한 번씩 사용하세요. 탭한 순서대로 읽으며, 거꾸로 읽어 단어가 되지 않으면 인정되지 않습니다. 유효한 단어라도 막다른 상황을 만들 수 있으므로 되돌리거나 해제해 다른 배치를 시도하세요.',
  zipProgress: (n,total,a,max) => `${n} / ${total} 칸 · ${a} / ${max} 숫자`, wordProgress: (n,total) => `${n} / ${total} 단어 발견`,
  badZip: '그 칸으로는 진행할 수 없습니다. 상하좌우로 이동하고 숫자를 순서대로 지나가며, 마지막 숫자는 마지막 칸까지 남겨 두세요.', zipGood: '현재 경로는 규칙에 맞습니다. 남은 칸도 모두 지나가세요.', zipDead: '남은 칸이 분리되거나 더 진행할 수 없는 칸이 생깁니다. 한 수를 되돌리거나 앞서 지난 칸을 탭하세요.',
  zipForced: (c,why) => why === 'only-legal' ? `${c}를 보세요. 숫자 순서와 중복 방문 금지 규칙에 따라 진행할 수 있는 이웃 칸은 이곳뿐입니다.` : `${c}를 보세요. 다른 선택은 남은 칸을 분리하거나 끝점이 아닌 칸의 출입구를 부족하게 만듭니다. 남은 칸은 연결되어야 하며 중간 칸에는 입구와 출구가 필요합니다.`,
  zipChoice: label => `다음 수에는 여러 가능성이 있습니다. 숫자 ${label || '다음'}까지 갈 길을 남기고, 미사용 칸을 고립시키지 않으며 마지막 숫자는 끝점으로 남겨 두세요. 필수 수라고 단정하지 않습니다.`,
  won: '완료! 모든 규칙을 만족했습니다.', wordGood: '확정한 단어는 유효합니다. 남은 길이를 채우고 열린 글자를 모두 사용하세요.',
  wordForced: (c,word) => `${c}는 반드시 어떤 단어에 포함되어야 합니다. 남은 길이와 웹 사전에서 이 칸을 덮을 수 있는 칸의 조합은 강조된 것뿐입니다. 강조된 경로를 순서대로 읽으면 ${word.toUpperCase()}가 됩니다.`,
  wordDead: '남은 글자 중 유효한 단어 경로로 덮을 수 없는 칸이 있습니다. 되돌리거나 확정한 단어를 해제해 보세요.', wordStrategy: '미사용 글자는 각각 하나의 단어에 속해야 합니다. 모서리나 좁은 통로에서 시작해 남은 길이에 맞는 단어를 찾아보세요. 여러 배치가 가능하며 답을 단정하지 않습니다.',
  selected: word => `${word.toUpperCase()} 선택됨. “해제”를 눌러 다른 경로를 시도할 수 있습니다.`, trace: word => `현재 경로: ${word || '—'}`,
  length: '3~10글자의 경로를 만들어 주세요.', repeated: '한 단어에서 같은 칸을 두 번 사용할 수 없습니다.', blocked: '막힌 칸은 사용할 수 없습니다.', overlap: '확정한 단어와 겹치는 경로입니다.', adjacency: '상하좌우 이웃 칸만 사용할 수 있습니다. 대각선이나 건너뛰기는 안 됩니다.', 'no-slot': '그 길이에 맞는 빈 단어 칸이 없습니다.', 'not-word': '현재 읽는 순서의 글자는 웹 사전에 없습니다. 글자를 더 잇거나 경로를 지워 주세요.', letters: '경로의 글자와 단어가 일치하지 않습니다.', invalid: '보드 상태가 유효하지 않습니다. 이 퍼즐을 다시 시작해 주세요.',
  notice: '영어 웹 사전: SCOWL 2020.12.07 레벨 10/20에서 선별했습니다. 앱에서 인정하는 일부 드문 단어는 이 간단한 웹 사전에 없을 수 있습니다.', licenses: '사전 라이선스', starter: (n,count) => `시작 퍼즐 ${n} / ${count}`,
};
const accessibility = {
  en: { boardSize:'board size', path:'path', blocked:'blocked', wordLengths:'Word lengths', letters:n=>`${n} letters` },
  zh: { boardSize:'棋盤大小', path:'路徑', blocked:'障礙', wordLengths:'單字長度', letters:n=>`${n} 個字母` },
  'zh-Hans': { boardSize:'棋盘大小', path:'路径', blocked:'障碍', wordLengths:'单词长度', letters:n=>`${n} 个字母` },
  ja: { boardSize:'盤面サイズ', path:'経路', blocked:'障害物', wordLengths:'単語の文字数', letters:n=>`${n}文字` },
  ko: { boardSize:'보드 크기', path:'경로', blocked:'막힘', wordLengths:'단어 길이', letters:n=>`${n}글자` },
};
for (const [locale, values] of Object.entries(accessibility)) Object.assign(translations[locale], values);

function stylesheet(root) {
  const style = document.createElement('style');
  style.textContent = `.path-game{--path-blue:#78aaff;max-width:650px;margin:0 auto}.path-game .game-board{position:relative;display:grid;grid-template-columns:repeat(var(--size),minmax(0,1fr));gap:4px;padding:4px;background:#26364f;border:1px solid #415777;border-radius:14px;overflow:hidden;touch-action:none;aspect-ratio:1}.path-game .cell{position:relative;display:flex;align-items:center;justify-content:center;min-width:0;min-height:40px;border:0;border-radius:6px;background:#101d31;color:#e8efff;font:700 clamp(16px,4vw,26px)/1 system-ui;cursor:pointer;padding:0;aspect-ratio:1}.path-game .cell span{position:relative;z-index:3}.path-game .cell:focus-visible{outline:3px solid #ffb36b;outline-offset:-3px}.path-game .cell.visited{background:#244b7a}.path-game .cell.anchor span{min-width:30px;min-height:30px;display:grid;place-items:center;border-radius:50%;background:#a4c9ff;color:#102039;font-size:.8em}.path-game .cell.endpoint{box-shadow:inset 0 0 0 3px #ffb36b}.path-game .cell.hinted{outline:3px dashed #ffb36b;outline-offset:-5px}.path-game .cell.wall{background:#080e18;cursor:default}.path-game .cell.trace{background:#42679b;color:white}.path-game .cell.locked{background:var(--word-color);color:#071323}.path-game .cell.chosen{box-shadow:inset 0 0 0 3px white}.path-game .path-line{position:absolute;inset:4px;width:calc(100% - 8px);height:calc(100% - 8px);pointer-events:none;z-index:2}.path-game .path-line polyline{fill:none;stroke:#91bdff;stroke-width:.13;stroke-linecap:round;stroke-linejoin:round;opacity:.65}.path-game .game-toolbar{display:flex;flex-wrap:wrap;gap:8px;margin:15px 0}.path-game button:not(.cell),.path-game select{font:600 14px/1.4 system-ui;min-height:44px;padding:9px 13px;border:1px solid #426087;border-radius:9px;background:#162741;color:#eff5ff;cursor:pointer}.path-game button:disabled{opacity:.45;cursor:default}.path-game select{max-width:100%}.path-game .game-note{font:400 14px/1.65 system-ui;color:#b9c8df;margin:0 0 15px}.path-game .game-message{font:500 14px/1.65 system-ui;background:#14253d;border-left:3px solid #78aaff;padding:12px 14px;min-height:48px;margin:15px 0;border-radius:0 8px 8px 0}.path-game .game-message.error{border-color:#ffb36b}.path-game .path-progress{font:600 13px/1.6 system-ui;color:#a9c7ef;margin:12px 0}.path-game .word-slots{display:flex;flex-wrap:wrap;gap:8px;margin:15px 0}.path-game .word-slot{letter-spacing:3px;font-size:13px;padding:6px 8px;border:1px solid #496080;border-radius:6px;color:#c5d3e9}.path-game .word-slot.found{color:#102039;background:var(--word-color);border-color:transparent;letter-spacing:1px}.path-game .word-trace{display:block;min-height:30px;color:#d9e8ff;font:700 17px/1.6 system-ui;word-break:break-word}.path-game .word-license{font:400 11px/1.7 system-ui;color:#94aac7}.path-game .word-license a{color:#b6d3ff}.path-game .starter-label{font:400 12px/1.6 system-ui;color:#94aac7}@media(max-width:390px){.path-game .cell{min-height:36px}.path-game .game-board{gap:3px}.path-game button:not(.cell),.path-game select{font-size:12px;padding:9px 10px}}`;
  root.append(style);
}

function readSaved(game) { try { return JSON.parse(globalThis.localStorage?.getItem(`sp.web.${game}.v1`) || 'null'); } catch { return null; } }
function save(game, state) { try { globalThis.localStorage?.setItem(`sp.web.${game}.v1`, JSON.stringify(state)); } catch { /* Private mode keeps a usable in-memory game. */ } }
function language(options) { return translations[options.locale === 'zh-Hant' ? 'zh' : options.locale] || translations.en; }
function controls(t, word = false) {
  return `<div class="game-toolbar"><select aria-label="${word ? 'Wordvine' : 'Zigline'} ${t.boardSize}" data-action="size"><option value="5">${t.five}</option><option value="6">${t.six}</option></select><button type="button" data-action="new">${t.new}</button><button type="button" data-action="reset">${t.reset}</button><button type="button" data-action="undo">${t.undo}</button></div>`;
}
function buildCells(board, size) {
  board.style.setProperty('--size', size);
  board.replaceChildren();
  const cells = Array.from({ length: size ** 2 }, (_, i) => {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'cell'; button.dataset.cell = i;
    button.setAttribute('aria-label', coordinate(i, size)); button.append(document.createElement('span')); board.append(button); return button;
  });
  return cells;
}

/** Pointer capture belongs to the stable board, never a re-created cell. */
function bindBoard(board, getSize, action, signal) {
  let pointer = null, last = null;
  function hit(event) { const node = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-cell]'); return node && board.contains(node) ? Number(node.dataset.cell) : null; }
  board.addEventListener('pointerdown', event => {
    const node = event.target.closest('[data-cell]'); if (!node || !board.contains(node)) return;
    pointer = event.pointerId; last = Number(node.dataset.cell); board.setPointerCapture?.(pointer); action(last, false); event.preventDefault();
  }, { signal });
  board.addEventListener('pointermove', event => {
    if (event.pointerId !== pointer) return;
    const cell = hit(event); if (cell !== null && cell !== last) { last = cell; action(cell, true); }
  }, { signal });
  const stop = event => { if (event.pointerId === pointer) { pointer = null; last = null; } };
  board.addEventListener('pointerup', stop, { signal }); board.addEventListener('pointercancel', stop, { signal });
  board.addEventListener('click', event => {
    if (event.detail !== 0) return; // Pointer events already made the move. Native keyboard clicks have detail0.
    const cell = event.target.closest('[data-cell]'); if (cell) action(Number(cell.dataset.cell), false);
  }, { signal });
  board.addEventListener('keydown', event => {
    const cell = event.target.closest('[data-cell]'); if (!cell || !['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault(); const n = getSize(), index = Number(cell.dataset.cell);
    const delta = { ArrowUp: -n, ArrowDown: n, ArrowLeft: -1, ArrowRight: 1 }[event.key], next = index + delta;
    if (next >= 0 && next < n ** 2 && adjacent(index, next, n)) board.querySelector(`[data-cell="${next}"]`)?.focus();
  }, { signal });
}

export function mountZigline(root, options = {}) {
  const t = language(options), controller = new AbortController(), { signal } = controller;
  const saved = readSaved('zigline'); let size = [5, 6].includes(saved?.size) ? saved.size : 5;
  let pool = ZIP_PUZZLES.filter(p => p.size === size), index = Number.isInteger(saved?.index) ? Math.abs(saved.index) % pool.length : 0;
  let puzzle = pool[index], path = [puzzle.anchors[0].index], history = [], hinted = [], finished = false;
  if (saved?.puzzleId === puzzle.id && validateZiglinePath(puzzle, saved.path).valid && saved.path.length) path = [...saved.path];
  finished = validateZiglinePath(puzzle, path).complete;
  root.innerHTML = `<section class="path-game zigline-game"><p class="game-note">${t.zipRules}</p>${controls(t)}<p class="starter-label"></p><div class="game-board" role="group" aria-label="Zigline"></div><p class="path-progress" aria-live="polite"></p><div class="game-toolbar"><button type="button" data-action="hint">${t.hint}</button><button type="button" data-action="check">${t.check}</button></div><p class="game-message" role="status" aria-live="polite"></p></section>`;
  stylesheet(root);
  const board = root.querySelector('.game-board'), message = root.querySelector('.game-message'), select = root.querySelector('select');
  select.value = size; let cells = buildCells(board, size);
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); line.classList.add('path-line'); line.setAttribute('aria-hidden', 'true');
  function say(text, error = false) { message.textContent = text; message.classList.toggle('error', error); }
  function render() {
    const status = validateZiglinePath(puzzle, path), used = new Set(path);
    cells.forEach((cell, i) => {
      const anchor = puzzle.anchors.find(a => a.index === i); cell.firstChild.textContent = anchor ? anchor.label : '';
      cell.className = `cell${anchor ? ' anchor' : ''}${used.has(i) ? ' visited' : ''}${path.at(-1) === i ? ' endpoint' : ''}${hinted.includes(i) ? ' hinted' : ''}`;
      cell.setAttribute('aria-pressed', String(used.has(i)));
      cell.setAttribute('aria-label', `${coordinate(i, size)}${anchor ? ` · ${anchor.label}` : ''}${used.has(i) ? ` · ${t.path}` : ''}`);
    });
    line.setAttribute('viewBox', `0 0 ${size} ${size}`); line.innerHTML = `<polyline points="${path.map(i => `${i % size + .5},${Math.floor(i / size) + .5}`).join(' ')}"/>`; board.append(line);
    root.querySelector('.path-progress').textContent = t.zipProgress(path.length, size ** 2, status.visitedAnchors || 0, puzzle.anchors.length);
    root.querySelector('.starter-label').textContent = t.starter(index + 1, pool.length);
    root.querySelector('[data-action="undo"]').disabled = history.length === 0 && path.length < 2;
    save('zigline', { size, index, puzzleId: puzzle.id, path });
    if (status.complete && !finished) { finished = true; say(t.won); options.onComplete?.({ gameId: 'zigline', puzzleId: puzzle.id }); }
  }
  function move(cell, dragging) {
    if (finished) return;
    const previous = path.indexOf(cell);
    if (previous >= 0) {
      if (previous === path.length - 1 || (dragging && previous !== path.length - 2)) return;
      history.push([...path]); path = path.slice(0, previous + 1);
    } else if (validateZiglinePath(puzzle, [...path, cell]).valid) { history.push([...path]); path.push(cell); }
    else { if (!dragging) say(t.badZip, true); return; }
    history = history.slice(-80); hinted = []; say(''); render();
  }
  bindBoard(board, () => size, move, signal);
  root.addEventListener('change', event => {
    if (event.target !== select) return; size = Number(select.value); pool = ZIP_PUZZLES.filter(p => p.size === size); index = 0; start();
  }, { signal });
  function start() { puzzle = pool[index]; path = [puzzle.anchors[0].index]; history = []; hinted = []; finished = false; cells = buildCells(board, size); say(''); render(); }
  root.addEventListener('click', event => {
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (action === 'new') { index = (index + 1) % pool.length; start(); }
    if (action === 'reset') start();
    if (action === 'undo') { path = history.pop() || path.slice(0, Math.max(1, path.length - 1)); finished = false; hinted = []; say(''); render(); }
    if (action === 'check') { const s = validateZiglinePath(puzzle, path); say(s.complete ? t.won : hasZiglineContinuation(puzzle, path) ? t.zipGood : t.zipDead, !hasZiglineContinuation(puzzle, path)); }
    if (action === 'hint') {
      const h = ziglineHint(puzzle, path); hinted = h.cells;
      say(h.kind === 'complete' ? t.won : h.kind === 'forced' ? t.zipForced(coordinate(h.cells[0], size), h.reason) : h.kind === 'dead-end' ? t.zipDead : t.zipChoice(h.nextAnchor?.label), h.kind === 'dead-end'); render();
    }
  }, { signal });
  say(finished ? t.won : ''); render();
  return { destroy() { controller.abort(); } };
}

export function mountWordvine(root, options = {}) {
  const t = language(options), controller = new AbortController(), { signal } = controller;
  const saved = readSaved('wordvine'); let size = [5, 6].includes(saved?.size) ? saved.size : 5;
  let pool = WORD_PUZZLES.filter(p => p.size === size), index = Number.isInteger(saved?.index) ? Math.abs(saved.index) % pool.length : 0;
  let puzzle = pool[index], locked = [], trace = [], history = [], selected = null, hinted = [], finished = false;
  if (saved?.puzzleId === puzzle.id && Array.isArray(saved.locked) && checkWordvine(puzzle, saved.locked).valid) locked = clone(saved.locked);
  finished = checkWordvine(puzzle, locked).complete;
  root.innerHTML = `<section class="path-game wordvine-game"><p class="game-note">${t.wordRules}</p>${controls(t, true)}<p class="starter-label"></p><div class="game-board" role="group" aria-label="Wordvine"></div><div class="word-slots" aria-label="${t.wordLengths}"></div><output class="word-trace"></output><div class="game-toolbar"><button type="button" data-action="submit">${t.submit}</button><button type="button" data-action="clear">${t.clear}</button><button type="button" data-action="unlock">${t.unlock}</button><button type="button" data-action="hint">${t.hint}</button><button type="button" data-action="check">${t.check}</button></div><p class="path-progress" aria-live="polite"></p><p class="game-message" role="status" aria-live="polite"></p><p class="word-license">${t.notice} <a href="/play/data/paths/SCOWL-NOTICES.txt" target="_blank" rel="noopener">${t.licenses}</a></p></section>`;
  stylesheet(root);
  const board = root.querySelector('.game-board'), message = root.querySelector('.game-message'), select = root.querySelector('select');
  select.value = size; let cells = buildCells(board, size);
  function say(text, error = false) { message.textContent = text; message.classList.toggle('error', error); }
  function render() {
    const letters = gridLetters(puzzle);
    cells.forEach((cell, i) => {
      const wordIndex = locked.findIndex(word => word.path.includes(i)); cell.firstChild.textContent = letters[i] === '#' ? '' : letters[i].toUpperCase();
      cell.className = `cell${letters[i] === '#' ? ' wall' : ''}${wordIndex >= 0 ? ' locked' : ''}${trace.includes(i) ? ' trace' : ''}${wordIndex === selected ? ' chosen' : ''}${hinted.includes(i) ? ' hinted' : ''}`;
      cell.disabled = letters[i] === '#'; cell.style.setProperty('--word-color', colors[Math.max(0, wordIndex) % colors.length]);
      cell.setAttribute('aria-label', `${coordinate(i, size)} · ${letters[i] === '#' ? t.blocked : letters[i].toUpperCase()}${wordIndex >= 0 ? ` · ${locked[wordIndex].word.toUpperCase()}` : ''}`);
      cell.setAttribute('aria-pressed', String(trace.includes(i) || wordIndex >= 0));
    });
    const used = new Set(), slots = root.querySelector('.word-slots'); slots.replaceChildren();
    for (const length of puzzle.lengths) {
      const at = locked.findIndex((entry, i) => entry.path.length === length && !used.has(i));
      const slot = document.createElement('span'); slot.className = `word-slot${at >= 0 ? ' found' : ''}`;
      slot.textContent = at >= 0 ? locked[at].word.toUpperCase() : '□'.repeat(length);
      slot.setAttribute('aria-label', at >= 0 ? locked[at].word.toUpperCase() : t.letters(length));
      if (at >= 0) { used.add(at); slot.style.setProperty('--word-color', colors[at % colors.length]); }
      slots.append(slot);
    }
    root.querySelector('.word-trace').textContent = t.trace(trace.map(i => letters[i].toUpperCase()).join(''));
    root.querySelector('.path-progress').textContent = t.wordProgress(locked.length, puzzle.lengths.length);
    root.querySelector('.starter-label').textContent = t.starter(index + 1, pool.length);
    root.querySelector('[data-action="submit"]').disabled = trace.length < 3;
    root.querySelector('[data-action="clear"]').disabled = !trace.length;
    root.querySelector('[data-action="undo"]').disabled = !history.length && !trace.length;
    root.querySelector('[data-action="unlock"]').disabled = selected === null;
    save('wordvine', { size, index, puzzleId: puzzle.id, locked });
    const result = checkWordvine(puzzle, locked);
    if (result.complete && !finished) { finished = true; say(t.won); options.onComplete?.({ gameId: 'wordvine', puzzleId: puzzle.id }); }
  }
  function move(cell, dragging) {
    if (finished) return;
    const letters = gridLetters(puzzle); if (letters[cell] === '#') return;
    const wordIndex = locked.findIndex(word => word.path.includes(cell));
    if (wordIndex >= 0) { if (!dragging) { selected = wordIndex; trace = []; hinted = []; say(t.selected(locked[wordIndex].word)); render(); } return; }
    const previous = trace.indexOf(cell);
    if (previous >= 0) {
      if (previous === trace.length - 1 || (dragging && previous !== trace.length - 2)) return;
      trace = trace.slice(0, previous + 1);
    } else if (!trace.length || adjacent(trace.at(-1), cell, size)) {
      if (trace.length >= 10) { if (!dragging) say(t.length, true); return; }
      trace.push(cell);
    } else { if (!dragging) say(t.adjacency, true); return; }
    selected = null; hinted = []; say(''); render();
  }
  bindBoard(board, () => size, move, signal);
  function start() { puzzle = pool[index]; locked = []; trace = []; history = []; selected = null; hinted = []; finished = false; cells = buildCells(board, size); say(''); render(); }
  root.addEventListener('change', event => { if (event.target === select) { size = Number(select.value); pool = WORD_PUZZLES.filter(p => p.size === size); index = 0; start(); } }, { signal });
  root.addEventListener('click', event => {
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (action === 'new') { index = (index + 1) % pool.length; start(); }
    if (action === 'reset') start();
    if (action === 'clear') { trace = []; hinted = []; say(''); render(); }
    if (action === 'undo') { if (trace.length) trace.pop(); else locked = history.pop() || []; selected = null; finished = false; hinted = []; say(''); render(); }
    if (action === 'unlock' && selected !== null) { history.push(clone(locked)); locked.splice(selected, 1); selected = null; trace = []; hinted = []; finished = false; say(''); render(); }
    if (action === 'submit') {
      const result = validateWordvineTrace(puzzle, trace, locked);
      if (!result.valid) { say(t[result.reason] || t.invalid, true); return; }
      history.push(clone(locked)); history = history.slice(-50); locked.push({ word: result.word, path: [...trace] }); trace = []; hinted = []; selected = null; say(t.wordGood); render();
    }
    if (action === 'check') { const result = checkWordvine(puzzle, locked); say(result.complete ? t.won : result.valid ? t.wordGood : t[result.reason] || t.invalid, !result.valid); }
    if (action === 'hint') {
      const h = wordvineHint(puzzle, locked); hinted = h.cells; selected = null;
      say(h.kind === 'complete' ? t.won : h.kind === 'forced' ? t.wordForced(coordinate(h.necessaryCell, size), h.word) : h.kind === 'dead-end' ? t.wordDead : t.wordStrategy, h.kind === 'dead-end'); render();
    }
  }, { signal });
  say(finished ? t.won : ''); render();
  return { destroy() { controller.abort(); } };
}
