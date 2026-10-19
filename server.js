import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import os from 'os';
import { execSync } from 'child_process';
import { GoogleGenAI } from '@google/genai';
import multer from 'multer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));

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

// Viral Shorts & Reels Sounds catalog (Slowed + Reverb, Phonk, Trending Reels Audios)
const VIRAL_EDIT_TRACKS = [
  {
    id: "xqe0-uYHqnM",
    title: "X-COOL! (Instrumental - Ultra Slowed)",
    artist: "Trending Sound",
    coverUrl: "https://i.ytimg.com/vi/xqe0-uYHqnM/hqdefault.jpg",
    thumbnail: "https://i.ytimg.com/vi/xqe0-uYHqnM/hqdefault.jpg",
    audioUrl: "https://pipedapi.kavin.rocks/streams/xqe0-uYHqnM",
    duration: "1:00"
  },
  {
    id: "BX7exLYSEy8",
    title: "Memory Reboot (Slowed)",
    artist: "VØJ x Narvent",
    coverUrl: "https://i.ytimg.com/vi/BX7exLYSEy8/hqdefault.jpg",
    thumbnail: "https://i.ytimg.com/vi/BX7exLYSEy8/hqdefault.jpg",
    audioUrl: "https://pipedapi.kavin.rocks/streams/BX7exLYSEy8",
    duration: "1:30"
  },
  {
    id: "6mWJ4FfNAYI",
    title: "MONTAGEM PEGADORA (Slowed)",
    artist: "Trending Sound",
    coverUrl: "https://i.ytimg.com/vi/6mWJ4FfNAYI/hqdefault.jpg",
    thumbnail: "https://i.ytimg.com/vi/6mWJ4FfNAYI/hqdefault.jpg",
    audioUrl: "https://pipedapi.kavin.rocks/streams/6mWJ4FfNAYI",
    duration: "1:15"
  },
  {
    id: "49EJ5ERgXwM",
    title: "ACIDO III (Super Slowed)",
    artist: "Trending Sound",
    coverUrl: "https://i.ytimg.com/vi/49EJ5ERgXwM/hqdefault.jpg",
    thumbnail: "https://i.ytimg.com/vi/49EJ5ERgXwM/hqdefault.jpg",
    audioUrl: "https://pipedapi.kavin.rocks/streams/49EJ5ERgXwM",
    duration: "1:20"
  },
  {
    id: "3QqwjYC3EAg",
    title: "AVANGARD (Ultra Slowed + Reverb)",
    artist: "Trending Sound",
    coverUrl: "https://i.ytimg.com/vi/3QqwjYC3EAg/hqdefault.jpg",
    thumbnail: "https://i.ytimg.com/vi/3QqwjYC3EAg/hqdefault.jpg",
    audioUrl: "https://pipedapi.kavin.rocks/streams/3QqwjYC3EAg",
    duration: "1:05"
  },
  {
    id: "saTV3Df7R_s",
    title: "LUZ ROJA (Super Slowed)",
    artist: "bxkq",
    coverUrl: "https://i.ytimg.com/vi/saTV3Df7R_s/hqdefault.jpg",
    thumbnail: "https://i.ytimg.com/vi/saTV3Df7R_s/hqdefault.jpg",
    audioUrl: "https://pipedapi.kavin.rocks/streams/saTV3Df7R_s",
    duration: "1:10"
  }
];

// Live Real-Time YouTube Music Search API Route
app.get('/api/music/search', async (req, res) => {
  const query = (req.query.q || req.query.query || '').trim();
  if (!query) {
    return res.json({ success: true, items: VIRAL_EDIT_TRACKS });
  }

  try {
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query + ' slowed remix audio')}`;
    const ytRes = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });

    if (ytRes.ok) {
      const html = await ytRes.text();
      const match = html.match(/var ytInitialData = ({.*?});<\/script>/);
      if (match) {
        const data = JSON.parse(match[1]);
        const contents = data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents;
        const videos = (contents || [])
          .filter(c => c.videoRenderer && c.videoRenderer.videoId)
          .slice(0, 20)
          .map(c => {
            const v = c.videoRenderer;
            const rawTitle = v.title?.runs?.[0]?.text || 'Trending Track';
            const cleanTitle = rawTitle.replace(/\(Official Video\)|\(Official Audio\)|\(Lyrics\)|\[.*?\]/gi, '').trim();
            const artist = v.ownerText?.runs?.[0]?.text || 'Trending Audio';
            const durationStr = v.lengthText?.simpleText || '0:30';
            const thumb = v.thumbnail?.thumbnails?.slice(-1)[0]?.url || `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`;

            return {
              id: v.videoId,
              title: cleanTitle,
              artist,
              coverUrl: thumb,
              thumbnail: thumb,
              audioUrl: `https://pipedapi.kavin.rocks/streams/${v.videoId}`,
              duration: durationStr
            };
          });

        if (videos.length > 0) {
          return res.json({ success: true, items: videos });
        }
      }
    }
  } catch (err) {
    console.warn('[MusicSearch] Live search exception:', err);
  }

  // Filter viral tracks matching query as fallback
  const filtered = VIRAL_EDIT_TRACKS.filter(t => 
    t.title.toLowerCase().includes(query.toLowerCase()) || 
    t.artist.toLowerCase().includes(query.toLowerCase())
  );
  return res.json({ success: true, items: filtered.length > 0 ? filtered : VIRAL_EDIT_TRACKS });
});

