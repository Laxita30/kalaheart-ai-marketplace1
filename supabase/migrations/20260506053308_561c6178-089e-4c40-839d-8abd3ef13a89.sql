CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, email, first_name, last_name, phone, address, age, gender)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    NEW.raw_user_meta_data->>'last_name',
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'address',
    NULLIF(NEW.raw_user_meta_data->>'age','')::int,
    NEW.raw_user_meta_data->>'gender'
  );

  IF NEW.email = 'admin@example.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSIF COALESCE(NEW.raw_user_meta_data->>'role','') = 'artist' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'artist');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  END IF;
  RETURN NEW;
END;
$function$;