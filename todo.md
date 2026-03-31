# Balinot — Calculadora de presupuestos: TODO

## Setup y assets
- [x] Inicializar proyecto web-db-user
- [x] Subir assets de branding (logos, favicon) a CDN
- [x] Configurar design system: colores Balinot, tipografía Inter (Suisse Intl fallback)

## Base de datos
- [x] Tabla workers (trabajadores con coste/hora y precio venta/hora)
- [x] Tabla project_types (tipologías de proyecto con medias históricas)
- [x] Tabla fixed_costs (gastos fijos configurables)
- [x] Tabla commissions (comisiones configurables: Luis, Balinot)
- [x] Tabla budgets (presupuestos con estado y datos de rentabilidad)
- [x] Tabla budget_lines (líneas de presupuesto por trabajador/área)
- [x] Tabla project_history (histórico de proyectos reales desde Clockify)
- [x] Migración inicial con datos de trabajadores y tipologías

## Backend (tRPC routers)
- [x] Router workers: CRUD trabajadores y tarifas
- [x] Router projectTypes: CRUD tipologías y medias históricas
- [x] Router fixedCosts: CRUD gastos fijos
- [x] Router commissions: CRUD comisiones
- [x] Router budgets: crear, editar, listar, cambiar estado
- [x] Router budgets: calcular rentabilidad en tiempo real
- [x] Router budgets: duplicar presupuesto
- [x] Router holded: enviar presupuesto como estimate
- [x] Router holded: buscar/crear contacto
- [x] Router holded: sincronizar gastos fijos desde nóminas
- [x] Router clockify: sincronizar tiempos reales por trabajador
- [x] Router clockify: actualizar medias históricas por tipología
- [x] Ruta Express /api/pdf/:id para generar PDF (versión cliente e interna)
- [x] Router llm: recomendaciones inteligentes por tipología
- [x] Router notifications: alerta propietario si margen < 20%

## Frontend — Layout y design system
- [x] Configurar colores corporativos en index.css (OKLCH)
- [x] Añadir tipografía Inter (Google Fonts) con fallback Suisse Intl
- [x] AppLayout con sidebar de navegación Balinot
- [x] Sidebar: Dashboard, Presupuestos, Nuevo presupuesto, Equipo, Histórico, Configuración
- [x] Corregir error anchor anidado en AppLayout

## Frontend — Dashboard
- [x] KPIs: total presupuestado este mes, margen medio, nº presupuestos
- [x] Gráfico de estados (borrador, enviado, aceptado, rechazado)
- [x] Lista de presupuestos recientes con semáforo de rentabilidad
- [x] Acceso rápido a "Nuevo presupuesto"

## Frontend — Calculadora de presupuestos
- [x] Datos del proyecto (nombre, cliente, tipología)
- [x] Sugerencia automática de horas al seleccionar tipología
- [x] Desglose de horas por área (SEO, Diseño, Desarrollo, Varios)
- [x] Cálculo en tiempo real: coste, precio venta, margen por línea
- [x] Gestión (40%) y comisiones (10%) configurables
- [x] Resumen con rentabilidad y semáforo visual
- [x] Guardar como borrador
- [x] Botones: PDF cliente, PDF interno, Enviar a Holded
- [x] Panel de recomendaciones LLM

## Frontend — Listado de presupuestos
- [x] Tabla con filtros por estado, fecha, cliente
- [x] Acciones: ver, editar, duplicar, enviar a Holded, descargar PDF
- [x] Cambio de estado inline

## Frontend — Gestión de equipo
- [x] Lista de trabajadores con rol, coste/hora, precio venta/hora, multiplicador
- [x] Formulario añadir/editar trabajador
- [x] Sección gastos fijos configurables
- [x] Sección comisiones configurables

## Frontend — Histórico y benchmarks
- [x] Tabla de proyectos históricos con horas reales por área
- [x] Medias actuales por tipología
- [x] Botón sincronizar con Clockify

## Frontend — Configuración de integraciones
- [x] Estado conexión Holded (test de API)
- [x] Estado conexión Clockify
- [x] Sincronización manual de gastos desde Holded

## Generación de PDF
- [x] Plantilla HTML con branding Balinot
- [x] PDF versión cliente (sin márgenes internos)
- [x] PDF versión interna (con rentabilidad completa)
- [x] Logo Balinot en cabecera del PDF

## Integraciones
- [x] Holded: crear estimate con líneas del presupuesto
- [x] Holded: buscar contacto por email/nombre
- [x] Holded: crear contacto si no existe
- [x] Holded: obtener nóminas de gestión para gastos fijos
- [x] Clockify: obtener proyectos del workspace
- [x] Clockify: obtener horas por trabajador y proyecto
- [x] Clockify: actualizar medias históricas por tipología
- [x] Seed automático de API keys en base de datos al arrancar

## LLM y alertas
- [x] Recomendaciones inteligentes por tipología de proyecto
- [x] Alerta automática al propietario si margen < 20%

## Tests
- [x] Test de autenticación (auth.logout)
- [x] Test de integración Holded API
- [x] Test de integración Clockify API
