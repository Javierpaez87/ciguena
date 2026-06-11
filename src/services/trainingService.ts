// src/services/trainingService.ts

import { baseTrainings } from '../data/baseTrainings';
import type { Training } from '../types';

export async function getTrainingCatalog(): Promise<Training[]> {
  return baseTrainings;
}

export async function getSuperAdminTrainings(): Promise<Training[]> {
  return baseTrainings;
}

export async function getAdminTrainingsByTenant(_tenantId: string): Promise<Training[]> {
  // Por ahora devolvemos todos los trainings activos del catálogo base.
  // Próximo paso: reemplazar esto por una consulta a Supabase.
  return baseTrainings.filter(training => training.status === 'active');
}
