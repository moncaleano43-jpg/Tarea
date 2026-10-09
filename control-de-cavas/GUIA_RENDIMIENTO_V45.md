# Control de Cavas v45 · Optimización de rendimiento

## Cómo abrir

Descomprime el ZIP completo. Abre `Control_Cavas_Organizado/index.html` en Chrome. Conserva la carpeta completa, incluidos `js/`, `css/` y `assets/`.

## Qué se corrigió

- El esquema de cada hoja Excel se calcula una vez por versión de la hoja, no en cada fila o interacción.
- Las filas originales de las fuentes operativas se reutilizan sin reconstruirlas repetidamente.
- En Aseos se memorizan columnas, fechas y estados durante cada renderizado.
- La vista Semanal reutiliza sus registros normalizados mientras la fuente no cambia.
- Se indexa el historial de fermentación/maduración por lote y tanque para acelerar las búsquedas.
- Los observadores de interfaz dejan de recorrer toda la pantalla por cada cambio de texto.
- Las pantallas históricas y analíticas dejan de redibujarse automáticamente cada minuto cuando no es necesario.

## Seguridad de los datos

El código no borra almacenamiento local, capturas, borradores ni archivos Excel. Los datos guardados en el navegador dependen del origen y perfil de Chrome: haz un respaldo desde la aplicación antes de moverla a otra ruta.

## Nota sobre las pruebas

Se verificó la sintaxis de los archivos JS y se probó el renderizado en un navegador automatizado mediante HTML integrado, sin acceso directo a archivos locales. El resultado puede variar según el Mac, el tamaño de la base de datos y el almacenamiento local.
