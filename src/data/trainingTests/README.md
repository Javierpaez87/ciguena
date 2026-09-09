# trainingTests

Carpeta para alojar exámenes en código mientras Cigüeña está en etapa demo/MVP.

## Estructura

- `types.ts`: tipos comunes de exámenes.
- Cada archivo de training contiene su banco de preguntas y configuración de intentos.
- `lotoSpi.ts`: banco de 30 preguntas del training SPI LOTO · Bloqueo y Etiquetado, basado en HSE-INS-004 Rev.00.
- `index.ts`: registry central para buscar exámenes por `trainingId`.

## Lógica actual

La cantidad de preguntas e intentos es configurable por examen:

- `questionsPerAttempt`: cantidad de preguntas mostradas en cada intento.
- `maxAttempts`: máximo de intentos habilitados.
- `attemptMode: 'sequential_blocks'`: cada intento consume el siguiente bloque de preguntas del banco, sin repetir las preguntas de bloques anteriores.
- Las opciones de respuesta se muestran en orden aleatorio en `WorkerTest.tsx`.
- `WorkerTest.tsx` respeta el menor valor entre `maxAttempts` y la cantidad real de bloques disponibles en el banco.

### LOTO SPI

- Banco: 30 preguntas.
- Preguntas por intento: 10.
- Intentos máximos: 3.
- Aprobación: 80% (8 respuestas correctas de 10).
- Intento 1: preguntas 1-10.
- Intento 2: preguntas 11-20.
- Intento 3: preguntas 21-30.

## Fuente de contenido

Los exámenes deben construirse a partir del material específico de cada capacitación.

El examen `lotoSpi.ts` está redactado a partir de la presentación SPI LOTO / Bloqueo y Etiquetado basada en HSE-INS-004 Rev.00.

Los exámenes históricos de las reglas IOGP se mantienen como estaban. Más adelante, si el Admin necesita editar exámenes desde UI, esta estructura puede migrarse a Supabase.
