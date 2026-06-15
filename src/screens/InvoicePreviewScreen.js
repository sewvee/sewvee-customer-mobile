import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ArrowLeft, Download, Printer, PenTool, UserRound } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import RNPrint from 'react-native-print';
import RNFS from 'react-native-fs';
import { Colors, Shadow } from '../constants/theme';
import {
  getCustomerCopyHTML,
  getTailorCopyPreviewHTML,
  normalizeItems,
  printHTML,
  saveTailorCopyPDF,
  saveCustomerCopyPDF,
  convertLogoToBase64,
} from '../services/pdfService';
import { useToast } from '../context/ToastContext';
import { useDispatch } from 'react-redux';
import { downloadOrderCopyAction, getOrderByIdAction } from '../store/salesOrderSlice';
import InvoiceDocumentHeader from '../components/invoice/InvoiceDocumentHeader';
import InvoiceItemsTable from '../components/invoice/InvoiceItemsTable';
import InvoiceMetaStrip from '../components/invoice/InvoiceMetaStrip';
import InvoiceSummaryPanel from '../components/invoice/InvoiceSummaryPanel';
import TailorCopyItemCard from '../components/invoice/TailorCopyItemCard';
import {
  formatInvoiceText,
  getCustomerInvoiceTotals,
  getInvoiceCopyLabel,
  getInvoiceDocumentTitle,
  getInvoiceMetaRows,
  getTailorWorkSummary,
} from '../components/invoice/utils';
import { requestDeviceDownloadPermission } from '../utils/deviceDownload';

const isCancelledStatus = (value) => (
  String(value || '').trim().toLowerCase() === 'cancelled'
);

const buildInvoicePreviewOrder = (inputOrder) => {
  if (!inputOrder) {
    return null;
  }

  const normalizedItems = normalizeItems(inputOrder, false);
  const subtotal = normalizedItems.reduce(
    (sum, item) => sum + (Number(item?.amount ?? item?.totalCost) || 0),
    0,
  );
  const activePayments = (Array.isArray(inputOrder?.payments) ? inputOrder.payments : []).filter(
    payment => !isCancelledStatus(payment?.status || payment?.payment_status),
  );
  const advance = activePayments.length > 0
    ? activePayments.reduce(
        (sum, payment) => sum + (Number(payment?.amount) || 0),
        0,
      )
    : Number(inputOrder?.advance ?? 0);
  const balance = Math.max(0, subtotal - advance);

  return {
    ...inputOrder,
    total: subtotal,
    subtotal,
    finalAmount: subtotal,
    balance,
    advance,
    items: inputOrder?.orderCategory === 'Sales' ? normalizedItems : (inputOrder?.items || []),
    outfits: inputOrder?.orderCategory === 'Sales' ? (inputOrder?.outfits || []) : normalizedItems,
  };
};

