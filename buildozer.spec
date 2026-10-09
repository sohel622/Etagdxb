[app]
title = Smart Calculator
package.name = smartcalc
package.domain = org.app
source.dir = .
source.include_exts = py,png,jpg,kv,atlas
version = 0.1
requirements = python3,kivy

orientation = portrait

# মাল্টিটাস্কিং ও স্মল উইন্ডো সক্রিয় করার সেটিংস
android.api = 33
android.minapi = 21
android.ndk = 25b
android.archs = arm64-v8a, armeabi-v7a
android.allow_backup = True
android.manifest.resizeableActivity = true

[buildozer]
log_level = 2
warn_on_root = 1

