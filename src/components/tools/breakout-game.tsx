
"use client";

import { useRef, useEffect, useState, useLayoutEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX } from 'lucide-react';

// --- Game Constants ---
const PADDLE_WIDTH = 100;
const PADDLE_HEIGHT = 20;
const BALL_RADIUS = 8;
const BRICK_HEIGHT = 20;
const BRICK_GAP = 4;
const INITIAL_LIVES = 3;

// --- Level Designs ---
const layouts = {
  easy: [
    "RRRRRRRR",
    "OOOOOOOO",
    "YYYYYYYY",
    "GGGGGGGG",
  ],
  medium: [
    "   RR   ",
    "  OOOO  ",
    " YYYYYY ",
    "GGGGGGGG",
    "BBBBBBBB",
  ],
  hard: [
    "R O R O R O R",
    " O R O R O R O",
    "Y B Y B Y B Y",
    " B Y B Y B Y B",
    "G R G R G R G",
  ],
};

const speeds = {
  easy: 4,
  medium: 5,
  hard: 6,
};

type Difficulty = keyof typeof layouts;

type Brick = {
  x: number;
  y: number;
  width: number;
  color: string;
  status: 1 | 0;
};

// --- Audio Generation ---
let audioCtx: AudioContext | null = null;
const playSound = (type: 'hit' | 'break' | 'lose' | 'win' | 'levelStart', isMuted: boolean) => {
    if (typeof window === 'undefined') return;
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (!audioCtx || isMuted) return;
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    switch (type) {
        case 'hit':
            osc.type = 'sine';
            osc.frequency.setValueAtTime(440, now);
            gainNode.gain.setValueAtTime(0.1, now);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
            break;
        case 'break':
            osc.type = 'square';
            osc.frequency.setValueAtTime(880, now);
            gainNode.gain.setValueAtTime(0.1, now);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
            break;
        case 'lose':
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(220, now);
            osc.frequency.exponentialRampToValueAtTime(110, now + 0.5);
            gainNode.gain.setValueAtTime(0.2, now);
            gainNode.gain.linearRampToValueAtTime(0, now + 0.5);
            break;
        case 'win':
        case 'levelStart':
             osc.type = 'triangle';
            osc.frequency.setValueAtTime(523.25, now); // C5
            gainNode.gain.setValueAtTime(0.15, now);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
            break;
    }
    osc.start(now);
    osc.stop(now + 0.5);
};

