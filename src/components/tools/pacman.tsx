
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

  // Create authentic arcade-style gradient for walls
  const gradient = ctx.createLinearGradient(left, top, right, bottom);
  gradient.addColorStop(0, '#2196F3');
  gradient.addColorStop(0.5, '#1976D2');
  gradient.addColorStop(1, '#0D47A1');
  
  ctx.fillStyle = gradient;
  ctx.strokeStyle = '#42A5F5';
  ctx.lineWidth = 0.5;

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
  
  if (isPower) {
    // Power pellet with soft glow
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius * 1.5);
    gradient.addColorStop(0, 'rgba(255, 184, 108, 0.9)');
    gradient.addColorStop(0.6, 'rgba(255, 184, 108, 0.5)');
    gradient.addColorStop(1, 'rgba(255, 184, 108, 0)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 1.5, 0, 2 * Math.PI);
    ctx.fill();
  }

  // Main pellet - solid and clear
  ctx.fillStyle = isPower ? '#FFB86C' : '#FFF8E1';
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
  ctx.fill();
  
  // Add slight highlight for 3D effect
  const highlightGradient = ctx.createRadialGradient(
    centerX - radius * 0.3,
    centerY - radius * 0.3,
    0,
    centerX,
    centerY,
    radius
  );
  highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
  highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  
  ctx.fillStyle = highlightGradient;
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

  // Pac-Man body - classic arcade yellow
  const bodyGradient = ctx.createRadialGradient(-radius * 0.25, -radius * 0.25, 0, 0, 0, radius);
  bodyGradient.addColorStop(0, '#FFEB3B');
  bodyGradient.addColorStop(0.8, '#FFC107');
  bodyGradient.addColorStop(1, '#FF9800');
  
  ctx.fillStyle = bodyGradient;
  ctx.beginPath();
  ctx.arc(0, 0, radius, openAmount * Math.PI, (2 - openAmount) * Math.PI);
  ctx.lineTo(0, 0);
  ctx.closePath();
  ctx.fill();

  // Add eye when mouth is closing
  if (openAmount < 0.15) {
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(-radius * 0.15, -radius * 0.4, radius * 0.12, 0, 2 * Math.PI);
    ctx.fill();
  }

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
  // Authentic arcade ghost colors
  const colorMap: Record<string, { main: string; eyes: string }> = {
    red: { main: '#FF0000', eyes: '#0000FF' },    // Blinky
    pink: { main: '#FFB8FF', eyes: '#0000FF' },   // Pinky
    cyan: { main: '#00FFFF', eyes: '#0000FF' },   // Inky
    orange: { main: '#FFB851', eyes: '#0000FF' }, // Clyde
  };

  const colors = colorMap[color] || colorMap.red;

  // Ghost body - solid color like arcade
  ctx.fillStyle = colors.main;
  ctx.beginPath();
  ctx.arc(x, y, radius, Math.PI, 0, false);
  
  // Wavy bottom animation
  const waveOffset = Math.sin(frameCount * 0.15) * (radius * 0.15);
  const segments = 3;
  const segmentWidth = (radius * 2) / segments;
  
  for (let i = 0; i < segments; i++) {
    const sx = x - radius + i * segmentWidth;
    const ex = sx + segmentWidth;
    const midX = sx + segmentWidth / 2;
    const wave = i % 2 === 0 ? waveOffset : -waveOffset;
    ctx.lineTo(midX, y + radius + wave);
    ctx.lineTo(ex, y + radius);
  }
  
  ctx.closePath();
  ctx.fill();

  // Eyes - classic arcade style
  const eyeRadius = radius * 0.3;
  const eyeSpacing = radius * 0.4;
  const eyeY = y - radius * 0.15;

  // White of eyes
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(x - eyeSpacing, eyeY, eyeRadius, 0, 2 * Math.PI);
  ctx.arc(x + eyeSpacing, eyeY, eyeRadius, 0, 2 * Math.PI);
  ctx.fill();

  // Pupils
  ctx.fillStyle = colors.eyes;
  const pupilRadius = eyeRadius * 0.5;
  ctx.beginPath();
  ctx.arc(x - eyeSpacing, eyeY, pupilRadius, 0, 2 * Math.PI);
  ctx.arc(x + eyeSpacing, eyeY, pupilRadius, 0, 2 * Math.PI);
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
        // Account for: navbar (56px), page header (80px), info bar (60px), paddings (40px), controls (mobile 120px)
        const isMobile = window.innerWidth < 768;
        const reservedHeight = isMobile ? 400 : 280;
        const availableHeight = window.innerHeight - reservedHeight;
        
        const widthBased = containerWidth / COLS;
        const heightBased = availableHeight / ROWS;
        
        // Cap cell size even smaller: max 13px for desktop, 11px for mobile
        const maxSize = isMobile ? 11 : 13;
        const newCellSize = Math.floor(Math.min(widthBased, heightBased, maxSize));
        setCellSize(Math.max(newCellSize, 7)); // minimum 7px
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

      // Move Pac-Man (faster movement - every 3 frames)
      if (frameCount % 3 === 0) {
        const { x, y, dx, dy } = pacman.current;
        const nextX = x + dx;
        const nextY = y + dy;
        if (!isWall(nextX, nextY)) {
          pacman.current.x = nextX;
          pacman.current.y = nextY;
        }
      }
      
      // Animate Pac-Man mouth (faster animation)
      pacman.current.open += pacman.current.openRate * 2;
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

      // Move ghosts (faster at higher levels - 2-6 frames)
      const ghostSpeed = Math.max(2, 6 - Math.floor(level / 2));
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
    <div ref={containerRef} className="w-full max-w-xl mx-auto flex flex-col items-center gap-1">
        <Card className="w-full border border-blue-500/20 shadow-lg bg-black">
            <CardContent className="p-1.5 sm:p-2">
              {/* Game Info Bar */}
              <div className="flex justify-between items-center mb-1.5 bg-gray-900/50 rounded-md px-2 py-1 border border-blue-500/10">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="text-center">
                    <div className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wide mb-0.5">Score</div>
                    <div className="text-lg sm:text-xl font-bold text-yellow-400 font-mono tabular-nums">{score}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wide mb-0.5">Level</div>
                    <div className="text-lg sm:text-xl font-bold text-cyan-400 font-mono tabular-nums">{level}</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wide hidden sm:inline">Lives</span>
                    <div className="flex gap-1">
                      {Array.from({ length: lives }).map((_, i) => (
                        <div key={i} className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-yellow-400 border border-yellow-500" />
                      ))}
                    </div>
                  </div>
                  
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7 sm:h-8 sm:w-8 text-gray-400 hover:text-white hover:bg-blue-500/20" 
                    onClick={toggleMute}
                  >
                    {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                  </Button>
                </div>
              </div>

              {/* Game Canvas */}
              <div className="relative rounded-md overflow-hidden border-2 border-blue-500/30">
                <canvas
                  ref={canvasRef}
                  width={canvasWidth}
                  height={canvasHeight}
                  className="w-full h-auto bg-black"
                />

                {!gameStarted && (
                  <div className="absolute inset-0 flex flex-col justify-center items-center bg-black/95">
                    <div className="text-center space-y-4 p-6">
                      <h2 className="text-4xl sm:text-5xl font-bold text-yellow-400 tracking-wide" style={{ fontFamily: 'Arial Black, sans-serif' }}>
                        PAC-MAN
                      </h2>
                      <p className="text-gray-400 text-xs sm:text-sm max-w-xs mx-auto">
                        Eat all dots, avoid ghosts, grab power pellets!
                      </p>
                      <Button 
                        onClick={initGame} 
                        className="mt-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-6 py-3 sm:px-8 sm:py-4 text-sm sm:text-base rounded-full shadow-lg transition-all hover:scale-105"
                      >
                        Start Game
                      </Button>
                      <div className="text-[10px] sm:text-xs text-gray-600">
                        <p>Arrow keys or tap buttons to move</p>
                      </div>
                    </div>
                  </div>
                )}

                {gameOver && (
                  <div className="absolute inset-0 flex flex-col justify-center items-center bg-black/95">
                    <div className="text-center space-y-4 p-6">
                      <h2 className="text-3xl sm:text-4xl font-bold text-red-500 tracking-wide animate-pulse" style={{ fontFamily: 'Arial Black, sans-serif' }}>
                        GAME OVER
                      </h2>
                      <div className="space-y-1.5">
                        <p className="text-gray-500 text-xs uppercase tracking-wider">Final Score</p>
                        <p className="text-yellow-400 text-3xl sm:text-4xl font-bold font-mono">{score}</p>
                        <p className="text-gray-500 text-xs">Level {level}</p>
                      </div>
                      <Button 
                        onClick={initGame} 
                        className="mt-3 bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-3 sm:px-8 sm:py-4 text-sm sm:text-base rounded-full shadow-lg transition-all hover:scale-105"
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
            <div className="grid grid-cols-3 gap-2 md:hidden w-full max-w-xs">
                <div />
                <Button 
                  variant="outline" 
                  className="h-16 w-16 bg-blue-600 hover:bg-blue-500 border-2 border-blue-400 text-white shadow-md active:scale-95 transition-transform" 
                  onPointerDown={() => handleMove(0, -1)}
                >
                  <ArrowUp size={28} />
                </Button>
                <div />
                <Button 
                  variant="outline" 
                  className="h-16 w-16 bg-blue-600 hover:bg-blue-500 border-2 border-blue-400 text-white shadow-md active:scale-95 transition-transform" 
                  onPointerDown={() => handleMove(-1, 0)}
                >
                  <ArrowLeft size={28} />
                </Button>
                <Button 
                  variant="outline" 
                  className="h-16 w-16 bg-blue-600 hover:bg-blue-500 border-2 border-blue-400 text-white shadow-md active:scale-95 transition-transform" 
                  onPointerDown={() => handleMove(0, 1)}
                >
                  <ArrowDown size={28} />
                </Button>
                <Button 
                  variant="outline" 
                  className="h-16 w-16 bg-blue-600 hover:bg-blue-500 border-2 border-blue-400 text-white shadow-md active:scale-95 transition-transform" 
                  onPointerDown={() => handleMove(1, 0)}
                >
                  <ArrowRight size={28} />
                </Button>
            </div>
        )}
    </div>
  );
}    
