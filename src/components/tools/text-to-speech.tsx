"use client";

import { useState, useEffect, useRef } from "react";
import { textToSpeech } from "@/ai/flows/text-to-speech";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Play, Pause, Loader2, Mic, RotateCcw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";

const SpeechRecognition =
  typeof window !== 'undefined'
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : null;

export function TextToSpeech() {
  const [text, setText] = useState("Hello, welcome to Junybase. Your all-in-one utility toolkit.");
  const [isClient, setIsClient] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'>('nova');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);
  
  useEffect(() => {
    setIsClient(true);

    if (!SpeechRecognition) {
      console.log("Speech recognition not supported");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      let interim_transcript = '';
      let final_transcript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          final_transcript += event.results[i][0].transcript;
        } else {
          interim_transcript += event.results[i][0].transcript;
        }
      }
      setText(prev => prev + final_transcript + interim_transcript);
    };

    recognition.onerror = (event: any) => {
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
          console.error('Speech recognition error', event.error);
          setError(`Speech recognition error: ${event.error}`);
      }
      setIsRecording(false);
    }
    
    recognition.onend = () => {
      setIsRecording(false);
    }

    recognitionRef.current = recognition;

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
  
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
        setIsPlaying(false);
        setAudioSrc(null);
    }
  
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
  
    return () => {
      if (audio) {
        audio.removeEventListener('play', handlePlay);
        audio.removeEventListener('pause', handlePause);
        audio.removeEventListener('ended', handleEnded);
      }
    };
  }, [audioSrc]);

  const handleGenerateAudio = async () => {
    if (!text) return;
    setLoading(true);
    setError(null);
    setAudioSrc(null);
    setIsPlaying(false);
    if(audioRef.current) audioRef.current.pause();
    
    try {
      const response = await textToSpeech({ text, voice: selectedVoice });
      
      if (!response || !response.audioDataUri) {
        throw new Error("The AI failed to generate audio. Please try again.");
      }
      
      setAudioSrc(response.audioDataUri);
      const audio = new Audio(response.audioDataUri);
      audioRef.current = audio;
      audio.play();

    } catch (err: any) {
      setError(err.message || "Failed to generate audio.");
    } finally {
      setLoading(false);
    }
  };
  
  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
    }
  };

  const handleReset = () => {
    if (audioRef.current) {
        audioRef.current.pause();
    }
    setAudioSrc(null);
    setIsPlaying(false);
    audioRef.current = null;
  }

  const toggleRecording = () => {
    if (!recognitionRef.current) {
        setError("Speech recognition is not supported on this browser.");
        return;
    };
    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      setText("");
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (e) {
          console.error("Could not start recognition", e);
          setError("Could not start microphone. Please check permissions.");
          setIsRecording(false);
      }
    }
  };

  const voices = [
    { value: 'alloy', label: 'Alloy' },
    { value: 'echo', label: 'Echo' },
    { value: 'fable', label: 'Fable' },
    { value: 'onyx', label: 'Onyx' },
    { value: 'nova', label: 'Nova' },
    { value: 'shimmer', label: 'Shimmer' },
  ];

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <Textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            handleReset();
          }}
          placeholder="Type or speak your text here..."
          className="min-h-[200px]"
        />
        <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="flex-1 w-full sm:w-auto">
                <Label htmlFor="voice-select">Voice</Label>
                <Select value={selectedVoice} onValueChange={(value) => {
                    setSelectedVoice(value as any);
                    handleReset();
                }}>
                    <SelectTrigger id="voice-select"><SelectValue /></SelectTrigger>
                    <SelectContent>
                    {voices.map(voice => (
                        <SelectItem key={voice.value} value={voice.value}>
                        {voice.label}
                        </SelectItem>
                    ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="flex items-center gap-2 pt-6">
                <Button onClick={audioSrc ? handlePlayPause : handleGenerateAudio} disabled={!text || loading} className="w-28">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 
                     audioSrc ? (isPlaying ? <><Pause className="mr-2 h-4 w-4"/> Pause</> : <><Play className="mr-2 h-4 w-4" /> Play</>) 
                     : <><Play className="mr-2 h-4 w-4" /> Generate</>}
                </Button>
                {isClient && SpeechRecognition &&
                    <Button onClick={toggleRecording} variant={isRecording ? "destructive" : "outline"} className="w-36">
                        <Mic className="mr-2 h-4 w-4"/> {isRecording ? 'Stop' : 'Speak'}
                    </Button>
                }
                {audioSrc && 
                    <Button onClick={handleReset} variant="outline" size="icon" aria-label="Reset audio">
                        <RotateCcw className="h-4 w-4" />
                    </Button>
                }
            </div>
        </div>
        {error && (
            <Alert variant="destructive" className="mt-4">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        )}
      </CardContent>
    </Card>
  );
}
