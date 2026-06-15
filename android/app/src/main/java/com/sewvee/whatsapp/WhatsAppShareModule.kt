package com.sewvee.whatsapp

import android.content.ClipData
import android.content.Intent
import android.net.Uri
import android.webkit.MimeTypeMap
import androidx.core.content.FileProvider
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File
import java.util.Locale

class WhatsAppShareModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "WhatsAppShareModule"

  @ReactMethod
  fun shareDocumentToNumber(
    filePath: String,
    phoneNumber: String,
    message: String?,
    promise: Promise,
  ) {
    try {
      val normalizedNumber = phoneNumber.filter { it.isDigit() }
      if (normalizedNumber.isBlank()) {
        throw IllegalArgumentException("WhatsApp number is missing")
      }

      val resolvedPath =
        when {
          filePath.startsWith("file://", ignoreCase = true) -> Uri.parse(filePath).path
          else -> filePath
        } ?: throw IllegalArgumentException("File path is invalid")

      val file = File(resolvedPath)
      if (!file.exists()) {
        throw IllegalStateException("Shared file not found")
      }

      val activity = getCurrentActivity()
      val context = activity ?: reactContext
      val authority = "${reactContext.packageName}.fileprovider"
      val contentUri = FileProvider.getUriForFile(context, authority, file)
      val mimeType = resolveMimeType(file)

      val intentBase = Intent(Intent.ACTION_SEND).apply {
        type = mimeType
        putExtra(Intent.EXTRA_STREAM, contentUri)
        putExtra("jid", "$normalizedNumber@s.whatsapp.net")
        if (!message.isNullOrBlank()) {
          putExtra(Intent.EXTRA_TEXT, message)
        }
        clipData = ClipData.newUri(context.contentResolver, file.name, contentUri)
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
      }

      val pm = reactContext.packageManager
      val targetIntents = mutableListOf<Intent>()

      arrayOf("com.whatsapp", "com.whatsapp.w4b").forEach { pkg ->
        val targetedIntent = Intent(intentBase).apply { `package` = pkg }
        if (targetedIntent.resolveActivity(pm) != null) {
          targetIntents.add(targetedIntent)
          reactContext.grantUriPermission(pkg, contentUri, Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
      }

      if (targetIntents.isEmpty()) {
        throw IllegalStateException("WhatsApp is not installed")
      }

      val chooserIntent = Intent.createChooser(targetIntents.removeAt(0), "Share via WhatsApp").apply {
        if (targetIntents.isNotEmpty()) {
          putExtra(Intent.EXTRA_INITIAL_INTENTS, targetIntents.toTypedArray())
        }
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }

      context.startActivity(chooserIntent)

      val response = Arguments.createMap().apply {
        putBoolean("success", true)
        putString("filePath", file.absolutePath)
        putString("phoneNumber", normalizedNumber)
      }
      promise.resolve(response)
    } catch (error: Exception) {
      promise.reject("WHATSAPP_SHARE_FAILED", error.message, error)
    }
  }

  @ReactMethod
  fun shareDocument(
    filePath: String,
    message: String?,
    promise: Promise,
  ) {
    try {
      val resolvedPath =
        when {
          filePath.startsWith("file://", ignoreCase = true) -> Uri.parse(filePath).path
          else -> filePath
        } ?: throw IllegalArgumentException("File path is invalid")

      val file = File(resolvedPath)
      if (!file.exists()) {
        throw IllegalStateException("Shared file not found")
      }

      val activity = getCurrentActivity()
      val context = activity ?: reactContext
      val authority = "${reactContext.packageName}.fileprovider"
      val contentUri = FileProvider.getUriForFile(context, authority, file)
      val mimeType = resolveMimeType(file)

      val intentBase = Intent(Intent.ACTION_SEND).apply {
        type = mimeType
        putExtra(Intent.EXTRA_STREAM, contentUri)
        if (!message.isNullOrBlank()) {
          putExtra(Intent.EXTRA_TEXT, message)
        }
        clipData = ClipData.newUri(context.contentResolver, file.name, contentUri)
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
      }

      val pm = reactContext.packageManager
      val targetIntents = mutableListOf<Intent>()

      arrayOf("com.whatsapp", "com.whatsapp.w4b").forEach { pkg ->
        val targetedIntent = Intent(intentBase).apply { `package` = pkg }
        if (targetedIntent.resolveActivity(pm) != null) {
          targetIntents.add(targetedIntent)
          reactContext.grantUriPermission(pkg, contentUri, Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
      }

      if (targetIntents.isEmpty()) {
        throw IllegalStateException("WhatsApp is not installed")
      }

      val chooserIntent = Intent.createChooser(targetIntents.removeAt(0), "Share via WhatsApp").apply {
        if (targetIntents.isNotEmpty()) {
          putExtra(Intent.EXTRA_INITIAL_INTENTS, targetIntents.toTypedArray())
        }
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }

      context.startActivity(chooserIntent)

      val response = Arguments.createMap().apply {
        putBoolean("success", true)
        putString("filePath", file.absolutePath)
      }
      promise.resolve(response)
    } catch (error: Exception) {
      promise.reject("WHATSAPP_SHARE_FAILED", error.message, error)
    }
  }

  private fun resolveMimeType(file: File): String {
    val extension = file.extension.lowercase(Locale.getDefault())
    return MimeTypeMap.getSingleton().getMimeTypeFromExtension(extension)
      ?: "application/octet-stream"
  }
}
