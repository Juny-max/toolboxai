"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { 
  Wand2, Upload, Download, RotateCcw, RotateCw, 
  FlipHorizontal, FlipVertical, Paintbrush, Type,
  Trash2, Undo2, Redo2, Image as ImageIcon,
  MessageSquare, Sparkles, Volume2, VolumeX
} from "lucide-react";
import {
  canEdit,
  canGenerate,
  incrementEdits,
  incrementGenerations,
  incrementCaptions,
  getWarningMessage,
  LIMITS,
  type UsageData,
  getUsageData
} from "@/lib/photo-editor-usage";

export default function PhotoEditor() {
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [currentImage, setCurrentImage] = useState<HTMLImageElement | null>(null);
  const [activeTab, setActiveTab] = useState<'adjust' | 'tools' | 'magic'>('adjust');
  const [currentTool, setCurrentTool] = useState<'none' | 'brush' | 'magic-eraser' | 'text'>('none');
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("Processing...");
  
  // Filters
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [hue, setHue] = useState(0);
  const [blur, setBlur] = useState(0);
  
  // Transform
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(1);
  const [flipV, setFlipV] = useState(1);
  
  // Drawing
  const [drawColor, setDrawColor] = useState('#ffffff');
  const [drawSize, setDrawSize] = useState(20);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawActions, setDrawActions] = useState<any[]>([]);
  const [currentStroke, setCurrentStroke] = useState<any>(null);
  
  // History
  const [historyStack, setHistoryStack] = useState<any[]>([]);
  const [historyStep, setHistoryStep] = useState(-1);
  
  // AI Prompts
  const [magicPrompt, setMagicPrompt] = useState("");
  const [genPrompt, setGenPrompt] = useState("");
  const [textContent, setTextContent] = useState("");
  const [captionResult, setCaptionResult] = useState("");
  const [apiConfigured, setApiConfigured] = useState(true); // Assume configured, check on use
  
  // Usage tracking
  const [usageData, setUsageData] = useState<UsageData | null>(null);

  // Load usage data on mount
  useEffect(() => {
    getUsageData().then(setUsageData);
  }, []);

  // Render canvas
  const renderCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !currentImage) return;

    const isRotatedSideways = rotation % 180 !== 0;
    canvas.width = isRotatedSideways ? currentImage.height : currentImage.width;
    canvas.height = isRotatedSideways ? currentImage.width : currentImage.height;
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);
    ctx.save();

    // Apply filters
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) hue-rotate(${hue}deg) blur(${blur}px)`;

    // Apply transforms
    ctx.translate(w / 2, h / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(flipH, flipV);

    // Draw image
    ctx.drawImage(currentImage, -currentImage.width / 2, -currentImage.height / 2);

    // Draw actions
    ctx.filter = 'none';
    const offsetX = -currentImage.width / 2;
    const offsetY = -currentImage.height / 2;

    drawActions.forEach(action => {
      if (action.type === 'stroke' || action.type === 'mask') {
        ctx.beginPath();
        
        if (action.type === 'mask') {
          ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
          ctx.shadowColor = 'red';
          ctx.shadowBlur = 5;
        } else {
          ctx.strokeStyle = action.color;
          ctx.shadowBlur = 0;
        }

        ctx.lineWidth = action.size;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        action.points.forEach((p: any, i: number) => {
          if (i === 0) ctx.moveTo(offsetX + p.x, offsetY + p.y);
          else ctx.lineTo(offsetX + p.x, offsetY + p.y);
        });
        ctx.stroke();
      } else if (action.type === 'text') {
        ctx.font = `bold ${action.size * 3}px sans-serif`;
        ctx.fillStyle = action.color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(action.text, offsetX + action.x, offsetY + action.y);
      }
    });

    ctx.restore();
  };

  useEffect(() => {
    renderCanvas();
  }, [currentImage, brightness, contrast, saturation, hue, blur, rotation, flipH, flipV, drawActions]);

  const loadImage = (file: File) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = url;
    img.onload = () => {
      setCurrentImage(img);
      resetSettings();
      setDrawActions([]);
    };
  };

  const resetSettings = () => {
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setHue(0);
    setBlur(0);
    setRotation(0);
    setFlipH(1);
    setFlipV(1);
    setDrawActions([]);
    toast({
      title: "Reset Complete",
      description: "All filters and edits have been reset",
    });
  };

  const saveImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = "gemini-edit.png";
    link.href = canvas.toDataURL();
    link.click();
  };

  const handleToolSelect = (tool: typeof currentTool) => {
    setCurrentTool(tool);
    if (tool === 'magic-eraser') {
      setDrawSize(40);
    } else if (tool === 'brush') {
      setDrawSize(20);
    }
  };

  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement> | React.Touch) => {
    const canvas = canvasRef.current;
    if (!canvas || !currentImage) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let x = (e.clientX - rect.left) * scaleX;
    let y = (e.clientY - rect.top) * scaleY;

    x -= canvas.width / 2;
    y -= canvas.height / 2;

    const rad = (-rotation * Math.PI) / 180;
    const rotX = x * Math.cos(rad) - y * Math.sin(rad);
    const rotY = x * Math.sin(rad) + y * Math.cos(rad);
    x = rotX;
    y = rotY;

    x /= flipH;
    y /= flipV;

    return {
      x: x + currentImage.width / 2,
      y: y + currentImage.height / 2,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!currentImage || currentTool === 'none') return;

    const pos = getMousePos(e);

    if (currentTool === 'text') {
      if (textContent) {
        setDrawActions([...drawActions, { 
          type: 'text', 
          text: textContent, 
          x: pos.x, 
          y: pos.y, 
          color: drawColor, 
          size: drawSize 
        }]);
      }
      return;
    }

    setIsDrawing(true);
    const type = currentTool === 'magic-eraser' ? 'mask' : 'stroke';
    const newStroke = {
      type,
      tool: currentTool,
      color: drawColor,
      size: drawSize,
      points: [pos],
    };
    setCurrentStroke(newStroke);
    setDrawActions([...drawActions, newStroke]);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentTool || currentTool === 'text' || !currentStroke) return;
    const pos = getMousePos(e);
    currentStroke.points.push(pos);
    setDrawActions([...drawActions.slice(0, -1), { ...currentStroke }]);
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    setCurrentStroke(null);
  };

  // Touch event handlers for mobile
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!currentImage || currentTool === 'none') return;
    e.preventDefault();
    
    const touch = e.touches[0];
    const pos = getMousePos(touch);

    if (currentTool === 'text') {
      if (textContent) {
        setDrawActions([...drawActions, { 
          type: 'text', 
          text: textContent, 
          x: pos.x, 
          y: pos.y, 
          color: drawColor, 
          size: drawSize 
        }]);
      }
      return;
    }

    setIsDrawing(true);
    const type = currentTool === 'magic-eraser' ? 'mask' : 'stroke';
    const newStroke = {
      type,
      tool: currentTool,
      color: drawColor,
      size: drawSize,
      points: [pos],
    };
    setCurrentStroke(newStroke);
    setDrawActions([...drawActions, newStroke]);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentTool || currentTool === 'text' || !currentStroke) return;
    e.preventDefault();
    
    const touch = e.touches[0];
    const pos = getMousePos(touch);
    currentStroke.points.push(pos);
    setDrawActions([...drawActions.slice(0, -1), { ...currentStroke }]);
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setIsDrawing(false);
    setCurrentStroke(null);
  };

  const hasMask = drawActions.some(a => a.type === 'mask');

  // API Calls
  const callVisionAPI = async (prompt: string, base64Image: string) => {
    const response = await fetch('/api/photo-editor/vision', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, base64Image }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'API request failed');
    }
    
    const data = await response.json();
    return data.text;
  };

  const callEditAPI = async (prompt: string, base64Image: string) => {
    const response = await fetch('/api/photo-editor/edit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, base64Image }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'API request failed');
    }
    
    const data = await response.json();
    return data.text || data.image; // Support both text and image responses
  };

  const callGenerateAPI = async (prompt: string) => {
    const response = await fetch('/api/photo-editor/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'API request failed');
    }
    
    const data = await response.json();
    return data.image;
  };

  // AI Handlers
  const handleMagicEraser = async () => {
    if (!currentImage) return;
    
    // Check usage limit
    const check = await canEdit();
    if (!check.allowed) {
      toast({
        title: "Daily Limit Reached",
        description: check.message,
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);
    setLoadingText("🪄 Removing object...");
    
    try {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const base64 = canvas.toDataURL("image/png").split(',')[1];
      const prompt = "The area highlighted in transparent red is a mask. Remove the object inside the red mask and fill it in to match the surrounding background naturally. The final image must NOT have any red marks.";
      
      const newImg64 = await callEditAPI(prompt, base64);
      
      const img = new Image();
      img.src = `data:image/png;base64,${newImg64}`;
      img.onload = async () => {
        setCurrentImage(img);
        setDrawActions(drawActions.filter(a => a.type !== 'mask'));
        setCurrentTool('none');
        
        // Increment usage
        const newCount = await incrementEdits();
        setUsageData(await getUsageData());
        
        // Check for warnings
        const warning = getWarningMessage(newCount, LIMITS.DAILY_EDIT_LIMIT);
        
        toast({
          title: "Success!",
          description: warning || "Object removed successfully",
        });
      };
    } catch (error: any) {
      toast({
        title: "Magic Eraser Failed",
        description: error.message,
        variant: "destructive",
      });
      setApiConfigured(false);
    } finally {
      setLoading(false);
    }
  };

  const applyMagicPreset = async (prompt: string) => {
    if (!currentImage) {
      toast({
        title: "No Image",
        description: "Please load an image first.",
        variant: "destructive",
      });
      return;
    }
    
    // Check usage limit
    const check = await canEdit();
    if (!check.allowed) {
      toast({
        title: "Daily Limit Reached",
        description: check.message,
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);
    setLoadingText("✨ Casting spell...");
    
    try {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const base64 = canvas.toDataURL("image/png").split(',')[1];
      const newImg64 = await callEditAPI(prompt, base64);
      
      const img = new Image();
      img.src = `data:image/png;base64,${newImg64}`;
      img.onload = async () => {
        setCurrentImage(img);
        setDrawActions([]);
        resetSettings();
        
        // Increment usage
        const newCount = await incrementEdits();
        setUsageData(await getUsageData());
        
        // Check for warnings
        const warning = getWarningMessage(newCount, LIMITS.DAILY_EDIT_LIMIT);
        
        toast({
          title: "Magic Applied!",
          description: warning || "Image transformed successfully",
        });
      };
    } catch (error: any) {
      toast({
        title: "Magic Failed",
        description: error.message,
        variant: "destructive",
      });
      setApiConfigured(false);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!genPrompt) return;
    
    // Check usage limit
    const check = await canGenerate();
    if (!check.allowed) {
      toast({
        title: "Daily Limit Reached",
        description: check.message,
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);
    setLoadingText("✨ Generating image...");
    
    try {
      const base64 = await callGenerateAPI(genPrompt);
      const img = new Image();
      img.src = `data:image/png;base64,${base64}`;
      img.onload = async () => {
        setCurrentImage(img);
        resetSettings();
        setDrawActions([]);
        
        // Increment usage
        const newCount = await incrementGenerations();
        setUsageData(await getUsageData());
        
        // Check for warnings
        const warning = getWarningMessage(newCount, LIMITS.DAILY_GENERATION_LIMIT);
        
        toast({
          title: "Success!",
          description: warning || "Image generated successfully.",
        });
      };
    } catch (error: any) {
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive",
      });
      setApiConfigured(false);
    } finally {
      setLoading(false);
    }
  };

  const handleCaption = async () => {
    if (!currentImage) return;
    
    setLoading(true);
    setLoadingText("📝 Analyzing...");
    setCaptionResult("");
    
    try {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const base64 = canvas.toDataURL("image/png").split(',')[1];
      const text = await callVisionAPI("Generate 3 short, witty captions + hashtags.", base64);
      setCaptionResult(text);
      
      // Increment caption count (no limit, just tracking)
      await incrementCaptions();
      setUsageData(await getUsageData());
      
      toast({
        title: "Captions Generated!",
        description: "Check below for AI-generated captions.",
      });
    } catch (error: any) {
      toast({
        title: "Caption Failed",
        description: error.message,
        variant: "destructive",
      });
      setApiConfigured(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-120px)] flex flex-col md:flex-row gap-4">
      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-white font-medium animate-pulse">{loadingText}</p>
        </div>
      )}

      {/* Sidebar */}
      <aside className="w-full md:w-80 bg-slate-900 rounded-lg border border-slate-800 flex flex-col overflow-hidden max-h-[50vh] md:max-h-none">
        {/* Tabs */}
        <div className="flex border-b border-slate-800">
          <button
            onClick={() => setActiveTab('adjust')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'adjust'
                ? 'text-blue-400 border-b-2 border-blue-500 bg-slate-800/50'
                : 'text-slate-400 hover:bg-slate-800/30'
            }`}
          >
            Adjust
          </button>
          <button
            onClick={() => setActiveTab('tools')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'tools'
                ? 'text-orange-400 border-b-2 border-orange-500 bg-slate-800/50'
                : 'text-slate-400 hover:bg-slate-800/30'
            }`}
          >
            Tools
          </button>
          <button
            onClick={() => setActiveTab('magic')}
            className={`flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'magic'
                ? 'text-purple-400 border-b-2 border-purple-500 bg-slate-800/50'
                : 'text-slate-400 hover:bg-slate-800/30'
            }`}
          >
            <Sparkles size={16} /> Magic
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Adjust Panel */}
          {activeTab === 'adjust' && (
            <>
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Filters</h3>
                
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs text-slate-400 mb-2">
                      <span>Brightness</span>
                      <span>{brightness}%</span>
                    </div>
                    <Slider value={[brightness]} onValueChange={(v) => setBrightness(v[0])} min={0} max={200} step={1} />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-slate-400 mb-2">
                      <span>Contrast</span>
                      <span>{contrast}%</span>
                    </div>
                    <Slider value={[contrast]} onValueChange={(v) => setContrast(v[0])} min={0} max={200} step={1} />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-slate-400 mb-2">
                      <span>Saturation</span>
                      <span>{saturation}%</span>
                    </div>
                    <Slider value={[saturation]} onValueChange={(v) => setSaturation(v[0])} min={0} max={200} step={1} />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-slate-400 mb-2">
                      <span>Blur</span>
                      <span>{blur}px</span>
                    </div>
                    <Slider value={[blur]} onValueChange={(v) => setBlur(v[0])} min={0} max={10} step={0.1} />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-slate-400 mb-2">
                      <span>Hue</span>
                      <span>{hue}deg</span>
                    </div>
                    <Slider value={[hue]} onValueChange={(v) => setHue(v[0])} min={0} max={360} step={1} />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Transform</h3>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setRotation(r => r - 90)} className="flex flex-col gap-1 h-auto py-3">
                    <RotateCcw size={16} />
                    <span className="text-[10px]">Rot -90°</span>
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => setRotation(r => r + 90)} className="flex flex-col gap-1 h-auto py-3">
                    <RotateCw size={16} />
                    <span className="text-[10px]">Rot +90°</span>
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => setFlipH(f => f * -1)} className="flex flex-col gap-1 h-auto py-3">
                    <FlipHorizontal size={16} />
                    <span className="text-[10px]">Flip H</span>
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => setFlipV(f => f * -1)} className="flex flex-col gap-1 h-auto py-3">
                    <FlipVertical size={16} />
                    <span className="text-[10px]">Flip V</span>
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* Tools Panel */}
          {activeTab === 'tools' && (
            <>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant={currentTool === 'brush' ? 'default' : 'secondary'}
                  onClick={() => handleToolSelect('brush')}
                  className="flex flex-col gap-1 h-auto py-3"
                >
                  <Paintbrush size={16} />
                  <span className="text-[10px]">Brush</span>
                </Button>
                <Button
                  variant={currentTool === 'magic-eraser' ? 'default' : 'secondary'}
                  onClick={() => handleToolSelect('magic-eraser')}
                  className="flex flex-col gap-1 h-auto py-3"
                >
                  <Wand2 size={16} />
                  <span className="text-[10px]">Magic Eraser</span>
                </Button>
                <Button
                  variant={currentTool === 'text' ? 'default' : 'secondary'}
                  onClick={() => handleToolSelect('text')}
                  className="flex flex-col gap-1 h-auto py-3"
                >
                  <Type size={16} />
                  <span className="text-[10px]">Text</span>
                </Button>
              </div>

              {hasMask && currentTool === 'magic-eraser' && (
                <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg space-y-3">
                  <p className="text-xs text-red-100">Paint over the object you want to remove. It will be marked in <span className="text-red-400 font-bold">RED</span>.</p>
                  <Button className="w-full bg-red-600 hover:bg-red-500" onClick={handleMagicEraser}>
                    <Sparkles size={16} className="mr-2" /> Remove Object
                  </Button>
                </div>
              )}

              <div className="space-y-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                {currentTool !== 'magic-eraser' && (
                  <div>
                    <label className="text-xs text-slate-400 mb-2 block">Color</label>
                    <div className="flex gap-2 flex-wrap">
                      {['#ffffff', '#000000', '#ef4444', '#3b82f6', '#22c55e', '#eab308'].map(color => (
                        <button
                          key={color}
                          onClick={() => setDrawColor(color)}
                          className={`w-6 h-6 rounded-full border-2 ${drawColor === color ? 'border-blue-500' : 'border-slate-600'}`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                      <input
                        type="color"
                        value={drawColor}
                        onChange={(e) => setDrawColor(e.target.value)}
                        className="w-6 h-6 rounded cursor-pointer"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <div className="flex justify-between text-xs text-slate-400 mb-2">
                    <span>Size</span>
                    <span>{drawSize}px</span>
                  </div>
                  <Slider value={[drawSize]} onValueChange={(v) => setDrawSize(v[0])} min={1} max={100} step={1} />
                </div>

                {currentTool === 'text' && (
                  <div>
                    <label className="text-xs text-slate-400 mb-2 block">Text Content</label>
                    <Input
                      value={textContent}
                      onChange={(e) => setTextContent(e.target.value)}
                      placeholder="Type here & click canvas..."
                      className="bg-slate-900 border-slate-700"
                    />
                  </div>
                )}
              </div>
            </>
          )}

          {/* Magic Panel */}
          {activeTab === 'magic' && (
            <>
              {/* Usage Indicator */}
              {usageData && (
                <div className="mb-4 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Today's Usage</h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-300">Edits</span>
                      <span className={`font-semibold ${usageData.edits >= LIMITS.DAILY_EDIT_LIMIT ? 'text-red-400' : usageData.edits >= LIMITS.DAILY_EDIT_LIMIT - 5 ? 'text-yellow-400' : 'text-emerald-400'}`}>
                        {usageData.edits} / {LIMITS.DAILY_EDIT_LIMIT}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-300">Generations</span>
                      <span className={`font-semibold ${usageData.generations >= LIMITS.DAILY_GENERATION_LIMIT ? 'text-red-400' : usageData.generations >= LIMITS.DAILY_GENERATION_LIMIT - 3 ? 'text-yellow-400' : 'text-emerald-400'}`}>
                        {usageData.generations} / {LIMITS.DAILY_GENERATION_LIMIT}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-300">Captions</span>
                      <span className="font-semibold text-blue-400">{usageData.captions} (unlimited)</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-2">Resets daily at midnight</p>
                </div>
              )}
              
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">AI Quick Actions</h3>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" className="h-auto py-3 flex flex-col items-start" disabled={!currentImage} onClick={() => applyMagicPreset('Remove the background and make it transparent')}>
                    <ImageIcon size={16} className="mb-1" />
                    <span className="text-xs">Remove BG</span>
                  </Button>
                  <Button variant="outline" className="h-auto py-3 flex flex-col items-start" disabled={!currentImage} onClick={() => applyMagicPreset('Blur the background to simulate depth of field')}>
                    <span className="text-lg mb-1">💧</span>
                    <span className="text-xs">Blur BG</span>
                  </Button>
                  <Button variant="outline" className="h-auto py-3 flex flex-col items-start" disabled={!currentImage} onClick={() => applyMagicPreset('Colorize this black and white photo naturally')}>
                    <span className="text-lg mb-1">🎨</span>
                    <span className="text-xs">Colorize</span>
                  </Button>
                  <Button variant="outline" className="h-auto py-3 flex flex-col items-start" disabled={!currentImage} onClick={() => applyMagicPreset('Sharpen this image and enhance details')}>
                    <span className="text-lg mb-1">⚡</span>
                    <span className="text-xs">Sharpen</span>
                  </Button>
                </div>
              </div>

              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-4 space-y-3">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-purple-300">
                    <Wand2 size={16} /> Custom Magic
                  </h3>
                  <Textarea
                    value={magicPrompt}
                    onChange={(e) => setMagicPrompt(e.target.value)}
                    rows={2}
                    placeholder="e.g. 'Make it look like a pencil sketch'"
                    className="bg-slate-950 border-slate-700"
                  />
                  <Button className="w-full bg-purple-600 hover:bg-purple-500" disabled={!currentImage || !magicPrompt} onClick={() => applyMagicPreset(magicPrompt)}>
                    Apply Magic Edit
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-4 space-y-3">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-blue-300">
                    <Sparkles size={16} /> Generate New
                  </h3>
                  <Textarea
                    value={genPrompt}
                    onChange={(e) => setGenPrompt(e.target.value)}
                    rows={2}
                    placeholder="e.g. 'A futuristic city'"
                    className="bg-slate-950 border-slate-700"
                  />
                  <Button className="w-full bg-blue-600 hover:bg-blue-500" disabled={!genPrompt} onClick={handleGenerate}>
                    Generate Image
                  </Button>
                </CardContent>
              </Card>

              <Button variant="outline" className="w-full" disabled={!currentImage} onClick={handleCaption}>
                <MessageSquare size={16} className="mr-2" /> Caption Assistant
              </Button>
              
              {captionResult && (
                <Card className="bg-slate-950 border-slate-700">
                  <CardContent className="p-3 text-xs text-slate-300 whitespace-pre-wrap">
                    {captionResult}
                  </CardContent>
                </Card>
              )}

              {!apiConfigured && (
                <div className="p-3 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
                  <p className="text-xs text-yellow-200">
                    ⚠️ AI features require <code className="bg-black/30 px-1 py-0.5 rounded">GOOGLE_GENERATIVE_AI_API_KEY</code> in <code className="bg-black/30 px-1 py-0.5 rounded">.env.local</code>
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </aside>

      {/* Canvas Area */}
      <div className="flex-1 bg-slate-950 rounded-lg border border-slate-800 relative flex items-center justify-center overflow-hidden min-h-[60vh] md:min-h-0"
        style={{
          backgroundImage: `
            linear-gradient(45deg, #1e293b 25%, transparent 25%),
            linear-gradient(-45deg, #1e293b 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, #1e293b 75%),
            linear-gradient(-45deg, transparent 75%, #1e293b 75%)
          `,
          backgroundSize: '20px 20px',
          backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
        }}
      >
        {/* Header Controls */}
        <div className="absolute top-2 left-2 right-2 md:top-4 md:left-4 md:right-4 flex flex-col sm:flex-row gap-2 justify-between items-stretch sm:items-center z-10">
          <div className="flex gap-1 sm:gap-2">
            <Button size="sm" variant="secondary" disabled title="Undo" className="hidden sm:flex">
              <Undo2 size={16} />
            </Button>
            <Button size="sm" variant="secondary" disabled title="Redo" className="hidden sm:flex">
              <Redo2 size={16} />
            </Button>
          </div>

          <div className="flex gap-1 sm:gap-2 flex-wrap">
            <Button size="sm" variant="secondary" onClick={resetSettings} disabled={!currentImage}>
              <RotateCcw size={14} className="sm:mr-2" /> <span className="hidden sm:inline">Reset</span>
            </Button>
            <Button size="sm" variant="destructive" onClick={() => {
              setCurrentImage(null);
              resetSettings();
              toast({ title: "Image Cleared", description: "Canvas cleared successfully" });
            }} disabled={!currentImage}>
              <Trash2 size={14} className="sm:mr-2" /> <span className="hidden sm:inline">Clear</span>
            </Button>
            <Button size="sm" variant="secondary" onClick={() => fileInputRef.current?.click()}>
              <Upload size={14} className="sm:mr-2" /> <span className="hidden sm:inline">Open</span>
            </Button>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500" onClick={saveImage} disabled={!currentImage}>
              <Download size={14} className="sm:mr-2" /> <span className="hidden sm:inline">Save</span>
            </Button>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && loadImage(e.target.files[0])}
        />

        {!currentImage ? (
          <div className="text-center">
            <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
              <ImageIcon size={32} className="text-slate-500" />
            </div>
            <h2 className="text-xl font-medium text-slate-300 mb-2">Start Editing</h2>
            <div className="flex justify-center gap-3 mt-4">
              <Button onClick={() => fileInputRef.current?.click()}>
                Upload
              </Button>
              <Button className="bg-purple-600 hover:bg-purple-500" onClick={() => setActiveTab('magic')}>
                AI Generate
              </Button>
            </div>
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            className={`w-full h-full max-w-full max-h-full object-contain shadow-2xl ${
              currentTool === 'brush' ? 'cursor-crosshair' :
              currentTool === 'magic-eraser' ? 'cursor-cell' :
              currentTool === 'text' ? 'cursor-text' : ''
            }`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          />
        )}
      </div>
    </div>
  );
}
