import type {
  Tenant, Profile, Training, TenantTraining, TrainingModule, TrainingLesson,
  QuizQuestion, QuizOption, TrainingAssignment, Certificate, Feedback, ActivityLog
} from '../types';

export const mockTenants: Tenant[] = [
  { id: 't1', name: 'YPF Demo', logo_url: null, status: 'active', created_at: '2024-01-15T10:00:00Z', user_count: 24, training_count: 8 },
  { id: 't2', name: 'Tecpetrol Demo', logo_url: null, status: 'active', created_at: '2024-02-01T10:00:00Z', user_count: 18, training_count: 6 },
  { id: 't3', name: 'Patagonia Oil Services', logo_url: null, status: 'active', created_at: '2024-03-10T10:00:00Z', user_count: 12, training_count: 5 },
  { id: 't4', name: 'Neuquén Field Contractors', logo_url: null, status: 'inactive', created_at: '2024-04-05T10:00:00Z', user_count: 9, training_count: 4 },
];

export const mockProfiles: Profile[] = [
  { id: 'u1', tenant_id: 't1', full_name: 'Juan Pérez', email: 'juan.perez@ypf.com', role: 'worker', position: 'Operador de campo', area: 'Operaciones', contractor_company: null, employee_code: 'EMP001', status: 'active', created_at: '2024-01-20T10:00:00Z' },
  { id: 'u2', tenant_id: 't1', full_name: 'María Gómez', email: 'maria.gomez@ypf.com', role: 'worker', position: 'Supervisora HSE', area: 'HSE', contractor_company: null, employee_code: 'EMP002', status: 'active', created_at: '2024-01-20T10:00:00Z' },
  { id: 'u3', tenant_id: 't1', full_name: 'Carlos Molina', email: 'carlos.molina@ypf.com', role: 'worker', position: 'Chofer', area: 'Logística', contractor_company: null, employee_code: 'EMP003', status: 'active', created_at: '2024-02-01T10:00:00Z' },
  { id: 'u4', tenant_id: 't1', full_name: 'Lucía Fernández', email: 'lucia.fernandez@ypf.com', role: 'worker', position: 'Técnica de mantenimiento', area: 'Mantenimiento', contractor_company: null, employee_code: 'EMP004', status: 'active', created_at: '2024-02-10T10:00:00Z' },
  { id: 'u5', tenant_id: 't1', full_name: 'Roberto Álvarez', email: 'roberto.alvarez@contratista.com', role: 'worker', position: 'Contratista', area: 'Campo', contractor_company: 'Servicios Campo SA', employee_code: 'EMP005', status: 'active', created_at: '2024-02-15T10:00:00Z' },
  { id: 'u6', tenant_id: 't1', full_name: 'Sofía Medina', email: 'sofia.medina@ypf.com', role: 'worker', position: 'Administrativa HSE', area: 'HSE', contractor_company: null, employee_code: 'EMP006', status: 'inactive', created_at: '2024-03-01T10:00:00Z' },
  { id: 'admin1', tenant_id: 't1', full_name: 'Admin YPF', email: 'admin@ypf.com', role: 'admin', position: 'Administrador', area: 'IT', contractor_company: null, employee_code: 'ADM001', status: 'active', created_at: '2024-01-15T10:00:00Z' },
  { id: 'super1', tenant_id: null as unknown as string, full_name: 'BondiApps Admin', email: 'admin@bondiapps.com', role: 'super_admin', position: 'Super Admin', area: null, contractor_company: null, employee_code: null, status: 'active', created_at: '2024-01-01T10:00:00Z' },
  { id: 'u7', tenant_id: 't2', full_name: 'Pedro Sosa', email: 'pedro.sosa@tecpetrol.com', role: 'worker', position: 'Técnico', area: 'Operaciones', contractor_company: null, employee_code: 'EMP101', status: 'active', created_at: '2024-02-05T10:00:00Z' },
  { id: 'u8', tenant_id: 't2', full_name: 'Ana Torres', email: 'ana.torres@tecpetrol.com', role: 'worker', position: 'Supervisora', area: 'HSE', contractor_company: null, employee_code: 'EMP102', status: 'active', created_at: '2024-02-10T10:00:00Z' },
];

