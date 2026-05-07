import { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Sparkles, User as UserIcon, Bot } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type Convo = {
  id: string;
  user_id: string | null;
  language: string | null;
  title: string | null;
  updated_at: string;
};

type AiMsg = {
  id: string;
  role: string;
  content: string;
  created_at: string;
};

type Thread = {
  id: string;
  user_id: string;
  artist_user_id: string;
  last_message_at: string;
  user_name?: string;
  artist_name?: string;
};

type DmMsg = {
  id: string;
  sender_id: string;
  content: string;
  attachment_url?: string | null;
  attachment_type?: string | null;
  created_at: string;
};

const AdminChats = () => {
  const [convos, setConvos] = useState<Convo[]>([]);
  const [selectedConvo, setSelectedConvo] = useState<string | null>(null);
  const [aiMsgs, setAiMsgs] = useState<AiMsg[]>([]);

  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [dmMsgs, setDmMsgs] = useState<DmMsg[]>([]);
  const [nameMap, setNameMap] = useState<Record<string, string>>({});

  useEffect(() => {
    supabase
      .from("ai_conversations")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(200)
      .then(({ data }) => setConvos((data ?? []) as Convo[]));
    (async () => {
      const { data: ts } = await supabase
        .from("chat_threads")
        .select("*")
        .order("last_message_at", { ascending: false })
        .limit(200);
      const rawThreads = (ts ?? []) as Thread[];
      const userIds = Array.from(
        new Set(rawThreads.flatMap((t) => [t.user_id, t.artist_user_id])),
      );
      const [{ data: profs }, { data: arts }] = await Promise.all([
        supabase.from("profiles").select("user_id, first_name, last_name, email").in("user_id", userIds),
        supabase.from("artists").select("user_id, shop_name").in("user_id", userIds),
      ]);
      const map: Record<string, string> = {};
      (profs ?? []).forEach((p: any) => {
        const name = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
        map[p.user_id] = name || p.email || p.user_id.slice(0, 8);
      });
      (arts ?? []).forEach((a: any) => {
        if (a.shop_name) map[a.user_id] = a.shop_name;
      });
      setNameMap(map);
      setThreads(
        rawThreads.map((t) => ({
          ...t,
          user_name: map[t.user_id] ?? t.user_id.slice(0, 8),
          artist_name: map[t.artist_user_id] ?? t.artist_user_id.slice(0, 8),
        })),
      );
    })();
  }, []);

  useEffect(() => {
    if (!selectedConvo) return;
    supabase
      .from("ai_messages")
      .select("id, role, content, created_at")
      .eq("conversation_id", selectedConvo)
      .order("created_at", { ascending: true })
      .then(({ data }) => setAiMsgs((data ?? []) as AiMsg[]));
  }, [selectedConvo]);

  useEffect(() => {
    if (!selectedThread) return;
    supabase
      .from("chat_messages")
      .select("id, sender_id, content, attachment_url, attachment_type, created_at")
      .eq("thread_id", selectedThread)
      .order("created_at", { ascending: true })
      .then(({ data }) => setDmMsgs((data ?? []) as DmMsg[]));
  }, [selectedThread]);

  return (
    <AdminLayout title="Chat oversight">
      <p className="text-sm text-muted-foreground mb-4">
        Review AI assistant conversations and direct chats between users and artists.
      </p>
      <Tabs defaultValue="ai">
        <TabsList>
          <TabsTrigger value="ai" className="gap-1.5">
            <Sparkles className="h-4 w-4" /> AI chats ({convos.length})
          </TabsTrigger>
          <TabsTrigger value="dm" className="gap-1.5">
            <MessageSquare className="h-4 w-4" /> User ↔ Artist ({threads.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ai">
          <div className="grid md:grid-cols-[300px_1fr] gap-4 mt-4">
            <Card className="p-2 max-h-[70vh] overflow-y-auto">
              {convos.length === 0 && (
                <p className="text-sm text-muted-foreground p-4 text-center">No AI conversations yet.</p>
              )}
              {convos.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedConvo(c.id)}
                  className={`w-full text-left rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors ${
                    selectedConvo === c.id ? "bg-accent" : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-medium">{c.title || "Untitled"}</span>
                    {c.language && <Badge variant="outline" className="text-[10px]">{c.language}</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {formatDistanceToNow(new Date(c.updated_at), { addSuffix: true })}
                  </div>
                </button>
              ))}
            </Card>
            <Card className="p-4 max-h-[70vh] overflow-y-auto space-y-3">
              {!selectedConvo && (
                <p className="text-sm text-muted-foreground text-center py-12">Select a conversation to inspect.</p>
              )}
              {aiMsgs.map((m) => (
                <div key={m.id} className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  {m.role !== "user" && <Bot className="h-4 w-4 text-primary mt-2" />}
                  <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap ${
                    m.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary"
                  }`}>
                    {m.content}
                    <div className="text-[10px] opacity-70 mt-1">
                      {new Date(m.created_at).toLocaleString()}
                    </div>
                  </div>
                  {m.role === "user" && <UserIcon className="h-4 w-4 text-muted-foreground mt-2" />}
                </div>
              ))}
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="dm">
          <div className="grid md:grid-cols-[300px_1fr] gap-4 mt-4">
            <Card className="p-2 max-h-[70vh] overflow-y-auto">
              {threads.length === 0 && (
                <p className="text-sm text-muted-foreground p-4 text-center">No direct chats yet.</p>
              )}
              {threads.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedThread(t.id)}
                  className={`w-full text-left rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors ${
                    selectedThread === t.id ? "bg-accent" : ""
                  }`}
                >
                  <div className="font-medium truncate">
                    {t.user_name} <span className="text-muted-foreground">↔</span> {t.artist_name}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {formatDistanceToNow(new Date(t.last_message_at), { addSuffix: true })}
                  </div>
                </button>
              ))}
            </Card>
            <Card className="p-4 max-h-[70vh] overflow-y-auto space-y-3">
              {!selectedThread && (
                <p className="text-sm text-muted-foreground text-center py-12">Select a thread to inspect.</p>
              )}
              {dmMsgs.map((m) => {
                const thread = threads.find((t) => t.id === selectedThread);
                const isArtist = thread?.artist_user_id === m.sender_id;
                const senderName =
                  nameMap[m.sender_id] ??
                  (isArtist ? thread?.artist_name : thread?.user_name) ??
                  m.sender_id.slice(0, 8);
                return (
                  <div
                    key={m.id}
                    className={`flex ${isArtist ? "justify-start" : "justify-end"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                        isArtist ? "bg-secondary" : "bg-primary text-primary-foreground"
                      }`}
                    >
                      <div className="text-[10px] opacity-80 mb-1">
                        <span className="font-medium">{senderName}</span>
                        <span className="mx-1">·</span>
                        {isArtist ? "Artist" : "User"}
                        <span className="mx-1">·</span>
                        {new Date(m.created_at).toLocaleString()}
                      </div>
                      {m.attachment_type === "image" && m.attachment_url && (
                        <a href={m.attachment_url} target="_blank" rel="noreferrer">
                          <img
                            src={m.attachment_url}
                            alt="attachment"
                            className="rounded-md mb-1 max-h-60 w-auto object-cover"
                          />
                        </a>
                      )}
                      {m.attachment_type === "audio" && m.attachment_url && (
                        <audio controls src={m.attachment_url} className="mb-1 max-w-full" />
                      )}
                      {m.content && <div className="whitespace-pre-wrap">{m.content}</div>}
                    </div>
                  </div>
                );
              })}
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
};

export default AdminChats;