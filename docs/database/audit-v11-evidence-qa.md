# Cigüeña · Auditoría V1.1 · Patch 1 (QA)

## Objetivo

Proteger contra modificaciones posteriores las tablas de evidencia de auditoría ya existentes, sin cambiar el funcionamiento actual de los exámenes. Abarca **todos** los trainings que invocan `record_training_test_attempt_audited`, incluidos Protección de Manos M1/M2.

## Archivos y alcance

- `supabase/migrations/20261028010000_audit_v11_evidence_immutability.sql`: añade triggers BEFORE UPDATE/DELETE y reafirma la prohibición de escrituras directas de usuarios de aplicación en las tres tablas de auditoría.
- `supabase/qa/20261028_verify_audit_evidence_v11.sql`: consultas de solo lectura para comprobar triggers, permisos y coherencia de resultados por intento.
- Este documento de aplicación y pruebas.

No modifica certificados, asignaciones, firmas, Storage, frontend ni emails. Los registros existentes se conservan.

## Aplicación en QA

1. Confirmar en la consola de Supabase que está seleccionada **`qa-ciguena` (PREVIEW)**, no `main (PRODUCTION)`.
2. Ejecutar la migración SQL en SQL Editor de QA. Los `DROP TRIGGER IF EXISTS` solo reemplazan los tres triggers específicos de este patch. Puede aparecer una advertencia de SQL destructivo por esos `DROP`; verificar la rama antes de continuar.
3. Ejecutar `supabase/qa/20261028_verify_audit_evidence_v11.sql`. Deben aparecer 3 triggers habilitados; la consulta de permisos directos no debe devolver INSERT/UPDATE/DELETE/TRUNCATE para `anon` o `authenticated`.
4. Rendir un examen en QA como worker, tanto aprobado como desaprobado si es posible. Repetir la consulta 3 y comprobar `CONSISTENT_WITH_RECORDED_DATA`, IDs y timestamps.
5. Probar que el certificado siga emitiéndose en el flujo vigente y que una segunda evaluación use el intento esperado. Registrar resultados antes de considerar producción.

## Prueba negativa opcional (solo QA, controlada)

No realizar `UPDATE`/`DELETE` destructivos de forma manual sobre registros reales. Para confirmar el rechazo en una transacción que se revierte, un operador autorizado puede ejecutar el siguiente bloque adaptando el ID de una respuesta de QA:

```sql
BEGIN;
UPDATE public.training_test_audit_answers SET question_text = question_text WHERE id = '<QA_ANSWER_UUID>'::uuid;
ROLLBACK;
```

Se espera error SQLSTATE 42501. Si el bloque falla, terminar con `ROLLBACK;` si el editor mantiene abierta la transacción. **No usar esta prueba en producción.**

## Alcance de seguridad y limitaciones

- Los triggers evitan UPDATE y DELETE normales aunque un rol reciba permisos de modificación por error. El dueño de la base o un operador con privilegios de DDL puede deshabilitar triggers: no es inmutabilidad absoluta.
- La V1 ya asigna timestamps del servidor (`created_at`, `recorded_at`) y valida que el usuario autenticado pertenece a la asignación en su RPC. Este patch no modifica ese flujo.
- La V1 **todavía confía en las respuestas correctas y el puntaje derivados del payload del cliente**. El reporte verifica coherencia de lo almacenado, no autenticidad independiente.
- **No protege todavía** emisión de certificados ni `training_assignments`; eso requiere el Patch 2 con cambios coordinados frontend/backend para evitar romper capacitaciones en curso.
- No incorpora historial de correcciones administrativas. Si es requerido, se agregará un evento separado sin editar evidencia histórica.
- No genera una marca de tiempo externa ni prueba inviolabilidad frente a operadores privilegiados.

## Reversión (solo QA)

Si la QA revela un bloqueo inesperado y se decide revertir este patch, ejecutar en **QA**, tras revisión:

```sql
BEGIN;
DROP TRIGGER IF EXISTS training_test_audit_versions_immutable ON public.training_test_audit_versions;
DROP TRIGGER IF EXISTS training_test_audit_attempts_immutable ON public.training_test_audit_attempts;
DROP TRIGGER IF EXISTS training_test_audit_answers_immutable ON public.training_test_audit_answers;
DROP FUNCTION IF EXISTS public.reject_training_test_audit_mutation();
COMMIT;
```

Los permisos de escritura a roles de aplicación ya estaban revocados por la V1; no es necesario reabrirlos.
