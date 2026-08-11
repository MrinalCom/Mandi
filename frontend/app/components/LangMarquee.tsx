// Decorative only — not tied to the app's functional language toggle (which
// currently covers English/Hindi in app/lib/i18n.tsx). This strip exists to
// signal the breadth of who Mandi is built for; treat translations as
// illustrative, not a claim of full localization.
const SLOGANS = [
  { lang: "हिन्दी", text: "सीधे अपनी फसल बेचें। बिचौलिए का हिस्सा नहीं।" },
  { lang: "मराठी", text: "थेट तुमचे पीक विका. दलालाचा वाटा नाही." },
  { lang: "ਪੰਜਾਬੀ", text: "ਸਿੱਧੀ ਆਪਣੀ ਫ਼ਸਲ ਵੇਚੋ। ਵਿਚੋਲੇ ਦਾ ਹਿੱਸਾ ਨਹੀਂ।" },
  { lang: "ગુજરાતી", text: "તમારો પાક સીધો વેચો. વચેટિયાનો ભાગ નહીં." },
  { lang: "বাংলা", text: "সরাসরি আপনার ফসল বিক্রি করুন। মধ্যস্বত্বভোগীর ভাগ নয়।" },
  { lang: "தமிழ்", text: "உங்கள் விளைச்சலை நேரடியாக விற்கவும். இடைத்தரகர் பங்கு இல்லை." },
  { lang: "తెలుగు", text: "మీ పంటను నేరుగా అమ్మండి. మధ్యవర్తి వాటా లేదు." },
  { lang: "ಕನ್ನಡ", text: "ನಿಮ್ಮ ಬೆಳೆಯನ್ನು ನೇರವಾಗಿ ಮಾರಾಟ ಮಾಡಿ. ಮಧ್ಯವರ್ತಿಯ ಪಾಲು ಇಲ್ಲ." },
];

export default function LangMarquee() {
  const track = [...SLOGANS, ...SLOGANS];
  return (
    <div className="marquee marquee-dark">
      <div className="marquee-track">
        {track.map((s, i) => (
          <span className="marquee-item" key={i}>
            <b>{s.lang}</b>
            <span>{s.text}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
