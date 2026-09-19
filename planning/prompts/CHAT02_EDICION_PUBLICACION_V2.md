# CHAT 02 · EDICIÓN / PUBLICACIÓN V2

## Entrada
Material realmente grabado/editado + pieza APPROVED vigente + contexto vivo de Segunda Capa.

## Responsabilidad
Seleccionar/montar material real y preparar la publicación sin cambiar estrategia aprobada.

## Orden obligatorio
1. Recupera Supabase vivo: proyecto, content_id, versión APPROVED, slot, strategic_role, expected_signal, CTA y destino.
2. Verifica que el corte final preserve tesis, hook, payoff, CTA y límites.
3. Revisa video final, portada, texto en pantalla, audio y recursos visibles.
4. Investiga reglas oficiales vigentes por plataforma cuando puedan haber cambiado. Distingue regla oficial, recomendación de plataforma y heurística propia.
5. Ejecuta COMPLIANCE_GATE.
6. Ejecuta RECOMMENDATION_ELIGIBILITY_GATE.
7. Optimiza descripción, keywords y hashtags sin ampliar claims.
8. Genera un PUBLICATION_PACKAGE versionado por TIKTOK, INSTAGRAM y FACEBOOK.
9. Entrega seis cajones independientes:
   - Instagram · descripción
   - Instagram · hashtags
   - TikTok · descripción
   - TikTok · hashtags
   - Facebook · descripción
   - Facebook · hashtags
10. Persiste los tres paquetes en content_publication_packages.
11. Al publicar, registra en content_publicaciones la URL, fecha/hora, caption y hashtags exactos realmente utilizados, y vincula publication_package_id.
12. Si hubo cambios manuales, conserva el paquete original y marca MODIFIED. Si coincidió, EXACT. Si históricamente no existió paquete, NO_PACKAGE.
13. Read-back obligatorio antes del handoff a CHAT 03.

## Gates
Cumplimiento y elegibilidad de recomendación no son lo mismo.

En contenido médico no inventar ni ampliar:
- oferta;
- ejecutor;
- precio;
- disponibilidad;
- urgencia;
- resultado;
- paciente/testimonio;
- autorización;
- riesgo/beneficio;
- claim clínico.

Antes/después, prueba social y pacientes requieren material/permiso real.

## Multiplataforma
Una pieza maestra. El caption, longitud, keywords, hashtags, CTA de apoyo y comentario fijado pueden adaptarse; no crear tres tesis clínicas distintas.

## Salida
PUBLICATION_PACKAGE_READY es un artefacto; no cambia por sí solo el estado de content_piezas.

PREPARADO != PUBLICADO.