const buildRemotePdfPreviewHtml = (pdfBase64) => `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=4, user-scalable=yes"
    />
    <meta name="color-scheme" content="light only" />
    <style>
      html, body {
        width: 100%;
        height: 100%;
        margin: 0;
        padding: 0;
        background: #f1f5f9;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        overflow: hidden;
      }
      body {
        min-height: 100%;
      }
      #status {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #475569;
        font-size: 16px;
        padding: 24px;
        text-align: center;
      }
      #viewer {
        display: none;
        width: 100%;
        height: 100vh;
        box-sizing: border-box;
        overflow-y: auto;
        overflow-x: hidden;
        scroll-snap-type: y mandatory;
        scroll-behavior: smooth;
        -webkit-overflow-scrolling: touch;
        overscroll-behavior-y: contain;
      }
      .page-frame {
        width: 100%;
        height: 100vh;
        padding: 0 0 4px;
        box-sizing: border-box;
        display: flex;
        align-items: center;
        justify-content: flex-start;
        scroll-snap-align: start;
        scroll-snap-stop: always;
      }
      .page-shell {
        width: fit-content;
        max-width: 100%;
        margin: 0;
        background: #ffffff;
        border-radius: 12px;
        box-shadow: 0 16px 30px rgba(15, 23, 42, 0.08);
        overflow: hidden;
      }
      canvas {
        display: block;
        background: #ffffff;
      }
      .error {
        color: #b91c1c;
      }
    </style>
  </head>
  <body>
    <div id="status">Loading invoice preview...</div>
    <div id="viewer"></div>

    <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
    <script>
      const statusEl = document.getElementById('status');
      const viewerEl = document.getElementById('viewer');
      const pdfBase64 = '${pdfBase64}';

      function base64ToUint8Array(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i += 1) {
          bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
      }

      async function renderPdf() {
        try {
          pdfjsLib.GlobalWorkerOptions.workerSrc =
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

          const pdf = await pdfjsLib.getDocument({
            data: base64ToUint8Array(pdfBase64),
          }).promise;

          viewerEl.innerHTML = '';
          viewerEl.style.display = 'block';
          statusEl.style.display = 'none';

          const availableWidth = Math.max(280, window.innerWidth - 4);
          const availableHeight = Math.max(280, window.innerHeight - 4);
          const pixelRatio = window.devicePixelRatio || 1;

          for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
            const page = await pdf.getPage(pageNumber);
            const initialViewport = page.getViewport({ scale: 1 });
            const widthScale = availableWidth / initialViewport.width;
            const heightScale = availableHeight / initialViewport.height;
            const scale = Math.min(widthScale, heightScale) * 1.02;
            const displayViewport = page.getViewport({ scale });
            const renderViewport = page.getViewport({ scale: scale * pixelRatio });

            const frame = document.createElement('div');
            frame.className = 'page-frame';

            const shell = document.createElement('div');
            shell.className = 'page-shell';

            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d', { alpha: false });
            canvas.width = renderViewport.width;
            canvas.height = renderViewport.height;
            canvas.style.width = displayViewport.width + 'px';
            canvas.style.height = displayViewport.height + 'px';

            shell.appendChild(canvas);
            frame.appendChild(shell);
            viewerEl.appendChild(frame);

            await page.render({
              canvasContext: context,
              viewport: renderViewport,
            }).promise;
          }
        } catch (error) {
          statusEl.className = 'error';
          statusEl.textContent = 'Could not render invoice preview clearly.';
        }
      }

      renderPdf();
    </script>
  </body>
</html>
`;

