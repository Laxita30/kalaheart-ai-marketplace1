import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English", native: "English" },
  { code: "hi", label: "Hindi", native: "हिन्दी" },
  { code: "bn", label: "Bengali", native: "বাংলা" },
  { code: "ta", label: "Tamil", native: "தமிழ்" },
  { code: "te", label: "Telugu", native: "తెలుగు" },
  { code: "mr", label: "Marathi", native: "मराठी" },
  { code: "gu", label: "Gujarati", native: "ગુજરાતી" },
  { code: "kn", label: "Kannada", native: "ಕನ್ನಡ" },
  { code: "ml", label: "Malayalam", native: "മലയാളം" },
  { code: "pa", label: "Punjabi", native: "ਪੰਜਾਬੀ" },
  { code: "or", label: "Odia", native: "ଓଡ଼ିଆ" },
  { code: "as", label: "Assamese", native: "অসমীয়া" },
  { code: "ur", label: "Urdu", native: "اردو" },
  { code: "sa", label: "Sanskrit", native: "संस्कृतम्" },
  { code: "ks", label: "Kashmiri", native: "कॉशुर" },
  { code: "sd", label: "Sindhi", native: "سنڌي" },
  { code: "ne", label: "Nepali", native: "नेपाली" },
  { code: "kok", label: "Konkani", native: "कोंकणी" },
  { code: "mai", label: "Maithili", native: "मैथिली" },
  { code: "doi", label: "Dogri", native: "डोगरी" },
  { code: "mni", label: "Manipuri", native: "মৈতৈলোন্" },
  { code: "sat", label: "Santali", native: "ᱥᱟᱱᱛᱟᱲᱤ" },
  { code: "brx", label: "Bodo", native: "बड़ो" },
] as const;

const resources = {
  en: { translation: {
    nav: { mission: "Our Mission", products: "Products", artists: "Artists", login: "Login", sell: "Sell", admin: "Admin", signOut: "Sign out" },
    common: { save: "Save", cancel: "Cancel", required: "Required" },
    product: {
      newTitle: "New product", editTitle: "Edit product",
      title: "Title", description: "Description", price: "Price", stock: "Stock",
      category: "Category (e.g. Pottery)", materials: "Materials (e.g. Terracotta clay, natural dyes)",
      dimensions: 'Dimensions (e.g. 12" H x 8" W x 8" D)',
      care: "Care instructions (e.g. Hand wash with mild soap, avoid direct sunlight)",
      uploadPhotos: "Upload product photos", uploadHint: "PNG, JPG — multiple allowed",
      pasteUrls: "Or paste image URLs (comma-separated)",
      suggestAi: "Suggest description, hashtags & price with AI",
      generating: "Generating…",
      voiceDescribe: "Describe your product by voice",
      listening: "Listening… click again to stop",
      generateFromVoice: "Generate description from voice",
    },
    language: { label: "Language" },
  }},
  hi: { translation: {
    nav: { mission: "हमारा मिशन", products: "उत्पाद", artists: "कलाकार", login: "लॉगिन", sell: "बेचें", admin: "एडमिन", signOut: "साइन आउट" },
    common: { save: "सहेजें", cancel: "रद्द करें", required: "आवश्यक" },
    product: {
      newTitle: "नया उत्पाद", editTitle: "उत्पाद संपादित करें",
      title: "शीर्षक", description: "विवरण", price: "कीमत", stock: "स्टॉक",
      category: "श्रेणी (जैसे मिट्टी के बर्तन)", materials: "सामग्री (जैसे टेराकोटा मिट्टी)",
      dimensions: 'आकार (जैसे 12" H x 8" W x 8" D)',
      care: "देखभाल निर्देश (जैसे हल्के साबुन से धोएँ)",
      uploadPhotos: "उत्पाद की तस्वीरें अपलोड करें", uploadHint: "PNG, JPG — एकाधिक की अनुमति",
      pasteUrls: "या छवि URL चिपकाएँ (अल्पविराम से अलग)",
      suggestAi: "AI से विवरण, हैशटैग और कीमत सुझाएँ",
      generating: "बना रहा है…",
      voiceDescribe: "अपने उत्पाद का वर्णन बोलकर करें",
      listening: "सुन रहा है… रोकने के लिए फिर क्लिक करें",
      generateFromVoice: "आवाज़ से विवरण बनाएँ",
    },
    language: { label: "भाषा" },
  }},
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "en",
    interpolation: { escapeValue: false },
    detection: { order: ["localStorage", "navigator"], caches: ["localStorage"] },
  });

export default i18n;