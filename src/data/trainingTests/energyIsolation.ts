import type { TrainingTest } from './types';

export const energyIsolationTest: TrainingTest = {
  id: 'test_energy_isolation',
  trainingId: 'tr_energy_isolation',
  title: 'Examen Aislamiento de Energía',
  description: 'Evaluación final del training Aislamiento de Energía, alineada con la regla IOGP Life-Saving Rules: Energy Isolation.',
  passingScore: 80,
  questionsPerAttempt: 5,
  maxAttempts: 3,
  attemptMode: 'sequential_blocks',
  questions: [
    {
      id: 'ei_q01',
      question: 'Antes de comenzar un trabajo con energía peligrosa, se debe:',
      options: [
        { key: 'a', text: 'Verificar aislamiento y energía cero' },
        { key: 'b', text: 'Trabajar más rápido' },
        { key: 'c', text: 'Retirar candados existentes' },
        { key: 'd', text: 'Confiar en que el equipo está apagado' }
      ],
      correctOption: 'a',
    },
    {
      id: 'ei_q02',
      question: '¿Qué significa identificar las fuentes de energía?',
      options: [
        { key: 'a', text: 'Reconocer todas las energías que pueden causar daño' },
        { key: 'b', text: 'Elegir la fuente más cercana' },
        { key: 'c', text: 'Revisar solo la energía eléctrica' },
        { key: 'd', text: 'Preguntar quién encendió el equipo' }
      ],
      correctOption: 'a',
    },
    {
      id: 'ei_q03',
      question: 'Una fuente de energía peligrosa puede ser:',
      options: [
        { key: 'a', text: 'Solo electricidad' },
        { key: 'b', text: 'Energía eléctrica, mecánica, hidráulica, neumática, térmica o almacenada' },
        { key: 'c', text: 'Solo combustible' },
        { key: 'd', text: 'Solo presión atmosférica' }
      ],
      correctOption: 'b',
    },
    {
      id: 'ei_q04',
      question: 'Después de aislar una fuente de energía, corresponde:',
      options: [
        { key: 'a', text: 'Verificar energía cero antes de intervenir' },
        { key: 'b', text: 'Retirar etiquetas para evitar confusión' },
        { key: 'c', text: 'Comenzar sin probar' },
        { key: 'd', text: 'Abrir la protección de inmediato' }
      ],
      correctOption: 'a',
    },
    {
      id: 'ei_q05',
      question: 'El bloqueo y etiquetado ayuda a:',
      options: [
        { key: 'a', text: 'Evitar la reenergización no autorizada' },
        { key: 'b', text: 'Hacer más visible el equipo solamente' },
        { key: 'c', text: 'Reducir la limpieza' },
        { key: 'd', text: 'Eliminar la necesidad de permiso' }
      ],
      correctOption: 'a',
    },
    {
      id: 'ei_q06',
      question: '¿Qué debe hacerse con energía residual o almacenada?',
      options: [
        { key: 'a', text: 'Ignorarla si el equipo está apagado' },
        { key: 'b', text: 'Liberarla, contenerla o controlarla según procedimiento' },
        { key: 'c', text: 'Aumentarla para probar el equipo' },
        { key: 'd', text: 'Dejarla para el final' }
      ],
      correctOption: 'b',
    },
    {
      id: 'ei_q07',
      question: '¿Cuál es una acción insegura en aislamiento de energía?',
      options: [
        { key: 'a', text: 'Colocar bloqueo autorizado' },
        { key: 'b', text: 'Verificar energía cero' },
        { key: 'c', text: 'Retirar un bloqueo ajeno sin autorización' },
        { key: 'd', text: 'Identificar fuentes de energía' }
      ],
      correctOption: 'c',
    },
    {
      id: 'ei_q08',
      question: 'Si no se puede confirmar energía cero, se debe:',
      options: [
        { key: 'a', text: 'Continuar con cuidado' },
        { key: 'b', text: 'No comenzar hasta verificar el control de energía' },
        { key: 'c', text: 'Pedir que otro trabajador pruebe' },
        { key: 'd', text: 'Trabajar solo sobre una parte del equipo' }
      ],
      correctOption: 'b',
    },
    {
      id: 'ei_q09',
      question: '¿Quién debe respetar los bloqueos y etiquetas?',
      options: [
        { key: 'a', text: 'Solo mantenimiento' },
        { key: 'b', text: 'Toda persona involucrada o cercana al trabajo' },
        { key: 'c', text: 'Solo supervisores' },
        { key: 'd', text: 'Solo operadores externos' }
      ],
      correctOption: 'b',
    },
    {
      id: 'ei_q10',
      question: 'El aislamiento efectivo requiere:',
      options: [
        { key: 'a', text: 'Apagar desde un botón únicamente' },
        { key: 'b', text: 'Aislar, bloquear, etiquetar y verificar' },
        { key: 'c', text: 'Avisar verbalmente sin registrar' },
        { key: 'd', text: 'Desconectar una parte visible solamente' }
      ],
      correctOption: 'b',
    },
    {
      id: 'ei_q11',
      question: '¿Para qué se prueba la ausencia de energía?',
      options: [
        { key: 'a', text: 'Para confirmar que el equipo no puede liberar energía peligrosa' },
        { key: 'b', text: 'Para ahorrar herramientas' },
        { key: 'c', text: 'Para evitar hacer el permiso' },
        { key: 'd', text: 'Para registrar la temperatura' }
      ],
      correctOption: 'a',
    },
    {
      id: 'ei_q12',
      question: 'Una etiqueta de aislamiento indica:',
      options: [
        { key: 'a', text: 'Que el equipo puede usarse libremente' },
        { key: 'b', text: 'Que existe una condición de control que no debe alterarse sin autorización' },
        { key: 'c', text: 'Que el trabajo terminó' },
        { key: 'd', text: 'Que no hay riesgos' }
      ],
      correctOption: 'b',
    },
    {
      id: 'ei_q13',
      question: 'Antes de retirar un bloqueo, debe verificarse que:',
      options: [
        { key: 'a', text: 'La tarea y las condiciones permiten retirar el control de forma segura' },
        { key: 'b', text: 'El turno está por terminar' },
        { key: 'c', text: 'El equipo parece limpio' },
        { key: 'd', text: 'No haya nadie mirando' }
      ],
      correctOption: 'a',
    },
    {
      id: 'ei_q14',
      question: '¿Cuál es el objetivo principal del aislamiento de energía?',
      options: [
        { key: 'a', text: 'Prevenir lesiones por liberación inesperada de energía' },
        { key: 'b', text: 'Acelerar la producción' },
        { key: 'c', text: 'Reducir documentación' },
        { key: 'd', text: 'Evitar capacitaciones' }
      ],
      correctOption: 'a',
    },
    {
      id: 'ei_q15',
      question: 'La conducta correcta antes de intervenir un equipo es:',
      options: [
        { key: 'a', text: 'Identificar energías, aislar, bloquear, etiquetar y verificar energía cero' },
        { key: 'b', text: 'Apagar y comenzar' },
        { key: 'c', text: 'Preguntar si alguien vio riesgos' },
        { key: 'd', text: 'Usar guantes y no aislar' }
      ],
      correctOption: 'a',
    }
  ],
};
