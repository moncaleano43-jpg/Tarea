# Control de Cavas · Informe de hallazgos del análisis

Reúne todo lo que se encontró al analizar los datos del archivo (Excel de control de proceso, agua, aseos, trasiegos y recuperación; datos hasta el 9 de octubre de 2026). Cada cifra sale de los datos cargados; todo son **asociaciones**, no causas comprobadas. Al final hay un apartado de **correcciones**: cosas que dije antes y resultaron equivocadas o exageradas.

---

## 1. Lo más importante (resumen)

1. **El 75 % de la merma de fermentación no tiene origen registrado.** Las purgas explican solo el 25 %.
2. **La merma bajó de 3,6 % a 2,2 % desde la semana del 2 de febrero**, en todas las marcas (≈ 2.700 Hl al mes). Nadie sabe aún qué cambió.
3. **Casi toda la variación de la merma entre lotes es ruido de medición** (±81 Hl por lote): no depende de tanque, día, semana, levadura ni ninguna otra variable medida.
4. **Light** pierde 3,5 % frente a 1,9 % de las demás marcas (≈ 6.600 Hl). **Estándar en tanques grandes** pierde 3,0 % frente a 1,6 % en los normales.
5. **Entre el 70 y el 80 % de los lotes pasa más tiempo del permitido en el fermentador** y la fermentación a 75 % tarda 17–34 h más de lo que pide la hoja de especificaciones. Equivale a unos 5 lotes al mes de capacidad (≈ 20.000 Hl).
6. **Agua:** los aseos registrados explican solo el 13–14 % del medidor, y el «m³ por aseo» es un **cálculo**, no una lectura. Los aseos de **red de mosto, anillos, red de cerveza y red de trasiego** arrastran de 5 a 12 veces más agua de la que anotan (≈ 22.900 m³, 27 % del total).
7. **Velocidad de fermentación:** la afectan el tamaño del tanque, la generación y el pH de la levadura, los días que se guarda antes de usarla y el recuento de células a las 3 h.
8. **Recuperación de cerveza:** esperar más de 84 h baja el rendimiento de ~71 % a ~58 %.
9. **Trasiegos:** el retraso lo explica **el mes** (febrero a abril), no la marca, el tanque ni la hora.
10. Falta registrar sobre todo la **temperatura de fermentación de cada tanque**, el **lote de malta y adjuntos**, la **causa de cada retraso** y el **contador de agua por aseo**.

---

## 2. Merma de fermentación (FV)

- **Volumen:** 43.796 Hl perdidos (2,44 %) sobre 458 lotes con merma creíble (se excluyeron 24 con saldo fuera de −5 % a 15 %, tomados como error de medición).
- **Sin explicar:** 32.753 Hl (75 %) no están en ninguna purga. En 2026, 95 % de los lotes tiene alguna purga registrada, pero casi siempre pequeña.
- **Marcas:** Light 3,5 % frente a 1,9 % de las otras en los mismos tanques (≈ 6.641 Hl); Azteca algo por encima (≈ 436 Hl).
- **Tanques grandes (UTQ 29 a 32, ≈ 4.520 Hl):** Estándar pierde 3,0 % frente a 1,6 % en tanques normales (≈ 4.824 Hl). Light no muestra diferencia por tamaño.
- **Cambio de nivel:** semana del **2 de febrero de 2026**, de 3,6 % a 2,2 % (p = 0,005); en todas las marcas (Estándar 3,3 → 1,9, Light 4,7 → 3,4, Azteca 3,3 → 2,5, Club Colombia 3,2 → 2,1). Las purgas por lote también bajaron (41 → 22 Hl). Puede ser mejora real o recalibración.
- **Ruido de medición:** entre lotes iguales (misma marca y tamaño de tanque) la merma varía ±81 Hl (±2,1 puntos), del mismo orden que la merma típica de un lote (≈ 93 Hl). El 11 % de los lotes tiene merma negativa. Una fuga real se repetiría en el mismo tanque, y no se repite.
- **Factores que NO la explican** (ya descontadas marca y tamaño de tanque): generación, viabilidad y consistencia de la levadura, días guardada, horas a 75 %, atenuación, extracto original, tiempo de llenado, volumen, día de la semana, hora del cierre, aseo previo del tanque, cambio de marca en el tanque, días de reposo, tanque individual. Tampoco las variables nuevas del Excel (oxígeno, temperatura del mosto, recuento de células, amargor, color, temperatura de siembra, presión).
- **Persistencia:** la merma de un lote no se parece a la del anterior en el mismo tanque ni a la del mismo día.
- **Llenado por encima de lo habitual (+30 Hl):** tendencia, pero **sin evidencia suficiente**. Ajustado por marca y tanque son ≈ 1.223 Hl en 57 lotes con p = 0,07; la pendiente (+0,16 puntos por cada +100 Hl) tiene intervalo de −0,03 a +0,38; la primera mitad de los lotes muestra +0,26 y la segunda +0,02. Harían falta unos 1.700 lotes para detectar un efecto así. Detalle en `Fundamento-llenado-30Hl.md`.
- **FV y SV del mismo lote** se compensan un poco (ρ = −0,22). Merma FV 2,24 %, SV −0,11 %, total ≈ 2,1 %.
- **Maduración (SV):** no es confiable. Las purgas registradas son 8 veces la merma y en el 47 % de los lotes «gana» volumen. No se usa para decidir.

