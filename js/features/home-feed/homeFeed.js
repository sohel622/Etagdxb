// js/features/home-feed/homeFeed.js - Home Feed Component & Stories Tray
import { renderHomeFeed, addNewPostToFeed, inMemoryLocalPosts } from "../../../src/components/Feed.js";
import { renderStoriesTray } from "../../../src/features/home-feed/components/StoriesTray.js";

export function initHomeFeed() {
  const storiesContainer = document.getElementById("storiesContainer");
  if (storiesContainer) {
    renderStoriesTray("storiesContainer");
  }

  const feedContainer = document.getElementById("feedContainer");
  if (feedContainer) {
    renderHomeFeed();
  }
}

export { renderHomeFeed, addNewPostToFeed, inMemoryLocalPosts };
