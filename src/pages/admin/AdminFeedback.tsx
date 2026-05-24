import React from 'react';
import { Star, MessageSquare } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { mockFeedback, mockProfiles, mockTrainings } from '../../lib/mockData';

export default function AdminFeedback() {
  const { user } = useAuth();
  const tenantId = user?.tenant_id ?? 't1';

  const feedback = mockFeedback
    .filter(f => f.tenant_id === tenantId)
    .map(f => ({
      ...f,
      user: mockProfiles.find(p => p.id === f.user_id),
      training: f.training_id ? mockTrainings.find(t => t.id === f.training_id) : null,
    }));

  const avgRating = feedback.length ? (feedback.reduce((s, f) => s + f.rating, 0) / feedback.length).toFixed(1) : '0';
  const trainingFeedback = feedback.filter(f => f.feedback_type === 'training');
  const platformFeedback = feedback.filter(f => f.feedback_type === 'platform');

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="metric-card text-center">
          <div className="text-3xl font-bold text-amber-400 mb-1">{avgRating}</div>
          <div className="flex justify-center mb-1">
            {[1,2,3,4,5].map(s => <Star key={s} size={14} className={s <= Number(avgRating) ? 'text-amber-400 fill-amber-400' : 'text-steel-600'} />)}
          </div>
          <div className="text-xs text-steel-400">Rating promedio</div>
        </div>
        <div className="metric-card text-center">
          <div className="text-3xl font-bold text-steel-50 mb-1">{trainingFeedback.length}</div>
          <div className="text-xs text-steel-400">Sobre trainings</div>
        </div>
        <div className="metric-card text-center">
          <div className="text-3xl font-bold text-steel-50 mb-1">{platformFeedback.length}</div>
          <div className="text-xs text-steel-400">Sobre plataforma</div>
        </div>
      </div>

      {feedback.length === 0 ? (
        <div className="text-center py-16">
          <MessageSquare size={32} className="mx-auto mb-3 text-steel-600" />
          <p className="text-steel-500 text-sm">Todavía no hay feedback de tus usuarios.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {feedback.map(fb => (
            <div key={fb.id} className="card hover:border-steel-600 transition-colors">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-petroleum-700 rounded-full flex items-center justify-center text-sm font-bold text-petroleum-200 flex-shrink-0">
                  {fb.user?.full_name.charAt(0)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-steel-100">{fb.user?.full_name}</span>
                    <div className="flex">
                      {[1,2,3,4,5].map(s => <Star key={s} size={12} className={s <= fb.rating ? 'text-amber-400 fill-amber-400' : 'text-steel-600'} />)}
                    </div>
                  </div>
                  {fb.training ? (
                    <span className="badge badge-info text-xs mb-2">{fb.training.title}</span>
                  ) : (
                    <span className="badge badge-neutral text-xs mb-2">Plataforma</span>
                  )}
                  {fb.comment && <p className="text-sm text-steel-300 mt-1">{fb.comment}</p>}
                  <p className="text-xs text-steel-500 mt-2">{new Date(fb.created_at).toLocaleDateString('es-AR')}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
