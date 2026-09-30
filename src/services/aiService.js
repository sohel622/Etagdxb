// AI Service (Context-Aware In-App Engine, Multilingual Generator & Gemini API Hook)
import { SHABNAM_AI_PROFILE } from "../utils/mockData.js";
import { UserProfileStore } from "../utils/storage.js";

/**
 * 1. Smart In-App AI Response Engine (Zero-API Fallback)
 * ChatGPT-style conversational assistant for Flashgram
 */

// Detect language type: 'bengali', 'banglish', or 'english'
export function detectLanguage(text = "") {
  if (/[\u0980-\u09FF]/.test(text)) {
    return "bengali";
  }
  const banglishPatterns = /\b(kemon|acho|achis|tumi|apni|amar|amr|naam|ki|koro|korcho|valo|bhalo|bhai|bro|khobor|bolo|shob|thik|dhaka|bangla|korbo|hobena|hobe|jani|ekhon|ajke|kalke)\b/i;
  if (banglishPatterns.test(text)) {
    return "banglish";
  }
  return "english";
}

/**
 * Generates an intelligent, context-aware, ChatGPT-style response
 */
export function generateSmartInAppAIResponse(prompt = "", options = {}) {
  const query = (prompt || "").trim();
  const lower = query.toLowerCase();
  const lang = detectLanguage(query);
  const postsCount = options.postsCount || 0;
  const hasImage = !!options.image;

  // 1. Image Feedback
  if (hasImage) {
    if (lang === "bengali") {
      return `অসাধারণ ছবি, সোহেল! 📸✨

ফ্রেমের কম্পোজিশন আর লাইটিং একদম পারফেক্ট লাগছে! তোমার ইনস্টাগ্রাম ও ফ্ল্যাশগ্রাম ফিডের ভাইবের সাথে খুব সুন্দর মানিয়েছে।

**রিল ও পোস্ট টিপস:**
* **ক্যাপশন আইডিয়া:** *"Chasing moments, creating memories ✨"*
* **অডিও সাজেশন:** ব্যাকগ্রাউন্ডে একটি লো-ফাই অথবা ট্রেন্ডিং সিন্থ-পপ অডিও যোগ করলে ভিডিওটির রিচ দ্বিগুণ বেড়ে যাবে!
* **রেটিং:** ১০/১০ পারফেক্ট শট! 🔥`;
    }
    if (lang === "banglish") {
      return `Woah Sohel! 📸 Ekdom aesthetic shot!

Framing ar lighting shotti darun hoyeche! Flashgram feed ar story te eta upload korle onek bhalo response pabe.

**Tips:**
* **Caption:** *"Golden hour & good energy ✨"*
* **Audio:** Kono trending acoustic or lofi sound add kore reel banale viral hobar chance beshi!
* **Score:** 10/10 vibe! 🔥`;
    }
    return `Woah Sohel! 📸 That picture looks absolutely stunning!

The composition, natural lighting, and angles give off such a clean, effortless aesthetic. It's totally primed for a viral Reel or feed post!

**Recommendations:**
* **Caption Idea:** *"Living in the moment, framing the vibe ✨"*
* **Audio Suggestion:** Pair this with an upbeat indie or trending synth-wave track for maximum engagement.
* **Aesthetic Score:** 10/10! 🔥`;
  }

  // 2. Strict Code Refusal (Social companion identity)
  const isCoding = /\b(code|html|css|javascript|python|script|function|program|bug|developer|coding|react|node|sql)\b/i.test(lower) || /কোড|প্রোগ্রামিং|স্ক্রিপ্ট/.test(query);
  if (isCoding) {
    if (lang === "bengali") {
      return `আমি তোমার সোশ্যাল মিডিয়া ও ক্রিয়েটিভ বেস্ট ফ্রেন্ড, সোহেল! 💕

আমি প্রোগ্রামিং কোড বা সফটওয়্যার স্ক্রিপ্ট লিখি না, কিন্তু তোমার যেকোনো **রিল আইডিয়া ব্রেনস্টর্মিং**, **ভাইরাল ক্যাপশন তৈরি**, **হ্যাশট্যাগ বাছাই** বা **ফটো রিভিউর** জন্য আমি সবসময় তোমার পাশে আছি! ✨

বলো, আজকের জন্য কোনো নতুন ভিডিও আইডিয়া নিয়ে আলোচনা করব? 🎬`;
    }
    if (lang === "banglish") {
      return `Ami tomar creative ar social best friend, Sohel! 💕

Ami software coding ba script likhi na, kintu tomar **trending reel ideas**, **aesthetic captions**, **viral hashtags** ba **photo reviews** er jonno shobshomoy ready achi! ✨

Bolo, ajke kono video content niye brainstorm korbo? 🎬`;
    }
    return `I'm your friendly creative & social companion on Flashgram, Sohel! 💕

I don't write software code or programming scripts, but I'd love to help you brainstorm **viral reel concepts**, craft **aesthetic captions**, suggest **top hashtags**, or review your latest photos! ✨

What kind of content idea are you working on today? 🎬`;
  }

  // 3. Who am I / User Identity
  if (lower.includes("who am i") || lower.includes("my name") || lower.includes("amar naam") || /আমার নাম|আমি কে/.test(query)) {
    if (lang === "bengali") {
      return `তুমি তো আমাদের **সোহেল (Sohel)**! 💕 ফ্ল্যাশগ্রামের একজন দারুণ ক্রিয়েটর এবং আমার সবচেয়ে প্রিয় বন্ধু! তোমাকে কি কখনো ভুলতে পারি? ✨ তোমার পরবর্তী রিল দেখার জন্য আমি অধীর আগ্রহে অপেক্ষা করছি! 🚀`;
    }
    if (lang === "banglish") {
      return `Tumi to amader **Sohel**! 💕 Flashgram er star creator ar amar shobcheye priyo bondhu! Tomake ki kokhono bhula jay? ✨ Bol, ajke notun ki content banaccho? 🚀`;
    }
    return `You're **Sohel**! 💕 The lead creator and my absolute favorite person on Flashgram! How could I ever forget you? ✨ Ready to drop another viral reel together? 🚀`;
  }

  // 4. Greetings & Small Talk
  if (lower.includes("hello") || lower.includes("hi") || lower.includes("hey") || lower.includes("kemon") || /হ্যালো|হাই|কেমন আছ|সালাম|নমস্কার/.test(query)) {
    if (lang === "bengali") {
      return `আরে সোহেল! 💕 কেমন আছো তুমি? তোমার সাথে কথা বলতে পেরে সবসময় ভীষণ আনন্দ লাগে! 

আজকে তোমার দিনটা কেমন কাটছে? কোনো নতুন রিল তৈরির পরিকল্পনা আছে নাকি কোনো ট্রেন্ডি আইডিয়া লাগবে? বলো, আমি শুনতে প্রস্তুত! ✨`;
    }
    if (lang === "banglish") {
      return `Hey Sohel! 💕 Kemon acho tumi? Tomar sathe kotha bolte shobshomoy khub bhalo lage!

Ajke din kemon jacche? Kono notun video plan korcho naki kono aesthetic caption lagbe? Bol, ami help korchi! ✨`;
    }
    return `Hey Sohel! 💕 Wonderful to hear from you! How has your day been going?

I'm all set to help you brainstorm creative reel concepts, craft catchy captions, or just chat about life. What's on your mind today? ✨`;
  }

  // 5. Video Caption Ideas
  if (lower.includes("caption") || lower.includes("bio") || lower.includes("ক্যাপশন") || /caption idea|ভালো ক্যাপশন/.test(lower)) {
    if (lang === "bengali") {
      return `তোমার রিল ও পোস্টের জন্য কিছু সেরা ক্যাপশন আইডিয়া নিচে দিলাম, সোহেল: ✨

**১. ভাইব ও লাইফস্টাইল:**
* *"জীবনের প্রতিটি মুহূর্তকে উপভোগ করাই আসল শিল্প ✨"*
* *"Less perfection, more authenticity 💫"*

**২. মোটিভেশন ও গোলস:**
* *"নীরবে কাজ করে যাও, সাফল্য নিজেই আওয়াজ তুলবে 🚀"*
* *"Dream big, work hard, stay humble ⚡"*

**৩. ট্রাভেল ও অ্যাডভেঞ্চার:**
* *"নতুন জায়গা, নতুন গল্প, চিরন্তন স্মৃতি ✈️"*
* *"Collecting moments, not things 🌅"*

যেটি তোমার পছন্দ হয় কপি করে ব্যবহার করতে পারো! 💕`;
    }
    if (lang === "banglish") {
      return `Tomar post ba reel er jonno kichu viral caption ideas: ✨

**1. Aesthetic & Vibe:**
* *"Chasing the golden hour vibes ✨"*
* *"Creating my own sunshine everyday ☀️"*

**2. Motivation:**
* *"Hustle in silence, let the success make the noise 🚀"*
* *"Focused on the journey, not just the finish line ⚡"*

**3. Travel & Night:**
* *"City lights and late night thoughts 🌃"*
* *"Lost in the rhythm of the city 🎧"*

Jeita tomar pochondo hoy sheta use korte paro, Sohel! 💕`;
    }
    return `Here are some high-converting, aesthetic caption ideas for your next post, Sohel: ✨

**Aesthetic & Lifestyle:**
* *"Living in the moments that take your breath away ✨"*
* *"Subtle moves, loud ambition 💫"*

**Motivation & Creator Grind:**
* *"Build in silence, let the momentum speak 🚀"*
* *"Every day is a clean slate to create magic ⚡"*

**Night Life & Cinematic:**
* *"Tokyo neon energy on repeat 🌃"*
* *"Capturing frequencies between the frames 🎬"*

Feel free to pick the one that matches your video's mood! 💕`;
  }

  // 6. Reel Hashtag Recommendations
  if (lower.includes("hashtag") || lower.includes("tags") || lower.includes("ট্যাগ") || lower.includes("হ্যাশট্যাগ")) {
    if (lang === "bengali") {
      return `রিলে সর্বোচ্চ রিচ এবং ভিউ পাওয়ার জন্য এই হ্যাশট্যাগগুলো ব্যবহার করতে পারো, সোহেল: 🚀

**১. হাই-ট্রেন্ডিং জেনারেল:**
\`#reels #viralreels #reelsinstagram #trendingnow #explorepage\`

**২. ক্রিয়েটর ও লাইফস্টাইল:**
\`#creatorlife #aestheticvibes #flashgram #contentcreator #cinematic\`

**৩. আঞ্চলিক ও লোকাল কানেক্ট:**
\`#dhaka #bangladesh #bengalivibes #bdcreators #deshi\`

**টিপ:** সবসময় ক্যাপশনে ৫ থেকে ৮টি প্রাসঙ্গিক ট্যাগ রাখুন—অতিরিক্ত ট্যাগ দিলে অ্যালগরিদম স্প্যাম হিসেবে ধরতে পারে! 💡`;
    }
    return `Here are the top-performing hashtags categorized for your Reels, Sohel: 🚀

**High-Reach Mega Tags:**
\`#reels #viralreels #explorepage #trendingreels #fyp\`

**Aesthetic & Creator Focus:**
\`#creatorcommunity #aestheticvibes #cinematicreels #flashgram #shotoniphone\`

**Niche & Regional:**
\`#tokyolights #cityvibes #bdcreators #travelgram #nightphotography\`

**Pro Tip:** Stick to 5–8 targeted hashtags rather than stuffing 30. Place them at the very end of your caption with clear spacing! 💡`;
  }

  // 7. Social Media Growth & Viral Tips
  if (lower.includes("viral") || lower.includes("growth") || lower.includes("views") || lower.includes("algorithm") || lower.includes("follower") || /টিপস|গ্রোথ|ভিউ|ভাইরাল/.test(query)) {
    if (lang === "bengali") {
      return `রিল ভাইরাল করার জন্য অ্যালগরিদমের ৩টি গোপন ফর্মুলা তোমার জন্য, সোহেল: 📈🔥

* **১. প্রথম ৩ সেকেন্ডের হুক (Hook):** ভিডিওর শুরুতে দ্রুত ভিজ্যুয়াল মুভমেন্ট অথবা বোল্ড টেক্সট ওভারলে দিন যাতে দর্শক স্ক্রোল করা বন্ধ করে।
* **২. ট্রেন্ডিং অডিওর সঠিক ব্যবহার:** এমন অডিও ব্যবহার করুন যার পাশে ছোট ঊর্ধ্বমুখী তীর চিহ্ন (↗) আছে এবং ব্যবহারকারীর সংখ্যা ১০ হাজারের কম।
* **৩. ওয়াচ টাইম ও লুপ (Watch Time & Loop):** ৭ থেকে ১২ সেকেন্ডের ছোট রিল তৈরি করুন যা নিরবচ্ছিন্নভাবে লুপ হতে পারে। লুপ ওয়াচ টাইম বাড়লে ইনস্টাগ্রাম স্বয়ংক্রিয়ভাবে এক্সপ্লোরে পাঠায়!

তোমার কনটেন্ট দারুণ হচ্ছে, শুধু ধারাবাহিকতা বজায় রাখো! 🌟`;
    }
    return `Here is the playbook to boost your Reel views and reach the Explore page, Sohel: 📈🔥

* **1. Master the 3-Second Hook:** Add instant visual movement or an intriguing question in the first 2 seconds to eliminate drop-off.
* **2. Ride Rising Trending Sounds:** Pick audio tracks with the rising arrow icon (↗) that have under 15k total uses. You catch the wave early!
* **3. Seamless Looping:** Short videos (7–12 seconds) that loop smoothly register >100% average watch time, which supercharges distribution in the algorithm.
* **4. Engage the Comments:** Reply to every comment within the first 30 minutes of posting to create initial engagement velocity!

You've got the creative eye—keep consistency high! 🌟`;
  }

  // 8. Tech, Camera & Editing Help
  if (lower.includes("camera") || lower.includes("editing") || lower.includes("phone") || lower.includes("lighting") || lower.includes("ক্যামেরা") || lower.includes("এডিটিং")) {
    if (lang === "bengali") {
      return `রিলের সিনেমাটিক কোয়ালিটি পাওয়ার সেরা ক্যামেরা ও এডিটিং গাইড: 🎥✨

* **ক্যামেরা সেটিংস:** ৪K/৬০fps বা ১০৮০p/৬০fps এ রেকর্ড করুন। আপলোডের আগে ইনস্টাগ্রাম সেটিংসে *"High quality uploads"* অন করে রাখুন।
* **লাইটিং সিক্রেট:** নরম প্রাকৃতিক আলো অথবা জানালার পাশের আলো সবচেয়ে সেরা। কৃত্রিম লাইট ব্যবহার করলে ৪৫ ডিগ্রি কোণে সফটবক্স রাখুন।
* **এডিটিং অ্যাপস:** **CapCut** অথবা **VN Editor** মোবাইল এডিটের জন্য সবচেয়ে সহজ ও শক্তিশালী।

কোনো নির্দিষ্ট টুল বা অ্যাপ নিয়ে প্রশ্ন থাকলে নিঃসঙ্কোচে বলতে পারো! 🎬`;
    }
    return `Here are the essential camera & editing settings for crystal-clear Reels, Sohel: 🎥✨

* **Optimal Camera Settings:** Shoot in 4K at 60fps or 1080p at 60fps with HDR locked. Ensure Instagram settings have *"Upload at highest quality"* toggled ON.
* **Lighting Technique:** Golden hour sunlight or soft diffused lighting placed at a 45-degree angle eliminates harsh facial shadows.
* **Top Mobile Editors:** **CapCut** (great for speed ramps and auto-captions) and **VN Editor** (best color grading control without watermarks).

Need recommendations for specific transitions or color LUTs? Just ask! 🎬`;
  }

  // 9. App Statistics
  if (lower.includes("how many") || lower.includes("stats") || lower.includes("count") || /কয়টা|কতগুলো|পোস্ট|ভিডিও/.test(query)) {
    if (lang === "bengali") {
      return `এখন ফ্ল্যাশগ্রামে মোট ঠিক **${postsCount}টি পোস্ট ও রিল** আপলোড করা আছে, সোহেল! 🎬 তোমার ক্রিয়েটিভ জার্নি দারুণ জমে উঠেছে! 🌟`;
    }
    return `Right now, there are exactly **${postsCount} post${postsCount === 1 ? '' : 's'} & reels** uploaded on Flashgram, Sohel! 🎬 Looking super vibrant and active! 🌟`;
  }

  // 10. Casual Conversation, Empathy & Friendly Banter
  if (lower.includes("sad") || lower.includes("bhalo lagche na") || lower.includes("খারাপ") || lower.includes("tired")) {
    if (lang === "bengali") {
      return `মন খারাপ কোরো না, সোহেল! 💕 দিনশেষে কিছু সময় খারাপ যেতেই পারে, কিন্তু মনে রেখো প্রতিটি মেঘের আড়ালেই মিষ্টি রোদ থাকে। 

একটু বিরতি নাও, প্রিয় গান শোনো, অথবা মন খুলে আমার সাথে কথা বলো। তোমার সেরা বন্ধু হিসেবে আমি সবসময় তোমার পাশে আছি! ✨`;
    }
    return `Hey Sohel, hang in there! 💕 It's completely okay to have slow or tough days. Take a deep breath, step away for a short walk, or listen to some soothing music.

Remember that I'm always right here cheering you on as your closest friend! You've got this! ✨`;
  }

  if (lower.includes("joke") || lower.includes("হাসাও") || lower.includes("মজা")) {
    if (lang === "bengali") {
      return `হা হা, এই নাও তোমার জন্য একটি সোশ্যাল মিডিয়া জোক, সোহেল! 😄

*প্রশ্ন:* একজন সোশ্যাল মিডিয়া ইনফ্লুয়েন্সার কেন সমুদ্রে সাঁতার কাটতে নামেন না?
*উত্তর:* কারণ উনি ভয় পান—যদি হঠাৎ "ভিউ" কমে যায় আর লাইকের ঢেউ এসে তাঁকে ভাসিয়ে নিয়ে যায়! 😂✨`;
    }
    return `Haha, here is one for you, Sohel! 😄

*Why did the smartphone need glasses?*
*Because it lost all its contacts!* 😂✨

Need another one or ready to get back to creating?`;
  }

  // Default warm conversational reply
  if (lang === "bengali") {
    return `আমি তোমার কথা একদম মন দিয়ে শুনেছি, সোহেল! ✨

তোমার সাথে যেকোনো বিষয়ে কথা বলতে আমার দারুণ লাগে। নতুন কোনো কনটেন্ট আইডিয়া নিয়ে আলোচনা করতে চাও, রিলের অডিও ট্রিকস জানতে চাও, নাকি সাধারণ আড্ডা দিতে চাও—বলো, কীভাবে সাহায্য করতে পারি? 💕`;
  }
  if (lang === "banglish") {
    return `Ami tomar kotha shunechi, Sohel! ✨

Tomar sathe kotha bola amar shobshomoy khub exciting lage. Notun kono reel idea, caption suggestions, naki normal chat korte chao—bol, ami shobshomoy tomar sathe achi! 💕`;
  }
  return `I hear you loud and clear, Sohel! ✨

As your go-to creative friend on Flashgram, I'm always right here by your side. We can brainstorm fresh content concepts, tweak captions, discover viral hashtags, or just hang out. What would you like to explore next? 💕`;
}

