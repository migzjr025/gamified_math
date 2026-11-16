import { db } from "@/db";
import { users, students, units, assessments, grades, achievements, studentAchievements, gameQuestions, gameResults } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export async function seedData() {
  // Ensure table columns and migrations are applied automatically
  try {
    await db.execute(sql`
      ALTER TABLE students ADD COLUMN IF NOT EXISTS birthday varchar(50);
      ALTER TABLE students ADD COLUMN IF NOT EXISTS age integer;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS grade varchar(50) DEFAULT '';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS approved boolean DEFAULT false;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified boolean DEFAULT false;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS first_login_completed boolean DEFAULT false;
      UPDATE students SET user_id = 1 WHERE user_id IS NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS grades_student_assessment_idx ON grades (student_id, assessment_id);
      CREATE UNIQUE INDEX IF NOT EXISTS game_results_student_assessment_idx ON game_results (student_id, assessment_id);

      -- Idempotent Term & Summative Migrations
      UPDATE units SET quarter = 'Term 1 - 1st Summative' WHERE quarter = 'Quarter 1';
      UPDATE units SET quarter = 'Term 2 - 1st Summative' WHERE quarter = 'Quarter 2';
      UPDATE units SET quarter = 'Term 3 - 1st Summative' WHERE quarter = 'Quarter 3';
      UPDATE units SET quarter = 'Remedial' WHERE quarter = 'Summative';

      UPDATE game_questions SET quarter = 'Term 1 - 1st Summative' WHERE quarter = 'Quarter 1';
      UPDATE game_questions SET quarter = 'Term 2 - 1st Summative' WHERE quarter = 'Quarter 2';
      UPDATE game_questions SET quarter = 'Term 3 - 1st Summative' WHERE quarter = 'Quarter 3';
      UPDATE game_questions SET quarter = 'Remedial' WHERE quarter = 'Summative';
    `);
  } catch (migErr) {
    console.warn("Auto-migration schema patch handled:", migErr);
  }

  // Teacher
  const existingUsers = await db.select().from(users).limit(1);
  if (existingUsers.length === 0) {
    await db.insert(users).values({
      email: "teacher@matatag.edu.ph",
      password: "password123",
      name: "Arminda Villeno",
      role: "teacher",
    });
  }

  // Students
  const existingStudents = await db.select().from(students).limit(1);
  if (existingStudents.length === 0) {
    const studentData = [
      { studentId: "2026-001", fullName: "Juan Dela Cruz", birthday: "2018-05-14", age: 8, gradeLevel: "Grade 2", section: "A", gender: "Male", avatarColor: "#f97316" },
      { studentId: "2026-002", fullName: "Maria Santos", birthday: "2018-09-20", age: 8, gradeLevel: "Grade 2", section: "A", gender: "Female", avatarColor: "#ec4899" },
      { studentId: "2026-003", fullName: "Pedro Garcia", birthday: "2018-02-11", age: 8, gradeLevel: "Grade 2", section: "B", gender: "Male", avatarColor: "#3b82f6" },
      { studentId: "2026-004", fullName: "Ana Mendoza", birthday: "2018-11-05", age: 7, gradeLevel: "Grade 2", section: "B", gender: "Female", avatarColor: "#10b981" },
      { studentId: "2026-005", fullName: "Carlos Reyes", birthday: "2019-04-18", age: 7, gradeLevel: "Grade 1", section: "A", gender: "Male", avatarColor: "#8b5cf6" },
      { studentId: "2026-006", fullName: "Elena Ramos", birthday: "2019-08-30", age: 7, gradeLevel: "Grade 1", section: "A", gender: "Female", avatarColor: "#f43f5e" },
      { studentId: "2026-007", fullName: "Jose Villanueva", birthday: "2018-07-22", age: 8, gradeLevel: "Grade 2", section: "B", gender: "Male", avatarColor: "#14b8a6" },
      { studentId: "2026-008", fullName: "Sofia Lim", birthday: "2018-12-14", age: 7, gradeLevel: "Grade 2", section: "A", gender: "Female", avatarColor: "#eab308" },
    ];

    for (const s of studentData) {
      await db.insert(students).values(s);
    }
  }

  // 13 Canonical Term-Summative & Remedial Units
  const CANONICAL_UNITS = [
    { code: "M2-T1-S1", title: "Term 1 - 1st Summative Unit", gradeLevel: "Grade 2", quarter: "Term 1 - 1st Summative", description: "Whole numbers up to 1,000, place value, and reading/writing numerals.", difficulty: 1, orderIndex: 1 },
    { code: "M2-T1-S2", title: "Term 1 - 2nd Summative Unit", gradeLevel: "Grade 2", quarter: "Term 1 - 2nd Summative", description: "Comparing numbers, ordering numbers, and ordinal numbers up to 20th.", difficulty: 2, orderIndex: 2 },
    { code: "M2-T1-S3", title: "Term 1 - 3rd Summative Unit", gradeLevel: "Grade 2", quarter: "Term 1 - 3rd Summative", description: "Addition of 2- to 3-digit numbers with and without regrouping.", difficulty: 2, orderIndex: 3 },
    { code: "M2-T1-S4", title: "Term 1 - 4th Summative Unit", gradeLevel: "Grade 2", quarter: "Term 1 - 4th Summative", description: "Subtraction of 2- to 3-digit numbers and real-world word problems.", difficulty: 3, orderIndex: 4 },

    { code: "M2-T2-S1", title: "Term 2 - 1st Summative Unit", gradeLevel: "Grade 2", quarter: "Term 2 - 1st Summative", description: "Basic multiplication concepts, repeated addition, and arrays.", difficulty: 2, orderIndex: 5 },
    { code: "M2-T2-S2", title: "Term 2 - 2nd Summative Unit", gradeLevel: "Grade 2", quarter: "Term 2 - 2nd Summative", description: "Multiplication tables (2, 3, 4, 5, 10) and mental multiplication.", difficulty: 2, orderIndex: 6 },
    { code: "M2-T2-S3", title: "Term 2 - 3rd Summative Unit", gradeLevel: "Grade 2", quarter: "Term 2 - 3rd Summative", description: "Introduction to division as equal sharing and repeated subtraction.", difficulty: 3, orderIndex: 7 },
    { code: "M2-T2-S4", title: "Term 2 - 4th Summative Unit", gradeLevel: "Grade 2", quarter: "Term 2 - 4th Summative", description: "Fractions of a whole (unit fractions 1/2, 1/3, 1/4) and simple comparisons.", difficulty: 3, orderIndex: 8 },

    { code: "M2-T3-S1", title: "Term 3 - 1st Summative Unit", gradeLevel: "Grade 2", quarter: "Term 3 - 1st Summative", description: "Basic 2D shapes, 3D solids, symmetry, and geometric patterns.", difficulty: 2, orderIndex: 9 },
    { code: "M2-T3-S2", title: "Term 3 - 2nd Summative Unit", gradeLevel: "Grade 2", quarter: "Term 3 - 2nd Summative", description: "Time reading (analog/digital clock), days of the week, and calendar.", difficulty: 2, orderIndex: 10 },
    { code: "M2-T3-S3", title: "Term 3 - 3rd Summative Unit", gradeLevel: "Grade 2", quarter: "Term 3 - 3rd Summative", description: "Linear measurement (meters/centimeters) and comparing lengths.", difficulty: 3, orderIndex: 11 },
    { code: "M2-T3-S4", title: "Term 3 - 4th Summative Unit", gradeLevel: "Grade 2", quarter: "Term 3 - 4th Summative", description: "Data collection, tally charts, pictographs, and bar graphs.", difficulty: 3, orderIndex: 12 },

    { code: "M2-REMED-U1", title: "Remedial Unit", gradeLevel: "Grade 2", quarter: "Remedial", description: "Targeted remedial exercises for missed questions across Terms 1 to 3.", difficulty: 2, orderIndex: 13 },
  ];

  for (const u of CANONICAL_UNITS) {
    const existing = await db.select().from(units).where(eq(units.code, u.code)).limit(1);
    if (existing.length === 0) {
      await db.insert(units).values(u);
    }
  }

  // 13 Canonical Assessments
  const allUnits = await db.select().from(units);
  const unitByCode = new Map<string, number>();
  allUnits.forEach((u) => unitByCode.set(u.code, u.id));

  const CANONICAL_ASSESSMENTS = [
    { code: "M2-T1-S1", title: "Cognitive Maze - Term 1 1st Summative", type: "quiz", totalPoints: 100 },
    { code: "M2-T1-S2", title: "Cognitive Maze - Term 1 2nd Summative", type: "quiz", totalPoints: 100 },
    { code: "M2-T1-S3", title: "Cognitive Maze - Term 1 3rd Summative", type: "quiz", totalPoints: 100 },
    { code: "M2-T1-S4", title: "Cognitive Maze - Term 1 4th Summative", type: "quiz", totalPoints: 100 },

    { code: "M2-T2-S1", title: "Cognitive Maze - Term 2 1st Summative", type: "quiz", totalPoints: 100 },
    { code: "M2-T2-S2", title: "Cognitive Maze - Term 2 2nd Summative", type: "quiz", totalPoints: 100 },
    { code: "M2-T2-S3", title: "Cognitive Maze - Term 2 3rd Summative", type: "quiz", totalPoints: 100 },
    { code: "M2-T2-S4", title: "Cognitive Maze - Term 2 4th Summative", type: "quiz", totalPoints: 100 },

    { code: "M2-T3-S1", title: "Cognitive Maze - Term 3 1st Summative", type: "quiz", totalPoints: 100 },
    { code: "M2-T3-S2", title: "Cognitive Maze - Term 3 2nd Summative", type: "quiz", totalPoints: 100 },
    { code: "M2-T3-S3", title: "Cognitive Maze - Term 3 3rd Summative", type: "quiz", totalPoints: 100 },
    { code: "M2-T3-S4", title: "Cognitive Maze - Term 3 4th Summative", type: "quiz", totalPoints: 100 },

    { code: "M2-REMED-U1", title: "Cognitive Maze - Remedial Assessment", type: "quiz", totalPoints: 100 },
  ];

  for (const a of CANONICAL_ASSESSMENTS) {
    const uId = unitByCode.get(a.code);
    if (uId) {
      const existing = await db.select().from(assessments).where(eq(assessments.unitId, uId)).limit(1);
      if (existing.length === 0) {
        await db.insert(assessments).values({
          title: a.title,
          unitId: uId,
          type: a.type,
          totalPoints: a.totalPoints,
          userId: 1,
        });
      }
    }
  }

  // Game Questions
  const existingQuestions = await db.select().from(gameQuestions).limit(1);
  if (existingQuestions.length === 0) {
    const gameQuestionsData = [
      { unitId: 1, gradeLevel: "Grade 2", quarter: "Quarter 1", difficulty: 1, prompt: "What is the place value of 7 in 7,482?", optionA: "Ones", optionB: "Tens", optionC: "Hundreds", optionD: "Thousands", correctAnswer: "D", explanation: "In 7,482, the digit 7 is in the thousands place." },
      { unitId: 1, gradeLevel: "Grade 2", quarter: "Quarter 1", difficulty: 1, prompt: "Which number is greater than 5,200?", optionA: "5,109", optionB: "5,180", optionC: "5,199", optionD: "5,275", correctAnswer: "D", explanation: "5,275 is greater than 5,200." },
      { unitId: 2, gradeLevel: "Grade 2", quarter: "Quarter 1", difficulty: 2, prompt: "What is 48 + 27?", optionA: "65", optionB: "75", optionC: "85", optionD: "95", correctAnswer: "B", explanation: "48 + 27 = 75." },
      { unitId: 2, gradeLevel: "Grade 2", quarter: "Quarter 2", difficulty: 2, prompt: "Solve: 9 × 4 = ?", optionA: "32", optionB: "36", optionC: "40", optionD: "45", correctAnswer: "B", explanation: "9 groups of 4 equals 36." },
      { unitId: 4, gradeLevel: "Grade 1", quarter: "Quarter 2", difficulty: 1, prompt: "What comes next: 2, 4, 6, 8, __ ?", optionA: "9", optionB: "10", optionC: "12", optionD: "14", correctAnswer: "B", explanation: "The numbers are increasing by 2, so the next number is 10." },
      { unitId: 5, gradeLevel: "Grade 1", quarter: "Quarter 3", difficulty: 2, prompt: "How many sides does a rectangle have?", optionA: "3", optionB: "4", optionC: "5", optionD: "6", correctAnswer: "B", explanation: "A rectangle has four sides." },
      { unitId: 1, gradeLevel: "Grade 2", quarter: "Summative", difficulty: 3, prompt: "Summative Exam: If you add 350 and 420, then subtract 150, what is the result?", optionA: "520", optionB: "620", optionC: "720", optionD: "820", correctAnswer: "B", explanation: "350 + 420 = 770, and 770 - 150 = 620." },
    ];

    for (const q of gameQuestionsData) {
      await db.insert(gameQuestions).values(q);
    }
  }

  // Grades
  const existingGrades = await db.select().from(grades).limit(1);
  if (existingGrades.length === 0) {
    const gradesData = [
      { studentId: 1, assessmentId: 1, score: 88, pointsEarned: 44, feedback: "Good work on place value." },
      { studentId: 1, assessmentId: 2, score: 92, pointsEarned: 36.8, feedback: "Excellent computation skills." },
      { studentId: 2, assessmentId: 1, score: 76, pointsEarned: 38, feedback: "Needs practice with larger numbers." },
      { studentId: 3, assessmentId: 2, score: 85, pointsEarned: 34, feedback: "Solid understanding of operations." },
      { studentId: 4, assessmentId: 1, score: 95, pointsEarned: 47.5, feedback: "Outstanding!" },
      { studentId: 5, assessmentId: 4, score: 82, pointsEarned: 49.2, feedback: "Creative pattern solutions." },
      { studentId: 6, assessmentId: 4, score: 91, pointsEarned: 54.6, feedback: "Excellent pattern recognition." },
      { studentId: 7, assessmentId: 5, score: 78, pointsEarned: 39, feedback: "Work on angle measurement." },
      { studentId: 8, assessmentId: 6, score: 89, pointsEarned: 89, feedback: "Great data interpretation." },
    ];

    for (const g of gradesData) {
      await db.insert(grades).values(g);
    }

    await db.insert(gameResults).values({
      studentId: 1,
      assessmentId: 1,
      gradeLevel: "Grade 2",
      score: 8,
      totalQuestions: 10,
      correctAnswers: 8,
      percentage: 80,
      feedback: "Great performance in the Matatag Math Quest challenge.",
    });
  }

  // Achievements
  const existingAchievements = await db.select().from(achievements).limit(1);
  if (existingAchievements.length === 0) {
    const achievementData = [
      { title: "Math Explorer", description: "Complete your first unit assessment.", icon: "compass", rarity: "common", points: 10 },
      { title: "Fraction Master", description: "Score 90% or above on fractions.", icon: "pie-chart", rarity: "rare", points: 25 },
      { title: "Pattern Hunter", description: "Complete a patterns project.", icon: "search", rarity: "uncommon", points: 15 },
      { title: "Data Wizard", description: "Score 85%+ on data handling.", icon: "bar-chart-3", rarity: "rare", points: 25 },
      { title: "Geometry Pro", description: "Master geometry concepts with 90%+.", icon: "hexagon", rarity: "epic", points: 50 },
      { title: "Consistent Scholar", description: "Complete 3 assessments with 85%+.", icon: "book-open", rarity: "uncommon", points: 20 },
    ];

    for (const ach of achievementData) {
      await db.insert(achievements).values(ach);
    }

    const studentAchData = [
      { studentId: 1, achievementId: 1, earnedAt: new Date("2026-05-10") },
      { studentId: 2, achievementId: 3, earnedAt: new Date("2026-05-12") },
      { studentId: 4, achievementId: 4, earnedAt: new Date("2026-05-14") },
      { studentId: 5, achievementId: 2, earnedAt: new Date("2026-05-16") },
      { studentId: 8, achievementId: 3, earnedAt: new Date("2026-05-18") },
      { studentId: 6, achievementId: 6, earnedAt: new Date("2026-05-19") },
    ];

    for (const sa of studentAchData) {
      await db.insert(studentAchievements).values(sa);
    }
  }
}
