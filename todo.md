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

## Correcciones v1.1
- [x] Logo Balinot no visible en el sidebar — subir SVG a CDN y referenciar correctamente
- [x] Tarifas de trabajadores: los valores son precio/jornada (8h), no precio/hora — refactorizado a modelo de jornadas en toda la app

## Refactorización a jornadas (v1.2)
- [x] Renombrar costPerHour → costPerDay y salePricePerHour → salePricePerDay en schema, DB y toda la app
- [x] Actualizar la calculadora: las líneas de trabajo se introducen en jornadas, no en horas
- [x] Actualizar la UI de Equipo y tarifas: mostrar precio/jornada (no precio/hora)
- [x] Actualizar la sincronización de Clockify: convertir horas a jornadas (÷8) antes de guardar en histórico
- [x] Actualizar el histórico de proyectos: mostrar jornadas medias por tipología (no horas)
- [x] Actualizar el PDF: mostrar jornadas en el desglose de trabajo

## Correcciones v1.3
- [x] Resetear medias históricas de jornadas a 0 en el seed (no hay datos reales aún, se actualizarán desde Clockify)
- [x] Sugerencia automática de Diseño: generar DOS líneas — Rafa (fase referencial, 0.5j fija) + Enrique (diseño web, jornadas del histórico)

## Panel de datos v1.4
- [x] Nueva página /datos con dos pestañas: Clockify y Holded
- [x] Pestaña Clockify: tabla de horas por proyecto y trabajador, con filtro por tipología; tabla de medias de jornadas por trabajador
- [x] Pestaña Holded: gastos desglosados por concepto (nóminas gestión, gastos fijos, otros) con suma total
- [x] Backend: endpoint clockify.getProjectHours para obtener entradas de tiempo agrupadas por proyecto y trabajador
- [x] Backend: endpoint holded.getExpenses para obtener gastos del mes actual desde Holded
- [x] Añadir enlace "Datos" en el sidebar de navegación

## Equipo y tarifas v2.0
- [x] Actualizar datos de todos los trabajadores en BD con tarifas correctas
- [x] Añadir trabajador externo Alfonso Cala (180€/j coste, 350€/j venta)
- [x] Verificar que MWM está como externo con 270€/j coste y 405€/j venta
- [x] Eliminar "Comisión Balinot" del sistema
- [x] Ajustar comisiones: opciones "Luis" y "Comercial" (por defecto 10%, editable por presupuesto)
- [x] En calculadora: selector de comisión (ninguna / Luis / Comercial) con % editable
- [x] La comisión siempre se suma como gasto al coste total del presupuesto

## Correcciones v2.1
- [x] Alfonso Cala y MWM (externos) deben aparecer disponibles para asignar en el área de Desarrollo en la calculadora

## Correcciones v2.2
- [x] Sección Varios: mostrar todos los trabajadores internos de Balinot (no externos)
- [x] Nueva sección Branding en la calculadora: Rafa como responsable, precio cerrado (coste 1.300€ / venta 2.500€), editable como el resto
- [x] Branding disponible en cualquier tipo de proyecto (no vinculado a tipología)

## Correcciones v2.3
- [x] Branding: eliminar selector de trabajador — es un servicio a precio cerrado, no por trabajador
- [x] Branding: columnas en orden Coste primero, Venta después

## Correcciones v2.4
- [x] Eliminar "branding" de las tipologías de proyecto (project_types) en BD y frontend

## Mejoras v2.5
- [x] Formulario de cliente en BudgetEditor: añadir campos NIF, Tipo (Empresa/Persona), Dirección, Población, CP, Provincia, País, Móvil, Website (Tipo de contacto fijo: Cliente)
- [x] Ampliar schema de BD y router con los nuevos campos de cliente
- [x] Mapear correctamente todos los campos al API de Holded al crear el contacto
- [x] Buscador de cliente en Holded con autocompletado: escribir nombre → buscar en Holded → seleccionar si existe (autocompleta campos) o crear nuevo
- [x] Al guardar presupuesto: si el cliente no existe en Holded, crearlo automáticamente con todos los campos

## Correcciones v2.6
- [x] Bug: búsqueda de contactos Holded incompleta — la API no filtra por nombre, hay que traer todos los contactos con paginación completa, filtrar por nombre en servidor y devolver todos los campos disponibles