app.get('/api/music/trending', (req, res) => {
  return res.json({ success: true, items: VIRAL_EDIT_TRACKS });
});

// -------------------------------------------------------------
// Server-Side Audio-Video Merging & Cloudinary Upload Engine
// Permanently muxes video with selected background song track using FFmpeg
// -------------------------------------------------------------
const uploadDisk = multer({
  dest: os.tmpdir(),
  limits: { fileSize: 100 * 1024 * 1024 }
});

const CLOUDINARY_UPLOAD_URL = 'https://api.cloudinary.com/v1_1/yrfaotod/video/upload';
const CLOUDINARY_PRESET = 'flashgram_videos';

const handleAudioVideoMergeAndUpload = async (req, res) => {
  const tempFilesToCleanup = [];
  try {
    let audioUrl = (req.body?.audioUrl || req.body?.audio_url || '').trim();
    const videoUrl = (req.body?.videoUrl || req.body?.video_url || '').trim();

    // Domain correction for Supabase storage if necessary
    if (audioUrl.includes('gxotjbncfpwhisehvbcff')) {
      audioUrl = audioUrl.replace('gxotjbncfpwhisehvbcff', 'gxoajbncfpwhisehvbcf');
    }

    let inputVideoPath = null;
    if (req.file && req.file.path) {
      inputVideoPath = req.file.path;
      tempFilesToCleanup.push(inputVideoPath);
    } else if (videoUrl) {
      const tempVid = path.join(os.tmpdir(), `in_vid_${Date.now()}_${Math.random().toString(36).substring(7)}.mp4`);
      execSync(`curl -sL "${videoUrl}" -o "${tempVid}"`, { timeout: 35000 });
      if (fs.existsSync(tempVid) && fs.statSync(tempVid).size > 100) {
        inputVideoPath = tempVid;
        tempFilesToCleanup.push(tempVid);
      }
    }

    if (!inputVideoPath || !fs.existsSync(inputVideoPath)) {
      return res.status(400).json({ success: false, error: 'No video file or valid videoUrl provided' });
    }

    let finalUploadFilePath = inputVideoPath;

    // If a background song was selected, dynamically replace/mute original video audio and mux with the song
    if (audioUrl) {
      console.log(`[AudioVideoMerge] Merging background song: ${audioUrl} into video...`);
      const tempAud = path.join(os.tmpdir(), `in_aud_${Date.now()}_${Math.random().toString(36).substring(7)}.m4a`);
      execSync(`curl -sL "${audioUrl}" -o "${tempAud}"`, { timeout: 35000 });
      tempFilesToCleanup.push(tempAud);

      if (fs.existsSync(tempAud) && fs.statSync(tempAud).size > 100) {
        const mergedOutputPath = path.join(os.tmpdir(), `merged_${Date.now()}_${Math.random().toString(36).substring(7)}.mp4`);
        tempFilesToCleanup.push(mergedOutputPath);

        let muxSuccess = false;
        // Fast stream copy mode first: copies video frames without re-encoding, muxes background song with AAC
        try {
          execSync(
            `ffmpeg -y -i "${inputVideoPath}" -stream_loop -1 -i "${tempAud}" -c:v copy -map 0:v:0 -map 1:a:0 -shortest -c:a aac -b:a 192k "${mergedOutputPath}"`,
            { timeout: 30000, stdio: 'pipe' }
          );
          if (fs.existsSync(mergedOutputPath) && fs.statSync(mergedOutputPath).size > 1000) {
            muxSuccess = true;
            finalUploadFilePath = mergedOutputPath;
            console.log('[AudioVideoMerge] Fast stream-copy muxing succeeded.');
          }
        } catch (copyErr) {
          console.warn('[AudioVideoMerge] Stream-copy notice, attempting re-encode muxing:', copyErr.message || copyErr);
        }

        // Robust re-encode fallback if stream copy failed on container format
        if (!muxSuccess) {
          try {
            execSync(
              `ffmpeg -y -i "${inputVideoPath}" -stream_loop -1 -i "${tempAud}" -c:v libx264 -preset veryfast -crf 23 -pix_fmt yuv420p -map 0:v:0 -map 1:a:0 -shortest -c:a aac -b:a 192k "${mergedOutputPath}"`,
              { timeout: 60000, stdio: 'pipe' }
            );
            if (fs.existsSync(mergedOutputPath) && fs.statSync(mergedOutputPath).size > 1000) {
              muxSuccess = true;
              finalUploadFilePath = mergedOutputPath;
              console.log('[AudioVideoMerge] Re-encode muxing succeeded.');
            }
          } catch (encodeErr) {
            console.error('[AudioVideoMerge] Re-encode muxing failed:', encodeErr);
          }
        }
      }
    }

    // Upload the final muxed video directly to Cloudinary
    const fileBuffer = fs.readFileSync(finalUploadFilePath);
    const blob = new Blob([fileBuffer], { type: 'video/mp4' });
    const formData = new FormData();
    formData.append('file', blob, 'reel_muxed.mp4');
    formData.append('upload_preset', CLOUDINARY_PRESET);
    formData.append('resource_type', 'video');

    const cldResponse = await fetch(CLOUDINARY_UPLOAD_URL, {
      method: 'POST',
      body: formData
    });

    const cldData = await cldResponse.json();
    if (!cldResponse.ok || !cldData || (!cldData.secure_url && !cldData.url)) {
      throw new Error(cldData?.error?.message || 'Cloudinary upload failed: ' + JSON.stringify(cldData));
    }

    const secureUrl = cldData.secure_url || cldData.url;
    const thumbnailUrl = secureUrl.replace(/\.[^/.]+$/, ".jpg");

    return res.json({
      success: true,
      secure_url: secureUrl,
      url: secureUrl,
      thumbnail_url: thumbnailUrl,
      public_id: cldData.public_id,
      duration: cldData.duration,
      format: cldData.format
    });
  } catch (err) {
    console.error('[AudioVideoMerge] Exception:', err);
    return res.status(500).json({ success: false, error: err.message || 'Muxing/upload failed' });
  } finally {
    for (const f of tempFilesToCleanup) {
      try {
        if (fs.existsSync(f)) fs.unlinkSync(f);
      } catch (_) {}
    }
  }
};

