package com.flashgram.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.os.Build;
import android.os.Bundle;
import android.os.IBinder;
import android.os.PowerManager;
import android.support.v4.media.MediaMetadataCompat;
import android.support.v4.media.session.MediaSessionCompat;
import android.support.v4.media.session.PlaybackStateCompat;
import androidx.core.app.NotificationCompat;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class FlashgramMediaService extends Service {

    public static final String ACTION_START_OR_UPDATE = "com.flashgram.app.ACTION_START_OR_UPDATE";
    public static final String ACTION_PLAY = "com.flashgram.app.ACTION_MEDIA_PLAY";
    public static final String ACTION_PAUSE = "com.flashgram.app.ACTION_MEDIA_PAUSE";
    public static final String ACTION_PLAY_PAUSE = "com.flashgram.app.ACTION_MEDIA_PLAY_PAUSE";
    public static final String ACTION_PREV = "com.flashgram.app.ACTION_MEDIA_PREV";
    public static final String ACTION_NEXT = "com.flashgram.app.ACTION_MEDIA_NEXT";
    public static final String ACTION_LIKE = "com.flashgram.app.ACTION_MEDIA_LIKE";
    public static final String ACTION_SEEK = "com.flashgram.app.ACTION_MEDIA_SEEK";
    public static final String ACTION_STOP = "com.flashgram.app.ACTION_MEDIA_STOP";

    public static final String EXTRA_TITLE = "extra_title";
    public static final String EXTRA_ARTIST = "extra_artist";
    public static final String EXTRA_ALBUM = "extra_album";
    public static final String EXTRA_COVER_URL = "extra_cover_url";
    public static final String EXTRA_IS_PLAYING = "extra_is_playing";
    public static final String EXTRA_DURATION = "extra_duration";
    public static final String EXTRA_POSITION = "extra_position";
    public static final String EXTRA_IS_LIKED = "extra_is_liked";

    private static final String CHANNEL_ID = "flashgram_music_playback_channel";
    private static final int NOTIFICATION_ID = 4040;

    private MediaSessionCompat mediaSession;
    private PowerManager.WakeLock wakeLock;
    private AudioManager audioManager;
    private AudioFocusRequest audioFocusRequest;
    private final ExecutorService imageExecutor = Executors.newSingleThreadExecutor();

    private final AudioManager.OnAudioFocusChangeListener afChangeListener = new AudioManager.OnAudioFocusChangeListener() {
        @Override
        public void onAudioFocusChange(int focusChange) {
            if (focusChange == AudioManager.AUDIOFOCUS_LOSS) {
                handleUserAction(ACTION_PAUSE);
            } else if (focusChange == AudioManager.AUDIOFOCUS_LOSS_TRANSIENT) {
                handleUserAction(ACTION_PAUSE);
            } else if (focusChange == AudioManager.AUDIOFOCUS_GAIN) {
                if (isPlaying) {
                    handleUserAction(ACTION_PLAY);
                }
            }
        }
    };

    private String currentTitle = "Flashgram Track";
    private String currentArtist = "Flashgram Music";
    private String currentAlbum = "Flashgram Tracks";
    private String currentCoverUrl = "";
    private boolean isPlaying = false;
    private boolean isLiked = false;
    private long currentDuration = 215000L;
    private long currentPosition = 0L;
    private Bitmap currentArtworkBitmap = null;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        initMediaSession();

        audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);

        PowerManager powerManager = (PowerManager) getSystemService(Context.POWER_SERVICE);
        if (powerManager != null) {
            wakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "Flashgram:MusicPlaybackWakeLock");
            wakeLock.setReferenceCounted(false);
        }
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Flashgram Music Playback",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Background music controls & lock screen notification player");
            channel.setShowBadge(false);
            channel.setSound(null, null);
            channel.enableVibration(false);
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    private void initMediaSession() {
        mediaSession = new MediaSessionCompat(this, "FlashgramMediaSession");
        mediaSession.setFlags(
            MediaSessionCompat.FLAG_HANDLES_MEDIA_BUTTONS |
            MediaSessionCompat.FLAG_HANDLES_TRANSPORT_CONTROLS
        );

        mediaSession.setCallback(new MediaSessionCompat.Callback() {
            @Override
            public void onPlay() {
                handleUserAction(ACTION_PLAY);
            }

            @Override
            public void onPause() {
                handleUserAction(ACTION_PAUSE);
            }

            @Override
            public void onSkipToNext() {
                handleUserAction(ACTION_NEXT);
            }

            @Override
            public void onSkipToPrevious() {
                handleUserAction(ACTION_PREV);
            }

            @Override
            public void onSeekTo(long pos) {
                MainActivity.dispatchMediaSeek(pos);
            }

            @Override
            public void onCustomAction(String action, Bundle extras) {
                if (ACTION_LIKE.equals(action)) {
                    handleUserAction(ACTION_LIKE);
                }
            }

            @Override
            public void onStop() {
                handleUserAction(ACTION_STOP);
            }
        });

        mediaSession.setActive(true);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) return START_STICKY;

        String action = intent.getAction();
        if (action == null) action = ACTION_START_OR_UPDATE;

        switch (action) {
            case ACTION_PLAY:
                handleUserAction(ACTION_PLAY);
                break;
            case ACTION_PAUSE:
                handleUserAction(ACTION_PAUSE);
                break;
            case ACTION_PLAY_PAUSE:
                handleUserAction(isPlaying ? ACTION_PAUSE : ACTION_PLAY);
                break;
            case ACTION_PREV:
                handleUserAction(ACTION_PREV);
                break;
            case ACTION_NEXT:
                handleUserAction(ACTION_NEXT);
                break;
            case ACTION_LIKE:
                handleUserAction(ACTION_LIKE);
                break;
            case ACTION_STOP:
                stopPlaybackService();
                break;
            case ACTION_START_OR_UPDATE:
            default:
                updateFromIntent(intent);
                break;
        }

        return START_STICKY;
    }

    private void requestAudioFocus() {
        if (audioManager == null) return;
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                if (audioFocusRequest == null) {
                    AudioAttributes playbackAttributes = new AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_MEDIA)
                        .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                        .build();
                    audioFocusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
                        .setAudioAttributes(playbackAttributes)
                        .setAcceptsDelayedFocusGain(true)
                        .setOnAudioFocusChangeListener(afChangeListener)
                        .build();
                }
                audioManager.requestAudioFocus(audioFocusRequest);
            } else {
                audioManager.requestAudioFocus(afChangeListener, AudioManager.STREAM_MUSIC, AudioManager.AUDIOFOCUS_GAIN);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void abandonAudioFocus() {
        if (audioManager == null) return;
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                if (audioFocusRequest != null) {
                    audioManager.abandonAudioFocusRequest(audioFocusRequest);
                }
            } else {
                audioManager.abandonAudioFocus(afChangeListener);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void handleUserAction(String action) {
        MainActivity.dispatchMediaCommand(action);
        if (ACTION_PLAY.equals(action)) {
            isPlaying = true;
            requestAudioFocus();
            acquireWakeLock();
            updateNotification();
        } else if (ACTION_PAUSE.equals(action)) {
            isPlaying = false;
            releaseWakeLock();
            abandonAudioFocus();
            updateNotification();
        } else if (ACTION_STOP.equals(action)) {
            stopPlaybackService();
        }
    }

    private void updateFromIntent(Intent intent) {
        String title = intent.getStringExtra(EXTRA_TITLE);
        String artist = intent.getStringExtra(EXTRA_ARTIST);
        String album = intent.getStringExtra(EXTRA_ALBUM);
        String coverUrl = intent.getStringExtra(EXTRA_COVER_URL);

        if (title != null && !title.isEmpty()) currentTitle = title;
        if (artist != null && !artist.isEmpty()) currentArtist = artist;
        if (album != null && !album.isEmpty()) currentAlbum = album;

        isPlaying = intent.getBooleanExtra(EXTRA_IS_PLAYING, isPlaying);
        isLiked = intent.getBooleanExtra(EXTRA_IS_LIKED, isLiked);
        currentDuration = intent.getLongExtra(EXTRA_DURATION, currentDuration);
        currentPosition = intent.getLongExtra(EXTRA_POSITION, currentPosition);

        if (isPlaying) {
            requestAudioFocus();
            acquireWakeLock();
        } else {
            releaseWakeLock();
        }

        // If cover artwork URL changed, fetch asynchronously
        if (coverUrl != null && !coverUrl.isEmpty() && !coverUrl.equals(currentCoverUrl)) {
            currentCoverUrl = coverUrl;
            fetchArtworkAsync(coverUrl);
        } else {
            updateNotification();
        }
    }

    private void fetchArtworkAsync(final String urlString) {
        imageExecutor.execute(new Runnable() {
            @Override
            public void run() {
                Bitmap bitmap = null;
                try {
                    URL url = new URL(urlString);
                    HttpURLConnection connection = (HttpURLConnection) url.openConnection();
                    connection.setConnectTimeout(6000);
                    connection.setReadTimeout(6000);
                    connection.setDoInput(true);
                    connection.connect();
                    InputStream input = connection.getInputStream();
                    bitmap = BitmapFactory.decodeStream(input);
                } catch (Exception e) {
                    e.printStackTrace();
                }

                if (bitmap != null) {
                    currentArtworkBitmap = bitmap;
                } else if (currentArtworkBitmap == null) {
                    currentArtworkBitmap = BitmapFactory.decodeResource(getResources(), R.drawable.splash);
                }

                updateNotification();
            }
        });
    }

    private void updateNotification() {
        if (mediaSession == null) return;

        // 1. Playback State
        long playbackActions = PlaybackStateCompat.ACTION_PLAY
            | PlaybackStateCompat.ACTION_PAUSE
            | PlaybackStateCompat.ACTION_PLAY_PAUSE
            | PlaybackStateCompat.ACTION_SKIP_TO_NEXT
            | PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS
            | PlaybackStateCompat.ACTION_SEEK_TO
            | PlaybackStateCompat.ACTION_STOP;

        PlaybackStateCompat.CustomAction likeAction = new PlaybackStateCompat.CustomAction.Builder(
            ACTION_LIKE,
            isLiked ? "Unlike" : "Like",
            isLiked ? R.drawable.ic_media_heart : R.drawable.ic_media_heart_outline
        ).build();

        PlaybackStateCompat.Builder stateBuilder = new PlaybackStateCompat.Builder()
            .setActions(playbackActions)
            .setState(
                isPlaying ? PlaybackStateCompat.STATE_PLAYING : PlaybackStateCompat.STATE_PAUSED,
                currentPosition,
                1.0f
            )
            .addCustomAction(likeAction);

        mediaSession.setPlaybackState(stateBuilder.build());

        // 2. Metadata
        MediaMetadataCompat.Builder metaBuilder = new MediaMetadataCompat.Builder()
            .putString(MediaMetadataCompat.METADATA_KEY_TITLE, currentTitle)
            .putString(MediaMetadataCompat.METADATA_KEY_ARTIST, currentArtist)
            .putString(MediaMetadataCompat.METADATA_KEY_ALBUM, currentAlbum)
            .putLong(MediaMetadataCompat.METADATA_KEY_DURATION, currentDuration);

        if (currentArtworkBitmap != null) {
            metaBuilder.putBitmap(MediaMetadataCompat.METADATA_KEY_ALBUM_ART, currentArtworkBitmap);
            metaBuilder.putBitmap(MediaMetadataCompat.METADATA_KEY_ART, currentArtworkBitmap);
        }
        mediaSession.setMetadata(metaBuilder.build());

        // 3. Notification Intents
        int pFlags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            pFlags |= PendingIntent.FLAG_IMMUTABLE;
        }

        Intent openAppIntent = new Intent(this, MainActivity.class);
        openAppIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        openAppIntent.putExtra("route", "music");
        PendingIntent contentPendingIntent = PendingIntent.getActivity(this, 100, openAppIntent, pFlags);

        Intent prevIntent = new Intent(this, FlashgramMediaService.class).setAction(ACTION_PREV);
        PendingIntent prevPending = PendingIntent.getService(this, 101, prevIntent, pFlags);

        Intent playPauseIntent = new Intent(this, FlashgramMediaService.class).setAction(ACTION_PLAY_PAUSE);
        PendingIntent playPausePending = PendingIntent.getService(this, 102, playPauseIntent, pFlags);

        Intent nextIntent = new Intent(this, FlashgramMediaService.class).setAction(ACTION_NEXT);
        PendingIntent nextPending = PendingIntent.getService(this, 103, nextIntent, pFlags);

        Intent likeIntent = new Intent(this, FlashgramMediaService.class).setAction(ACTION_LIKE);
        PendingIntent likePending = PendingIntent.getService(this, 104, likeIntent, pFlags);

        Intent stopIntent = new Intent(this, FlashgramMediaService.class).setAction(ACTION_STOP);
        PendingIntent stopPending = PendingIntent.getService(this, 105, stopIntent, pFlags);

        // 4. Build Rich Media Notification
        androidx.media.app.NotificationCompat.MediaStyle mediaStyle =
            new androidx.media.app.NotificationCompat.MediaStyle()
                .setMediaSession(mediaSession.getSessionToken())
                .setShowActionsInCompactView(0, 1, 2)
                .setShowCancelButton(true)
                .setCancelButtonIntent(stopPending);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_flashgram)
            .setContentTitle(currentTitle)
            .setContentText(currentArtist)
            .setSubText(currentAlbum)
            .setContentIntent(contentPendingIntent)
            .setDeleteIntent(stopPending)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(isPlaying)
            .setStyle(mediaStyle)
            .addAction(R.drawable.ic_media_prev, "Previous", prevPending) // action 0
            .addAction(
                isPlaying ? R.drawable.ic_media_pause : R.drawable.ic_media_play,
                isPlaying ? "Pause" : "Play",
                playPausePending // action 1
            )
            .addAction(R.drawable.ic_media_next, "Next", nextPending) // action 2
            .addAction(
                isLiked ? R.drawable.ic_media_heart : R.drawable.ic_media_heart_outline,
                isLiked ? "Liked" : "Like",
                likePending // action 3: Custom heart action
            );

        if (currentArtworkBitmap != null) {
            builder.setLargeIcon(currentArtworkBitmap);
        }

        Notification notification = builder.build();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }
    }

    private void acquireWakeLock() {
        if (wakeLock != null && !wakeLock.isHeld()) {
            try {
                wakeLock.acquire(12 * 60 * 60 * 1000L); // Max 12 hours
            } catch (Exception ignored) {}
        }
    }

    private void releaseWakeLock() {
        if (wakeLock != null && wakeLock.isHeld()) {
            try {
                wakeLock.release();
            } catch (Exception ignored) {}
        }
    }

    private void stopPlaybackService() {
        releaseWakeLock();
        abandonAudioFocus();
        if (mediaSession != null) {
            mediaSession.setActive(false);
        }
        stopForeground(true);
        stopSelf();
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        super.onTaskRemoved(rootIntent);
        MainActivity.dispatchMediaCommand(ACTION_STOP);
        stopPlaybackService();
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        releaseWakeLock();
        abandonAudioFocus();
        if (mediaSession != null) {
            mediaSession.release();
            mediaSession = null;
        }
        imageExecutor.shutdown();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