export const mockTrainings: Training[] = [
  { id: 'tr1', title: 'Inducción HSE', description: 'Capacitación básica en Salud, Seguridad y Medio Ambiente para todo el personal que ingresa a locación.', category: 'HSE', duration_minutes: 120, validity_months: 12, certificate_enabled: true, passing_score: 70, max_attempts: 3, status: 'active', created_at: '2024-01-01T10:00:00Z', module_count: 4, tenant_count: 3 },
  { id: 'tr2', title: 'Cuidado de Manos', description: 'Training práctico sobre protección de manos, identificación de riesgos y buenas prácticas para evitar lesiones durante tareas operativas.', category: 'Seguridad', duration_minutes: 15, validity_months: 24, certificate_enabled: true, passing_score: 80, max_attempts: 2, status: 'active', created_at: '2024-01-05T10:00:00Z', module_count: 1, tenant_count: 4 },
  { id: 'tr3', title: 'Trabajo en altura', description: 'Procedimientos seguros para trabajos en altura, uso de arnés y sistemas de protección contra caídas.', category: 'Seguridad', duration_minutes: 180, validity_months: 12, certificate_enabled: true, passing_score: 75, max_attempts: 3, status: 'active', created_at: '2024-01-10T10:00:00Z', module_count: 5, tenant_count: 3 },
  { id: 'tr4', title: 'Espacios confinados', description: 'Identificación de espacios confinados, riesgos asociados, procedimientos de entrada y rescate.', category: 'Seguridad', duration_minutes: 240, validity_months: 12, certificate_enabled: true, passing_score: 80, max_attempts: 2, status: 'active', created_at: '2024-01-15T10:00:00Z', module_count: 6, tenant_count: 2 },
  { id: 'tr5', title: 'Manejo defensivo', description: 'Técnicas de conducción segura y defensiva para vehículos livianos y pesados en locación.', category: 'Transporte', duration_minutes: 90, validity_months: 24, certificate_enabled: true, passing_score: 70, max_attempts: 3, status: 'active', created_at: '2024-01-20T10:00:00Z', module_count: 3, tenant_count: 4 },
  { id: 'tr6', title: 'Riesgo eléctrico', description: 'Identificación y control de riesgos eléctricos en instalaciones industriales de Oil & Gas.', category: 'Eléctrico', duration_minutes: 120, validity_months: 12, certificate_enabled: true, passing_score: 80, max_attempts: 2, status: 'active', created_at: '2024-02-01T10:00:00Z', module_count: 4, tenant_count: 3 },
  { id: 'tr7', title: 'Primeros auxilios', description: 'Técnicas básicas de primeros auxilios, RCP y manejo de situaciones de emergencia.', category: 'Emergencias', duration_minutes: 150, validity_months: 12, certificate_enabled: true, passing_score: 75, max_attempts: 3, status: 'active', created_at: '2024-02-10T10:00:00Z', module_count: 4, tenant_count: 3 },
  { id: 'tr8', title: 'Permiso de trabajo seguro', description: 'Sistema de permisos de trabajo: tipos, emisión, control y cierre de permisos en áreas operativas.', category: 'HSE', duration_minutes: 90, validity_months: 12, certificate_enabled: true, passing_score: 80, max_attempts: 2, status: 'active', created_at: '2024-02-15T10:00:00Z', module_count: 3, tenant_count: 2 },
  { id: 'tr9', title: 'Control de derrames', description: 'Prevención, contención y respuesta ante derrames de hidrocarburos. Normativa ambiental aplicable.', category: 'Ambiental', duration_minutes: 100, validity_months: 12, certificate_enabled: true, passing_score: 75, max_attempts: 3, status: 'active', created_at: '2024-03-01T10:00:00Z', module_count: 3, tenant_count: 2 },
  { id: 'tr10', title: 'Ingreso seguro a locación', description: 'Procedimientos de ingreso a locaciones productivas, señalización y protocolos de seguridad vial.', category: 'HSE', duration_minutes: 45, validity_months: 6, certificate_enabled: false, passing_score: 60, max_attempts: null, status: 'active', created_at: '2024-03-10T10:00:00Z', module_count: 2, tenant_count: 4 },
];

