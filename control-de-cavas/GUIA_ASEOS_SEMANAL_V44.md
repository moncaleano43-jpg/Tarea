# Control de Cavas v44 · Aseos Semanal

## Qué se añadió

En **Aseos → Semanal** hay cinco opciones de lectura: **Matriz** (predeterminada), **Calendario**, **Estados**, **Tabla** y **Hoja completa** (editor original de v43).

- **Matriz**: equipos/líneas en filas, días de lunes a domingo en columnas. Cada celda indica el estado y el número de registros; al pulsarla se abre el detalle con **Editar** e **Historial**.
- **Calendario**: cruza los siete días con los tres turnos (00–08, 08–16 y 16–24); permite abrir el detalle de cada día/turno.
- **Estados**: columnas con pendientes, programados, en curso, finalizados, por revisar y borradores.
- **Tabla**: lista de registros de la semana con paginación.
- **Hoja completa**: conserva la tabla original, las celdas editables y el guardado de v43. Esta vista muestra el histórico, no solo la semana seleccionada.

Se mantienen la búsqueda, el filtro de estado, el historial, los formularios, los borradores, la importación/exportación Excel y los demás módulos.

## Fuente y reglas de visualización

Se usa **exclusivamente la hoja «2. Semanal»** del libro de Aseos, incluyendo cambios/capturas ya guardados por la plataforma. No se añaden registros ficticios ni se escribe en el almacenamiento desde las nuevas vistas.

- Fecha de ubicación: **fecha programada**, o fecha de inicio cuando no hay programación.
- Turno: estimación por la hora de la fecha anterior. No modifica el turno original.
- Finalizado: hay hora de fin, o el Excel indica expresamente «REALIZADO», «FINALIZADO», «COMPLETADO» o «EJECUTADO».
- En curso: hay hora de inicio sin finalización registrada.
- Pendiente: la fecha programada pasó y no existe confirmación de finalización, o el estado fuente indica pendiente.
- Por revisar: el Excel indica «URGENTE», «VENCIDO», «REVISAR» o hay fecha final anterior al inicio.
- Programado: fecha futura sin ejecución confirmada.
- Borrador: captura local sin finalizar.

Los registros sin una fecha válida siguen disponibles en **Hoja completa**; no se ubican artificialmente en un día.

La vista abre en la **semana actual** si hay registros. Si no, abre en la última semana con registros anterior a hoy, o la primera disponible. Los controles permiten avanzar/retroceder, volver a esta semana o saltar a la última semana con registros.

## Archivos de esta mejora

- `js/operaciones/53-aseos-semanal-v44.js`: visualizaciones, controles y lectura de registros.
- `css/operaciones/53-aseos-semanal-v44.css`: estilos específicos para Semanal.
- `index.html`: agrega las referencias a los dos archivos anteriores.

**No se modificaron los archivos JavaScript existentes ni el contenido de la fuente Excel.**

## Pruebas y precauciones

- Verificación estática de sintaxis con `node --check`.
- Pruebas unitarias con el libro de ejemplo: lectura de fechas, agrupación por semanas, estados y generación de las cuatro vistas.
- Verificación de integridad del ZIP y referencias locales.
- **Prueba visual y guardado real pendientes**: el navegador automatizado del entorno bloqueó la navegación local. Antes de reemplazar tu copia de trabajo, abre `index.html` en Chrome, verifica Semanal y haz un respaldo de tus registros locales.

La versión HTML independiente sirve para abrir sin descomprimir carpetas, pero el visor integrado de ChatGPT puede bloquear scripts o almacenamiento.
