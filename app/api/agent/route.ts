import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { SYSTEM_PROMPT } from "@/lib/agent/prompts";
import { TOOLS } from "@/lib/agent/tools";
import { toolExecutor } from "@/lib/agent/executor.server";

export async function POST(request: NextRequest) {
  try {
    const { messages, model } = await request.json();

    const apiKey = process.env.QWEN_API_KEY;
    const apiBase = process.env.QWEN_API_BASE || "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";
    const defaultModel = process.env.QWEN_MODEL || "qwen-max";
    const selectedModel = model || defaultModel;

    const qwenClient = new OpenAI({
      apiKey,
      baseURL: apiBase,
    });

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        let isControllerClosed = false;

        const safeEnqueue = (data: any) => {
          if (!isControllerClosed) {
            try {
              controller.enqueue(encoder.encode(JSON.stringify(data) + "\n"));
            } catch (e) {
              console.error("Enqueue error:", e);
              isControllerClosed = true;
            }
          }
        };

        try {
          let currentMessages = [...messages];
          let iterations = 0;
          const maxIterations = 10;

          while (iterations < maxIterations) {
            iterations++;

            const response = await qwenClient.chat.completions.create({
              model: selectedModel,
              messages: [
                { role: "system", content: SYSTEM_PROMPT },
                ...currentMessages,
              ],
              tools: TOOLS as any,
              tool_choice: "auto",
              stream: false,
            });

            const choice = response.choices[0];
            const assistantMessage = choice.message;

            // 1. Hallucination guard: model claims a tx result but called no tools
            const toolCalls = assistantMessage.tool_calls || [];
            if (toolCalls.length === 0 && assistantMessage.content) {
              const content = assistantMessage.content;
              const hashMatch = /0x[a-fA-F0-9]{40,}/i.exec(content);
              const hasTxVerb = /\b(transaction sent|tx sent|broadcast|confirmed|transaction hash|transaction complete|successfully sent)\b/i.test(content);
              if (hashMatch && hasTxVerb) {
                // Only flag as hallucination if this hash is NOT already in the conversation history
                // (if it's in history, the model is just referencing a real past result)
                const hash = hashMatch[0].toLowerCase();
                const alreadyInHistory = currentMessages.some((m: any) => {
                  const c = typeof m.content === "string" ? m.content : JSON.stringify(m.content || "");
                  return c.toLowerCase().includes(hash);
                });
                if (!alreadyInHistory) {
                  currentMessages.push(assistantMessage as any);
                  currentMessages.push({
                    role: "user",
                    content:
                      "STOP. You just fabricated a transaction result. You MUST call the sign_and_send_transaction tool — do NOT generate a hash or say the transaction was sent as plain text. Please call the tool now.",
                  });
                  continue;
                }
              }
            }

            // 2. Send assistant message content if any
            if (assistantMessage.content) {
              safeEnqueue({ type: "message", content: assistantMessage.content });
            }

            // 3. Handle Tool Calls
            if (toolCalls.length === 0) {
              safeEnqueue({ type: "done" });
              break;
            }

            // Add assistant message (with tool calls) to history
            currentMessages.push(assistantMessage);

            // Execute all tool calls
            let pendingApprovalEmitted = false;
            for (const toolCall of toolCalls as any[]) {
              const toolName = toolCall.function.name;
              const toolInput = JSON.parse(toolCall.function.arguments);

              // Intercept sign_and_send_transaction — hand off to client for approval
              if (toolName === "sign_and_send_transaction") {
                safeEnqueue({
                  type: "pending_approval",
                  toolCallId: toolCall.id,
                  transaction: toolInput,
                });
                pendingApprovalEmitted = true;
                break; // Stop the loop — client resumes after approval
              }

              safeEnqueue({ type: "tool_call", name: toolName, input: toolInput });

              try {
                const result = await toolExecutor.execute(toolName as any, toolInput);

                safeEnqueue({ type: "tool_result", toolCallId: toolCall.id, name: toolName, result });

                currentMessages.push({
                  role: "tool",
                  tool_call_id: toolCall.id,
                  content: JSON.stringify(result),
                });
              } catch (error) {
                 const errResult = { success: false, error: String(error) };
                 currentMessages.push({
                   role: "tool",
                   tool_call_id: toolCall.id,
                   content: JSON.stringify(errResult),
                 });
              }
            }

            if (pendingApprovalEmitted) {
              safeEnqueue({ type: "done" });
              break;
            }

            if (choice.finish_reason === "stop") {
              // Wait for next turn
            }
          }
        } catch (error) {
          console.error("Stream execution error:", error);
          safeEnqueue({ type: "error", message: String(error) });
        } finally {
          if (!isControllerClosed) {
            controller.close();
            isControllerClosed = true;
          }
        }
      },
    });

    return new NextResponse(stream, {
      headers: { "Content-Type": "application/x-ndjson", "Cache-Control": "no-cache" },
    });
  } catch (error: any) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
