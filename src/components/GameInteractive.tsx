"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Trophy,
  Sparkles,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Target,
  Lightbulb,
  AlertTriangle,
  Award,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  BookOpen,
  ArrowUpRight,
} from "lucide-react";
import Link from "next/link";
import SidebarNav from "@/components/SidebarNav";
import { generateDiagnosis, DiagnosticResult, QuestionItem } from "@/lib/diagnosis";

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
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<number>(1);
  const [selectedGrade, setSelectedGrade] = useState("Grade 2");
  const [loading, setLoading] = useState(true);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [diagnosis, setDiagnosis] = useState<DiagnosticResult | null>(null);
  const [showItemReview, setShowItemReview] = useState(true);
  const [challengeSeed, setChallengeSeed] = useState(0);

  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [questionsRes, studentsRes, assessmentsRes] = await Promise.all([
          fetch("/api/questions"),
          fetch("/api/students"),
          fetch("/api/assessments"),
        ]);

        const questionData = questionsRes.ok ? await questionsRes.json() : [];
        const studentData = studentsRes.ok ? await studentsRes.json() : [];
        const assessmentData = assessmentsRes.ok ? await assessmentsRes.json() : [];

        const safeQuestions = Array.isArray(questionData) ? questionData : [];
        const safeStudents = Array.isArray(studentData) ? studentData : [];
        const safeAssessments = Array.isArray(assessmentData) ? assessmentData : [];

        setQuestions(safeQuestions);
        setStudents(safeStudents);
        setAssessments(safeAssessments);
        if (safeStudents[0]) setSelectedStudentId(safeStudents[0].id);
      } catch (err) {
        console.error("Game load error:", err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const filteredQuestions = useMemo(() => {
    const list = Array.isArray(questions) ? questions : [];
    return [...list]
      .filter((question) => question.gradeLevel === selectedGrade && (question as any).isActive !== false)
      .sort((left, right) => {
        const leftKey = (left.id * 31 + challengeSeed * 17) % 1009;
        const rightKey = (right.id * 31 + challengeSeed * 17) % 1009;
        return leftKey - rightKey;
      })
      .slice(0, 5);
  }, [questions, selectedGrade, challengeSeed]);

  const currentQuestion = filteredQuestions[activeQuestionIndex];

  const submitQuiz = async () => {
    setSaving(true);
    setSubmitError(null);
    const diag = generateDiagnosis(filteredQuestions, answers);
    setDiagnosis(diag);
    setSubmitted(true);

    try {
      const assessmentId = assessments[0]?.id ?? 1;
      const res = await fetch("/api/game-results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: selectedStudentId,
          assessmentId,
          gradeLevel: selectedGrade,
          score: diag.correctAnswers,
          totalQuestions: diag.totalQuestions,
          correctAnswers: diag.correctAnswers,
          percentage: diag.percentage,
          feedback: diag.detailedFeedback,
        }),
      });
      if (!res.ok) {
        setSubmitError("Quiz results evaluated locally. Note: Cloud database recording was unavailable.");
      }
    } catch (err) {
      console.warn("Failed to record game result to cloud", err);
      setSubmitError("Quiz results evaluated locally. Note: Cloud database recording was unavailable.");
    } finally {
      setSaving(false);
    }
  };

  const answeredCount = Object.keys(answers).length;
  const selectedStudent = students.find((s) => s.id === selectedStudentId);

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
              <h1 className="text-3xl lg:text-4xl font-extrabold bg-gradient-to-r from-white to-violet-200 bg-clip-text text-transparent mt-2">
                Academic Challenge & Diagnostic
              </h1>
            </div>
            <div className="flex items-center gap-2 text-amber-200 bg-amber-500/10 border border-amber-400/20 px-3.5 py-2 rounded-xl text-sm font-semibold shadow-sm">
              <Trophy size={18} />
              <span>Real-time remarks & mastery tracking</span>
            </div>
          </div>

          {!submitted ? (
            <>
              <div className="glass-card rounded-3xl p-6 mb-6 shadow-xl border border-white/10">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs uppercase tracking-[0.12em] text-slate-400 mb-2">Student</label>
                    <select
                      value={selectedStudentId}
                      onChange={(e) => setSelectedStudentId(Number(e.target.value))}
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/40 text-white font-medium"
                    >
                      {students.map((student) => (
                        <option key={student.id} value={student.id} className="bg-slate-900">
                          {student.fullName} ({student.gradeLevel})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-[0.12em] text-slate-400 mb-2">Grade level</label>
                    <select
                      value={selectedGrade}
                      onChange={(e) => setSelectedGrade(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/40 text-white font-medium"
                    >
                      {["Grade 1", "Grade 2"].map((grade) => (
                        <option key={grade} value={grade} className="bg-slate-900">
                          {grade}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-[0.12em] text-slate-400 mb-2">Questions Ready</label>
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm font-semibold text-slate-200">
                      <Target size={16} className="text-violet-300" />
                      {filteredQuestions.length} Challenge Items
                    </div>
                  </div>
                </div>
              </div>

              {filteredQuestions.length === 0 ? (
                <div className="glass-card rounded-3xl p-12 text-center border border-white/10">
                  <Sparkles size={56} className="mx-auto text-slate-600 mb-4" />
                  <h2 className="text-2xl font-extrabold text-white mb-2">No game questions available</h2>
                  <p className="text-slate-400">Ask the teacher to add Matatag questions for this grade level.</p>
                </div>
              ) : currentQuestion ? (
                <div className="glass-card rounded-3xl p-6 md:p-8 shadow-2xl border border-white/10">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs uppercase tracking-[0.18em] text-violet-300 font-bold">
                      Question {activeQuestionIndex + 1} of {filteredQuestions.length}
                    </span>
                    <span className="text-xs uppercase tracking-[0.12em] text-slate-400 font-medium">
                      {currentQuestion.unitTitle ?? "Matatag Unit"}
                    </span>
                  </div>

                  <h2 className="text-2xl md:text-3xl font-extrabold text-white leading-relaxed mb-6">
                    {currentQuestion.prompt}
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {(["A", "B", "C", "D"] as const).map((optionKey) => {
                      const optionValue = currentQuestion[`option${optionKey}` as keyof QuestionItem] as string;
                      const selected = answers[currentQuestion.id] === optionKey;
                      return (
                        <button
                          key={optionKey}
                          onClick={() => setAnswers((prev) => ({ ...prev, [currentQuestion.id]: optionKey }))}
                          className={`text-left px-5 py-4 rounded-2xl border transition cursor-pointer ${
                            selected
                              ? "bg-violet-600/30 border-violet-400 text-white shadow-lg shadow-violet-950/40 font-semibold"
                              : "bg-white/5 border-white/10 text-slate-200 hover:border-violet-400/50 hover:bg-white/10"
                          }`}
                        >
                          <span className="font-bold mr-2 text-violet-300">{optionKey}.</span>
                          {optionValue}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-sm text-slate-400">
                      Answered: <span className="font-bold text-white">{answeredCount}</span> of {filteredQuestions.length}
                    </div>
                    <div className="flex gap-3">
                      {activeQuestionIndex > 0 && (
                        <button
                          onClick={() => setActiveQuestionIndex((prev) => prev - 1)}
                          className="px-4 py-2.5 rounded-xl border border-white/10 text-sm font-semibold text-slate-200 hover:bg-white/5 transition cursor-pointer"
                        >
                          Previous
                        </button>
                      )}
                      {activeQuestionIndex < filteredQuestions.length - 1 ? (
                        <button
                          onClick={() => setActiveQuestionIndex((prev) => prev + 1)}
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-violet-400 text-white font-bold shadow-lg hover:scale-[1.02] transition cursor-pointer"
                        >
                          Next <ArrowRight size={16} />
                        </button>
                      ) : (
                        <button
                          onClick={submitQuiz}
                          disabled={saving}
                          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-white font-bold shadow-lg hover:scale-[1.02] transition cursor-pointer disabled:opacity-50"
                        >
                          {saving ? "Analyzing Results..." : "Finish Challenge & Analyze"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}
            </>
          ) : diagnosis ? (
            <div className="space-y-6">
              {/* Top Mastery Banner */}
              <div className="glass-card rounded-3xl p-8 md:p-10 text-center shadow-2xl border border-white/10 relative overflow-hidden">
                <div className="absolute -right-12 -top-12 w-48 h-48 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-amber-400/15 rounded-full blur-3xl pointer-events-none" />

                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-extrabold uppercase tracking-widest text-violet-200 mb-4">
                  <Award size={14} className="text-amber-300" />
                  {diagnosis.badgeTitle}
                </div>

                <h2 className="text-5xl md:text-6xl font-black bg-gradient-to-r from-white via-violet-100 to-amber-200 bg-clip-text text-transparent">
                  {diagnosis.percentage}%
                </h2>
                <p className="text-base text-slate-300 mt-2 font-medium">
                  {selectedStudent?.fullName || "Learner"} answered{" "}
                  <span className="text-emerald-300 font-bold">{diagnosis.correctAnswers}</span> out of{" "}
                  <span className="font-bold">{diagnosis.totalQuestions}</span> questions correctly.
                </p>

                <p className="text-sm md:text-base text-amber-200/90 font-semibold mt-3 max-w-2xl mx-auto">
                  {diagnosis.summaryRemarks}
                </p>

                <div className="mt-8 flex flex-wrap justify-center gap-3">
                  <button
                    onClick={() => {
                      setSubmitted(false);
                      setDiagnosis(null);
                      setAnswers({});
                      setActiveQuestionIndex(0);
                      setChallengeSeed((previous) => previous + 1);
                    }}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-violet-400 text-white font-bold shadow-lg shadow-violet-900/30 hover:scale-[1.02] transition cursor-pointer"
                  >
                    <RotateCcw size={16} /> Play Another Challenge
                  </button>
                  <Link
                    href="/grades"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-bold transition cursor-pointer"
                  >
                    View in Grades Tab <ArrowUpRight size={16} />
                  </Link>
                </div>
              </div>

              {/* Diagnostic Remarks Grid: Strengths, Weaknesses, Advice */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* 1. Identified Strengths */}
                <div className="rounded-3xl p-6 bg-gradient-to-b from-emerald-950/40 to-slate-900/80 border border-emerald-500/30 shadow-xl flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2.5 text-emerald-300 font-bold mb-4">
                      <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300">
                        <CheckCircle2 size={20} />
                      </div>
                      <h3 className="text-lg font-extrabold text-white">Identified Strengths</h3>
                    </div>
                    <ul className="space-y-2.5 text-sm text-emerald-100/90">
                      {diagnosis.strengths.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-emerald-400 font-bold mt-0.5">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="mt-6 pt-4 border-t border-emerald-500/20 text-xs font-semibold text-emerald-300/80 flex items-center gap-1.5">
                    <Sparkles size={14} /> Competencies Mastered
                  </div>
                </div>

                {/* 2. Focus Areas / Weaknesses */}
                <div className="rounded-3xl p-6 bg-gradient-to-b from-amber-950/40 to-slate-900/80 border border-amber-500/30 shadow-xl flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2.5 text-amber-300 font-bold mb-4">
                      <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300">
                        <AlertTriangle size={20} />
                      </div>
                      <h3 className="text-lg font-extrabold text-white">Areas for Growth</h3>
                    </div>
                    <ul className="space-y-2.5 text-sm text-amber-100/90">
                      {diagnosis.weaknesses.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-amber-400 font-bold mt-0.5">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="mt-6 pt-4 border-t border-amber-500/20 text-xs font-semibold text-amber-300/80 flex items-center gap-1.5">
                    <Target size={14} /> Targeted Focus Concepts
                  </div>
                </div>

                {/* 3. Actionable Advice & Recommendations */}
                <div className="rounded-3xl p-6 bg-gradient-to-b from-violet-950/40 to-slate-900/80 border border-violet-500/30 shadow-xl flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2.5 text-violet-300 font-bold mb-4">
                      <div className="p-2 rounded-xl bg-violet-500/20 text-violet-300">
                        <Lightbulb size={20} />
                      </div>
                      <h3 className="text-lg font-extrabold text-white">Actionable Advice</h3>
                    </div>
                    <ul className="space-y-2.5 text-sm text-violet-100/90">
                      {diagnosis.recommendations.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-violet-400 font-bold mt-0.5">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="mt-6 pt-4 border-t border-violet-500/20 text-xs font-semibold text-violet-300/80 flex items-center gap-1.5">
                    <BookOpen size={14} /> Teacher & Learner Next Steps
                  </div>
                </div>
              </div>

              {/* Collapsible Item-by-Item Review */}
              <div className="glass-card rounded-3xl p-6 md:p-8 shadow-2xl border border-white/10">
                <div
                  onClick={() => setShowItemReview(!showItemReview)}
                  className="flex items-center justify-between cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3">
                    <BookOpen size={20} className="text-violet-400" />
                    <div>
                      <h3 className="text-lg font-extrabold text-white">Item-by-Item Question Review</h3>
                      <p className="text-xs text-slate-400">
                        Review selected choices, correct answers, and instructional explanations
                      </p>
                    </div>
                  </div>
                  <button className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition">
                    {showItemReview ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                </div>

                {showItemReview && (
                  <div className="mt-6 space-y-4 pt-6 border-t border-white/10">
                    {diagnosis.questionReview.map((item, index) => (
                      <div
                        key={item.id}
                        className={`p-5 rounded-2xl border transition ${
                          item.isCorrect
                            ? "bg-emerald-500/5 border-emerald-500/20"
                            : "bg-rose-500/5 border-rose-500/20"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <span className="text-xs font-bold text-violet-300 uppercase tracking-wider">
                            Item {index + 1} · {item.unitTitle}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold ${
                              item.isCorrect
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                            }`}
                          >
                            {item.isCorrect ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                            {item.isCorrect ? "Correct" : "Incorrect / Skipped"}
                          </span>
                        </div>

                        <p className="text-base font-bold text-white mb-3">{item.prompt}</p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-semibold mb-3">
                          <div
                            className={`px-3 py-2 rounded-xl border ${
                              item.isCorrect
                                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-200"
                                : "bg-rose-500/10 border-rose-500/30 text-rose-200"
                            }`}
                          >
                            Student Choice: <span className="font-bold">{item.studentAnswer}</span>
                          </div>
                          <div className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-200">
                            Correct Answer: <span className="font-bold text-emerald-300">{item.correctAnswer}</span>
                          </div>
                        </div>

                        <div className="p-3 rounded-xl bg-black/20 border border-white/5 text-xs text-slate-300 leading-relaxed">
                          <span className="font-bold text-violet-300 mr-1">Explanation:</span>
                          {item.explanation}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
