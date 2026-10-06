package com.flashgram.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.widget.RemoteViews;

public class FlashgramWidgetProvider extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    private static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_flashgram_quick_actions);

        // 1. Reels Action -> flashgram://reels
        views.setOnClickPendingIntent(
            R.id.widget_btn_reels,
            createDeepLinkPendingIntent(context, "flashgram://reels", "/reels", 101)
        );

        // 2. Create Reel (+) Action -> flashgram://upload
        views.setOnClickPendingIntent(
            R.id.widget_btn_create,
            createDeepLinkPendingIntent(context, "flashgram://upload", "/upload", 102)
        );

        // 3. Search Action -> flashgram://explore
        views.setOnClickPendingIntent(
            R.id.widget_btn_search,
            createDeepLinkPendingIntent(context, "flashgram://explore", "/explore", 103)
        );

        // 4. Profile Action -> flashgram://profile
        views.setOnClickPendingIntent(
            R.id.widget_btn_profile,
            createDeepLinkPendingIntent(context, "flashgram://profile", "/profile", 104)
        );

        // 5. Header Brand Action -> flashgram://home
        views.setOnClickPendingIntent(
            R.id.widget_header,
            createDeepLinkPendingIntent(context, "flashgram://home", "/home", 100)
        );

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    private static PendingIntent createDeepLinkPendingIntent(Context context, String uriString, String route, int requestCode) {
        Intent intent = new Intent(context, MainActivity.class);
        intent.setAction(Intent.ACTION_VIEW);
        intent.setData(Uri.parse(uriString));
        intent.putExtra("route", route);
        intent.putExtra("source", "widget");
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);

        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }

        return PendingIntent.getActivity(context, requestCode, intent, flags);
    }
}
