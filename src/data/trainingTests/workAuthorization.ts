import type { TrainingTest } from './types';

export const workAuthorizationTest: TrainingTest = {
  id: 'test_work_authorization',
  trainingId: 'tr_work_authorization',
  title: 'Examen Autorización de Trabajo',
  description: 'Evaluación final del training Autorización de Trabajo, alineada con la regla IOGP Life-Saving Rules: Work Authorisation.',
  passingScore: 80,
  questionsPerAttempt: 5,
  maxAttempts: 3,
  attemptMode: 'sequential_blocks',
  questions: [
    {
      id: 'wa_q01',
      question: 'La autorización de trabajo indica que una tarea debe realizarse:',
      options: [
        { key: 'a', text: 'Con un permiso válido cuando sea requerido' },
        { key: 'b', text: 'Solo con autorización verbal informal' },
        { key: 'c', text: 'Sin revisar controles' },
        { key: 'd', text: 'Según la rapidez necesaria' }
      ],
      correctOption: 'a',
    },
    {
      id: 'wa_q02',
      question: 'Antes de iniciar un trabajo autorizado, debo entender:',
      options: [
        { key: 'a', text: 'Alcance, riesgos, controles y condiciones del permiso' },
        { key: 'b', text: 'Solo quién firmó el documento' },
        { key: 'c', text: 'Solo la duración estimada' },
        { key: 'd', text: 'Solo el nombre de la empresa' }
      ],
      correctOption: 'a',
    },
    {
      id: 'wa_q03',
      question: 'Un permiso de trabajo válido ayuda a confirmar que:',
      options: [
        { key: 'a', text: 'La tarea, los riesgos y los controles fueron revisados' },
        { key: 'b', text: 'No existen riesgos' },
        { key: 'c', text: 'No se necesita supervisión' },
        { key: 'd', text: 'El trabajo puede hacerse de cualquier forma' }
      ],
      correctOption: 'a',
    },
    {
      id: 'wa_q04',
      question: 'Si el trabajo cambia respecto de lo autorizado, se debe:',
      options: [
        { key: 'a', text: 'Detener y revisar/actualizar la autorización' },
        { key: 'b', text: 'Continuar si parece seguro' },
        { key: 'c', text: 'Terminar rápido' },
        { key: 'd', text: 'Avisar al final' }
      ],
      correctOption: 'a',
    },
    {
      id: 'wa_q05',
      question: '¿Qué debe hacer un trabajador si no entiende una condición del permiso?',
      options: [
        { key: 'a', text: 'Pedir aclaración antes de comenzar' },
        { key: 'b', text: 'Firmar igual' },
        { key: 'c', text: 'Ignorar esa parte' },
        { key: 'd', text: 'Dejar que otro decida' }
      ],
      correctOption: 'a',
    },
    {
      id: 'wa_q06',
      question: 'La autorización de trabajo es especialmente importante para:',
      options: [
        { key: 'a', text: 'Tareas de alto riesgo o no rutinarias' },
        { key: 'b', text: 'Cualquier pausa de descanso' },
        { key: 'c', text: 'Tareas administrativas simples' },
        { key: 'd', text: 'Reuniones sin trabajo operativo' }
      ],
      correctOption: 'a',
    },
    {
      id: 'wa_q07',
      question: '¿Qué acción es insegura?',
      options: [
        { key: 'a', text: 'Trabajar fuera del alcance del permiso' },
        { key: 'b', text: 'Verificar controles' },
        { key: 'c', text: 'Leer condiciones del permiso' },
        { key: 'd', text: 'Confirmar que el permiso está vigente' }
      ],
      correctOption: 'a',
    },
    {
      id: 'wa_q08',
      question: 'Antes de iniciar, las personas involucradas deben:',
      options: [
        { key: 'a', text: 'Conocer su rol y las condiciones de seguridad' },
        { key: 'b', text: 'Confiar en que alguien más leyó el permiso' },
        { key: 'c', text: 'Firmar sin participar' },
        { key: 'd', text: 'Empezar mientras se completa el permiso' }
      ],
      correctOption: 'a',
    },
    {
      id: 'wa_q09',
      question: 'Un permiso vencido o inválido significa que:',
      options: [
        { key: 'a', text: 'No debe usarse para ejecutar el trabajo' },
        { key: 'b', text: 'Puede usarse si hay apuro' },
        { key: 'c', text: 'Sirve hasta que alguien lo note' },
        { key: 'd', text: 'Solo afecta a contratistas' }
      ],
      correctOption: 'a',
    },
    {
      id: 'wa_q10',
      question: '¿Qué debe pasar con los controles definidos en el permiso?',
      options: [
        { key: 'a', text: 'Deben implementarse antes y durante la tarea según corresponda' },
        { key: 'b', text: 'Pueden quedar para después' },
        { key: 'c', text: 'Son opcionales' },
        { key: 'd', text: 'Solo se aplican si ocurre un incidente' }
      ],
      correctOption: 'a',
    },
    {
      id: 'wa_q11',
      question: 'La comunicación previa al trabajo sirve para:',
      options: [
        { key: 'a', text: 'Alinear riesgos, controles, permisos y responsabilidades' },
        { key: 'b', text: 'Evitar usar el permiso' },
        { key: 'c', text: 'Reducir la cantidad de controles' },
        { key: 'd', text: 'Acelerar sin revisar' }
      ],
      correctOption: 'a',
    },
    {
      id: 'wa_q12',
      question: 'Si las condiciones del área dejan de coincidir con el permiso, se debe:',
      options: [
        { key: 'a', text: 'Parar y reevaluar' },
        { key: 'b', text: 'Continuar hasta terminar' },
        { key: 'c', text: 'Ignorar si la tarea empezó' },
        { key: 'd', text: 'Cambiar la tarea sin avisar' }
      ],
      correctOption: 'a',
    },
    {
      id: 'wa_q13',
      question: '¿Quién debe cumplir las condiciones del permiso?',
      options: [
        { key: 'a', text: 'Todas las personas involucradas en el trabajo' },
        { key: 'b', text: 'Solo quien lo emitió' },
        { key: 'c', text: 'Solo el supervisor' },
        { key: 'd', text: 'Solo visitantes' }
      ],
      correctOption: 'a',
    },
    {
      id: 'wa_q14',
      question: 'La autorización no reemplaza:',
      options: [
        { key: 'a', text: 'La identificación de riesgos y aplicación de controles' },
        { key: 'b', text: 'El apuro operativo' },
        { key: 'c', text: 'La experiencia individual' },
        { key: 'd', text: 'La decisión de trabajar solo' }
      ],
      correctOption: 'a',
    },
    {
      id: 'wa_q15',
      question: 'La conducta correcta es:',
      options: [
        { key: 'a', text: 'Trabajar dentro del alcance autorizado y detenerse si cambian las condiciones' },
        { key: 'b', text: 'Adaptar el permiso verbalmente sin registro' },
        { key: 'c', text: 'Trabajar sin leer el permiso' },
        { key: 'd', text: 'Cumplir solo las condiciones fáciles' }
      ],
      correctOption: 'a',
    }
  ],
};
