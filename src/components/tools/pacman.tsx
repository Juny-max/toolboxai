
"use client";

import { useRef, useEffect, useState, useLayoutEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Volume2, VolumeX } from 'lucide-react';

const INITIAL_CELL_SIZE = 20;

// Audio system with real sound file support
class AudioManager {
  private sounds: Map<string, HTMLAudioElement> = new Map();
  private audioContext: AudioContext | null = null;
  private isMuted = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.loadSounds();
    }
  }

  private loadSounds() {
    const soundFiles = {
      waka: '/sounds/waka.mp3',
      power: '/sounds/power-pellet.mp3',
      eatGhost: '/sounds/eat-ghost.mp3',
      death: '/sounds/death.mp3',
      intro: '/sounds/intro.mp3',
    };

    Object.entries(soundFiles).forEach(([key, path]) => {
      const audio = new Audio();
      audio.preload = 'auto';
      audio.src = path;
      // Fallback: if file doesn't exist, we'll use synthesized sound
      audio.onerror = () => {
        console.log(`Sound file ${path} not found, will use synthesized fallback`);
      };
      this.sounds.set(key, audio);
    });
  }

  setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  async play(soundName: string) {
    if (this.isMuted) return;

    const sound = this.sounds.get(soundName);
    if (sound && sound.src && !sound.error) {
      try {
        sound.currentTime = 0;
        await sound.play();
      } catch (e) {
        // If real sound fails, use synthesized fallback
        this.playSynthesized(soundName);
      }
    } else {
      // Use synthesized fallback
      this.playSynthesized(soundName);
    }
  }

  private playSynthesized(type: string) {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    const now = this.audioContext.currentTime;
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    gainNode.connect(this.audioContext.destination);
    oscillator.connect(gainNode);

    switch (type) {
      case 'waka':
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(440, now);
        gainNode.gain.setValueAtTime(0.15, now);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
        oscillator.start(now);
        oscillator.stop(now + 0.08);
        break;
      case 'power':
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(523, now);
        gainNode.gain.setValueAtTime(0.2, now);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
        oscillator.start(now);
        oscillator.stop(now + 0.3);
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
      case 'intro':
        const notes = [
          { freq: 392.00, duration: 0.1, delay: 0 },
          { freq: 392.00, duration: 0.1, delay: 0.1 },
          { freq: 440.00, duration: 0.1, delay: 0.2 },
          { freq: 523.25, duration: 0.1, delay: 0.3 },
          { freq: 440.00, duration: 0.1, delay: 0.4 },
          { freq: 523.25, duration: 0.2, delay: 0.5 },
          { freq: 587.33, duration: 0.2, delay: 0.8 },
          { freq: 659.25, duration: 0.2, delay: 1.1 },
        ];
        notes.forEach(note => {
          const osc = this.audioContext!.createOscillator();
          const gain = this.audioContext!.createGain();
          osc.connect(gain);
          gain.connect(this.audioContext!.destination);
          osc.type = 'square';
          osc.frequency.setValueAtTime(note.freq, now + note.delay);
          gain.gain.setValueAtTime(0.1, now + note.delay);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + note.delay + note.duration);
          osc.start(now + note.delay);
          osc.stop(now + note.delay + note.duration);
        });
        break;
    }
  }
}

let audioManager: AudioManager | null = null;

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

// Enhanced visual rendering functions
const drawRoundedWall = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  cellSize: number,
  map: string[],
  radius: number = 4
) => {
  const isWallAt = (dx: number, dy: number) => {
    const ny = y + dy;
    const nx = x + dx;
    if (ny < 0 || ny >= map.length || nx < 0 || nx >= map[ny].length) return false;
    return map[ny][nx] === '#';
  };

  const left = x * cellSize;
  const top = y * cellSize;
  const right = left + cellSize;
  const bottom = top + cellSize;

  // Create gradient for 3D effect
  const gradient = ctx.createLinearGradient(left, top, right, bottom);
  gradient.addColorStop(0, '#2563eb');
  gradient.addColorStop(0.5, '#1d4ed8');
  gradient.addColorStop(1, '#1e40af');
  
  ctx.fillStyle = gradient;
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 1;

  ctx.beginPath();

  const hasTop = isWallAt(0, -1);
  const hasBottom = isWallAt(0, 1);
  const hasLeft = isWallAt(-1, 0);
  const hasRight = isWallAt(1, 0);

  // Draw with rounded corners where walls don't connect
  if (!hasTop && !hasLeft) {
    ctx.moveTo(left + radius, top);
  } else {
    ctx.moveTo(left, top);
  }

  if (!hasTop && !hasRight) {
    ctx.lineTo(right - radius, top);
    ctx.arcTo(right, top, right, top + radius, radius);
  } else {
    ctx.lineTo(right, top);
  }

  if (!hasBottom && !hasRight) {
    ctx.lineTo(right, bottom - radius);
    ctx.arcTo(right, bottom, right - radius, bottom, radius);
  } else {
    ctx.lineTo(right, bottom);
  }

  if (!hasBottom && !hasLeft) {
    ctx.lineTo(left + radius, bottom);
    ctx.arcTo(left, bottom, left, bottom - radius, radius);
  } else {
    ctx.lineTo(left, bottom);
  }

  if (!hasTop && !hasLeft) {
    ctx.lineTo(left, top + radius);
    ctx.arcTo(left, top, left + radius, top, radius);
  } else {
    ctx.lineTo(left, top);
  }

  ctx.closePath();
  ctx.fill();
  ctx.stroke();
};

