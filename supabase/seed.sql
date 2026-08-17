-- Datos visuales para desarrollo local. No incluyen códigos ni votos.
-- Nota: no se almacenan DNI, celular, dirección ni contacto de emergencia (fuera del esquema de candidatas por diseño).
insert into public.candidatas
  (id, nombre_completo, apodo_o_titulo, edad, descripcion, representa_a, orden)
values
  ('58efb395-f458-4ecf-a893-28cacc04fdb3', 'Ingrid Nathaniel Romero Chiroque', 'Metas que inspiran', 16, 'Estudiante de Cosmetología II. Ama el fútbol, el vóley, leer y bailar; sueña con ser una profesional exitosa que enorgullezca a sus padres.', 'Cosmetología II', 1),
  ('a0880afc-ba0c-4832-8993-630f8984c951', 'Astrid Lariza Gaona Tavara', 'Vocación de cuidar vidas', 15, 'Estudiante de Cosmetología III. Disfruta el vóley y la música; su meta es convertirse en enfermera para cuidar vidas.', 'Cosmetología III', 2),
  ('5833a2a0-35b0-4340-a55d-071aa0f85847', 'Fabiana Yadira Avila Obrea', 'Baile, familia y superación', 17, 'Estudiante de Cosmetología, primer módulo. Le encanta bailar y ayudar en casa; aspira a convertirse en una profesional.', 'Cosmetología - 1er módulo', 3),
  ('c6b94fd9-5193-4a8b-9d71-55b37e90d03c', 'Consuelo Virginia Flores Villalobos', 'Rumbo a su propio spa', 18, 'Estudiante de Cosmetología, módulo 1, de Marcavelica. Practica vóley y fútbol; sueña con ser cosmetóloga profesional y tener su propio spa.', 'Cosmetología - Módulo 1', 4),
  ('a00e6f4a-653a-45f6-87ae-b8e56e6e1996', 'Patricia Lisbeth Navarro Adanaque', 'Éxito con propósito', 18, 'Estudiante de Cosmetología, primer módulo. Le gusta leer, la música y el tiempo en familia; busca ser una profesional exitosa e independiente que aporte a su comunidad.', 'Cosmetología - 1er módulo', 5),
  ('9b2a94ba-edf5-4821-82fd-d10a4102fddf', 'Viviana Magdalena Alache Alache', 'Estilo con propósito', 18, 'Estudiante de Cosmetología I, del caserío Riecito - Somate Bajo. Le apasiona la música y el fútbol; su meta es convertirse en una gran estilista.', 'Cosmetología I', 6),
  ('73fe2cba-8e20-4fa0-8c67-c7f9f233e21e', 'Wendy Casthell Dominguez Aguilar', 'Danza y resiliencia', 16, 'Estudiante de Cosmetología, módulo 3. Ama danzar; aspira a ser cosmetóloga y psicóloga.', 'Cosmetología - Módulo 3', 7),
  ('6106c996-c1bf-4cb0-80f4-d4530f10dd1a', 'Cielo Nicol Azabache Olivares', 'Éxito con esencia propia', 18, 'Estudiante de Cosmetología, módulo 1. Disfruta bailar, la música y el vóley; su meta es ser una gran profesional y alcanzar el éxito en lo que hace.', 'Cosmetología - Módulo 1', 8),
  ('b9570966-a27d-48b1-9d91-d9c68b0f2803', 'Luana Mayte Cueva Valdez', 'Belleza con propósito', 16, 'Estudiante de Cosmetología, módulo 1. Le gusta el gimnasio y bailar; su meta es ser una gran profesional especializada en medicina estética.', 'Cosmetología - Módulo 1', 9),
  ('20796904-5dbd-4a7f-996c-53f2d6e0d0fd', 'Daniela Yamilet Atoche Lazo', 'Estudiar, viajar, soñar', 16, 'Estudiante de Cosmetología I. Le gusta el fútbol, leer y escuchar música; su aspiración es terminar de estudiar y viajar por el mundo.', 'Cosmetología I', 10)
on conflict (id) do nothing;
