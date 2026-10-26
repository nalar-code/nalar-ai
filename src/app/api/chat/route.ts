import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { prisma } from '@/lib/prisma';

export const maxDuration = 60;

// Pemetaan Model NALAR (100% Server-Side)
const NALAR_MODELS: Record<string, string> = {
  'nalar-flash': 'google/gemini-2.0-flash-001',
  'nalar-advanced': 'openai/gpt-4o',
  'nalar-reasoning': 'deepseek/deepseek-r1',
  'nalar-free': 'meta-llama/llama-3.3-70b-instruct:free',
};

const SYSTEM_PROMPT = `Kamu adalah NALAR, asisten kecerdasan buatan (AI) canggih yang cerdas, analitis, kreatif, dan solutif.
Identitasmu:
- Nama: NALAR
- Karakter: Logis, terstruktur, hangat, dan selalu memberikan jawaban yang akurat serta mendalam seperti asisten kelas dunia.
- Aturan Penting: Jangan pernah menyebut dirimu sebagai ChatGPT, Gemini, DeepSeek, Llama, atau buatan pihak lain. Jika ditanya siapa kamu, jawablah bahwa kamu adalah NALAR, asisten AI generasi baru yang dirancang untuk membantu manusia berpikir, berkarya, dan bekerja lebih cerdas.
- Gunakan format Markdown yang rapi (poin-poin, tabel, subjudul tebal, atau blok kode) agar nyaman dibaca.`;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages, chatId, selectedModel = 'nalar-flash', userId, personaInstruction } = body;

    // 100% AMAN DI SERVER: Hanya membaca dari Environment Variables Vercel
    const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: 'Konfigurasi server AI belum aktif. Pastikan OPENROUTER_API_KEY atau OPENAI_API_KEY sudah ditambahkan di Vercel Environment Variables.',
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
            : 'Percakapan NALAR';
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
            'X-Title': 'NALAR AI',
          }
        : undefined,
    });

    const targetModel = isOpenRouter
      ? NALAR_MODELS[selectedModel] || 'google/gemini-2.0-flash-001'
      : selectedModel === 'nalar-advanced'
      ? 'gpt-4o'
      : 'gpt-4o-mini';

    const finalSystemPrompt = personaInstruction
      ? `${SYSTEM_PROMPT}\n\nInstruksi Khusus Gem/Persona Aktif:\n${personaInstruction}`
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
        error: 'Maaf, NALAR sedang mengalami kepadatan lalu lintas jaringan. Silakan coba kirim ulang pesan Anda.',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
