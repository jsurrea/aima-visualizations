import { useState, useCallback } from 'react';
import { bfs } from '../algorithms/index';

// ─── Types ───────────────────────────────────────────────────────────────────

type Board = readonly [number, number, number, number, number, number, number, number, number];

const GOAL_BOARD: Board = [1, 2, 3, 4, 5, 6, 7, 8, 0];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function boardToString(b: Board): string {
  return b.join(',');
}

function stringToBoard(s: string): Board {
  return s.split(',').map(Number) as unknown as Board;
}

function blankIndex(b: Board): number {
  return b.indexOf(0);
}

type Direction = 'up' | 'down' | 'left' | 'right';

function applyMove(b: Board, dir: Direction): Board | null {
  const blank = blankIndex(b);
  const row = Math.floor(blank / 3);
  const col = blank % 3;
  let target = -1;

  if (dir === 'up'    && row > 0) target = blank - 3;
  if (dir === 'down'  && row < 2) target = blank + 3;
  if (dir === 'left'  && col > 0) target = blank - 1;
  if (dir === 'right' && col < 2) target = blank + 1;

  if (target === -1) return null;

  const next = [...b] as unknown as [number, number, number, number, number, number, number, number, number];
  next[blank] = next[target]!;
  next[target] = 0;
  return next;
}

function getNeighbors(b: Board): Array<{ board: Board; move: Direction }> {
  const result: Array<{ board: Board; move: Direction }> = [];
  for (const dir of ['up', 'down', 'left', 'right'] as Direction[]) {
    const next = applyMove(b, dir);
    if (next) result.push({ board: next, move: dir });
  }
  return result;
}

/** Build graph from current state, up to depth 30. Returns adjacency map for BFS. */
function buildPuzzleGraph(startBoard: Board): ReadonlyMap<string, ReadonlyArray<{ node: string; cost: number }>> {
  const map = new Map<string, Array<{ node: string; cost: number }>>();
  const queue: Array<{ board: Board; depth: number }> = [{ board: startBoard, depth: 0 }];
  const visited = new Set<string>([boardToString(startBoard)]);

  while (queue.length > 0) {
    const item = queue.shift()!;
    if (item.depth >= 20) continue; // Limit search depth to keep it fast

    const key = boardToString(item.board);
    if (!map.has(key)) map.set(key, []);

    for (const { board: nb } of getNeighbors(item.board)) {
      const nk = boardToString(nb);
      map.get(key)!.push({ node: nk, cost: 1 });
      if (!visited.has(nk)) {
        visited.add(nk);
        queue.push({ board: nb, depth: item.depth + 1 });
      }
    }
  }
  return map;
}

function scrambleBoard(moves = 30): Board {
  let board: Board = [...GOAL_BOARD] as unknown as Board;
  const dirs: Direction[] = ['up', 'down', 'left', 'right'];
  for (let i = 0; i < moves; i++) {
    const shuffled = dirs.map(d => ({ d, r: Math.random() })).sort((a, b) => a.r - b.r).map(x => x.d);
    for (const dir of shuffled) {
      const next = applyMove(board, dir);
      if (next) { board = next; break; }
    }
  }
  return board;
}

// ─── Component ───────────────────────────────────────────────────────────────

const TILE_COLORS: Readonly<Record<string, string>> = {
  '0': 'transparent',
};

function tileColor(n: number, isSolving: boolean, isSolved: boolean): string {
  if (n === 0) return 'transparent';
  if (isSolved) return '#065F46';
  if (isSolving) return '#1E3A5F';
  return '#1F2937';
}