export const mockTenantTrainings: TenantTraining[] = [
  { id: 'tt1', tenant_id: 't1', training_id: 'tr1', enabled: true, created_at: '2024-01-20T10:00:00Z' },
  { id: 'tt2', tenant_id: 't1', training_id: 'tr2', enabled: true, created_at: '2024-01-20T10:00:00Z' },
  { id: 'tt3', tenant_id: 't1', training_id: 'tr3', enabled: true, created_at: '2024-01-20T10:00:00Z' },
  { id: 'tt4', tenant_id: 't1', training_id: 'tr5', enabled: true, created_at: '2024-01-20T10:00:00Z' },
  { id: 'tt5', tenant_id: 't1', training_id: 'tr7', enabled: true, created_at: '2024-01-20T10:00:00Z' },
  { id: 'tt6', tenant_id: 't1', training_id: 'tr10', enabled: true, created_at: '2024-01-20T10:00:00Z' },
  { id: 'tt7', tenant_id: 't2', training_id: 'tr1', enabled: true, created_at: '2024-02-05T10:00:00Z' },
  { id: 'tt8', tenant_id: 't2', training_id: 'tr2', enabled: true, created_at: '2024-02-05T10:00:00Z' },
  { id: 'tt9', tenant_id: 't2', training_id: 'tr4', enabled: true, created_at: '2024-02-05T10:00:00Z' },
  { id: 'tt10', tenant_id: 't3', training_id: 'tr1', enabled: true, created_at: '2024-03-15T10:00:00Z' },
  { id: 'tt11', tenant_id: 't3', training_id: 'tr6', enabled: true, created_at: '2024-03-15T10:00:00Z' },
  { id: 'tt12', tenant_id: 't4', training_id: 'tr5', enabled: true, created_at: '2024-04-10T10:00:00Z' },
];

export const mockModules: TrainingModule[] = [
  { id: 'm1', training_id: 'tr1', title: 'Introducción y marco legal', description: 'Normativas aplicables y marco regulatorio', order_index: 1, created_at: '2024-01-01T10:00:00Z' },
  { id: 'm2', training_id: 'tr1', title: 'Identificación de riesgos', description: 'Tipos de riesgos en Oil & Gas', order_index: 2, created_at: '2024-01-01T10:00:00Z' },
  { id: 'm3', training_id: 'tr1', title: 'Procedimientos de emergencia', description: 'Plan de respuesta ante emergencias', order_index: 3, created_at: '2024-01-01T10:00:00Z' },
  { id: 'm4', training_id: 'tr1', title: 'Evaluación y cierre', description: 'Test final y certificación', order_index: 4, created_at: '2024-01-01T10:00:00Z' },
  { id: 'm5', training_id: 'tr2', title: 'Cuidado de Manos: Introducción', description: 'Conceptos iniciales sobre protección de manos en tareas operativas.', order_index: 1, created_at: '2026-05-24T10:00:00Z' },

  { id: 'm6', training_id: 'tr3', title: 'Trabajo en altura: Introducción', description: 'Reglas básicas, riesgos principales y controles críticos para trabajos en altura.', order_index: 1, created_at: '2026-05-24T10:00:00Z' },
];

