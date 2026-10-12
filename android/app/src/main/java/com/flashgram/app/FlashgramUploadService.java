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
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import androidx.core.app.NotificationCompat;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Flashgram Native Foreground Upload Service (FOREGROUND_SERVICE_DATA_SYNC)
 * Keeps video upload active in the background when app is minimized or screen is locked.
 * Manages WakeLock and smooth non-flickering progress notification (id: 9999).
 */
public class FlashgramUploadService extends Service {

    public static final String ACTION_START_OR_UPDATE = "com.flashgram.app.ACTION_UPLOAD_PROGRESS";
    public static final String ACTION_FINISH = "com.flashgram.app.ACTION_UPLOAD_FINISH";

    public static final String EXTRA_TITLE = "extra_title";
    public static final String EXTRA_PROGRESS = "extra_progress";
    public static final String EXTRA_THUMBNAIL_URL = "extra_thumbnail_url";
    public static final String EXTRA_SUCCESS = "extra_success";
    public static final String EXTRA_MESSAGE = "extra_message";

    public static final String CHANNEL_ID = "upload_channel";
    public static final int NOTIFICATION_ID = 9999;
    public static final int COMPLETION_NOTIFICATION_ID = 10000;

    private PowerManager.WakeLock wakeLock;
    private final ExecutorService imageExecutor = Executors.newSingleThreadExecutor();
    private Bitmap currentThumbnail = null;
    private String lastThumbUrl = null;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        acquireWakeLock();
    }

    private void acquireWakeLock() {
        if (wakeLock == null) {
            PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
            if (pm != null) {
                wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "Flashgram:UploadWakeLock");
                wakeLock.setReferenceCounted(false);
                wakeLock.acquire(15 * 60 * 1000L); // 15 minutes safety timeout
            }
        }
    }

    private void releaseWakeLock() {
        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
            wakeLock = null;
        }
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
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
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) return START_NOT_STICKY;

        String action = intent.getAction();
        if (ACTION_START_OR_UPDATE.equals(action)) {
            String title = intent.getStringExtra(EXTRA_TITLE);
            if (title == null || title.isEmpty()) title = "Posting to Flashgram...";
            int progress = intent.getIntExtra(EXTRA_PROGRESS, 0);
            String thumbUrl = intent.getStringExtra(EXTRA_THUMBNAIL_URL);

            handleProgressUpdate(title, progress, thumbUrl);
        } else if (ACTION_FINISH.equals(action)) {
            boolean isSuccess = intent.getBooleanExtra(EXTRA_SUCCESS, true);
            String message = intent.getStringExtra(EXTRA_MESSAGE);
            handleFinish(isSuccess, message);
        }

        return START_NOT_STICKY;
    }

    private void handleProgressUpdate(String title, int progress, String thumbUrl) {
        if (thumbUrl != null && !thumbUrl.isEmpty() && !thumbUrl.equals(lastThumbUrl)) {
            lastThumbUrl = thumbUrl;
            imageExecutor.execute(() -> {
                Bitmap bmp = downloadBitmap(thumbUrl);
                if (bmp != null) {
                    currentThumbnail = bmp;
                }
                buildAndPostNotification(title, progress);
            });
        } else {
            buildAndPostNotification(title, progress);
        }
    }

    private void buildAndPostNotification(String title, int progress) {
        Intent openAppIntent = new Intent(this, MainActivity.class);
        openAppIntent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this,
            0,
            openAppIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
        );

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_flashgram)
            .setContentTitle(title)
            .setContentText(progress + "% uploaded")
            .setColor(0xFFE1306C)
            .setContentIntent(pendingIntent)
            .setOngoing(progress < 100)
            .setAutoCancel(false)
            .setOnlyAlertOnce(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setProgress(100, progress, false);

        if (currentThumbnail != null) {
            builder.setLargeIcon(currentThumbnail);
        }

        Notification notification = builder.build();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }
    }

    private void handleFinish(boolean isSuccess, String message) {
        releaseWakeLock();

        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager != null) {
            manager.cancel(NOTIFICATION_ID);

            if (isSuccess) {
                Intent openAppIntent = new Intent(this, MainActivity.class);
                openAppIntent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
                PendingIntent pendingIntent = PendingIntent.getActivity(
                    this,
                    0,
                    openAppIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
                );

                NotificationCompat.Builder completeBuilder = new NotificationCompat.Builder(this, CHANNEL_ID)
                    .setSmallIcon(R.drawable.ic_stat_flashgram)
                    .setContentTitle("Posted!")
                    .setContentText(message != null && !message.isEmpty() ? message : "Your video has been shared to Flashgram.")
                    .setColor(0xFFE1306C)
                    .setContentIntent(pendingIntent)
                    .setAutoCancel(true)
                    .setOngoing(false);

                if (currentThumbnail != null) {
                    completeBuilder.setLargeIcon(currentThumbnail);
                }

                manager.notify(COMPLETION_NOTIFICATION_ID, completeBuilder.build());
            }
        }

        stopForeground(true);
        stopSelf();
    }

    private Bitmap downloadBitmap(String urlStr) {
        try {
            URL url = new URL(urlStr);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setDoInput(true);
            conn.setConnectTimeout(4000);
            conn.setReadTimeout(4000);
            conn.connect();
            InputStream input = conn.getInputStream();
            return BitmapFactory.decodeStream(input);
        } catch (Exception e) {
            return null;
        }
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        releaseWakeLock();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