## 3. Tanques (semáforo de merma)

- Se compara cada lote con lo esperado por su marca y tamaño; el estado mira los últimos 8 lotes: *Vigilar* ≥ 2 errores estándar, *Revisar* ≥ 3.
- Un lote suelto no significa nada (±81 Hl). Con ~30 tanques, 1 o 2 en *Vigilar* son normales por azar.
- Con los datos de hoy: **TQ 24 y TQ 2 en «Vigilar»** (+1,6 puntos sobre lo esperado en sus últimos 8 lotes). En un periodo de 90 días apareció TQ 10 con evidencia fuerte. **Ningún tanque se separa con evidencia sólida en todo el histórico.**
- **Velocidad por tanque:** los tanques grandes fermentan ≈ 5,8 h más rápido; **TQ 14 es el más lento (+7,3 h)**; TQ 1 y TQ 2 también algo lentos.
- **Ocupación:** el núcleo de 21 tanques FV trabaja al 77 % con una estancia mediana de 10,3–10,6 días y ≈ 1 día entre lotes. **Nueve tanques casi no se usan** (3, 6, 8, 9, 12, 15, 18, 23, 26). La maduración (SV) está al 26–27 % con 3,7 días de estancia: **el cuello de botella es la fermentación, no la maduración.**

## 4. Estancia en el fermentador frente a la hoja de especificaciones

- «Tiempo máx en FV»: 240 h Estándar, 220 h Light, 240 h Azteca y Club Colombia. **70–80 % de los lotes se pasa**, con un exceso mediano de 17 a 35 h. En el periodo suman 628 días-tanque, ≈ 5,8 lotes al mes (≈ 22.000 Hl) que el núcleo no puede llenar (si hubiera mosto y demanda).
- La mediana de retraso de los trasiegos es de pocas horas, así que **no es espera de trasiego**: coincide con que la fermentación tarda más de lo pedido.
- **«Rata fermentación» (horas a 75 %):** cumplen solo 0–4 % de las fermentaciones. Mediana real 95 h Estándar (límite 72–78), 90 h Light (65–73), 98 h Azteca (59–65), 67 h Club Colombia (50–56). Hay que confirmar **desde qué momento cuenta la hoja esas horas** (llenado o tiempo cero).
- **Sensibilidad:** cada día menos de estancia en el núcleo liberaría ≈ 5,2–5,4 lotes al mes (≈ 20.000 Hl); 0,3 días menos entre lotes, ≈ 1,5 lotes. Solo se gana si hay mosto y demanda.

## 5. Fermentación y levadura

**Velocidad (horas hasta 75 % de atenuación), controlando los demás factores a la vez (R² = 0,23, 462 fermentaciones):**

| Factor | Efecto |
|---|---|
| Fermentar en tanque grande | −5,9 h (±1,8) |
| Una generación más de levadura | −1,1 h (±0,4) |
| +0,1 de pH de la levadura | −1 h (±0,3) |
| Un día más guardada la levadura | +0,6 h (±0,4) |
| +1 millón de células/ml a las 3 h | menos horas (efecto pequeño por unidad) |
| +1 de color (EBC) del mosto | −1 h (±0,5) |

