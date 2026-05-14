import { useEffect, useRef, useState } from "react";
import { Send, Loader2, Image as ImageIcon, Mic, Square, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type Msg = {
  id: string;
  sender_id: string;
  content: string | null;
  attachment_url: string | null;
  attachment_type: string | null;
  created_at: string;
};

interface Props {
  threadId: string;
  currentUserId: string;
  heightClass?: string;
}

const ChatThreadView = ({ threadId, currentUserId, heightClass = "h-[60vh]" }: Props) => {
  const { toast } = useToast();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [pendingFile, setPendingFile] = useState<{ file: File; previewUrl: string; kind: "image" | "audio" } | null>(null);
  const [recording, setRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!threadId) return;
    supabase
      .from("chat_messages")
      .select("id, sender_id, content, attachment_url, attachment_type, created_at")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true })
      .then(({ data }) => setMsgs((data ?? []) as Msg[]));

    const channel = supabase
      .channel(`thread-${threadId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `thread_id=eq.${threadId}` },
        (payload) => setMsgs((prev) => (prev.some((m) => m.id === (payload.new as Msg).id) ? prev : [...prev, payload.new as Msg])),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [threadId]);

  // Resolve attachment paths to short-lived signed URLs (chat-media is private).
  useEffect(() => {
    const paths = msgs
      .map((m) => m.attachment_url)
      .filter((p): p is string => !!p && !/^https?:\/\//.test(p) && !signedUrls[p]);
    if (paths.length === 0) return;
    (async () => {
      const { data } = await supabase.storage.from("chat-media").createSignedUrls(paths, 3600);
      if (!data) return;
      setSignedUrls((prev) => {
        const next = { ...prev };
        data.forEach((d, i) => { if (d.signedUrl) next[paths[i]] = d.signedUrl; });
        return next;
      });
    })();
  }, [msgs, signedUrls]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs]);

  const pickFile = (kind: "image") => {
    if (!fileInputRef.current) return;
    fileInputRef.current.accept = kind === "image" ? "image/*" : "audio/*";
    fileInputRef.current.click();
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 10MB", variant: "destructive" });
      return;
    }
    const kind: "image" | "audio" = file.type.startsWith("audio/") ? "audio" : "image";
    setPendingFile({ file, previewUrl: URL.createObjectURL(file), kind });
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: "audio/webm" });
        setPendingFile({ file, previewUrl: URL.createObjectURL(blob), kind: "audio" });
        stream.getTracks().forEach((t) => t.stop());
      };
      recorderRef.current = mr;
      mr.start();
      setRecording(true);
    } catch {
      toast({ title: "Microphone unavailable", variant: "destructive" });
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    setRecording(false);
  };

  const send = async () => {
    if (busy) return;
    if (!text.trim() && !pendingFile) return;
    setBusy(true);
    try {
      let attachment_url: string | null = null;
      let attachment_type: string | null = null;
      if (pendingFile) {
        const ext = pendingFile.file.name.split(".").pop() || (pendingFile.kind === "audio" ? "webm" : "bin");
        const path = `${threadId}/${currentUserId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("chat-media")
          .upload(path, pendingFile.file, { contentType: pendingFile.file.type, upsert: false });
        if (upErr) throw upErr;
        // Store the storage path; signed URLs are resolved on render.
        attachment_url = path;
        attachment_type = pendingFile.kind;
      }
      const content = text.trim().slice(0, 2000) || null;
      const { error } = await supabase
        .from("chat_messages")
        .insert({ thread_id: threadId, sender_id: currentUserId, content, attachment_url, attachment_type });
      if (error) throw error;
      setText("");
      setPendingFile(null);
    } catch (e: any) {
      toast({ title: "Send failed", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className={`flex flex-col ${heightClass}`}>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {msgs.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">Say hello — start the conversation!</p>
        )}
        {msgs.map((m) => {
          const mine = m.sender_id === currentUserId;
          const url = m.attachment_url
            ? (/^https?:\/\//.test(m.attachment_url) ? m.attachment_url : signedUrls[m.attachment_url])
            : null;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
                  mine ? "bg-primary text-primary-foreground" : "bg-secondary"
                }`}
              >
                {m.attachment_type === "image" && url && (
                  <a href={url} target="_blank" rel="noreferrer">
                    <img
                      src={url}
                      alt="attachment"
                      className="rounded-md mb-1 max-h-60 w-auto object-cover"
                    />
                  </a>
                )}
                {m.attachment_type === "audio" && url && (
                  <audio controls src={url} className="mb-1 max-w-full" />
                )}
                {m.content && <div>{m.content}</div>}
                <div className="text-[10px] opacity-70 mt-1">
                  {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {pendingFile && (
        <div className="border-t p-2 flex items-center gap-3 bg-muted/40">
          {pendingFile.kind === "image" ? (
            <img src={pendingFile.previewUrl} alt="preview" className="h-14 w-14 rounded-md object-cover border" />
          ) : (
            <audio controls src={pendingFile.previewUrl} className="max-w-xs" />
          )}
          <span className="text-xs text-muted-foreground truncate flex-1">{pendingFile.file.name}</span>
          <Button type="button" size="icon" variant="ghost" onClick={() => setPendingFile(null)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="border-t p-3 flex gap-2 items-center"
      >
        <input ref={fileInputRef} type="file" hidden onChange={onFileChange} />
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={() => pickFile("image")}
          disabled={busy || recording}
          aria-label="Attach image"
        >
          <ImageIcon className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant={recording ? "destructive" : "ghost"}
          onClick={recording ? stopRecording : startRecording}
          disabled={busy}
          aria-label={recording ? "Stop recording" : "Record voice"}
        >
          {recording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </Button>
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={recording ? "Recording…" : "Type a message…"}
          maxLength={2000}
          disabled={busy || recording}
        />
        <Button type="submit" disabled={busy || (!text.trim() && !pendingFile)} className="gap-1">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Send
        </Button>
      </form>
    </Card>
  );
};

export default ChatThreadView;