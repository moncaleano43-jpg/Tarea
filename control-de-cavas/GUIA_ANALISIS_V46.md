# Análisis v46 · guía de las pestañas nuevas

Todo lo nuevo está en **Análisis**, se calcula en vivo con los datos cargados y respeta el periodo y la marca elegidos arriba (salvo donde se indica «todo el histórico»).

## Pestañas

| Pestaña | Para qué sirve | Archivo |
|---|---|---|
| **Hallazgos y guía** | Informe, fundamento del llenado y esta guía, legibles en el programa. | `71k-plan-hallazgos-js.js` |
| **Informe del analista** | Lo que revisaría un analista cada día: qué cambió desde la última visita, lo más importante hoy, dónde está la variación que todavía no se explica y qué dato nuevo ayudaría a predecir mejor, experimentos propuestos, preguntas para planta (con notas) y resumen copiable para la reunión. | `js/analisis/71i-plan-analista-js.js` |
| **Resumen semanal** | Última semana frente a la anterior, alertas, tanques por vigilar y acciones. Se imprime / guarda en PDF o se copia como texto. | `js/analisis/71g-plan-semana-js.js` |
| **Dónde actuar** | Plan en orden, palancas de merma y agua, qué cambió, qué no explica la merma, recuperación, aseos, trasiegos, proyección y datos que faltan. | `71b-plan-reduccion-js.js`, `71c-plan-profundo-js.js` |
| **Tanques** | Cada fermentador: semáforo de merma, ocupación, velocidad y estancia frente a la hoja de especificaciones. También agrega «Merma de este tanque» a la ficha de cada FV. | `71d-plan-tanques-js.js` |
| **Simulador** | Mueve palancas y ve cuántos lotes, Hl y m³ por mes se ganan. | `71f-plan-simulador-js.js` |
| **Qué afecta a qué** | Mapa de factores contra resultados (merma, arranque, velocidad, extracto final, estancia), efecto en horas de cada factor, qué actividades mueven el agua, qué explica el retraso de trasiegos y qué influye en la recuperación. | `71h-plan-factores-js.js` |
| **Proceso y levadura** | Velocidad según la generación, viabilidad, cambios en el tiempo y cumplimiento por marca. | `71e-plan-proceso-js.js` |

## Dónde más aparece el análisis (integración con el programa)
- **Análisis** abre por defecto en el **Informe del analista**.
- **Inicio:** tarjeta «Informe del analista» con las alertas del análisis y las 3 acciones que más importan, además del «Pulso de la planta» que ya existía (que también recoge los hallazgos nuevos).
- **Campana de alertas** (arriba a la derecha): suma las alertas del análisis (tanques por vigilar, cambios de merma, picos de agua, retrasos de trasiego, datos sin actualizar). No suenan ni avisan: solo se listan y cuentan.
- **Tanques:** cada ficha de fermentador muestra «Merma: En línea / Vigilar / Revisar» con su % y Hl frente a lo esperado; al tocarla abre el análisis. La ficha de cada FV también tiene su bloque de merma.
- **Cifra (asistente):** responde «¿Qué tanques hay que vigilar?», «¿Cómo va el tanque 24?», «¿Qué afecta la velocidad de fermentación?», «¿Qué datos ayudarían a predecir mejor?», «¿Cuántos lotes ganamos si bajamos un día la estancia?» y «¿Qué haría un analista hoy?». Se agregó un gancho en el motor (`App.CifraExt`) para que otros módulos sumen preguntas sin tocar el resto.
- Archivos: `js/analisis/78-plan-integracion-js.js` (se carga al final) y el gancho en `js/asistente-cifra/72-…` y `73-…`.

## Datos de proceso que ya trae el Excel
La hoja **B.D FERMENTACIÓN** ya registra, con 97–100 % de cobertura: temperatura y oxígeno del mosto de cada cocimiento, aire (g/Hl), temperatura de siembra, presión de llenado, número de cocimientos, amargor (BU), color (EBC), pH del mosto, factor de dosificación y recuento de células a las 3 h. `js/analisis/70-datos-proceso-js.js` los lee de las columnas originales (se actualiza solo al cargar un Excel nuevo) y el análisis los usa. Lo que **no** está en el Excel: temperatura de fermentación de cada tanque, lote de malta y adjuntos, causa de cada retraso de trasiego y lectura de contador por aseo.

