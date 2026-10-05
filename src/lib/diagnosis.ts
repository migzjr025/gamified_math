export interface QuestionItem {
  id: number;
  unitId: number;
  gradeLevel: string;
  quarter?: string | null;
  difficulty: number;
  prompt: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  explanation?: string | null;
  unitTitle?: string | null;
}

export interface DiagnosticResult {
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  percentage: number;
  masteryLevel: "Master" | "Proficient" | "Developing" | "Needs Support";
  badgeTitle: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  summaryRemarks: string;
  detailedFeedback: string;
  questionReview: Array<{
    id: number;
    prompt: string;
    unitTitle: string;
    studentAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
    explanation: string;
  }>;
}

export function generateDiagnosis(
  questions: QuestionItem[],
  answers: Record<number, string>
): DiagnosticResult {
  const totalQuestions = questions.length || 0;
  if (totalQuestions === 0) {
    return {
      score: 0,
      totalQuestions: 0,
      correctAnswers: 0,
      percentage: 0,
      masteryLevel: "Needs Support",
      badgeTitle: "Apprentice in Training",
      strengths: [],
      weaknesses: ["No questions were attempted in this session."],
      recommendations: ["Select a grade level and complete the challenge items."],
      summaryRemarks: "No assessment data available.",
      detailedFeedback: "Please attempt the math challenge to receive diagnostic remarks.",
      questionReview: [],
    };
  }

  const correctQuestions: QuestionItem[] = [];
  const incorrectQuestions: QuestionItem[] = [];

  const questionReview = questions.map((q) => {
    const studentAnswer = answers[q.id] || "Skipped";
    const isCorrect = studentAnswer.toUpperCase() === q.correctAnswer.toUpperCase();
    if (isCorrect) {
      correctQuestions.push(q);
    } else {
      incorrectQuestions.push(q);
    }

    return {
      id: q.id,
      prompt: q.prompt,
      unitTitle: q.unitTitle || `Unit ${q.unitId}`,
      studentAnswer,
      correctAnswer: q.correctAnswer,
      isCorrect,
      explanation: q.explanation || "Review fundamental concepts related to this problem.",
    };
  });

  const correctAnswers = correctQuestions.length;
  const percentage = Math.round((correctAnswers / totalQuestions) * 100);

  // Group by Unit/Topic
  const correctUnits = new Set(correctQuestions.map((q) => q.unitTitle || `Unit ${q.unitId}`));
  const incorrectUnits = new Set(incorrectQuestions.map((q) => q.unitTitle || `Unit ${q.unitId}`));

  // 1. Mastery Tier
  let masteryLevel: DiagnosticResult["masteryLevel"] = "Needs Support";
  let badgeTitle = "🎯 Apprentice Explorer";

  if (percentage >= 90) {
    masteryLevel = "Master";
    badgeTitle = "🏆 Math Master";
  } else if (percentage >= 75) {
    masteryLevel = "Proficient";
    badgeTitle = "🌟 Matatag Math Scholar";
  } else if (percentage >= 50) {
    masteryLevel = "Developing";
    badgeTitle = "⚡ Rising Problem Solver";
  } else {
    masteryLevel = "Needs Support";
    badgeTitle = "🌱 Apprentice in Training";
  }

  // 2. Strengths Determination
  const strengths: string[] = [];
  if (correctQuestions.length > 0) {
    correctUnits.forEach((unit) => {
      // If student got all questions in this unit right
      const unitQuestions = questions.filter((q) => (q.unitTitle || `Unit ${q.unitId}`) === unit);
      const unitCorrect = correctQuestions.filter((q) => (q.unitTitle || `Unit ${q.unitId}`) === unit);
      if (unitCorrect.length === unitQuestions.length) {
        strengths.push(`Full mastery demonstrated in ${unit} (${unitCorrect.length}/${unitQuestions.length} correct).`);
      } else {
        strengths.push(`Strong understanding of foundational concepts in ${unit}.`);
      }
    });

    if (percentage >= 80) {
      strengths.push("High computational speed and problem-solving accuracy.");
    }
  } else {
    strengths.push("Shows eagerness to participate and complete the challenge.");
  }

  // 3. Weaknesses / Focus Areas Determination
  const weaknesses: string[] = [];
  if (incorrectQuestions.length > 0) {
    incorrectUnits.forEach((unit) => {
      const unitIncorrect = incorrectQuestions.filter((q) => (q.unitTitle || `Unit ${q.unitId}`) === unit);
      weaknesses.push(`Struggles with ${unit} (${unitIncorrect.length} missed question${unitIncorrect.length > 1 ? "s" : ""}).`);
    });

    const skippedCount = questionReview.filter((r) => r.studentAnswer === "Skipped").length;
    if (skippedCount > 0) {
      weaknesses.push(`${skippedCount} item(s) were left unanswered or skipped.`);
    }

    if (percentage < 60) {
      weaknesses.push("Frequent errors on multi-step calculations or word problem interpretations.");
    }
  } else {
    weaknesses.push("No notable weaknesses detected on this challenge set.");
  }

  // 4. Actionable Advice & Recommendations
  const recommendations: string[] = [];
  if (incorrectQuestions.length > 0) {
    incorrectUnits.forEach((unit) => {
      recommendations.push(`Review learning materials and examples for: "${unit}".`);
    });
    recommendations.push("Practice 5–10 minutes daily with interactive flashcard exercises and visual models.");
    recommendations.push("Carefully read the explanations provided in the answer review before attempting next quiz.");
    recommendations.push(`Next Target: Aim for ${Math.min(100, percentage + 20)}% on the next retry challenge.`);
  } else {
    recommendations.push("Ready for advanced Math quests and higher difficulty levels (Difficulty 3+).");
    recommendations.push("Encourage student to mentor peers or explore enrichment geometry and word problem tasks.");
  }

  // 5. Formatted Summary Remarks for Report Cards & Grades
  const summaryRemarks = percentage >= 80
    ? `Exceptional performance (${percentage}%). ${strengths[0]} Recommendations: ${recommendations[0]}`
    : percentage >= 50
    ? `Satisfactory progress (${percentage}%). Strength: ${strengths[0]} Area for growth: ${weaknesses[0]}`
    : `Needs remediation (${percentage}%). Focus area: ${weaknesses[0]} Advice: ${recommendations[0]}`;

  const detailedFeedback = [
    `📊 Score: ${correctAnswers}/${totalQuestions} (${percentage}%) - ${badgeTitle}`,
    `\n🌟 STRENGTHS:`,
    ...strengths.map((s) => `• ${s}`),
    `\n⚠️ AREAS FOR IMPROVEMENT:`,
    ...weaknesses.map((w) => `• ${w}`),
    `\n💡 ACTIONABLE ADVICE & RECOMMENDATIONS:`,
    ...recommendations.map((r) => `• ${r}`),
  ].join("\n");

  return {
    score: correctAnswers,
    totalQuestions,
    correctAnswers,
    percentage,
    masteryLevel,
    badgeTitle,
    strengths,
    weaknesses,
    recommendations,
    summaryRemarks,
    detailedFeedback,
    questionReview,
  };
}

