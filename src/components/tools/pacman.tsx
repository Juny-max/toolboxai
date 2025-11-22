
"use client";

import { useRef, useEffect, useState, useLayoutEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Volume2, VolumeX } from 'lucide-react';

const INITIAL_CELL_SIZE = 20;

const map = [
  "###################",
  "#........#........#",
  "#.##.###.#.###.##.#",
  "#O##.###.#.###.##O#",
  "#.##.###.#.###.##.#",
  "#.................#",
  "#.##.#.#####.#.##.#",
  "#.##.#.#####.#.##.#",
  "##...#...#...#...##",
  "####.### # ###.####",
  "   #.#   G   #.#   ",
  "   #.# ##### #.#   ",
  "####.## P ##.####",
  "  ...#       #...  ",
  "####.## ### ##.####",
  "   #.#   B   #.#   ",
  "   #.# I   Y #.#   ",
  "####.## ### ##.####",
  "#........#........#",
  "#.##.###.#.###.##.#",
  "#O.#..... .....#.O#",
  "##.###.#.###.##.##",
  "#....#...#...#....#",
  "#.######.#.######.#",
  "#.................#",
  "###################",
];

const COLS = map[0].length;
const ROWS = map.length;

// --- Audio Generation ---
let audioCtx: AudioContext | null = null;

const playSound = (type: 'waka' | 'power' | 'death' | 'levelStart', isMuted: boolean) => {
    if (!audioCtx || isMuted) return;
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const now = audioCtx.currentTime;

    if (type === 'levelStart') {
        const notes = [
            { freq: 392.00, duration: 0.1, delay: 0 }, // G4
            { freq: 392.00, duration: 0.1, delay: 0.1 },
            { freq: 440.00, duration: 0.1, delay: 0.2 }, // A4
            { freq: 523.25, duration: 0.1, delay: 0.3 }, // C5
            { freq: 440.00, duration: 0.1, delay: 0.4 },
            { freq: 523.25, duration: 0.2, delay: 0.5 },
            { freq: 587.33, duration: 0.2, delay: 0.8 }, // D5
            { freq: 659.25, duration: 0.2, delay: 1.1 }, // E5
        ];

        notes.forEach(note => {
            const osc = audioCtx!.createOscillator();
            const gainNode = audioCtx!.createGain();
            osc.connect(gainNode);
            gainNode.connect(audioCtx!.destination);

            osc.type = 'square';
            osc.frequency.setValueAtTime(note.freq, now + note.delay);
            gainNode.gain.setValueAtTime(0.1, now + note.delay);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, now + note.delay + note.duration);
            osc.start(now + note.delay);
            osc.stop(now + note.delay + note.duration);
        });
        return;
    }

    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    gainNode.connect(audioCtx.destination);
    oscillator.connect(gainNode);


    switch (type) {
        case 'waka':
            oscillator.type = 'square';
            oscillator.frequency.setValueAtTime(440, now);
            gainNode.gain.setValueAtTime(0.1, now);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
            oscillator.start(now);
            oscillator.stop(now + 0.1);
            break;
        case 'power':
             oscillator.type = 'sawtooth';
            oscillator.frequency.setValueAtTime(220, now);
            gainNode.gain.setValueAtTime(0.2, now);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
            oscillator.start(now);
            oscillator.stop(now + 0.5);
            break;
        case 'death':
            oscillator.type = 'sawtooth';
            oscillator.frequency.setValueAtTime(440, now);
            oscillator.frequency.exponentialRampToValueAtTime(110, now + 0.5);
            gainNode.gain.setValueAtTime(0.3, now);
            gainNode.gain.linearRampToValueAtTime(0, now + 0.5);
            oscillator.start(now);
            oscillator.stop(now + 0.5);
            break;
    }
}