export function BreakoutGame() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'win' | 'gameOver'>('menu');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(INITIAL_LIVES);
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [isMuted, setIsMuted] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  const paddleX = useRef(0);
  const ball = useRef({ x: 0, y: 0, dx: 0, dy: 0 });
  const bricks = useRef<Brick[]>([]);
  const animationFrameId = useRef<number>(0);

  const resetBallAndPaddle = useCallback((speed: number) => {
    paddleX.current = (canvasSize.width - PADDLE_WIDTH) / 2;
    ball.current = {
      x: canvasSize.width / 2,
      y: canvasSize.height - PADDLE_HEIGHT - BALL_RADIUS - 5,
      dx: speed * (Math.random() > 0.5 ? 1 : -1),
      dy: -speed,
    };
  }, [canvasSize]);

  const initBricks = useCallback((levelLayout: string[]) => {
    const numRows = levelLayout.length;
    if (numRows === 0) {
        bricks.current = [];
        return;
    }
    const numCols = levelLayout[0].length;

    bricks.current = [];
    const colorMap: { [key: string]: string } = {
        'R': 'hsl(var(--chart-1))',
        'O': 'hsl(var(--chart-2))',
        'Y': 'hsl(var(--chart-3))',
        'G': 'hsl(var(--chart-4))',
        'B': 'hsl(var(--chart-5))',
    };
    const brickWidth = (canvasSize.width - BRICK_GAP * (numCols + 1)) / numCols;

    levelLayout.forEach((row, r) => {
        row.split('').forEach((char, c) => {
            if (char !== ' ') {
                bricks.current.push({
                    x: BRICK_GAP + c * (brickWidth + BRICK_GAP),
                    y: BRICK_GAP + r * (BRICK_HEIGHT + BRICK_GAP) + 30,
                    width: brickWidth,
                    color: colorMap[char] || 'hsl(var(--foreground))',
                    status: 1,
                });
            }
        });
    });
  }, [canvasSize.width]);

  const startGame = useCallback((selectedDifficulty: Difficulty) => {
    if (canvasSize.width === 0) return;
    setDifficulty(selectedDifficulty);
    setScore(0);
    setLives(INITIAL_LIVES);
    initBricks(layouts[selectedDifficulty]);
    resetBallAndPaddle(speeds[selectedDifficulty]);
    setGameState('playing');
    playSound('levelStart', isMuted);
  }, [isMuted, canvasSize, initBricks, resetBallAndPaddle]);

  useLayoutEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const width = Math.max(containerWidth, 320); // Minimum width
        setCanvasSize({ width: width, height: width * 0.75 });
      }
    };
    window.addEventListener('resize', updateSize);
    updateSize();
    return () => window.removeEventListener('resize', updateSize);
  }, []);
  
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const relativeX = e.clientX - e.currentTarget.getBoundingClientRect().left;
    if (relativeX > 0 && relativeX < canvasSize.width) {
      paddleX.current = Math.min(Math.max(relativeX - PADDLE_WIDTH / 2, 0), canvasSize.width - PADDLE_WIDTH);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const touch = e.touches[0];
    const relativeX = touch.clientX - e.currentTarget.getBoundingClientRect().left;
     if (relativeX > 0 && relativeX < canvasSize.width) {
      paddleX.current = Math.min(Math.max(relativeX - PADDLE_WIDTH / 2, 0), canvasSize.width - PADDLE_WIDTH);
    }
  };

  useEffect(() => {
    if (gameState !== 'playing' || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gameLoop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      bricks.current.forEach(brick => {
        if (brick.status === 1) {
          ctx.beginPath();
          ctx.rect(brick.x, brick.y, brick.width, BRICK_HEIGHT);
          ctx.fillStyle = brick.color;
          ctx.fill();
          ctx.closePath();
        }
      });

      ctx.beginPath();
      ctx.arc(ball.current.x, ball.current.y, BALL_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = "hsl(var(--foreground))";
      ctx.fill();
      ctx.closePath();

      ctx.beginPath();
      ctx.rect(paddleX.current, canvas.height - PADDLE_HEIGHT, PADDLE_WIDTH, PADDLE_HEIGHT);
      ctx.fillStyle = "hsl(var(--primary))";
      ctx.fill();
      ctx.closePath();

      // Ball collision with walls
      if (ball.current.x + ball.current.dx > canvas.width - BALL_RADIUS || ball.current.x + ball.current.dx < BALL_RADIUS) {
        ball.current.dx = -ball.current.dx;
        playSound('hit', isMuted);
      }
      if (ball.current.y + ball.current.dy < BALL_RADIUS) {
        ball.current.dy = -ball.current.dy;
        playSound('hit', isMuted);
      }
      // Ball collision with bottom (paddle or loss)
      else if (ball.current.y + ball.current.dy > canvas.height - BALL_RADIUS - PADDLE_HEIGHT) {
         if (ball.current.x > paddleX.current && ball.current.x < paddleX.current + PADDLE_WIDTH && ball.current.y < canvas.height - PADDLE_HEIGHT) {
            let collidePoint = ball.current.x - (paddleX.current + PADDLE_WIDTH / 2);
            collidePoint = collidePoint / (PADDLE_WIDTH / 2); // value between -1 and 1
            const angle = collidePoint * (Math.PI / 3); // max 60 degree angle
            const currentSpeed = speeds[difficulty];
            ball.current.dx = currentSpeed * Math.sin(angle);
            ball.current.dy = -currentSpeed * Math.cos(angle);
            playSound('hit', isMuted);
         }
      }
      if (ball.current.y + ball.current.dy > canvas.height - BALL_RADIUS) {
        playSound('lose', isMuted);
        setLives(l => {
            const newLives = l - 1;
            if (newLives === 0) {
                setGameState('gameOver');
            } else {
                resetBallAndPaddle(speeds[difficulty]);
            }
            return newLives;
        });
      }

      let activeBricks = 0;
      bricks.current.forEach(b => {
        if (b.status === 1) {
          activeBricks++;
          if (ball.current.x > b.x && ball.current.x < b.x + b.width && ball.current.y > b.y && ball.current.y < b.y + BRICK_HEIGHT) {
            ball.current.dy = -ball.current.dy;
            b.status = 0;
            setScore(s => s + 10);
            playSound('break', isMuted);
          }
        }
      });

      if (bricks.current.length > 0 && activeBricks === 0) {
          setGameState('win');
          playSound('win', isMuted);
      }

      ball.current.x += ball.current.dx;
      ball.current.y += ball.current.dy;

      animationFrameId.current = window.requestAnimationFrame(gameLoop);
    };

    gameLoop();

    return () => {
      window.cancelAnimationFrame(animationFrameId.current);
    };
  }, [gameState, canvasSize, isMuted, resetBallAndPaddle, difficulty]);

  const renderOverlay = () => {
      let title = "";
      let buttonArea = null;

      switch(gameState) {
          case 'menu':
            title = "Breakout";
            buttonArea = (
                <div className="flex gap-4 mt-4">
                    <Button onClick={() => startGame('easy')}>Easy</Button>
                    <Button onClick={() => startGame('medium')} variant="secondary">Medium</Button>
                    <Button onClick={() => startGame('hard')} variant="destructive">Hard</Button>
                </div>
            );
            break;
          case 'gameOver':
            title = "Game Over";
            buttonArea = (
                 <>
                    <p className="text-white text-lg mt-2">Final Score: {score}</p>
                    <Button onClick={() => setGameState('menu')} className="mt-4">Main Menu</Button>
                 </>
            );
            break;
          case 'win':
            title = `You Win!`;
            buttonArea = (
                 <>
                    <p className="text-white text-lg mt-2">Final Score: {score}</p>
                    <Button onClick={() => setGameState('menu')} className="mt-4">Play Again</Button>
                 </>
            );
            break;
          default:
            return null;
      }
      
      return (
        <div className="absolute inset-0 flex flex-col justify-center items-center bg-black/70 text-center">
            <h2 className="text-4xl font-bold font-headline text-primary">{title}</h2>
            {buttonArea}
        </div>
      );
  }

  return (
    <div ref={containerRef} className="w-full max-w-2xl mx-auto flex flex-col items-center gap-4">
      <Card className="w-full border-none shadow-none bg-transparent">
        <CardContent className="p-0 relative">
          <canvas
            ref={canvasRef}
            width={canvasSize.width}
            height={canvasSize.height}
            className="rounded-lg bg-muted touch-none"
            onMouseMove={handleMouseMove}
            onTouchMove={handleTouchMove}
            onTouchStart={handleTouchMove}
          />
          {renderOverlay()}
          {gameState === 'playing' && (
            <>
              <div className="absolute top-2 left-2 text-foreground font-bold font-mono text-sm sm:text-base">Score: {score}</div>
              <div className="absolute top-2 right-2 flex gap-4 items-center text-foreground font-bold font-mono text-sm sm:text-base">
                <span>Lives: {lives}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-foreground" onClick={() => setIsMuted(m => !m)}>
                  {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
