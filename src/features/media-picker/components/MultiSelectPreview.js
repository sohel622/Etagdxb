// Multi-Select Preview Component (Numbered badges 1..5, active video playback or static image preview)

export function renderPreviewMediaHost({ container, activeItem }) {
  if (!container || !activeItem) return;
  container.innerHTML = "";

  if (activeItem.type === "video") {
    const video = document.createElement("video");
    video.src = activeItem.url;
    video.className = "media-picker-preview-video";
    video.autoplay = true;
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    container.appendChild(video);
  } else {
    const img = document.createElement("img");
    img.src = activeItem.url;
    img.className = "media-picker-preview-img";
    img.alt = "Preview";
    container.appendChild(img);
  }
}
