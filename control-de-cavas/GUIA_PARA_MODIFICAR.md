# Control de Cavas — guía para encontrar el código

Esta entrega organiza los archivos existentes por temas. **No cambia el contenido del JavaScript ni del CSS**, solamente sus rutas en index.html. Conserva el orden de carga.

## ¿Dónde modificar?

- **js/tanques-fermentacion/**: fichas de tanques, FV, laboratorio y procesos.
- **js/levaduras-colectores/**: inventario, colectores, navegación y trazabilidad.
- **js/analisis/**: gráficas, indicadores, pronósticos, agua y merma.
- **js/operaciones/**: actividades operativas y aseos.
- **js/asistente-cifra/**: comportamiento y conocimiento del asistente.
- **js/datos-importacion/**: datos base, Excel, documentos e importaciones.
- **js/interfaz/**: pantalla de inicio y configuración.
- **js/nucleo-compartido/**: funciones compartidas o bloques todavía no identificados con certeza.
- **css/**: carpetas temáticas con estilos visuales.

## Reglas para editar

1. Guarda copia de la carpeta antes de editar.
2. Abre `index.html` como punto de entrada. No cambies el orden de las etiquetas `<script>` o `<link>`.
3. Algunas funciones están repartidas entre varios archivos; busca el nombre de la función en todo el proyecto si no aparece en su carpeta.
4. Las carpetas **no son módulos independientes todavía**: es una organización por tema, no una refactorización de dependencias.
5. Prueba con datos ficticios antes de usarlo con registros operativos. Si el navegador bloquea recursos locales, ejecuta un servidor local.
6. `js/datos-importacion/35-excel-cavas-seed.js` contiene un bloque grande de datos incrustados: no lo elimines ni lo edites sin revisar.

## Comprobaciones realizadas

- 77 JavaScript y 51 CSS movidos sin alterar su contenido.
- Se actualizaron todas las rutas en index.html y se comprobó que apuntan a archivos existentes.
- Se mantuvo el orden original de carga.
- **Pendiente:** pruebas completas en navegador y auditoría de dependencias.