app.post('/api/reel/merge-and-upload', uploadDisk.single('video'), handleAudioVideoMergeAndUpload);
app.post('/api/reel/merge-audio', uploadDisk.single('video'), handleAudioVideoMergeAndUpload);

// Ensure production build exists for reliable module resolution
const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir) || !fs.existsSync(path.join(distDir, 'index.html'))) {
  try {
    console.log('[Server] Building frontend assets (Vite)...');
    execSync('npm run build', { stdio: 'inherit' });
  } catch (buildErr) {
    console.error('[Server] Frontend build note:', buildErr);
  }
}

// Serve static files
const staticDir = fs.existsSync(distDir) ? distDir : __dirname;

app.use(express.static(staticDir));
app.use(express.static(__dirname));

// Dynamic Open Graph preview cards for public Reel links (WhatsApp, Telegram, Twitter, etc.)
app.get(['/reel/:id', '/reels/:id'], (req, res) => {
  const reelId = req.params.id;
  const indexPath = fs.existsSync(path.join(staticDir, 'index.html'))
    ? path.join(staticDir, 'index.html')
    : path.join(__dirname, 'index.html');

  try {
    let html = fs.readFileSync(indexPath, 'utf-8');

    const shareUrl = `https://Etagdxb.vercel.app/reel/${reelId}`;
    const previewImage = 'https://Etagdxb.vercel.app/og-preview.png';
    const ogTitle = `Reel on Flashgram • Watch Now`;
    const ogDesc = `Watch this trending reel on Flashgram. Tap to watch in full screen.`;

    const dynamicMeta = `
  <meta property="og:type" content="video.other" />
  <meta property="og:site_name" content="Flashgram" />
  <meta property="og:title" content="${ogTitle}" />
  <meta property="og:description" content="${ogDesc}" />
  <meta property="og:image" content="${previewImage}" />
  <meta property="og:url" content="${shareUrl}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${ogTitle}" />
  <meta name="twitter:description" content="${ogDesc}" />
  <meta name="twitter:image" content="${previewImage}" />
    `.trim();

    html = html.replace(/<meta property="og:type"[^>]*>/i, '');
    html = html.replace(/<meta property="og:site_name"[^>]*>/i, '');
    html = html.replace(/<meta property="og:title"[^>]*>/i, '');
    html = html.replace(/<meta property="og:description"[^>]*>/i, '');
    html = html.replace(/<meta property="og:image"[^>]*>/i, '');
    html = html.replace(/<meta property="og:url"[^>]*>/i, '');
    html = html.replace(/<meta name="twitter:card"[^>]*>/i, '');
    html = html.replace(/<meta name="twitter:title"[^>]*>/i, '');
    html = html.replace(/<meta name="twitter:description"[^>]*>/i, '');
    html = html.replace(/<meta name="twitter:image"[^>]*>/i, '');

    html = html.replace('<head>', `<head>\n  ${dynamicMeta}`);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  } catch (err) {
    res.sendFile(indexPath);
  }
});

app.get('*', (req, res) => {
  const indexPath = fs.existsSync(path.join(staticDir, 'index.html'))
    ? path.join(staticDir, 'index.html')
    : path.join(__dirname, 'index.html');
  res.sendFile(indexPath);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at http://0.0.0.0:${PORT}`);
});
