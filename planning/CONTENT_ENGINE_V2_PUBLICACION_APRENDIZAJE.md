# Content Engine V2 · Publicación, métricas y aprendizaje

Estado: ACTIVO · 19/09/2026.

Este documento refleja la ampliación persistida en Supabase. Supabase vivo sigue siendo la fuente de verdad; este archivo es documentación operativa y de recuperación.

## 1. Flujo canónico ampliado

VERDAD → BANCO EDITORIAL → SEGUNDA CAPA → ORQUESTADOR → CHAT 00 → BIBLIOTECAS → PRODUCCIÓN → EDICIÓN/PUBLICACIÓN → MÉTRICAS/APRENDIZAJE → ORQUESTADOR.

No se agrega una capa estratégica nueva. Se formalizan artefactos internos de EDICIÓN/PUBLICACIÓN y MÉTRICAS/APRENDIZAJE.

## 2. CHAT 02 · EDICIÓN / PUBLICACIÓN

CHAT 02 es propietario del PUBLICATION_PACKAGE.

Para una pieza APPROVED/RECORDED/READY debe:
- recuperar la versión viva de la pieza y el slot;
- verificar que la edición no alteró tesis, hook, payoff o CTA aprobado;
- investigar reglas oficiales vigentes de TikTok, Instagram y Facebook;
- separar regla oficial de heurística;
- auditar video final, portada, texto en pantalla, audio, caption, hashtags, CTA y comentario fijado;
- diferenciar cumplimiento de normas, elegibilidad de recomendación/distribución y optimización;
- generar un paquete independiente por plataforma sin crear tres estrategias clínicas;
- entregar seis cajones visibles: descripción y hashtags para Instagram, TikTok y Facebook;
- persistir cada paquete versionado;
- al publicar, guardar URL, fecha/hora, caption y hashtags realmente usados;
- registrar si lo publicado fue EXACT, MODIFIED o NO_PACKAGE respecto del paquete preparado.

PREPARADO no equivale a PUBLICADO.

PUBLICATION_PACKAGE_READY es un artefacto, no un nuevo estado de content_piezas.

## 3. CHAT 03 · MÉTRICAS / APRENDIZAJE

CHAT 03 funciona fetch-first.

Antes de pedir información al usuario recupera:
- proyecto y content_id;
- versión exacta del guion;
- slot, strategic_role y expected_signal;
- paquete de publicación preparado;
- publicación real;
- snapshots previos;
- Hook/Rehook/CTA/Formato usados;
- señales e hipótesis abiertas.

Si ese contexto ya existe, el usuario solo necesita aportar nueva evidencia o nuevas métricas.

Analiza por pieza y también de forma agregada:
- plataforma;
- servicio;
- audiencia;
- hook;
- rehook;
- CTA;
- formato;
- caption;
- hashtags;
- día y hora de publicación;
- evolución temporal.

Segmentación permitida cuando la plataforma la aporta:
- edades;
- género;
- ubicación;
- seguidores/no seguidores;
- fuentes de tráfico;
- fuentes de visualización;
- actividad de audiencia por hora;
- actividad de audiencia por día.

Todo conector externo debe pasar un gate de identidad: la marca/cuenta debe corresponder al negocio analizado. No se mezclan datos de otra cuenta.

No se mezclan ciegamente métricas incompatibles entre plataformas.

## 4. Snapshots

content_metric_snapshots conserva capturas acumulativas por publicación.

Una captura nueva no sobrescribe la anterior.

El objetivo es poder comparar T+12h, T+24h, T+72h, T+7d u otros cortes realmente disponibles.

## 5. Hipótesis

content_hypotheses conserva:
- dimensión;
- afirmación;
- alcance;
- tamaño de muestra;
- evidencia;
- siguiente prueba;
- estado.

Estados:
INSUFFICIENT · EARLY_SIGNAL · SUPPORTING · MIXED · CONTRADICTING · RETIRED.

Una sola publicación no vuelve ganadora/perdedora una variable.

## 6. Recomendaciones

