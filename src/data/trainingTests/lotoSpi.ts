import type { TrainingTest } from './types';

export const lotoSpiTest: TrainingTest = {
  id: 'test_loto_spi',
  trainingId: 'tr_loto_spi',
  title: 'Examen LOTO · Bloqueo y Etiquetado',
  description: 'Evaluación final del training SPI LOTO, basada en HSE-INS-004 Rev.00.',
  passingScore: 80,
  questionsPerAttempt: 10,
  maxAttempts: 3,
  attemptMode: 'sequential_blocks',
  questions: [
    // Intento 1 · Conceptos, alcance y responsabilidades
    {
      id: 'loto_spi_q01',
      question: '¿Cuál es el objetivo principal de la aplicación de LOTO en SPI?',
      options: [
        { key: 'a', text: 'Registrar las tareas realizadas por mantenimiento' },
        { key: 'b', text: 'Establecer requisitos mínimos para bloquear y etiquetar fuentes de energía peligrosas' },
        { key: 'c', text: 'Definir solamente los colores de los candados' },
        { key: 'd', text: 'Sustituir los permisos de trabajo' },
      ],
      correctOption: 'b',
    },
    {
      id: 'loto_spi_q02',
      question: '¿Dónde aplica el procedimiento LOTO de SPI?',
      options: [
        { key: 'a', text: 'En todas las instalaciones y operaciones bajo el control de SPI' },
        { key: 'b', text: 'Únicamente en talleres' },
        { key: 'c', text: 'Solo en operaciones de terceros' },
        { key: 'd', text: 'Exclusivamente en instalaciones eléctricas' },
      ],
      correctOption: 'a',
    },
    {
      id: 'loto_spi_q03',
      question: '¿Cuál de estas combinaciones contiene fuentes de energía peligrosas contempladas en el training?',
      options: [
        { key: 'a', text: 'Únicamente eléctrica y mecánica' },
        { key: 'b', text: 'Eléctrica, mecánica, hidráulica, neumática, química y térmica' },
        { key: 'c', text: 'Solamente hidráulica y neumática' },
        { key: 'd', text: 'Únicamente gas y electricidad' },
      ],
      correctOption: 'b',
    },
    {
      id: 'loto_spi_q04',
      question: '¿Por qué un equipo detenido puede continuar siendo peligroso?',
      options: [
        { key: 'a', text: 'Porque puede tener herramientas en su interior' },
        { key: 'b', text: 'Porque la señalización puede estar incompleta' },
        { key: 'c', text: 'Porque puede conservar energía peligrosa o energía almacenada' },
        { key: 'd', text: 'Porque siempre permanece conectado a una fuente eléctrica' },
      ],
      correctOption: 'c',
    },
    {
      id: 'loto_spi_q05',
      question: '¿Qué significa Lockout o Bloqueo?',
      options: [
        { key: 'a', text: 'Colocar únicamente una tarjeta de advertencia' },
        { key: 'b', text: 'Aislar físicamente una fuente de energía del sistema que la utiliza' },
        { key: 'c', text: 'Informar verbalmente que el equipo no debe utilizarse' },
        { key: 'd', text: 'Apagar un equipo desde su control principal' },
      ],
      correctOption: 'b',
    },
    {
      id: 'loto_spi_q06',
      question: '¿Qué significa Tagout o Etiquetado?',
      options: [
        { key: 'a', text: 'Colocar una etiqueta o tarjeta que comunica la intervención realizada y su importancia' },
        { key: 'b', text: 'Colocar un segundo candado' },
        { key: 'c', text: 'Completar el permiso de trabajo' },
        { key: 'd', text: 'Verificar el funcionamiento del equipo' },
      ],
      correctOption: 'a',
    },
    {
      id: 'loto_spi_q07',
      question: '¿Qué debe asegurar el Gerente de Operaciones respecto de LOTO?',
      options: [
        { key: 'a', text: 'Retirar personalmente todos los candados' },
        { key: 'b', text: 'Los recursos necesarios para cumplir los requisitos LOTO' },
        { key: 'c', text: 'Realizar todas las tareas de mantenimiento' },
        { key: 'd', text: 'Auditar exclusivamente a proveedores externos' },
      ],
      correctOption: 'b',
    },
    {
      id: 'loto_spi_q08',
      question: '¿Cuál es una responsabilidad del Supervisor de Operaciones?',
      options: [
        { key: 'a', text: 'Autorizar trabajos sin LOTO cuando sean breves' },
        { key: 'b', text: 'Asegurar que el personal conozca el estándar y aplicar LOTO en trabajos con energías peligrosas durante operaciones con clientes' },
        { key: 'c', text: 'Reemplazar al responsable de mantenimiento' },
        { key: 'd', text: 'Retirar candados colocados por terceros' },
      ],
      correctOption: 'b',
    },
    {
      id: 'loto_spi_q09',
      question: '¿Cuál es una responsabilidad de QHSE?',
      options: [
        { key: 'a', text: 'Operar los equipos luego de su bloqueo' },
        { key: 'b', text: 'Proveer los diagramas del fabricante' },
        { key: 'c', text: 'Auditar el programa y la ejecución de los procedimientos de bloqueo y etiquetado' },
        { key: 'd', text: 'Colocar los candados de cada empleado' },
      ],
      correctOption: 'c',
    },
    {
      id: 'loto_spi_q10',
      question: '¿Qué debe hacer un empleado con los dispositivos de bloqueo y etiquetado?',
      options: [
        { key: 'a', text: 'Utilizarlos para cualquier necesidad operativa' },
        { key: 'b', text: 'Compartirlos cuando otro trabajador los necesite' },
        { key: 'c', text: 'Utilizarlos correcta y únicamente para el fin para el que fueron diseñados' },
        { key: 'd', text: 'Retirarlos cuando considere finalizada una tarea' },
      ],
      correctOption: 'c',
    },

    // Intento 2 · Aislación, verificación y restablecimiento
    {
      id: 'loto_spi_q11',
      question: '¿Bajo qué condición debe realizarse toda aplicación de LOTO?',
      options: [
        { key: 'a', text: 'Bajo un Permiso de Trabajo' },
        { key: 'b', text: 'Bajo autorización verbal únicamente' },
        { key: 'c', text: 'Sin permiso si el equipo está apagado' },
        { key: 'd', text: 'Solo con autorización de otro trabajador' },
      ],
      correctOption: 'a',
    },
    {
      id: 'loto_spi_q12',
      question: '¿Cuál es el primer paso indicado para la aislación y bloqueo de energía?',
      options: [
        { key: 'a', text: 'Colocar las etiquetas' },
        { key: 'b', text: 'Verificar el diagrama de flujo del equipo o el diagrama unifilar de la instalación' },
        { key: 'c', text: 'Retirar los candados existentes' },
        { key: 'd', text: 'Energizar el equipo' },
      ],
      correctOption: 'b',
    },
    {
      id: 'loto_spi_q13',
      question: 'Después de realizar la aislación de las energías identificadas, ¿qué debe hacerse antes de bloquear todas las fuentes?',
      options: [
        { key: 'a', text: 'Poner en marcha el equipo' },
        { key: 'b', text: 'Liberar la energía residual almacenada' },
        { key: 'c', text: 'Retirar las protecciones' },
        { key: 'd', text: 'Cerrar el permiso de trabajo' },
      ],
      correctOption: 'b',
    },
    {
      id: 'loto_spi_q14',
      question: '¿Cuál es el orden correcto de las últimas etapas del proceso de aislamiento?',
      options: [
        { key: 'a', text: 'Etiquetar → energizar → bloquear' },
        { key: 'b', text: 'Liberar energía residual → bloquear → etiquetar → verificar ausencia de energía' },
        { key: 'c', text: 'Verificar → retirar bloqueo → etiquetar' },
        { key: 'd', text: 'Bloquear → comenzar la tarea → verificar' },
      ],
      correctOption: 'b',
    },
    {
      id: 'loto_spi_q15',
      question: 'Si se utiliza un equipo de medición para verificar ausencia de energía, ¿qué debe hacerse?',
      options: [
        { key: 'a', text: 'Utilizar cualquier instrumento disponible' },
        { key: 'b', text: 'Asegurar que esté certificado y probarlo primero en una instalación con energía' },
        { key: 'c', text: 'Probarlo únicamente después de la intervención' },
        { key: 'd', text: 'Utilizarlo solo si no existen diagramas' },
      ],
      correctOption: 'b',
    },
    {
      id: 'loto_spi_q16',
      question: 'Antes de restablecer la energía, ¿qué debe comprobarse mediante inspección visual?',
      options: [
        { key: 'a', text: 'Que se retiraron las herramientas, las protecciones están instaladas y el equipo puede energizarse de forma segura' },
        { key: 'b', text: 'Que todos los candados continúan colocados' },
        { key: 'c', text: 'Que el permiso ya fue cerrado' },
        { key: 'd', text: 'Que el equipo esté funcionando' },
      ],
      correctOption: 'a',
    },
    {
      id: 'loto_spi_q17',
      question: '¿Cuál es el primer paso indicado para el restablecimiento de energía?',
      options: [
        { key: 'a', text: 'Comunicar a todo el personal la puesta en funcionamiento del equipo o instalación' },
        { key: 'b', text: 'Retirar inmediatamente todos los candados' },
        { key: 'c', text: 'Energizar el equipo' },
        { key: 'd', text: 'Cerrar el permiso' },
      ],
      correctOption: 'a',
    },
    {
      id: 'loto_spi_q18',
      question: 'Si la persona responsable de un candado no está presente, ¿qué debe hacerse inicialmente?',
      options: [
        { key: 'a', text: 'Cortar el candado' },
        { key: 'b', text: 'Pedir a otro trabajador que lo retire' },
        { key: 'c', text: 'Comunicar inmediatamente al Gerente del sector y a QHSE para intentar contactar al responsable' },
        { key: 'd', text: 'Energizar el equipo para verificar si funciona' },
      ],
      correctOption: 'c',
    },
    {
      id: 'loto_spi_q19',
      question: 'Si no es posible localizar al responsable del candado, ¿qué debe realizarse antes de retirarlo?',
      options: [
        { key: 'a', text: 'Una inspección visual únicamente' },
        { key: 'b', text: 'Una autorización verbal' },
        { key: 'c', text: 'Una evaluación de riesgos previa a la remoción' },
        { key: 'd', text: 'Una nueva capacitación' },
      ],
      correctOption: 'c',
    },
    {
      id: 'loto_spi_q20',
      question: '¿Cuál es la combinación correcta de colores de candados utilizada por SPI?',
      options: [
        { key: 'a', text: 'Operaciones rojo, Mantenimiento azul, Proveedores Externos amarillo' },
        { key: 'b', text: 'Operaciones amarillo, Mantenimiento rojo, Proveedores Externos azul' },
        { key: 'c', text: 'Operaciones azul, Mantenimiento amarillo, Proveedores Externos rojo' },
        { key: 'd', text: 'Todos utilizan el mismo color' },
      ],
      correctOption: 'a',
    },

    // Intento 3 · Etiquetas, dispositivos y flujos operativos
    {
      id: 'loto_spi_q21',
      question: '¿Qué palabras debe mostrar claramente una etiqueta LOTO?',
      options: [
        { key: 'a', text: 'PRECAUCIÓN y EQUIPO APAGADO' },
        { key: 'b', text: 'PELIGRO y NO OPERAR' },
        { key: 'c', text: 'MANTENIMIENTO y ESPERAR' },
        { key: 'd', text: 'DETENIDO y REVISAR' },
      ],
      correctOption: 'b',
    },
    {
      id: 'loto_spi_q22',
      question: '¿Qué información debe incluir la etiqueta de bloqueo?',
      options: [
        { key: 'a', text: 'Solamente el número del equipo' },
        { key: 'b', text: 'La fecha del bloqueo y el nombre de la persona que aplica el bloqueo' },
        { key: 'c', text: 'Únicamente la hora de inicio' },
        { key: 'd', text: 'El nombre del fabricante' },
      ],
      correctOption: 'b',
    },
    {
      id: 'loto_spi_q23',
      question: '¿Qué colores debe utilizar la etiqueta LOTO indicada en el training?',
      options: [
        { key: 'a', text: 'Azul, blanco y amarillo' },
        { key: 'b', text: 'Amarillo y negro' },
        { key: 'c', text: 'Rojo, negro y blanco' },
        { key: 'd', text: 'Rojo y azul' },
      ],
      correctOption: 'c',
    },
    {
      id: 'loto_spi_q24',
      question: 'Según el formato de tarjeta presentado, ¿quién puede quitarla una vez finalizados los trabajos?',
      options: [
        { key: 'a', text: 'Cualquier supervisor' },
        { key: 'b', text: 'Cualquier trabajador autorizado' },
        { key: 'c', text: 'La persona autorizada indicada en la tarjeta' },
        { key: 'd', text: 'El último trabajador que abandone el área' },
      ],
      correctOption: 'c',
    },
    {
      id: 'loto_spi_q25',
      question: '¿Cuáles son las dimensiones indicadas para la tarjeta presentada en el training?',
      options: [
        { key: 'a', text: '100 mm × 50 mm' },
        { key: 'b', text: '145 mm × 75 mm' },
        { key: 'c', text: '200 mm × 100 mm' },
        { key: 'd', text: '75 mm × 40 mm' },
      ],
      correctOption: 'b',
    },
    {
      id: 'loto_spi_q26',
      question: '¿Cuál de los siguientes puede utilizarse como elemento de aislamiento físico?',
      options: [
        { key: 'a', text: 'Únicamente una etiqueta' },
        { key: 'b', text: 'Candados, bridas ciegas u otros dispositivos adecuados a la aplicación' },
        { key: 'c', text: 'Solo una señal verbal' },
        { key: 'd', text: 'Únicamente interruptores eléctricos' },
      ],
      correctOption: 'b',
    },
    {
      id: 'loto_spi_q27',
      question: '¿Qué debe hacerse con un dispositivo de aislamiento que tiene una etiqueta de PELIGRO adherida?',
      options: [
        { key: 'a', text: 'Operarlo si la tarea ya terminó' },
        { key: 'b', text: 'Operarlo únicamente con autorización verbal' },
        { key: 'c', text: 'No operarlo bajo ninguna circunstancia mientras la etiqueta esté adherida' },
        { key: 'd', text: 'Probarlo antes de retirar la etiqueta' },
      ],
      correctOption: 'c',
    },
    {
      id: 'loto_spi_q28',
      question: '¿Para qué pueden utilizarse los candados LOTO?',
      options: [
        { key: 'a', text: 'Para cerrar herramientas y depósitos' },
        { key: 'b', text: 'Exclusivamente para tareas de bloqueo de equipos' },
        { key: 'c', text: 'Para cualquier uso de seguridad' },
        { key: 'd', text: 'Para identificar pertenencias personales' },
      ],
      correctOption: 'b',
    },
    {
      id: 'loto_spi_q29',
      question: 'Durante la desenergización, ¿qué debe hacerse si al verificar el sistema NO se alcanza condición de “energía cero”?',
      options: [
        { key: 'a', text: 'Continuar con la tarea con mayor precaución' },
        { key: 'b', text: 'Retirar los bloqueos' },
        { key: 'c', text: 'Detener la tarea y volver a revisar la información y las fuentes de energía' },
        { key: 'd', text: 'Reenergizar y comenzar la tarea igualmente' },
      ],
      correctOption: 'c',
    },
    {
      id: 'loto_spi_q30',
      question: 'En el flujo de reenergización, ¿qué ocurre después de reenergizar el equipo?',
      options: [
        { key: 'a', text: 'Se coloca nuevamente el bloqueo' },
        { key: 'b', text: 'Se inicia una nueva intervención' },
        { key: 'c', text: 'Se verifica el funcionamiento del equipo o instalación y luego se cierra el permiso' },
        { key: 'd', text: 'Se retiran los diagramas del equipo' },
      ],
      correctOption: 'c',
    },
  ],
};
