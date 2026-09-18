import { db } from "@/db";
import { users, students, units, assessments, grades, achievements, studentAchievements, gameQuestions, gameResults } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function seedData() {
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
      { studentId: "S-2024-001", fullName: "Juan Dela Cruz", gradeLevel: "Grade 2", section: "A", gender: "Male", avatarColor: "#f97316" },
      { studentId: "S-2024-002", fullName: "Maria Santos", gradeLevel: "Grade 2", section: "A", gender: "Female", avatarColor: "#ec4899" },
      { studentId: "S-2024-003", fullName: "Pedro Garcia", gradeLevel: "Grade 2", section: "B", gender: "Male", avatarColor: "#3b82f6" },
      { studentId: "S-2024-004", fullName: "Ana Mendoza", gradeLevel: "Grade 2", section: "B", gender: "Female", avatarColor: "#10b981" },
      { studentId: "S-2024-005", fullName: "Carlos Reyes", gradeLevel: "Grade 1", section: "A", gender: "Male", avatarColor: "#8b5cf6" },
      { studentId: "S-2024-006", fullName: "Elena Ramos", gradeLevel: "Grade 1", section: "A", gender: "Female", avatarColor: "#f43f5e" },
      { studentId: "S-2024-007", fullName: "Jose Villanueva", gradeLevel: "Grade 2", section: "B", gender: "Male", avatarColor: "#14b8a6" },
      { studentId: "S-2024-008", fullName: "Sofia Lim", gradeLevel: "Grade 2", section: "A", gender: "Female", avatarColor: "#eab308" },
    ];

    for (const s of studentData) {
      await db.insert(students).values(s);
    }
  }

  // Units - Matatag Math Curriculum
  const existingUnits = await db.select().from(units).limit(1);
  let createdUnits = existingUnits;
  if (existingUnits.length === 0) {
    const unitData = [
      { code: "M3-U1", title: "Number and Number Sense", gradeLevel: "Grade 2", quarter: "Quarter 1", description: "Understanding whole numbers up to 10,000 and place value.", difficulty: 1, orderIndex: 1 },
      { code: "M3-U2", title: "Operations and Computations", gradeLevel: "Grade 2", quarter: "Quarter 1", description: "Addition, subtraction, multiplication, and division of whole numbers.", difficulty: 2, orderIndex: 2 },
      { code: "M3-U3", title: "Fractions and Decimals", gradeLevel: "Grade 2", quarter: "Quarter 2", description: "Introduction to fractions, equivalent fractions, and basic decimals.", difficulty: 3, orderIndex: 3 },
      { code: "M4-U1", title: "Patterns and Algebra", gradeLevel: "Grade 1", quarter: "Quarter 2", description: "Identifying patterns and introducing simple algebraic expressions.", difficulty: 2, orderIndex: 1 },
      { code: "M4-U2", title: "Geometry and Measurement", gradeLevel: "Grade 1", quarter: "Quarter 3", description: "Shapes, angles, perimeter, area, and measurement concepts.", difficulty: 3, orderIndex: 2 },
      { code: "M5-U1", title: "Data Handling", gradeLevel: "Grade 2", quarter: "Quarter 3", description: "Collecting, organizing, and interpreting data using tables and graphs.", difficulty: 2, orderIndex: 1 },
    ];

    for (const u of unitData) {
      await db.insert(units).values(u);
    }
  }

  // Assessments
  const existingAssessments = await db.select().from(assessments).limit(1);
  if (existingAssessments.length === 0) {
    const assessmentsData = [
      { title: "Unit 1 Quiz - Number Sense", unitId: 1, type: "quiz", totalPoints: 50, dueDate: new Date("2026-05-15") },
      { title: "Unit 2 Activity - Operations", unitId: 2, type: "activity", totalPoints: 40, dueDate: new Date("2026-05-22") },
      { title: "Unit 3 Assessment - Fractions", unitId: 3, type: "test", totalPoints: 100, dueDate: new Date("2026-06-01") },
      { title: "Unit 1 Project - Patterns", unitId: 4, type: "project", totalPoints: 60, dueDate: new Date("2026-05-25") },
      { title: "Unit 2 Quiz - Geometry", unitId: 5, type: "quiz", totalPoints: 50, dueDate: new Date("2026-05-28") },
      { title: "Unit 1 Test - Data", unitId: 6, type: "test", totalPoints: 100, dueDate: new Date("2026-06-10") },
    ];

    for (const a of assessmentsData) {
      await db.insert(assessments).values(a);
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
