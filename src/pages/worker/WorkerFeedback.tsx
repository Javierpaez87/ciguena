import React, { useState } from 'react';
import { Star, Send, Check } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getAssignmentsByUser } from '../../lib/mockData';

export default function WorkerFeedback() {
  const { user } = useAuth();
  const assignments = getAssignmentsByUser(user?.id ?? 'u1').filter(a => ['completed', 'passed', 'certificate_issued'].includes(a.status));

  const [feedbackType, setFeedbackType] = useState<'platform' | 'training'>('platform');
  const [selectedTraining, setSelectedTraining] = useState('');
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check size={28} className="text-emerald-400" />
        </div>
        <h2 className="text-xl font-bold text-steel-100 mb-2">¡Gracias por tu feedback!</h2>
        <p className="text-steel-400 text-sm mb-6">Tu opinión nos ayuda a mejorar la plataforma y los contenidos.</p>
        <button onClick={() => { setSubmitted(false); setRating(0); setComment(''); setSelectedTraining(''); }} className="btn-secondary mx-auto">
          Enviar otro feedback
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="card">
        <h2 className="text-lg font-semibold text-steel-100 mb-1">Dejar feedback</h2>
        <p className="text-sm text-steel-400 mb-6">Tu opinión es muy importante para mejorar la experiencia.</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Type */}
          <div>
            <label className="label">¿Sobre qué querés dejar feedback?</label>
            <div className="flex gap-3">
              {[
                { value: 'platform', label: 'La plataforma' },
                { value: 'training', label: 'Un training' },
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFeedbackType(opt.value as any)}
                  className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-all ${feedbackType === opt.value ? 'bg-amber-500/20 border-amber-500/60 text-amber-300' : 'bg-steel-900 border-steel-700 text-steel-300 hover:border-steel-500'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Training selector */}
          {feedbackType === 'training' && (
            <div>
              <label className="label">Training</label>
              <select value={selectedTraining} onChange={e => setSelectedTraining(e.target.value)} className="select" required>
                <option value="">Seleccioná un training...</option>
                {assignments.map(a => (
                  <option key={a.id} value={a.training_id}>{a.training?.title}</option>
                ))}
              </select>
            </div>
          )}

          {/* Rating */}
          <div>
            <label className="label">Calificación</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    size={32}
                    className={`transition-colors ${star <= (hoverRating || rating) ? 'text-amber-400 fill-amber-400' : 'text-steel-600'}`}
                  />
                </button>
              ))}
              {rating > 0 && (
                <span className="text-sm text-steel-400 ml-2 self-center">
                  {['', 'Muy malo', 'Malo', 'Regular', 'Bueno', 'Excelente'][rating]}
                </span>
              )}
            </div>
          </div>

          {/* Comment */}
          <div>
            <label className="label">Comentario <span className="text-steel-500">(opcional)</span></label>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              className="input"
              rows={4}
              placeholder="Contanos tu experiencia..."
            />
          </div>

          <button
            type="submit"
            disabled={rating === 0 || (feedbackType === 'training' && !selectedTraining)}
            className="btn-primary w-full justify-center py-3"
          >
            <Send size={15} /> Enviar feedback
          </button>
        </form>
      </div>
    </div>
  );
}