- El efecto de la generación **no** se explica por el tamaño del tanque, la marca ni el tiempo; se repite en cada marca. La levadura más vieja no fermenta más lento; si acaso, más rápido. El mecanismo no se conoce.
- El 26 % de los lotes se siembra con levadura de más de 3 días.
- **Arranque (horas hasta 15 %), R² = 0,12:** más oxígeno del mosto se asocia a un arranque **más lento** (+0,9 h por ppm), al revés de lo esperado; conviene revisar cómo y dónde se mide. También +0,3 h por día guardada la levadura.
- **Extracto final:** el amargor tiene un efecto pequeño (≈ −0,15 °P por +10 BU, R² = 0,05). Cerca de un tercio de lo que queda cambia **por semana** (no por tanque): probablemente lote de malta/adjuntos o laboratorio, que no están en el Excel.
- **Viabilidad:** baja 0,42 puntos por generación (ρ = −0,64) pero se mantiene alta (≈ 94,9 % en generación 9). El 18 % de los cultivos queda bajo la meta de 95 %. **La viabilidad no se relaciona con la velocidad** (ρ ≈ 0). En la práctica la levadura se retira hacia la generación 6,7 y 94,6 % de viabilidad.
- **Familias de levadura:** las de menor viabilidad (Q, E, S) son también las de mayor generación: la diferencia es de edad, no de familia.
- **Extracto original del mosto:** muy controlado (desviación ≈ 0,05 °P); no afecta a nada de lo medido.
- **Cambios en el tiempo:** abril fue el mes más lento (+3,9 h); desde mediados de agosto hay un cambio de −3,4 h (p = 0,04).
- **Cumplimiento por marca:** extracto original en especificación 90–100 %; extracto final 12–50 %; tiempo a 75 % 0–4 %.

## 6. Agua (87.915 m³ en 2026 hasta el 9 de oct.)

- **Componentes:** Pisos 31 %, CIP 35 %, GEA 34 %. Mediana 100 m³ por turno; 94 % de los turnos entre 65 y 138 m³.
- **Turnos pico:** el 10 % de los turnos con más consumo (≥ 180 m³) gasta el 20 % del agua; el exceso sobre 138 m³ por turno suma ≈ 8.641 m³ (10 %). El exceso viene de GEA (+64 m³) y Pisos (+52 m³).
- **Pisos y GEA suben juntos** (ρ = 0,97): probablemente el mismo evento (CIP GEA de una red junto con lavado de pisos).
- **Los aseos registrados explican solo el 13–14 %** del agua del medidor (11.848 de 87.915 m³). El «m³ por aseo» tiene correlación 1,00 con caudal × minutos: es un cálculo.
- **Qué actividad mueve el agua** (modelo diario, R² = 0,42): por aseo de **red de mosto ≈ 33 m³** (anota 6), **anillos ≈ 39** (anota 5), **red de cerveza ≈ 52** (anota 4,4), **red de trasiego ≈ 34** (anota 4,8). Suman ≈ 22.900 m³ (27 %). Red de siembra, red de cosecha, centrífuga y fermentadores casi no pesan.
- **Base sin actividad:** unos 170 m³ por día no dependen de ninguna actividad registrada (pisos, servicios, posibles fugas). Un aforo nocturno lo aclararía.
- **Sin efecto:** día de la semana (p = 0,24), turno (p = 0,60), número de trasiegos del día, producción (ρ ≈ 0,09).
- **Tendencia:** el CIP sube ≈ 23 % frente a los primeros meses mientras los aseos por turno bajan de 4,4 a 3,2: el agua por aseo está aumentando. Septiembre y octubre son los meses de menor consumo.
- **Relación con aseos:** cada aseo adicional por turno se asocia a ≈ 14 m³ más; con 6 aseos o más el turno llega a ≈ 155 m³. Pero **el número de aseos ya no predice el agua diaria** (R² = 0,07 en los últimos 90 días).
- **Operarios** (agua por aseo frente a lo normal del mismo equipo): de −8 % a +9 %, diferencia real, pero todo el exceso suma ≈ 478 m³, **0,5 % del agua**. No es donde está el agua. Además 28–40 % de los aseos no tiene operario y los nombres están escritos de varias formas.
- **Equipos con más agua anotada:** red de siembra, centrífuga, red de cosecha, anillos 29-32 y 30-31 (suman 45 % del agua anotada en aseos).

