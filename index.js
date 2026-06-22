/**
 * دوال مؤسسة الصداقة السحابية (Firebase Cloud Functions - الجيل الثاني)
 * الوظيفة: إرسال إشعارات FCM لكل من فعّل الإشعارات عند نشر إعلان/عرض جديد.
 */

const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

initializeApp();
const db = getFirestore();

const ICON = "https://yahyaside.github.io/ets.sadagha/icon-192.png";
const STORE_URL = "https://yahyaside.github.io/ets.sadagha/";

/**
 * يجلب كل الرموز من مجموعة pushtokens ويرسل لها الإشعار،
 * ثم يحذف الرموز التي لم تعد صالحة.
 */
async function broadcast(title, body, data = {}) {
  const snap = await db.collection("pushtokens").get();
  const tokens = snap.docs.map((d) => d.id).filter(Boolean);

  if (tokens.length === 0) {
    console.log("لا توجد رموز إشعارات مسجّلة.");
    return { sent: 0, failed: 0 };
  }

  const message = {
    notification: { title: title || "مؤسسة الصداقة", body: body || "" },
    data: Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, String(v)])
    ),
    webpush: {
      notification: {
        icon: ICON,
        badge: ICON,
        dir: "rtl",
        lang: "ar",
      },
      fcmOptions: { link: STORE_URL },
    },
  };

  let sent = 0;
  let failed = 0;
  const badTokens = [];

  // FCM يسمح بحد أقصى 500 رمز في الطلب الواحد
  for (let i = 0; i < tokens.length; i += 500) {
    const batch = tokens.slice(i, i + 500);
    const res = await getMessaging().sendEachForMulticast({
      ...message,
      tokens: batch,
    });
    sent += res.successCount;
    failed += res.failureCount;

    res.responses.forEach((r, idx) => {
      if (!r.success) {
        const code = r.error && r.error.code;
        if (
          code === "messaging/registration-token-not-registered" ||
          code === "messaging/invalid-registration-token"
        ) {
          badTokens.push(batch[idx]);
        }
      }
    });
  }

  // حذف الرموز غير الصالحة لتنظيف قاعدة البيانات
  await Promise.all(
    badTokens.map((tk) =>
      db.collection("pushtokens").doc(tk).delete().catch(() => {})
    )
  );

  console.log(`أُرسل: ${sent} | فشل: ${failed} | حُذف: ${badTokens.length}`);
  return { sent, failed, removed: badTokens.length };
}

/**
 * يعمل تلقائياً عند إضافة إعلان جديد إلى مجموعة announcements.
 */
exports.onAnnouncement = onDocumentCreated(
  { document: "announcements/{id}", region: "us-central1" },
  async (event) => {
    const a = event.data && event.data.data();
    if (!a) return;

    const title = a.title || "إشعار جديد من مؤسسة الصداقة";
    const body = a.body || a.text || a.desc || "";
    const target = a.target || "offers";

    await broadcast(title, body, { target });
  }
);

/**
 * دالة اختيارية يمكن استدعاؤها من لوحة المدير لإرسال إشعار مخصّص فوراً.
 * مثال الاستدعاء من المتصفح:
 *   const fn = firebase.functions().httpsCallable('sendNotification');
 *   await fn({ title:'عرض خاص', body:'خصم 20%', target:'offers' });
 */
exports.sendNotification = onCall(
  { region: "us-central1" },
  async (request) => {
    const { title, body, target } = request.data || {};
    if (!title && !body) {
      throw new HttpsError("invalid-argument", "العنوان أو النص مطلوب.");
    }
    return await broadcast(title, body, { target: target || "notif" });
  }
);
