package com.flashgram.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.widget.RemoteViews;

public class FlashgramReelsPlayerWidget extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    public static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_reels_player);

        // Initial State: Paused by default to conserve battery and data
        views.setTextViewText(R.id.widget_reels_status_label, "Tap to Watch");
        views.setImageViewResource(R.id.widget_reels_play_toggle, R.drawable.ic_pip_play_pause);

        // 1. Whole Card Tap -> Open full-screen Reel Player
        views.setOnClickPendingIntent(
            R.id.widget_reels_card_root,
            createDeepLinkPendingIntent(context, "flashgram://reels?action=watch", "/reels", 201)
        );

        // 2. Center Play/Pause Toggle -> Direct Full-Screen Watch & AutoPlay
        views.setOnClickPendingIntent(
            R.id.widget_reels_play_toggle,
            createDeepLinkPendingIntent(context, "flashgram://reels?action=play", "/reels", 202)
        );

        // 3. Bottom Info Tap -> Open full-screen Reel Player
        views.setOnClickPendingIntent(
            R.id.widget_reels_bottom_info,
            createDeepLinkPendingIntent(context, "flashgram://reels?action=details", "/reels", 203)
        );

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    public static PendingIntent createDeepLinkPendingIntent(Context context, String uriString, String route, int requestCode) {
        Intent intent = new Intent(context, MainActivity.class);
        intent.setAction(Intent.ACTION_VIEW);
        intent.setData(Uri.parse(uriString));
        intent.putExtra("route", route);
        intent.putExtra("source", "widget_reels_player");
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);

        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }

        return PendingIntent.getActivity(context, requestCode, intent, flags);
    }
}
