import type { TrainingTest } from './types';

export const confinedSpacesTest: TrainingTest = {
  id: 'test_confined_spaces',
  trainingId: 'tr_confined_spaces',
  title: 'Examen Espacios Confinados',
  description: 'Evaluación final del training Espacios Confinados, alineada con la regla IOGP Life-Saving Rules: Confined Space.',
  passingScore: 80,
  questionsPerAttempt: 5,
  maxAttempts: 3,
  attemptMode: 'sequential_blocks',
  questions: [
    {
      id: 'cs_q01',
      question: '¿Qué debe existir antes de ingresar a un espacio confinado?',
      options: [
        { key: 'a', text: 'Una autorización válida para el ingreso' },
        { key: 'b', text: 'Solo una linterna disponible' },
        { key: 'c', text: 'La presencia de cualquier compañero cerca' },
        { key: 'd', text: 'La decisión individual del trabajador' }
      ],
      correctOption: 'a',
    },
    {
      id: 'cs_q02',
      question: 'Antes de entrar a un espacio confinado, ¿qué condición debe verificarse?',
      options: [
        { key: 'a', text: 'Que el espacio esté pintado' },
        { key: 'b', text: 'Que la atmósfera sea segura o esté controlada según el procedimiento' },
        { key: 'c', text: 'Que la tarea sea rápida' },
        { key: 'd', text: 'Que no haya supervisores presentes' }
      ],
      correctOption: 'b',
    },
    {
      id: 'cs_q03',
      question: '¿Por qué se controla la atmósfera de un espacio confinado?',
      options: [
        { key: 'a', text: 'Para evitar demoras administrativas' },
        { key: 'b', text: 'Para confirmar que no existan gases peligrosos o falta de oxígeno' },
        { key: 'c', text: 'Para mejorar la iluminación' },
        { key: 'd', text: 'Para medir la temperatura exterior' }
      ],
      correctOption: 'b',
    },
    {
      id: 'cs_q04',
      question: '¿Cuál es una práctica segura durante el ingreso a un espacio confinado?',
      options: [
        { key: 'a', text: 'Entrar solo si se conoce el lugar' },
        { key: 'b', text: 'Mantener comunicación y vigilancia según el plan de trabajo' },
        { key: 'c', text: 'Cerrar el acceso para evitar interrupciones' },
        { key: 'd', text: 'Retirar los controles para facilitar la tarea' }
      ],
      correctOption: 'b',
    },
    {
      id: 'cs_q05',
      question: 'Si cambian las condiciones dentro del espacio confinado, se debe:',
      options: [
        { key: 'a', text: 'Continuar hasta terminar' },
        { key: 'b', text: 'Aumentar la velocidad de trabajo' },
        { key: 'c', text: 'Detener el trabajo, salir y reportar la situación' },
        { key: 'd', text: 'Ignorar el cambio si no hay olor' }
      ],
      correctOption: 'c',
    },
    {
      id: 'cs_q06',
      question: 'Un espacio confinado puede ser peligroso porque:',
      options: [
        { key: 'a', text: 'Siempre está al aire libre' },
        { key: 'b', text: 'Puede contener atmósferas peligrosas o restricciones de ingreso/salida' },
        { key: 'c', text: 'Siempre tiene mucho espacio para moverse' },
        { key: 'd', text: 'No requiere controles especiales' }
      ],
      correctOption: 'b',
    },
    {
      id: 'cs_q07',
      question: '¿Qué debe estar definido antes de ingresar a un espacio confinado?',
      options: [
        { key: 'a', text: 'Un plan de rescate o respuesta ante emergencia' },
        { key: 'b', text: 'La hora de almuerzo' },
        { key: 'c', text: 'El color del casco' },
        { key: 'd', text: 'La cantidad de fotografías a tomar' }
      ],
      correctOption: 'a',
    },
    {
      id: 'cs_q08',
      question: '¿Quién debe ingresar a un espacio confinado?',
      options: [
        { key: 'a', text: 'Cualquier persona disponible' },
        { key: 'b', text: 'Solo personal autorizado y competente para la tarea' },
        { key: 'c', text: 'El trabajador con más urgencia' },
        { key: 'd', text: 'Quien esté más cerca del acceso' }
      ],
      correctOption: 'b',
    },
    {
      id: 'cs_q09',
      question: '¿Qué debe hacerse con fuentes de energía o materiales peligrosos vinculados al espacio?',
      options: [
        { key: 'a', text: 'Dejarlos activos para ahorrar tiempo' },
        { key: 'b', text: 'Identificarlos y controlarlos antes del ingreso' },
        { key: 'c', text: 'Controlarlos solo después de entrar' },
        { key: 'd', text: 'Ignorarlos si no se ven' }
      ],
      correctOption: 'b',
    },
    {
      id: 'cs_q10',
      question: 'La autorización de ingreso sirve para:',
      options: [
        { key: 'a', text: 'Confirmar que se revisaron riesgos, controles y condiciones de entrada' },
        { key: 'b', text: 'Reemplazar la evaluación de riesgos' },
        { key: 'c', text: 'Permitir trabajar sin comunicación' },
        { key: 'd', text: 'Evitar el uso de equipos de protección' }
      ],
      correctOption: 'a',
    },
    {
      id: 'cs_q11',
      question: '¿Qué debe hacerse si no se puede confirmar que el espacio es seguro?',
      options: [
        { key: 'a', text: 'Ingresar por poco tiempo' },
        { key: 'b', text: 'Ingresar con más cuidado' },
        { key: 'c', text: 'No ingresar hasta que los controles estén verificados' },
        { key: 'd', text: 'Pedir que otro trabajador ingrese primero' }
      ],
      correctOption: 'c',
    },
    {
      id: 'cs_q12',
      question: 'Durante el trabajo en espacio confinado, la vigilancia externa ayuda a:',
      options: [
        { key: 'a', text: 'Controlar condiciones y responder ante emergencias' },
        { key: 'b', text: 'Acelerar el llenado de formularios' },
        { key: 'c', text: 'Reducir la necesidad de autorización' },
        { key: 'd', text: 'Evitar que se use ventilación' }
      ],
      correctOption: 'a',
    },
    {
      id: 'cs_q13',
      question: '¿Cuál de estas acciones es insegura?',
      options: [
        { key: 'a', text: 'Verificar autorización antes de ingresar' },
        { key: 'b', text: 'Entrar sin confirmar la atmósfera' },
        { key: 'c', text: 'Mantener comunicación' },
        { key: 'd', text: 'Respetar el plan de rescate' }
      ],
      correctOption: 'b',
    },
    {
      id: 'cs_q14',
      question: 'La ventilación o control de atmósfera debe usarse cuando:',
      options: [
        { key: 'a', text: 'Lo requiere el análisis de riesgos o procedimiento' },
        { key: 'b', text: 'El trabajador quiere más comodidad únicamente' },
        { key: 'c', text: 'La tarea ya terminó' },
        { key: 'd', text: 'No existe autorización' }
      ],
      correctOption: 'a',
    },
    {
      id: 'cs_q15',
      question: 'La conducta correcta ante un espacio confinado es:',
      options: [
        { key: 'a', text: 'Ingresar solo con autorización, controles verificados y plan de emergencia' },
        { key: 'b', text: 'Ingresar si el trabajo tarda poco' },
        { key: 'c', text: 'Confiar únicamente en la experiencia' },
        { key: 'd', text: 'Evitar reportar cambios para no detener la tarea' }
      ],
      correctOption: 'a',
    }
  ],
};
