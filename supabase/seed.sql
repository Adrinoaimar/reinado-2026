-- Datos visuales para desarrollo local. No incluyen códigos ni votos.
insert into public.candidatas
  (id, nombre_completo, apodo_o_titulo, edad, descripcion, representa_a, orden)
values
  ('86291858-b6be-4dce-b38e-ce902bc68531', 'Valentina Reyes', 'La voz de la costa', 21, 'Promueve proyectos culturales que conectan tradición, creatividad y nuevas generaciones.', 'Sede Central', 1),
  ('8f5987ad-68e7-4bc4-b0b3-1c5b837af4f0', 'Camila del Mar', 'Elegancia que inspira', 20, 'Defensora del acceso a la educación artística y el liderazgo femenino.', 'Sede Norte', 2),
  ('d3e0ad84-fca1-46b0-a6c7-59404532c8c7', 'Luciana Flores', 'Tradición en movimiento', 22, 'Lleva las historias de su comunidad a una visión fresca del liderazgo.', 'Sede Sur', 3)
on conflict (id) do nothing;
