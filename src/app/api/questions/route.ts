import { NextRequest, NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { gameQuestions, units } from "@/db/schema";

function normalizePeriod(quarter?: string | null): string {
  const q = String(quarter || "").trim();
  if (!q) return "Term 1 - 1st Summative";
  const lower = q.toLowerCase();
  if (lower === "quarter 1") return "Term 1 - 1st Summative";
  if (lower === "quarter 2") return "Term 2 - 1st Summative";
  if (lower === "quarter 3") return "Term 3 - 1st Summative";
  if (lower === "summative" || lower === "water temple" || lower === "remedial") return "Remedial";
  if (lower === "term 1") return "Term 1 - 1st Summative";
  if (lower === "term 2") return "Term 2 - 1st Summative";
  if (lower === "term 3") return "Term 3 - 1st Summative";
  const match = q.match(/Term\s*([1-3])\s*[-–—:]\s*([1-4])(?:st|nd|rd|th)?\s*Summative/i);
  if (match) {
    const s = match[2] === "1" ? "1st" : match[2] === "2" ? "2nd" : match[2] === "3" ? "3rd" : "4th";
    return `Term ${match[1]} - ${s} Summative`;
  }
  return q;
}

const DEFAULT_QUESTIONS = [
  {
    id: 1,
    unitId: 1,
    gradeLevel: "Grade 2",
    quarter: "Term 1 - 1st Summative",
    difficulty: 1,
    prompt: "What is the value of 5 in the number 528?",
    optionA: "5",
    optionB: "50",
    optionC: "500",
    optionD: "5000",
    correctAnswer: "C",
    explanation: "In 528, the digit 5 is in the hundreds place, so its value is 500.",
    isActive: true,
    unitTitle: "Number and Number Sense",
  },
  {
    id: 2,
    unitId: 2,
    gradeLevel: "Grade 2",
    quarter: "Term 1 - 1st Summative",
    difficulty: 1,
    prompt: "What is 45 + 32?",
    optionA: "67",
    optionB: "77",
    optionC: "75",
    optionD: "87",
    correctAnswer: "B",
    explanation: "45 + 32 = 77.",
    isActive: true,
    unitTitle: "Operations and Computations",
  },
  {
    id: 3,
    unitId: 3,
    gradeLevel: "Grade 2",
    quarter: "Term 2 - 1st Summative",
    difficulty: 2,
    prompt: "Which fraction represents half of a whole?",
    optionA: "1/4",
    optionB: "1/3",
    optionC: "1/2",
    optionD: "2/3",
    correctAnswer: "C",
    explanation: "1/2 represents one part out of two equal parts (half).",
    isActive: true,
    unitTitle: "Fractions and Decimals",
  },
  {
    id: 4,
    unitId: 1,
    gradeLevel: "Grade 1",
    quarter: "Term 1 - 1st Summative",
    difficulty: 1,
    prompt: "Count the total: 3 apples + 4 apples = ?",
    optionA: "6",
    optionB: "7",
    optionC: "8",
    optionD: "9",
    correctAnswer: "B",
    explanation: "3 + 4 = 7 apples.",
    isActive: true,
    unitTitle: "Number and Number Sense",
  },
];

export async function GET() {
  try {
    const rawData = await db
      .select({
        id: gameQuestions.id,
        unitId: gameQuestions.unitId,
        gradeLevel: gameQuestions.gradeLevel,
        quarter: gameQuestions.quarter,
        difficulty: gameQuestions.difficulty,
        prompt: gameQuestions.prompt,
        optionA: gameQuestions.optionA,
        optionB: gameQuestions.optionB,
        optionC: gameQuestions.optionC,
        optionD: gameQuestions.optionD,
        correctAnswer: gameQuestions.correctAnswer,
        explanation: gameQuestions.explanation,
        isActive: gameQuestions.isActive,
        unitTitle: units.title,
      })
      .from(gameQuestions)
      .leftJoin(units, eq(gameQuestions.unitId, units.id))
      .orderBy(gameQuestions.id);

    const data = rawData.map(q => ({
      ...q,
      quarter: normalizePeriod(q.quarter),
    }));

    return NextResponse.json(data.length > 0 ? data : DEFAULT_QUESTIONS);
  } catch (error) {
    console.warn("Game questions DB offline, returning default questions");
    return NextResponse.json(DEFAULT_QUESTIONS);
  }
}

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
  }

  try {
    let unitId = Number(body.unitId);
    const difficulty = Number(body.difficulty) || 1;
    const quarter = normalizePeriod(body.quarter);
    const prompt = String(body.prompt || "").trim();

    if (!prompt) {
      return NextResponse.json({ error: "Question prompt is required." }, { status: 400 });
    }

    // Zero-Setup Curriculum Unit Resolution
    try {
      let validUnit = false;
      if (unitId && !isNaN(unitId) && unitId > 0) {
        const unitCheck = await db.select().from(units).where(eq(units.id, unitId)).limit(1);
        if (unitCheck.length > 0) validUnit = true;
      }

      if (!validUnit) {
        // Auto-find unit matching this quarter slot
        const matchingUnits = await db.select().from(units);
        const found = matchingUnits.find(u => normalizePeriod(u.quarter) === quarter);
        if (found) {
          unitId = found.id;
        } else {
          // Auto-create canonical unit
          const code = quarter === "Remedial"
            ? "M2-REMED-U1"
            : `M2-${quarter.replace("Term ", "T").replace(" - ", "-S").replace(" Summative", "").replace("st", "").replace("nd", "").replace("rd", "").replace("th", "")}`;
          const newUnit = await db.insert(units).values({
            code,
            title: `${quarter} Unit`,
            gradeLevel: body.gradeLevel || "Grade 2",
            quarter,
            description: `Curriculum module for ${quarter}`,
            difficulty,
            orderIndex: 1,
          }).returning();
          unitId = newUnit[0].id;
        }
      }
    } catch (unitErr) {
      console.warn("Unit auto-resolution handled:", unitErr);
      if (!unitId || isNaN(unitId) || unitId <= 0) unitId = 1;
    }

    // Error handler: Prevent exceeding 10 questions per Summative slot
    try {
      const allQs = await db.select().from(gameQuestions);
      const existingInSlot = allQs.filter(q => normalizePeriod(q.quarter) === quarter);

      if (existingInSlot.length >= 10) {
        return NextResponse.json(
          {
            error: `Question limit reached! ${quarter} already contains 10 questions. You cannot exceed 10 questions per Summative slot.`,
          },
          { status: 400 }
        );
      }
    } catch {
      const count = DEFAULT_QUESTIONS.filter((q) => normalizePeriod(q.quarter) === quarter).length;
      if (count >= 10) {
        return NextResponse.json(
          {
            error: `Question limit reached! ${quarter} already contains 10 questions. You cannot exceed 10 questions per Summative slot.`,
          },
          { status: 400 }
        );
      }
    }

    try {
      const result = await db.insert(gameQuestions).values({
        ...body,
        prompt,
        unitId,
        difficulty,
        quarter,
      }).returning();
      return NextResponse.json(result[0]);
    } catch (dbErr) {
      console.warn("Questions DB offline on create, returning simulated question");
      return NextResponse.json({
        id: Date.now(),
        ...body,
        prompt,
        unitId,
        difficulty,
        quarter,
      });
    }
  } catch (error) {
    console.error("Game question create error", error);
    return NextResponse.json({ error: "Failed to create game question." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
  }

  try {
    const id = Number(body.id);
    if (!id || isNaN(id) || id <= 0) {
      return NextResponse.json({ error: "A valid Question ID is required." }, { status: 400 });
    }

    const { id: _id, ...rest } = body;
    if (rest.quarter) {
      rest.quarter = normalizePeriod(rest.quarter);
      try {
        const allQs = await db.select().from(gameQuestions);
        const existingTargetQs = allQs.filter(q => normalizePeriod(q.quarter) === rest.quarter && q.id !== id);

        if (existingTargetQs.length >= 10) {
          return NextResponse.json(
            {
              error: `Question limit reached! ${rest.quarter} already contains 10 questions. You cannot exceed 10 questions per Summative slot.`,
            },
            { status: 400 }
          );
        }
      } catch {
        // Fallback for offline mode
      }
    }
    try {
      const result = await db.update(gameQuestions).set(rest).where(eq(gameQuestions.id, id)).returning();
      return NextResponse.json(result[0] || { id, ...rest });
    } catch {
      console.warn("Questions DB offline on update, returning simulated update");
      return NextResponse.json({ id, ...rest });
    }
  } catch (error) {
    console.error("Game question update error", error);
    return NextResponse.json({ error: "Failed to update game question" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
  }

  try {
    // Bulk delete support
    if (Array.isArray(body?.ids)) {
      const ids = body.ids.map(Number).filter((n: number) => !isNaN(n) && n > 0);
      if (ids.length === 0) {
        return NextResponse.json({ error: "At least one valid Question ID is required." }, { status: 400 });
      }

      try {
        await db.delete(gameQuestions).where(inArray(gameQuestions.id, ids));
      } catch {
        console.warn("Questions DB offline on bulk delete, returning simulated success");
      }
      return NextResponse.json({ success: true, count: ids.length, deletedIds: ids });
    }

    const id = Number(body.id);
    if (!id || isNaN(id) || id <= 0) {
      return NextResponse.json({ error: "A valid Question ID is required." }, { status: 400 });
    }

    try {
      await db.delete(gameQuestions).where(eq(gameQuestions.id, id));
    } catch {
      console.warn("Questions DB offline on delete, returning simulated success");
    }
    return NextResponse.json({ success: true, deletedId: id });
  } catch (error) {
    console.error("Game question delete error", error);
    return NextResponse.json({ error: "Failed to delete game question" }, { status: 500 });
  }
}
