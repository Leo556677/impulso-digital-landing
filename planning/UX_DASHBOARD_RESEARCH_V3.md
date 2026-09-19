# UX Dashboard Research V3 · Content Engine Dr. Olano

Fecha: 2026-09-19

## Objetivo
Rediseñar el Motor V2 para que la lectura de métricas sea rápida, accionable y consistente entre Orquestador, Calendario real, Chat 00, Bibliotecas, Aprendizaje y Banco editorial.

## Fuentes de mayor autoridad

### IBM Carbon Design System · Dashboards
https://carbondesignsystem.com/data-visualization/dashboards/

Decisiones aplicadas:
- jerarquía visual fuerte: lo más importante ocupa más espacio y contraste;
- limitar métricas simultáneas;
- color consistente;
- white space como separador de prioridad;
- dashboards exploratorios con drill-down en vez de exponer todo a la vez.

### Nielsen Norman Group · Progressive Disclosure
https://www.nngroup.com/articles/progressive-disclosure/

Decisiones aplicadas:
- resumen primero;
- detalle técnico bajo demanda;
- recomendaciones extensas, auditoría, snapshots y copy histórico dentro de expandibles;
- no ocultar lo frecuente: KPIs, siguiente acción y comparación por plataforma siguen visibles.

### Material / Android · Navigation Rail
https://developer.android.com/reference/kotlin/androidx/compose/material3/NavigationRail.composable

Decisiones aplicadas:
- navegación lateral persistente en escritorio;
- destinos principales siempre visibles;
- icono SVG + etiqueta;
- negocio activo visible y seleccionable.

### Material Design · Cards
https://www.mdui.org/en/design/1/components/cards.html

Decisiones aplicadas:
- cada card tiene un propósito único;
- contenido primario arriba;
- detalles secundarios expandibles;
- evitar tarjetas saturadas de texto/acciones.

### Carbon · Legends
https://carbondesignsystem.com/data-visualization/legends/

Decisiones aplicadas:
- etiquetado directo siempre que es posible;
- lenguaje explícito y menos acrónimos;
- no obligar al lector a asociar colores con leyendas innecesarias.

### Geckoboard · Dashboard design guide
https://www.geckoboard.com/resources/dashboard-design/

Decisiones aplicadas:
- tamaño y posición para establecer importancia;
- KPIs arriba;
- contexto de números;
- agrupar métricas relacionadas;
- consistencia entre plataformas y proyectos.

## Señales de comunidad UX · apoyo secundario, no canónico

### r/UXDesign · “Dashboards are fool's gold”
https://www.reddit.com/r/UXDesign/comments/1wea9e3/dashboards_are_fools_gold/

Señales observadas:
- rechazo a dashboards que intentan ser “todo para todos”;
- preferencia por resúmenes generales que conducen a acciones;
- énfasis en conocer el trabajo real del usuario antes que “hacerlo bonito”.

### r/UI_Design · overview de muchas métricas
https://www.reddit.com/r/UI_Design/comments/1s7rpen/how_to_give_a_quick_overview_of_metrics_without/

Señal observada:
- feedback repetido sobre mejorar jerarquía visual cuando la densidad vuelve lenta la lectura.

### r/userexperience · improving dashboard UX
https://www.reddit.com/r/userexperience/comments/11ju9ro/improving_the_ux_of_a_dashboard/

Señal observada:
- necesidad de definir qué historia cuenta el dashboard y si el usuario busca datos, insights o inteligencia.

Estas señales comunitarias son anecdóticas. Sirven para contrastar problemas de uso, no para reemplazar principios de diseño ni pruebas con usuarios propios.

## Arquitectura visual adoptada

1. Shell persistente:
   - negocio activo;
   - selector de negocio;
   - volver al Banco editorial;
   - destinos principales con SVG.

2. Aprendizaje:
   - Pulso ejecutivo;
   - Qué hacer ahora;
   - Proyectos medidos;
   - Comparación por plataforma;
   - Audiencia por tabs;
   - Variables creativas;
   - Voz de audiencia;
   - Evidencia: señales + hipótesis;
   - Detalle/auditoría bajo demanda.

3. Calendario:
   - integrado al mismo shell;
   - navegación persistente;
   - mantiene Semana/Servicio/Estado/Búsqueda como controles de trabajo.

## Regla de validación
El rediseño no cambia la verdad estratégica ni la causalidad. Solo cambia la presentación y navegación. Una publicación sigue sin probar por sí sola que un Hook/Rehook/CTA causó un resultado.
