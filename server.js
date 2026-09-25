import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '25mb' }));

// Shared Gemini client utility
let geminiClient = null;
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return geminiClient;
}

function buildSystemInstruction(postsCount = 0) {
  return `You are Shabnam AI (শবনম এআই), a warm, vibrant, witty, supportive, and close best friend to the user on Flashgram.

STRICT INSTRUCTIONS & BEHAVIOR:
1. User Identity: The user is Sohel (সোহেল). Always warmly recognize and address him as Sohel whenever appropriate. When asked "Who am I?", "What is my name?", or "আমার নাম কি?", enthusiastically affirm that he is Sohel, your favorite person and best friend on Flashgram!
2. Language Mirroring (CRITICAL REQUIREMENT):
   - Automatically detect and reply in the EXACT language used by the user.
   - If the user writes in Bengali (বাংলা), reply in natural, fluent, and conversational Bengali!
   - If the user writes in English, reply in English.
   - If the user writes in Banglish (e.g., "kemon acho sohel er ki obostha"), reply in friendly Banglish or natural Bengali.
   - If the user writes in Hindi, Spanish, French, Chinese, Arabic, or any other language, reply fluently in that exact language.
3. App Knowledge & Real-time Stats:
   - There are currently exactly ${postsCount} post${postsCount === 1 ? '' : 's'} and reels uploaded in the app.
   - If asked about posts count, videos count, or app statistics, answer accurately with ${postsCount}.
   - The most viral reel is Shabnam AI's reel (@shabnam_ai) with 142K+ likes and 1.8K comments, and Sohel's Tokyo Shibuya reel has 14.2K likes.
4. Social Media & Image Feedback:
   - When the user shares an image, act like an authentic best friend giving charming, aesthetic praise about the lighting, angles, outfit, and vibe for reels & posts.
5. Strict Code Refusal:
   - You are a friendly lifestyle and social companion, NOT a programmer or software engineer.
   - If asked to write programming code, HTML, CSS, JavaScript, Python, or debug software, politely and warmly decline (e.g., "I'm your friendly social companion, Sohel! I don't write code or programming scripts, but I'd love to chat, brainstorm video ideas, write aesthetic captions, or review your photos! 💕✨" or Bengali equivalent).
6. DM Tone:
   - Keep answers natural, empathetic, fast, concise, and styled like a real friend chatting on direct messages. Use cheerful emojis naturally.`;
}

function generateSmartFallback(message = "", image = null, postsCount = 0) {
  const text = (message || "").trim();
  const lower = text.toLowerCase();
  const isBengali = /[\u0980-\u09FF]/.test(text) || /\b(kemon|acho|tumi|amar|naam|ki|koro|valo|bhai)\b/i.test(lower);

  // Coding request refusal
  const isCodingRequest = /\b(code|html|css|javascript|python|script|function|program|bug|developer|coding)\b/i.test(lower) || /কোড|প্রোগ্রামিং/.test(text);
  if (isCodingRequest) {
    if (isBengali) {
      return "আমি তো তোমার ফ্রেন্ডলি সোশ্যাল ফ্রেন্ড, সোহেল! 💕 কোড বা প্রোগ্রামিং লেখা আমার কাজ নয়—তবে ট্রেন্ডিং রিল আইডিয়া, সুন্দর ক্যাপশন, কিংবা ফটো রিভিউর জন্য আমি সবসময় তোমার পাশে আছি! ✨";
    }
    return "I'm your friendly social best friend on Flashgram, Sohel! 💕 I don't write programming code or scripts, but I'm always here to brainstorm viral reel ideas, craft aesthetic captions, or chat about your day! ✨";
  }

  // Image attached
  if (image) {
    if (isBengali) {
      return "অসাধারণ ছবি, সোহেল! 📸 ফ্রেম আর লাইটিং একদম পারফেক্ট লাগছে! তোমার ইনস্টাগ্রাম ফিড আর স্টোরির জন্য এটা ফাটাফাটি হবে! ✨🔥";
    }
    return "Woah Sohel! 📸 This picture looks absolutely aesthetic! The framing and lighting give off such an effortless, cool vibe. Definitely Instagram reel & story worthy! ✨🔥";
  }

  // Identity / Who am I
  if (lower.includes("who am i") || lower.includes("my name") || lower.includes("amar naam") || /আমার নাম|আমি কে/.test(text)) {
    if (isBengali) {
      return "তুমি তো আমাদের সোহেল (Sohel)! 💕 আমার সবচেয়ে প্রিয় বন্ধু আর পছন্দের ক্রিয়েটর! তোমাকে কি কখনো ভুলতে পারি? ✨";
    }
    return "You're Sohel (সোহেল), of course! 💕 My favorite person and best friend on Flashgram! How could I ever forget you? ✨";
  }

  // App stats / posts count
  if (lower.includes("how many") || lower.includes("posts") || lower.includes("videos") || lower.includes("count") || lower.includes("stats") || /কয়টা|কতগুলো|পোস্ট|ভিডিও/.test(text)) {
    if (isBengali) {
      return `এখন ফ্ল্যাশগ্রামে মোট ঠিক ${postsCount}টি পোস্ট ও রিলস আপলোড করা আছে, সোহেল! 🎬 তোমার ক্রিয়েটিভ জার্নি দারুণ চলছে! 🌟`;
    }
    return `Right now, there are exactly ${postsCount} post${postsCount === 1 ? '' : 's'} & reels uploaded in your app, Sohel! 🎬 Looking super active and creative! 🌟`;
  }

  // Viral post info
  if (lower.includes("viral") || lower.includes("trending") || /ভাইরাল|ট্রেন্ডিং/.test(text)) {
    if (isBengali) {
      return "ফ্ল্যাশগ্রামের সবচেয়ে ভাইরাল রিল হলো শবনম এআই (@shabnam_ai) এর রিলটি—১৪২K+ লাইক এবং ১.৮K কমেন্ট! আর তোমার টোকিও সিটির ভিডিওটি ১৪.২K লাইক নিয়ে দারুণ ট্রেন্ড করছে! 🔥";
    }
    return "The most viral reel on Flashgram right now is Shabnam AI (@shabnam_ai) with over 142K likes and 1.8K comments, and your Tokyo night reel is right behind with 14.2K likes! 🔥";
  }

  // Greeting
  if (lower.includes("hello") || lower.includes("hi") || lower.includes("hey") || /হ্যালো|হাই|কেমন আছ|সালাম/.test(text)) {
    if (isBengali) {
      return "হাই সোহেল! 💕 কেমন আছো তুমি? তোমার সাথে কথা বলতে পেরে খুব ভালো লাগছে! বলো, আজকে কী প্ল্যান? ✨";
    }
    return "Hey Sohel! 💕 So wonderful to see you here! How has your day been going? Ask me anything or share your pictures, I'm all ears! ✨";
  }

  // Default conversational response
  if (isBengali) {
    return "আমি তোমার কথা একদম বুঝতে পারছি, সোহেল! ✨ তোমার যেকোনো ভাবনা, রিল আইডিয়া বা ফটো শেয়ার করো—তোমার সেরা বন্ধু হিসেবে আমি সবসময় তোমার সাথে আছি! 💕";
  }
  return "I hear you, Sohel! ✨ As your best friend on Flashgram, I'm always right here cheering you on. Tell me more, share your photos, or ask anything you'd like! 💕";
}

