import type { TrainingTest } from './types';

export const hotWorkTest: TrainingTest = {
  id: 'test_hot_work',
  trainingId: 'tr_hot_work',
  title: 'Examen Trabajo en Caliente',
  description: 'Evaluación final del training Trabajo en Caliente, alineada con la regla IOGP Life-Saving Rules: Hot Work.',
  passingScore: 80,
  questionsPerAttempt: 5,
  maxAttempts: 3,
  attemptMode: 'sequential_blocks',
  questions: [
    {
      id: 'hw_q01',
      question: 'La regla de trabajo en caliente se enfoca en controlar:',
      options: [
        { key: 'a', text: 'Materiales inflamables y fuentes de ignición' },
        { key: 'b', text: 'Solo el ruido' },
        { key: 'c', text: 'La documentación de viajes' },
        { key: 'd', text: 'El orden de herramientas únicamente' }
      ],
      correctOption: 'a',
    },
    {
      id: 'hw_q02',
      question: 'Antes de iniciar un trabajo en caliente, se debe confirmar que:',
      options: [
        { key: 'a', text: 'Los materiales inflamables fueron retirados o aislados' },
        { key: 'b', text: 'La tarea será corta' },
        { key: 'c', text: 'No hay necesidad de autorización' },
        { key: 'd', text: 'El área está concurrida' }
      ],
      correctOption: 'a',
    },
    {
      id: 'hw_q03',
      question: '¿Qué debe obtenerse antes de un trabajo en caliente cuando corresponde?',
      options: [
        { key: 'a', text: 'Autorización o permiso de trabajo' },
        { key: 'b', text: 'Una opinión informal' },
        { key: 'c', text: 'Solo una herramienta nueva' },
        { key: 'd', text: 'Una fotografía del área' }
      ],
      correctOption: 'a',
    },
    {
      id: 'hw_q04',
      question: 'En áreas peligrosas, antes de iniciar trabajo en caliente se debe confirmar:',
      options: [
        { key: 'a', text: 'Prueba de gases completada y monitoreo según corresponda' },
        { key: 'b', text: 'Que no haya viento' },
        { key: 'c', text: 'Que el turno sea diurno' },
        { key: 'd', text: 'Que haya poco personal' }
      ],
      correctOption: 'a',
    },
    {
      id: 'hw_q05',
      question: 'Una fuente de ignición puede ser:',
      options: [
        { key: 'a', text: 'Chispas, llama abierta o superficies calientes' },
        { key: 'b', text: 'Agua potable' },
        { key: 'c', text: 'Señalización' },
        { key: 'd', text: 'Documentos impresos' }
      ],
      correctOption: 'a',
    },
    {
      id: 'hw_q06',
      question: 'Si aparece material inflamable durante la tarea, se debe:',
      options: [
        { key: 'a', text: 'Detener y controlar la condición antes de continuar' },
        { key: 'b', text: 'Continuar si falta poco' },
        { key: 'c', text: 'Cubrirlo con cualquier elemento' },
        { key: 'd', text: 'Ignorarlo si no se incendió' }
      ],
      correctOption: 'a',
    },
    {
      id: 'hw_q07',
      question: 'El monitoreo de gases en trabajo en caliente sirve para:',
      options: [
        { key: 'a', text: 'Detectar atmósferas inflamables durante la tarea' },
        { key: 'b', text: 'Medir productividad' },
        { key: 'c', text: 'Controlar la temperatura corporal' },
        { key: 'd', text: 'Reemplazar el permiso' }
      ],
      correctOption: 'a',
    },
    {
      id: 'hw_q08',
      question: '¿Cuál es una acción insegura?',
      options: [
        { key: 'a', text: 'Soldar sin controlar inflamables' },
        { key: 'b', text: 'Obtener autorización' },
        { key: 'c', text: 'Retirar materiales combustibles' },
        { key: 'd', text: 'Identificar fuentes de ignición' }
      ],
      correctOption: 'a',
    },
    {
      id: 'hw_q09',
      question: 'El control de inflamables puede incluir:',
      options: [
        { key: 'a', text: 'Retirar, aislar o proteger materiales combustibles' },
        { key: 'b', text: 'Acercarlos para vigilarlos' },
        { key: 'c', text: 'Dejarlos si están ordenados' },
        { key: 'd', text: 'Cubrirlos sin evaluación' }
      ],
      correctOption: 'a',
    },
    {
      id: 'hw_q10',
      question: '¿Cuándo debe reevaluarse un trabajo en caliente?',
      options: [
        { key: 'a', text: 'Si cambian las condiciones del área o del trabajo' },
        { key: 'b', text: 'Solo al finalizar' },
        { key: 'c', text: 'Nunca durante la tarea' },
        { key: 'd', text: 'Cuando termina el turno siguiente' }
      ],
      correctOption: 'a',
    },
    {
      id: 'hw_q11',
      question: 'La autorización de trabajo en caliente ayuda a confirmar:',
      options: [
        { key: 'a', text: 'Riesgos, controles y condiciones para realizar la tarea' },
        { key: 'b', text: 'Que no se requieren controles' },
        { key: 'c', text: 'Que se puede omitir el monitoreo' },
        { key: 'd', text: 'Que la tarea no necesita supervisión' }
      ],
      correctOption: 'a',
    },
    {
      id: 'hw_q12',
      question: 'Antes de generar chispas o llama, se debe:',
      options: [
        { key: 'a', text: 'Controlar fuentes de ignición y materiales inflamables' },
        { key: 'b', text: 'Trabajar sin pausa' },
        { key: 'c', text: 'Aumentar ventilación sin medir' },
        { key: 'd', text: 'Retirar señalización' }
      ],
      correctOption: 'a',
    },
    {
      id: 'hw_q13',
      question: '¿Qué significa controlar fuentes de ignición?',
      options: [
        { key: 'a', text: 'Identificarlas y evitar que enciendan materiales o atmósferas inflamables' },
        { key: 'b', text: 'Usarlas más cerca del material' },
        { key: 'c', text: 'Apagarlas solo al final' },
        { key: 'd', text: 'Ignorarlas si son pequeñas' }
      ],
      correctOption: 'a',
    },
    {
      id: 'hw_q14',
      question: 'Si la prueba de gases indica condición no segura, corresponde:',
      options: [
        { key: 'a', text: 'No iniciar o detener el trabajo hasta controlar la condición' },
        { key: 'b', text: 'Trabajar rápidamente' },
        { key: 'c', text: 'Confiar en el olfato' },
        { key: 'd', text: 'Usar menos herramientas' }
      ],
      correctOption: 'a',
    },
    {
      id: 'hw_q15',
      question: 'La conducta correcta en trabajo en caliente es:',
      options: [
        { key: 'a', text: 'Obtener autorización, controlar inflamables/ignición y verificar atmósfera cuando aplique' },
        { key: 'b', text: 'Soldar si hay experiencia' },
        { key: 'c', text: 'Evitar el permiso para ahorrar tiempo' },
        { key: 'd', text: 'Hacer el monitoreo solo después' }
      ],
      correctOption: 'a',
    }
  ],
};
