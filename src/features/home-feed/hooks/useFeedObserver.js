// Home Feed Video & 30s Audio Post Observer Hook
import { audio30sController } from "../../../utils/audioCatalog.js";

export function createFeedObserver({ container, videoSelector = ".home-video-container", musicSelector = '.post-card[data-has-music="true"]' }) {
  if (!container) return null;

  const visibilityMap = new Map();
  let isScheduled = false;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      visibilityMap.set(entry.target, entry.isIntersecting ? entry.intersectionRatio : 0);

      // Mute/pause video when scrolling away
      if (!entry.isIntersecting || entry.intersectionRatio < 0.7) {
        const video = entry.target.querySelector("video");
        if (video) {
          video.pause();
          video.muted = true;
        }
      }

      // Stop 30s audio when leaving viewport
      if (!entry.isIntersecting || entry.intersectionRatio < 0.65) {
        if (entry.target.dataset?.postId === audio30sController.currentPostId) {
          audio30sController.stopPlayback();
        }
      }
    });

    if (!isScheduled) {
      isScheduled = true;
      requestAnimationFrame(() => {
        isScheduled = false;
        evaluateActiveMedia(container, visibilityMap);
      });
    }
  }, {
    root: container,
    threshold: [0, 0.35, 0.65, 0.7, 1.0]
  });

  return observer;
}

function evaluateActiveMedia(container, visibilityMap) {
  const containerRect = container.getBoundingClientRect();
  const centerY = containerRect.top + containerRect.height / 2;

  // Evaluate centered music card
  const musicCards = Array.from(container.querySelectorAll('.post-card[data-has-music="true"]'));
  let bestMusic = null;
  let minMusicDist = Infinity;

  musicCards.forEach(card => {
    const ratio = visibilityMap.get(card) || 0;
    if (ratio >= 0.65) {
      const rect = card.getBoundingClientRect();
      const dist = Math.abs(centerY - (rect.top + rect.height / 2));
      if (dist < minMusicDist) {
        minMusicDist = dist;
        bestMusic = card;
      }
    }
  });

  if (bestMusic && bestMusic._postData?.music) {
    audio30sController.playTrackForPost(bestMusic.dataset.postId, bestMusic._postData.music);
  } else if (!bestMusic && audio30sController.currentPostId) {
    audio30sController.stopPlayback();
  }
}
