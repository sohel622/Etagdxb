// js/features/home-feed/feedAudio.js - 30-Second Post Audio Sync Controller & Observer
import { audio30sController } from "../../../src/utils/audioCatalog.js";

export function initFeedAudioSync(container = document.getElementById("homeView")) {
  if (!container) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const card = entry.target;
      if (!entry.isIntersecting || entry.intersectionRatio < 0.65) {
        if (card.dataset.postId === audio30sController.currentPostId) {
          audio30sController.stopPlayback();
        }
      } else if (entry.intersectionRatio >= 0.65 && card._postData?.music) {
        audio30sController.playTrackForPost(card.dataset.postId, card._postData.music);
      }
    });
  }, {
    root: container,
    threshold: [0, 0.35, 0.65, 0.7, 1.0]
  });

  const cards = container.querySelectorAll('.post-card[data-has-music="true"]');
  cards.forEach(c => observer.observe(c));

  return observer;
}

export { audio30sController };