export const mockLessons: TrainingLesson[] = [
  { id: 'l1', module_id: 'm1', title: 'Bienvenida e introducción', description: null, lesson_type: 'video', video_provider: 'bunny', video_id: 'vid001', video_embed_url: 'https://iframe.mediadelivery.net/embed/123/vid001', video_thumbnail_url: 'https://images.pexels.com/photos/2102416/pexels-photo-2102416.jpeg?w=400', duration_seconds: 480, resource_url: null, order_index: 1, is_required: true, created_at: '2024-01-01T10:00:00Z' },
  { id: 'l2', module_id: 'm1', title: 'Marco legal y normativo', description: null, lesson_type: 'video', video_provider: 'bunny', video_id: 'vid002', video_embed_url: 'https://iframe.mediadelivery.net/embed/123/vid002', video_thumbnail_url: 'https://images.pexels.com/photos/1108101/pexels-photo-1108101.jpeg?w=400', duration_seconds: 720, resource_url: 'https://example.com/normativa.pdf', order_index: 2, is_required: true, created_at: '2024-01-01T10:00:00Z' },
  { id: 'l3', module_id: 'm2', title: 'Riesgos físicos y químicos', description: null, lesson_type: 'video', video_provider: 'bunny', video_id: 'vid003', video_embed_url: 'https://iframe.mediadelivery.net/embed/123/vid003', video_thumbnail_url: 'https://images.pexels.com/photos/3862130/pexels-photo-3862130.jpeg?w=400', duration_seconds: 900, resource_url: null, order_index: 1, is_required: true, created_at: '2024-01-01T10:00:00Z' },
  { id: 'l4', module_id: 'm2', title: 'Riesgos ergonómicos', description: null, lesson_type: 'video', video_provider: 'bunny', video_id: 'vid004', video_embed_url: 'https://iframe.mediadelivery.net/embed/123/vid004', video_thumbnail_url: 'https://images.pexels.com/photos/3862632/pexels-photo-3862632.jpeg?w=400', duration_seconds: 600, resource_url: null, order_index: 2, is_required: false, created_at: '2024-01-01T10:00:00Z' },
  { id: 'l5', module_id: 'm5', title: 'Cuidado de Manos: Introducción', description: 'Video introductorio del mock de capacitación sobre cuidado y protección de manos.', lesson_type: 'video', video_provider: 'external', video_id: 'cuidado-de-manos-test2', video_embed_url: '/videos/cuidado-de-manos-test2.mp4', video_thumbnail_url: null, duration_seconds: 180, resource_url: null, order_index: 1, is_required: true, created_at: '2026-05-24T10:00:00Z' },

  { id: 'l6', module_id: 'm6', title: 'Trabajo en altura: Life-Saving Rule', description: 'Video externo de referencia sobre trabajo en altura para reforzar controles críticos y prevención de caídas.', lesson_type: 'video', video_provider: 'youtube', video_id: 'U5N8xLZ-NY4', video_embed_url: 'https://www.youtube.com/embed/U5N8xLZ-NY4', video_thumbnail_url: null, duration_seconds: 60, resource_url: 'https://www.youtube.com/watch?v=U5N8xLZ-NY4&list=PLt0-qTVCvEp2I9MYBd0rqSdooubmkCgAf&index=1', order_index: 1, is_required: true, created_at: '2026-05-24T10:00:00Z' },
];

export const mockQuestions: QuizQuestion[] = [
  { id: 'q1', training_id: 'tr1', question_text: '¿Cuál es el equipo de protección personal mínimo requerido para ingresar a una locación productiva?', question_type: 'multiple_choice', order_index: 1, created_at: '2024-01-01T10:00:00Z' },
  { id: 'q2', training_id: 'tr1', question_text: '¿Ante un derrame de hidrocarburos, la primera acción es notificar al supervisor y contener el área?', question_type: 'true_false', order_index: 2, created_at: '2024-01-01T10:00:00Z' },
  { id: 'q3', training_id: 'tr1', question_text: '¿Qué significa la señal de seguridad de color amarillo?', question_type: 'multiple_choice', order_index: 3, created_at: '2024-01-01T10:00:00Z' },
  { id: 'q4', training_id: 'tr1', question_text: '¿Con qué frecuencia deben realizarse los simulacros de emergencia?', question_type: 'multiple_choice', order_index: 4, created_at: '2024-01-01T10:00:00Z' },
  { id: 'q5', training_id: 'tr1', question_text: '¿Es obligatorio el uso de chaleco reflectante en todo momento dentro de la locación?', question_type: 'true_false', order_index: 5, created_at: '2024-01-01T10:00:00Z' },
];

