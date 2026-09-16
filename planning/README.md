# Plan editorial Dr. Olano · edición 1

71 preguntas propuestas en 19 colecciones cerradas: PRP 13 (4+3+2+4), toxina 12, limpieza 12, liposucción de papada 12, bichectomía 12, rinoplastia educativa 10. Otras 26 fichas están en reserva de investigación, fuera de numeración y calendario. La cantidad procede de preguntas distintas del dossier 16/17 y una pregunta adicional de proceso PRP respaldada por P1; no de multiplicar factores ni de cuotas de producción.

## Uso

1. Entrar en `plan-contenido.html` con la cuenta habitual y seleccionar Dr. Olano.
2. Ver calendario, series, antecedentes y cobertura. Por defecto abre PRP, todas las audiencias y objetivos.
3. Abrir una ficha: conserva su pregunta, parte/total y fuentes; permite modificar fecha referencial y quitar fecha. La fecha no cambia estados ni obliga a grabar/publicar.
4. Preparar pedido A/B/C, copiarlo al Chat 00 o descargarlo. El pedido incluye la selección, antecedentes, fuentes con acceso explícito, límites y contratos. No existe invocación automática a un modelo ni guardado automático de propuestas en MASTER_SCRIPT.
5. Chat 00 investiga la respuesta, recupera contexto vivo, entrega tres guiones completos, audita y solicita la selección/aprobación según V4.3. La integración de escritura sigue 06/09/13. Los maestros subidos no se han reemplazado por este desarrollo.
6. Tras registrar el guion por el flujo existente, elegir su pieza real en «Vincular una pieza existente». No se fabrican IDs de proyecto/brief/pieza. Tres propuestas son un episodio. El tablero lee aprobación de la pieza y publicación de `content_publicaciones`, con estado PUBLISHED y fecha real.

## Numeración y cobertura

Cada colección tiene edición, miembros fijos, episodios y total. Filtros y fechas no renumeran. Cambiar alcance exige otra edición. Las 71 piezas constituyen esta propuesta de ciclo, no un máximo de posibilidades, ni 71 guiones aprobados. Por elección expresa del usuario, las 13 piezas de PRP ocupan las primeras 13 fechas (21/09–19/10/2026). Después continúan los demás servicios conservando su orden relativo. El orden visible sigue las fechas y la numeración de cada colección permanece fija. Lunes/miércoles/viernes desde 21/09/2026 es una cadencia referencial editable, no capacidad de producción confirmada.

La cobertura muestra 8 objetivos × 3 temperaturas y los 3 motivos, 9 categorías, 14 formatos, 15 familias. Distingue intención del plan y uso registrado. Los ceros en metadata heredada no prueban ausencia. RETORNO legado se advierte como relación, no se suma como cuarta temperatura. No se rellena RESERVA sin comprobar ruta/oferta. C5 y familias basadas en testimonios, rutinas, experiencias o experimentos requieren material real. S6 permanece educativo.

## Fuentes y límites

Las preguntas de los maestros conservan su referencia, sin elevar hipótesis a evidencia. Se releyeron P1–P6 y fuentes B1, T3, L2, H3 y orientación C1–C5; el resto indica explícitamente «Referencia heredada del dossier 17; no releída en esta construcción». P1 sustenta la pregunta adicional de etapas/molestias. El título del tema y la situación son reformulaciones editoriales, no citas de pacientes de Olano. Las orientaciones de sociedades clínicas no sustituyen investigación primaria específica antes de afirmar eficacia, tiempos, indicaciones o riesgos en el guion. No se inventa revisión profesional.

Ejemplos de respaldo de preguntas PRP:
- P1: [experiencia de procedimiento, molestias y atención](https://www.clinicasesteticas.cl/experiencias/plasma-rico-en-plaquetas/comienzo-a-sentir-los-resultados-del-prp-160510).
- P2: [relato que mezcla manchas y acné](https://www.clinicasesteticas.cl/experiencias/plasma-rico-en-plaquetas/cuarta-sesion-se-plasma-rico-en-plaquetas-217442).
- P3: [preocupación por hematomas](https://www.multiestetica.mx/experiencias/plasma-rico-en-plaquetas/no-me-gustan-los-hematomas-que-salen-pero-si-he-visto-mejoria-a-causa-del-tratamiento-prp-3885).
- P4: [pregunta sobre manchas](https://www.doctoralia.co/preguntas-respuestas/es-efectivo-el-traramiento-con-plasma-para-las-manchas).
- P5: [preguntas sobre arrugas, evolución y rebote](https://www.multiestetica.mx/preguntas/plasma-rico-en-plaquetas).
- P6: [experiencia de continuidad y expectativas](https://community.clinicasesteticas.com.co/experiencias/plasma-rico-en-plaquetas/primera-sesion-de-plasma-86214).

## Integración y seguridad

Nueva tabla aditiva `content_planes_editoriales`; no modifica columnas, enums ni claves obligatorias de contratos canónicos. Documento de planificación separado de proyectos, briefs, scripts y publicación. El JSON versionado es semilla editorial, sin pacientes, tokens ni IDs ficticios. El documento operativo reside en la tabla; el navegador no usa el archivo de semilla como sustituto ante un fallo de acceso.

Lectura RLS: `private.es_miembro_negocio`; edición de documento: `private.puede_administrar_negocio`. Sin permisos anon, sin service role en frontend. Identidad y versión no editables por cliente. Fechas/vínculos guardados con comparación de revisión y lectura de verificación. Trigger protege identidad, numeración/alcance de colección y vínculos al mismo negocio; una pieza no puede ocupar dos episodios. Cada consulta se filtra por negocio; un negocio solicitado sin acceso produce error, no otra marca silenciosamente. Administrador/propietario edita, otros miembros consultan.

Los seis antecedentes encontrados al instalar no se vinculan automáticamente por similitud. No había publicaciones registradas en la consulta inicial; esto describe el registro consultado, no prueba que nunca se publicara en redes. No se modificó ninguno de sus guiones ni estados.

## Verificación

`node --test tests/editorial-plan.test.mjs tests/content-library.test.mjs`

Incluye conservación de numeración, fechas inválidas, separación de marcas, estado publicado con registro real, filtros, S6 educativo y contrato A/B/C. La vista previa pública es de solo lectura, sin historial privado ni contadores ficticios de aprobación. RLS, guardado, conflictos y vínculos se comprobaron en la base real mediante transacciones revertidas. No se usan credenciales de prueba en producción.
