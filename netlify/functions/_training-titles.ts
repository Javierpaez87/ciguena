// Shared, human-readable training titles for transactional emails.
// Keep in sync with src/data/baseTrainings.ts.
export const TRAINING_TITLES: Record<string, string> = {
  'tr_hand_safety': 'Cuidado de Manos',
  'tr_working_at_heights': 'Trabajo en Altura',
  'tr_confined_spaces': 'Espacios Confinados',
  'tr_energy_isolation': 'Aislamiento de Energía',
  'tr_spi_pman_m01': 'Protección de Manos · Módulo 1 · Riesgos y Prevención',
  'tr_spi_pman_m02': 'Protección de Manos · Módulo 2 · Control y Reducción de Riesgos',
  'tr_loto_spi': 'LOTO · Bloqueo y Etiquetado',
  'tr_line_of_fire': 'Línea de Fuego',
  'tr_mechanical_lifting': 'Izaje Mecánico Seguro',
  'tr_hot_work': 'Trabajo en Caliente',
  'tr_work_authorization': 'Autorización de Trabajo',
  'tr_bypass_controls': 'Bypass de Controles de Seguridad',
  'tr_safe_driving': 'Conducción Segura',
  'tr_code_of_ethics': 'Código de Ética',
};

export function getTrainingTitle(trainingId: string): string {
  return TRAINING_TITLES[trainingId] || trainingId || 'Curso asignado';
}
