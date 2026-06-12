# trainingTests

Carpeta para alojar exámenes en código mientras Cigüeña está en etapa demo/MVP.

## Estructura

- `types.ts`: tipos comunes de exámenes.
- `workingAtHeights.ts`: banco de preguntas de Trabajo en Altura. **No modificado en esta actualización.**
- `handSafety.ts`: banco de preguntas de Cuidado de Manos.
- `confinedSpaces.ts`: banco de preguntas de Espacios Confinados.
- `energyIsolation.ts`: banco de preguntas de Aislamiento de Energía.
- `lineOfFire.ts`: banco de preguntas de Línea de Fuego.
- `mechanicalLifting.ts`: banco de preguntas de Izaje Mecánico Seguro.
- `hotWork.ts`: banco de preguntas de Trabajo en Caliente.
- `workAuthorization.ts`: banco de preguntas de Autorización de Trabajo.
- `bypassControls.ts`: banco de preguntas de Bypass de Controles de Seguridad.
- `safeDriving.ts`: banco de preguntas de Conducción Segura.
- `index.ts`: registry central para buscar exámenes por `trainingId`.

## Lógica actual

- Cada training puede tener un examen.
- Cada examen tiene 15 preguntas.
- Cada intento muestra 5 preguntas.
- Si falla intento 1, se usan preguntas 6-10.
- Si falla intento 2, se usan preguntas 11-15.
- Aprobación: 80% = 4 de 5 respuestas correctas.

## Fuente de contenido

Los exámenes de las reglas IOGP se construyeron como preguntas propias, en español, alineadas a los conceptos de IOGP Life-Saving Rules / Report 459, WorkCard y Start Work Checks.

`handSafety.ts` no corresponde a una de las 9 IOGP Life-Saving Rules formales; queda incluido porque existe como training del catálogo, pero conviene validarlo contra el video/material específico que se use como contenido.

Más adelante, si el Admin necesita editar exámenes desde UI, esta estructura puede migrarse a Supabase.
