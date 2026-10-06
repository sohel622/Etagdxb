package com.flashgram.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.widget.RemoteViews;

public class FlashgramTrendingWidget extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    public static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_trending);

        // Header click -> Home Feed / Stories
        views.setOnClickPendingIntent(
            R.id.widget_trending_header,
            createDeepLinkPendingIntent(context, "flashgram://home", "/home", 300)
        );

        // Story 1: Shabnam AI
        views.setOnClickPendingIntent(
            R.id.widget_story_item_1,
            createDeepLinkPendingIntent(context, "flashgram://story?user=shabnam_ai", "/story/shabnam_ai", 301)
        );

        // Story 2: sohelmommy
        views.setOnClickPendingIntent(
            R.id.widget_story_item_2,
            createDeepLinkPendingIntent(context, "flashgram://story?user=sohelmommy", "/story/sohelmommy", 302)
        );

        // Story 3: creative_hub
        views.setOnClickPendingIntent(
            R.id.widget_story_item_3,
            createDeepLinkPendingIntent(context, "flashgram://story?user=creative_hub", "/story/creative_hub", 303)
        );

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    public static PendingIntent createDeepLinkPendingIntent(Context context, String uriString, String route, int requestCode) {
        Intent intent = new Intent(context, MainActivity.class);
        intent.setAction(Intent.ACTION_VIEW);
        intent.setData(Uri.parse(uriString));
        intent.putExtra("route", route);
        intent.putExtra("source", "widget_trending");
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);

        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }

        return PendingIntent.getActivity(context, requestCode, intent, flags);
    }
}
