import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, Check, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  getMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/api";
import { cn } from "@/lib/utils";

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
};

const formatTime = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
};

const NotificationsBell = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  const load = () => {
    getMyNotifications(20).then((d) => setItems(d as Notification[]));
  };

  useEffect(() => {
    if (!user) {
      setItems([]);
      return;
    }
    load();
    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  if (!user) return null;

  const unread = items.filter((n) => !n.read).length;

  const handleItemClick = async (n: Notification) => {
    if (!n.read) {
      await markNotificationRead(n.id);
      setItems((prev) =>
        prev.map((it) => (it.id === n.id ? { ...it, read: true } : it)),
      );
    }
    setOpen(false);
  };

  const handleMarkAll = async () => {
    await markAllNotificationsRead();
    setItems((prev) => prev.map((it) => ({ ...it, read: true })));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="relative text-foreground/60 hover:text-foreground transition-colors"
          aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}
        >
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <span className="text-sm font-semibold">Notifications</span>
          {unread > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={handleMarkAll}
            >
              <Check /> Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-96">
          {items.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">
              You're all caught up.
            </div>
          ) : (
            <ul className="divide-y">
              {items.map((n) => {
                const content = (
                  <div
                    className={cn(
                      "flex gap-3 px-4 py-3 transition-colors hover:bg-accent/50",
                      !n.read && "bg-accent/30",
                    )}
                  >
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Package className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-medium">{n.title}</p>
                        {!n.read && (
                          <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                        )}
                      </div>
                      {n.body && (
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                          {n.body}
                        </p>
                      )}
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {formatTime(n.created_at)}
                      </p>
                    </div>
                  </div>
                );
                return (
                  <li key={n.id}>
                    {n.link ? (
                      <Link to={n.link} onClick={() => handleItemClick(n)}>
                        {content}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleItemClick(n)}
                        className="w-full text-left"
                      >
                        {content}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationsBell;