"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import confetti from "canvas-confetti";
import {
  Plus,
  X,
  Trash2,
  Download,
  Upload,
  Wand2,
  Search,
  HelpCircle,
  Calendar,
  Clock,
  AlertCircle,
  ListChecks,
  MoreVertical,
  Edit2,
} from "lucide-react";

interface Subtask {
  text: string;
  done: boolean;
}

interface Task {
  id: string;
  title: string;
  desc: string;
  tag: "dev" | "design" | "marketing" | "urgent";
  dueDate?: string;
  created: number;
  subtasks?: Subtask[];
}

interface Column {
  id: string;
  title: string;
  color: string;
  tasks: Task[];
}

interface BoardData {
  columns: Column[];
}

const defaultData: BoardData = {
  columns: [
    { id: "col-todo", title: "To Do", color: "#3b82f6", tasks: [] },
    { id: "col-progress", title: "In Progress", color: "#eab308", tasks: [] },
    { id: "col-done", title: "Done", color: "#22c55e", tasks: [] },
  ],
};

const tagConfig: Record<
  Task["tag"],
  { label: string; icon: string; bgDark: string; textDark: string; borderDark: string; bgLight: string; textLight: string; borderLight: string }
> = {
  dev: { label: "Dev", icon: "💻", bgDark: "rgba(56, 189, 248, 0.14)", textDark: "#7dd3fc", borderDark: "rgba(56, 189, 248, 0.5)", bgLight: "rgba(14, 165, 233, 0.15)", textLight: "#0369a1", borderLight: "rgba(14, 165, 233, 0.4)" },
  design: { label: "Design", icon: "🎨", bgDark: "rgba(244, 114, 182, 0.14)", textDark: "#f9a8d4", borderDark: "rgba(244, 114, 182, 0.5)", bgLight: "rgba(236, 72, 153, 0.15)", textLight: "#be185d", borderLight: "rgba(236, 72, 153, 0.4)" },
  marketing: { label: "Marketing", icon: "📢", bgDark: "rgba(251, 146, 60, 0.14)", textDark: "#fdba74", borderDark: "rgba(251, 146, 60, 0.5)", bgLight: "rgba(249, 115, 22, 0.15)", textLight: "#c2410c", borderLight: "rgba(249, 115, 22, 0.4)" },
  urgent: { label: "Urgent", icon: "🔥", bgDark: "rgba(248, 113, 113, 0.18)", textDark: "#fca5a5", borderDark: "rgba(248, 113, 113, 0.6)", bgLight: "rgba(239, 68, 68, 0.15)", textLight: "#b91c1c", borderLight: "rgba(239, 68, 68, 0.4)" },
};

