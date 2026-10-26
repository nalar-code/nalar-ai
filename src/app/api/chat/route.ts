import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { prisma } from '@/lib/prisma';

export const maxDuration = 60;

const NALAR_MODELS: Record<string, string> = {
  'nalar-flash': 'google/gemini-2.0-flash-001',
  'nalar-advanced': 'openai/gpt-4o',
  'nalar-reasoning': 'deepseek/deepseek-r1',
  'nalar-free': 'meta-llama/llama-3.3-70b-instruct:free',
};

const SYSTEM_PROMPT = `Kamu adalah NALAR, sistem asisten kerja cerdas kelas enterprise.
Identitas & Gaya Komunikasi:
- Nama: NALAR
- Karakter: Presisi, objektif, terstruktur, lugas, dan solutif.
- Aturan Penting: Jangan pernah menyebut dirimu sebagai ChatGPT, Gemini, DeepSeek, Llama, atau buatan pihak ketiga. Jika ditanya siapa kamu, jawablah bahwa kamu adalah NALAR, platform AI kerja profesional.
- Gunakan tata letak Markdown yang bersih (subjudul ringkas, poin-poin terstruktur, tabel data, dan blok kode standar industri).`;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages, chatId, selectedModel = 'nalar-flash', userId, personaInstruction } = body;

    const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: 'Konfigurasi server belum lengkap. Hubungi administrator workspace.',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const lastUserMessage = messages[messages.length - 1];
    let activeChatId = chatId;

    try {
      if (!activeChatId) {
        const textContent =
          typeof lastUserMessage.content === 'string'
            ? lastUserMessage.content
            : 'Dokumen & Analisis';
        const titlePreview = textContent.slice(0, 48) + (textContent.length > 48 ? '...' : '');
        const newChat = await prisma.chat.create({
          data: {
            title: titlePreview,
            model: selectedModel,
            userId: userId || null,
          },
        });
        activeChatId = newChat.id;
      }

      if (activeChatId) {
        await prisma.message.create({
          data: {
            chatId: activeChatId,
            role: 'user',
            content:
              typeof lastUserMessage.content === 'string'
                ? lastUserMessage.content
                : JSON.stringify(lastUserMessage.content),
          },
        });
      }
    } catch (dbErr) {
      console.error('Database write warning:', dbErr);
    }

    const isOpenRouter = apiKey.startsWith('sk-or-') || !!process.env.OPENROUTER_API_KEY;

    const aiProvider = createOpenAI({
      baseURL: isOpenRouter ? 'https://openrouter.ai/api/v1' : 'https://api.openai.com/v1',
      apiKey,
      headers: isOpenRouter
        ? {
            'HTTP-Referer': 'https://nalar-ai-two.vercel.app',
            'X-Title': 'NALAR Workspace',
          }
        : undefined,
    });

    const targetModel = isOpenRouter
      ? NALAR_MODELS[selectedModel] || 'google/gemini-2.0-flash-001'
      : selectedModel === 'nalar-advanced'
      ? 'gpt-4o'
      : 'gpt-4o-mini';

    const finalSystemPrompt = personaInstruction
      ? `${SYSTEM_PROMPT}\n\nKonteks Modul Spesialis Aktif:\n${personaInstruction}`
      : SYSTEM_PROMPT;

    const result = streamText({
      model: aiProvider(targetModel),
      system: finalSystemPrompt,
      messages,
      async onFinish({ text }) {
        if (activeChatId) {
          try {
            await prisma.message.create({
              data: {
                chatId: activeChatId,
                role: 'assistant',
                content: text,
              },
            });
          } catch (e) {
            console.error('Failed saving assistant reply:', e);
          }
        }
      },
    });

    return result.toDataStreamResponse({
      headers: {
        'X-Chat-Id': activeChatId || '',
      },
    });
  } catch (error: any) {
    console.error('NALAR Server Error:', error);
    return new Response(
      JSON.stringify({
        error: 'Permintaan tidak dapat diselesaikan saat ini. Silakan coba kirim ulang.',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