export const mockOptions: QuizOption[] = [
  { id: 'o1', question_id: 'q1', option_text: 'Casco, zapatos de seguridad y guantes', is_correct: false, order_index: 1, created_at: '2024-01-01T10:00:00Z' },
  { id: 'o2', question_id: 'q1', option_text: 'Casco, zapatos de seguridad, lentes, guantes y chaleco', is_correct: true, order_index: 2, created_at: '2024-01-01T10:00:00Z' },
  { id: 'o3', question_id: 'q1', option_text: 'Solo casco y zapatos de seguridad', is_correct: false, order_index: 3, created_at: '2024-01-01T10:00:00Z' },
  { id: 'o4', question_id: 'q1', option_text: 'No se requiere EPP en locaciones administrativas', is_correct: false, order_index: 4, created_at: '2024-01-01T10:00:00Z' },
  { id: 'o5', question_id: 'q2', option_text: 'Verdadero', is_correct: true, order_index: 1, created_at: '2024-01-01T10:00:00Z' },
  { id: 'o6', question_id: 'q2', option_text: 'Falso', is_correct: false, order_index: 2, created_at: '2024-01-01T10:00:00Z' },
  { id: 'o7', question_id: 'q3', option_text: 'Peligro', is_correct: false, order_index: 1, created_at: '2024-01-01T10:00:00Z' },
  { id: 'o8', question_id: 'q3', option_text: 'Advertencia o precaución', is_correct: true, order_index: 2, created_at: '2024-01-01T10:00:00Z' },
  { id: 'o9', question_id: 'q3', option_text: 'Información general', is_correct: false, order_index: 3, created_at: '2024-01-01T10:00:00Z' },
  { id: 'o10', question_id: 'q3', option_text: 'Área segura', is_correct: false, order_index: 4, created_at: '2024-01-01T10:00:00Z' },
  { id: 'o11', question_id: 'q4', option_text: 'Anualmente', is_correct: false, order_index: 1, created_at: '2024-01-01T10:00:00Z' },
  { id: 'o12', question_id: 'q4', option_text: 'Semestralmente como mínimo', is_correct: true, order_index: 2, created_at: '2024-01-01T10:00:00Z' },
  { id: 'o13', question_id: 'q4', option_text: 'Solo cuando haya un accidente', is_correct: false, order_index: 3, created_at: '2024-01-01T10:00:00Z' },
  { id: 'o14', question_id: 'q4', option_text: 'No son obligatorios', is_correct: false, order_index: 4, created_at: '2024-01-01T10:00:00Z' },
  { id: 'o15', question_id: 'q5', option_text: 'Verdadero', is_correct: true, order_index: 1, created_at: '2024-01-01T10:00:00Z' },
  { id: 'o16', question_id: 'q5', option_text: 'Falso', is_correct: false, order_index: 2, created_at: '2024-01-01T10:00:00Z' },
];

