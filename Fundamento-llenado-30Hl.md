# ¿Llenar más de 30 Hl por encima de lo habitual aumenta la merma?

**Respuesta corta:** los datos **sugieren** que sí, pero **no lo demuestran**. Con los 458 lotes de fermentación (FV) que tienen merma creíble, el efecto es pequeño, está en el borde de lo estadísticamente aceptable (p ≈ 0,07) y su intervalo de confianza incluye cero. Mi frase anterior («pasarse más de 30 Hl sube la merma») era más fuerte de lo que los datos permiten.

---

## 1. Qué se midió

- **Llenado** = Hl con que entró el lote al fermentador. En los datos coincide exactamente con el «volumen de entrada» de la hoja de merma (100 % de los lotes), así que no es un cálculo mío: es el dato registrado.
- **Llenado habitual** = mediana de cada tipo de tanque: **3.821 Hl** en los tanques normales y **4.520 Hl** en los grandes (UTK 29 a 32).
- **Exceso de llenado** = llenado − habitual de su tipo de tanque.
- **Merma** = Hl que entraron − Hl que salieron, como % del llenado. Se usaron lotes con merma entre −5 % y 15 % (24 lotes fuera de ese rango se tratan como error de medición).

Hay 74 lotes con más de 30 Hl de exceso. En promedio se llenaron **+61 Hl** (1,5 % del volumen).

## 2. Qué dicen los datos

| Comparación | Resultado |
|---|---|
| **Sin ajustar:** lotes con exceso > 30 Hl frente a lotes con exceso de ±10 Hl | 3,20 % frente a 2,19 % |
| **Ajustado:** comparando solo dentro de la misma marca y tipo de tanque | **+1.223 Hl** de más en 57 lotes (≈ 21 Hl por lote) |
| Prueba de permutación dentro de cada marca y tanque (1.000 repeticiones) | **p = 0,071** |
| Pendiente continua: puntos de merma por cada +100 Hl de llenado | **+0,16** (IC 95 % por tanque: **−0,03 a +0,38**) |

La diferencia sin ajustar (1 punto) se reduce a una fracción cuando se compara con lotes de la misma marca y el mismo tanque, porque **Light está sobrerrepresentada entre los lotes muy llenos**: es el 39 % de los lotes con exceso > 30 Hl, frente al 23 % de todos los lotes, y Light ya pierde más por sí sola.

## 3. Por qué no alcanza para afirmarlo

1. **p = 0,07 y el intervalo toca cero.** Con el criterio habitual (p < 0,05) no se puede descartar que sea casualidad.
2. **No se mantiene en el tiempo.** La pendiente fue +0,26 en la primera mitad de los lotes y +0,02 en la segunda. Desde febrero (cuando la merma bajó en toda la planta) es +0,13.
3. **No es igual en todas las marcas.** Light muestra pendiente +0,34; Estándar, prácticamente cero (−0,03), aunque sus lotes con exceso > 30 Hl pierden más a simple vista (2,83 % frente a 1,74 %, con 28 lotes frente a 94). Club Colombia solo tiene 1 lote con exceso, no se puede evaluar.
4. **Pocos datos para un efecto tan pequeño.** La variación entre lotes del mismo tipo es de ±2,1 puntos. Para detectar con 80 % de potencia un efecto de +0,16 puntos por cada 100 Hl harían falta unos **1.700 lotes**; hoy hay 458. Para detectar +0,30 harían falta unos 485.
5. **Sí es robusto a un tanque suelto.** Quitando cada tanque uno por uno, la pendiente se mantiene entre +0,12 y +0,20, así que no es un solo tanque el que lo produce. Esto es a favor del efecto, pero no cambia los puntos anteriores.

## 4. Lo que sí se puede decir

- Hay una **tendencia** a que los lotes muy llenos pierdan algo más (del orden de +0,2 puntos por cada +100 Hl; unos 20 Hl por lote en los 57 lotes comparables).
- **No hay evidencia suficiente para pedir un tope de llenado como medida firme.**
- El ahorro posible es pequeño en el mejor de los casos: unos 1.200 Hl en 9 meses (≈ 3 % de la merma de FV), no los 3.100 Hl que mostré al principio, que mezclaban marca con llenado.
- No conozco el mecanismo. Una explicación física posible (espuma o reboso por poco espacio libre en el tanque) **no se puede verificar** con estos datos: no hay registro de espuma, de nivel máximo ni de espacio libre.

## 5. Cómo comprobarlo bien

**Piloto de 6 a 8 semanas (lo más barato):**
1. Elegir 2 marcas con muchos lotes (Estándar y Light) y tanques normales.
2. Alternar lotes: uno con llenado habitual (3.820 ± 10 Hl) y otro con +40 a +60 Hl, asignados al azar o en alternancia.
3. Registrar para cada lote el volumen de entrada, el de salida y, si se puede, si hubo espuma o reboso.
4. Comparar la merma de los dos grupos con 40 lotes por grupo como mínimo.

**Datos que lo resolverían sin piloto:**
- Capacidad útil y nivel máximo de llenado de cada tanque.
- Registro de reboso o espuma durante la fermentación.
- Velocidad de llenado y temperatura de mosto.

## 6. Cambio hecho en la plataforma

La tarjeta «Volumen de llenado» ya no la presenta como causa. Solo se muestra una recomendación de tope cuando la diferencia, comparada dentro de cada marca y tanque, es estadísticamente significativa (p < 0,05). Con los datos actuales aparece como «posible factor, sin evidencia suficiente».

---

*Método: lotes FV con merma entre −5 % y 15 %; comparaciones estratificadas por marca × tamaño de tanque; pruebas de permutación (1.000) y bootstrap por tanque (1.000). Datos de 29-dic-2025 a 23-nov-2026 según el archivo cargado.*