export default function FlowBoard() {
  const [mounted, setMounted] = useState(false);
  const [boardData, setBoardData] = useState<BoardData>(defaultData);
  const [searchTerm, setSearchTerm] = useState("");
  const [draggedTask, setDraggedTask] = useState<string | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showColumnModal, setShowColumnModal] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [currentColumnId, setCurrentColumnId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [taskForm, setTaskForm] = useState({
    title: "",
    desc: "",
    tag: "dev" as Task["tag"],
    dueDate: "",
  });
  const [currentSubtasks, setCurrentSubtasks] = useState<Subtask[]>([]);
  const [newSubtaskText, setNewSubtaskText] = useState("");
  const [columnName, setColumnName] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [generatedTasks, setGeneratedTasks] = useState<any[]>([]);
  const [expandedSubtasks, setExpandedSubtasks] = useState<Set<string>>(new Set());
  const [tourOpen, setTourOpen] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("flowboardData");
    if (saved) {
      setBoardData(JSON.parse(saved));
    }
    const seenTour = localStorage.getItem("flowboardTourSeen");
    if (!seenTour) {
      setTourOpen(true);
    }
  }, []);

  const tourSteps = [
    { id: "fb-search", title: "🔍 Search Tasks", desc: "Type any keyword to instantly filter all tasks across every column. Great for quickly finding specific items in large boards." },
    { id: "fb-export", title: "💾 Backup Data", desc: "Click to download your entire board as a JSON file. Use this to save your work or share it with others." },
    { id: "fb-import", title: "📥 Import Data", desc: "Upload a previously saved JSON backup to restore your board. Perfect for syncing between devices." },
    { id: "fb-ai", title: "🤖 AI Planner", desc: "Describe your project goal in plain language (e.g., 'Build a portfolio website') and AI will automatically create a structured task list with subtasks." },
    { id: "fb-add-col", title: "➕ Add Column", desc: "Create custom workflow stages like 'Backlog', 'Review', or 'Testing'. Organize tasks your way." },
    { id: "fb-add-task", title: "📝 Add Task", desc: "Create a new task in this column. Add a title, description, due date, tag, and subtasks to break down complex work." },
  ];

  const closeTour = () => {
    setTourOpen(false);
    localStorage.setItem("flowboardTourSeen", "true");
    document.querySelectorAll(".fb-tour-target").forEach((el) => el.classList.remove("fb-tour-target"));
  };

  const gotoStep = (next: number) => {
    const clamped = Math.max(0, Math.min(tourSteps.length - 1, next));
    setTourStep(clamped);
    const targetId = tourSteps[clamped].id;
    document.querySelectorAll(".fb-tour-target").forEach((el) => el.classList.remove("fb-tour-target"));
    const el = document.getElementById(targetId);
    if (el) {
      el.classList.add("fb-tour-target");
      el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
    }
  };

  useEffect(() => {
    if (tourOpen) gotoStep(tourStep);
  }, [tourOpen]);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-120px)]">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  const saveData = (data: BoardData) => {
    localStorage.setItem("flowboardData", JSON.stringify(data));
    setBoardData(data);
  };

  const handleDragStart = (taskId: string) => {
    setDraggedTask(taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetColumnId: string) => {
    if (!draggedTask) return;

    const newColumns = boardData.columns.map((col) => ({
      ...col,
      tasks: col.tasks.filter((t) => t.id !== draggedTask),
    }));

    let movedTask: Task | null = null;
    for (const col of boardData.columns) {
      const task = col.tasks.find((t) => t.id === draggedTask);
      if (task) {
        movedTask = task;
        break;
      }
    }

    if (movedTask) {
      const targetCol = newColumns.find((c) => c.id === targetColumnId);
      if (targetCol) {
        targetCol.tasks.push(movedTask);
      }
    }

    saveData({ columns: newColumns });
    setDraggedTask(null);

    if (targetColumnId === "col-done") {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
  };

  const openTaskModal = (columnId: string, taskId?: string) => {
    setCurrentColumnId(columnId);
    setEditingTaskId(taskId || null);

    if (taskId) {
      let task: Task | null = null;
      for (const col of boardData.columns) {
        const found = col.tasks.find((t) => t.id === taskId);
        if (found) {
          task = found;
          break;
        }
      }
      if (task) {
        setTaskForm({
          title: task.title,
          desc: task.desc,
          tag: task.tag,
          dueDate: task.dueDate || "",
        });
        setCurrentSubtasks(task.subtasks || []);
      }
    } else {
      setTaskForm({ title: "", desc: "", tag: "dev", dueDate: "" });
      setCurrentSubtasks([]);
    }

    setShowTaskModal(true);
  };

  const saveTask = () => {
    if (!taskForm.title.trim()) return;

    const newColumns = [...boardData.columns];

    if (editingTaskId) {
      for (const col of newColumns) {
        const task = col.tasks.find((t) => t.id === editingTaskId);
        if (task) {
          task.title = taskForm.title;
          task.desc = taskForm.desc;
          task.tag = taskForm.tag;
          task.dueDate = taskForm.dueDate;
          task.subtasks = currentSubtasks;
          break;
        }
      }
    } else {
      const newTask: Task = {
        id: "task-" + Date.now(),
        title: taskForm.title,
        desc: taskForm.desc,
        tag: taskForm.tag,
        dueDate: taskForm.dueDate,
        created: Date.now(),
        subtasks: currentSubtasks,
      };
      const col = newColumns.find((c) => c.id === currentColumnId);
      if (col) col.tasks.push(newTask);
    }

    saveData({ columns: newColumns });
    setShowTaskModal(false);
    toast({ title: editingTaskId ? "Task updated" : "Task created" });
  };

  const deleteTask = (taskId: string) => {
    const newColumns = boardData.columns.map((col) => ({
      ...col,
      tasks: col.tasks.filter((t) => t.id !== taskId),
    }));
    saveData({ columns: newColumns });
    toast({ title: "Task deleted" });
  };

  const deleteColumn = (columnId: string) => {
    const newColumns = boardData.columns.filter((c) => c.id !== columnId);
    saveData({ columns: newColumns });
    toast({ title: "Column deleted" });
  };

  const addColumn = () => {
    if (!columnName.trim()) return;
    const colors = ["#f472b6", "#22d3ee", "#a78bfa", "#fb7185", "#34d399"];
    const newCol: Column = {
      id: "col-" + Date.now(),
      title: columnName,
      color: colors[Math.floor(Math.random() * colors.length)],
      tasks: [],
    };
    saveData({ columns: [...boardData.columns, newCol] });
    setShowColumnModal(false);
    setColumnName("");
    toast({ title: "Column added" });
  };

  const addSubtask = () => {
    if (!newSubtaskText.trim()) return;
    setCurrentSubtasks([...currentSubtasks, { text: newSubtaskText, done: false }]);
    setNewSubtaskText("");
  };

  const toggleSubtask = (index: number) => {
    const updated = [...currentSubtasks];
    updated[index].done = !updated[index].done;
    setCurrentSubtasks(updated);
  };

  const removeSubtask = (index: number) => {
    setCurrentSubtasks(currentSubtasks.filter((_, i) => i !== index));
  };

  const toggleCardSubtask = (taskId: string, subIndex: number) => {
    const newColumns = boardData.columns.map((col) => ({
      ...col,
      tasks: col.tasks.map((task) => {
        if (task.id === taskId && task.subtasks) {
          const updated = [...task.subtasks];
          updated[subIndex].done = !updated[subIndex].done;
          return { ...task, subtasks: updated };
        }
        return task;
      }),
    }));
    saveData({ columns: newColumns });
  };

  const exportData = () => {
    const dataStr = JSON.stringify(boardData, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "flowboard_backup.json";
    a.click();
    toast({ title: "Board exported" });
  };

  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.columns && Array.isArray(data.columns)) {
          saveData(data);
          toast({ title: "Board imported successfully" });
        } else {
          toast({ title: "Invalid file format", variant: "destructive" });
        }
      } catch {
        toast({ title: "Error parsing file", variant: "destructive" });
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const generateAITasks = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);

    try {
      const response = await fetch("/api/flowboard/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt }),
      });

      const data = await response.json();
      if (data.tasks) {
        setGeneratedTasks(data.tasks);
      } else {
        toast({ title: "AI generation failed", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error generating tasks", variant: "destructive" });
    } finally {
      setAiLoading(false);
    }
  };

  const confirmAITasks = () => {
    if (boardData.columns.length === 0) return;

    const targetCol = boardData.columns[0];
    const newTasks = generatedTasks.map((t) => ({
      id: "task-" + Date.now() + Math.random(),
      title: t.title,
      desc: t.desc,
      tag: t.tag || "dev",
      created: Date.now(),
      subtasks: t.subtasks ? t.subtasks.map((txt: string) => ({ text: txt, done: false })) : [],
    }));

    const newColumns = boardData.columns.map((col) =>
      col.id === targetCol.id ? { ...col, tasks: [...col.tasks, ...newTasks] } : col
    );

    saveData({ columns: newColumns });
    setShowAIModal(false);
    setAiPrompt("");
    setGeneratedTasks([]);
    confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
    toast({ title: `${newTasks.length} tasks added` });
  };

  const clearBoard = () => {
    if (confirm("Clear all tasks?")) {
      const newColumns = boardData.columns.map((col) => ({ ...col, tasks: [] }));
      saveData({ columns: newColumns });
      toast({ title: "Board cleared" });
    }
  };

  const filteredColumns = boardData.columns.map((col) => ({
    ...col,
    tasks: col.tasks.filter(
      (t) =>
        t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.desc.toLowerCase().includes(searchTerm.toLowerCase())
    ),
  }));

  const getTaskProgress = (task: Task) => {
    if (!task.subtasks || task.subtasks.length === 0) return null;
    const total = task.subtasks.length;
    const done = task.subtasks.filter((s) => s.done).length;
    const percent = Math.round((done / total) * 100);
    return { total, done, percent };
  };

  const isOverdue = (dueDate?: string) => {
    if (!dueDate) return false;
    const today = new Date().toISOString().split("T")[0];
    return dueDate < today;
  };

  const totalTasks = boardData.columns.reduce((sum, col) => sum + col.tasks.length, 0);
  const doneTasks = boardData.columns
    .filter((c) => c.id === "col-done")
    .reduce((sum, col) => sum + col.tasks.length, 0);
  const activeTasks = totalTasks - doneTasks;

  return (
    <div className="flex flex-col h-[calc(100vh-40px)] overflow-hidden bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 dark:from-[#0b1224] dark:via-[#0f1b33] dark:to-[#0a0f1f]">
      {/* Top Bar */}
      <div className="border-b border-slate-200 dark:border-white/5 bg-white/80 dark:bg-white/5 backdrop-blur-xl px-4 sm:px-6 py-4 flex items-center justify-between gap-3 flex-wrap shadow-sm dark:shadow-lg dark:shadow-black/20">
        <div className="flex items-center gap-3 flex-1 min-w-[220px]">
          <div>
            <div className="text-slate-900 dark:text-white font-semibold text-lg">FlowBoard AI</div>
            <div className="text-sm text-slate-600 dark:text-slate-300/80">Plan, track, and finish faster.</div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap justify-end">
          <div className="relative flex items-center" id="fb-search">
            <Search className="text-slate-400 absolute left-3" size={16} />
            <Input
              placeholder="Quick search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-slate-100 dark:bg-white/5 border-slate-300 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 min-w-[220px]"
            />
          </div>

          <div className="flex gap-2 items-center">
            <Button variant="ghost" size="sm" onClick={exportData} id="fb-export" className="text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white">
              <Download size={16} className="mr-1" /> Backup
            </Button>
            <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()} id="fb-import" className="text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white">
              <Upload size={16} className="mr-1" /> Import
            </Button>
            <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={importData} />

            <div className="w-px h-6 bg-slate-300 dark:bg-white/10" />

            <Button variant="ghost" size="sm" onClick={clearBoard} className="text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-300">
              <Trash2 size={16} />
            </Button>

            <Button size="sm" onClick={() => setShowAIModal(true)} id="fb-ai" className="bg-primary hover:bg-primary/90">
              <Wand2 size={16} className="mr-1" /> AI Planner
            </Button>

            <Button variant="ghost" size="icon" onClick={() => setTourOpen(true)} aria-label="Help / Tour" className="text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10">
              <HelpCircle size={18} />
            </Button>
          </div>
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto px-4 sm:px-6 py-4">
          {/* Stats strip */}
          <div className="grid grid-cols-3 gap-3 mb-4 bg-white/60 dark:bg-white/5 backdrop-blur-md border border-slate-200 dark:border-white/5 rounded-xl p-3">
            <div className="text-center">
              <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-300">Total</div>
              <div className="text-xl sm:text-2xl font-semibold mt-1 text-slate-900 dark:text-white">{totalTasks}</div>
            </div>
            <div className="text-center">
              <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-300">Active</div>
              <div className="text-xl sm:text-2xl font-semibold mt-1 text-amber-600 dark:text-amber-200">{activeTasks}</div>
            </div>
            <div className="text-center">
              <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-300">Done</div>
              <div className="text-xl sm:text-2xl font-semibold mt-1 text-emerald-600 dark:text-emerald-200">{doneTasks}</div>
            </div>
          </div>

          {/* Columns */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-4 h-full items-start overflow-x-hidden overflow-y-auto pb-2">
          {filteredColumns.map((col) => (
            <div
              key={col.id}
              className="w-full sm:min-w-[280px] sm:w-[320px] sm:max-w-[360px] flex flex-col bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 backdrop-blur-xl rounded-xl sm:h-full max-h-[500px] sm:max-h-none shadow-md dark:shadow-lg dark:shadow-black/20"
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(col.id)}
            >
              {/* Column Header */}
              <div className="p-3 border-b border-slate-200 dark:border-white/10 flex justify-between items-center bg-slate-50 dark:bg-white/5 rounded-t-xl">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: col.color }} />
                  <h2 className="font-bold text-sm text-slate-900 dark:text-white">{col.title}</h2>
                  <span className="bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-200 text-xs px-2 py-0.5 rounded-full">{col.tasks.length}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => deleteColumn(col.id)} className="h-6 w-6 p-0 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10 hover:text-slate-700 dark:hover:text-white">
                  <MoreVertical size={14} />
                </Button>
              </div>

              {/* Tasks */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3 pr-1">
                {col.tasks.map((task) => {
                  const progress = getTaskProgress(task);
                  const tagInfo = tagConfig[task.tag];
                  const overdue = isOverdue(task.dueDate);

                  return (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={() => handleDragStart(task.id)}
                      className="bg-slate-50 dark:bg-white/5 p-3 rounded-lg border border-slate-200 dark:border-white/10 cursor-grab active:cursor-grabbing hover:border-primary/40 dark:hover:border-cyan-300/40 transition-all group shadow-sm dark:shadow-black/10"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span
                          className="text-xs px-2 py-0.5 rounded border dark:hidden"
                          style={{ background: tagInfo.bgLight, color: tagInfo.textLight, borderColor: tagInfo.borderLight }}
                        >
                          {tagInfo.icon} {tagInfo.label}
                        </span>
                        <span
                          className="text-xs px-2 py-0.5 rounded border hidden dark:inline"
                          style={{ background: tagInfo.bgDark, color: tagInfo.textDark, borderColor: tagInfo.borderDark }}
                        >
                          {tagInfo.icon} {tagInfo.label}
                        </span>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openTaskModal(col.id, task.id)}
                            className="h-6 w-6 p-0 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10 hover:text-slate-700 dark:hover:text-white"
                          >
                            <Edit2 size={12} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteTask(task.id)}
                            className="h-6 w-6 p-0 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-300"
                          >
                            <Trash2 size={12} />
                          </Button>
                        </div>
                      </div>

                      <h4
                        className="font-bold text-sm mb-1 cursor-pointer text-slate-900 dark:text-white hover:text-primary dark:hover:text-primary"
                        onClick={() => openTaskModal(col.id, task.id)}
                      >
                        {task.title}
                      </h4>
                      {task.desc && <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-2">{task.desc}</p>}

                      {progress && (
                        <div className="mb-2">
                          <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400 mb-1">
                            <span>
                              Progress {progress.done}/{progress.total}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const newSet = new Set(expandedSubtasks);
                                if (newSet.has(task.id)) {
                                  newSet.delete(task.id);
                                } else {
                                  newSet.add(task.id);
                                }
                                setExpandedSubtasks(newSet);
                              }}
                              className="h-5 w-5 p-0 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10"
                            >
                              <ListChecks size={12} />
                            </Button>
                          </div>
                          <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all ${progress.percent === 100 ? "bg-emerald-500" : "bg-primary"}`}
                              style={{ width: `${progress.percent}%` }}
                            />
                          </div>
                          {expandedSubtasks.has(task.id) && (
                            <div className="mt-2 space-y-1 pt-2 border-t border-slate-200 dark:border-slate-700/50">
                              {task.subtasks?.map((sub, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={sub.done}
                                    onChange={() => toggleCardSubtask(task.id, idx)}
                                    className="w-3 h-3 rounded accent-primary cursor-pointer"
                                  />
                                  <span className={`text-xs ${sub.done ? "line-through text-slate-400 dark:text-slate-500" : "text-slate-700 dark:text-slate-300"}`}>
                                    {sub.text}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700/50 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock size={10} /> {new Date(task.created).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        </span>
                        {task.dueDate && (
                          <span className={`flex items-center gap-1 ${overdue ? "text-red-500 dark:text-red-400 font-bold" : ""}`}>
                            {overdue ? <AlertCircle size={10} /> : <Calendar size={10} />} {task.dueDate}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add Task Button */}
              <div className="p-3 border-t border-slate-200 dark:border-slate-800">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openTaskModal(col.id)}
                  className="w-full border-dashed border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-primary hover:text-primary hover:bg-primary/5"
                    id={col.id === filteredColumns[0]?.id ? "fb-add-task" : undefined}
                >
                  <Plus size={16} className="mr-1" /> Add Task
                </Button>
              </div>
            </div>
          ))}

          {/* Add Column Button */}
          <Button
            variant="outline"
            size="lg"
            onClick={() => setShowColumnModal(true)}
            className="min-w-[60px] h-12 border-dashed border-slate-300 dark:border-white/20 text-slate-600 dark:text-white hover:border-primary dark:hover:border-white/60 hover:text-primary dark:hover:text-white bg-white/80 dark:bg-white/5 hover:bg-primary/5 dark:hover:bg-white/10"
            id="fb-add-col"
          >
            <Plus size={20} />
          </Button>
        </div>
        </div>
      </div>

      {/* Task Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">{editingTaskId ? "Edit Task" : "New Task"}</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowTaskModal(false)} className="text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X size={18} />
              </Button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 space-y-3">
              <Input
                placeholder="Task Title"
                value={taskForm.title}
                onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                className="bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-lg font-medium text-slate-900 dark:text-white"
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Tag</label>
                  <select
                    value={taskForm.tag}
                    onChange={(e) => setTaskForm({ ...taskForm, tag: e.target.value as Task["tag"] })}
                    className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white"
                  >
                    <option value="dev">💻 Dev</option>
                    <option value="design">🎨 Design</option>
                    <option value="marketing">📢 Marketing</option>
                    <option value="urgent">🔥 Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Due Date</label>
                  <Input
                    type="date"
                    value={taskForm.dueDate}
                    onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                    className="bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Description</label>
                <Textarea
                  placeholder="Add a detailed description..."
                  value={taskForm.desc}
                  onChange={(e) => setTaskForm({ ...taskForm, desc: e.target.value })}
                  className="bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 resize-none text-slate-900 dark:text-white"
                  rows={3}
                />
              </div>

              <div>
                <label className="text-xs text-slate-500 dark:text-slate-400 block mb-2">Subtasks</label>
                <div className="space-y-2 mb-2">
                  {currentSubtasks.map((sub, idx) => (
                    <div key={idx} className="flex items-center gap-2 group">
                      <input
                        type="checkbox"
                        checked={sub.done}
                        onChange={() => toggleSubtask(idx)}
                        className="w-4 h-4 rounded accent-primary cursor-pointer"
                      />
                      <span className={`flex-1 text-sm ${sub.done ? "line-through text-slate-400 dark:text-slate-500" : "text-slate-700 dark:text-slate-200"}`}>{sub.text}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSubtask(idx)}
                        className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/10"
                      >
                        <X size={14} />
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add an item..."
                    value={newSubtaskText}
                    onChange={(e) => setNewSubtaskText(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && addSubtask()}
                    className="bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                  <Button size="sm" onClick={addSubtask} className="bg-primary hover:bg-primary/90">
                    <Plus size={16} />
                  </Button>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setShowTaskModal(false)} className="text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                Cancel
              </Button>
              <Button onClick={saveTask} className="bg-primary hover:bg-primary/90">Save Task</Button>
            </div>
          </div>
        </div>
      )}

      {/* Column Modal */}
      {showColumnModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-xl border border-slate-200 dark:border-slate-800 p-6">
            <h3 className="font-bold text-lg mb-4 text-slate-900 dark:text-white">Add Column</h3>
            <Input
              placeholder="Column Name (e.g. Backlog)"
              value={columnName}
              onChange={(e) => setColumnName(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && addColumn()}
              className="bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 mb-4 text-slate-900 dark:text-white"
            />
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setShowColumnModal(false)} className="text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                Cancel
              </Button>
              <Button onClick={addColumn} className="bg-primary hover:bg-primary/90">Create</Button>
            </div>
          </div>
        </div>
      )}

      {/* AI Modal */}
      {showAIModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-xl border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex justify-between items-center mb-1">
              <h3 className="font-bold text-lg flex items-center gap-2 text-slate-900 dark:text-white">
                <Wand2 className="text-purple-500 dark:text-purple-400" size={20} /> AI Project Planner
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setShowAIModal(false)} className="text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X size={18} />
              </Button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Describe a goal, and AI will break it down into actionable tasks.</p>

            <div className="relative mb-6">
              <Input
                placeholder="e.g., 'Launch a coffee shop website' or 'Plan a trip to Japan'"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && generateAITasks()}
                className="bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 pr-12 text-slate-900 dark:text-white"
              />
              <Button
                size="sm"
                onClick={generateAITasks}
                disabled={aiLoading}
                className="absolute right-2 top-2 bottom-2 h-auto bg-primary hover:bg-primary/90"
              >
                →
              </Button>
            </div>

            {aiLoading && (
              <div className="flex flex-col items-center py-8">
                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-sm text-primary animate-pulse">Consulting the oracle...</p>
              </div>
            )}

            {generatedTasks.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-2">Generated Tasks</h4>
                <div className="max-h-60 overflow-y-auto space-y-2 mb-4">
                  {generatedTasks.map((task, idx) => (
                    <div key={idx} className="bg-slate-100 dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-slate-700 flex justify-between items-center">
                      <div>
                        <div className="font-medium text-sm text-slate-900 dark:text-white">{task.title}</div>
                        <div className="text-xs text-slate-500">{task.desc}</div>
                      </div>
                      <span className="text-xs uppercase font-bold text-slate-500 border border-slate-300 dark:border-slate-700 px-1 rounded">
                        {task.tag}
                      </span>
                    </div>
                  ))}
                </div>
                <Button onClick={confirmAITasks} className="w-full bg-primary hover:bg-primary/90">
                  Add All to Board
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {tourOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm" onClick={closeTour} />
          <div className="absolute inset-0 flex items-end sm:items-center justify-center pointer-events-none p-4">
            <div className="bg-white dark:bg-slate-800/95 border border-slate-200 dark:border-white/15 rounded-xl p-4 sm:p-5 max-w-md w-full shadow-2xl pointer-events-auto">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">{tourSteps[tourStep].title}</div>
                  <div className="text-slate-600 dark:text-slate-200/80 text-sm mt-1 leading-relaxed">{tourSteps[tourStep].desc}</div>
                  <div className="text-xs text-slate-400 dark:text-slate-300 mt-2">Step {tourStep + 1} / {tourSteps.length}</div>
                </div>
                <Button variant="ghost" size="icon" onClick={closeTour} className="text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10">
                  <X size={16} />
                </Button>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="ghost" size="sm" disabled={tourStep === 0} onClick={() => gotoStep(tourStep - 1)} className="text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-50">
                  Back
                </Button>
                {tourStep === tourSteps.length - 1 ? (
                  <Button size="sm" onClick={closeTour} className="bg-primary hover:bg-primary/90">Finish</Button>
                ) : (
                  <Button size="sm" onClick={() => gotoStep(tourStep + 1)} className="bg-primary hover:bg-primary/90">Next</Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Minimal highlight style
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _fbTourStyles = `
.fb-tour-target {
  outline: 2px solid rgba(56, 189, 248, 0.9);
  outline-offset: 2px;
  box-shadow: 0 0 0 4px rgba(56, 189, 248, 0.2);
  border-radius: 8px;
}
`;