const drawGlowingPellet = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  isPower: boolean = false
) => {
  const centerX = x;
  const centerY = y;
  
  // Outer glow
  const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius * 2);
  gradient.addColorStop(0, isPower ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 223, 186, 0.6)');
  gradient.addColorStop(0.5, isPower ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 223, 186, 0.3)');
  gradient.addColorStop(1, 'rgba(255, 223, 186, 0)');
  
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius * 2, 0, 2 * Math.PI);
  ctx.fill();

  // Main pellet
  const pelletGradient = ctx.createRadialGradient(
    centerX - radius * 0.3,
    centerY - radius * 0.3,
    0,
    centerX,
    centerY,
    radius
  );
  pelletGradient.addColorStop(0, isPower ? '#fff' : '#ffd');
  pelletGradient.addColorStop(1, isPower ? '#ffd700' : '#ffdfba');
  
  ctx.fillStyle = pelletGradient;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
  ctx.fill();
};

const drawEnhancedPacman = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  openAmount: number,
  angle: number
) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  // Outer glow
  const glowGradient = ctx.createRadialGradient(0, 0, radius * 0.5, 0, 0, radius * 1.5);
  glowGradient.addColorStop(0, 'rgba(255, 255, 0, 0.8)');
  glowGradient.addColorStop(0.7, 'rgba(255, 255, 0, 0.3)');
  glowGradient.addColorStop(1, 'rgba(255, 255, 0, 0)');
  ctx.fillStyle = glowGradient;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 1.5, 0, 2 * Math.PI);
  ctx.fill();

  // Pac-Man body with gradient
  const bodyGradient = ctx.createRadialGradient(-radius * 0.3, -radius * 0.3, 0, 0, 0, radius);
  bodyGradient.addColorStop(0, '#ffff00');
  bodyGradient.addColorStop(0.7, '#ffd700');
  bodyGradient.addColorStop(1, '#ffaa00');
  
  ctx.fillStyle = bodyGradient;
  ctx.beginPath();
  ctx.arc(0, 0, radius, openAmount * Math.PI, (2 - openAmount) * Math.PI);
  ctx.lineTo(0, 0);
  ctx.closePath();
  ctx.fill();

  // Add highlight
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.beginPath();
  ctx.arc(-radius * 0.3, -radius * 0.3, radius * 0.4, 0, 2 * Math.PI);
  ctx.fill();

  ctx.restore();
};

