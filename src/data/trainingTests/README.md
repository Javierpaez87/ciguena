# trainingTests

Carpeta para alojar exámenes en código mientras Cigüeña está en etapa demo/MVP.

## Estructura

- `types.ts`: tipos comunes de exámenes.
- `workingAtHeights.ts`: banco de preguntas de Trabajo en Altura.
- `index.ts`: registry central para buscar exámenes por `trainingId`.

## Lógica actual

- Cada training puede tener un examen.
- El banco puede tener más preguntas que las aplicadas por intento.
- Trabajo en Altura tiene 15 preguntas.
- Cada intento muestra 5 preguntas.
- Si falla intento 1, se usan preguntas 6-10.
- Si falla intento 2, se usan preguntas 11-15.
- Aprobación: 80% = 4 de 5 respuestas correctas.

Más adelante, si el Admin necesita editar exámenes desde UI, esta estructura puede migrarse a Supabase.