Estilos: `css/analisis/36-plan-reduccion-css.css`. El orden de carga está en `index.html` (70, 71b → 71i y 78 al final); respétalo, cada archivo usa lo que exporta el anterior (`App.PlanBase`).

## Cómo leer el semáforo de un tanque
- Se compara la merma real de cada lote con la **esperada para su marca y tamaño de tanque**. Si hubo un cambio de nivel en la planta (p. ej. 2-feb-2026), lo esperado se calcula con los lotes posteriores.
- El estado mira los **últimos 8 lotes** (mínimo 6): *Vigilar* ≥ 2 errores estándar sobre lo esperado, *Revisar* ≥ 3, *Mejor de lo esperado* ≤ −2.
- Un lote suelto varía ±80 Hl sin que signifique nada. Con ~30 tanques, 1 o 2 en *Vigilar* son normales por azar.

## Reglas y umbrales que se pueden cambiar
| Qué | Dónde | Valor actual |
|---|---|---|
| Merma creíble (se excluye lo demás como error de medición) | `fvHist` en `71c` | −5 % a 15 % |
| Semáforo de tanque | `engine` en `71d` | 8 lotes; 2 y 3 errores estándar |
| Tanque «grande» | `fvHist` en `71c` | > 8 % sobre la mediana de volumen de los tanques |
| Cambio de nivel de la merma | `cambioMerma` en `71c` | prueba de permutación p < 0,05 y ≥ 0,4 puntos |
| Alertas de agua, trasiegos, recuperación y datos viejos | `alertas` en `71g` | 5 / 4 turnos pico por semana; mediana de retraso ≥ 8 h; ≥ 3 de 6 recuperaciones > 84 h; datos con más de 7 días de atraso |
| Meta de viabilidad de levadura | meta `levadura.viabMin` | 95 % |
| Límites de especificación (tiempo máx. en FV, etc.) | hoja ESPECIFICACIONES MARCA del Excel | se leen solos |

## Lo que sí y lo que no afecta (con los datos actuales)
- **Velocidad de fermentación:** la afectan el tamaño del tanque (grandes ≈ 5 h más rápido), la generación de la levadura (≈ 1 h menos por generación), el pH de la levadura (≈ 1 h menos por +0,1), los días que se guarda la levadura antes de usarla (≈ 0,6 h más por día), el recuento de células a las 3 h (más células, más rápido) y el color del mosto.
- **Arranque (horas a 15 %):** se asocia a más oxígeno del mosto con arranque **más lento** (≈ +0,9 h por ppm); conviene revisar cómo se mide.
- **Extracto final:** el amargor tiene un efecto pequeño (≈ −0,15 °P por +10 BU); cerca de un tercio de lo que queda cambia por semana (probablemente lote de malta o laboratorio).
- **No se ve efecto** sobre la merma de ninguno de los factores medidos (levadura, tiempos, volumen, aseo previo, extracto original).
- **Agua:** los aseos de red de mosto, anillos, red de cerveza y red de trasiego arrastran de 5 a 12 veces más agua de la que anotan; el «m³ por aseo» es un cálculo (caudal × minutos), no una lectura.
- **Retraso de trasiegos:** solo lo explica el mes (febrero a abril), no la marca, el tanque ni la hora.
- **Recuperación:** solo las horas de espera (y, con menos fuerza, la cantidad de levadura procesada) se relacionan con el rendimiento.

## Cómo funciona «Dónde está lo que todavía no vemos»
Para cada resultado (velocidad, arranque, extracto final, merma, estancia, retraso de trasiegos, agua diaria) se descuenta lo que ya se explica (marca, tamaño de tanque, factores medidos) y se mide qué parte de lo que queda **se parece entre lotes del mismo tanque, día, semana o mes** (ω², con prueba de permutación). Una parte alta en un grupo indica que algo cambia con ese grupo y no se registra; sin estructura indica ruido de medición. Sirve para decidir qué dato nuevo registrar primero.
Las notas y casillas de «Preguntas que llevaría a planta» y la comparación «Desde la última visita» se guardan **solo en el navegador** donde se usan.

## Limitaciones que conviene recordar
- Todo son **asociaciones**, no causas comprobadas.
- La capacidad que se «libera» supone que hay mosto y demanda para llenar los tanques.
- Los lotes que siguen en el tanque no tienen cierre; por eso la ocupación de la última semana no se calcula.
- El balance de maduración (SV) no es confiable (casi la mitad de los lotes «gana» volumen): no se usa para decidir.
- Hay filas con fecha futura en el archivo (1 de maduración, 2 de aseos): probablemente errores de captura.
- La proyección de merma y agua tiene un error típico de ±7 % a ±13 % al mes; bajarlo exige datos nuevos (ver «Qué datos faltan»).

