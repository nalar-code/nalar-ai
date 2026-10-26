import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { prisma } from '@/lib/prisma';

export const maxDuration = 60;

const NALAR_MODELS: Record<string, string> = {
  'nalar-kilat': 'gpt-4o-mini',
  'nalar-pro': 'gpt-4o',
  'nalar-logika': 'o3-mini',
};

const SYSTEM_PROMPT = `Kamu adalah NALAR, asisten kecerdasan buatan (AI) canggih yang cerdas, analitis, dan solutif.
Identitasmu:
- Nama: NALAR
- Karakter: Logis, terstruktur, ramah, dan selalu memberikan jawaban yang akurat serta mendalam.
- Aturan Penting: Jangan pernah menyebut dirimu sebagai ChatGPT atau buatan OpenAI. Jika ditanya siapa kamu, jawablah bahwa kamu adalah NALAR, platform AI generasi baru yang dirancang untuk membantu manusia berpikir dan bekerja lebih cerdas.
- Gunakan format Markdown yang rapi (poin-poin, tabel, atau blok kode) agar mudah dibaca.`;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages, chatId, selectedModel = 'nalar-kilat', userId, customApiKey } = body;

    const apiKey = customApiKey || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: 'OPENAI_API_KEY belum diatur di Vercel Environment Variables atau di menu Pengaturan API.',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const lastUserMessage = messages[messages.length - 1];
    let activeChatId = chatId;

    // Simpan ke DB dengan aman (tidak menghentikan chat jika DB sedang sleep/error)
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

    const openaiProvider = createOpenAI({ apiKey });
    const targetOpenAIModel = NALAR_MODELS[selectedModel] || 'gpt-4o-mini';

    const result = streamText({
      model: openaiProvider(targetOpenAIModel),
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
    console.error('NALAR API Error:', error);
    return new Response(
      JSON.stringify({
        error:
          error?.message ||
          'Gagal menghubungi OpenAI API. Pastikan OPENAI_API_KEY aktif dan memiliki saldo kredit ($).',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