## 7. Recuperación de cerveza

- 12.658 Hl recuperados en 68 recuperaciones (≈ 29 % de la merma de FV); rendimiento ponderado 66 %. **Pendiente confirmar si la merma de FV ya descuenta esta cerveza.**
- El 47 % pasó de 72 h. **Más espera = menor rendimiento** (ρ = −0,44, p = 0,006): de ≈ 71–73 % a ≈ 57–58 % con más de 84 h. Recuperar rápido habría rescatado ≈ 600 Hl más.
- Levadura procesada: ρ = −0,25 (más levadura, menor rendimiento). Agua añadida, agua por Hl de levadura, pH, temperatura y UTK 19 frente a 20: sin relación clara.
- Solo 38 de 68 recuperaciones tienen horas registradas; con tan pocos registros un efecto pequeño no se detectaría.

## 8. Trasiegos

- **57–62 %** termina con más de 2 h de retraso; mediana de retraso ≈ 3,4 h; duración casi fija (8,4 h): el retraso viene de que **empiezan tarde**.
- **Solo el mes explica el retraso:** medianas de 10 h (febrero), 19 h (marzo) y 18 h (abril), frente a 0–5 h desde mayo. No hay diferencia por hora planeada, día de la semana, marca, tanque de origen o destino.
- **89–95 % de los trasiegos retrasados no tiene causa registrada.**
- El retraso no se relaciona con la merma del lote.

## 9. Proyección y qué tan confiable es

- **Próximos 30 días (si todo sigue igual):** merma FV ≈ 4.800 Hl (error típico ±13 %); agua ≈ 7.600 m³ (±7 %).
- Conocer marca y tamaño de tanque baja el error de la merma mensual de ≈ 17–21 % a ≈ 13 %.
- Para agua conviene proyectar con el promedio reciente.

## 10. Dónde está lo que todavía no vemos (qué dato ayudaría)

Para cada resultado se mide qué parte de la variación sin explicar se parece entre lotes del mismo tanque, día, semana o mes (prueba de permutación, p ≈ 0,002):

| Resultado | Dónde está lo que falta | Dato que ayudaría |
|---|---|---|
| Velocidad de fermentación | Compartido el mismo día (33 %); el tanque casi no importa (3 %) | **Temperatura de fermentación de cada tanque y enfriamiento** (la hoja la pide pero no hay lecturas); quién y en qué turno llena |
| Extracto final | Por día (37 %) y semana (32 %); no por tanque | **Lote de malta y adjuntos; calibración y analista del laboratorio** |
| Estancia en fermentador | Por día (52 %) y semana (40 %) | Motivo de cada estancia; hora real en que termina la fermentación activa |
| Retraso de trasiegos | Por día (73 %) y semana (46 %) | Causa de cada retraso; disponibilidad de tanque o UTK |
| Agua diaria | Semana (13 %) | Plan de producción y de aseos por turno; **contador por zona y por aseo** |
| Merma y arranque | **Sin estructura** (ruido) | Solo mejora **midiendo mejor**: método, hora y calibración de cada lectura de volumen |

Completitud de los datos (últimos 12 meses): causa del retraso de trasiego 6 %; etanol de la levadura 18 %; producción por turno 53 %; horas hasta recuperar 58 %; operario del aseo 71 %; m³ por aseo 75 %; volumen de cada purga 95 %.

## 9b. Datos de proceso que SÍ trae el Excel

La hoja B.D FERMENTACIÓN registra, con 97–100 % de cobertura: temperatura y oxígeno del mosto de cada cocimiento, aire (g/Hl), temperatura de siembra, presión de llenado, número de cocimientos, amargor (BU), color (EBC), pH del mosto, factor de dosificación y recuento de células a las 3 h. El análisis ya los usa.

## 11. Preguntas para planta

