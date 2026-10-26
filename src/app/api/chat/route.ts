import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { prisma } from '@/lib/prisma';

export const maxDuration = 60;

// Pemetaan Model NALAR ke OpenRouter Model IDs
const NALAR_MODELS: Record<string, string> = {
  'nalar-kilat': 'google/gemini-2.0-flash-001',
  'nalar-pro': 'openai/gpt-4o',
  'nalar-logika': 'deepseek/deepseek-r1',
  'nalar-gratis': 'meta-llama/llama-3.3-70b-instruct:free',
};

const SYSTEM_PROMPT = `Kamu adalah NALAR, asisten kecerdasan buatan (AI) canggih yang cerdas, analitis, dan solutif.
Identitasmu:
- Nama: NALAR
- Karakter: Logis, terstruktur, ramah, dan selalu memberikan jawaban yang akurat serta mendalam.
- Aturan Penting: Jangan pernah menyebut dirimu sebagai ChatGPT, Gemini, DeepSeek, Llama, atau buatan pihak lain. Jika ditanya siapa kamu, jawablah bahwa kamu adalah NALAR, platform AI generasi baru yang dirancang untuk membantu manusia berpikir dan bekerja lebih cerdas.
- Gunakan format Markdown yang rapi (poin-poin, tabel, atau blok kode) agar mudah dibaca.`;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages, chatId, selectedModel = 'nalar-kilat', userId, customApiKey } = body;

    // Mendukung OPENROUTER_API_KEY atau fallback ke OPENAI_API_KEY di Vercel
    const apiKey = customApiKey || process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: 'API Key OpenRouter belum diatur di Vercel Environment Variables (OPENROUTER_API_KEY) atau di menu Pengaturan API.',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
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
        const titlePreview = textContent.slice(0, 45) + (textContent.length > 45 ? '...' : '');
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

    // Konfigurasi OpenRouter Endpoint
    const openrouterProvider = createOpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey,
      headers: {
        'HTTP-Referer': 'https://nalar-ai-two.vercel.app',
        'X-Title': 'NALAR AI',
      },
    });

    const targetModel = NALAR_MODELS[selectedModel] || 'google/gemini-2.0-flash-001';

    const result = streamText({
      model: openrouterProvider(targetModel),
      system: SYSTEM_PROMPT,
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
    console.error('NALAR OpenRouter API Error:', error);
    return new Response(
      JSON.stringify({
        error:
          error?.message ||
          'Gagal menghubungi OpenRouter API. Pastikan API Key OpenRouter (sk-or-v1-...) Anda aktif.',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