export function EightPuzzle(): JSX.Element {
  const [board, setBoard] = useState<Board>(scrambleBoard());
  const [solutionPath, setSolutionPath] = useState<Board[] | null>(null);
  const [solutionStep, setSolutionStep] = useState(0);
  const [solving, setSolving] = useState(false);
  const [message, setMessage] = useState<string>('Slide tiles to solve, or scramble and watch BFS solve it!');

  const isSolved = boardToString(board) === boardToString(GOAL_BOARD);
  const isShowingSolution = solutionPath !== null;
  const displayBoard = isShowingSolution
    ? (solutionPath[solutionStep] ?? board)
    : board;

  const handleTileClick = (index: number) => {
    if (isShowingSolution) return;
    const blank = blankIndex(board);
    const row = Math.floor(index / 3);
    const col = index % 3;
    const bRow = Math.floor(blank / 3);
    const bCol = blank % 3;
    if (Math.abs(row - bRow) + Math.abs(col - bCol) !== 1) return;

    const next = [...board] as unknown as [number, number, number, number, number, number, number, number, number];
    next[blank] = next[index]!;
    next[index] = 0;
    setBoard(next);
    setSolutionPath(null);
    setMessage(boardToString(next) === boardToString(GOAL_BOARD) ? '🎉 Solved!' : 'Keep going!');
  };

  const handleScramble = () => {
    setSolutionPath(null);
    setSolutionStep(0);
    setSolving(false);
    const newBoard = scrambleBoard();
    setBoard(newBoard);
    setMessage('Scrambled! Click "BFS Solve" to see the solution.');
  };

  const handleSolve = useCallback(() => {
    setSolving(true);
    setMessage('Running BFS…');
    const startKey = boardToString(board);
    const goalKey = boardToString(GOAL_BOARD);

    if (startKey === goalKey) {
      setMessage('Already solved!');
      setSolving(false);
      return;
    }

    const graph = buildPuzzleGraph(board);
    const steps = bfs(graph, startKey, goalKey);
    const last = steps[steps.length - 1];

    if (!last || last.currentNode === '') {
      setMessage('No solution found within search depth. Try scrambling again.');
      setSolving(false);
      return;
    }

    const boards = last.path.map(k => stringToBoard(k));
    setSolutionPath(boards);
    setSolutionStep(0);
    setSolving(false);
    setMessage(`BFS found solution in ${boards.length - 1} moves!`);
  }, [board]);

  const handlePrevStep = () => {
    setSolutionStep(s => Math.max(0, s - 1));
  };

  const handleNextStep = () => {
    if (!solutionPath) return;
    setSolutionStep(s => Math.min(solutionPath.length - 1, s + 1));
  };

  const handleReset = () => {
    setSolutionPath(null);
    setSolutionStep(0);
    setMessage('Reset. Slide tiles or scramble again.');
  };

  const btnStyle = (disabled: boolean, accent = false): React.CSSProperties => ({
    padding: '8px 16px',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.15)',
    background: disabled ? '#1F2937' : accent ? '#3B82F6' : '#374151',
    color: disabled ? '#4B5563' : '#E5E7EB',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: '13px',
    fontWeight: 600,
  });

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', color: '#E5E7EB', padding: '20px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '24px', alignItems: 'start', flexWrap: 'wrap' }}>
        {/* Puzzle grid */}
        <div>
          <div
            role="grid"
            aria-label="8-Puzzle board"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 72px)',
              gridTemplateRows: 'repeat(3, 72px)',
              gap: '4px',
              background: '#0A0A0F',
              padding: '8px',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            {(displayBoard as readonly number[]).map((tile, i) => (
              <button
                key={i}
                role="gridcell"
                aria-label={tile === 0 ? 'blank tile' : `tile ${tile}`}
                onClick={() => handleTileClick(i)}
                disabled={isShowingSolution || tile === 0}
                style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '8px',
                  border: tile === 0 ? '2px dashed #374151' : '2px solid rgba(255,255,255,0.1)',
                  background: tileColor(tile, isShowingSolution, isSolved),
                  color: tile === 0 ? 'transparent' : '#E5E7EB',
                  fontSize: '24px',
                  fontWeight: 700,
                  cursor: tile === 0 || isShowingSolution ? 'default' : 'pointer',
                  transition: 'background 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {tile !== 0 ? tile : ''}
              </button>
            ))}
          </div>

          {/* Goal state mini */}
          <div style={{ marginTop: '12px', fontSize: '11px', color: '#6B7280' }}>
            Goal state:
            <span style={{ marginLeft: '8px' }}>
              {GOAL_BOARD.map((t, i) => (
                <span
                  key={i}
                  style={{
                    display: 'inline-block', width: '20px', height: '20px', lineHeight: '20px',
                    textAlign: 'center', borderRadius: '3px', marginRight: '2px',
                    background: t === 0 ? '#111118' : '#1F2937',
                    color: '#9CA3AF', fontSize: '11px',
                  }}
                >
                  {t !== 0 ? t : ''}
                </span>
              ))}
            </span>
          </div>
        </div>

        {/* Controls + info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Status */}
          <div style={{
            background: '#111118', borderRadius: '8px', padding: '12px',
            fontSize: '13px', color: '#D1D5DB', lineHeight: 1.5,
            border: isSolved ? '1px solid #10B981' : '1px solid rgba(255,255,255,0.08)',
          }}>
            {message}
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            <button onClick={handleScramble} style={btnStyle(false)} aria-label="Scramble puzzle">
              🔀 Scramble
            </button>
            <button
              onClick={handleSolve}
              disabled={solving || isSolved || isShowingSolution}
              style={btnStyle(solving || isSolved || isShowingSolution, true)}
              aria-label="Solve with BFS"
            >
              🔍 BFS Solve
            </button>
            {isShowingSolution && (
              <button onClick={handleReset} style={btnStyle(false)} aria-label="Reset solution playback">
                ✖ Reset
              </button>
            )}
          </div>

          {/* Solution playback */}
          {isShowingSolution && solutionPath && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '12px', color: '#9CA3AF' }}>
                Step <strong style={{ color: '#E5E7EB' }}>{solutionStep + 1}</strong> / {solutionPath.length}
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={handlePrevStep}
                  disabled={solutionStep === 0}
                  style={btnStyle(solutionStep === 0)}
                  aria-label="Previous step"
                >⏪</button>
                <button
                  onClick={handleNextStep}
                  disabled={solutionStep >= solutionPath.length - 1}
                  style={btnStyle(solutionStep >= solutionPath.length - 1)}
                  aria-label="Next step"
                >⏩</button>
              </div>
            </div>
          )}

          {/* State representation */}
          <div style={{
            background: '#111118', borderRadius: '8px', padding: '12px',
            border: '1px solid rgba(255,255,255,0.08)',
          }}>
            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6B7280', marginBottom: '8px' }}>
              State Representation
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: '12px', color: '#A5B4FC', lineHeight: 1.8 }}>
              {'['}{displayBoard.slice(0, 3).join(', ')}{']'}<br />
              {'['}{displayBoard.slice(3, 6).join(', ')}{']'}<br />
              {'['}{displayBoard.slice(6, 9).join(', ')}{']'}
            </div>
            <div style={{ marginTop: '8px', fontSize: '11px', color: '#6B7280' }}>
              0 = blank tile &nbsp;|&nbsp; {boardToString(displayBoard) === boardToString(GOAL_BOARD) ? '✅ Goal state' : '🔄 Non-goal state'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