const drawEnhancedGhost = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  frameCount: number
) => {
  // Ghost colors with gradients
  const colorMap: Record<string, { main: string; light: string; dark: string }> = {
    red: { main: '#ff0000', light: '#ff6b6b', dark: '#cc0000' },
    pink: { main: '#ffb8ff', light: '#ffd6ff', dark: '#ff9edf' },
    cyan: { main: '#00ffff', light: '#7dffff', dark: '#00cccc' },
    orange: { main: '#ffb852', light: '#ffd08a', dark: '#ff9500' },
  };

  const colors = colorMap[color] || colorMap.red;

  // Body with gradient
  const bodyGradient = ctx.createLinearGradient(x - radius, y - radius, x + radius, y + radius);
  bodyGradient.addColorStop(0, colors.light);
  bodyGradient.addColorStop(0.5, colors.main);
  bodyGradient.addColorStop(1, colors.dark);

  ctx.fillStyle = bodyGradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, Math.PI, 0);
  
  // Wavy bottom
  const waveOffset = Math.sin(frameCount * 0.1) * 2;
  const segments = 4;
  const segmentWidth = (radius * 2) / segments;
  
  for (let i = 0; i < segments; i++) {
    const sx = x - radius + i * segmentWidth;
    const ex = sx + segmentWidth;
    const cy = y + radius + (i % 2 === 0 ? waveOffset : -waveOffset);
    ctx.lineTo(sx + segmentWidth / 2, cy);
    ctx.lineTo(ex, y + radius);
  }
  
  ctx.closePath();
  ctx.fill();

  // Eyes
  const eyeRadius = radius * 0.25;
  const eyeOffsetX = radius * 0.3;
  const eyeOffsetY = -radius * 0.2;

  // Left eye white
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.arc(x - eyeOffsetX, y + eyeOffsetY, eyeRadius, 0, 2 * Math.PI);
  ctx.fill();

  // Right eye white
  ctx.beginPath();
  ctx.arc(x + eyeOffsetX, y + eyeOffsetY, eyeRadius, 0, 2 * Math.PI);
  ctx.fill();

  // Pupils
  ctx.fillStyle = '#000080';
  const pupilRadius = eyeRadius * 0.6;
  ctx.beginPath();
  ctx.arc(x - eyeOffsetX, y + eyeOffsetY, pupilRadius, 0, 2 * Math.PI);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + eyeOffsetX, y + eyeOffsetY, pupilRadius, 0, 2 * Math.PI);
  ctx.fill();
};


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
    if (audioManager) {
      audioManager.play('intro');
    }
  }, []);

  const initGame = useCallback(() => {
    if (!audioManager) {
      audioManager = new AudioManager();
    }
    audioManager.setMuted(isMuted);

    setScore(0);
    setLives(3);
    setLevel(1);
    setGameOver(false);
    setGameStarted(true);
    resetPellets();
    resetPositions();
    audioManager.play('intro');
  }, [isMuted]);
  
  const handleMove = (dx: number, dy: number) => {
    pacman.current.dx = dx;
    pacman.current.dy = dy;
  }
  
  const toggleMute = () => {
    setIsMuted(prevState => {
      const newState = !prevState;
      if (audioManager) {
        audioManager.setMuted(newState);
      }
      return newState;
    });
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
      
      // Draw background with subtle gradient
      const bgGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      bgGradient.addColorStop(0, '#000000');
      bgGradient.addColorStop(0.5, '#0a0a0a');
      bgGradient.addColorStop(1, '#000000');
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw walls with enhanced styling
      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          if (map[y][x] === '#') {
            drawRoundedWall(ctx, x, y, cellSize, map, 3);
          }
        }
      }

      // Draw pellets with glow effect
      pellets.current.forEach(p => {
        const radius = p.type === 'power' ? POWER_PELLET_RADIUS : PELLET_RADIUS;
        const centerX = p.x * cellSize + cellSize / 2;
        const centerY = p.y * cellSize + cellSize / 2;
        
        // Animate power pellets
        const pulseRadius = p.type === 'power' 
          ? radius * (1 + Math.sin(frameCount * 0.1) * 0.2)
          : radius;
        
        drawGlowingPellet(ctx, centerX, centerY, pulseRadius, p.type === 'power');
      });

      // Move Pac-Man
      if (frameCount % 10 === 0) {
        const { x, y, dx, dy } = pacman.current;
        const nextX = x + dx;
        const nextY = y + dy;
        if (!isWall(nextX, nextY)) {
          pacman.current.x = nextX;
          pacman.current.y = nextY;
        }
      }
      
      // Animate Pac-Man mouth
      pacman.current.open += pacman.current.openRate;
      if (pacman.current.open > 0.4 || pacman.current.open < 0) {
          pacman.current.openRate *= -1;
      }

      // Draw Pac-Man with enhanced graphics
      const pacmanScreenX = pacman.current.x * cellSize + cellSize / 2;
      const pacmanScreenY = pacman.current.y * cellSize + cellSize / 2;
      const angle = Math.atan2(pacman.current.dy, pacman.current.dx);
      
      drawEnhancedPacman(ctx, pacmanScreenX, pacmanScreenY, PACMAN_RADIUS, pacman.current.open, angle);

      // Check pellet collisions
      pellets.current = pellets.current.filter(p => {
        if (p.x === pacman.current.x && p.y === pacman.current.y) {
          setScore(s => s + (p.type === 'power' ? 50 : 10));
          if (audioManager) {
            audioManager.play(p.type === 'power' ? 'power' : 'waka');
          }
          return false;
        }
        return true;
      });

      // Check for level completion
      if (pellets.current.length === 0) {
        nextLevel();
      }

      // Move ghosts
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

      // Draw ghosts with enhanced graphics
      ghosts.current.forEach(g => {
          const ghostScreenX = g.x * cellSize + cellSize / 2;
          const ghostScreenY = g.y * cellSize + cellSize / 2;
          drawEnhancedGhost(ctx, ghostScreenX, ghostScreenY, GHOST_RADIUS, g.color, frameCount);

          // Check collision
          if (collisionGracePeriod.current === 0 && g.x === pacman.current.x && g.y === pacman.current.y) {
              if (audioManager) {
                audioManager.play('death');
              }
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
    <div ref={containerRef} className="w-full max-w-2xl mx-auto flex flex-col items-center gap-6">
        <Card className="w-full border-2 border-blue-500/30 shadow-2xl shadow-blue-500/20 bg-gradient-to-b from-gray-900 to-black">
            <CardContent className="p-6">
              {/* Game Info Bar */}
              <div className="flex justify-between items-center mb-4 bg-black/50 rounded-lg p-4 border border-blue-500/20">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Score</div>
                    <div className="text-2xl font-bold text-yellow-400 font-mono tabular-nums">{score}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Level</div>
                    <div className="text-2xl font-bold text-cyan-400 font-mono tabular-nums">{level}</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 uppercase tracking-wider">Lives</span>
                    <div className="flex gap-1">
                      {Array.from({ length: lives }).map((_, i) => (
                        <div key={i} className="w-6 h-6 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-500 border-2 border-yellow-600" />
                      ))}
                    </div>
                  </div>
                  
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-gray-400 hover:text-white hover:bg-blue-500/20" 
                    onClick={toggleMute}
                  >
                    {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                  </Button>
                </div>
              </div>

              {/* Game Canvas */}
              <div className="relative rounded-lg overflow-hidden border-4 border-blue-600/40 shadow-inner shadow-blue-500/50">
                <canvas
                  ref={canvasRef}
                  width={canvasWidth}
                  height={canvasHeight}
                  className="w-full h-auto bg-black"
                />

                {!gameStarted && (
                  <div className="absolute inset-0 flex flex-col justify-center items-center bg-black/90 backdrop-blur-sm">
                    <div className="text-center space-y-6 p-8">
                      <h2 className="text-6xl font-bold text-yellow-400 font-headline tracking-wider drop-shadow-[0_0_20px_rgba(255,255,0,0.5)]">
                        PAC-MAN
                      </h2>
                      <p className="text-gray-300 text-sm max-w-xs mx-auto">
                        Eat all the dots while avoiding the ghosts. Grab power pellets to turn the tables!
                      </p>
                      <Button 
                        onClick={initGame} 
                        className="mt-4 bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-8 py-6 text-lg rounded-full shadow-lg shadow-yellow-500/50 transition-all hover:scale-105"
                      >
                        Start Game
                      </Button>
                      <div className="text-xs text-gray-500 space-y-1">
                        <p>Use arrow keys or on-screen buttons to move</p>
                      </div>
                    </div>
                  </div>
                )}

                {gameOver && (
                  <div className="absolute inset-0 flex flex-col justify-center items-center bg-black/90 backdrop-blur-sm">
                    <div className="text-center space-y-6 p-8">
                      <h2 className="text-5xl font-bold text-red-500 font-headline tracking-wider drop-shadow-[0_0_20px_rgba(255,0,0,0.5)] animate-pulse">
                        GAME OVER
                      </h2>
                      <div className="space-y-2">
                        <p className="text-gray-400 text-sm uppercase tracking-wider">Final Score</p>
                        <p className="text-yellow-400 text-4xl font-bold font-mono">{score}</p>
                        <p className="text-gray-400 text-sm">Level {level}</p>
                      </div>
                      <Button 
                        onClick={initGame} 
                        className="mt-4 bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-6 text-lg rounded-full shadow-lg shadow-blue-500/50 transition-all hover:scale-105"
                      >
                        Play Again
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
        </Card>
        
        {/* Mobile Controls */}
        {gameStarted && !gameOver && (
            <div className="grid grid-cols-3 gap-3 md:hidden w-full max-w-xs">
                <div />
                <Button 
                  variant="outline" 
                  className="h-20 w-20 bg-gradient-to-b from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 border-2 border-blue-400 text-white shadow-lg active:scale-95 transition-transform" 
                  onPointerDown={() => handleMove(0, -1)}
                >
                  <ArrowUp size={32} />
                </Button>
                <div />
                <Button 
                  variant="outline" 
                  className="h-20 w-20 bg-gradient-to-b from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 border-2 border-blue-400 text-white shadow-lg active:scale-95 transition-transform" 
                  onPointerDown={() => handleMove(-1, 0)}
                >
                  <ArrowLeft size={32} />
                </Button>
                <Button 
                  variant="outline" 
                  className="h-20 w-20 bg-gradient-to-b from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 border-2 border-blue-400 text-white shadow-lg active:scale-95 transition-transform" 
                  onPointerDown={() => handleMove(0, 1)}
                >
                  <ArrowDown size={32} />
                </Button>
                <Button 
                  variant="outline" 
                  className="h-20 w-20 bg-gradient-to-b from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 border-2 border-blue-400 text-white shadow-lg active:scale-95 transition-transform" 
                  onPointerDown={() => handleMove(1, 0)}
                >
                  <ArrowRight size={32} />
                </Button>
            </div>
        )}
    </div>
  );
}

    