## Hallazgos y guía (dentro del programa)
La pestaña **Hallazgos y guía** muestra el informe de hallazgos, el fundamento de la prueba de llenado (+30 Hl) y esta guía, para revisarlos sin salir del programa (con botón de imprimir/PDF). Es una foto del 9-oct-2026: se regenera desde los .md con el script que crea `71k-datos-hallazgos.js`. Las comprobaciones con cálculo en vivo (merma FV–SV del mismo lote, aseo previo, calidad del mosto, viabilidad vs velocidad y prueba completa del llenado) están al final de **Qué afecta a qué**, en «Más comprobaciones» (`71j-plan-comprobaciones-js.js`).

## Capa visual premium
`css/diseno-general/60-premium-css.css` y `js/interfaz/79-premium-js.js` agregan fondo animado (orbes y burbujas), tarjetas de cristal, aparición escalonada, contadores, barra de progreso y botones con brillo. Son solo decoración: si se quitan sus dos líneas de `index.html`, el programa vuelve a verse como antes. Respeta «reducir movimiento» del sistema.

## Capa «wow» (noche cervecera)
`css/diseno-general/61-wow-css.css` y `js/interfaz/80-wow-js.js`: intro animada (una vez por sesión; clic para saltarla; `?nointro` la desactiva), tema oscuro por defecto, portada animada en Inicio, tanques y colectores dibujados como recipientes con líquido y burbujas animadas (nivel según el volumen), inclinación 3D y luz que sigue al cursor. Solo presentación: quitar sus dos líneas de `index.html` la desactiva.

### Tarjetas de tanque y semáforos
Cada tarjeta de FV/SV muestra el avance hacia la recolección, el volumen, la levadura, el llenado y varios **cuadros de color por especificación** (el color llena todo el cuadro, sin dibujo de semáforo): **verde** = dentro de parámetros, **amarillo** = cerca del límite, **rojo** = fuera. El borde de la tarjeta toma el peor estado. En Levaduras, las cosechas y los colectores se pintan completos con el color de su estado.
- **Cosecha:** la ventana que ya usa el programa (T0 → +12 h verde, +12 → +24 h amarillo, pasado +24 h rojo; gris si aún no hay T0; verde si ya se registró).
- **Tiempo en FV:** horas desde el llenado frente a «Tiempo max en FV» de la hoja de especificaciones de la marca; amarillo desde 85 % del máximo.
- **E.O.:** extracto original frente a su banda (inf–sup); amarillo en el 20 % exterior de la banda a cada lado.
- **Temp.:** temperatura frente a la banda de fermentación (solo si hay dato).
- **Maduración (SV):** horas frente al mínimo.
Las franjas «casi sale» son las constantes `CERCA` (0,20) y `CERCA_MAX` (0,85) en `js/interfaz/80-wow-js.js`. El tiempo en FV usa la hora actual del equipo: con un Excel atrasado saldrá en rojo de más. En Levaduras, cada cosecha y cada colector usan su propio estado del programa, también como semáforo.

## Acabado «Apple»
`css/diseno-general/62-apple-css.css` y `js/interfaz/81-apple-js.js`: negro profundo con tarjetas gris Apple, tipografía del sistema (SF en equipos Apple, Inter en el resto), barra superior de cristal fino, portada centrada con el tanque como producto que se reduce al hacer scroll, cifras grandes, botones píldora con azul de sistema, enlaces con «›», tanques y colectores con acabado de acero y menú con iconos tipo SF Symbols. Quitar esas líneas de `index.html` revierte solo este acabado.

### Detalle de tanque y marca de Cifra
En la pantalla de cada FV/SV: cabecera tipo producto (tanque metálico con el nivel real, semáforos por especificación en cuadros de color completo), navegación de secciones en píldora de cristal, tareas del turno y ventana de cosecha con el color llenando cada cuadro. El logo de Cifra pasó a `assets/cifra-logo.svg` (C de líquido ámbar con chispa azul sobre fondo negro); se aplica en `css/asistente-cifra/99-cifra-core-brand.css`. Para volver al anterior, borrar esa última regla.
