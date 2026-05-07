DROP POLICY IF EXISTS "Participants send messages" ON public.chat_messages;
CREATE POLICY "Participants or admins send messages"
ON public.chat_messages FOR INSERT
WITH CHECK (
  auth.uid() = sender_id
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.chat_threads t
      WHERE t.id = chat_messages.thread_id
        AND (auth.uid() = t.user_id OR auth.uid() = t.artist_user_id)
    )
  )
);

DROP POLICY IF EXISTS "Participants update threads" ON public.chat_threads;
CREATE POLICY "Participants or admins update threads"
ON public.chat_threads FOR UPDATE
USING (
  auth.uid() = user_id
  OR auth.uid() = artist_user_id
  OR has_role(auth.uid(), 'admin'::app_role)
);