content_learning_recommendations conserva recomendaciones por:
DAILY · WEEKLY · MONTHLY · YEARLY · ROLLING.

Dimensiones principales:
PUBLISH_TIME · DAY_OF_WEEK · HASHTAGS · CAPTION · HOOK · REHOOK · CTA · FORMAT · AUDIENCE · SERVICE · PLATFORM · OVERALL.

Niveles de evidencia:
INSUFFICIENT · EXPLORATORY · REPEATED_OBSERVATION · CONTROLLED_TEST.

Las recomendaciones visibles deben ser breves, directas, accionables y mostrar el nivel de evidencia y la muestra.

## 7. Hora de publicación

La Segunda Capa admite:
- recommended_publish_time;
- publish_timezone;
- publish_time_status;
- publish_time_recommendation_id;
- publish_time_evidence.

Estados:
NOT_EVALUATED · EXPLORATORY · RECOMMENDED · MANUAL.

Una publicación a una hora no convierte esa hora en ganadora. Cuando exista, la recomendación debe triangular actividad de audiencia de la plataforma con rendimiento propio observado por día/hora. La comparación debe ocurrir dentro de la misma plataforma y, cuando se quiera aprender causalidad, con piezas razonablemente comparables.

## 8. Tablas activas

Nuevas:
- content_publication_packages
- content_metric_snapshots
- content_hypotheses
- content_learning_recommendations

Ampliadas:
- content_publicaciones
- content_calendario_publicacion_slots
- content_orchestration_contracts

## 9. Front

Dashboard autenticado/noindex:
planning/aprendizaje-v2.html

Áreas:
1. Resumen.
2. Recomendaciones día/semana/mes/año.
3. Por proyecto.
4. Qué publicamos: guion + versión + copy + hashtags + fecha + URL.
5. Comparación por plataforma.
6. Evolución por snapshots.
7. Audiencia y horarios.
8. Variables creativas.
9. Señales.
10. Hipótesis.

Accesos añadidos desde:
- planning/vista-previa.html
- plan-contenido.html

## 10. Estado histórico

Las publicaciones existentes sin paquete previo se conservan como NO_PACKAGE. Caption/hashtags faltantes quedan NOT_RECORDED_HISTORICALLY; nunca se reconstruyen o inventan.

## 11. Mapa de documentación V2 afectada

Cambios conceptuales correspondientes:
- 01_ARQUITECTURA_CANONICA_V2.md: formalizar PUBLICATION_PACKAGE y ciclo de recomendaciones.
- 02_CONTRATO_ORQUESTADOR_V2.md: consumir hipótesis/recomendaciones con nivel de evidencia.
- 03_SEGUNDA_CAPA_CALENDARIO_REAL_V2.md: soportar hora recomendada con evidencia.
- 07_PRODUCCION_EDICION_PUBLICACION_V2.md: contrato completo de CHAT 02 y trazabilidad preparada/real.
- 08_METRICAS_APRENDIZAJE_V2.md: snapshots, segmentación, timing, agregados y recomendaciones periódicas.
- 09_PRUEBA_SOCIAL_TRANSVERSAL_V2.md: publicación testimonial verifica permisos antes del paquete.
- 10_ESTADOS_HANDOFFS_V2.md: PUBLICATION_PACKAGE_READY es artefacto, no estado de pieza.
- 11_MAPA_FRONTS_V2.md: dashboard ampliado.
- 12_ESQUEMA_DATOS_V2.md: nuevas tablas/campos/RLS.

No se cambia la autoridad de 04_CONTRATO_CHAT00_V2, 05_BIBLIOTECAS_EJECUCION_V2 ni 06_MATRIZ_ADAPTACION_SEEDS_V2.

## 12. Contratos vivos

Activos en Supabase:
- ORCHESTRATOR_V2
- CALENDAR_LAYER2_V2
- CHAT00_V2
- EXECUTION_LIBRARIES_V2
- EDIT_PUBLISH_V2
- METRICS_LEARNING_V2
