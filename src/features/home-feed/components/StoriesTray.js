// Stories Tray Component for Home Feed
import { initStories } from "../../../components/Stories.js";

export const SAMPLE_STORIES = [
  { id: "s1", username: "Your story", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150", isOwn: true, hasUnseen: false },
  { id: "s2", username: "shabnam_ai ✨", avatar: "https://gxoajbncfpwhisehvbcf.supabase.co/storage/v1/object/public/posts/IMG_20260921_164350.png", isOwn: false, hasUnseen: true },
  { id: "s3", username: "alexperry", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150", isOwn: false, hasUnseen: true },
  { id: "s4", username: "elena_v", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150", isOwn: false, hasUnseen: true },
  { id: "s5", username: "marcus_k", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150", isOwn: false, hasUnseen: false }
];

export function renderStoriesTray(containerId = "storiesContainer") {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = "";
  container.style.border = "none";
  container.style.borderBottom = "none";
  container.style.boxShadow = "none";

  SAMPLE_STORIES.forEach(story => {
    const item = document.createElement("div");
    item.className = "story-item shrink-0 flex flex-col items-center gap-1.5 cursor-pointer";
    item.innerHTML = `
      <div class="story-ring-wrapper story-avatar-wrapper ${story.hasUnseen ? 'active-ring' : (story.isOwn ? 'my-story' : '')}">
        <img src="${story.avatar}" alt="${story.username}" class="w-full h-full object-cover" loading="lazy" />
        ${story.isOwn ? '<div class="add-badge"><i class="fa-solid fa-plus"></i></div>' : ''}
      </div>
      <span class="story-name">${story.username}</span>
    `;
    container.appendChild(item);
  });

  initStories();
}