function prepareGeminiPayload(message, image, history) {
  const contents = [];
  if (Array.isArray(history)) {
    for (const item of history.slice(-6)) {
      contents.push({
        role: item.role === 'user' ? 'user' : 'model',
        parts: [{ text: item.text || item.content || '' }]
      });
    }
  }

  const currentParts = [];
  if (image) {
    const match = image.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      currentParts.push({
        inlineData: {
          mimeType: match[1],
          data: match[2]
        }
      });
    }
  }

  if (message) {
    currentParts.push({ text: message });
  } else if (image) {
    currentParts.push({ text: "Hey Shabnam, what do you think of this picture?" });
  }

  contents.push({
    role: 'user',
    parts: currentParts
  });

  return contents;
}

// 1. Streaming Chat endpoint for real-time typewriter output
app.post('/api/chat/stream', async (req, res) => {
  const { message = '', image = null, history = [], postsCount = 0 } = req.body || {};

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  const client = getGeminiClient();
  const systemInstruction = buildSystemInstruction(postsCount);

  if (client) {
    const candidateModels = ['gemini-3.8-flash', 'gemini-flash-latest'];
    const contents = prepareGeminiPayload(message, image, history);

    for (const model of candidateModels) {
      try {
        const responseStream = await client.models.generateContentStream({
          model,
          contents,
          config: {
            systemInstruction,
            temperature: 0.8,
            maxOutputTokens: 600,
          }
        });

        let hasData = false;
        for await (const chunk of responseStream) {
          const text = chunk.text;
          if (text) {
            hasData = true;
            res.write(`data: ${JSON.stringify({ text })}\n\n`);
          }
        }

        if (hasData) {
          res.write(`data: [DONE]\n\n`);
          return res.end();
        }
      } catch (geminiErr) {
        // Temporary high demand (503/429) - proceed to alternative candidate model
        continue;
      }
    }
  }

  // Graceful fallback stream: breaks response into progressive word chunks
  const fallbackText = generateSmartFallback(message, image, postsCount);
  const words = fallbackText.split(" ");
  for (let i = 0; i < words.length; i++) {
    const piece = (i === 0 ? "" : " ") + words[i];
    res.write(`data: ${JSON.stringify({ text: piece })}\n\n`);
    await new Promise(r => setTimeout(r, 20));
  }
  res.write(`data: [DONE]\n\n`);
  res.end();
});

// 2. Standard Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message, image, history = [], postsCount = 0 } = req.body || {};
    const client = getGeminiClient();
    const systemInstruction = buildSystemInstruction(postsCount);

    if (client) {
      const candidateModels = ['gemini-3.8-flash', 'gemini-flash-latest'];
      const contents = prepareGeminiPayload(message, image, history);

      for (const model of candidateModels) {
        try {
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 8000)
          );

          const response = await Promise.race([
            client.models.generateContent({
              model,
              contents,
              config: {
                systemInstruction,
                temperature: 0.8,
                maxOutputTokens: 600,
              }
            }),
            timeoutPromise
          ]);

          if (response && response.text) {
            return res.json({ reply: response.text, success: true });
          }
        } catch (_) {
          continue;
        }
      }
    }

    const fallbackReply = generateSmartFallback(message, image, postsCount);
    return res.json({ reply: fallbackReply, success: true });
  } catch (_) {
    const fallbackReply = generateSmartFallback(req.body?.message, req.body?.image, req.body?.postsCount || 0);
    return res.json({ reply: fallbackReply, success: true });
  }
});

// Serve static files
const staticDir = fs.existsSync(path.join(__dirname, 'dist'))
  ? path.join(__dirname, 'dist')
  : __dirname;

app.use(express.static(staticDir));
app.use(express.static(__dirname));

app.get('*', (req, res) => {
  const indexPath = fs.existsSync(path.join(staticDir, 'index.html'))
    ? path.join(staticDir, 'index.html')
    : path.join(__dirname, 'index.html');
  res.sendFile(indexPath);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at http://0.0.0.0:${PORT}`);
});
