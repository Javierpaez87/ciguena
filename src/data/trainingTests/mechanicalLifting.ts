import type { TrainingTest } from './types';

export const mechanicalLiftingTest: TrainingTest = {
  id: 'test_mechanical_lifting',
  trainingId: 'tr_mechanical_lifting',
  title: 'Examen Izaje Mecánico Seguro',
  description: 'Evaluación final del training Izaje Mecánico Seguro, alineada con la regla IOGP Life-Saving Rules: Safe Mechanical Lifting.',
  passingScore: 80,
  questionsPerAttempt: 5,
  maxAttempts: 3,
  attemptMode: 'sequential_blocks',
  questions: [
    {
      id: 'sml_q01',
      question: 'La regla de izaje mecánico seguro exige:',
      options: [
        { key: 'a', text: 'Planificar la operación y controlar el área' },
        { key: 'b', text: 'Levantar sin planificación si la carga parece liviana' },
        { key: 'c', text: 'Caminar bajo la carga para guiarla' },
        { key: 'd', text: 'Usar cualquier equipo disponible' }
      ],
      correctOption: 'a',
    },
    {
      id: 'sml_q02',
      question: 'Antes de un izaje, debe confirmarse que:',
      options: [
        { key: 'a', text: 'Equipo y carga fueron inspeccionados y son aptos para el trabajo' },
        { key: 'b', text: 'La maniobra será rápida' },
        { key: 'c', text: 'No haya observadores' },
        { key: 'd', text: 'La carga tenga buen aspecto' }
      ],
      correctOption: 'a',
    },
    {
      id: 'sml_q03',
      question: '¿Quién debe operar equipos de izaje?',
      options: [
        { key: 'a', text: 'Personal calificado/autorizado para usar ese equipo' },
        { key: 'b', text: 'Cualquier trabajador con experiencia general' },
        { key: 'c', text: 'La persona más cercana' },
        { key: 'd', text: 'Quien tenga más fuerza' }
      ],
      correctOption: 'a',
    },
    {
      id: 'sml_q04',
      question: '¿Qué se debe hacer con el área de izaje?',
      options: [
        { key: 'a', text: 'Establecer y respetar barreras o zonas de exclusión' },
        { key: 'b', text: 'Dejar paso libre bajo la carga' },
        { key: 'c', text: 'Permitir circulación normal' },
        { key: 'd', text: 'Retirar señalización' }
      ],
      correctOption: 'a',
    },
    {
      id: 'sml_q05',
      question: 'Nunca se debe:',
      options: [
        { key: 'a', text: 'Caminar debajo de una carga suspendida' },
        { key: 'b', text: 'Inspeccionar accesorios' },
        { key: 'c', text: 'Planificar el izaje' },
        { key: 'd', text: 'Usar señales acordadas' }
      ],
      correctOption: 'a',
    },
    {
      id: 'sml_q06',
      question: 'Una carga suspendida es peligrosa porque:',
      options: [
        { key: 'a', text: 'Puede caer, balancearse o desplazarse inesperadamente' },
        { key: 'b', text: 'Siempre permanece inmóvil' },
        { key: 'c', text: 'No afecta a personas fuera del operador' },
        { key: 'd', text: 'No requiere zona de exclusión' }
      ],
      correctOption: 'a',
    },
    {
      id: 'sml_q07',
      question: '¿Qué debe verificarse en accesorios de izaje?',
      options: [
        { key: 'a', text: 'Que estén en buen estado y sean adecuados para la carga' },
        { key: 'b', text: 'Solo el color' },
        { key: 'c', text: 'Solo la marca' },
        { key: 'd', text: 'Que sean nuevos aunque no correspondan' }
      ],
      correctOption: 'a',
    },
    {
      id: 'sml_q08',
      question: 'La comunicación durante el izaje debe ser:',
      options: [
        { key: 'a', text: 'Clara y acordada entre quienes participan' },
        { key: 'b', text: 'Improvisada durante la maniobra' },
        { key: 'c', text: 'Solo por gritos' },
        { key: 'd', text: 'Innecesaria si hay experiencia' }
      ],
      correctOption: 'a',
    },
    {
      id: 'sml_q09',
      question: 'Si el plan de izaje no está claro, corresponde:',
      options: [
        { key: 'a', text: 'Detenerse y aclararlo antes de comenzar' },
        { key: 'b', text: 'Comenzar y corregir durante la maniobra' },
        { key: 'c', text: 'Levantar menos peso sin avisar' },
        { key: 'd', text: 'Pedir a cualquiera que guíe' }
      ],
      correctOption: 'a',
    },
    {
      id: 'sml_q10',
      question: '¿Qué acción es insegura?',
      options: [
        { key: 'a', text: 'Usar equipo que no fue inspeccionado' },
        { key: 'b', text: 'Controlar el área' },
        { key: 'c', text: 'Respetar barreras' },
        { key: 'd', text: 'Operar solo si se está calificado' }
      ],
      correctOption: 'a',
    },
    {
      id: 'sml_q11',
      question: 'El control del área evita que:',
      options: [
        { key: 'a', text: 'Personas ingresen a zonas donde podrían ser golpeadas por la carga' },
        { key: 'b', text: 'La carga sea identificada' },
        { key: 'c', text: 'El equipo sea revisado' },
        { key: 'd', text: 'El permiso sea completado' }
      ],
      correctOption: 'a',
    },
    {
      id: 'sml_q12',
      question: 'Antes de levantar una carga, se debe conocer:',
      options: [
        { key: 'a', text: 'Peso, centro de gravedad y método seguro de izaje según aplique' },
        { key: 'b', text: 'Solo el destino final' },
        { key: 'c', text: 'Solo quién pidió el trabajo' },
        { key: 'd', text: 'La hora de finalización' }
      ],
      correctOption: 'a',
    },
    {
      id: 'sml_q13',
      question: 'Si una persona cruza la zona de exclusión durante un izaje, se debe:',
      options: [
        { key: 'a', text: 'Detener o asegurar la maniobra hasta restablecer el control' },
        { key: 'b', text: 'Continuar para no demorar' },
        { key: 'c', text: 'Aumentar la velocidad' },
        { key: 'd', text: 'Ignorarla si está lejos' }
      ],
      correctOption: 'a',
    },
    {
      id: 'sml_q14',
      question: '¿Cuál es una práctica segura?',
      options: [
        { key: 'a', text: 'Inspeccionar carga, equipo y accesorios antes de izar' },
        { key: 'b', text: 'Ubicarse bajo la carga para verla mejor' },
        { key: 'c', text: 'Usar accesorios dañados solo una vez' },
        { key: 'd', text: 'Levantar sin señalero cuando hace falta' }
      ],
      correctOption: 'a',
    },
    {
      id: 'sml_q15',
      question: 'La conducta correcta en izaje mecánico es:',
      options: [
        { key: 'a', text: 'Planificar, inspeccionar, operar por personal calificado y respetar exclusiones' },
        { key: 'b', text: 'Confiar en que la grúa puede con todo' },
        { key: 'c', text: 'Improvisar la maniobra' },
        { key: 'd', text: 'Permitir paso bajo la carga' }
      ],
      correctOption: 'a',
    }
  ],
};
