import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

  const { id: roomId } = await params;

  const member = await db.roomMember.findFirst({ where: { roomId, userId } });
  if (!member) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });

  const body = await req.json().catch(() => null);
  const { messages } = body ?? {};
  if (!Array.isArray(messages)) {
    return new Response(JSON.stringify({ error: "messages array required" }), { status: 400 });
  }

  const room = await db.room.findUnique({
    where: { id: roomId },
    include: {
      members: { include: { user: { select: { id: true, name: true } } } },
      transactions: { include: { splits: true }, orderBy: { date: "desc" }, take: 50 },
      settlements: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
  if (!room) return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });

  const totalExpenses = room.transactions.reduce((s, t) => s + t.amount, 0);
  const memberNames = room.members.map((m) => m.user.name ?? m.userId).join(", ");

  const systemPrompt = `You are a financial assistant for the shared room "${room.name}".

Room overview:
- Members: ${memberNames}
- Total expenses: $${totalExpenses.toFixed(2)}
- Budget cap: ${room.budgetCap ? `$${room.budgetCap}` : "none set"}

Recent transactions (last 50):
${room.transactions
  .slice(0, 20)
  .map(
    (t) =>
      `- ${t.description ?? t.category}: $${t.amount} paid by ${t.paidByUserId ?? "unknown"} on ${new Date(t.date).toLocaleDateString()}`,
  )
  .join("\n")}

Settlements:
${room.settlements
  .slice(0, 10)
  .map((s) => `- ${s.fromUserId} paid ${s.toUserId} $${s.amount}${s.note ? ` (${s.note})` : ""}`)
  .join("\n")}

Help the user understand shared expenses, balances, and financial decisions for this room. Be concise and direct.`;

  const stream = await anthropic.messages.stream({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    system: systemPrompt,
    messages: messages.map((m: { role: string; content: string }) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (
          chunk.type === "content_block_delta" &&
          chunk.delta.type === "text_delta"
        ) {
          controller.enqueue(encoder.encode(chunk.delta.text));
        }
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
