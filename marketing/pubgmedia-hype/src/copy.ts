export type Lang = "en" | "ar";

export type Service = {
  num: string;
  title: string;
  kicker: string;
};

export type Copy = {
  hookA: string;
  hookB: string;
  beats: [string, string, string, string];
  tagline: string;
  growLead: string;
  growWords: [string, string, string, string];
  services: Service[];
  showcaseHead: string;
  showcaseSub: string;
  showcaseChips: string[];
  trusted: string;
  reach: string;
  finale: [string, string, string, string];
  finaleLine: string;
  whatsapp: string;
  location: string;
  sections: string[];
};

// Source: pubgmedia.online (services, headline, contact) and the clinic-one repo (product showcase).
export const COPY: Record<Lang, Copy> = {
  en: {
    hookA: "INVISIBLE?",
    hookB: "UNMISSABLE.",
    beats: ["SEEN.", "CLICKED.", "CHOSEN.", "GROWN."],
    tagline: "DIGITAL MARKETING AGENCY · ISTANBUL",
    growLead: "WE GROW YOUR",
    growWords: ["VISIBILITY", "TRAFFIC", "REVENUE", "BRAND"],
    services: [
      { num: "2.1", title: "SEO", kicker: "First rank. Every search." },
      { num: "2.2", title: "WEB", kicker: "Fast sites that convert." },
      { num: "2.3", title: "ADS", kicker: "More sales. Lower CPA." },
      { num: "2.4", title: "SOCIAL", kicker: "Always on. Always yours." },
      { num: "2.5", title: "BRAND", kicker: "Identity people remember." },
      { num: "2.6", title: "AI + n8n", kicker: "Workflows that run themselves." },
    ],
    showcaseHead: "WE SHIP PRODUCTS TOO.",
    showcaseSub: "CLINIC ONE — clinic management platform",
    showcaseChips: ["Patient files", "Dental chart", "Treatment plans", "Invoices + Rx", "Patient portal"],
    trusted: "TRUSTED BY",
    reach: "ISTANBUL → WORLDWIDE",
    finale: ["READY?", "LET'S", "MAKE IT", "GROW."],
    finaleLine: "LET'S MAKE IT GROW.",
    whatsapp: "WhatsApp",
    location: "Esenyurt, Istanbul · Worldwide",
    sections: ["(00) — HOOK", "(01) — ABOUT", "(02) — SERVICES", "(03) — WORK", "(04) — CLIENTS", "(05) — CONTACT"],
  },
  ar: {
    hookA: "مخفي؟",
    hookB: "لا يُنسى.",
    beats: ["تُشاهَد.", "تُنقَر.", "تُختار.", "تكبر."],
    tagline: "وكالة تسويق رقمي · إسطنبول",
    growLead: "نكبّر",
    growWords: ["ظهورك", "زياراتك", "أرباحك", "علامتك"],
    services: [
      { num: "2.1", title: "سيو", kicker: "المرتبة الأولى. بكل بحث." },
      { num: "2.2", title: "مواقع", kicker: "مواقع سريعة تبيع." },
      { num: "2.3", title: "إعلانات", kicker: "مبيعات أكثر. تكلفة أقل." },
      { num: "2.4", title: "سوشيال", kicker: "حضور دائم. بصوتك." },
      { num: "2.5", title: "هوية", kicker: "هوية ما بتنتسى." },
      { num: "2.6", title: "أتمتة", kicker: "ذكاء اصطناعي و n8n يشتغل عنك." },
    ],
    showcaseHead: "ونبني منتجات كمان.",
    showcaseSub: "كلينك ون — منصة إدارة العيادات",
    showcaseChips: ["ملفات المرضى", "مخطط الأسنان", "خطط العلاج", "فواتير ووصفات", "بوابة المريض"],
    trusted: "وثقوا بنا",
    reach: "من إسطنبول إلى العالم",
    finale: ["جاهز؟", "خلّينا", "نكبّرها", "سوا."],
    finaleLine: "خلّينا نكبّرها سوا.",
    whatsapp: "واتساب",
    location: "إسنيورت، إسطنبول · حول العالم",
    sections: ["(00) — البداية", "(01) — من نحن", "(02) — خدماتنا", "(03) — أعمالنا", "(04) — عملاؤنا", "(05) — تواصل"],
  },
};

export const CLIENTS = [
  "ARROW WORLD",
  "SEMERKAND",
  "MAZ CONTAINER",
  "PNEWA",
  "SHAMS ALSAHEL CARGO",
  "BAQAL",
  "4ALL",
  "MHM",
  "D2",
];
