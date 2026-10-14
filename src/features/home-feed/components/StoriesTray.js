// Stories Tray Component for Home Feed
import { initStories } from "../../../components/Stories.js";

export const SAMPLE_STORIES = [
  { id: "s1", username: "Your Story", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100", isOwn: true, hasUnseen: false },
  { id: "s2", username: "shabnam_ai", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100", isOwn: false, hasUnseen: true },
  { id: "s3", username: "alexperry", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100", isOwn: false, hasUnseen: true },
  { id: "s4", username: "elena_v", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100", isOwn: false, hasUnseen: true },
  { id: "s5", username: "marcus_k", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100", isOwn: false, hasUnseen: false }
];

export function renderStoriesTray(containerId = "storiesContainer") {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = "";

  SAMPLE_STORIES.forEach(story => {
    const item = document.createElement("div");
    item.className = "story-item shrink-0 flex flex-col items-center gap-1.5 cursor-pointer";
    item.innerHTML = `
      <div class="story-ring ${story.hasUnseen ? 'unseen' : 'seen'} p-0.5 rounded-full">
        <div class="w-16 h-16 rounded-full overflow-hidden border-2 border-white dark:border-black">
          <img src="${story.avatar}" alt="${story.username}" class="w-full h-full object-cover" loading="lazy" />
        </div>
      </div>
      <span class="text-[11px] font-medium text-neutral-800 dark:text-neutral-200 truncate max-w-[70px]">${story.username}</span>
    `;
    container.appendChild(item);
  });

  initStories();
}
