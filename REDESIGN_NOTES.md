# Impulso Digital — Rediseño landing 2026-09-02

## Estado
Rama de trabajo: `redesign-landing-20260902`.

La rama `main` y la landing pública no se modifican hasta aprobación final.

## Objetivos implementados en V1
- Reemplazar la landing antigua del autoresponder por la home general de Impulso Digital.
- Eliminar countdown, `Solo hoy`, precios tachados y claims de resultado agresivos.
- Mostrar los cuatro servicios confirmados: Web, Marca, Social y Agenda.
- Mostrar precios y mensualidades con transparencia.
- Incorporar paquetes Presencia, Conversión y 360.
- Incorporar orientador interactivo sin base de datos.
- Parametrizar el mensaje de WhatsApp según servicio/paquete.
- Reescribir FAQ con objeciones reales y límites de alcance.
- Aplicar identidad visual oficial: Anton + Montserrat y paleta #E6007E / #F2385A / #FF6A00 / #262626 / #FFFFFF / #F5F5F7.
- Mantener Meta Pixel y TikTok Pixel, pero cargarlos únicamente tras consentimiento de analítica.
- No enviar nombres, teléfonos, correos ni texto privado del usuario como parámetros de píxel.
- Añadir `robots.txt` y `sitemap.xml`.

## Datos comerciales usados
- WhatsApp: +51 910 838 451.
- Atención: lunes a viernes, 09:00–21:00.
- CTA: COTIZA POR WHATSAPP.
- Web temporal: https://impulso-digital-landing.vercel.app/
- Instagram: https://www.instagram.com/impulsodigita.l/
- Facebook: https://www.facebook.com/impulsodigitalaz/
- TikTok: https://www.tiktok.com/@impulso.digitalaz

## Activos exactos pendientes de incorporar al repositorio
Los archivos originales fueron aportados en el proyecto, pero deben subirse como binarios al repositorio antes de publicar para conservarlos exactamente.

Nombres sugeridos:
- `img/logo-impulso-digital.png`
- `img/servicio-landing.png`
- `img/servicio-marca.png`
- `img/servicio-social.png`
- `img/servicio-agenda.png`

Hasta incorporar esos archivos, la V1 utiliza recursos visuales CSS de reemplazo. No deben considerarse sustitutos del logo maestro ni de las imágenes comerciales aprobadas.

## Legal pendiente antes de producción
No inventar:
- razón social / nombre legal del proveedor;
- RUC si corresponde;
- texto definitivo de política de privacidad;
- términos y condiciones;
- política de cambios/cancelaciones/reembolsos;
- implementación aplicable del Libro de Reclamaciones.

El footer deja estos elementos como pendientes y no simula cumplimiento legal.

## Próximo QA antes de publicar
1. Incorporar activos gráficos exactos.
2. Revisar móvil y escritorio.
3. Verificar todos los CTA y textos de WhatsApp.
4. Probar el orientador.
5. Verificar consentimiento y eventos de Meta/TikTok en entorno de prueba.
6. Añadir información legal confirmada.
7. Revisar Lighthouse/Core Web Vitals.
8. Comparar visualmente con la landing pública antes de fusionar a `main`.
