import { workingAtHeightsTest } from './workingAtHeights';
import { handSafetyTest } from './handSafety';
import { confinedSpacesTest } from './confinedSpaces';
import { energyIsolationTest } from './energyIsolation';
import { lineOfFireTest } from './lineOfFire';
import { mechanicalLiftingTest } from './mechanicalLifting';
import { hotWorkTest } from './hotWork';
import { workAuthorizationTest } from './workAuthorization';
import { bypassControlsTest } from './bypassControls';
import { safeDrivingTest } from './safeDriving';
import type { TrainingTest, TrainingTestAttemptConfig } from './types';

export type { TrainingTest, TrainingTestQuestion, TrainingTestOption, TrainingTestOptionKey } from './types';

export const trainingTests: TrainingTest[] = [
  workingAtHeightsTest,
  handSafetyTest,
  confinedSpacesTest,
  energyIsolationTest,
  lineOfFireTest,
  mechanicalLiftingTest,
  hotWorkTest,
  workAuthorizationTest,
  bypassControlsTest,
  safeDrivingTest,
];

export const getTrainingTestByTrainingId = (trainingId: string): TrainingTest | null => {
  return trainingTests.find(test => test.trainingId === trainingId) ?? null;
};

export const getTrainingTestAttempt = (
  trainingId: string,
  attemptNumber: number
): TrainingTestAttemptConfig | null => {
  const test = getTrainingTestByTrainingId(trainingId);

  if (!test) return null;

  const safeAttemptNumber = Math.max(1, attemptNumber);
  const startIndex = (safeAttemptNumber - 1) * test.questionsPerAttempt;
  const endIndex = startIndex + test.questionsPerAttempt;
  const questions = test.questions.slice(startIndex, endIndex);

  if (questions.length === 0) return null;

  return {
    attemptNumber: safeAttemptNumber,
    questions,
  };
};

export const getTrainingTestMaxAttempts = (trainingId: string): number => {
  const test = getTrainingTestByTrainingId(trainingId);
  return test?.maxAttempts ?? 0;
};
