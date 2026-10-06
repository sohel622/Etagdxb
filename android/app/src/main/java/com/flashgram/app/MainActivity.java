package com.flashgram.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PictureInPictureParams;
import android.content.res.Configuration;
import android.os.Build;
import android.os.Bundle;
import android.util.Rational;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        applySystemUiSettings();
        createUploadNotificationChannel();
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
    protected void onNewIntent(android.content.Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
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
