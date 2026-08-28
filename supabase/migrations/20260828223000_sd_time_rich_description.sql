-- O editor rico serializa a descrição como JSON Lexical. Amplia o limite para
-- acomodar a formatação sem restringir textos que antes cabiam como texto puro.

ALTER TABLE public.sd_time_entries
  DROP CONSTRAINT IF EXISTS sd_time_entries_description_length;

ALTER TABLE public.sd_time_entries
  ADD CONSTRAINT sd_time_entries_description_length
  CHECK (description IS NULL OR char_length(description) <= 20000);
