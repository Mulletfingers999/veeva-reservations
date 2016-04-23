# BookMe Now
Repository for the BookMe Now app. Available on Android and Coming Soon to iOS!

# First time set-up
The setup shouldn't be too hard, there's just a few things here and there to do. If you haven't already, download and install [Apache's Cordova CLI](http://cordova.apache.org/docs/en/5.0.0//guide_cli_index.md.html#The%20Command-Line%20Interface) (Veeva-Reservations is built with 5.1.1, but 5.x should work fine) and follow the instructions in the linked site, clone the repo, and follow the instructions for your OS.

**NOTE: If you are building the app on a real device (particularly android) and you run into an [UPDATE_FAILED_INSTALL_INCOMPATABLE] error, this is likely due to an older version of android's binaries on your machine. Run `cordova platforms rm android` and then `cordova platforms add android`, and uninstall the older version of the app on your machine.**

## Android
After you've cloned the repo, open up a terminal in the repo's directory and run `cordova platforms rm android`, and then `cordova platforms add android`. This will ensure Android's binaries are created and it has been correctly set-up for your OS. If you are going to use an emulator, make sure to download the required SDKs for that, otherwise hook your phone up to the computer via a USB adapter. When you are ready to build your code, run `cordova run android`.

## iOS
Note that at the time of writing, I have not been able to test my app on iOS, however any developer is welcome to attempt to do so. First run `cordova platforms add ios`, and in theory running `cordova run ios` (after downloading Apple's SDKs or hooking your device to your Mac) should deploy the app to your device/start the emulator (add "--device" to deploy to a USB-attached iOS device).

## Plug-ins
This app requires the following plug-ins:
* cordova-plugin-barcodescanner
* cordova-plugin-console
* cordova-plugin-device
* cordova-plugin-dialogs
* cordova-plugin-inappbrowser
* cordova-plugin-statusbar
* cordova-plugin-whitelist