1. ¿Qué se hizo distinto la semana del 2 de febrero (la merma bajó de 3,6 % a 2,2 % en toda la planta)?
2. ¿Desde qué momento cuenta la hoja las horas de «Rata fermentación»: llenado o tiempo cero?
3. ¿Sigue vigente el «Tiempo máx en FV» de la hoja? 70–80 % de los lotes se pasa.
4. ¿La merma de FV ya descuenta la cerveza recuperada?
5. ¿Qué pasaba entre febrero y abril con los trasiegos y qué cambió desde mayo?
6. ¿Los tanques de uso bajo (3, 6, 8, 9, 12, 15, 18, 23, 26) se reservan para otro uso?
7. ¿El «m³ por aseo» se mide con contador o se calcula?
8. ¿Qué hacen distinto los tanques grandes (29 a 32)?
9. ¿Cómo y dónde se mide el oxígeno del mosto? (más oxígeno se asocia a arranque más lento)
10. ¿El recuento de células a las 3 h se hace siempre con el mismo método?
11. ¿Quién mide el pH de la levadura y con qué frecuencia?

## 12. Experimentos propuestos

1. **Levadura fresca:** levadura de ≤ 2 días en la mitad de los lotes de cada marca durante 4–6 semanas.
2. **Temperatura de fermentación:** lectura cada 6 h por tanque durante 8 semanas.
3. **Dos métodos de medición:** 10 lotes medidos con dos métodos (flujo y nivel) a la entrada y salida.
4. **Contador en las redes:** leer contador al iniciar y terminar cada aseo de red de mosto, anillos, red de cerveza y red de trasiego, 2 semanas.
5. **Oxígeno y arranque:** variar la aireación dentro del rango habitual en lotes alternos de la misma marca.
6. **Malta y laboratorio:** anotar lote de malta/adjuntos y quién y con qué equipo mide el extracto final.

## 13. Correcciones: cosas que dije y no eran del todo ciertas

| Lo que dije | Qué resultó |
|---|---|
| «Pasarse de +30 Hl sube la merma» | Sin evidencia suficiente (p = 0,07, intervalo incluye cero); la diferencia bruta se debía a la marca Light. |
| Atenuación, extracto final y RDF relacionados con la merma (ρ ≈ 0,3) | Era un efecto de marca; ajustado desaparece. |
| La viabilidad y el tiempo de llenado afectan la velocidad | Se confunden con la generación de la levadura y el tamaño del tanque. |
| «El 70 % del extracto final cambia por semana» | Era un artefacto: lotes aún en fermentación. Recalculado con lotes cerrados: ≈ 32–35 %. |
| «No se registran temperatura del mosto, oxígeno ni células sembradas» | **Falso:** el Excel ya los trae (97–100 %); el programa no los leía. Lo que sí falta es la temperatura de fermentación del tanque. |
| Aseos de red arrastran «5 a 8 veces» más agua | El rango real es 5–12 veces, y solo en red de mosto, anillos, red de cerveza y red de trasiego. |
| Efecto de la generación de la levadura «0,7 h por generación» | Con el modelo ampliado es ≈ 1,1 h por generación. |

## 14. Limitaciones

- Todo son **asociaciones**; no se probó causalidad.
- La capacidad «liberada» supone que hay mosto y demanda para llenar los tanques.
- Los lotes aún en el tanque no tienen cierre, por eso la ocupación de la última semana no se calcula.
- Recuperación tiene pocos registros (68); un efecto pequeño no se detectaría.
- El modelo de velocidad deja ≈ 77 % de la variación sin explicar; el de agua, ≈ 58 %.
- Hay filas con fecha futura en el archivo (1 de maduración, 2 de aseos): probablemente errores de captura.
- Fermentación y recuperación tienen datos más antiguos que agua y trasiegos (hasta el 30 sep y el 18 sep).

## 15. Dónde está todo en la plataforma

En **Análisis** (abre en el *Informe del analista*): Informe del analista, Resumen semanal, Dónde actuar, Tanques, Qué afecta a qué, Simulador, Proceso y levadura (más las pestañas originales). Además: tarjeta en Inicio, campana de alertas, estado de merma en cada ficha de fermentador y seis preguntas nuevas para Cifra. Detalle técnico en `GUIA_ANALISIS_V46.md`.
