import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { prisma } from '@/lib/prisma';

export const maxDuration = 60;

// Pemetaan Branding Model NALAR ke OpenAI API
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
    const { messages, chatId, selectedModel = 'nalar-kilat' } = await req.json();
    const lastUserMessage = messages[messages.length - 1];

    // 1. Buat sesi Chat baru di DB jika belum ada
    let activeChatId = chatId;
    if (!activeChatId) {
      const textContent = typeof lastUserMessage.content === 'string'
        ? lastUserMessage.content
        : 'Analisis Dokumen / Gambar';
      const titlePreview = textContent.slice(0, 45) + (textContent.length > 45 ? '...' : '');
      const newChat = await prisma.chat.create({
        data: {
          title: titlePreview,
          model: selectedModel,
        },
      });
      activeChatId = newChat.id;
    }

    // 2. Simpan pesan dari User ke PostgreSQL
    await prisma.message.create({
      data: {
        chatId: activeChatId,
        role: 'user',
        content: typeof lastUserMessage.content === 'string'
          ? lastUserMessage.content
          : JSON.stringify(lastUserMessage.content),
      },
    });

    const targetOpenAIModel = NALAR_MODELS[selectedModel] || 'gpt-4o-mini';

    // 3. Panggil OpenAI dengan Streaming & Simpan balasan NALAR setelah selesai
    const result = streamText({
      model: openai(targetOpenAIModel),
      system: SYSTEM_PROMPT,
      messages,
      async onFinish({ text }) {
        await prisma.message.create({
          data: {
            chatId: activeChatId,
            role: 'assistant',
            content: text,
          },
        });
      },
    });

    return result.toDataStreamResponse({
      headers: {
        'X-Chat-Id': activeChatId,
      },
    });
  } catch (error) {
    console.error('NALAR API Error:', error);
    return new Response(
      JSON.stringify({ error: 'Gagal memproses permintaan NALAR. Pastikan OPENAI_API_KEY dan DATABASE_URL sudah diatur.' }),
      { status: 500 }
    );
  }
}
