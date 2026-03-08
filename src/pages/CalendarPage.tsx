import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, Plus, Trash2, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from "date-fns";
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
  planned: "bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30",
  in_progress: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border-yellow-500/30",
  published: "bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/30",
  cancelled: "bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30",
};

export const CalendarPage = () => {
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [items, setItems] = useState<ScheduledContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [form, setForm] = useState({ title: "", description: "", status: "planned" });

  const fetchItems = async () => {
    if (!user) return;
    const start = format(startOfMonth(currentMonth), "yyyy-MM-dd");
    const end = format(endOfMonth(currentMonth), "yyyy-MM-dd");
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
    const { error } = await supabase.from("scheduled_content").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setItems((prev) => prev.filter((i) => i.id !== id));
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    const { error } = await supabase.from("scheduled_content").update({ status }).eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i)));
    }
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getItemsForDay = (day: Date) =>
    items.filter((i) => isSameDay(new Date(i.scheduled_date + "T00:00:00"), day));

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Content Calendar</h1>
          <p className="text-muted-foreground mt-1">Plan and schedule your content strategy.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" onClick={() => setSelectedDate(new Date())}>
              <Plus className="h-4 w-4" /> Schedule Content
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Schedule New Content</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="flex justify-center">
                <Calendar
                  mode="single"
                  selected={selectedDate ?? undefined}
                  onSelect={(d) => d && setSelectedDate(d)}
                  className="p-3 pointer-events-auto rounded-md border"
                />
              </div>
              <Input placeholder="Content title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <Textarea placeholder="Description (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
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

      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-xl font-semibold">{format(currentMonth, "MMMM yyyy")}</h2>
        <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 bg-muted">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="p-2 text-center text-sm font-medium text-muted-foreground border-b">{d}</div>
            ))}
          </div>
          {/* Calendar grid */}
          <div className="grid grid-cols-7">
            {days.map((day) => {
              const dayItems = getItemsForDay(day);
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isToday = isSameDay(day, new Date());
              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "min-h-[100px] border-b border-r p-1.5 transition-colors",
                    !isCurrentMonth && "bg-muted/40 text-muted-foreground",
                    isToday && "bg-primary/5"
                  )}
                  onClick={() => { setSelectedDate(day); setDialogOpen(true); }}
                >
                  <div className={cn("text-xs font-medium mb-1", isToday && "text-primary font-bold")}>
                    {format(day, "d")}
                  </div>
                  <div className="space-y-1">
                    {dayItems.slice(0, 3).map((item) => (
                      <div
                        key={item.id}
                        className={cn("text-[11px] px-1.5 py-0.5 rounded border truncate cursor-default", STATUS_COLORS[item.status] || STATUS_COLORS.planned)}
                        onClick={(e) => e.stopPropagation()}
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

      {/* Upcoming items list */}
      {items.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">This Month's Content</h3>
          <div className="grid gap-2">
            {items.map((item) => (
              <Card key={item.id} className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <Badge variant="outline" className={cn("shrink-0 text-xs", STATUS_COLORS[item.status])}>
                    {item.status.replace("_", " ")}
                  </Badge>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(item.scheduled_date + "T00:00:00"), "MMM d, yyyy")}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Select value={item.status} onValueChange={(v) => handleStatusChange(item.id, v)}>
                    <SelectTrigger className="h-8 w-[120px] text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planned">Planned</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(item.id)}>
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
