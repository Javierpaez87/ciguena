import type { TrainingTest } from './types';

export const bypassControlsTest: TrainingTest = {
  id: 'test_bypass_controls',
  trainingId: 'tr_bypass_controls',
  title: 'Examen Bypass de Controles de Seguridad',
  description: 'Evaluación final del training Bypass de Controles de Seguridad, alineada con la regla IOGP Life-Saving Rules: Bypassing Safety Controls.',
  passingScore: 80,
  questionsPerAttempt: 5,
  maxAttempts: 3,
  attemptMode: 'sequential_blocks',
  questions: [
    {
      id: 'bsc_q01',
      question: 'Antes de anular o deshabilitar un control de seguridad, se debe:',
      options: [
        { key: 'a', text: 'Obtener autorización' },
        { key: 'b', text: 'Hacerlo si molesta' },
        { key: 'c', text: 'Avisar después' },
        { key: 'd', text: 'Pedir ayuda informal' }
      ],
      correctOption: 'a',
    },
    {
      id: 'bsc_q02',
      question: 'Un control de seguridad puede ser:',
      options: [
        { key: 'a', text: 'Un dispositivo, alarma, guarda, procedimiento o sistema crítico' },
        { key: 'b', text: 'Solo un cartel decorativo' },
        { key: 'c', text: 'Únicamente el uniforme' },
        { key: 'd', text: 'Solo una herramienta manual' }
      ],
      correctOption: 'a',
    },
    {
      id: 'bsc_q03',
      question: 'Bypassing Safety Controls significa evitar:',
      options: [
        { key: 'a', text: 'Anular controles sin autorización y sin controles alternativos' },
        { key: 'b', text: 'Leer procedimientos' },
        { key: 'c', text: 'Usar permisos' },
        { key: 'd', text: 'Reportar condiciones inseguras' }
      ],
      correctOption: 'a',
    },
    {
      id: 'bsc_q04',
      question: 'Si un control de seguridad impide avanzar con una tarea, corresponde:',
      options: [
        { key: 'a', text: 'Detenerse y gestionar autorización para cualquier bypass' },
        { key: 'b', text: 'Desactivarlo temporalmente sin avisar' },
        { key: 'c', text: 'Cubrir la alarma' },
        { key: 'd', text: 'Pedir a otro que lo haga' }
      ],
      correctOption: 'a',
    },
    {
      id: 'bsc_q05',
      question: '¿Qué debe existir si se autoriza un bypass?',
      options: [
        { key: 'a', text: 'Controles alternativos adecuados y comunicados' },
        { key: 'b', text: 'Solo una promesa verbal' },
        { key: 'c', text: 'La intención de terminar rápido' },
        { key: 'd', text: 'Ningún registro' }
      ],
      correctOption: 'a',
    },
    {
      id: 'bsc_q06',
      question: '¿Cuál es una acción insegura?',
      options: [
        { key: 'a', text: 'Retirar una guarda de máquina sin autorización' },
        { key: 'b', text: 'Reportar un control dañado' },
        { key: 'c', text: 'Cumplir una barrera' },
        { key: 'd', text: 'Solicitar permiso para deshabilitar un sistema' }
      ],
      correctOption: 'a',
    },
    {
      id: 'bsc_q07',
      question: 'Si detecto un control de seguridad dañado o deshabilitado, debo:',
      options: [
        { key: 'a', text: 'Reportarlo y no asumir que es seguro' },
        { key: 'b', text: 'Ignorarlo si el equipo funciona' },
        { key: 'c', text: 'Usarlo para avanzar más rápido' },
        { key: 'd', text: 'Retirarlo por completo' }
      ],
      correctOption: 'a',
    },
    {
      id: 'bsc_q08',
      question: 'Los sistemas de seguridad críticos existen para:',
      options: [
        { key: 'a', text: 'Prevenir eventos graves o reducir sus consecuencias' },
        { key: 'b', text: 'Demorar el trabajo' },
        { key: 'c', text: 'Reemplazar capacitación' },
        { key: 'd', text: 'Evitar inspecciones' }
      ],
      correctOption: 'a',
    },
    {
      id: 'bsc_q09',
      question: 'La autorización para bypass debe dejar claro:',
      options: [
        { key: 'a', text: 'Qué se deshabilita, por cuánto tiempo y qué controles alternativos aplican' },
        { key: 'b', text: 'Solo quién está de turno' },
        { key: 'c', text: 'Que el riesgo desapareció' },
        { key: 'd', text: 'Que no hace falta comunicar' }
      ],
      correctOption: 'a',
    },
    {
      id: 'bsc_q10',
      question: '¿Qué debe hacerse al terminar la necesidad del bypass?',
      options: [
        { key: 'a', text: 'Restablecer el control de seguridad según procedimiento' },
        { key: 'b', text: 'Dejarlo deshabilitado' },
        { key: 'c', text: 'Olvidar el registro' },
        { key: 'd', text: 'Tapar la señalización' }
      ],
      correctOption: 'a',
    },
    {
      id: 'bsc_q11',
      question: 'Una alarma deshabilitada sin autorización:',
      options: [
        { key: 'a', text: 'Puede impedir detectar una condición peligrosa' },
        { key: 'b', text: 'Siempre mejora el trabajo' },
        { key: 'c', text: 'No cambia el riesgo' },
        { key: 'd', text: 'Es aceptable si nadie la oye' }
      ],
      correctOption: 'a',
    },
    {
      id: 'bsc_q12',
      question: '¿Quién debe conocer un bypass autorizado?',
      options: [
        { key: 'a', text: 'Las personas afectadas por el cambio de control' },
        { key: 'b', text: 'Solo quien lo ejecutó' },
        { key: 'c', text: 'Nadie para evitar confusión' },
        { key: 'd', text: 'Solo administración' }
      ],
      correctOption: 'a',
    },
    {
      id: 'bsc_q13',
      question: 'Los controles de seguridad no deben modificarse por:',
      options: [
        { key: 'a', text: 'Comodidad, apuro o conveniencia sin autorización' },
        { key: 'b', text: 'Procedimiento aprobado' },
        { key: 'c', text: 'Evaluación de riesgos' },
        { key: 'd', text: 'Plan autorizado' }
      ],
      correctOption: 'a',
    },
    {
      id: 'bsc_q14',
      question: 'Si no se aprueba el bypass, se debe:',
      options: [
        { key: 'a', text: 'No realizar la tarea de esa forma' },
        { key: 'b', text: 'Hacerlo igual con cuidado' },
        { key: 'c', text: 'Desactivar otro control' },
        { key: 'd', text: 'Continuar sin comunicar' }
      ],
      correctOption: 'a',
    },
    {
      id: 'bsc_q15',
      question: 'La conducta correcta ante controles de seguridad es:',
      options: [
        { key: 'a', text: 'Respetarlos y obtener autorización antes de cualquier anulación o deshabilitación' },
        { key: 'b', text: 'Adaptarlos libremente' },
        { key: 'c', text: 'Desactivarlos si demoran' },
        { key: 'd', text: 'Usarlos solo durante auditorías' }
      ],
      correctOption: 'a',
    }
  ],
};
