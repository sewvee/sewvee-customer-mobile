package com.sewvee.download

import android.app.DownloadManager
import android.content.Context
import android.os.Environment
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class FileDownloadModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "FileDownloadModule"

  @ReactMethod
  fun downloadToDownloads(
    url: String,
    fileName: String,
    authToken: String?,
    mimeType: String?,
    title: String?,
    description: String?,
    promise: Promise,
  ) {
    try {
      val context = reactApplicationContext
      val downloadManager =
        context.getSystemService(Context.DOWNLOAD_SERVICE) as? DownloadManager
          ?: throw IllegalStateException("Download manager unavailable")

      val request = DownloadManager.Request(android.net.Uri.parse(url)).apply {
        setTitle(title?.takeIf { it.isNotBlank() } ?: fileName)
        setDescription(description?.takeIf { it.isNotBlank() } ?: "Downloading file")
        setMimeType(mimeType?.takeIf { it.isNotBlank() } ?: "application/octet-stream")
        setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
        setAllowedOverMetered(true)
        setAllowedOverRoaming(true)
        addRequestHeader("Accept", "*/*")

        if (!authToken.isNullOrBlank()) {
          addRequestHeader("Authorization", authToken)
        }

        setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, fileName)
      }

      val downloadId = downloadManager.enqueue(request)
      val response = Arguments.createMap().apply {
        putDouble("downloadId", downloadId.toDouble())
        putString("fileName", fileName)
        putString("directory", Environment.DIRECTORY_DOWNLOADS)
      }

      promise.resolve(response)
    } catch (error: Exception) {
      promise.reject("DOWNLOAD_FAILED", error.message, error)
    }
  }
}
