/**
 * ETS SADAGHA — إرسال فاتورة عبر قالب WhatsApp Cloud API
 * التوكن و Phone number ID محفوظان كأسرار (Secrets) على الخادم — لا تظهر للمتصفح أبداً.
 */
const {onCall, HttpsError} = require("firebase-functions/v2/https");
const {defineSecret} = require("firebase-functions/params");

const WA_TOKEN    = defineSecret("WA_TOKEN");      // التوكن الدائم
const WA_PHONE_ID = defineSecret("WA_PHONE_ID");   // Phone number ID

exports.sendInvoiceTemplate = onCall(
  {secrets: [WA_TOKEN, WA_PHONE_ID], region: "us-central1"},
  async (request) => {
    // اطلب أن يكون المستخدم مسجّلاً للدخول (موصى به لمنع إساءة الاستخدام).
    // إن كان موظفوك لا يسجّلون دخولاً عبر Firebase Auth، احذف هذه الكتلة الثلاثة الأسطر.
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "يجب تسجيل الدخول لإرسال الرسائل");
    }

    const {to, template, lang, params} = request.data || {};
    const phone = String(to || "").replace(/\D/g, ""); // صيغة دولية بدون +
    if (!phone) throw new HttpsError("invalid-argument", "رقم المستلم غير صالح");

    const body = {
      messaging_product: "whatsapp",
      to: phone,
      type: "template",
      template: {
        name: template || "invoice",
        language: {code: lang || "ar"},
        components: [{
          type: "body",
          parameters: (params || []).map((t) => ({type: "text", text: String(t)})),
        }],
      },
    };

    const url =
      `https://graph.facebook.com/v22.0/${WA_PHONE_ID.value()}/messages`;

    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${WA_TOKEN.value()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const out = await resp.json();
    if (!resp.ok) {
      console.error("WhatsApp API error:", JSON.stringify(out));
      return {ok: false, error: (out.error && out.error.message) || "WhatsApp API error"};
    }
    return {ok: true, id: out.messages && out.messages[0] && out.messages[0].id};
  }
);