export const mockAssignments: TrainingAssignment[] = [
  { id: 'a2', tenant_id: 't1', training_id: 'tr2', user_id: 'u1', assigned_by: 'admin1', status: 'in_progress', progress_percentage: 45, assigned_at: '2024-03-01T10:00:00Z', due_date: '2024-04-01T10:00:00Z', started_at: '2024-03-05T10:00:00Z', completed_at: null, expires_at: null },
  { id: 'a1', tenant_id: 't1', training_id: 'tr1', user_id: 'u1', assigned_by: 'admin1', status: 'certificate_issued', progress_percentage: 100, assigned_at: '2024-01-25T10:00:00Z', due_date: '2024-03-25T10:00:00Z', started_at: '2024-01-26T10:00:00Z', completed_at: '2024-02-05T10:00:00Z', expires_at: '2025-02-05T10:00:00Z' },
  { id: 'a3', tenant_id: 't1', training_id: 'tr3', user_id: 'u1', assigned_by: 'admin1', status: 'not_started', progress_percentage: 0, assigned_at: '2024-03-10T10:00:00Z', due_date: '2024-05-10T10:00:00Z', started_at: null, completed_at: null, expires_at: null },
  { id: 'a4', tenant_id: 't1', training_id: 'tr1', user_id: 'u2', assigned_by: 'admin1', status: 'certificate_issued', progress_percentage: 100, assigned_at: '2024-01-25T10:00:00Z', due_date: '2024-03-25T10:00:00Z', started_at: '2024-01-28T10:00:00Z', completed_at: '2024-02-10T10:00:00Z', expires_at: '2025-02-10T10:00:00Z' },
  { id: 'a5', tenant_id: 't1', training_id: 'tr2', user_id: 'u2', assigned_by: 'admin1', status: 'passed', progress_percentage: 100, assigned_at: '2024-02-15T10:00:00Z', due_date: '2024-04-15T10:00:00Z', started_at: '2024-02-18T10:00:00Z', completed_at: '2024-02-28T10:00:00Z', expires_at: null },
  { id: 'a6', tenant_id: 't1', training_id: 'tr5', user_id: 'u3', assigned_by: 'admin1', status: 'in_progress', progress_percentage: 70, assigned_at: '2024-02-20T10:00:00Z', due_date: '2024-04-20T10:00:00Z', started_at: '2024-02-22T10:00:00Z', completed_at: null, expires_at: null },
  { id: 'a7', tenant_id: 't1', training_id: 'tr1', user_id: 'u3', assigned_by: 'admin1', status: 'failed', progress_percentage: 100, assigned_at: '2024-01-25T10:00:00Z', due_date: '2024-03-25T10:00:00Z', started_at: '2024-01-30T10:00:00Z', completed_at: null, expires_at: null },
  { id: 'a8', tenant_id: 't1', training_id: 'tr7', user_id: 'u4', assigned_by: 'admin1', status: 'pending_test', progress_percentage: 100, assigned_at: '2024-03-01T10:00:00Z', due_date: '2024-05-01T10:00:00Z', started_at: '2024-03-05T10:00:00Z', completed_at: null, expires_at: null },
  { id: 'a9', tenant_id: 't1', training_id: 'tr10', user_id: 'u5', assigned_by: 'admin1', status: 'not_started', progress_percentage: 0, assigned_at: '2024-04-01T10:00:00Z', due_date: '2024-06-01T10:00:00Z', started_at: null, completed_at: null, expires_at: null },
  { id: 'a10', tenant_id: 't1', training_id: 'tr3', user_id: 'u4', assigned_by: 'admin1', status: 'certificate_issued', progress_percentage: 100, assigned_at: '2024-01-25T10:00:00Z', due_date: '2024-03-25T10:00:00Z', started_at: '2024-01-28T10:00:00Z', completed_at: '2024-02-15T10:00:00Z', expires_at: '2025-02-15T10:00:00Z' },
];

export const mockCertificates: Certificate[] = [
  { id: 'c1', tenant_id: 't1', user_id: 'u1', training_id: 'tr1', assignment_id: 'a1', certificate_url: null, certificate_code: 'CIGUENA-2024-001', issued_at: '2024-02-05T10:00:00Z', expires_at: '2025-02-05T10:00:00Z', status: 'valid', created_at: '2024-02-05T10:00:00Z' },
  { id: 'c2', tenant_id: 't1', user_id: 'u2', training_id: 'tr1', assignment_id: 'a4', certificate_url: null, certificate_code: 'CIGUENA-2024-002', issued_at: '2024-02-10T10:00:00Z', expires_at: '2025-02-10T10:00:00Z', status: 'valid', created_at: '2024-02-10T10:00:00Z' },
  { id: 'c3', tenant_id: 't1', user_id: 'u4', training_id: 'tr3', assignment_id: 'a10', certificate_url: null, certificate_code: 'CIGUENA-2024-003', issued_at: '2024-02-15T10:00:00Z', expires_at: '2025-02-15T10:00:00Z', status: 'expiring_soon', created_at: '2024-02-15T10:00:00Z' },
  { id: 'c4', tenant_id: 't2', user_id: 'u7', training_id: 'tr1', assignment_id: 'a1', certificate_url: null, certificate_code: 'CIGUENA-2024-004', issued_at: '2023-06-01T10:00:00Z', expires_at: '2024-06-01T10:00:00Z', status: 'expired', created_at: '2023-06-01T10:00:00Z' },
];

