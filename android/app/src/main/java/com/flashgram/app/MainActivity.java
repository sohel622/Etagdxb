package com.flashgram.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.PictureInPictureParams;
import android.app.RemoteAction;
import android.content.BroadcastReceiver;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.content.res.Configuration;
import android.graphics.Color;
import android.graphics.drawable.Icon;
import android.media.AudioManager;
import android.os.Build;
import android.os.Bundle;
import android.util.Rational;
import android.view.KeyEvent;
import android.view.View;
import android.view.Window;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;
import java.util.ArrayList;
import java.util.List;

public class MainActivity extends BridgeActivity {

    public static volatile boolean isReelsActive = false;
    public static volatile boolean isDarkModeActive = true;
    public static volatile boolean isMusicActive = false;
    private boolean isReelsActiveAndPlaying = false;
    public static MainActivity instance = null;

    public void setReelsPiPState(boolean allowed) {
        this.isReelsActiveAndPlaying = allowed;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            try {
                // Android 12+ smooth auto-enter PiP
                PictureInPictureParams params = new PictureInPictureParams.Builder()
                        .setAspectRatio(new Rational(9, 16)) // Reels vertical aspect ratio
                        .setAutoEnterEnabled(allowed)
                        .build();
                setPictureInPictureParams(params);
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
    }

    private static final String ACTION_PIP_PLAY_PAUSE = "com.flashgram.app.ACTION_PIP_PLAY_PAUSE";
    private static final String ACTION_PIP_NEXT = "com.flashgram.app.ACTION_PIP_NEXT";

    private final BroadcastReceiver pipReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            if (intent == null || intent.getAction() == null) return;
            String action = intent.getAction();
            if (ACTION_PIP_PLAY_PAUSE.equals(action)) {
                if (bridge != null && bridge.getWebView() != null) {
                    bridge.getWebView().evaluateJavascript(
                        "window.toggleCurrentReelPlayback && window.toggleCurrentReelPlayback();",
                        null
                    );
                }
            } else if (ACTION_PIP_NEXT.equals(action)) {
                if (bridge != null && bridge.getWebView() != null) {
                    bridge.getWebView().evaluateJavascript(
                        "window.goToNextReel && window.goToNextReel();",
                        null
                    );
                }
            }
        }
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        instance = this;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            getWindow().getAttributes().layoutInDisplayCutoutMode =
                WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
        }
        applySystemUiSettings();
        createUploadNotificationChannel();

        if (bridge != null && bridge.getWebView() != null) {
            bridge.getWebView().getSettings().setMediaPlaybackRequiresUserGesture(false);
            bridge.getWebView().addJavascriptInterface(new Object() {
                @android.webkit.JavascriptInterface
                public void setReelsActive(boolean active) {
                    isReelsActive = active;
                    runOnUiThread(new Runnable() {
                        @Override
                        public void run() {
                            updateNativeStatusBar(active, isDarkModeActive);
                        }
                    });
                }

                @android.webkit.JavascriptInterface
                public void setStatusBarTheme(final boolean isReels, final boolean isDark) {
                    isReelsActive = isReels;
                    isDarkModeActive = isDark;
                    runOnUiThread(new Runnable() {
                        @Override
                        public void run() {
                            updateNativeStatusBar(isReels, isDark);
                        }
                    });
                }

                @android.webkit.JavascriptInterface
                public void setReelsPiPState(final boolean allowed) {
                    runOnUiThread(new Runnable() {
                        @Override
                        public void run() {
                            MainActivity.this.setReelsPiPState(allowed);
                        }
                    });
                }
            }, "NativeReelsBridge");

            bridge.getWebView().addJavascriptInterface(new Object() {
                @android.webkit.JavascriptInterface
                public boolean changeAppIcon(final String iconKey) {
                    runOnUiThread(new Runnable() {
                        @Override
                        public void run() {
                            setLauncherAppIcon(iconKey);
                        }
                    });
                    return true;
                }

                @android.webkit.JavascriptInterface
                public String getActiveAppIcon() {
                    return getSharedPreferences("flashgram_prefs", Context.MODE_PRIVATE)
                        .getString("active_app_icon", "default");
                }
            }, "NativeAppIconBridge");

            bridge.getWebView().addJavascriptInterface(new Object() {
                @android.webkit.JavascriptInterface
                public void updateMediaMetadata(
                    final String title,
                    final String artist,
                    final String album,
                    final String coverUrl,
                    final boolean isPlaying,
                    final long durationMs,
                    final long positionMs,
                    final boolean isLiked
                ) {
                    isMusicActive = isPlaying;
                    runOnUiThread(new Runnable() {
                        @Override
                        public void run() {
                            Intent serviceIntent = new Intent(MainActivity.this, FlashgramMediaService.class);
                            serviceIntent.setAction(FlashgramMediaService.ACTION_START_OR_UPDATE);
                            serviceIntent.putExtra(FlashgramMediaService.EXTRA_TITLE, title);
                            serviceIntent.putExtra(FlashgramMediaService.EXTRA_ARTIST, artist);
                            serviceIntent.putExtra(FlashgramMediaService.EXTRA_ALBUM, album);
                            serviceIntent.putExtra(FlashgramMediaService.EXTRA_COVER_URL, coverUrl);
                            serviceIntent.putExtra(FlashgramMediaService.EXTRA_IS_PLAYING, isPlaying);
                            serviceIntent.putExtra(FlashgramMediaService.EXTRA_DURATION, durationMs);
                            serviceIntent.putExtra(FlashgramMediaService.EXTRA_POSITION, positionMs);
                            serviceIntent.putExtra(FlashgramMediaService.EXTRA_IS_LIKED, isLiked);

                            try {
                                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                                    startForegroundService(serviceIntent);
                                } else {
                                    startService(serviceIntent);
                                }
                            } catch (Exception e) {
                                e.printStackTrace();
                            }
                        }
                    });
                }

                @android.webkit.JavascriptInterface
                public void stopMediaService() {
                    isMusicActive = false;
                    runOnUiThread(new Runnable() {
                        @Override
                        public void run() {
                            Intent serviceIntent = new Intent(MainActivity.this, FlashgramMediaService.class);
                            serviceIntent.setAction(FlashgramMediaService.ACTION_STOP);
                            try {
                                startService(serviceIntent);
                            } catch (Exception e) {
                                e.printStackTrace();
                            }
                        }
                    });
                }
            }, "NativeMediaBridge");

            bridge.getWebView().addJavascriptInterface(new Object() {
                @android.webkit.JavascriptInterface
                public void startUploadService(final String title, final int progress, final String thumbnailUrl) {
                    runOnUiThread(new Runnable() {
                        @Override
                        public void run() {
                            Intent serviceIntent = new Intent(MainActivity.this, FlashgramUploadService.class);
                            serviceIntent.setAction(FlashgramUploadService.ACTION_START_OR_UPDATE);
                            serviceIntent.putExtra(FlashgramUploadService.EXTRA_TITLE, title);
                            serviceIntent.putExtra(FlashgramUploadService.EXTRA_PROGRESS, progress);
                            serviceIntent.putExtra(FlashgramUploadService.EXTRA_THUMBNAIL_URL, thumbnailUrl);
                            try {
                                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                                    startForegroundService(serviceIntent);
                                } else {
                                    startService(serviceIntent);
                                }
                            } catch (Exception e) {
                                e.printStackTrace();
                            }
                        }
                    });
                }

                @android.webkit.JavascriptInterface
                public void finishUploadService(final boolean isSuccess, final String message) {
                    runOnUiThread(new Runnable() {
                        @Override
                        public void run() {
                            Intent serviceIntent = new Intent(MainActivity.this, FlashgramUploadService.class);
                            serviceIntent.setAction(FlashgramUploadService.ACTION_FINISH);
                            serviceIntent.putExtra(FlashgramUploadService.EXTRA_SUCCESS, isSuccess);
                            serviceIntent.putExtra(FlashgramUploadService.EXTRA_MESSAGE, message);
                            try {
                                startService(serviceIntent);
                            } catch (Exception e) {
                                e.printStackTrace();
                            }
                        }
                    });
                }
            }, "NativeUploadBridge");
        }

        IntentFilter filter = new IntentFilter();
        filter.addAction(ACTION_PIP_PLAY_PAUSE);
        filter.addAction(ACTION_PIP_NEXT);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(pipReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            registerReceiver(pipReceiver, filter);
        }

        handleIncomingIntent(getIntent());
    }

    private void handleIncomingIntent(Intent intent) {
        if (intent == null) return;
        String action = intent.getAction();

        if (Intent.ACTION_SEND.equals(action) || Intent.ACTION_SEND_MULTIPLE.equals(action)) {
            String sharedText = intent.getStringExtra(Intent.EXTRA_TEXT);
            if (sharedText == null) {
                CharSequence cs = intent.getCharSequenceExtra(Intent.EXTRA_TEXT);
                if (cs != null) sharedText = cs.toString();
            }
            String sharedTitle = intent.getStringExtra(Intent.EXTRA_SUBJECT);
            if (sharedTitle == null) sharedTitle = "";

            final String fText = sharedText != null ? sharedText.replace("'", "\\'").replace("\n", " ") : "";
            final String fTitle = sharedTitle.replace("'", "\\'");

            if (bridge != null && bridge.getWebView() != null) {
                bridge.getWebView().post(new Runnable() {
                    @Override
                    public void run() {
                        bridge.getWebView().evaluateJavascript(
                            "(function() { " +
                            "  var payload = { text: '" + fText + "', url: '" + fText + "', title: '" + fTitle + "' }; " +
                            "  if (typeof window.handleIncomingSharePayload === 'function') { " +
                            "    window.handleIncomingSharePayload(payload); " +
                            "  } else { " +
                            "    window.__pendingSharePayload = payload; " +
                            "  } " +
                            "})();",
                            null
                        );
                    }
                });
            }
            return;
        }

        String route = intent.getStringExtra("route");
        if (route == null && intent.getData() != null) {
            route = intent.getData().toString();
        }
        if (route != null && !route.isEmpty() && bridge != null && bridge.getWebView() != null) {
            final String targetRoute = route;
            bridge.getWebView().post(new Runnable() {
                @Override
                public void run() {
                    bridge.getWebView().evaluateJavascript(
                        "(function() { " +
                        "  var r = '" + targetRoute + "'; " +
                        "  if (typeof window.handleDeepLink === 'function') { window.handleDeepLink(r); } " +
                        "  else if (typeof window.switchTab === 'function') { window.switchTab('reels'); } " +
                        "  else { setTimeout(function() { if (typeof window.handleDeepLink === 'function') window.handleDeepLink(r); }, 500); } " +
                        "})();",
                        null
                    );
                }
            });
        }
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        try {
            unregisterReceiver(pipReceiver);
        } catch (Exception ignored) {}
        if (instance == this) {
            instance = null;
        }
    }

    @Override
    public void onPause() {
        super.onPause();
        if (isMusicActive && bridge != null && bridge.getWebView() != null) {
            bridge.getWebView().resumeTimers();
        }
    }

    @Override
    public void onStop() {
        super.onStop();
        if (isMusicActive && bridge != null && bridge.getWebView() != null) {
            bridge.getWebView().resumeTimers();
        }
    }

    public static void dispatchMediaCommand(final String action) {
        if (instance == null || instance.bridge == null || instance.bridge.getWebView() == null) return;
        instance.bridge.getWebView().post(new Runnable() {
            @Override
            public void run() {
                String js = "";
                if (FlashgramMediaService.ACTION_PLAY.equals(action)) {
                    js = "window.youtubeMusicService && window.youtubeMusicService.play();";
                } else if (FlashgramMediaService.ACTION_PAUSE.equals(action)) {
                    js = "window.youtubeMusicService && window.youtubeMusicService.pause();";
                } else if (FlashgramMediaService.ACTION_NEXT.equals(action)) {
                    js = "window.youtubeMusicService && window.youtubeMusicService.nextTrack();";
                } else if (FlashgramMediaService.ACTION_PREV.equals(action)) {
                    js = "window.youtubeMusicService && window.youtubeMusicService.prevTrack();";
                } else if (FlashgramMediaService.ACTION_LIKE.equals(action)) {
                    js = "if (window.youtubeMusicService && window.youtubeMusicService.currentTrack) { " +
                         "  window.youtubeMusicService.toggleLike(window.youtubeMusicService.currentTrack.id); " +
                         "}";
                } else if (FlashgramMediaService.ACTION_STOP.equals(action)) {
                    js = "window.youtubeMusicService && window.youtubeMusicService.stopAndDismissPlayer();";
                }
                if (!js.isEmpty() && instance != null && instance.bridge != null && instance.bridge.getWebView() != null) {
                    instance.bridge.getWebView().evaluateJavascript(js, null);
                }
            }
        });
    }

    public static void dispatchMediaSeek(final long positionMs) {
        if (instance == null || instance.bridge == null || instance.bridge.getWebView() == null) return;
        instance.bridge.getWebView().post(new Runnable() {
            @Override
            public void run() {
                long seconds = positionMs / 1000L;
                String js = "window.youtubeMusicService && window.youtubeMusicService.seekTo(" + seconds + ");";
                if (instance != null && instance.bridge != null && instance.bridge.getWebView() != null) {
                    instance.bridge.getWebView().evaluateJavascript(js, null);
                }
            }
        });
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        boolean inReels = isReelsActive;
        if (!inReels && bridge != null && bridge.getWebView() != null) {
            String url = bridge.getWebView().getUrl();
            if (url != null && url.contains("/reels")) {
                inReels = true;
            }
        }

        // Intercept volume keys only when Reels feed is active
        if (inReels && (keyCode == KeyEvent.KEYCODE_VOLUME_UP || keyCode == KeyEvent.KEYCODE_VOLUME_DOWN)) {
            AudioManager audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
            if (audioManager != null) {
                int direction = (keyCode == KeyEvent.KEYCODE_VOLUME_UP) ? AudioManager.ADJUST_RAISE : AudioManager.ADJUST_LOWER;
                // Adjust volume SILENTLY without showing native Android side slider UI (0 flag)
                audioManager.adjustStreamVolume(AudioManager.STREAM_MUSIC, direction, 0);

                int currentVol = audioManager.getStreamVolume(AudioManager.STREAM_MUSIC);
                int maxVol = audioManager.getStreamMaxVolume(AudioManager.STREAM_MUSIC);
                int percent = Math.round(((float) currentVol / maxVol) * 100);

                // Dispatch event to WebView
                if (bridge != null && bridge.getWebView() != null) {
                    bridge.getWebView().evaluateJavascript(
                        "window.dispatchEvent(new CustomEvent('reelsVolumeChange', { detail: { volume: " + percent + " } }));",
                        null
                    );
                }
                return true; // Consume event to suppress native system UI
            }
        }
        return super.onKeyDown(keyCode, event);
    }

    private void createUploadNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                NotificationChannel channel1 = new NotificationChannel(
                    "upload_channel",
                    "Upload Progress",
                    NotificationManager.IMPORTANCE_LOW
                );
                channel1.setDescription("Silent background upload progress");
                channel1.enableVibration(false);
                channel1.setSound(null, null);
                manager.createNotificationChannel(channel1);

                NotificationChannel channel2 = new NotificationChannel(
                    "flashgram_upload_channel",
                    "Upload Progress",
                    NotificationManager.IMPORTANCE_LOW
                );
                channel2.setDescription("Silent background upload progress");
                channel2.enableVibration(false);
                channel2.setSound(null, null);
                manager.createNotificationChannel(channel2);
            }
        }
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            applySystemUiSettings();
        }
    }

    @Override
    public void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleIncomingIntent(intent);
    }

    @Override
    protected void onUserLeaveHint() {
        super.onUserLeaveHint();
        // Only enter PiP if user is on Reels and video is playing
        if (isReelsActiveAndPlaying && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            enterAppPictureInPicture();
        }
    }

    public void enterAppPictureInPicture() {
        if (!isReelsActiveAndPlaying) {
            return;
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            try {
                // 9:16 vertical ratio for Reels
                Rational aspectRatio = new Rational(9, 16);
                PictureInPictureParams.Builder builder = new PictureInPictureParams.Builder();
                builder.setAspectRatio(aspectRatio);

                // Add RemoteActions for Play/Pause and Next Reel
                List<RemoteAction> actions = new ArrayList<>();

                int flags = PendingIntent.FLAG_UPDATE_CURRENT;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    flags |= PendingIntent.FLAG_IMMUTABLE;
                }

                // Play/Pause Remote Action
                Intent playPauseIntent = new Intent(ACTION_PIP_PLAY_PAUSE).setPackage(getPackageName());
                PendingIntent playPausePending = PendingIntent.getBroadcast(this, 201, playPauseIntent, flags);
                Icon playPauseIcon = Icon.createWithResource(this, R.drawable.ic_pip_play_pause);
                RemoteAction playPauseAction = new RemoteAction(playPauseIcon, "Play/Pause", "Toggle Playback", playPausePending);
                actions.add(playPauseAction);

                // Next Reel Remote Action
                Intent nextIntent = new Intent(ACTION_PIP_NEXT).setPackage(getPackageName());
                PendingIntent nextPending = PendingIntent.getBroadcast(this, 202, nextIntent, flags);
                Icon nextIcon = Icon.createWithResource(this, R.drawable.ic_pip_next);
                RemoteAction nextAction = new RemoteAction(nextIcon, "Next Reel", "Next Reel", nextPending);
                actions.add(nextAction);

                builder.setActions(actions);

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    builder.setAutoEnterEnabled(isReelsActiveAndPlaying);
                }
                enterPictureInPictureMode(builder.build());
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
    }

    @Override
    public void onPictureInPictureModeChanged(boolean isInPictureInPictureMode, Configuration newConfig) {
        super.onPictureInPictureModeChanged(isInPictureInPictureMode, newConfig);
        // Send event to WebView to hide unnecessary controls when in floating mini-player
        if (getBridge() != null) {
            getBridge().triggerWindowJSEvent("pipModeChange", "{\"isInPiP\":" + isInPictureInPictureMode + ",\"isPiP\":" + isInPictureInPictureMode + "}");
        }
        if (bridge != null && bridge.getWebView() != null) {
            bridge.getWebView().evaluateJavascript(
                "window.dispatchEvent(new CustomEvent('pipModeChange', { detail: { isInPiP: " + isInPictureInPictureMode + ", isPiP: " + isInPictureInPictureMode + " } }));",
                null
            );
        }
        if (!isInPictureInPictureMode) {
            applySystemUiSettings();
        }
    }

    public void updateNativeStatusBar(final boolean isReels, final boolean isDark) {
        try {
            Window window = getWindow();
            if (window == null) return;

            WindowInsetsControllerCompat insetsController =
                WindowCompat.getInsetsController(window, window.getDecorView());

            if (isReels) {
                // Video behind status bar - transparent overlay with white text/icons
                WindowCompat.setDecorFitsSystemWindows(window, false);
                window.setStatusBarColor(Color.TRANSPARENT);
                if (insetsController != null) {
                    insetsController.setAppearanceLightStatusBars(false); // White icons
                }
            } else {
                WindowCompat.setDecorFitsSystemWindows(window, false);
                if (isDark) {
                    window.setStatusBarColor(Color.BLACK);
                    if (insetsController != null) {
                        insetsController.setAppearanceLightStatusBars(false); // White icons for dark mode
                    }
                } else {
                    window.setStatusBarColor(Color.WHITE);
                    if (insetsController != null) {
                        insetsController.setAppearanceLightStatusBars(true); // Dark icons for light mode
                    }
                }
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                WindowInsetsController controller = window.getInsetsController();
                if (controller != null) {
                    controller.show(WindowInsets.Type.statusBars());
                    controller.hide(WindowInsets.Type.navigationBars());
                    controller.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
                }
            } else {
                int flags = View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                          | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                          | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                          | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION;
                window.getDecorView().setSystemUiVisibility(flags);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void applySystemUiSettings() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            getWindow().getAttributes().layoutInDisplayCutoutMode =
                WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
        }

        updateNativeStatusBar(isReelsActive, isDarkModeActive);
    }

    public void setLauncherAppIcon(String iconKey) {
        try {
            Context context = getApplicationContext();
            PackageManager pm = context.getPackageManager();
            String packageName = context.getPackageName();

            String[] allAliases = new String[]{
                packageName + ".MainActivityDefault",
                packageName + ".MainActivityRetro",
                packageName + ".MainActivitySketch",
                packageName + ".MainActivityNeon",
                packageName + ".MainActivityDark",
                packageName + ".MainActivityGold"
            };

            String targetAlias;
            if (iconKey == null) iconKey = "default";
            switch (iconKey.toLowerCase().trim()) {
                case "sunset":
                case "retro":
                    targetAlias = packageName + ".MainActivityRetro";
                    break;
                case "sticker":
                case "sticker_pop":
                case "sketch":
                    targetAlias = packageName + ".MainActivitySketch";
                    break;
                case "cyber_neon":
                case "neon":
                case "ultragram":
                    targetAlias = packageName + ".MainActivityNeon";
                    break;
                case "dark_matrix":
                case "dark":
                case "midnight":
                    targetAlias = packageName + ".MainActivityDark";
                    break;
                case "golden_vip":
                case "gold":
                case "golden":
                    targetAlias = packageName + ".MainActivityGold";
                    break;
                case "custom":
                case "original":
                case "default":
                default:
                    targetAlias = packageName + ".MainActivityDefault";
                    break;
            }

            // Disable base MainActivity as launcher if it was active
            try {
                ComponentName mainComp = new ComponentName(packageName, packageName + ".MainActivity");
                int mainState = pm.getComponentEnabledSetting(mainComp);
                if (mainState != PackageManager.COMPONENT_ENABLED_STATE_DISABLED) {
                    pm.setComponentEnabledSetting(mainComp, PackageManager.COMPONENT_ENABLED_STATE_DISABLED, PackageManager.DONT_KILL_APP);
                }
            } catch (Exception ignored) {}

            for (String alias : allAliases) {
                ComponentName comp = new ComponentName(packageName, alias);
                int desiredState = alias.equals(targetAlias)
                    ? PackageManager.COMPONENT_ENABLED_STATE_ENABLED
                    : PackageManager.COMPONENT_ENABLED_STATE_DISABLED;

                try {
                    pm.setComponentEnabledSetting(comp, desiredState, PackageManager.DONT_KILL_APP);
                } catch (Exception ex) {
                    ex.printStackTrace();
                }
            }

            // Save in SharedPreferences
            getSharedPreferences("flashgram_prefs", Context.MODE_PRIVATE)
                .edit()
                .putString("active_app_icon", iconKey.toLowerCase().trim())
                .apply();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
