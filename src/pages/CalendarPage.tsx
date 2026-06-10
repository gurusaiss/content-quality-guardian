import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  CalendarIcon, Plus, Trash2, Loader2, ChevronLeft, ChevronRight,
  Download, Search, ExternalLink, FileText,
} from "lucide-react";
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek,
} from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ScheduledContent {
  id: string;
  title: string;
  description: string | null;
  scheduled_date: string;
  status: string;
  color: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  planned:     "bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30",
  in_progress: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border-yellow-500/30",
  published:   "bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/30",
  cancelled:   "bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30",
};

const STATUS_FLOW: Record<string, string> = {
  planned: "in_progress",
  in_progress: "published",
  published: "published",
};

export const CalendarPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [items, setItems] = useState<ScheduledContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [form, setForm] = useState({ title: "", description: "", status: "planned" });
  const [search, setSearch] = useState("");

  const fetchItems = async () => {
    if (!user) return;
    const start = format(startOfMonth(currentMonth), "yyyy-MM-dd");
    const end   = format(endOfMonth(currentMonth),   "yyyy-MM-dd");
    const { data, error } = await supabase
      .from("scheduled_content")
      .select("*")
      .gte("scheduled_date", start)
      .lte("scheduled_date", end)
      .order("scheduled_date");
    if (error) {
      toast({ title: "Error loading calendar", description: error.message, variant: "destructive" });
    } else {
      setItems(data || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, [currentMonth, user]);

  const handleAdd = async () => {
    if (!user || !selectedDate || !form.title.trim()) return;
    const { error } = await supabase.from("scheduled_content").insert({
      user_id: user.id,
      title: form.title.trim(),
      description: form.description.trim() || null,
      scheduled_date: format(selectedDate, "yyyy-MM-dd"),
      status: form.status,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Content scheduled!" });
      setForm({ title: "", description: "", status: "planned" });
      setDialogOpen(false);
      fetchItems();
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from("scheduled_content").delete().eq("id", id);
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const handleStatusChange = async (id: string, status: string) => {
    await supabase.from("scheduled_content").update({ status }).eq("id", id);
    setItems(prev => prev.map(i => i.id === id ? { ...i, status } : i));
  };

  /** Advance item to next status in workflow */
  const handleAdvanceStatus = async (item: ScheduledContent) => {
    const next = STATUS_FLOW[item.status];
    if (!next || next === item.status) return;
    await handleStatusChange(item.id, next);
    toast({ title: `Moved to "${next.replace("_", " ")}"` });
  };

  /** Export this month as CSV */
  const handleCsvExport = () => {
    const rows = [
      ["Title", "Description", "Date", "Status"],
      ...items.map(i => [
        i.title,
        i.description || "",
        i.scheduled_date,
        i.status.replace("_", " "),
      ]),
    ];
    const csv = rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `content-calendar-${format(currentMonth, "yyyy-MM")}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "Exported", description: "Calendar exported as CSV." });
  };

  // Filter list by search
  const filteredItems = items.filter(i =>
    !search.trim() || i.title.toLowerCase().includes(search.toLowerCase())
  );

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentMonth)),
    end:   endOfWeek(endOfMonth(currentMonth)),
  });

  const getItemsForDay = (day: Date) =>
    items.filter(i => isSameDay(new Date(i.scheduled_date + "T00:00:00"), day));

  // Counts by status
  const counts = { planned: 0, in_progress: 0, published: 0 };
  items.forEach(i => { if (i.status in counts) counts[i.status as keyof typeof counts]++; });

  return (
    <div className="container py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Content Calendar</h1>
          <p className="text-muted-foreground mt-1">Plan, schedule and track your content pipeline.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleCsvExport} className="gap-1.5" disabled={!items.length}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" onClick={() => setSelectedDate(new Date())}>
                <Plus className="h-4 w-4" /> Schedule Content
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Schedule New Content</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="flex justify-center">
                  <Calendar
                    mode="single"
                    selected={selectedDate ?? undefined}
                    onSelect={d => d && setSelectedDate(d)}
                    className="p-3 pointer-events-auto rounded-md border"
                  />
                </div>
                <Input placeholder="Content title *" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                <Textarea placeholder="Description (optional)" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planned">Planned</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleAdd} disabled={!form.title.trim()} className="w-full">Add to Calendar</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Pipeline status counts */}
      <div className="flex gap-3 flex-wrap">
        {(["planned", "in_progress", "published"] as const).map(s => (
          <div key={s} className={cn("px-3 py-1.5 rounded-lg border text-sm font-medium", STATUS_COLORS[s])}>
            {counts[s]} {s.replace("_", " ")}
          </div>
        ))}
      </div>

      {/* Month nav */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-xl font-semibold">{format(currentMonth, "MMMM yyyy")}</h2>
        <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Calendar grid */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <div className="grid grid-cols-7 bg-muted">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
              <div key={d} className="p-2 text-center text-sm font-medium text-muted-foreground border-b">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map(day => {
              const dayItems = getItemsForDay(day);
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isToday = isSameDay(day, new Date());
              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "min-h-[100px] border-b border-r p-1.5 transition-colors cursor-pointer hover:bg-muted/30",
                    !isCurrentMonth && "bg-muted/40 text-muted-foreground",
                    isToday && "bg-primary/5 ring-1 ring-inset ring-primary/20"
                  )}
                  onClick={() => { setSelectedDate(day); setDialogOpen(true); }}
                >
                  <div className={cn("text-xs font-medium mb-1", isToday && "text-primary font-bold")}>
                    {format(day, "d")}
                  </div>
                  <div className="space-y-1">
                    {dayItems.slice(0, 3).map(item => (
                      <div
                        key={item.id}
                        className={cn("text-[11px] px-1.5 py-0.5 rounded border truncate", STATUS_COLORS[item.status] || STATUS_COLORS.planned)}
                        onClick={e => e.stopPropagation()}
                        title={item.title}
                      >
                        {item.title}
                      </div>
                    ))}
                    {dayItems.length > 3 && (
                      <div className="text-[10px] text-muted-foreground pl-1">+{dayItems.length - 3} more</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Month's content list */}
      {items.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <h3 className="text-lg font-semibold">This Month's Content</h3>
            <div className="relative w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter…" className="pl-8 h-8 text-sm" />
            </div>
          </div>
          <div className="grid gap-2">
            {filteredItems.map(item => (
              <Card key={item.id} className="p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Badge variant="outline" className={cn("shrink-0 text-xs", STATUS_COLORS[item.status])}>
                    {item.status.replace("_", " ")}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate text-sm">{item.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(item.scheduled_date + "T00:00:00"), "MMM d, yyyy")}
                      {item.description && ` — ${item.description.slice(0, 60)}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {/* Brief → Audit pipeline */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary"
                        onClick={() => navigate(`/brief`)}
                        title="Create Brief"
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Create Brief for this content</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary"
                        onClick={() => navigate(`/audit`)}
                        title="Run Audit"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Run Audit on this content</TooltipContent>
                  </Tooltip>
                  <Select value={item.status} onValueChange={v => handleStatusChange(item.id, v)}>
                    <SelectTrigger className="h-8 w-[120px] text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planned">Planned</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/70 hover:text-destructive"
                    onClick={() => handleDelete(item.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
