// Navbar Component (Top Bar & Sound State)

    /* =======================================================
       ১.১ গ্লোবাল অডিও স্টেট
    ======================================================= */
    let isGlobalAudioMuted = true;

    function toggleGlobalAudio() {
      isGlobalAudioMuted = !isGlobalAudioMuted;
      document.querySelectorAll("video").forEach(vid => {
        vid.muted = isGlobalAudioMuted;
      });
      showGlobalSoundBadge();
    }

    function showGlobalSoundBadge() {
      document.querySelectorAll(".sound-status-badge").forEach(badge => {
        badge.innerHTML = isGlobalAudioMuted ? '<i class="fa-solid fa-volume-xmark"></i>' : '<i class="fa-solid fa-volume-high"></i>';
        badge.style.opacity = '1';
        setTimeout(() => badge.style.opacity = '0', 1000);
      });
    }



export { toggleGlobalAudio, showGlobalSoundBadge, isGlobalAudioMuted };