export const mockFeedback: Feedback[] = [
  { id: 'f1', tenant_id: 't1', user_id: 'u1', training_id: 'tr1', feedback_type: 'training', rating: 5, comment: 'Excelente capacitación, muy completa y fácil de entender. Los videos son muy claros.', created_at: '2024-02-06T10:00:00Z' },
  { id: 'f2', tenant_id: 't1', user_id: 'u2', training_id: 'tr1', feedback_type: 'training', rating: 4, comment: 'Buena capacitación. Podría mejorar la duración de los videos, algunos son muy largos.', created_at: '2024-02-11T10:00:00Z' },
  { id: 'f3', tenant_id: 't1', user_id: 'u4', training_id: null, feedback_type: 'platform', rating: 5, comment: 'La plataforma es muy intuitiva y fácil de usar. Me gusta poder ver mi progreso.', created_at: '2024-02-16T10:00:00Z' },
  { id: 'f4', tenant_id: 't2', user_id: 'u7', training_id: 'tr1', feedback_type: 'training', rating: 3, comment: 'El contenido es bueno pero la plataforma podría tener mejoras de diseño.', created_at: '2024-03-01T10:00:00Z' },
];

export const mockActivityLog: ActivityLog[] = [
  { id: 'al1', tenant_id: 't1', user_id: 'u1', action: 'completed_training', entity_type: 'training', entity_id: 'tr1', metadata: { training_name: 'Inducción HSE' }, created_at: '2024-02-05T10:00:00Z' },
  { id: 'al2', tenant_id: 't1', user_id: 'admin1', action: 'assigned_training', entity_type: 'assignment', entity_id: 'a9', metadata: { user_name: 'Roberto Álvarez', training_name: 'Ingreso seguro a locación' }, created_at: '2024-04-01T10:00:00Z' },
  { id: 'al3', tenant_id: 't1', user_id: 'u4', action: 'started_training', entity_type: 'training', entity_id: 'tr7', metadata: { training_name: 'Primeros auxilios' }, created_at: '2024-03-05T10:00:00Z' },
  { id: 'al4', tenant_id: 't1', user_id: 'u2', action: 'certificate_issued', entity_type: 'certificate', entity_id: 'c2', metadata: { training_name: 'Inducción HSE' }, created_at: '2024-02-10T10:00:00Z' },
];

export const getTrainingsByTenant = (tenantId: string): Training[] => {
  const tenantTrainingIds = mockTenantTrainings
    .filter(tt => tt.tenant_id === tenantId && tt.enabled)
    .map(tt => tt.training_id);
  return mockTrainings.filter(t => tenantTrainingIds.includes(t.id));
};

export const getUsersByTenant = (tenantId: string): Profile[] => {
  return mockProfiles.filter(p => p.tenant_id === tenantId && p.role === 'worker');
};

export const getAssignmentsByUser = (userId: string): TrainingAssignment[] => {
  const assignments = mockAssignments.filter(a => a.user_id === userId);
  return assignments.map(a => ({
    ...a,
    training: mockTrainings.find(t => t.id === a.training_id),
    user: mockProfiles.find(p => p.id === a.user_id),
  }));
};

export const getAssignmentsByTenant = (tenantId: string): TrainingAssignment[] => {
  const assignments = mockAssignments.filter(a => a.tenant_id === tenantId);
  return assignments.map(a => ({
    ...a,
    training: mockTrainings.find(t => t.id === a.training_id),
    user: mockProfiles.find(p => p.id === a.user_id),
  }));
};

export const getCertificatesByTenant = (tenantId: string): Certificate[] => {
  const certs = mockCertificates.filter(c => c.tenant_id === tenantId);
  return certs.map(c => ({
    ...c,
    training: mockTrainings.find(t => t.id === c.training_id),
    user: mockProfiles.find(p => p.id === c.user_id),
  }));
};

export const getCertificatesByUser = (userId: string): Certificate[] => {
  const certs = mockCertificates.filter(c => c.user_id === userId);
  return certs.map(c => ({
    ...c,
    training: mockTrainings.find(t => t.id === c.training_id),
  }));
};