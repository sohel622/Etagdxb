package com.flashgram.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.PictureInPictureParams;
import android.app.RemoteAction;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.res.Configuration;
import android.graphics.drawable.Icon;
import android.media.AudioManager;
import android.os.Build;
import android.os.Bundle;
import android.util.Rational;
import android.view.KeyEvent;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import com.getcapacitor.BridgeActivity;
import java.util.ArrayList;
import java.util.List;

public class MainActivity extends BridgeActivity {

    public static volatile boolean isReelsActive = false;

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
        applySystemUiSettings();
        createUploadNotificationChannel();

        if (bridge != null && bridge.getWebView() != null) {
            bridge.getWebView().addJavascriptInterface(new Object() {
                @android.webkit.JavascriptInterface
                public void setReelsActive(boolean active) {
                    isReelsActive = active;
                }
            }, "NativeReelsBridge");
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
            NotificationChannel channel = new NotificationChannel(
                "flashgram_upload_channel",
                "Upload Progress",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Silent background upload progress");
            channel.enableVibration(false);
            channel.setSound(null, null);
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
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
        enterAppPictureInPicture();
    }

    public void enterAppPictureInPicture() {
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
                    builder.setAutoEnterEnabled(true);
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
        // Notify WebView about PiP mode change
        if (bridge != null && bridge.getWebView() != null) {
            bridge.getWebView().evaluateJavascript(
                "window.dispatchEvent(new CustomEvent('pipModeChange', { detail: { isPiP: " + isInPictureInPictureMode + " } }));",
                null
            );
        }
        if (!isInPictureInPictureMode) {
            applySystemUiSettings();
        }
    }

    private void applySystemUiSettings() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            WindowInsetsController insetsController = getWindow().getInsetsController();
            if (insetsController != null) {
                // Keep the top status bar visible (clock, battery, signal)
                insetsController.show(WindowInsets.Type.statusBars());
                // Keep the bottom navigation bar hidden (back, home, recent apps)
                insetsController.hide(WindowInsets.Type.navigationBars());
                insetsController.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            }
        }

        // Backward compatibility flags:
        // Hide navigation bar with immersive sticky mode while keeping status bar visible
        int flags = View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                  | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                  | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                  | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION;
        getWindow().getDecorView().setSystemUiVisibility(flags);
    }
}
