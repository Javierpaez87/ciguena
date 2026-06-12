import type { TrainingTest } from './types';

export const safeDrivingTest: TrainingTest = {
  id: 'test_safe_driving',
  trainingId: 'tr_safe_driving',
  title: 'Examen Conducción Segura',
  description: 'Evaluación final del training Conducción Segura, alineada con la regla IOGP Life-Saving Rules: Driving.',
  passingScore: 80,
  questionsPerAttempt: 5,
  maxAttempts: 3,
  attemptMode: 'sequential_blocks',
  questions: [
    {
      id: 'drv_q01',
      question: 'Una regla básica de conducción segura es:',
      options: [
        { key: 'a', text: 'Usar siempre cinturón de seguridad' },
        { key: 'b', text: 'Usar cinturón solo en ruta' },
        { key: 'c', text: 'No usar cinturón en trayectos cortos' },
        { key: 'd', text: 'Usar cinturón solo si hay controles' }
      ],
      correctOption: 'a',
    },
    {
      id: 'drv_q02',
      question: 'Respecto de la velocidad, se debe:',
      options: [
        { key: 'a', text: 'No exceder límites y reducir velocidad según condiciones' },
        { key: 'b', text: 'Mantener siempre la máxima permitida' },
        { key: 'c', text: 'Acelerar para terminar antes' },
        { key: 'd', text: 'Ignorar condiciones del camino' }
      ],
      correctOption: 'a',
    },
    {
      id: 'drv_q03',
      question: 'Durante la conducción, el uso de teléfonos o dispositivos debe:',
      options: [
        { key: 'a', text: 'Evitarse si distrae o está prohibido por la regla/procedimiento' },
        { key: 'b', text: 'Permitirse para ahorrar tiempo' },
        { key: 'c', text: 'Hacerse solo en curvas' },
        { key: 'd', text: 'Usarse si el mensaje es corto' }
      ],
      correctOption: 'a',
    },
    {
      id: 'drv_q04',
      question: 'Antes de conducir, el conductor debe estar:',
      options: [
        { key: 'a', text: 'Apto, descansado y alerta' },
        { key: 'b', text: 'Cansado pero apurado' },
        { key: 'c', text: 'Somnoliento si el viaje es corto' },
        { key: 'd', text: 'Distraído por llamadas' }
      ],
      correctOption: 'a',
    },
    {
      id: 'drv_q05',
      question: '¿Qué debe hacerse ante malas condiciones del camino o clima?',
      options: [
        { key: 'a', text: 'Reducir velocidad y adaptar la conducción' },
        { key: 'b', text: 'Aumentar velocidad para salir antes' },
        { key: 'c', text: 'Conducir igual' },
        { key: 'd', text: 'Apagar luces para ahorrar batería' }
      ],
      correctOption: 'a',
    },
    {
      id: 'drv_q06',
      question: 'El cinturón de seguridad protege porque:',
      options: [
        { key: 'a', text: 'Reduce el riesgo de lesiones graves en una colisión' },
        { key: 'b', text: 'Evita revisar el vehículo' },
        { key: 'c', text: 'Permite conducir más rápido' },
        { key: 'd', text: 'Reemplaza la atención del conductor' }
      ],
      correctOption: 'a',
    },
    {
      id: 'drv_q07',
      question: '¿Cuál es una acción insegura al conducir?',
      options: [
        { key: 'a', text: 'Leer mensajes mientras se maneja' },
        { key: 'b', text: 'Mantener distancia segura' },
        { key: 'c', text: 'Respetar límites de velocidad' },
        { key: 'd', text: 'Usar cinturón' }
      ],
      correctOption: 'a',
    },
    {
      id: 'drv_q08',
      question: 'La fatiga al conducir puede causar:',
      options: [
        { key: 'a', text: 'Pérdida de atención y aumento del riesgo de accidente' },
        { key: 'b', text: 'Mejor reacción' },
        { key: 'c', text: 'Menor necesidad de descanso' },
        { key: 'd', text: 'Mayor control del vehículo' }
      ],
      correctOption: 'a',
    },
    {
      id: 'drv_q09',
      question: 'La conducción segura requiere:',
      options: [
        { key: 'a', text: 'Seguir reglas de tránsito y requisitos de la empresa' },
        { key: 'b', text: 'Confiar solo en experiencia' },
        { key: 'c', text: 'Ignorar rutas planificadas' },
        { key: 'd', text: 'Usar el teléfono para mantenerse despierto' }
      ],
      correctOption: 'a',
    },
    {
      id: 'drv_q10',
      question: 'Antes de iniciar un viaje laboral, puede ser necesario confirmar:',
      options: [
        { key: 'a', text: 'Condición del vehículo, ruta y aptitud del conductor' },
        { key: 'b', text: 'Solo el horario de llegada' },
        { key: 'c', text: 'Solo el color del vehículo' },
        { key: 'd', text: 'Solo quién paga el combustible' }
      ],
      correctOption: 'a',
    },
    {
      id: 'drv_q11',
      question: 'Si el conductor no está en condiciones de manejar, debe:',
      options: [
        { key: 'a', text: 'No conducir y reportar la situación' },
        { key: 'b', text: 'Conducir más lento sin avisar' },
        { key: 'c', text: 'Pedir café y continuar siempre' },
        { key: 'd', text: 'Delegar el volante informalmente' }
      ],
      correctOption: 'a',
    },
    {
      id: 'drv_q12',
      question: 'El respeto de límites de velocidad aplica:',
      options: [
        { key: 'a', text: 'En todos los trayectos y condiciones' },
        { key: 'b', text: 'Solo cuando hay policía' },
        { key: 'c', text: 'Solo en caminos urbanos' },
        { key: 'd', text: 'Solo con pasajeros' }
      ],
      correctOption: 'a',
    },
    {
      id: 'drv_q13',
      question: 'Mantener atención al conducir implica:',
      options: [
        { key: 'a', text: 'Evitar distracciones y concentrarse en el camino' },
        { key: 'b', text: 'Revisar mensajes continuamente' },
        { key: 'c', text: 'Comer y manejar con una mano siempre' },
        { key: 'd', text: 'Mirar el celular en rectas' }
      ],
      correctOption: 'a',
    },
    {
      id: 'drv_q14',
      question: 'Una distancia segura ayuda a:',
      options: [
        { key: 'a', text: 'Tener tiempo para reaccionar ante imprevistos' },
        { key: 'b', text: 'Llegar antes' },
        { key: 'c', text: 'Bloquear otros vehículos' },
        { key: 'd', text: 'Evitar usar cinturón' }
      ],
      correctOption: 'a',
    },
    {
      id: 'drv_q15',
      question: 'La conducta correcta al conducir es:',
      options: [
        { key: 'a', text: 'Usar cinturón, respetar velocidad, evitar distracciones y conducir apto' },
        { key: 'b', text: 'Conducir rápido si hay experiencia' },
        { key: 'c', text: 'Responder mensajes breves' },
        { key: 'd', text: 'Ignorar fatiga en viajes cortos' }
      ],
      correctOption: 'a',
    }
  ],
};
