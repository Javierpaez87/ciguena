import type { TrainingTest } from './types';

export const workingAtHeightsTest: TrainingTest = {
  id: 'test_working_at_heights',
  trainingId: 'tr_working_at_heights',
  title: 'Examen Trabajo en Altura',
  description: 'Evaluación final del training Trabajo en Altura.',
  passingScore: 80,
  questionsPerAttempt: 5,
  maxAttempts: 3,
  attemptMode: 'sequential_blocks',
  questions: [
    {
      id: 'wah_q01',
      question: '¿Cuál es el principal riesgo al trabajar en altura?',
      options: [
        { key: 'a', text: 'Golpes de calor' },
        { key: 'b', text: 'Caídas de personas' },
        { key: 'c', text: 'Ruido excesivo' },
        { key: 'd', text: 'Polvo' },
      ],
      correctOption: 'b',
    },
    {
      id: 'wah_q02',
      question: 'Antes de utilizar el equipo de protección contra caídas, se debe:',
      options: [
        { key: 'a', text: 'Guardarlo' },
        { key: 'b', text: 'Prestarlo a un compañero' },
        { key: 'c', text: 'Inspeccionarlo' },
        { key: 'd', text: 'Pintarlo' },
      ],
      correctOption: 'c',
    },
    {
      id: 'wah_q03',
      question: '¿Qué debe verificarse durante la inspección del arnés?',
      options: [
        { key: 'a', text: 'Color únicamente' },
        { key: 'b', text: 'Etiquetas, costuras y estado general' },
        { key: 'c', text: 'Marca comercial' },
        { key: 'd', text: 'Antigüedad del usuario' },
      ],
      correctOption: 'b',
    },
    {
      id: 'wah_q04',
      question: 'Las herramientas y materiales deben asegurarse para:',
      options: [
        { key: 'a', text: 'Evitar pérdidas económicas' },
        { key: 'b', text: 'Facilitar el transporte' },
        { key: 'c', text: 'Evitar caídas de objetos' },
        { key: 'd', text: 'Reducir el peso' },
      ],
      correctOption: 'c',
    },
    {
      id: 'wah_q05',
      question: 'Si se trabaja fuera de una zona protegida, se debe:',
      options: [
        { key: 'a', text: 'Trabajar más rápido' },
        { key: 'b', text: 'Utilizar siempre puntos de anclaje autorizados' },
        { key: 'c', text: 'Retirar el arnés' },
        { key: 'd', text: 'Pedir ayuda solamente' },
      ],
      correctOption: 'b',
    },
    {
      id: 'wah_q06',
      question: 'Un punto de anclaje autorizado es:',
      options: [
        { key: 'a', text: 'Cualquier estructura disponible' },
        { key: 'b', text: 'Un elemento diseñado y aprobado para soportar cargas de caída' },
        { key: 'c', text: 'Una baranda improvisada' },
        { key: 'd', text: 'Una herramienta pesada' },
      ],
      correctOption: 'b',
    },
    {
      id: 'wah_q07',
      question: '¿Cuándo debe inspeccionarse el equipo de protección contra caídas?',
      options: [
        { key: 'a', text: 'Una vez al año' },
        { key: 'b', text: 'Antes de cada uso' },
        { key: 'c', text: 'Solo cuando parezca dañado' },
        { key: 'd', text: 'Después del trabajo' },
      ],
      correctOption: 'b',
    },
    {
      id: 'wah_q08',
      question: '¿Qué puede ocurrir si una herramienta no está asegurada?',
      options: [
        { key: 'a', text: 'Nada' },
        { key: 'b', text: 'Puede caer y lesionar a personas' },
        { key: 'c', text: 'Mejora la productividad' },
        { key: 'd', text: 'Reduce el riesgo' },
      ],
      correctOption: 'b',
    },
    {
      id: 'wah_q09',
      question: '¿Cuál de las siguientes acciones es segura?',
      options: [
        { key: 'a', text: 'Utilizar un anclaje no identificado' },
        { key: 'b', text: 'Trabajar sin arnés' },
        { key: 'c', text: 'Revisar el equipo antes de usarlo' },
        { key: 'd', text: 'Lanzar herramientas al suelo' },
      ],
      correctOption: 'c',
    },
    {
      id: 'wah_q10',
      question: 'El uso correcto de los puntos de anclaje ayuda a:',
      options: [
        { key: 'a', text: 'Reducir el riesgo de caídas' },
        { key: 'b', text: 'Aumentar la velocidad de trabajo' },
        { key: 'c', text: 'Evitar inspecciones' },
        { key: 'd', text: 'Ahorrar equipos' },
      ],
      correctOption: 'a',
    },
    {
      id: 'wah_q11',
      question: '¿Qué se debe hacer si el equipo presenta daños?',
      options: [
        { key: 'a', text: 'Utilizarlo igualmente' },
        { key: 'b', text: 'Repararlo de forma improvisada' },
        { key: 'c', text: 'Retirarlo de servicio y reportarlo' },
        { key: 'd', text: 'Ignorarlo' },
      ],
      correctOption: 'c',
    },
    {
      id: 'wah_q12',
      question: '¿Quién es responsable de inspeccionar su equipo antes de usarlo?',
      options: [
        { key: 'a', text: 'El supervisor únicamente' },
        { key: 'b', text: 'El trabajador que lo utilizará' },
        { key: 'c', text: 'El área administrativa' },
        { key: 'd', text: 'El proveedor' },
      ],
      correctOption: 'b',
    },
    {
      id: 'wah_q13',
      question: '¿Por qué es importante asegurar materiales y herramientas?',
      options: [
        { key: 'a', text: 'Para mantener el orden únicamente' },
        { key: 'b', text: 'Para evitar accidentes por caída de objetos' },
        { key: 'c', text: 'Para ahorrar tiempo' },
        { key: 'd', text: 'Para facilitar la limpieza' },
      ],
      correctOption: 'b',
    },
    {
      id: 'wah_q14',
      question: '¿Qué elemento forma parte de la protección contra caídas?',
      options: [
        { key: 'a', text: 'Arnés de seguridad' },
        { key: 'b', text: 'Escoba' },
        { key: 'c', text: 'Linterna' },
        { key: 'd', text: 'Extintor' },
      ],
      correctOption: 'a',
    },
    {
      id: 'wah_q15',
      question: 'La conducta correcta al trabajar en altura es:',
      options: [
        { key: 'a', text: 'Utilizar equipos inspeccionados y puntos de anclaje autorizados' },
        { key: 'b', text: 'Confiar únicamente en la experiencia' },
        { key: 'c', text: 'Trabajar sin protección en tareas breves' },
        { key: 'd', text: 'Omitir revisiones para ahorrar tiempo' },
      ],
      correctOption: 'a',
    },
  ],
};
