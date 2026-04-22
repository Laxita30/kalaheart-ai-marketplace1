CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  order_id UUID,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_created ON public.notifications (user_id, created_at DESC);
CREATE INDEX idx_notifications_user_unread ON public.notifications (user_id) WHERE read = false;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications"
ON public.notifications FOR DELETE
USING (auth.uid() = user_id);

-- Authenticated users (e.g. an artist) can create a notification for another user
CREATE POLICY "Authenticated users can create notifications"
ON public.notifications FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;