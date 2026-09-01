// Fórmula da média: testes/trabalho = 40% (divididos em 3), exame = 60%
const EXAM_NAME = "Exame";
const EXAM_WEIGHT = 60;
const OTHER_WEIGHT = 40 / 3;

export const getAssessmentPercent = (name) => {
  return name === EXAM_NAME ? EXAM_WEIGHT : OTHER_WEIGHT;
};

export const calculateMediaByAssessments = (gradesMap, assessments) => {
  let totalWeightedSum = 0;
  let totalWeight = 0;

  assessments.forEach((a) => {
    const gradeValue = gradesMap[a.id];
    if (gradeValue !== undefined && gradeValue !== null) {
      const weight = getAssessmentPercent(a.name);
      totalWeightedSum += gradeValue * weight;
      totalWeight += weight;
    }
  });

  if (totalWeight === 0) return null;
  return Math.round(totalWeightedSum / totalWeight);
};

export const calculateMediaByGradeEntries = (grades) => {
  let totalWeightedSum = 0;
  let totalWeight = 0;

  grades.forEach((g) => {
    if (g.value !== undefined && g.value !== null) {
      const weight = getAssessmentPercent(g.assessment?.name);
      totalWeightedSum += g.value * weight;
      totalWeight += weight;
    }
  });

  if (totalWeight === 0) return null;
  return Math.round(totalWeightedSum / totalWeight);
};