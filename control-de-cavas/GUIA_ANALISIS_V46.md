# Análisis v46 · guía de las pestañas nuevas

Todo lo nuevo está en **Análisis**, se calcula en vivo con los datos cargados y respeta el periodo y la marca elegidos arriba (salvo donde se indica «todo el histórico»).

## Pestañas

| Pestaña | Para qué sirve | Archivo |
|---|---|---|
| **Resumen semanal** | Última semana frente a la anterior, alertas, tanques por vigilar y acciones. Se imprime / guarda en PDF o se copia como texto. | `js/analisis/71g-plan-semana-js.js` |
| **Dónde actuar** | Plan en orden, palancas de merma y agua, qué cambió, qué no explica la merma, recuperación, aseos, trasiegos, proyección y datos que faltan. | `71b-plan-reduccion-js.js`, `71c-plan-profundo-js.js` |
| **Tanques** | Cada fermentador: semáforo de merma, ocupación, velocidad y estancia frente a la hoja de especificaciones. También agrega «Merma de este tanque» a la ficha de cada FV. | `71d-plan-tanques-js.js` |
| **Simulador** | Mueve palancas y ve lotes, Hl y m³ por mes; con precios, lo convierte en pesos. | `71f-plan-simulador-js.js` |
| **Proceso y levadura** | Velocidad según la generación, viabilidad, cambios en el tiempo y cumplimiento por marca. | `71e-plan-proceso-js.js` |

Estilos: `css/analisis/36-plan-reduccion-css.css`. El orden de carga está en `index.html` (71b → 71g); respétalo, cada archivo usa lo que exporta el anterior (`App.PlanBase`).

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

## Valores en pesos
En «Simulador» se registran el valor de 1 Hl de cerveza, el margen de 1 Hl vendido y el costo de 1 m³ de agua. Se guardan **solo en el navegador** donde se escriben y se usan también en «Dónde actuar» y «Resumen semanal».

## Limitaciones que conviene recordar
- Todo son **asociaciones**, no causas comprobadas.
- La capacidad que se «libera» supone que hay mosto y demanda para llenar los tanques.
- Los lotes que siguen en el tanque no tienen cierre; por eso la ocupación de la última semana no se calcula.
- El balance de maduración (SV) no es confiable (casi la mitad de los lotes «gana» volumen): no se usa para decidir.
- Hay filas con fecha futura en el archivo (1 de maduración, 2 de aseos): probablemente errores de captura.
- La proyección de merma y agua tiene un error típico de ±7 % a ±13 % al mes; bajarlo exige datos nuevos (ver «Qué datos faltan»).
