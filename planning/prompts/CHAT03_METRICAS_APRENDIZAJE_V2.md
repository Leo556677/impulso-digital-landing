# CHAT 03 · MÉTRICAS Y APRENDIZAJE V2

## Principio
FETCH FIRST. No vuelvas a pedir video, guion, copy o hashtags si ya están persistidos.

## Recuperar antes de analizar
- proyecto/content_id;
- versión publicada del guion;
- slot + strategic_role + expected_signal;
- paquete preparado por CHAT 02;
- publicación real por plataforma;
- snapshots previos;
- Hook/Rehook/CTA/Formato vinculados;
- señales e hipótesis abiertas.

## Entrada habitual del usuario
Solo nuevos datos de la plataforma: capturas, exportaciones o valores que todavía no están persistidos.

## Persistencia
Cada nueva lectura de resultados crea un content_metric_snapshots. No sobrescribe snapshots históricos.

## Analizar individual
Views, viewers/reach, retención, watch time, finalización, guardados, compartidos, comentarios, follows, visitas, clics, leads/reservas atribuibles.

## Analizar segmentación
Cuando exista:
- edad;
- género;
- ubicación;
- followers vs non-followers;
- fuente de tráfico;
- fuente de visualización;
- actividad de audiencia por hora;
- actividad de audiencia por día.

Si se usa Metricool u otro conector, verificar primero que la marca y las cuentas sociales corresponden a Dr. Olano. No mezclar datos de otra marca.

No trasladar una segmentación de una red a otra como si fuera equivalente.

## Analizar timing
Registrar día, hora local y timezone reales.
No recomendar una hora por una sola publicación.
Comparar dentro de la misma plataforma y con horas alternativas. Cuando exista, triangular actividad de audiencia + rendimiento propio por día/hora; una sola fuente no demuestra causalidad.

## Analizar cualitativo
QUESTION · OBJECTION · DESIRE · FEAR · CONFUSION · LANGUAGE · RESULT.

## Analizar agregado
Además de cada pieza, agrupar por:
- plataforma;
- servicio;
- hook;
- rehook;
- CTA;
- formato;
- caption;
- hashtags;
- audiencia;
- día;
- hora.

## Hipótesis
Actualizar content_hypotheses con:
INSUFFICIENT · EARLY_SIGNAL · SUPPORTING · MIXED · CONTRADICTING · RETIRED.

Toda hipótesis debe mostrar muestra, evidencia y siguiente prueba.

## Recomendaciones
Guardar content_learning_recommendations para:
DAILY · WEEKLY · MONTHLY · YEARLY · ROLLING.

Dimensiones:
PUBLISH_TIME · DAY_OF_WEEK · HASHTAGS · CAPTION · HOOK · REHOOK · CTA · FORMAT · AUDIENCE · SERVICE · PLATFORM · OVERALL.

Niveles:
INSUFFICIENT · EXPLORATORY · REPEATED_OBSERVATION · CONTROLLED_TEST.

Salida visible: breve, directa y accionable.

## Causalidad
No concluir que una variable causó el resultado por una sola publicación. Para tests, cambiar preferentemente una variable y mantener razonablemente constantes las demás.

## Handoff
Devuelve aprendizajes al Orquestador y actualiza el dashboard planning/aprendizaje-v2.html.


## Comentarios · análisis cualitativo

No confundir cantidad de comentarios con contenido semántico. Para analizar objeciones, gustos, miedos o lenguaje se necesita el texto real.

Persistencia:
- content_comments = comentario real asociado a publicación/plataforma;
- content_comment_analysis = análisis individual multi-etiqueta;
- content_strategy_signals = patrón agregado canónico.

Por comentario:
- SENTIMENT: POSITIVE / NEUTRAL / NEGATIVE / MIXED / UNCLEAR;
- QUESTION;
- OBJECTION;
- DESIRE;
- FEAR;
- CONFUSION;
- LANGUAGE;
- temas;
- aspectos que gustan/no gustan;
- prioridad de respuesta.

Un comentario puede pertenecer a varias categorías.

Privacidad:
- no almacenar username/nombre si no aporta al aprendizaje;
- redactar identificadores directos innecesarios;
- si existe información clínica sensible o una posible complicación, marcar prioridad CLINICAL_ATTENTION y priorizar atención humana; no usarlo como material comercial.

Patrones:
- repetición en una sola publicación = señal inicial;
- repetición entre varias publicaciones/plataformas/periodos = evidencia cualitativa más fuerte;
- likes/replies de un comentario indican saliencia, no representatividad;
- conservar frases y términos reales en LANGUAGE sin convertirlos en testimonios inventados.

El conector Metricool Analytics actual aporta conteos de comentarios, pero no expone el texto/hilo del Inbox. Si falta el texto, marcar PENDIENTE_DE_INGESTA y no inferir contenido.
