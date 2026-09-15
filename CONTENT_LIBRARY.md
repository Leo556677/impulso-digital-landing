# Biblioteca de contenido

Nueva sección privada en `biblioteca-contenido.html`, enlazada desde el panel. Reutiliza Supabase y RLS existentes; no requiere migración ni cambios de privilegios. El portal anterior continúa disponible.

## Uso
Iniciar sesión y seleccionar la marca. Importar el expediente JSON de Content Engine 1.1, comprobar la vista previa y confirmar su aprobación. Solo entonces se inserta. La biblioteca relee y compara el texto con SHA-256. `sync_key` usa el índice único existente por negocio para evitar duplicados. Ante conflicto con texto diferente se exige una revisión; no se sobrescribe la pieza anterior.

Filtros combinables: negocio objetivo, servicio, miedo/objeción/deseo, objetivo, temperatura, relación previa, familia/ID de hook, estado y fechas de registro. Búsqueda sin tildes. Vista tarjeta/tabla, detalle con guion, ruta, fuentes, aprobación, versiones vinculadas y contenido relacionado. Exportación de historial filtrado para continuidad. Los datos antiguos sin clasificación no se infieren ni modifican.

## Contrato
`metadata.content_engine_v1` contiene schema_version 1.1, service_id, target_business, topic_type, topic_id, topic_option, audience_relationship, script_version, script_sha256, proposal_group_id, approval (text/context/approved_at/recorded_at), sources, production_route (time/speech/visual/action), production_checklist, production_pending, audit_summary. Las palabras habladas de la ruta concatenadas con dos saltos coinciden con master_script. Fechas originales desconocidas permanecen null. approved_at de la tabla antigua conserva su semántica de registro al importar.

No hay generación de imágenes, clasificación por IA, publicación automática ni editor que sobrescriba versiones. Las coincidencias de etiquetas no son detección semántica de repetición. El estado de producción se lee del registro; no hay botón que finja grabación o publicación. Las revisiones pueden importarse con parent_content_id validado contra el negocio autorizado. Un usuario con rol de lectura no importa.

## Validación
`node --test tests/content-library.test.mjs`
Pruebas cubren intersección de filtros, negocios con varios servicios, legado sin clasificar, aislamiento en relacionadas, fechas, URLs, aprobación, integridad de guion y ruta. Comprobación visual con Playwright y sesión simulada se registra por separado; no equivale a prueba autenticada de producción.

## Límites
El portal necesita sesión real del usuario para la escritura, no un ID de creador inferido por el agente. No se ha modificado la UI antigua que puede editar guiones sin esta trazabilidad; usar la nueva sección para el flujo 1.1. El frontend no constituye una barrera contra administradores que editen directamente la base. Cambios concurrentes durante una exportación paginada requieren volver a consultar para obtener una instantánea actualizada.
