import type { TrainingTest } from './types';

export const handSafetyTest: TrainingTest = {
  id: 'test_hand_safety',
  trainingId: 'tr_hand_safety',
  title: 'Examen Cuidado de Manos',
  description: 'Evaluación final del training Cuidado de Manos. Este tema no forma parte del set de 9 reglas IOGP Life-Saving Rules; se recomienda validarlo contra el video usado como contenido.',
  passingScore: 80,
  questionsPerAttempt: 5,
  maxAttempts: 3,
  attemptMode: 'sequential_blocks',
  questions: [
    {
      id: 'hs_q01',
      question: '¿Cuál es el objetivo principal del cuidado de manos?',
      options: [
        { key: 'a', text: 'Prevenir atrapamientos, cortes, golpes, quemaduras y exposición a sustancias' },
        { key: 'b', text: 'Trabajar más rápido' },
        { key: 'c', text: 'Evitar completar permisos' },
        { key: 'd', text: 'Usar siempre la misma herramienta' }
      ],
      correctOption: 'a',
    },
    {
      id: 'hs_q02',
      question: 'Antes de usar una herramienta manual, se debe:',
      options: [
        { key: 'a', text: 'Verificar que esté en buen estado y sea adecuada para la tarea' },
        { key: 'b', text: 'Elegir la más cercana' },
        { key: 'c', text: 'Usarla aunque esté dañada' },
        { key: 'd', text: 'Prestarla sin revisar' }
      ],
      correctOption: 'a',
    },
    {
      id: 'hs_q03',
      question: 'Un punto de pellizco o atrapamiento es:',
      options: [
        { key: 'a', text: 'Un lugar donde la mano puede quedar atrapada entre partes móviles o cargas' },
        { key: 'b', text: 'Una zona de descanso' },
        { key: 'c', text: 'Una etiqueta de herramienta' },
        { key: 'd', text: 'Un tipo de guante' }
      ],
      correctOption: 'a',
    },
    {
      id: 'hs_q04',
      question: 'Para proteger las manos, debo mantenerlas fuera de:',
      options: [
        { key: 'a', text: 'Líneas de fuego, puntos de pellizco y partes móviles' },
        { key: 'b', text: 'Zonas iluminadas' },
        { key: 'c', text: 'Áreas señalizadas solamente' },
        { key: 'd', text: 'Superficies limpias' }
      ],
      correctOption: 'a',
    },
    {
      id: 'hs_q05',
      question: 'Los guantes deben seleccionarse según:',
      options: [
        { key: 'a', text: 'El riesgo de la tarea y el material manipulado' },
        { key: 'b', text: 'El color preferido' },
        { key: 'c', text: 'La talla de otro compañero' },
        { key: 'd', text: 'Lo que esté más cerca' }
      ],
      correctOption: 'a',
    },
    {
      id: 'hs_q06',
      question: '¿Qué acción es insegura?',
      options: [
        { key: 'a', text: 'Usar la mano como guía cerca de una carga en movimiento' },
        { key: 'b', text: 'Identificar puntos de atrapamiento' },
        { key: 'c', text: 'Usar herramienta adecuada' },
        { key: 'd', text: 'Inspeccionar guantes' }
      ],
      correctOption: 'a',
    },
    {
      id: 'hs_q07',
      question: 'Si una herramienta está dañada, corresponde:',
      options: [
        { key: 'a', text: 'Retirarla de servicio y reportarla' },
        { key: 'b', text: 'Usarla una vez más' },
        { key: 'c', text: 'Repararla improvisadamente' },
        { key: 'd', text: 'Prestársela a otro' }
      ],
      correctOption: 'a',
    },
    {
      id: 'hs_q08',
      question: 'Al manipular sustancias químicas, la protección de manos debe considerar:',
      options: [
        { key: 'a', text: 'Compatibilidad del guante con la sustancia' },
        { key: 'b', text: 'Solo el espesor visual' },
        { key: 'c', text: 'Solo el precio del guante' },
        { key: 'd', text: 'No usar guantes para sentir mejor' }
      ],
      correctOption: 'a',
    },
    {
      id: 'hs_q09',
      question: 'Antes de colocar las manos en un área de trabajo, se debe:',
      options: [
        { key: 'a', text: 'Pensar dónde podrían moverse equipos, herramientas o materiales' },
        { key: 'b', text: 'Actuar rápido' },
        { key: 'c', text: 'Mirar solo el resultado final' },
        { key: 'd', text: 'Pedir que otro revise después' }
      ],
      correctOption: 'a',
    },
    {
      id: 'hs_q10',
      question: 'Una postura segura de manos implica:',
      options: [
        { key: 'a', text: 'Mantener dedos y manos alejados de bordes cortantes o partes móviles' },
        { key: 'b', text: 'Sostener piezas desde puntos de atrapamiento' },
        { key: 'c', text: 'Empujar con los dedos hacia una zona de corte' },
        { key: 'd', text: 'Retirar protecciones de la máquina' }
      ],
      correctOption: 'a',
    },
    {
      id: 'hs_q11',
      question: 'Las protecciones o guardas de equipos sirven para:',
      options: [
        { key: 'a', text: 'Evitar contacto con partes peligrosas' },
        { key: 'b', text: 'Molestar al operador' },
        { key: 'c', text: 'Reemplazar el entrenamiento' },
        { key: 'd', text: 'Facilitar meter la mano' }
      ],
      correctOption: 'a',
    },
    {
      id: 'hs_q12',
      question: 'Si el guante se engancha o puede engancharse en partes móviles, se debe:',
      options: [
        { key: 'a', text: 'Detenerse y aplicar el procedimiento seguro para esa tarea/equipo' },
        { key: 'b', text: 'Acercar más la mano' },
        { key: 'c', text: 'Continuar con más fuerza' },
        { key: 'd', text: 'Cambiar de mano' }
      ],
      correctOption: 'a',
    },
    {
      id: 'hs_q13',
      question: 'Una buena práctica al cortar o usar cuchillas es:',
      options: [
        { key: 'a', text: 'Cortar alejando la herramienta del cuerpo y de la otra mano' },
        { key: 'b', text: 'Cortar hacia la palma' },
        { key: 'c', text: 'Usar cuchillas sin mango' },
        { key: 'd', text: 'Apoyar la mano en la línea de corte' }
      ],
      correctOption: 'a',
    },
    {
      id: 'hs_q14',
      question: '¿Qué debe hacerse si cambia la tarea o aparece un nuevo riesgo para las manos?',
      options: [
        { key: 'a', text: 'Detenerse, reevaluar y ajustar controles' },
        { key: 'b', text: 'Continuar si falta poco' },
        { key: 'c', text: 'Guardar los guantes' },
        { key: 'd', text: 'No reportarlo' }
      ],
      correctOption: 'a',
    },
    {
      id: 'hs_q15',
      question: 'La conducta correcta para cuidar las manos es:',
      options: [
        { key: 'a', text: 'Identificar riesgos, usar herramientas/guantes adecuados y mantener manos fuera de puntos peligrosos' },
        { key: 'b', text: 'Confiar en la experiencia' },
        { key: 'c', text: 'Usar cualquier guante para todo' },
        { key: 'd', text: 'Trabajar rápido para reducir exposición' }
      ],
      correctOption: 'a',
    }
  ],
};