export function PacmanGame() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [cellSize, setCellSize] = useState(INITIAL_CELL_SIZE);
  const [isMuted, setIsMuted] = useState(false);
  
  const pellets = useRef< { x: number; y: number; type: 'pellet' | 'power' }[]>([]);
  const pacman = useRef({ x: 9, y: 12, dx: 0, dy: 0, open: 0.2, openRate: 0.1 });
  const ghosts = useRef([
      { x: 9, y: 10, dx: 1, dy: 0, color: 'red', id: 'B' }, // Blinky
      { x: 8, y: 16, dx: 0, dy: -1, color: 'pink', id: 'I' }, // Inky, swapped with Pinky for starting pos
      { x: 10, y: 16, dx: 0, dy: -1, color: 'cyan', id: 'P' }, // Pinky, swapped with Inky
      { x: 9, y: 16, dx: -1, dy: 0, color: 'orange', id: 'Y' } // Clyde
  ]);
  const collisionGracePeriod = useRef(0);

  const isWall = (x: number, y: number) => {
    if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return true;
    const mapY = Math.floor(y);
    const mapX = Math.floor(x);
    if (mapY < 0 || mapY >= map.length || mapX < 0 || mapX >= map[mapY].length) return true;
    return map[mapY][mapX] === '#';
  };

  const resetPellets = () => {
    pellets.current = [];
    map.forEach((row, y) => {
        row.split('').forEach((char, x) => {
            if (char === '.') pellets.current.push({ x, y, type: 'pellet' });
            if (char === 'O') pellets.current.push({ x, y, type: 'power' });
        });
    });
  }

  const findChar = (char: string) => {
      for (let y = 0; y < map.length; y++) {
          const x = map[y].indexOf(char);
          if (x !== -1) return { x, y };
      }
      return null;
  }

  const resetPositions = () => {
    const pacmanStart = findChar('P');
    if (pacmanStart) pacman.current = { ...pacman.current, x: pacmanStart.x, y: pacmanStart.y, dx: 0, dy: 0};
    
    ghosts.current.forEach(g => {
        const ghostStart = findChar(g.id);
        if (ghostStart) {
            g.x = ghostStart.x;
            g.y = ghostStart.y;
        } else {
           const center = findChar('G') || {x: 9, y: 10};
           g.x = center.x;
           g.y = center.y;
        }
    });
    collisionGracePeriod.current = 120;
  };
  
  const nextLevel = useCallback(() => {
    setLevel(l => l + 1);
    resetPellets();
    resetPositions();
    playSound('levelStart', isMuted);
  }, [isMuted]);

  const initGame = useCallback(() => {
    if (typeof window !== 'undefined' && !audioCtx) {
        audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    setScore(0);
    setLives(3);
    setLevel(1);
    setGameOver(false);
    setGameStarted(true);
    resetPellets();
    resetPositions();
    playSound('levelStart', isMuted);
  }, [isMuted]);
  
  const handleMove = (dx: number, dy: number) => {
    pacman.current.dx = dx;
    pacman.current.dy = dy;
  }
  
  const toggleMute = () => {
    setIsMuted(prevState => !prevState);
  };

  useLayoutEffect(() => {
    const updateSize = () => {
        if (containerRef.current) {
            const containerWidth = containerRef.current.offsetWidth;
            const newCellSize = Math.floor(containerWidth / COLS);
            setCellSize(newCellSize);
        }
    };
    window.addEventListener('resize', updateSize);
    updateSize();
    return () => window.removeEventListener('resize', updateSize);
  }, []);


  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!gameStarted || gameOver) return;
      e.preventDefault();
      switch (e.key) {
        case 'ArrowUp': handleMove(0, -1); break;
        case 'ArrowDown': handleMove(0, 1); break;
        case 'ArrowLeft': handleMove(-1, 0); break;
        case 'ArrowRight': handleMove(1, 0); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameStarted, gameOver]);


  useEffect(() => {
    if (!gameStarted || !canvasRef.current || gameOver) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frameCount = 0;
    let animationFrameId: number;
    
    const PACMAN_RADIUS = cellSize / 2 - 2;
    const GHOST_RADIUS = cellSize / 2 - 3;
    const PELLET_RADIUS = Math.max(1, cellSize/10);
    const POWER_PELLET_RADIUS = Math.max(2, cellSize/4);

    const gameLoop = () => {
      if (collisionGracePeriod.current > 0) {
        collisionGracePeriod.current--;
      }
      frameCount++;
      
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.fillStyle = 'blue';
      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          if (map[y][x] === '#') {
            ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
          }
        }
      }

      pellets.current.forEach(p => {
        ctx.beginPath();
        const radius = p.type === 'power' ? POWER_PELLET_RADIUS : PELLET_RADIUS;
        ctx.arc(p.x * cellSize + cellSize / 2, p.y * cellSize + cellSize / 2, radius, 0, 2 * Math.PI);
        ctx.fillStyle = 'white';
        ctx.fill();
      });

      if (frameCount % 10 === 0) {
        const { x, y, dx, dy } = pacman.current;
        const nextX = x + dx;
        const nextY = y + dy;
        if (!isWall(nextX, nextY)) {
          pacman.current.x = nextX;
          pacman.current.y = nextY;
        }
      }
      
      pacman.current.open += pacman.current.openRate;
      if (pacman.current.open > 0.4 || pacman.current.open < 0) {
          pacman.current.openRate *= -1;
      }
      const pacmanScreenX = pacman.current.x * cellSize + cellSize / 2;
      const pacmanScreenY = pacman.current.y * cellSize + cellSize / 2;

      ctx.save();
      ctx.translate(pacmanScreenX, pacmanScreenY);
      const angle = Math.atan2(pacman.current.dy, pacman.current.dx);
      ctx.rotate(angle);
      
      ctx.beginPath();
      ctx.arc(0, 0, PACMAN_RADIUS, pacman.current.open * Math.PI, (2 - pacman.current.open) * Math.PI);
      ctx.lineTo(0,0);
      ctx.closePath();
      ctx.fillStyle = 'yellow';
      ctx.fill();
      ctx.restore();

      pellets.current = pellets.current.filter(p => {
        if (p.x === pacman.current.x && p.y === pacman.current.y) {
          setScore(s => s + (p.type === 'power' ? 50 : 10));
          playSound(p.type === 'power' ? 'power' : 'waka', isMuted);
          return false;
        }
        return true;
      });

      if (pellets.current.length === 0) {
        nextLevel();
      }

      const ghostSpeed = Math.max(4, 12 - level);
      if (frameCount % ghostSpeed === 0) {
        ghosts.current.forEach(g => {
            const { x, y, dx, dy } = g;
            if (isWall(x + dx, y + dy) || Math.random() > 0.95) {
                const moves = [[0,1], [0,-1], [1,0], [-1,0]];
                const validMoves = moves.filter(([mdx, mdy]) => !isWall(x + mdx, y + mdy) && (mdx !== -dx || mdy !== -dy));
                if (validMoves.length > 0) {
                    const [newDx, newDy] = validMoves[Math.floor(Math.random() * validMoves.length)];
                    g.dx = newDx;
                    g.dy = newDy;
                }
            }
            g.x += g.dx;
            g.y += g.dy;
        });
      }

      ghosts.current.forEach(g => {
          ctx.beginPath();
          ctx.arc(g.x * cellSize + cellSize / 2, g.y * cellSize + cellSize / 2, GHOST_RADIUS, Math.PI, 0);
          ctx.lineTo(g.x * cellSize + cellSize - 4, g.y * cellSize + cellSize);
          ctx.lineTo(g.x * cellSize + cellSize / 2 + 4, g.y * cellSize + cellSize - (cellSize/3));
          ctx.lineTo(g.x * cellSize + cellSize / 2, g.y * cellSize + cellSize);
          ctx.lineTo(g.x * cellSize + cellSize / 2 - 4, g.y * cellSize + cellSize - (cellSize/3));
          ctx.lineTo(g.x * cellSize + 4, g.y * cellSize + cellSize);
          ctx.closePath();
          ctx.fillStyle = g.color;
          ctx.fill();

          if (collisionGracePeriod.current === 0 && g.x === pacman.current.x && g.y === pacman.current.y) {
              playSound('death', isMuted);
              setLives(l => {
                  const newLives = l - 1;
                  if (newLives <= 0) {
                    setGameOver(true);
                  } else {
                     resetPositions();
                  }
                  return newLives;
              });
          }
      });
      
      animationFrameId = window.requestAnimationFrame(gameLoop);
    };

    gameLoop();

    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };

  }, [gameStarted, gameOver, level, cellSize, isMuted, nextLevel]);
  
  
  const canvasWidth = COLS * cellSize;
  const canvasHeight = ROWS * cellSize;

  return (
    <div ref={containerRef} className="w-full max-w-md mx-auto flex flex-col items-center gap-4">
        <Card className="max-w-fit border-none shadow-none bg-transparent">
            <CardContent className="p-0 relative">
            <canvas
                ref={canvasRef}
                width={canvasWidth}
                height={canvasHeight}
                className="rounded-lg bg-black"
            />

            {!gameStarted && (
                <div className="absolute inset-0 flex flex-col justify-center items-center bg-black/70">
                    <h2 className="text-4xl font-bold text-yellow-400 font-headline">PAC-MAN</h2>
                    <Button onClick={initGame} className="mt-4">Start Game</Button>
                </div>
            )}

            {gameOver && (
                <div className="absolute inset-0 flex flex-col justify-center items-center bg-black/70">
                    <h2 className="text-4xl font-bold text-red-500 font-headline">GAME OVER</h2>
                    <p className="text-white text-lg">Final Score: {score}</p>
                    <Button onClick={initGame} className="mt-4">Play Again</Button>
                </div>
            )}

            <div className="absolute top-2 left-2 text-white font-bold font-mono text-sm sm:text-base">Score: {score}</div>
            <div className="absolute top-2 right-2 flex gap-4 items-center text-white font-bold font-mono text-sm sm:text-base">
                <span>Level: {level}</span>
                <span>Lives: {lives}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-white" onClick={toggleMute}>
                  {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </Button>
            </div>
          </CardContent>
        </Card>
        {gameStarted && !gameOver && (
            <div className="grid grid-cols-3 gap-2 md:hidden">
                <div/>
                <Button variant="outline" className="h-16 w-16" onPointerDown={() => handleMove(0, -1)}><ArrowUp size={32}/></Button>
                <div/>
                <Button variant="outline" className="h-16 w-16" onPointerDown={() => handleMove(-1, 0)}><ArrowLeft size={32}/></Button>
                <Button variant="outline" className="h-16 w-16" onPointerDown={() => handleMove(0, 1)}><ArrowDown size={32}/></Button>
                <Button variant="outline" className="h-16 w-16" onPointerDown={() => handleMove(1, 0)}><ArrowRight size={32}/></Button>
            </div>
        )}
    </div>
  );
}

    
