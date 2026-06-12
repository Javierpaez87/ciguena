import type { TrainingTest } from './types';

export const lineOfFireTest: TrainingTest = {
  id: 'test_line_of_fire',
  trainingId: 'tr_line_of_fire',
  title: 'Examen Línea de Fuego',
  description: 'Evaluación final del training Línea de Fuego, alineada con la regla IOGP Life-Saving Rules: Line of Fire.',
  passingScore: 80,
  questionsPerAttempt: 5,
  maxAttempts: 3,
  attemptMode: 'sequential_blocks',
  questions: [
    {
      id: 'lof_q01',
      question: 'La regla Línea de Fuego busca que las personas:',
      options: [
        { key: 'a', text: 'Se mantengan fuera de zonas donde puedan ser golpeadas, atrapadas o alcanzadas' },
        { key: 'b', text: 'Trabajen más cerca de equipos móviles' },
        { key: 'c', text: 'Eviten reportar objetos sueltos' },
        { key: 'd', text: 'Permanezcan debajo de cargas' }
      ],
      correctOption: 'a',
    },
    {
      id: 'lof_q02',
      question: '¿Cuál de estos ejemplos representa una línea de fuego?',
      options: [
        { key: 'a', text: 'Una zona con objetos en movimiento' },
        { key: 'b', text: 'Una oficina cerrada' },
        { key: 'c', text: 'Un comedor' },
        { key: 'd', text: 'Un plano impreso' }
      ],
      correctOption: 'a',
    },
    {
      id: 'lof_q03',
      question: 'Para evitar la línea de fuego, debo posicionarme lejos de:',
      options: [
        { key: 'a', text: 'Objetos en movimiento, vehículos, liberaciones de presión y objetos que puedan caer' },
        { key: 'b', text: 'Carteles de seguridad' },
        { key: 'c', text: 'Zonas iluminadas' },
        { key: 'd', text: 'Salidas de emergencia' }
      ],
      correctOption: 'a',
    },
    {
      id: 'lof_q04',
      question: 'Las barreras y zonas de exclusión sirven para:',
      options: [
        { key: 'a', text: 'Mantener a las personas fuera del área de peligro' },
        { key: 'b', text: 'Decorar el área' },
        { key: 'c', text: 'Aumentar la circulación' },
        { key: 'd', text: 'Evitar que se informe el riesgo' }
      ],
      correctOption: 'a',
    },
    {
      id: 'lof_q05',
      question: '¿Qué se debe hacer ante objetos sueltos que podrían caer?',
      options: [
        { key: 'a', text: 'Asegurarlos o reportarlos' },
        { key: 'b', text: 'Ignorarlos si son pequeños' },
        { key: 'c', text: 'Empujarlos fuera del camino' },
        { key: 'd', text: 'Esperar a que caigan' }
      ],
      correctOption: 'a',
    },
    {
      id: 'lof_q06',
      question: 'Una zona de presión contenida puede ser peligrosa porque:',
      options: [
        { key: 'a', text: 'Puede liberar energía de forma repentina' },
        { key: 'b', text: 'Siempre está fría' },
        { key: 'c', text: 'No produce movimiento' },
        { key: 'd', text: 'Elimina la necesidad de barreras' }
      ],
      correctOption: 'a',
    },
    {
      id: 'lof_q07',
      question: 'Si una tarea genera movimiento de equipos o cargas, debo:',
      options: [
        { key: 'a', text: 'Ubicarme fuera del recorrido posible' },
        { key: 'b', text: 'Acercarme para observar mejor' },
        { key: 'c', text: 'Pasar rápidamente por debajo' },
        { key: 'd', text: 'Confiar en que me verán' }
      ],
      correctOption: 'a',
    },
    {
      id: 'lof_q08',
      question: '¿Cuál es una conducta segura cerca de equipos móviles?',
      options: [
        { key: 'a', text: 'Mantener distancia, visibilidad y respetar rutas/barreras' },
        { key: 'b', text: 'Caminar detrás sin avisar' },
        { key: 'c', text: 'Usar auriculares para concentrarse' },
        { key: 'd', text: 'Cruzar sin contacto visual' }
      ],
      correctOption: 'a',
    },
    {
      id: 'lof_q09',
      question: 'Una carga suspendida representa riesgo porque:',
      options: [
        { key: 'a', text: 'Puede caer o moverse inesperadamente' },
        { key: 'b', text: 'No genera peligro si está quieta' },
        { key: 'c', text: 'Solo afecta al operador' },
        { key: 'd', text: 'Siempre está asegurada' }
      ],
      correctOption: 'a',
    },
    {
      id: 'lof_q10',
      question: '¿Qué debo hacer si veo a un compañero en la línea de fuego?',
      options: [
        { key: 'a', text: 'Advertirlo y tomar acción para sacarlo del peligro' },
        { key: 'b', text: 'Esperar a que termine' },
        { key: 'c', text: 'No intervenir' },
        { key: 'd', text: 'Continuar mi tarea' }
      ],
      correctOption: 'a',
    },
    {
      id: 'lof_q11',
      question: 'Las zonas de exclusión deben:',
      options: [
        { key: 'a', text: 'Establecerse y respetarse' },
        { key: 'b', text: 'Usarse solo si hay visitantes' },
        { key: 'c', text: 'Retirarse durante maniobras' },
        { key: 'd', text: 'Ignorarse si hay apuro' }
      ],
      correctOption: 'a',
    },
    {
      id: 'lof_q12',
      question: '¿Cuál de estas situaciones requiere especial atención a línea de fuego?',
      options: [
        { key: 'a', text: 'Izajes, movimiento de vehículos y trabajos con presión' },
        { key: 'b', text: 'Lectura de procedimientos en oficina' },
        { key: 'c', text: 'Carga de datos administrativos' },
        { key: 'd', text: 'Reuniones sin equipos' }
      ],
      correctOption: 'a',
    },
    {
      id: 'lof_q13',
      question: '¿Qué acción es insegura?',
      options: [
        { key: 'a', text: 'Ingresar a un área delimitada sin autorización' },
        { key: 'b', text: 'Respetar barreras' },
        { key: 'c', text: 'Reportar objetos potencialmente caídos' },
        { key: 'd', text: 'Mantenerse fuera del recorrido de una carga' }
      ],
      correctOption: 'a',
    },
    {
      id: 'lof_q14',
      question: 'La prevención de objetos caídos incluye:',
      options: [
        { key: 'a', text: 'Asegurar herramientas y materiales' },
        { key: 'b', text: 'Dejar herramientas sobre bordes' },
        { key: 'c', text: 'Retirar redes o barreras' },
        { key: 'd', text: 'Lanzar objetos al nivel inferior' }
      ],
      correctOption: 'a',
    },
    {
      id: 'lof_q15',
      question: 'La conducta correcta frente a línea de fuego es:',
      options: [
        { key: 'a', text: 'Identificar el peligro, ubicarse fuera de la trayectoria y respetar barreras' },
        { key: 'b', text: 'Acercarse para terminar antes' },
        { key: 'c', text: 'Confiar en la experiencia del operador' },
        { key: 'd', text: 'Ignorar objetos sueltos' }
      ],
      correctOption: 'a',
    }
  ],
};
