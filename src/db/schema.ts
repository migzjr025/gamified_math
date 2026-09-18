import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  timestamp,
  boolean,
  real,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  grade: varchar("grade", { length: 50 }).notNull().default(""),
  role: varchar("role", { length: 20 }).notNull().default("teacher"),
  approved: boolean("approved").default(false).notNull(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  firstLoginCompleted: boolean("first_login_completed").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const otpCodes = pgTable("otp_codes", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull(),
  code: varchar("code", { length: 10 }).notNull(),
  type: varchar("type", { length: 50 }).notNull().default("signup_verification"),
  expiresAt: timestamp("expires_at").notNull(),
  consumed: boolean("consumed").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const students = pgTable("students", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  studentId: varchar("student_id", { length: 50 }).notNull().unique(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  gradeLevel: varchar("grade_level", { length: 50 }).notNull(),
  section: varchar("section", { length: 50 }).notNull(),
  gender: varchar("gender", { length: 20 }).notNull(),
  avatarColor: varchar("avatar_color", { length: 50 }).notNull().default("#6366f1"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const units = pgTable("units", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  title: varchar("title", { length: 255 }).notNull(),
  gradeLevel: varchar("grade_level", { length: 50 }).notNull(),
  quarter: varchar("quarter", { length: 50 }).notNull().default("Quarter 1"),
  description: text("description").notNull(),
  difficulty: integer("difficulty").notNull().default(1),
  orderIndex: integer("order_index").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const assessments = pgTable("assessments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  unitId: integer("unit_id").references(() => units.id, { onDelete: "cascade" }).notNull(),
  type: varchar("type", { length: 50 }).notNull().default("quiz"),
  totalPoints: integer("total_points").notNull().default(100),
  dueDate: timestamp("due_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const gameQuestions = pgTable("game_questions", {
  id: serial("id").primaryKey(),
  unitId: integer("unit_id").references(() => units.id, { onDelete: "cascade" }).notNull(),
  gradeLevel: varchar("grade_level", { length: 50 }).notNull(),
  quarter: varchar("quarter", { length: 50 }).notNull().default("Quarter 1"),
  difficulty: integer("difficulty").notNull().default(1),
  prompt: text("prompt").notNull(),
  optionA: varchar("option_a", { length: 255 }).notNull(),
  optionB: varchar("option_b", { length: 255 }).notNull(),
  optionC: varchar("option_c", { length: 255 }).notNull(),
  optionD: varchar("option_d", { length: 255 }).notNull(),
  correctAnswer: varchar("correct_answer", { length: 20 }).notNull(),
  explanation: text("explanation"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const gameResults = pgTable("game_results", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  studentId: integer("student_id").references(() => students.id, { onDelete: "cascade" }).notNull(),
  assessmentId: integer("assessment_id").references(() => assessments.id, { onDelete: "cascade" }),
  gradeLevel: varchar("grade_level", { length: 50 }).notNull(),
  score: real("score").notNull(),
  totalQuestions: integer("total_questions").notNull(),
  correctAnswers: integer("correct_answers").notNull(),
  percentage: real("percentage").notNull(),
  feedback: text("feedback"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const grades = pgTable("grades", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  studentId: integer("student_id").references(() => students.id, { onDelete: "cascade" }).notNull(),
  assessmentId: integer("assessment_id").references(() => assessments.id, { onDelete: "cascade" }).notNull(),
  score: real("score").notNull(),
  pointsEarned: real("points_earned").notNull(),
  feedback: text("feedback"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const achievements = pgTable("achievements", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  icon: varchar("icon", { length: 50 }).notNull().default("trophy"),
  rarity: varchar("rarity", { length: 20 }).notNull().default("common"),
  points: integer("points").notNull().default(10),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const studentAchievements = pgTable("student_achievements", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").references(() => students.id, { onDelete: "cascade" }).notNull(),
  achievementId: integer("achievement_id").references(() => achievements.id, { onDelete: "cascade" }).notNull(),
  earnedAt: timestamp("earned_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  // no direct relations needed besides auth
}));

export const studentsRelations = relations(students, ({ many }) => ({
  grades: many(grades),
  achievements: many(studentAchievements),
  gameResults: many(gameResults),
}));

export const unitsRelations = relations(units, ({ many }) => ({
  assessments: many(assessments),
  gameQuestions: many(gameQuestions),
}));

export const assessmentsRelations = relations(assessments, ({ one, many }) => ({
  unit: one(units, { fields: [assessments.unitId], references: [units.id] }),
  grades: many(grades),
  gameResults: many(gameResults),
}));

export const gameQuestionsRelations = relations(gameQuestions, ({ one }) => ({
  unit: one(units, { fields: [gameQuestions.unitId], references: [units.id] }),
}));

export const gameResultsRelations = relations(gameResults, ({ one }) => ({
  student: one(students, { fields: [gameResults.studentId], references: [students.id] }),
  assessment: one(assessments, { fields: [gameResults.assessmentId], references: [assessments.id] }),
}));

export const gradesRelations = relations(grades, ({ one }) => ({
  student: one(students, { fields: [grades.studentId], references: [students.id] }),
  assessment: one(assessments, { fields: [grades.assessmentId], references: [assessments.id] }),
}));

export const achievementsRelations = relations(achievements, ({ many }) => ({
  students: many(studentAchievements),
}));

export const studentAchievementsRelations = relations(studentAchievements, ({ one }) => ({
  student: one(students, { fields: [studentAchievements.studentId], references: [students.id] }),
  achievement: one(achievements, { fields: [studentAchievements.achievementId], references: [achievements.id] }),
}));
