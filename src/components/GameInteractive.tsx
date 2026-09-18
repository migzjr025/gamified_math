"use client";

import { useEffect, useMemo, useState } from "react";
import { Trophy, Sparkles, CheckCircle2, ArrowRight, Target } from "lucide-react";
import SidebarNav from "@/components/SidebarNav";

interface Question {
  id: number;
  unitId: number;
  gradeLevel: string;
  difficulty: number;
  prompt: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  explanation?: string | null;
  isActive?: boolean;
  unitTitle?: string;
}

interface Student {
  id: number;
  fullName: string;
  gradeLevel: string;
}

interface Assessment {
  id: number;
  title: string;
}

export default function GameInteractive({ userName, role }: { userName: string; role?: string }) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<number>(1);
  const [selectedGrade, setSelectedGrade] = useState("Grade 2");
  const [loading, setLoading] = useState(true);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<{ percentage: number; correctAnswers: number; totalQuestions: number; feedback: string } | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [questionsRes, studentsRes, assessmentsRes] = await Promise.all([
        fetch("/api/questions"),
        fetch("/api/students"),
        fetch("/api/assessments"),
      ]);

      const questionData = await questionsRes.json();
      const studentData = await studentsRes.json();
      const assessmentData = await assessmentsRes.json();

      setQuestions(questionData);
      setStudents(studentData);
      setAssessments(assessmentData);
      if (studentData[0]) setSelectedStudentId(studentData[0].id);
      setLoading(false);
    }

    load();
  }, []);

  const filteredQuestions = useMemo(() => {
    return [...questions]
      .filter((question) => question.gradeLevel === selectedGrade && question.isActive !== false)
      .sort(() => Math.random() - 0.5)
      .slice(0, 5);
  }, [questions, selectedGrade]);

  const currentQuestion = filteredQuestions[activeQuestionIndex];

  const submitQuiz = async () => {
    const totalQuestions = filteredQuestions.length || 0;
    const correctAnswers = filteredQuestions.filter((question) => answers[question.id] === question.correctAnswer).length;
    const percentage = totalQuestions === 0 ? 0 : (correctAnswers / totalQuestions) * 100;
    const feedback = percentage >= 80 ? "Excellent work! You are mastering the Matatag Math concepts." : percentage >= 60 ? "Good effort! You are progressing well in the curriculum." : "Keep practicing! Review the lesson and try again.";

    setResult({ percentage, correctAnswers, totalQuestions, feedback });
    setSubmitted(true);

    const assessmentId = assessments[0]?.id ?? 1;
    await fetch("/api/game-results", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId: selectedStudentId,
        assessmentId,
        gradeLevel: selectedGrade,
        score: correctAnswers,
        totalQuestions,
        correctAnswers,
        percentage,
        feedback,
      }),
    });
  };

  const answeredCount = Object.keys(answers).length;

  if (loading) {
    return (
      <div className="min-h-screen flex bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-950 text-slate-50">
        <SidebarNav userName={userName} role={role} />
        <main className="flex-1 lg:ml-72 min-h-screen flex items-center justify-center">
          <div className="h-16 w-16 rounded-full border-4 border-violet-500 border-t-transparent animate-spin" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-950 text-slate-50">
      <SidebarNav userName={userName} role={role} />
      <main className="flex-1 lg:ml-72 min-h-screen">
        <div className="max-w-5xl mx-auto px-6 py-10">
          <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.18em] text-violet-300 font-bold">Matatag Math Quest</p>
              <h1 className="text-3xl lg:text-4xl font-extrabold bg-gradient-to-r from-white to-violet-200 bg-clip-text text-transparent mt-2">Academic Challenge Game</h1>
            </div>
            <div className="flex items-center gap-2 text-amber-200 bg-amber-500/10 border border-amber-400/20 px-3 py-2 rounded-xl">
              <Trophy size={18} />
              <span className="font-semibold">Progress tracked for grading</span>
            </div>
          </div>

          {!submitted ? (
            <>
              <div className="glass-card rounded-3xl p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs uppercase tracking-[0.12em] text-slate-400 mb-2">Student</label>
                    <select value={selectedStudentId} onChange={(e) => setSelectedStudentId(Number(e.target.value))} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/40">
                      {students.map((student) => <option key={student.id} value={student.id} className="bg-slate-900">{student.fullName}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-[0.12em] text-slate-400 mb-2">Grade level</label>
                    <select value={selectedGrade} onChange={(e) => setSelectedGrade(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/40">
                      {['Grade 1', 'Grade 2'].map((grade) => <option key={grade} value={grade} className="bg-slate-900">{grade}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-[0.12em] text-slate-400 mb-2">Questions ready</label>
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm font-semibold">
                      <Target size={16} className="text-violet-300" />
                      {filteredQuestions.length} challenge items
                    </div>
                  </div>
                </div>
              </div>

              {filteredQuestions.length === 0 ? (
                <div className="glass-card rounded-3xl p-12 text-center">
                  <Sparkles size={56} className="mx-auto text-slate-600 mb-4" />
                  <h2 className="text-2xl font-extrabold text-white mb-2">No game questions available</h2>
                  <p className="text-slate-400">Ask the teacher to add Matatag questions for this grade level.</p>
                </div>
              ) : currentQuestion ? (
                <div className="glass-card rounded-3xl p-6 md:p-8">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs uppercase tracking-[0.18em] text-violet-300 font-bold">Question {activeQuestionIndex + 1} of {filteredQuestions.length}</span>
                    <span className="text-xs uppercase tracking-[0.12em] text-slate-400">{currentQuestion.unitTitle ?? "Matatag Unit"}</span>
                  </div>

                  <h2 className="text-2xl md:text-3xl font-extrabold text-white leading-relaxed mb-6">{currentQuestion.prompt}</h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {(['A', 'B', 'C', 'D'] as const).map((optionKey) => {
                      const optionValue = currentQuestion[`option${optionKey}` as keyof Question] as string;
                      const selected = answers[currentQuestion.id] === optionKey;
                      return (
                        <button
                          key={optionKey}
                          onClick={() => setAnswers((prev) => ({ ...prev, [currentQuestion.id]: optionKey }))}
                          className={`text-left px-5 py-4 rounded-2xl border transition ${
                            selected
                              ? "bg-violet-600/30 border-violet-400 text-white shadow-lg shadow-violet-950/40"
                              : "bg-white/5 border-white/10 text-slate-200 hover:border-violet-400/50 hover:bg-white/10"
                          }`}
                        >
                          <span className="font-bold mr-2">{optionKey}.</span>
                          {optionValue}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-sm text-slate-400">Answered: {answeredCount}/{filteredQuestions.length}</div>
                    <div className="flex gap-3">
                      {activeQuestionIndex > 0 && (
                        <button onClick={() => setActiveQuestionIndex((prev) => prev - 1)} className="px-4 py-2.5 rounded-xl border border-white/10 text-sm font-semibold text-slate-200 hover:bg-white/5 transition">Previous</button>
                      )}
                      {activeQuestionIndex < filteredQuestions.length - 1 ? (
                        <button onClick={() => setActiveQuestionIndex((prev) => prev + 1)} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-violet-400 text-white font-bold shadow-lg hover:scale-[1.02] transition">
                          Next <ArrowRight size={16} />
                        </button>
                      ) : (
                        <button onClick={submitQuiz} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-white font-bold shadow-lg hover:scale-[1.02] transition">
                          Finish Challenge
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}
            </>
          ) : result ? (
            <div className="glass-card rounded-3xl p-8 md:p-10 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300 mb-5">
                <CheckCircle2 size={40} />
              </div>
              <p className="text-sm uppercase tracking-[0.18em] text-violet-300 font-bold">Challenge complete</p>
              <h2 className="text-4xl font-extrabold text-white mt-3">{result.percentage.toFixed(0)}%</h2>
              <p className="text-slate-300 mt-2">You got {result.correctAnswers} out of {result.totalQuestions} correct answers.</p>
              <p className="text-lg text-amber-200 font-semibold mt-4">{result.feedback}</p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <button onClick={() => window.location.reload()} className="px-5 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-violet-400 text-white font-bold">Play Again</button>
              </div>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
