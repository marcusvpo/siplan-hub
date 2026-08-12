-- Preserva o contexto textual do histórico mesmo após exclusões ou desvinculações.

ALTER TABLE public.cs_cx_routine_history
  ADD COLUMN registry_office_name TEXT,
  ADD COLUMN routine_model_name TEXT,
  ADD COLUMN model_item_name TEXT,
  ADD COLUMN actor_name TEXT;

CREATE OR REPLACE FUNCTION public.cs_cx_fill_routine_history_context()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  office_name_value TEXT;
  model_name_value TEXT;
  item_name_value TEXT;
  actor_name_value TEXT;
BEGIN
  IF NEW.office_routine_id IS NOT NULL THEN
    SELECT office.name, model.name
    INTO office_name_value, model_name_value
    FROM public.cs_cx_office_routines routine
    LEFT JOIN public.cs_cx_registry_offices office ON office.id = routine.registry_office_id
    LEFT JOIN public.cs_cx_routine_models model ON model.id = routine.routine_model_id
    WHERE routine.id = NEW.office_routine_id;

    NEW.registry_office_name := COALESCE(NEW.registry_office_name, office_name_value);
    NEW.routine_model_name := COALESCE(NEW.routine_model_name, model_name_value);
  END IF;

  IF NEW.model_item_id IS NOT NULL THEN
    SELECT item.name INTO item_name_value
    FROM public.cs_cx_routine_model_items item
    WHERE item.id = NEW.model_item_id;

    NEW.model_item_name := COALESCE(NEW.model_item_name, item_name_value);
  END IF;

  IF NEW.actor_profile_id IS NOT NULL THEN
    SELECT COALESCE(profile.full_name, profile.email) INTO actor_name_value
    FROM public.profiles profile
    WHERE profile.id = NEW.actor_profile_id;
  ELSIF NEW.legacy_user_id IS NOT NULL THEN
    SELECT COALESCE(user_map.full_name, user_map.username, user_map.email) INTO actor_name_value
    FROM public.cs_cx_user_map user_map
    WHERE user_map.legacy_id = NEW.legacy_user_id;
  END IF;

  NEW.actor_name := COALESCE(NEW.actor_name, actor_name_value);

  RETURN NEW;
END;
$$;

UPDATE public.cs_cx_routine_history history
SET registry_office_name = office.name,
    routine_model_name = model.name
FROM public.cs_cx_office_routines routine
LEFT JOIN public.cs_cx_registry_offices office ON office.id = routine.registry_office_id
LEFT JOIN public.cs_cx_routine_models model ON model.id = routine.routine_model_id
WHERE history.office_routine_id = routine.id;

UPDATE public.cs_cx_routine_history history
SET model_item_name = item.name
FROM public.cs_cx_routine_model_items item
WHERE history.model_item_id = item.id;

UPDATE public.cs_cx_routine_history history
SET actor_name = COALESCE(profile.full_name, profile.email)
FROM public.profiles profile
WHERE history.actor_profile_id = profile.id;

UPDATE public.cs_cx_routine_history history
SET actor_name = COALESCE(user_map.full_name, user_map.username, user_map.email)
FROM public.cs_cx_user_map user_map
WHERE history.actor_name IS NULL
  AND history.legacy_user_id = user_map.legacy_id;

CREATE TRIGGER fill_cs_cx_routine_history_context
  BEFORE INSERT OR UPDATE OF office_routine_id, model_item_id, actor_profile_id, legacy_user_id
  ON public.cs_cx_routine_history
  FOR EACH ROW EXECUTE FUNCTION public.cs_cx_fill_routine_history_context();

CREATE OR REPLACE FUNCTION public.cs_cx_log_office_routine_unlink()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.cs_cx_routine_history (
    office_routine_id, action, previous_status, new_status, notes,
    actor_profile_id, origin, source_present
  ) VALUES (
    OLD.id, 'DESVINCULADO', OLD.active, false, 'Rotina desvinculada do cartório',
    auth.uid(), 'hub', true
  );

  RETURN OLD;
END;
$$;

CREATE TRIGGER log_cs_cx_office_routine_unlink
  BEFORE DELETE ON public.cs_cx_office_routines
  FOR EACH ROW EXECUTE FUNCTION public.cs_cx_log_office_routine_unlink();
