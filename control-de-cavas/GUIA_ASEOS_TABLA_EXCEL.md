# Aseos · vista tipo Excel (v43)

Se ha rediseñado únicamente la presentación de Aseos en `#/aseos`. La información de Excel, los formularios por etapas, la programación de pendientes, los borradores y el historial de modificaciones siguen disponibles.

## Uso

1. Abre `index.html` y entra a **Aseos**.
2. Selecciona la hoja en las pestañas horizontales.
3. Busca por equipo, fecha u operario; filtra por estado y cambia la cantidad de filas.
4. Pulsa **Editar** para continuar el formulario por etapas, o **Historial** para consultar los cambios.
5. **Hoja completa** muestra las columnas originales y permite capturar en celdas; el borrador se guarda localmente y solo se registra como finalizado cuando tiene cierre válido.
6. Para Aseos Semanales y Mensuales, **Agenda por períodos** mantiene la programación agrupada existente.
7. **Control de pendientes** conserva la programación operativa existente.

**Notas:** La columna Turno* es informativa y se deriva de la hora de inicio; no se escribe al Excel. Los datos originales no se reescriben. Para trabajar entre dispositivos usa los mecanismos de respaldo de la plataforma.

## Archivos modificados

- `js/operaciones/51-aseos-workbench-module.js`: render y filtros, sin alterar la persistencia ni el historial.
- `css/operaciones/52-aseos-excel-v43.css`: estilos exclusivos de Aseos.
- `index.html`: referencia al nuevo CSS.

## Pruebas

Revisar búsqueda, paginación, cambios de hoja, hoja completa, formulario, historial, importación/exportación y modo oscuro.