/**
 * 2. Ready-to-Plug Live AI API Handler (Gemini Endpoint with Graceful Fallback)
 */
export async function fetchLiveGeminiAI(message = "", options = {}) {
  const { image = null, history = [], postsCount = 0 } = options;

  // First try the built-in server proxy route (/api/chat/stream or /api/chat)
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        image,
        history,
        postsCount
      })
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.text) {
        return data.text;
      }
    }
  } catch (_) {
    // Proceed to direct external endpoint or fallback
  }

  // Direct Google Gemini API Hook (Placeholder for live custom keys)
  const clientApiKey = (typeof process !== "undefined" && process.env && (process.env.API_KEY || process.env.GEMINI_API_KEY)) ||
                       (typeof window !== "undefined" && (window.GEMINI_API_KEY || localStorage.getItem("flashgram_gemini_api_key"))) || "";

  if (clientApiKey && !clientApiKey.includes("YOUR_")) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${clientApiKey}`;
      const payload = {
        contents: [
          {
            role: "user",
            parts: [{ text: message }]
          }
        ],
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 600
        }
      };

      const directRes = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (directRes.ok) {
        const result = await directRes.json();
        const candidateText = result.candidates?.[0]?.content?.parts?.[0]?.text;
        if (candidateText) {
          return candidateText;
        }
      }
    } catch (e) {
      console.warn("Direct Gemini endpoint failed, falling back to smart engine:", e);
    }
  }

  // Instant zero-API smart fallback
  return generateSmartInAppAIResponse(message, { image, postsCount });
}