export default function InvoicePreviewScreen({
  navigation,
  route,
}) {
  const dispatch = useDispatch();
  const downloadOrderCopyThunk = downloadOrderCopyAction;
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();
  const [latestOrder, setLatestOrder] = useState(route.params?.order || null);
  const [loadingOrder, setLoadingOrder] = useState(Boolean(route.params?.orderId || route.params?.order?.id));
  const company = route.params?.company || {};
  const allowedCopyTypes = (
    Array.isArray(route.params?.allowedCopyTypes) && route.params?.allowedCopyTypes.length
      ? route.params?.allowedCopyTypes
      : ['customer', 'tailor']
  ).filter((copy, index, list) => list.indexOf(copy) === index);
  const initialCopyType = allowedCopyTypes.includes(route.params?.initialCopyType || 'customer')
    ? (route.params?.initialCopyType || 'customer')
    : allowedCopyTypes[0];
  const [copyType, setCopyType] = useState(
    initialCopyType === 'tailor' ? 'tailor' : 'customer',
  );
  const [downloading, setDownloading] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [remotePreviewHtml, setRemotePreviewHtml] = useState('');
  const [remotePreviewLoading, setRemotePreviewLoading] = useState(false);
  const [remotePreviewFailed, setRemotePreviewFailed] = useState(false);
  const routeOrderId = route.params?.orderId || route.params?.order?.id || null;
  const isRemotePdfPreview =
    route.params?.previewMode === 'remote_pdf';
  const remoteCopyType = route.params?.remoteCopyType === 'tailor' ? 'tailor' : 'customer';
  const remotePreviewTitle =
    route.params?.title || (remoteCopyType === 'tailor' ? 'Tailoring Copy' : 'Customer Copy');
  const remotePreviewLoadingLabel =
    remoteCopyType === 'tailor' ? 'Loading tailoring copy...' : 'Loading customer copy...';

  useEffect(() => {
    let isMounted = true;

    if (isRemotePdfPreview) {
      setLoadingOrder(false);
      return () => {
        isMounted = false;
      };
    }

    if (!routeOrderId) {
      setLoadingOrder(false);
      return () => {
        isMounted = false;
      };
    }

    setLoadingOrder(true);
    dispatch(getOrderByIdAction(routeOrderId))
      .unwrap()
      .then((response) => {
        if (isMounted) {
          setLatestOrder(response || route.params?.order || null);
        }
      })
      .catch(() => {
        if (isMounted) {
          setLatestOrder(route.params?.order || null);
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoadingOrder(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [dispatch, isRemotePdfPreview, route.params?.order, routeOrderId]);

  useEffect(() => {
    let isMounted = true;

    if (!isRemotePdfPreview) {
      return () => {
        isMounted = false;
      };
    }

    const loadRemotePreview = async () => {
      try {
        setRemotePreviewLoading(true);
        setRemotePreviewFailed(false);
        setRemotePreviewHtml('');

        const response = await dispatch(downloadOrderCopyThunk({
          copyType: remoteCopyType,
          orderId: route.params?.orderId || null,
          paymentId: route.params?.paymentId || null,
          fileUrl: route.params?.pdfUrl || null,
          previewOnly: true,
        })).unwrap();

        if (!response?.filePath) {
          throw new Error('Preview file unavailable');
        }

        const pdfBase64 = await RNFS.readFile(response.filePath, 'base64');
        await RNFS.unlink(response.filePath).catch(() => null);

        if (!isMounted) {
          return;
        }

        setRemotePreviewHtml(buildRemotePdfPreviewHtml(pdfBase64));
      } catch (error) {
        if (isMounted) {
          setRemotePreviewFailed(true);
        }
      } finally {
        if (isMounted) {
          setRemotePreviewLoading(false);
        }
      }
    };

    loadRemotePreview();

    return () => {
      isMounted = false;
    };
  }, [
    dispatch,
    downloadOrderCopyThunk,
    isRemotePdfPreview,
    remoteCopyType,
    route.params?.orderId,
    route.params?.pdfUrl,
    route.params?.paymentId,
  ]);

  const order = useMemo(
    () => buildInvoicePreviewOrder(latestOrder || route.params?.order),
    [latestOrder, route.params?.order],
  );
  const items = order ? normalizeItems(order, false) : [];
  const metaRows = order ? getInvoiceMetaRows(order) : [];
  const copyLabel = getInvoiceCopyLabel(copyType);
  const screenTitle = getInvoiceDocumentTitle(copyType);
  const activeDownloadCopyType = isRemotePdfPreview ? remoteCopyType : copyType;
  const activeDownloadLabel = getInvoiceCopyLabel(activeDownloadCopyType);
  const downloadDirectoryPath =
    Platform.OS === 'android' ? RNFS.DownloadDirectoryPath : RNFS.DocumentDirectoryPath;

  const confirmPdfDownload = () => (
    new Promise(resolve => {
      let settled = false;
      const finish = (value) => {
        if (!settled) {
          settled = true;
          resolve(value);
        }
      };

      Alert.alert(
        'Download PDF',
        `${activeDownloadLabel} PDF will be saved to:\n${downloadDirectoryPath}\n\nDo you want to continue?`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => finish(false),
          },
          {
            text: 'Download',
            onPress: () => finish(true),
          },
        ],
        {
          cancelable: true,
          onDismiss: () => finish(false),
        },
      );
    })
  );

  const handleDownload = async () => {
    if (downloading) {
      return;
    }

    const confirmed = await confirmPdfDownload();
    if (!confirmed) {
      return;
    }

    const hasDownloadPermission = await requestDeviceDownloadPermission();
    if (!hasDownloadPermission) {
      showToast(
        `Storage permission is required to download the ${activeDownloadLabel.toLowerCase()} PDF.`,
        'error',
      );
      return;
    }

    try {
      setDownloading(true);
      let filePath;

      if (isRemotePdfPreview) {
        const response = await dispatch(downloadOrderCopyThunk({
          copyType: activeDownloadCopyType,
          orderId: route.params?.orderId || order?.id || null,
          paymentId: route.params?.paymentId || null,
          fileUrl: isRemotePdfPreview ? route.params?.pdfUrl || null : null,
        })).unwrap();
        filePath = response?.filePath;
      } else {
        let processedCompany = { ...company };
        if (processedCompany.logo) {
          processedCompany.logo = await convertLogoToBase64(processedCompany.logo);
        }
        if (copyType === 'tailor') {
          filePath = await saveTailorCopyPDF(order, processedCompany);
        } else {
          filePath = await saveCustomerCopyPDF(order, processedCompany);
        }
      }

      showToast(
        `${activeDownloadLabel} PDF downloaded to ${filePath || downloadDirectoryPath}`,
        'success',
      );
    } catch (error) {
      showToast(
        error?.message || error?.error || error?.data?.message || 'Could not download PDF',
        'error',
      );
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = async () => {
    if (printing) {
      return;
    }

    try {
      setPrinting(true);

      if (isRemotePdfPreview) {
        const response = await dispatch(downloadOrderCopyThunk({
          copyType: remoteCopyType,
          orderId: route.params?.orderId || null,
          paymentId: route.params?.paymentId || null,
          fileUrl: route.params?.pdfUrl || null,
          previewOnly: true,
        })).unwrap();

        if (!response?.filePath) {
          throw new Error('Could not prepare PDF for printing');
        }

        await RNPrint.print({ filePath: response.filePath });
        await RNFS.unlink(response.filePath).catch(() => null);
        return;
      }

      let processedCompany = { ...company };
      if (processedCompany.logo) {
        processedCompany.logo = await convertLogoToBase64(processedCompany.logo);
      }

      const html =
        copyType === 'tailor'
          ? await getTailorCopyPreviewHTML(order, processedCompany)
          : getCustomerCopyHTML(order, processedCompany);

      await printHTML(html);
    } catch (error) {
      showToast(error?.message || 'Could not print invoice', 'error');
    } finally {
      setPrinting(false);
    }
  };

  if (isRemotePdfPreview) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.header, styles.remotePreviewHeader, { paddingTop: Math.max(insets.top, 12) }]}>
          <TouchableOpacity style={styles.backButton} onPress={navigation.goBack}>
            <ArrowLeft size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerTextWrap}>
            <Text style={styles.headerTitle}>
              {remotePreviewTitle}
            </Text>
            <Text style={styles.headerSubtitle}>
              {route.params?.orderNumber
                ? `Order #${route.params.orderNumber}`
                : remoteCopyType === 'tailor'
                  ? 'Completed tailoring copy preview'
                  : 'Completed sales invoice preview'}
            </Text>
          </View>
        </View>

        <View style={styles.remotePreviewWrap}>
          {remotePreviewLoading ? (
            <View style={styles.remotePreviewLoader}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.remotePreviewHelperText}>
                {remotePreviewLoadingLabel}
              </Text>
            </View>
          ) : remotePreviewHtml && !remotePreviewFailed ? (
            <WebView
              originWhitelist={['*']}
              source={{ html: remotePreviewHtml }}
              style={styles.remotePreviewWebview}
              onError={() => setRemotePreviewFailed(true)}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              scalesPageToFit={false}
              setBuiltInZoomControls={true}
              setDisplayZoomControls={false}
              showsVerticalScrollIndicator={false}
              bounces={false}
            />
          ) : (
            <View style={styles.remotePreviewFallback}>
              <Text style={styles.emptyTitle}>Preview unavailable</Text>
              <Text style={styles.emptyText}>
                PDF preview could not be rendered clearly here. You can still
                download or print the invoice below.
              </Text>
            </View>
          )}
        </View>

        <View
          style={[
            styles.actionBar,
            { paddingBottom: Math.max(insets.bottom, Platform.OS === 'android' ? 16 : 12) },
          ]}
        >
          <TouchableOpacity
            style={[styles.actionButton, styles.downloadButton]}
            onPress={handleDownload}
            disabled={downloading}
          >
            {downloading ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <Download size={18} color={Colors.white} />
            )}
            <Text style={styles.downloadButtonText}>
              {downloading ? 'Downloading...' : 'Download PDF'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.printButton]}
            onPress={handlePrint}
            disabled={printing}
          >
            {printing ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <Printer size={18} color={Colors.primary} />
            )}
            <Text style={styles.printButtonText}>
              {printing ? 'Preparing...' : 'Print'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (loadingOrder && !order) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.emptyWrap}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={[styles.emptyText, styles.loadingOrderText]}>
            Refreshing latest invoice data...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>Invoice data unavailable</Text>
          <Text style={styles.emptyText}>
            Order details were not passed into the preview screen.
          </Text>
          <TouchableOpacity style={styles.primaryButton} onPress={navigation.goBack}>
            <Text style={styles.primaryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) }]}>
        <TouchableOpacity style={styles.backButton} onPress={navigation.goBack}>
          <ArrowLeft size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>{screenTitle}</Text>
          <Text style={styles.headerSubtitle}>
            Order #{formatInvoiceText(order.billNo, 'Draft')}
          </Text>
        </View>
      </View>

      {allowedCopyTypes.length > 1 ? (
        <View style={styles.toggleWrap}>
          {allowedCopyTypes.includes('customer') ? (
            <CopyTypeButton
              active={copyType === 'customer'}
              icon={<UserRound size={16} color={copyType === 'customer' ? Colors.white : '#0284C7'} />}
              label="Customer Copy"
              onPress={() => setCopyType('customer')}
            />
          ) : null}
          {allowedCopyTypes.includes('tailor') ? (
            <CopyTypeButton
              active={copyType === 'tailor'}
              icon={<PenTool size={16} color={copyType === 'tailor' ? Colors.white : '#EA580C'} />}
              label="Tailoring Copy"
              onPress={() => setCopyType('tailor')}
            />
          ) : null}
        </View>
      ) : null}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 120 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sheet}>
          <InvoiceDocumentHeader company={company} copyLabel={copyLabel} />

          <View style={styles.sheetSection}>
            <InvoiceMetaStrip items={metaRows} />
          </View>

          {copyType === 'customer' ? (
            <>
              <View style={styles.sheetSection}>
                <InvoiceItemsTable items={items} order={order} />
              </View>

              <View style={[styles.sheetSection, styles.summarySection]}>
                <InvoiceSummaryPanel
                  title="Payment Summary"
                  rows={getCustomerInvoiceTotals(order)}
                />
              </View>

              <View style={[styles.footerSection, styles.footerSplit]}>
                <View style={styles.termsWrap}>
                  <Text style={styles.footerTitle}>Terms & Conditions</Text>
                  <Text style={styles.footerText}>
                    No Refund / No Exchange / No Cancellation
                  </Text>
                  <Text style={styles.footerText}>E &amp; O.E.</Text>
                </View>

                <View style={styles.signatureWrap}>
                  <Text style={styles.signatureLabel}>
                    For {formatInvoiceText(company.name, 'My Boutique')}
                  </Text>
                </View>
              </View>
            </>
          ) : (
            <>
              <View style={styles.tailorIntroCard}>
                <Text style={styles.tailorIntroTitle}>Production Notes</Text>
                <Text style={styles.tailorIntroText}>
                  This copy is intended for tailoring execution, measurements,
                  attachments, and delivery planning.
                </Text>
              </View>

              <View style={[styles.sheetSection, styles.tailorSummaryWrap]}>
                <InvoiceSummaryPanel
                  title="Work Summary"
                  rows={getTailorWorkSummary(items)}
                />
              </View>

              <View style={[styles.sheetSection, styles.summarySection]}>
                <InvoiceSummaryPanel
                  title="Billing Summary"
                  rows={getCustomerInvoiceTotals(order)}
                />
              </View>

              <View style={styles.tailorList}>
                {items.map((item, index) => (
                  <TailorCopyItemCard
                    key={`${item.id || item.name}-${index}`}
                    item={item}
                    order={order}
                    index={index}
                  />
                ))}
              </View>

              <View style={styles.footerSection}>
                <Text style={styles.footerTitle}>Workshop Notes</Text>
                <Text style={styles.footerText}>
                  {formatInvoiceText(
                    order.orderNotes || order.notes,
                    'No extra workshop notes added for this order.',
                  )}
                </Text>
              </View>
            </>
          )}

          <View style={styles.brandingFooter}>
            <Text style={styles.brandingText}>
              Powered by <Text style={styles.brandingLogo}>SEWVEE</Text>
            </Text>
          </View>
        </View>
      </ScrollView>

      <View
        style={[
          styles.actionBar,
          { paddingBottom: Math.max(insets.bottom, Platform.OS === 'android' ? 16 : 12) },
        ]}
      >
        <TouchableOpacity
          style={[styles.actionButton, styles.downloadButton]}
          onPress={handleDownload}
          disabled={downloading}
        >
          {downloading ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <Download size={18} color={Colors.white} />
          )}
          <Text style={styles.downloadButtonText}>
            {downloading ? 'Downloading...' : 'Download PDF'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.printButton]}
          onPress={handlePrint}
          disabled={printing}
        >
          {printing ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <Printer size={18} color={Colors.primary} />
          )}
          <Text style={styles.printButtonText}>
            {printing ? 'Printing...' : 'Print'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function CopyTypeButton({
  active,
  icon,
  label,
  onPress,
}) {
  return (
    <TouchableOpacity
      style={[styles.toggleButton, active && styles.toggleButtonActive]}
      onPress={onPress}
    >
      {icon}
      <Text style={[styles.toggleText, active && styles.toggleTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#EEF2F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  remotePreviewHeader: {
    paddingBottom: 6,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.small,
  },
  headerTextWrap: {
    marginLeft: 12,
    flex: 1,
  },
  headerTitle: {
    color: Colors.textPrimary,
    fontFamily: 'Inter-Bold',
    fontSize: 18,
  },
  headerSubtitle: {
    color: Colors.textSecondary,
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    marginTop: 2,
  },
  toggleWrap: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  toggleButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D7DFEA',
    backgroundColor: Colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 10,
  },
  toggleButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  toggleText: {
    color: Colors.textPrimary,
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
  },
  toggleTextActive: {
    color: Colors.white,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  sheet: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...Shadow.medium,
  },
  sheetSection: {
    marginTop: 18,
  },
  summarySection: {
    alignItems: 'flex-end',
  },
  tailorIntroCard: {
    marginTop: 18,
    borderRadius: 18,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    padding: 14,
  },
  tailorIntroTitle: {
    color: '#9A3412',
    fontFamily: 'Inter-Bold',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  tailorIntroText: {
    color: '#7C2D12',
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 6,
  },
  tailorSummaryWrap: {
    alignItems: 'flex-end',
  },
  tailorList: {
    marginTop: 4,
  },
  footerSection: {
    marginTop: 22,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 16,
  },
  footerSplit: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  termsWrap: {
    flex: 1,
  },
  signatureWrap: {
    minWidth: 120,
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
  },
  footerTitle: {
    color: Colors.textPrimary,
    fontFamily: 'Inter-Bold',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  footerText: {
    color: Colors.textSecondary,
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    lineHeight: 18,
  },
  signatureLabel: {
    color: Colors.textSecondary,
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    marginTop: 32,
  },
  brandingFooter: {
    marginTop: 22,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    alignItems: 'center',
  },
  brandingText: {
    color: '#9CA3AF',
    fontFamily: 'Inter-Medium',
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  brandingLogo: {
    color: '#0E9F8A',
    fontFamily: 'Inter-Bold',
  },
  remotePreviewWrap: {
    flex: 1,
    marginHorizontal: 0,
    marginBottom: 12,
    backgroundColor: Colors.white,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...Shadow.medium,
  },
  remotePreviewWebview: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  remotePreviewLoader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    gap: 12,
  },
  remotePreviewFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  remotePreviewHelperText: {
    color: Colors.textSecondary,
    fontFamily: 'Inter-Medium',
    fontSize: 14,
  },
  loadingOrderText: {
    marginTop: 16,
  },
  actionBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 0,
    flexDirection: 'row',
    gap: 10,
    paddingTop: 12,
    backgroundColor: 'rgba(238, 242, 247, 0.98)',
  },
  actionButton: {
    flex: 1,
    height: 54,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  downloadButton: {
    backgroundColor: Colors.primary,
    ...Shadow.medium,
  },
  printButton: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: '#D7DFEA',
  },
  downloadButtonText: {
    color: Colors.white,
    fontFamily: 'Inter-Bold',
    fontSize: 14,
  },
  printButtonText: {
    color: Colors.primary,
    fontFamily: 'Inter-Bold',
    fontSize: 14,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: {
    color: Colors.textPrimary,
    fontFamily: 'Inter-Bold',
    fontSize: 20,
  },
  emptyText: {
    color: Colors.textSecondary,
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  primaryButton: {
    minWidth: 140,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: Colors.white,
    fontFamily: 'Inter-Bold',
    fontSize: 14,
  },
});
