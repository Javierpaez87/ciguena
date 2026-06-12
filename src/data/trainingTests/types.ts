export type TrainingTestOptionKey = 'a' | 'b' | 'c' | 'd';

export interface TrainingTestOption {
  key: TrainingTestOptionKey;
  text: string;
}

export interface TrainingTestQuestion {
  id: string;
  question: string;
  options: TrainingTestOption[];
  correctOption: TrainingTestOptionKey;
}

export interface TrainingTest {
  id: string;
  trainingId: string;
  title: string;
  description?: string;
  passingScore: number;
  questionsPerAttempt: number;
  maxAttempts: number;
  attemptMode: 'sequential_blocks';
  questions: TrainingTestQuestion[];
}

export interface TrainingTestAttemptConfig {
  attemptNumber: number;
  questions: TrainingTestQuestion[];
}
