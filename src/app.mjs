import { calculateReserve, explainMinimumDue } from './core/finance-engine.mjs';
import { parseCurrencyAmount } from './core/speech-parser.mjs';
import { newSessionId, createResearchEvent, serializeSession } from './core/research-events.mjs';
import { preloadSpeech, speak, stopSpeech } from './core/device-capabilities.mjs';
import { audioCaptureSupported, VoiceAudioCapture, transcribeRecordedAudio } from './core/audio-capture.mjs';
import { createConversationalVoiceWorkflow, runPromptThenListen } from './core/voice-flow.mjs';
import { VOICE_CONVERSATION_COPY } from './core/voice-copy.mjs';
import { loadLedger, appendConfirmedRecord, correctEntry, dailyTotals, effectiveAmount } from './core/ledger-store.mjs';
import { readPrivacy, savePrivacy, defaultPrivacy, exportLocalData, deleteLocalData, deleteResearchData, NOTICE_VERSION } from './core/privacy-store.mjs';
import { PRIVACY_COPY } from './ui/privacy-copy.mjs';
import { icon } from './ui/icons.mjs';

const COPY = {
  kn: {
    app:'SVANidhi Saathi', welcome:'ನಿಮ್ಮ ಹಣ. ಸರಳವಾಗಿ ಅರ್ಥವಾಗಲಿ.', welcomeSupport:'ಪಾವತಿ ಮತ್ತು ಬಿಲ್‌ಗಳನ್ನು ಸುಲಭವಾಗಿ ಅರ್ಥಮಾಡಿಕೊಳ್ಳಲು ನಿಮ್ಮ ಸಾಥಿ.', choose:'ನಿಮಗೆ ಅನುಕೂಲವಾದ ಭಾಷೆ ಆಯ್ಕೆಮಾಡಿ', continue:'ಮುಂದುವರಿಸಿ',
    safety:'ಮೊದಲು ಸುರಕ್ಷತೆ', safetySupport:'ಹಣದ ಬಗ್ಗೆ ಮಾತನಾಡುವ ಮೊದಲು, ಸಾಥಿ ಯಾವ ಮಾಹಿತಿಯನ್ನೂ ಕೇಳುವುದಿಲ್ಲ ಎಂದು ತಿಳಿದುಕೊಳ್ಳಿ.', neverAsk:'ಸಾಥಿ ಎಂದಿಗೂ ಕೇಳುವುದಿಲ್ಲ', neverMove:'ಸಾಥಿ ನಿಮ್ಮ ಹಣವನ್ನು ವರ್ಗಾಯಿಸಲು ಸಾಧ್ಯವಿಲ್ಲ.', control:'ಪ್ರತಿಯೊಂದು ಹಣಕಾಸು ಕ್ರಮವೂ ನಿಮ್ಮ ನಿಯಂತ್ರಣದಲ್ಲಿ ಇರುತ್ತದೆ.', understand:'ನನಗೆ ಅರ್ಥವಾಗಿದೆ — ಮುಂದುವರಿಸಿ',
    greeting:'ನಮಸ್ಕಾರ, ಲಕ್ಷ್ಮಿ', morning:'ಶುಭೋದಯ', payment:'ಮುಂದಿನ ಪಾವತಿ', readyNow:'ಈಗ ಸಿದ್ಧವಾಗಿದೆ', stillNeeded:'ಇನ್ನೂ ಬೇಕಾಗಿದೆ', suggested:'ಇಂದಿನ ಹೆಜ್ಜೆ', calculation:'₹120 ಲೆಕ್ಕ ಹೇಗೆ?', tellToday:'ಇಂದಿನ ಬಗ್ಗೆ ಸಾಥಿಗೆ ಹೇಳಿ', tellSupport:'ಇಂದಿನ ಮಾರಾಟ ಮತ್ತು ವ್ಯಾಪಾರದ ಖರ್ಚನ್ನು ಒಂದೊಂದಾಗಿ ಹೇಳಿ', explainBill:'ನನ್ನ ಬಿಲ್ ವಿವರಿಸಿ', ask:'ಸಾಥಿಯನ್ನು ಕೇಳಿ',
    voiceTitle:'ಇಂದಿನ ಬಗ್ಗೆ ಮಾತನಾಡೋಣ', listening:'ನಾನು ಕೇಳುತ್ತಿದ್ದೇನೆ…', voiceQuestion:'ಮೊದಲು ಇಂದಿನ ಮಾರಾಟದ ಮೊತ್ತವನ್ನು ಹೇಳಿ.', voiceWelcome:'SVANidhi Saathiಗೆ ಸ್ವಾಗತ. ನಿಮ್ಮ ದಿನದ ಹಣ, ಬಿಲ್‌ಗಳು ಮತ್ತು ಪಾವತಿಗಳನ್ನು ಸರಳವಾಗಿ ಅರ್ಥಮಾಡಿಕೊಳ್ಳಲು ನಾನು ಇಲ್ಲಿದ್ದೇನೆ.', voiceHint:'ನಿಧಾನವಾಗಿ ಮಾತನಾಡಿ. ಸಾಥಿ ಪ್ರತಿಯೊಂದು ಮೊತ್ತವನ್ನೂ ಪ್ರತ್ಯೇಕವಾಗಿ ದೃಢೀಕರಿಸುತ್ತದೆ.', voicePreparing:'ಸಾಥಿಯ ಧ್ವನಿ ಸಿದ್ಧವಾಗುತ್ತಿದೆ…', voiceSpeaking:'ಸಾಥಿ ಮಾತನಾಡುತ್ತಿದೆ…', voiceUnavailable:'ಸಾಥಿಯ ಧ್ವನಿ ಈಗ ಲಭ್ಯವಿಲ್ಲ. ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.', voiceFallback:'ಇಂಟರ್ನೆಟ್ ಇಲ್ಲದ ಕಾರಣ ಸಾಧನದ ಧ್ವನಿ ಬಳಸಲಾಗುತ್ತಿದೆ.', startListening:'ಉತ್ತರಿಸಲು ಟ್ಯಾಪ್ ಮಾಡಿ', stop:'ಮುಗಿದಾಗ ಟ್ಯಾಪ್ ಮಾಡಿ', manual:'ಅಥವಾ ಇಲ್ಲಿ ಟೈಪ್ ಮಾಡಿ', voiceExample:'ಒಂದು ಸಾವಿರ ಆರು ನೂರು', useSample:'ಡೆಮೊ ಮೊತ್ತ ಬಳಸಿ', continueConfirm:'ಮೊತ್ತವನ್ನು ಪರಿಶೀಲಿಸಿ',
    confirm:'ನಾನು ಸರಿಯಾಗಿ ಕೇಳಿದೇನಾ?', confirmSupport:'ಉಳಿಸುವ ಮೊದಲು ಪರಿಶೀಲಿಸಿ.', sales:'ಇಂದಿನ ಮಾರಾಟ', stock:'ವ್ಯಾಪಾರದ ಖರ್ಚು', yesSave:'ಹೌದು, ಉಳಿಸಿ', change:'ಬದಲಿಸಿ', nothingSaved:'ನೀವು ಅಂತಿಮವಾಗಿ ದೃಢೀಕರಿಸುವವರೆಗೆ ಯಾವುದೂ ಉಳಿಸಲಾಗುವುದಿಲ್ಲ.',
    guidance:'ಇಂದು ಮಾಡಬೇಕಾದದ್ದು', guidanceSupport:'ಇಂದಿಗೆ ಒಂದು ಸ್ಪಷ್ಟ ಕ್ರಮ.', keepAside:'ಇಂದು ಬೇರ್ಪಡಿಸಿ', days:'ದಿನಗಳು ಉಳಿದಿವೆ', why:'ಏಕೆ?', whyText:'ಬಾಕಿ ಇರುವ ಮೊತ್ತ ಮತ್ತು ಉಳಿದ ದಿನಗಳಿಂದ ಗಣನೆ ಮಾಡಲಾಗಿದೆ.', listen:'ಕೇಳಿ',
    bill:'ಬಿಲ್ ಅನ್ನು ಸರಳವಾಗಿ ಅರ್ಥಮಾಡಿಕೊಳ್ಳಿ', billSupport:'ಬಿಲ್‌ನ ಸ್ಪಷ್ಟ ಫೋಟೋ ತೆಗೆದುಕೊಳ್ಳಿ. ಸಾಥಿ ನೀವು ಪರಿಶೀಲಿಸಲು ಆಯ್ಕೆಮಾಡಿದ ಮಾಹಿತಿಯನ್ನು ಮಾತ್ರ ವಿವರಿಸುತ್ತದೆ.', takePhoto:'ಫೋಟೋ ತೆಗೆದುಕೊಳ್ಳಿ', sampleExtract:'ಪರೀಕ್ಷಾ ಬಿಲ್ ಓದಿ', uncertainDemo:'ಅಸ್ಪಷ್ಟ ಓದು ಪರೀಕ್ಷಿಸಿ', photoReady:'ಫೋಟೋ ಸಿದ್ಧವಾಗಿದೆ',
    billExplained:'ನಿಮ್ಮ ಬಿಲ್ — ಸರಳವಾಗಿ', used:'ನೀವು ಬಳಸಿದ್ದು', payBy:'ಪಾವತಿಸಬೇಕಾದ ದಿನ', clearBill:'ಈ ಬಿಲ್ ಪೂರ್ಣಗೊಳಿಸಲು', minimum:'ಕನಿಷ್ಠ ಪಾವತಿ', source:'ಈ ಸಂಖ್ಯೆಗಳು ಎಲ್ಲಿಂದ ಬಂದವು?', askBill:'ಈ ಬಿಲ್ ಬಗ್ಗೆ ಕೇಳಿ',
    askTitle:'ಸಾಥಿಯನ್ನು ಕೇಳಿ', askSupport:'ನಿಮ್ಮ ಪಾವತಿ, ಬಿಲ್ ಅಥವಾ ಇಂದಿನ ಯೋಜನೆ ಬಗ್ಗೆ ಕೇಳಿ.', dueQuestion:'ನಾನು ಯಾವಾಗ ಪಾವತಿಸಬೇಕು?', reserveQuestion:'ಇಂದು ಎಷ್ಟು ಬೇರ್ಪಡಿಸಬೇಕು?', minimumQuestion:'ಕನಿಷ್ಠ ಪಾವತಿ ಎಂದರೇನು?', trackQuestion:'₹120 ಹೇಗೆ ಲೆಕ್ಕ ಹಾಕಲಾಗಿದೆ?', askAnother:'ಮತ್ತೊಂದು ಪ್ರಶ್ನೆ ಕೇಳಿ',
    activity:'ನಿಮ್ಮ ಚಟುವಟಿಕೆ', activitySupport:'ಸರಳ ಇತಿಹಾಸ — ಲೆಕ್ಕಪತ್ರವಲ್ಲ.', noActivity:'ಇನ್ನೂ ಯಾವುದೇ ದೃಢೀಕರಿಸಿದ ಚಟುವಟಿಕೆ ಇಲ್ಲ.', remaining:'ಬಾಕಿ',
    offline:'ಇಂಟರ್ನೆಟ್ ಇಲ್ಲ', offlineSupport:'ಉಳಿಸಿದ ಮಾಹಿತಿ ನೋಡಬಹುದು. ಧ್ವನಿ ಗುರುತಿಸುವಿಕೆ ಸಾಧನ/ನೆಟ್‌ವರ್ಕ್ ಮೇಲೆ ಅವಲಂಬಿತವಾಗಿರಬಹುದು.',
    uncertain:'ಒಂದು ಮೊತ್ತ ಸ್ಪಷ್ಟವಾಗಿಲ್ಲ', uncertainSupport:'ಸಾಥಿ ಹಣದ ಮೊತ್ತವನ್ನು ಊಹಿಸುವುದಿಲ್ಲ.', dueReadable:'ಪಾವತಿ ದಿನವನ್ನು ಓದಬಹುದು', amountUnclear:'ಆದರೆ ಒಟ್ಟು ಮೊತ್ತ ಸ್ಪಷ್ಟವಾಗಿಲ್ಲ.', possible:'ಸಂಭಾವ್ಯ ಓದು', needsConfirm:'ದೃಢೀಕರಣ ಬೇಕು', retake:'ಮತ್ತೆ ಫೋಟೋ ತೆಗೆದುಕೊಳ್ಳಿ', manualAmount:'ಮೊತ್ತವನ್ನು ಕೈಯಾರೆ ನಮೂದಿಸಿ', confirmAmount:'ಮೊತ್ತವನ್ನು ದೃಢೀಕರಿಸಿ',
    home:'ಮುಖಪುಟ', research:'Research', field:'Field mode', demo:'Demo mode', close:'ಮುಚ್ಚಿ', export:'Export session', privacyNote:'ಈ ಸಂಶೋಧನಾ ಟಿಪ್ಪಣಿಗಳಲ್ಲಿ OTP, PIN, CVV, Aadhaar ಅಥವಾ ಬ್ಯಾಂಕ್ ಪಾಸ್‌ವರ್ಡ್ ದಾಖಲಿಸಬೇಡಿ.'
  },
  hi: {
    app:'SVANidhi Saathi', welcome:'आपका पैसा। आसान भाषा में।', welcomeSupport:'भुगतान और बिल समझने में आपका सरल साथी।', choose:'अपनी सुविधाजनक भाषा चुनें', continue:'आगे बढ़ें',
    safety:'पहले सुरक्षा', safetySupport:'पैसे की बात से पहले जानें कि साथी आपसे क्या कभी नहीं पूछेगा।', neverAsk:'साथी कभी नहीं पूछेगा', neverMove:'साथी आपके पैसे ट्रांसफर नहीं कर सकता।', control:'हर वित्तीय कदम आपके नियंत्रण में रहेगा।', understand:'समझ गया — आगे बढ़ें',
    greeting:'नमस्ते, लक्ष्मी', morning:'सुप्रभात', payment:'अगला भुगतान', readyNow:'अभी तैयार', stillNeeded:'अभी बाकी', suggested:'आज का कदम', calculation:'₹120 कैसे निकला?', tellToday:'आज के बारे में साथी को बताएं', tellSupport:'आज की बिक्री और कारोबार का खर्च एक-एक करके बोलें', explainBill:'मेरा बिल समझाएं', ask:'साथी से पूछें',
    voiceTitle:'आज के बारे में बात करें', listening:'मैं सुन रहा हूँ…', voiceQuestion:'पहले आज की बिक्री की रकम बताएं।', voiceWelcome:'SVANidhi Saathi में आपका स्वागत है। मैं रोज़ के पैसे, बिल और भुगतान को आसान भाषा में समझने में आपकी मदद करता हूँ।', voiceHint:'आराम से बोलें। साथी हर रकम की अलग से पुष्टि करेगा।', voicePreparing:'साथी की आवाज़ तैयार हो रही है…', voiceSpeaking:'साथी बोल रहा है…', voiceUnavailable:'साथी की आवाज़ अभी उपलब्ध नहीं है। फिर कोशिश करें।', voiceFallback:'इंटरनेट न होने के कारण डिवाइस की आवाज़ इस्तेमाल हो रही है।', startListening:'जवाब देने के लिए टैप करें', stop:'पूरा होने पर टैप करें', manual:'या यहाँ टाइप करें', voiceExample:'एक हजार छह सौ', useSample:'डेमो रकम इस्तेमाल करें', continueConfirm:'रकम जाँचें',
    confirm:'क्या मैंने सही सुना?', confirmSupport:'सेव करने से पहले जाँच लें।', sales:'आज की बिक्री', stock:'कारोबार का खर्च', yesSave:'हाँ, सेव करें', change:'बदलें', nothingSaved:'अंतिम पुष्टि के बिना कुछ भी सेव नहीं होगा।',
    guidance:'आज क्या करना है', guidanceSupport:'आज के लिए एक साफ़ कदम।', keepAside:'आज अलग रखें', days:'दिन बाकी', why:'क्यों?', whyText:'बाकी रकम और बचे दिनों से गणना की गई है।', listen:'सुनें',
    bill:'बिल को आसान भाषा में समझें', billSupport:'बिल की साफ़ फोटो लें। साथी केवल वही जानकारी समझाएगा जिसे आप देखना चुनते हैं।', takePhoto:'फोटो लें', sampleExtract:'टेस्ट बिल पढ़ें', uncertainDemo:'अस्पष्ट पढ़ाई जाँचें', photoReady:'फोटो तैयार है',
    billExplained:'आपका बिल — आसान भाषा में', used:'आपने इस्तेमाल किया', payBy:'इस तारीख तक भुगतान', clearBill:'पूरा बिल चुकाने के लिए', minimum:'न्यूनतम देय', source:'ये नंबर कहाँ से आए?', askBill:'इस बिल के बारे में पूछें',
    askTitle:'साथी से पूछें', askSupport:'अपने भुगतान, बिल या आज की योजना के बारे में पूछें।', dueQuestion:'मुझे कब भुगतान करना है?', reserveQuestion:'आज कितना अलग रखूँ?', minimumQuestion:'न्यूनतम देय क्या है?', trackQuestion:'₹120 कैसे निकला?', askAnother:'एक और सवाल पूछें',
    activity:'आपकी गतिविधि', activitySupport:'सरल इतिहास — अकाउंटिंग नहीं।', noActivity:'अभी कोई पुष्टि की हुई गतिविधि नहीं है।', remaining:'बाकी',
    offline:'इंटरनेट नहीं है', offlineSupport:'सेव जानकारी देख सकते हैं। आवाज़ पहचान डिवाइस/नेटवर्क पर निर्भर हो सकती है।',
    uncertain:'एक रकम साफ़ नहीं है', uncertainSupport:'साथी पैसे की रकम का अनुमान नहीं लगाएगा।', dueReadable:'भुगतान तारीख पढ़ी जा रही है', amountUnclear:'लेकिन कुल रकम स्पष्ट नहीं है।', possible:'संभावित पढ़ाई', needsConfirm:'पुष्टि ज़रूरी', retake:'फोटो फिर लें', manualAmount:'रकम खुद दर्ज करें', confirmAmount:'रकम की पुष्टि करें',
    home:'होम', research:'Research', field:'Field mode', demo:'Demo mode', close:'बंद करें', export:'Export session', privacyNote:'रिसर्च नोट्स में OTP, PIN, CVV, Aadhaar या बैंक पासवर्ड दर्ज न करें।'
  },
  en: {
    app:'SVANidhi Saathi', welcome:'Your money. Explained simply.', welcomeSupport:'A calm companion for understanding payment and bills.', choose:'Choose your language', continue:'Continue',
    safety:'Safety before money', safetySupport:'Before we talk about money, know what Saathi will never ask for.', neverAsk:'Saathi will never ask for', neverMove:'Saathi cannot move your money.', control:'You stay in control of every financial action.', understand:'I understand — continue',
    greeting:'Good morning, Lakshmi', morning:'Today', payment:'Next payment', readyNow:'Ready now', stillNeeded:'Still needed', suggested:'Today’s step', calculation:'How is ₹120 calculated?', tellToday:'Tell Saathi about today', tellSupport:'Share today’s sales and business spending one at a time', explainBill:'Explain my bill', ask:'Ask Saathi',
    voiceTitle:'Let’s talk about today', listening:'I’m listening…', voiceQuestion:"First, tell me today's sales amount.", voiceWelcome:'Welcome to SVANidhi Saathi. I’m here to make your daily money, bills, and payments easier to understand.', voiceHint:'Take your time. Saathi confirms each amount separately.', voicePreparing:'Preparing Saathi’s voice…', voiceSpeaking:'Saathi is speaking…', voiceUnavailable:'Saathi’s voice is unavailable right now. Please try again.', voiceFallback:'You are offline, so your device voice is being used.', startListening:'Tap to answer', stop:'Tap when finished', manual:'Or type here', voiceExample:'one thousand six hundred', useSample:'Use demo amount', continueConfirm:'Review amount',
    confirm:'Did I hear this correctly?', confirmSupport:'Check before anything is saved.', sales:'Today’s sales', stock:'Business spending', yesSave:'Yes, save', change:'Change it', nothingSaved:'Nothing is saved until your final confirmation.',
    guidance:'What to do today', guidanceSupport:'One clear action for today.', keepAside:'Keep aside today', days:'days remaining', why:'Why?', whyText:'Calculated from your remaining amount and remaining days.', listen:'Listen',
    bill:'Understand your bill simply', billSupport:'Take a clear photo of the bill. Saathi explains only the information you choose to review.', takePhoto:'Take photo', sampleExtract:'Read test bill', uncertainDemo:'Test uncertain read', photoReady:'Photo ready',
    billExplained:'Your bill — simply explained', used:'You used', payBy:'Pay by', clearBill:'To clear this bill', minimum:'Minimum due', source:'Where did these numbers come from?', askBill:'Ask about this bill',
    askTitle:'Ask Saathi', askSupport:'Ask about your payment, bill or today’s plan.', dueQuestion:'When do I pay?', reserveQuestion:'How much should I keep today?', minimumQuestion:'What is minimum due?', trackQuestion:'How is ₹120 calculated?', askAnother:'Ask another question',
    activity:'Your activity', activitySupport:'A simple history — not accounting.', noActivity:'No confirmed activity yet.', remaining:'remaining',
    offline:'No internet', offlineSupport:'Saved information remains available. Voice recognition may depend on device/network services.',
    uncertain:'One amount is unclear', uncertainSupport:'Saathi will not guess financial numbers.', dueReadable:'I can read the due date', amountUnclear:'But I am not confident about the total amount.', possible:'Possible reading', needsConfirm:'Needs confirmation', retake:'Retake photo', manualAmount:'Enter amount manually', confirmAmount:'Confirm amount',
    home:'Home', research:'Research', field:'Field mode', demo:'Demo mode', close:'Close', export:'Export session', privacyNote:'Do not enter OTP, PIN, CVV, Aadhaar or banking passwords in research notes.'
  }
};

const VOICE_V03_COPY = {
  kn: {
    done:'ನಾನು ಹೇಳಿ ಮುಗಿಸಿದೆ', liveTranscript:'ನೀವು ಹೇಳುತ್ತಿರುವುದು', reviewTranscript:'ನಾನು ಹೇಳಿದ್ದನ್ನು ಪರಿಶೀಲಿಸಿ', heard:'ಸಾಥಿ ಕೇಳಿದ್ದು', isCorrect:'ಇದು ಸರಿಯೇ?', yesCorrect:'ಹೌದು, ಸರಿಯಾಗಿದೆ', changeIt:'ಇಲ್ಲ, ಬದಲಿಸಿ', hearAgain:'ಮತ್ತೆ ಕೇಳಿ', moneyConfirm:'ಮೊತ್ತಗಳು ಸರಿಯೇ?', moneyConfirmSupport:'ಪ್ರತಿಯೊಂದು ಮೊತ್ತವನ್ನು ಪರಿಶೀಲಿಸಿ. ಬೇಕಾದರೆ ಬದಲಿಸಿ.', finalConfirm:'ಹೌದು, ಮೊತ್ತಗಳನ್ನು ಉಳಿಸಿ', lowConfidence:'ಒಂದು ಅಥವಾ ಹೆಚ್ಚಿನ ಮೊತ್ತಗಳು ಸ್ಪಷ್ಟವಾಗಿಲ್ಲ. ಖಾಲಿ ಇರುವ ಮೊತ್ತವನ್ನು ನಮೂದಿಸಿ ಮತ್ತು ಎರಡನ್ನೂ ಪರಿಶೀಲಿಸಿ.', noSpeech:'ನಿಮ್ಮ ಮಾತು ಸ್ಪಷ್ಟವಾಗಿ ಕೇಳಿಸಲಿಲ್ಲ. ಮತ್ತೆ ಮಾತನಾಡಿ ಅಥವಾ ಕೆಳಗೆ ಟೈಪ್ ಮಾಡಿ.', confirmBoth:'ಎರಡೂ ಮೊತ್ತಗಳನ್ನು ಸ್ಪಷ್ಟವಾಗಿ ನಮೂದಿಸಿ.', saveFailed:'ದೃಢೀಕರಿಸಿದ ದಾಖಲೆಯನ್ನು ಈ ಸಾಧನದಲ್ಲಿ ಉಳಿಸಲಾಗಲಿಲ್ಲ.', interpreting:'ಸಾಥಿ ನಿಮ್ಮ ಮಾತನ್ನು ಮೊತ್ತಗಳಾಗಿ ಅರ್ಥಮಾಡಿಕೊಳ್ಳುತ್ತಿದೆ…', voiceRemoteFallback:'ಸಾಥಿಯ ಆನ್‌ಲೈನ್ ಧ್ವನಿ ಲಭ್ಯವಿಲ್ಲ. ಸಾಧನದ ಧ್ವನಿ ಬಳಸಲಾಗುತ್ತಿದೆ.'
  },
  hi: {
    done:'मैंने बोलना पूरा कर लिया', liveTranscript:'आप जो बोल रहे हैं', reviewTranscript:'मेरी बात जाँचें', heard:'साथी ने यह सुना', isCorrect:'क्या यह सही है?', yesCorrect:'हाँ, सही है', changeIt:'नहीं, बदलें', hearAgain:'फिर से सुनें', moneyConfirm:'क्या रकम सही है?', moneyConfirmSupport:'हर रकम जाँचें। जरूरत हो तो बदलें।', finalConfirm:'हाँ, रकम सेव करें', lowConfidence:'एक या अधिक रकम साफ़ नहीं हैं। खाली रकम भरें और दोनों को जाँचें।', noSpeech:'आपकी बात साफ़ सुनाई नहीं दी। फिर बोलें या नीचे लिखें।', confirmBoth:'दोनों रकम साफ़-साफ़ दर्ज करें।', saveFailed:'पुष्टि की हुई जानकारी इस डिवाइस पर सेव नहीं हुई।', interpreting:'साथी आपकी बात को रकम में समझ रहा है…', voiceRemoteFallback:'साथी की ऑनलाइन आवाज़ उपलब्ध नहीं है। डिवाइस की आवाज़ इस्तेमाल हो रही है।'
  },
  en: {
    done:"I'm done", liveTranscript:"What you're saying", reviewTranscript:'Review what I said', heard:'Saathi heard', isCorrect:'Is this correct?', yesCorrect:'Yes, correct', changeIt:'No, change it', hearAgain:'Hear it again', moneyConfirm:'Are these amounts correct?', moneyConfirmSupport:'Review each amount. You can edit either one.', finalConfirm:'Yes, save these amounts', lowConfidence:'One or more amounts are unclear. Enter the missing amount and carefully review both.', noSpeech:"I couldn't hear a clear response. Please speak again or type below.", confirmBoth:'Enter both amounts clearly before saving.', saveFailed:'The confirmed record could not be saved on this device.', interpreting:'Saathi is turning your words into amounts…', voiceRemoteFallback:"Saathi's online voice is unavailable. Your device voice is being used."
  }
};

const root = document.querySelector('#app');
const toastNode = document.querySelector('#toast');

const state = {
  privacy: defaultPrivacy(),
  privacyDraft: null,
  privacyError: '',
  screen: 'language',
  language: 'kn',
  mode: 'field',
  online: navigator.onLine,
  listening: false,
  speaking: false,
  voiceIntroduced: false,
  transcript: '',
  parsed: { sales:null, stock:null, confidence:'low', rawNumbers:[], requiresReview:true },
  structuredReveal: 0,
  listeningStartedAt: 0,
  voicePhase: 'idle',
  activeTurn: 'collection',
  pendingAmount: null,
  confirmedAmounts: { collection:null, investment:null },
  conversationRun: 0,
  ledger: {version:1,events:[],onboarding_completed:false},
  ledgerError: false,
  saving: false,
  entryBatchId: '',
  correctionId: null,
  correctionAmount: null,
  photoUrl: null,
  billRead: 'none',
  sourceOpen: false,
  whyOpen: false,
  operatorTapCount: 0,
  question: null,
  answer: null,
  researchOpen: false,
  payment: { totalDue:8400, readyAmount:7080, remainingDays:11, dueDate:'8 September', minimumDue:420, statementDate:'20 August' },
  session: { id:newSessionId(), startedAt:new Date().toISOString() },
  events: [],
  research: { tasks:Array(9).fill(false), helpNeeded:false, trustConcern:'', wouldUseAgain:'', quote:'', notes:'' }
};

const pc = (key) => PRIVACY_COPY[state.language]?.[key] ?? PRIVACY_COPY.en[key];
const voiceAllowed = () => Boolean(readPrivacy(localStorage).acceptedAt && readPrivacy(localStorage).voice);
const t = (key) => VOICE_V03_COPY[state.language]?.[key] ?? COPY[state.language]?.[key] ?? VOICE_V03_COPY.en[key] ?? COPY.en[key] ?? key;
const lt = (kn, hi, en) => state.language === 'kn' ? kn : state.language === 'hi' ? hi : en;
const money = (value) => new Intl.NumberFormat('en-IN', { style:'currency', currency:'INR', maximumFractionDigits:0 }).format(value);
const reserve = () => calculateReserve(state.payment);
const minimumExplanation = () => explainMinimumDue({ totalDue:state.payment.totalDue, minimumDue:state.payment.minimumDue });

function loadLocal() {
  try { state.ledger = loadLedger(localStorage); state.ledgerError = false; }
  catch { state.ledgerError = true; }
}
loadLocal();
state.privacy = readPrivacy(localStorage);
if (state.privacy.acceptedAt) { state.language = state.privacy.language; state.screen = 'home'; }

const voiceWorkflow = createConversationalVoiceWorkflow({
  persist:async (record) => {
    const write = () => { if (!readPrivacy(localStorage).acceptedAt) throw Error('Consent required'); state.ledger = appendConfirmedRecord(localStorage, record, state.entryBatchId); };
    if (navigator.locks) await navigator.locks.request('saathi-ledger', write);
    else write();
  }
});

function log(name, payload = {}) {
  if (!readPrivacy(localStorage).research) return;
  const event = createResearchEvent({ sessionId:state.session.id, mode:state.mode, language:state.language, name, payload });
  state.events.push(event);
  try { localStorage.setItem(`saathi:events:${state.session.id}`, JSON.stringify(state.events)); } catch {}
}

function notify(message) {
  toastNode.textContent = message;
  toastNode.classList.add('show');
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => toastNode.classList.remove('show'), 1900);
}

function header({ back = false } = {}) {
  const languageLabel = state.language === 'kn' ? 'ಕನ್ನಡ' : state.language === 'hi' ? 'हिन्दी' : 'English';
  return `<div class="topline">
    <div class="brand-cluster">${back ? `<button class="back-btn" data-action="back" aria-label="Back">${icon('back')}</button>` : ''}<button class="brand-mark" data-action="operator-tap" aria-label="SVANidhi Saathi">${icon('help',19,true)}</button><span class="brand-mini">${t('app')}</span></div>
    ${state.screen === 'home' ? `<button class="language-pill" data-action="change-language">${icon('language',18)} ${languageLabel}</button>` : ''}
  </div>`;
}

function nav(active) {
  return `<nav class="bottom-nav" aria-label="Primary">
    <button class="nav-btn ${active==='home'?'active':''}" data-nav="home"><span class="nav-icon-wrap">${icon('home',23,active==='home')}</span><span>${t('home')}</span></button>
    <button class="nav-btn ${active==='ask'?'active':''}" data-nav="ask"><span class="nav-icon-wrap">${icon('help',23,active==='ask')}</span><span>${state.language==='kn'?'ಸಾಥಿ':state.language==='hi'?'साथी':'Saathi'}</span></button>
    <button class="nav-btn ${active==='activity'?'active':''}" data-nav="activity"><span class="nav-icon-wrap">${icon('list',23,active==='activity')}</span><span>${t('activity')}</span></button>
  </nav>`;
}

function welcomeScreen() {
  return `<main class="screen">
    ${header()}
    <div class="spacer"></div>
    <h1>${t('welcome')}</h1>
    <p class="lede">${t('welcomeSupport')}</p>
    <div style="display:grid;place-items:center;padding:8px 0 2px"><div class="brand-mark" style="width:94px;height:94px">${icon('help',42,true)}</div></div>
    <h3>${t('choose')}</h3>
    <div class="language-list">
      ${[['kn','ಕನ್ನಡ','Kannada'],['hi','हिन्दी','Hindi'],['en','English','English']].map(([code,native,en]) => `<button class="lang-card ${state.language===code?'selected':''}" data-language="${code}"><span class="lang-native">${native}</span><span class="lang-en">${en}</span></button>`).join('')}
    </div>
    <div class="status-pill" style="align-self:flex-start;background:var(--green-100);border:0">${icon('check',17)} ${state.language==='kn'?'ಹಣಕಾಸಿನ ಜಟಿಲ ಪದಗಳಿಲ್ಲ':state.language==='hi'?'कोई कठिन वित्तीय भाषा नहीं':'No financial jargon'}</div>
    <button class="btn primary full push" data-action="continue-trust">${t('continue')} ${icon('arrow',19)}</button>
  </main>`;
}

function trustScreen() {
  return `<main class="screen">
    ${header({back:true})}
    <h1>${t('safety')}</h1><p class="lede">${t('safetySupport')}</p>
    <section class="card">
      <h3>${t('neverAsk')}</h3>
      ${['OTP','PIN / CVV','Bank password','Aadhaar number'].map(x=>`<div class="safety-row"><div class="safety-icon">${icon('check',19)}</div><div><strong>${x}</strong><p class="support">${lt('ಸಾಥಿಯೊಂದಿಗೆ ಎಂದಿಗೂ ಹಂಚಿಕೊಳ್ಳಬೇಡಿ.','इसे साथी के साथ कभी साझा न करें।','Never share it with Saathi.')}</p></div></div>`).join('')}
    </section>
    <section class="card soft"><div style="display:flex;gap:13px;align-items:flex-start"><div class="safety-icon">${icon('shield',20)}</div><div><h3>${t('neverMove')}</h3><p class="support" style="margin-top:5px">${t('control')}</p></div></div></section>
    <button class="btn primary full push" data-action="trust-accept">${t('understand')}</button>
  </main>`;
}

function privacyScreen() {
  const settings = state.screen === 'settings';
  const draft = state.privacyDraft ?? state.privacy;
  return `<main class="screen">${header({back:true})}
    <h1>${pc(settings ? 'settings' : 'title')}</h1><p class="lede">${pc('intro')}</p>
    <section class="card soft"><p>${pc('prototype')}</p></section>
    <section class="card"><h3>${pc('localTitle')}</h3><p>${pc('local')}</p></section>
    <section class="card privacy-choices">
      <label class="task-check"><input type="checkbox" data-privacy="voice" ${draft.voice ? 'checked' : ''}><span><strong>${pc('voiceTitle')}</strong></span></label><p>${pc('voice')}</p>
      <label class="task-check"><input type="checkbox" data-privacy="research" ${draft.research ? 'checked' : ''}><span><strong>${pc('researchTitle')}</strong></span></label><p>${pc('research')}</p>
    </section>
    <p class="support">${pc('controls')}</p>
    ${state.privacyError ? `<p role="alert" class="card warning">${escapeHtml(state.privacyError)}</p>` : ''}
    <button class="btn primary full" data-action="save-privacy">${pc(settings ? 'save' : 'accept')}</button>
    ${!settings ? `<button class="btn secondary full" data-action="decline-privacy">${pc('decline')}</button>` : ''}
    <section class="card"><h3>${pc('language')}</h3><div class="language-list">${[['kn','ಕನ್ನಡ'],['hi','हिन्दी'],['en','English']].map(([code,label])=>`<button class="lang-card ${state.language===code?'selected':''}" data-language="${code}">${label}</button>`).join('')}</div></section>
    <section class="card"><h3>${pc('account')}</h3><p>${pc('exportHint')}</p><button class="btn secondary full" data-action="export-data">${pc('export')}</button><button class="btn secondary full danger" data-action="delete-data">${pc('remove')}</button></section>
    <section class="card"><h3>${pc('help')}</h3><p>${pc('contact')}</p><a href="mailto:niyaz@in60z.com">niyaz@in60z.com</a><p class="support">${pc('infrastructure')}</p></section>
    <p class="support">${pc('receipt')}: ${NOTICE_VERSION}${state.privacy.acceptedAt ? ` · ${escapeHtml(state.privacy.updatedAt)}` : ''}<br>${pc('version')}</p>
  </main>`;
}
function deleteScreen() {
  return `<main class="screen">${header()}<h1>${pc('deleteTitle')}</h1><p class="lede">${pc('deleteHint')}</p>${state.privacyError ? `<p role="alert">${escapeHtml(state.privacyError)}</p>` : ''}<button class="btn secondary full" data-action="export-data">${pc('export')}</button><button class="btn primary full danger" data-action="confirm-delete-data">${pc('confirmDelete')}</button><button class="btn secondary full" data-action="open-settings">${pc('cancel')}</button></main>`;
}
function declinedScreen() {
  return `<main class="screen">${header()}<h1>${pc('privacy')}</h1><p class="lede">${pc('declined')}</p><button class="btn secondary full" data-action="review-privacy">${pc('review')}</button></main>`;
}

function homeScreen() {
  const r = reserve();
  loadLocal();
  return `<main class="screen">
    ${header()}
    <div><h2>${pc('greeting')}</h2><p class="support" style="margin-top:4px">${t('morning')}</p></div>
    <button class="btn secondary full" data-action="open-settings">${pc('settings')}</button>
    <p class="support">${pc('intro')}</p>
    ${ledgerCard()}
    <section class="hero-card">
      <p class="support">${lt('ಉದಾಹರಣೆ ಪಾವತಿ ಯೋಜನೆ','उदाहरण भुगतान योजना','Example payment plan')}</p>
      <p class="kicker">${t('payment')}</p><div class="money">${money(state.payment.totalDue)}</div><p>${state.payment.dueDate} · ${state.payment.remainingDays} ${t('days')}</p>
      <div class="payment-breakdown"><div><span>${t('readyNow')}</span><strong>${money(state.payment.readyAmount)}</strong></div><div><span>${t('stillNeeded')}</span><strong>${money(r.remaining)}</strong></div></div>
      <div class="due-meta"><button class="calculation-link" data-action="explain-payment">${icon('info',17,true)} ${t('calculation')}</button><div style="text-align:right"><span class="support">${t('suggested')}</span><div style="font-size:22px;font-weight:850;margin-top:3px">${money(r.dailyReserve)}</div></div></div>
    </section>
    <button class="voice-card" data-action="voice-screen"><span class="voice-orb">${icon('mic',34,true)}</span><span class="voice-card-copy"><strong>${t('tellToday')}</strong><span>${t('tellSupport')}</span></span></button>
    <button class="btn secondary full" data-action="replay-onboarding">${lt('ಸಾಥಿ ಹೇಗೆ ಕೆಲಸ ಮಾಡುತ್ತದೆ?','साथी कैसे काम करता है?','How does Saathi work?')}</button>
    <div class="grid-2">
      <button class="action-card quick-action" data-action="bill-screen"><span><span class="action-icon">${icon('receipt',24)}</span><strong>${t('explainBill')}</strong></span></button>
      <button class="action-card quick-action" data-nav="ask"><span><span class="action-icon">${icon('help',24)}</span><strong>${t('ask')}</strong></span></button>
    </div>
    <div class="prototype-note vendor-hidden">All payment and bill data is fictional research data.</div>
    ${nav('home')}
  </main>`;
}

function voiceScreen() {
  const supported = audioCaptureSupported();
  const copy = VOICE_CONVERSATION_COPY[state.language] ?? VOICE_CONVERSATION_COPY.en;
  const isCollection = state.activeTurn === 'collection';
  const question = isCollection ? copy.collectionQuestion : copy.investmentQuestion;
  const listeningLabel = isCollection ? copy.collectionListening : copy.investmentListening;
  const confirming = state.voicePhase === 'confirm_amount' && Number.isFinite(state.pendingAmount);
  const transcribing = state.voicePhase === 'transcribing';
  const waiting = state.speaking || state.voicePhase === 'prompting' || state.voicePhase === 'requesting_mic' || transcribing;
  const title = confirming ? copy.confirmTitle : transcribing ? lt('ನಿಮ್ಮ ಮೊತ್ತವನ್ನು ಅರ್ಥಮಾಡಿಕೊಳ್ಳುತ್ತಿದ್ದೇನೆ…','आपकी रकम समझ रहा हूँ…','Understanding your amount…') : state.listening ? t('listening') : t('voiceTitle');
  const support = confirming ? t('nothingSaved') : transcribing ? lt('ಸಾಥಿ ಸುರಕ್ಷಿತವಾಗಿ ಧ್ವನಿಯನ್ನು ಪರಿಶೀಲಿಸುತ್ತಿದೆ.','साथी सुरक्षित रूप से आवाज़ जाँच रहा है।','Saathi is securely checking the recorded voice.') : state.listening ? listeningLabel : question;
  const example = isCollection ? copy.manualExampleCollection : copy.manualExampleInvestment;
  return `<main class="screen">
    ${header({back:true})}
    <h1>${title}</h1><p class="lede">${support}</p>
    ${!voiceAllowed() ? `<section class="card soft"><p>${pc('voiceOff')}</p><button class="btn secondary full" data-action="open-settings">${pc('settings')}</button></section>` : ''}
    <section class="voice-question-card">${icon('help',24,true)}<p>${question}</p></section>
    ${confirming ? `<section class="transcript-card" aria-live="polite"><span class="amount-kicker">${isCollection ? copy.collectionLabel : copy.investmentLabel}</span><div class="heard-amount">${money(state.pendingAmount)}</div><blockquote>${escapeHtml(state.transcript)}</blockquote></section><button class="btn primary full push" data-action="confirm-amount" ${state.speaking?'disabled':''}>${icon('check',20,true)} ${copy.yesCorrect}</button><button class="btn secondary full" data-action="reject-amount" ${state.speaking?'disabled':''}>${copy.noRepeat}</button>` : `<div class="mic-stage">
      <div class="wave ${state.listening||state.speaking?'active':''}" aria-hidden="true">${'<span></span>'.repeat(7)}</div>
      <button class="mic-button ${state.listening?'listening':''}" data-action="start-voice" aria-label="${t('startListening')}" ${(!voiceAllowed()||state.listening||waiting)?'disabled aria-pressed="true"':''}>${icon(state.speaking?'volume':'mic',44)}</button>
      <strong>${state.speaking ? t('voiceSpeaking') : state.listening ? t('listening') : copy.tapToRetry}</strong>
    </div>
    ${state.listening ? `<section class="live-transcript" aria-live="polite"><span>${lt('ಸಾಥಿ ಎಚ್ಚರಿಕೆಯಿಂದ ಕೇಳುತ್ತಿದೆ','साथी ध्यान से सुन रहा है','Saathi is listening carefully')}</span><p>${lt('ಮಾತನಾಡಿ — ಮುಗಿದ ನಂತರ ಸಾಥಿ ನಿಮ್ಮ ಮಾತನ್ನು ತೋರಿಸುತ್ತದೆ.','बोलिए — पूरा होने पर साथी आपकी बात दिखाएगा।','Speak naturally — Saathi will show the transcript when you finish.')}</p></section><button class="btn saffron full" data-action="finish-voice">${icon('check',20,true)} ${t('done')}</button>` : ''}
    ${!supported ? `<div class="card warning"><strong>${lt('ಈ ಬ್ರೌಸರ್‌ನಲ್ಲಿ ಸುರಕ್ಷಿತ ಧ್ವನಿ ಸೆರೆಹಿಡಿಯುವಿಕೆ ಲಭ್ಯವಿಲ್ಲ.','इस ब्राउज़र में सुरक्षित आवाज़ रिकॉर्डिंग उपलब्ध नहीं है।','Secure voice capture is not available in this browser.')}</strong><p class="support" style="margin-top:5px">${lt('ಕೆಳಗಿನ ಪಠ್ಯ ನಮೂದನ್ನು ಬಳಸಿ.','नीचे लिखकर दर्ज करें।','Use the manual entry below.')}</p></div>` : ''}
    <label class="input-label">${t('manual')}<textarea class="input" id="manual-transcript" placeholder="${example}" ${waiting?'disabled':''}>${escapeHtml(state.transcript)}</textarea></label>
    <div class="grid-2">${state.mode==='demo'?`<button class="btn secondary" data-action="sample-voice" ${waiting?'disabled':''}>${t('useSample')}</button>`:''}<button class="btn primary" data-action="manual-parse" ${waiting?'disabled':''}>${copy.reviewAmount}</button></div>`}
  </main>`;
}

function confirmScreen() {
  const needsReview = state.parsed.requiresReview || state.parsed.sales === null || state.parsed.stock === null;
  return `<main class="screen">
    ${header({back:true})}<h1>${t('moneyConfirm')}</h1><p class="lede">${state.structuredReveal === 0 ? t('interpreting') : lt('ಈ ಮೊತ್ತಗಳನ್ನು ಇಂದಿನ ಲೆಕ್ಕಕ್ಕೆ ಸೇರಿಸಲಾಗುತ್ತದೆ. ಈಗಾಗಲೇ ಉಳಿಸಿದ ಮೊತ್ತಗಳನ್ನು ಮತ್ತೆ ಹೇಳಬೇಡಿ.','ये रकम आज के हिसाब में जोड़ी जाएँगी। पहले सेव की गई रकम दोबारा न बताएं।','These amounts will be added to today. Do not include amounts already saved.')}</p>
    ${needsReview ? `<section class="card warning parser-warning">${icon('info',24,true)}<p><strong>${t('uncertain')}</strong><br>${t('lowConfidence')}</p></section>` : ''}
    <section class="card structured-card" aria-busy="${state.structuredReveal < 2}">
      <div class="amount-row structured-field ${state.structuredReveal >= 1?'shown':''}"><label>${t('sales')}</label><div><span style="font-size:24px;font-weight:850">₹</span><input id="confirm-sales" class="amount-input" type="number" inputmode="numeric" min="0" value="${state.parsed.sales ?? ''}" aria-label="${t('sales')}"></div></div>
      <div class="amount-row structured-field ${state.structuredReveal >= 2?'shown':''}"><label>${t('stock')}</label><div><span style="font-size:24px;font-weight:850">₹</span><input id="confirm-stock" class="amount-input" type="number" inputmode="numeric" min="0" value="${state.parsed.stock ?? ''}" aria-label="${t('stock')}"></div></div>
    </section>
    <section class="card soft" style="display:flex;gap:12px;align-items:center">${icon('shield',24)}<p>${t('nothingSaved')}</p></section>
    <button class="btn primary full push" data-action="confirm-daily" ${state.structuredReveal < 2?'disabled':''}>${t('finalConfirm')}</button>
    <button class="btn secondary full" data-action="review-transcript-again">${t('changeIt')}</button>
  </main>`;
}

function guidanceScreen() {
  const r = reserve();
  const progress = Math.min(100, Math.round((state.payment.readyAmount / state.payment.totalDue) * 100));
  return `<main class="screen">
    ${header({back:true})}
    <div class="guidance-summary"><h1>${t('guidance')}</h1><p class="lede" style="margin:auto">${t('guidanceSupport')}</p></div>
    <div class="progress-ring" style="--progress:${progress}%"><div class="progress-center"><strong>${progress}%</strong><span>${money(state.payment.readyAmount)} / ${money(state.payment.totalDue)}</span></div></div>
    <section class="hero-card"><p class="kicker">${t('keepAside')}</p><div class="money">${money(r.dailyReserve)}</div><p>${state.payment.remainingDays} ${t('days')}</p></section>
    <button class="btn secondary full" data-action="open-why">${icon('info',20)} ${state.language==='kn'?'ಈ ಮೊತ್ತ ಏಕೆ?':state.language==='hi'?'यह रकम क्यों?':'Why this amount?'}</button>
    <button class="btn saffron full" data-action="listen-guidance">${icon('volume',21,true)} ${t('listen')}</button>
    <button class="btn primary full push" data-nav="home">${t('home')}</button>
    ${state.whyOpen ? `<div class="bottom-sheet-backdrop" data-action="close-why"><section class="bottom-sheet" data-sheet><div class="sheet-handle"></div><h2>${state.language==='kn'?'₹120 ಹೇಗೆ ಬಂದಿದೆ?':state.language==='hi'?'₹120 कैसे निकला?':'How ₹120 is calculated'}</h2><div class="why-grid"><span>${state.language==='kn'?'ಬಾಕಿ ಮೊತ್ತ':state.language==='hi'?'बाकी रकम':'Remaining amount'}</span><strong>${money(r.remaining)}</strong><span>${state.language==='kn'?'ಉಳಿದ ದಿನಗಳು':state.language==='hi'?'बचे दिन':'Days remaining'}</span><strong>${state.payment.remainingDays}</strong><span>${state.language==='kn'?'ದಿನದ ಸಲಹೆ':state.language==='hi'?'आज का सुझाव':'Daily suggestion'}</span><strong>${money(r.dailyReserve)}</strong></div><p class="support">${money(r.remaining)} ÷ ${state.payment.remainingDays} = ${money(r.dailyReserve)} / ${state.language==='kn'?'ದಿನ':state.language==='hi'?'दिन':'day'}</p><button class="btn primary full" data-action="close-why">${state.language==='kn'?'ಸರಿ':state.language==='hi'?'ठीक है':'Got it'}</button></section></div>` : ''}
  </main>`;
}

function billCaptureScreen() {
  return `<main class="screen">
    ${header({back:true})}<h1>${t('bill')}</h1><p class="lede">${t('billSupport')}</p>
    <div class="camera-box">
      ${state.photoUrl ? `<img src="${state.photoUrl}" alt="Captured test bill preview" />` : `<div class="camera-placeholder">${icon('scan',48)}<strong>${state.language==='kn'?'ಬಿಲ್ ಅನ್ನು ಫ್ರೇಮ್ ಒಳಗೆ ಇಡಿ':state.language==='hi'?'बिल को फ्रेम के अंदर रखें':'Place the bill inside the frame'}</strong><span>${state.language==='kn'?'ನಾಲ್ಕು ಮೂಲೆಗಳೂ ಕಾಣುವಂತೆ ಇಡಿ':state.language==='hi'?'चारों कोने दिखाई दें':'Keep all four corners visible'}</span></div>`}
      ${!state.photoUrl ? `<span class="camera-corner tl"></span><span class="camera-corner tr"></span><span class="camera-corner bl"></span><span class="camera-corner br"></span>` : ''}
      <input class="camera-input" id="bill-photo" type="file" accept="image/*" capture="environment" />
    </div>
    <div class="capture-actions">
      <button class="btn primary full" data-action="take-photo">${icon('camera',22,true)} ${t('takePhoto')}</button>
      <button class="capture-secondary" data-action="choose-gallery">${icon('gallery',21)} ${state.language==='kn'?'ಗ್ಯಾಲರಿಯಿಂದ ಆಯ್ಕೆಮಾಡಿ':state.language==='hi'?'गैलरी से चुनें':'Choose from gallery'}</button>
    </div>
    ${state.photoUrl ? `<div class="status-pill" style="align-self:flex-start">${icon('check',17,true)} ${t('photoReady')}</div><button class="btn primary full" data-action="sample-bill">${icon('receipt',20)} ${t('sampleExtract')}</button><button class="btn secondary full" data-action="uncertain-bill">${icon('info',20)} ${t('uncertainDemo')}</button>` : ''}
  </main>`;
}

function billExplainedScreen() {
  const min = minimumExplanation();
  return `<main class="screen">
    ${header({back:true})}<h1>${t('billExplained')}</h1>
    <section class="card bill-grid">
      <div class="bill-item"><div class="bill-label">${t('used')}</div><div class="bill-value">${money(state.payment.totalDue)}</div></div>
      <div class="bill-item"><div class="bill-label">${t('payBy')}</div><div class="bill-value">${state.payment.dueDate}</div></div>
      <div class="bill-item"><div class="bill-label">${t('clearBill')}</div><div class="bill-value">${money(state.payment.totalDue)}</div></div>
    </section>
    <section class="card warning"><h3>${t('minimum')}: ${money(state.payment.minimumDue)}</h3><p class="support" style="margin-top:7px">Paying only ${money(state.payment.minimumDue)} does not clear the full bill. ${money(min.remainingIfMinimumPaid)} would remain.</p></section>
    <button class="btn secondary full" data-action="toggle-source">${icon('info',19)} ${t('source')}</button>
    <div class="source-card ${state.sourceOpen?'open':''}"><strong>${lt('ಪರೀಕ್ಷಾ ಬಿಲ್ ಮೂಲ','परीक्षण बिल स्रोत','Test bill source')}</strong><p style="margin-top:5px">${lt('ಬಿಲ್ ದಿನಾಂಕ','बिल की तारीख','Statement date')}: ${state.payment.statementDate}.</p></div>
    <button class="btn secondary full" data-action="listen-bill">${icon('volume',20)} ${t('listen')}</button>
    <button class="btn primary full push" data-action="ask-bill">${icon('mic',20)} ${t('askBill')}</button>
  </main>`;
}

function askScreen() {
  const qs = [t('dueQuestion'),t('reserveQuestion'),t('minimumQuestion'),t('trackQuestion')];
  return `<main class="screen">
    ${header()}<h1>${t('askTitle')}</h1><p class="lede">${t('askSupport')}</p>
    <div class="chips">${qs.map((q,i)=>`<button class="chip" data-question="${i}">${q}</button>`).join('')}</div>
    <div class="chat">
      ${state.question ? `<div class="bubble user">${escapeHtml(state.question)}</div>` : ''}
      ${state.answer ? `<div class="bubble saathi"><strong>Saathi</strong><p style="margin-top:5px">${escapeHtml(state.answer)}</p><button class="btn ghost" style="margin-top:10px;min-height:42px" data-action="listen-answer">${icon('volume',17)} ${t('listen')}</button></div>` : `<div class="card soft"><p>${lt('ಈ ಪಾವತಿ ಅಥವಾ ಬಿಲ್ ಬಗ್ಗೆ ಒಂದು ಪ್ರಶ್ನೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ.','इस भुगतान या बिल के बारे में एक सवाल चुनें।','Choose a question about this payment or bill.')}</p></div>`}
    </div>
    ${nav('ask')}
  </main>`;
}

function ledgerCard() {
  if(state.ledgerError) return `<section class="card warning" role="alert">${lt('ಉಳಿಸಿದ ಲೆಕ್ಕವನ್ನು ಓದಲಾಗಲಿಲ್ಲ. ಈ ಸಾಧನದ ಡೇಟಾವನ್ನು ಅಳಿಸಬೇಡಿ.','सेव किया हिसाब नहीं पढ़ सका। इस डिवाइस का डेटा न मिटाएँ।','Saved history could not be read. Do not clear this device’s data.')}</section>`;
  const totals=dailyTotals(state.ledger);
  return `<section class="card daily-ledger" aria-live="polite" data-testid="daily-ledger"><h3>${lt('ಇಂದಿನ ಹಣದ ಲೆಕ್ಕ','आज का पैसे का हिसाब','Daily Money Memory')}</h3>
    <div class="amount-row"><span>${lt('ಬಂದ ಹಣ','आया पैसा','Money in')}</span><strong data-testid="money-in">${money(totals.moneyIn)}</strong></div>
    <div class="amount-row"><span>${lt('ವ್ಯಾಪಾರದ ಖರ್ಚು','कारोबार का खर्च','Business spending')}</span><strong data-testid="business-expense">${money(totals.businessExpense)}</strong></div>
    <div class="amount-row daily-net"><span>${lt('ಇಂದಿನ ನಿವ್ವಳ ಹಣ','आज की शुद्ध रकम','Net today')}</span><strong data-testid="net-today">${money(totals.net)}</strong></div>
    <p class="support">${lt('ದೃಢೀಕರಿಸಿದ ದಾಖಲೆಗಳ ಲೆಕ್ಕ ಮಾತ್ರ. ಬ್ಯಾಂಕ್ ಖಾತೆಯಿಂದ ಹಣ ಕಡಿತವಾಗುವುದಿಲ್ಲ.','केवल पुष्टि किए रिकॉर्ड का हिसाब। बैंक खाते से पैसे नहीं कटते।','Based on confirmed entries. No money is moved from your bank account.')}</p></section>`;
}
function activityScreen() {
  loadLocal();
  const label=e=>e.type==='money_in'?lt('ಬಂದ ಹಣ','आया पैसा','Money in'):e.type==='business_expense'?lt('ವ್ಯಾಪಾರದ ಖರ್ಚು','कारोबार का खर्च','Business spending'):lt('ತಿದ್ದುಪಡಿ','सुधार','Correction');
  return `<main class="screen">${header()}<h1>${t('activity')}</h1>${ledgerCard()}
    <section class="card">${state.ledger.events.length ? [...state.ledger.events].reverse().slice(0,40).map(e=>`<div class="activity-row"><div><strong>${label(e)}</strong><span style="display:block">${escapeHtml(e.day)}</span></div><div><strong>${money(e.type==='adjustment'?e.amount:effectiveAmount(state.ledger,e.id))}</strong>${e.type!=='adjustment'?`<button class="btn secondary" data-action="edit-entry" data-id="${escapeHtml(e.id)}">${t('change')}</button>`:''}</div></div>`).join('') : `<p>${t('noActivity')}</p>`}</section>
    ${state.correctionId?`<section class="card" id="correction-form"><label>${lt('ಸರಿಯಾದ ಮೊತ್ತ','सही रकम','Correct amount')}<input class="input" id="correction-value" type="number" min="0" step="1" value="${state.correctionAmount}"></label><p>${lt('ದೃಢೀಕರಿಸಿದ ನಂತರ ತಿದ್ದುಪಡಿ ದಾಖಲಿಸಲಾಗುತ್ತದೆ. ಮೂಲ ದಾಖಲೆ ಉಳಿಯುತ್ತದೆ.','पुष्टि के बाद सुधार दर्ज होगा। मूल रिकॉर्ड रहेगा।','Confirm to append a correction. The original record remains.')}</p><button class="btn primary full" data-action="save-correction">${t('yesSave')}</button><button class="btn secondary full" data-action="cancel-correction">${lt('ರದ್ದು','रद्द','Cancel')}</button></section>`:''}
    <p class="support">${lt('ಈ ಸಾಧನದಲ್ಲಿ ಮಾತ್ರ ಉಳಿಸಲಾಗಿದೆ. ಇತ್ತೀಚಿನ 40 ದಾಖಲೆಗಳನ್ನು ತೋರಿಸಲಾಗಿದೆ.','केवल इस डिवाइस पर सेव है। नवीनतम 40 रिकॉर्ड दिखते हैं।','Saved on this device only. Showing the latest 40 events; totals include all entries.')}</p>${nav('activity')}</main>`;
}

function offlineScreen() {
  return `<main class="screen">${header({back:true})}<h1>${t('offline')}</h1><p class="lede">${t('offlineSupport')}</p><section class="card soft" style="text-align:center;padding:34px">${icon('wifiOff',54)}<h3 style="margin-top:16px">${lt('ಮೊದಲ ಬಳಕೆಯ ನಂತರ ಆಫ್‌ಲೈನ್‌ನಲ್ಲೂ ಲಭ್ಯ','पहली बार खुलने के बाद ऑफ़लाइन भी उपलब्ध','Available offline after first load')}</h3><p class="support" style="margin-top:8px">${lt('ಉಳಿಸಿದ ಪಾವತಿ ಮಾಹಿತಿ ಮತ್ತು ದೃಢೀಕರಿಸಿದ ಚಟುವಟಿಕೆಯನ್ನು ನೋಡಬಹುದು.','सेव की गई भुगतान जानकारी और गतिविधि देख सकते हैं।','Review saved payment information and confirmed activity.')}</p></section><button class="btn primary full push" data-nav="home">${t('home')}</button></main>`;
}

function uncertainScreen() {
  return `<main class="screen">${header({back:true})}<h1>${t('uncertain')}</h1><p class="lede">${t('uncertainSupport')}</p><section class="card"><p class="support">${t('dueReadable')}</p><div class="bill-value">${state.payment.dueDate}</div><div style="height:1px;background:var(--line);margin:16px 0"></div><p class="support">${t('amountUnclear')}</p></section><section class="card warning"><p class="bill-label">${t('possible')}</p><div class="bill-value">₹8,400 ?</div><span class="status-pill">${icon('info',15)} ${t('needsConfirm')}</span></section><label class="input-label">${t('manualAmount')}<input class="input" id="manual-bill-amount" type="number" inputmode="numeric" min="1" placeholder="8400"></label><button class="btn primary full" data-action="confirm-bill-manual">${t('confirmAmount')}</button><button class="btn secondary full" data-action="bill-screen">${t('retake')}</button></main>`;
}

function researchDrawer() {
  if (!state.researchOpen) return '';
  if (!readPrivacy(localStorage).research) return `<div class="drawer-backdrop"><aside class="drawer" role="dialog" aria-modal="true" aria-label="Research controls"><h2>${pc('researchTitle')}</h2><p>${pc('research')}</p><button class="btn secondary full" data-action="close-research">${t('close')}</button><button class="btn primary full" data-action="open-settings">${pc('settings')}</button></aside></div>`;
  const taskNames = ['Start without coaching','Complete voice entry','Confirm money','Find amount due','Find due date','Explain minimum due','Handle uncertain read','Find source/provenance','Understand offline limits'];
  return `<div class="drawer-backdrop" data-action="close-research"><aside class="drawer" role="dialog" aria-modal="true" aria-label="Research controls" data-drawer>
    <div class="drawer-header"><div><p class="kicker">Operator controls</p><h2>Research session</h2></div><button class="btn icon-only secondary" data-action="close-research" aria-label="Close">×</button></div>
    <div class="drawer-section"><strong>${state.session.id}</strong><p class="support">Started ${new Date(state.session.startedAt).toLocaleString()}</p><div class="grid-2"><button class="btn ${state.mode==='field'?'primary':'secondary'}" data-mode="field">Field</button><button class="btn ${state.mode==='demo'?'primary':'secondary'}" data-mode="demo">Demo</button></div></div>
    <div class="drawer-section"><strong>Tasks</strong>${taskNames.map((name,i)=>`<label class="task-check"><input type="checkbox" data-task-index="${i}" ${state.research.tasks[i]?'checked':''}/><span>T${i+1} · ${name}</span></label>`).join('')}</div>
    <div class="drawer-section"><label class="task-check"><input type="checkbox" data-research-field="helpNeeded" ${state.research.helpNeeded?'checked':''}/><span>Needed researcher help</span></label><label class="input-label">Trust concern<textarea class="input" data-research-field="trustConcern">${escapeHtml(state.research.trustConcern)}</textarea></label><label class="input-label">Would use again<select class="input" data-research-field="wouldUseAgain"><option value="">Not answered</option><option value="yes" ${state.research.wouldUseAgain==='yes'?'selected':''}>Yes</option><option value="no" ${state.research.wouldUseAgain==='no'?'selected':''}>No</option><option value="unsure" ${state.research.wouldUseAgain==='unsure'?'selected':''}>Unsure</option></select></label><label class="input-label">Exact vendor quote<textarea class="input" data-research-field="quote">${escapeHtml(state.research.quote)}</textarea></label><label class="input-label">Notes<textarea class="input" data-research-field="notes">${escapeHtml(state.research.notes)}</textarea></label><div class="prototype-note">${t('privacyNote')}</div></div>
    <div class="drawer-section"><button class="btn primary full" data-action="export-session">${icon('download',19)} ${t('export')}</button><button class="btn secondary full" data-action="new-session">New participant session</button></div>
  </aside></div>`;
}

function escapeHtml(value='') {
  return String(value).replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
}

function screenHtml() {
  const map = { privacy:privacyScreen, settings:privacyScreen, deleteData:deleteScreen, declined:declinedScreen, language:welcomeScreen, trust:trustScreen, home:homeScreen, voice:voiceScreen, confirm:confirmScreen, guidance:guidanceScreen, billCapture:billCaptureScreen, billExplained:billExplainedScreen, ask:askScreen, activity:activityScreen, offline:offlineScreen, uncertain:uncertainScreen };
  return (map[state.screen] ?? homeScreen)();
}

function render() {
  document.documentElement.lang = state.language;
  root.innerHTML = `<div class="phone" data-language="${state.language}">${!state.online ? `<div class="offline-banner">${icon('wifiOff',16)} ${t('offlineSupport')} <button class="chip" data-action="offline-screen" style="min-height:30px;padding:4px 8px">${lt('ವಿವರ','विवरण','Details')}</button></div>` : ''}${screenHtml()}${researchDrawer()}</div>`;
}

function go(screen) {
  if (screen !== state.screen) { stopSpeech(); state.speaking=false; }
  if (state.screen === 'voice' && screen !== 'voice') { state.conversationRun += 1; stopActiveCapture(); stopSpeech(); state.listening=false; state.speaking=false; }
  if (!readPrivacy(localStorage).acceptedAt && !['language','trust','privacy','declined','deleteData'].includes(screen)) screen = 'privacy';
  state.screen = screen;
  state.sourceOpen = false;
  state.whyOpen = false;
  log('screen_view', { screen });
  render();
}

const voiceCopy = () => VOICE_CONVERSATION_COPY[state.language] ?? VOICE_CONVERSATION_COPY.en;
const wait = (delayMs) => new Promise((resolve) => setTimeout(resolve, delayMs));

function paymentExplanationText() {
  const r = reserve();
  return lt(
    `ಒಟ್ಟು ಪಾವತಿ ${money(state.payment.totalDue)}. ಈಗ ${money(state.payment.readyAmount)} ಸಿದ್ಧವಾಗಿದೆ. ಇನ್ನೂ ${money(r.remaining)} ಬೇಕಾಗಿದೆ. ${money(r.remaining)} ಅನ್ನು ${state.payment.remainingDays} ದಿನಗಳಿಗೆ ಹಂಚಿದರೆ ದಿನಕ್ಕೆ ${money(r.dailyReserve)}.`,
    `कुल भुगतान ${money(state.payment.totalDue)} है। अभी ${money(state.payment.readyAmount)} तैयार हैं। ${money(r.remaining)} बाकी हैं। ${money(r.remaining)} को ${state.payment.remainingDays} दिनों में बाँटने पर रोज़ ${money(r.dailyReserve)} होते हैं।`,
    `The total payment is ${money(state.payment.totalDue)}. You already have ${money(state.payment.readyAmount)} ready. ${money(r.remaining)} remains. ${money(r.remaining)} divided across ${state.payment.remainingDays} days is ${money(r.dailyReserve)} per day.`
  );
}

async function playSaathiSpeech(text, eventName) {
  if (!voiceAllowed()) return { ok:false, provider:'consent-disabled' };
  state.speaking = true;
  render();
  notify(t('voicePreparing'));
  const result = await speak(text, state.language);
  state.speaking = false;
  render();
  if (eventName) log(eventName, { provider:result.provider, durationMs:result.durationMs ?? 0 });
  if (result.provider === 'cancelled') return result;
  if (!result.ok) notify(t('voiceUnavailable'));
  else if (result.provider === 'device-offline-fallback') notify(t('voiceFallback'));
  return result;
}

async function playPrompt(text, { turn, kind } = {}) {
  log('prompt_started', { turn, note:kind });
  const result = await playSaathiSpeech(text, null);
  log('prompt_finished', {
    turn,
    note:kind,
    provider:result?.provider ?? 'none',
    durationMs:Math.max(0, Math.round(result?.durationMs ?? 0)),
    audioStartMs:Math.max(0, Math.round(result?.audioStartMs ?? 0))
  });
  return result;
}

function answerFor(index) {
  const r = reserve();
  const min = minimumExplanation();
  const answers = {
    kn: [
      `${state.payment.dueDate} ರಂದು ಪಾವತಿಸಬೇಕು.`,
      `ಇಂದು ${money(r.dailyReserve)} ಬೇರ್ಪಡಿಸುವ ಸಲಹೆ ಇದೆ.`,
      `${money(state.payment.minimumDue)} ಕನಿಷ್ಠ ಪಾವತಿ. ಅದನ್ನು ಮಾತ್ರ ಪಾವತಿಸಿದರೆ ${money(min.remainingIfMinimumPaid)} ಬಾಕಿ ಉಳಿಯುತ್ತದೆ.`,
      paymentExplanationText()
    ],
    hi: [
      `आपको ${state.payment.dueDate} तक भुगतान करना है।`,
      `आज ${money(r.dailyReserve)} अलग रखने का सुझाव है।`,
      `${money(state.payment.minimumDue)} न्यूनतम देय है। केवल इतना चुकाने पर ${money(min.remainingIfMinimumPaid)} बाकी रहेगा।`,
      paymentExplanationText()
    ],
    en: [
      `Your payment is due on ${state.payment.dueDate}.`,
      `The deterministic suggestion for today is ${money(r.dailyReserve)}.`,
      `${money(state.payment.minimumDue)} is the minimum due. Paying only that would leave ${money(min.remainingIfMinimumPaid)} unpaid.`,
      paymentExplanationText()
    ]
  };
  return answers[state.language]?.[index] ?? answers.en[index];
}

let audioCapture = null;
let transcriptionController = null;
let revealTimers = [];

function stopActiveCapture() {
  transcriptionController?.abort();
  transcriptionController=null;
  const capture = audioCapture;
  audioCapture = null;
  try { capture?.cancel(); } catch {}
}

function resetVoiceConversation() {
  state.conversationRun += 1;
  stopActiveCapture();
  stopSpeech();
  state.listening = false;
  state.speaking = false;
  state.voicePhase = 'idle';
  state.activeTurn = 'collection';
  state.pendingAmount = null;
  state.confirmedAmounts = { collection:null, investment:null };
  state.transcript = '';
  state.parsed = { sales:null, stock:null, confidence:'high', rawNumbers:[], requiresReview:false };
  state.entryBatchId = crypto.randomUUID();
  voiceWorkflow.start();
  return state.conversationRun;
}

function conversationIsActive(run) {
  return state.screen === 'voice' && state.conversationRun === run;
}

function promptFor(turn) {
  const copy = voiceCopy();
  return turn === 'collection' ? copy.collectionQuestion : copy.investmentQuestion;
}

function confirmationFor(turn, amount) {
  const copy = voiceCopy();
  const formatted = new Intl.NumberFormat('en-IN', { maximumFractionDigits:0 }).format(amount);
  return turn === 'collection' ? copy.heardCollection(formatted) : copy.heardInvestment(formatted);
}

function preloadConversationSpeech() {
  if (!voiceAllowed()) return Promise.resolve(0);
  const copy = voiceCopy();
  return preloadSpeech([state.ledger.onboarding_completed ? copy.greeting : copy.onboarding, copy.collectionQuestion, copy.investmentQuestion], state.language);
}

async function promptAndListen(turn, prompt, run = state.conversationRun, kind = 'question') {
  if (!conversationIsActive(run)) return;
  voiceWorkflow.prepareTurn(turn);
  state.activeTurn = turn;
  state.pendingAmount = null;
  state.transcript = '';
  state.voicePhase = 'prompting';
  render();
  await runPromptThenListen({
    prompt,
    speakPrompt:() => playPrompt(prompt, { turn, kind }),
    waitForGuard:() => wait(120),
    startListening:() => startListeningTurn(turn, run)
  });
}

async function startVoiceConversation() {
  const run = resetVoiceConversation();
  state.voicePhase = 'prompting';
  render();
  await playPrompt(state.ledger.onboarding_completed ? voiceCopy().greeting : voiceCopy().onboarding, { turn:'greeting', kind:'greeting' });
  if (!conversationIsActive(run)) return;
  await promptAndListen('collection', promptFor('collection'), run);
}

async function startListeningTurn(turn, run = state.conversationRun) {
  if (!conversationIsActive(run)) return;
  if (!voiceAllowed()) { state.voicePhase='idle'; render(); return; }
  if (!audioCaptureSupported()) {
    state.voicePhase = 'idle';
    render();
    notify(lt('ಧ್ವನಿ ಸೆರೆಹಿಡಿಯುವಿಕೆ ಲಭ್ಯವಿಲ್ಲ — ಕೆಳಗೆ ಟೈಪ್ ಮಾಡಿ.','आवाज़ रिकॉर्डिंग उपलब्ध नहीं है — नीचे लिखें।','Voice capture is unavailable — type below.'));
    return;
  }
  stopActiveCapture();
  state.listening = false;
  state.voicePhase = 'requesting_mic';
  state.transcript = '';
  state.listeningStartedAt = Date.now();
  const capture = new VoiceAudioCapture({
    silenceMs:2300,
    hardTimeoutMs:29000,
    onSpeech:() => log('speech_started', { turn }),
    onFinish:(result) => {
      if (audioCapture === capture) audioCapture = null;
      void finishListeningTurn(turn, result, run);
    },
    onError:(reason) => log('voice_error', { reason, turn })
  });
  audioCapture = capture;
  render();
  const started = await capture.start();
  if (!conversationIsActive(run) || state.activeTurn !== turn) {
    capture.cancel();
    return;
  }
  if (!started) {
    if (audioCapture === capture) audioCapture = null;
    state.listening = false;
    state.voicePhase = 'idle';
    notify(lt('ಮೈಕ್ರೊಫೋನ್ ತೆರೆಯಲಾಗಲಿಲ್ಲ — ಕೆಳಗೆ ಟೈಪ್ ಮಾಡಿ.','माइक्रोफ़ोन नहीं खुला — नीचे लिखें।','The microphone could not start — type below.'));
    render();
    return;
  }
  state.listening = true;
  state.voicePhase = `listening_${turn}`;
  log('listening_started', { turn, provider:'media_recorder' });
  render();
}

async function finishListeningTurn(turn, { reason = 'manual', transcript = '', audio = null } = {}, run = state.conversationRun) {
  if (!conversationIsActive(run) || state.activeTurn !== turn) return;
  state.listening = false;
  const durationMs = state.listeningStartedAt ? Date.now() - state.listeningStartedAt : 0;
  let value = String(transcript ?? '').trim();
  log('turn_finished', { turn, reason, durationMs:Math.max(0, Math.round(durationMs)) });
  if (!value && audio?.size) {
    state.voicePhase = 'transcribing';
    render();
    const transcriptionStartedAt = Date.now();
    log('transcription_started', { turn, provider:'sarvam-saaras-v4' });
    if (!voiceAllowed()) return;
    transcriptionController = new AbortController();
    const transcription = await transcribeRecordedAudio(audio, state.language, {signal:transcriptionController.signal});
    log('transcription_finished', {
      turn,
      provider:transcription.provider,
      success:transcription.ok,
      durationMs:Math.max(0, Date.now() - transcriptionStartedAt)
    });
    if (!conversationIsActive(run) || state.activeTurn !== turn) return;
    value = transcription.transcript;
  }
  state.transcript = value;
  if (!value) {
    notify(t('noSpeech'));
    await promptAndListen(turn, voiceCopy().repeatAmount, run, 'repeat');
    return;
  }
  const parsed = parseCurrencyAmount(value, { language:state.language });
  log('amount_parsed', { turn, confidence:parsed.confidence });
  const captured = voiceWorkflow.captureAmount({ turn, transcript:value, parsed });
  if (!captured.accepted) {
    notify(voiceCopy().repeatAmount);
    await promptAndListen(turn, voiceCopy().repeatAmount, run, 'repeat');
    return;
  }
  state.pendingAmount = captured.amount;
  state.voicePhase = 'confirm_amount';
  render();
  await playPrompt(confirmationFor(turn, captured.amount), { turn, kind:'amount_confirmation' });
}

function scheduleStructuredReveal() {
  for (const timer of revealTimers) clearTimeout(timer);
  revealTimers = [
    setTimeout(() => {
      if (state.screen !== 'confirm') return;
      state.structuredReveal = 1;
      render();
    }, 240),
    setTimeout(() => {
      if (state.screen !== 'confirm') return;
      state.structuredReveal = 2;
      render();
      log('structured_values_shown', { confidence:state.parsed.confidence });
    }, 760)
  ];
}

root.addEventListener('click', async (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.closest('[data-drawer]') && button.dataset.action === 'close-research') event.stopPropagation();
  if (button.closest('[data-sheet]') && button.dataset.action === 'close-why') event.stopPropagation();

  if (button.dataset.language) {
    state.language = button.dataset.language;
    log('language_selected', { note:state.language });
    render(); return;
  }
  if (button.dataset.nav) { go(button.dataset.nav); return; }
  if (button.dataset.mode) { state.mode = button.dataset.mode; log('mode_changed',{note:state.mode}); render(); return; }
  if (button.dataset.question !== undefined) {
    const index = Number(button.dataset.question);
    const qs=[t('dueQuestion'),t('reserveQuestion'),t('minimumQuestion'),t('trackQuestion')];
    state.question=qs[index]; state.answer=answerFor(index); log('bounded_question',{task:`q${index+1}`});
    await playSaathiSpeech(state.answer, 'answer_played'); return;
  }

  switch(button.dataset.action) {
    case 'open-settings': state.researchOpen=false; state.privacyDraft={...state.privacy}; state.privacyError=''; go('settings'); break;
    case 'review-privacy': state.privacyDraft={...state.privacy}; go('privacy'); break;
    case 'decline-privacy': state.privacyDraft=null; go('declined'); break;
    case 'save-privacy': {
      try {
        const draft=state.privacyDraft ?? state.privacy;
        state.privacy=savePrivacy(localStorage,{language:state.language,voice:draft.voice,research:draft.research});
        if (!state.privacy.voice) { stopActiveCapture(); stopSpeech(); }
        if (!state.privacy.research) { deleteResearchData(localStorage); state.events=[]; state.research={tasks:Array(9).fill(false),helpNeeded:false,trustConcern:'',wouldUseAgain:'',quote:'',notes:''}; }
        state.privacyDraft=null; state.privacyError=''; go('home'); notify(pc('saved'));
      } catch { state.privacyError=pc('error'); render(); }
      break;
    }
    case 'export-data': {
      try { downloadJson(exportLocalData(localStorage),'saathi-my-data.json'); }
      catch { notify(pc('error')); }
      break;
    }
    case 'delete-data': state.privacyError=''; go('deleteData'); break;
    case 'confirm-delete-data': {
      stopActiveCapture(); stopSpeech(); state.conversationRun+=1;
      try {
        const remove=()=>deleteLocalData(localStorage);
        if(navigator.locks) await navigator.locks.request('saathi-ledger',remove); else remove();
        location.reload();
      } catch { state.privacy=defaultPrivacy(); state.privacyError=pc('deleteError'); render(); }
      break;
    }
    case 'continue-trust': go('trust'); break;
    case 'trust-accept': state.privacyDraft={...state.privacy}; go('privacy'); break;
    case 'change-language': go('language'); break;
    case 'operator-tap': state.operatorTapCount += 1; if (state.operatorTapCount >= 5) { state.operatorTapCount=0; state.researchOpen=true; log('operator_unlocked'); render(); } break;
    case 'back': historyBack(); break;
    case 'replay-onboarding': await playSaathiSpeech(voiceCopy().onboarding, 'onboarding_replayed'); break;
    case 'edit-entry': state.correctionId=button.dataset.id; state.correctionAmount=effectiveAmount(state.ledger,state.correctionId); render(); document.querySelector('#correction-form')?.scrollIntoView({behavior:'smooth'}); break;
    case 'cancel-correction': state.correctionId=null; render(); break;
    case 'save-correction': {
      const raw=document.querySelector('#correction-value')?.value;
      if(raw==='' || raw==null || !Number.isSafeInteger(Number(raw)) || Number(raw)<0) { notify(t('confirmBoth')); break; }
      if(state.saving) break; state.saving=true;
      try {
        const id=state.correctionId; const correction=crypto.randomUUID();
        const write=()=>{ if(!readPrivacy(localStorage).acceptedAt) throw Error('Consent required'); state.ledger=correctEntry(localStorage,id,Number(raw),correction); };
        if(navigator.locks) await navigator.locks.request('saathi-ledger',write); else write();
        state.correctionId=null; render();
      } catch { notify(t('saveFailed')); } finally { state.saving=false; }
      break;
    }
    case 'voice-screen': {
      void preloadConversationSpeech();
      go('voice');
      state.voiceIntroduced = true;
      await startVoiceConversation();
      break;
    }
    case 'bill-screen': go('billCapture'); break;
    case 'open-research': state.researchOpen=true; render(); break;
    case 'close-research': state.researchOpen=false; render(); break;
    case 'offline-screen': go('offline'); break;
    case 'open-why': state.whyOpen=true; render(); break;
    case 'explain-payment': go('guidance'); state.whyOpen=true; render(); break;
    case 'close-why': state.whyOpen=false; render(); break;
    case 'take-photo': document.querySelector('#bill-photo')?.click(); break;
    case 'choose-gallery': { const input=document.querySelector('#bill-photo'); if(input){input.removeAttribute('capture'); input.click();} break; }
    case 'sample-voice': {
      state.transcript = state.activeTurn === 'collection'
        ? state.language==='kn' ? 'ಒಂದು ಸಾವಿರ ಆರು ನೂರು' : state.language==='hi' ? 'एक हजार छह सौ' : 'one thousand six hundred'
        : state.language==='kn' ? 'ಒಂಬತ್ತು ನೂರು' : state.language==='hi' ? 'नौ सौ' : 'nine hundred';
      log('demo_voice_used');
      stopActiveCapture();
      await finishListeningTurn(state.activeTurn, { reason:'manual', transcript:state.transcript });
      break;
    }
    case 'manual-parse': {
      const text = document.querySelector('#manual-transcript')?.value?.trim() || '';
      if (!text) { notify(t('noSpeech')); return; }
      stopActiveCapture();
      await finishListeningTurn(state.activeTurn, { reason:'manual', transcript:text });
      break;
    }
    case 'start-voice': {
      if (state.listening || state.speaking) return;
      await promptAndListen(state.activeTurn, promptFor(state.activeTurn));
      break;
    }
    case 'finish-voice': {
      if (!state.listening || !audioCapture) return;
      const typed = document.querySelector('#manual-transcript')?.value?.trim();
      if (typed) {
        stopActiveCapture();
        await finishListeningTurn(state.activeTurn, { reason:'manual', transcript:typed });
      } else audioCapture.finish('manual');
      break;
    }
    case 'confirm-amount': {
      if (state.voicePhase !== 'confirm_amount' || state.speaking) return;
      stopSpeech();
      const turn = state.activeTurn;
      const amount = voiceWorkflow.confirmAmount(turn);
      state.confirmedAmounts[turn] = amount;
      state.pendingAmount = null;
      log('amount_confirmed', { turn, confidence:'high' });
      if (turn === 'collection') {
        await promptAndListen('investment', promptFor('investment'));
      } else {
        state.parsed = {
          sales:state.confirmedAmounts.collection,
          stock:state.confirmedAmounts.investment,
          confidence:'high',
          rawNumbers:[state.confirmedAmounts.collection, state.confirmedAmounts.investment],
          requiresReview:false
        };
        state.structuredReveal = 0;
        go('confirm');
        scheduleStructuredReveal();
      }
      break;
    }
    case 'reject-amount': {
      if (state.voicePhase !== 'confirm_amount' || state.speaking) return;
      stopSpeech();
      const turn = state.activeTurn;
      voiceWorkflow.rejectAmount(turn);
      state.pendingAmount = null;
      log('amount_rejected', { turn });
      await promptAndListen(turn, voiceCopy().repeatAmount, state.conversationRun, 'repeat');
      break;
    }
    case 'review-transcript-again': go('voice'); await startVoiceConversation(); break;
    case 'confirm-daily': {
      if(state.saving) return;
      const salesInput=document.querySelector('#confirm-sales')?.value?.trim() ?? '';
      const stockInput=document.querySelector('#confirm-stock')?.value?.trim() ?? '';
      const sales=Number(salesInput);
      const stock=Number(stockInput);
      if (!salesInput||!stockInput||!Number.isSafeInteger(sales)||sales<0||!Number.isSafeInteger(stock)||stock<0) { notify(t('confirmBoth')); return; }
      state.saving=true;
      log('final_record_confirmed',{confidence:state.parsed.confidence});
      try {
        await voiceWorkflow.confirmRecord({ collection:sales, investment:stock, label:lt('ಇಂದು','आज','Today') });
        log('persistence_success',{success:true,source:'local_storage'});
        go('home');
      } catch {
        log('persistence_failure',{success:false,source:'local_storage',reason:'storage_unavailable'});
        notify(t('saveFailed'));
      } finally { state.saving=false; }
      break;
    }
    case 'listen-guidance': {
      await playSaathiSpeech(paymentExplanationText(), 'guidance_played'); break;
    }
    case 'sample-bill': state.billRead='confirmed'; log('bill_sample_confirmed',{source:'fictional_test_statement'}); go('billExplained'); break;
    case 'uncertain-bill': state.billRead='uncertain'; log('bill_uncertain',{confidence:'low'}); go('uncertain'); break;
    case 'toggle-source': state.sourceOpen=!state.sourceOpen; log('provenance_toggled',{source:'fictional_test_statement'}); render(); break;
    case 'listen-bill': { const text=`${money(state.payment.totalDue)}. ${t('payBy')} ${state.payment.dueDate}.`; await playSaathiSpeech(text, 'bill_played'); break; }
    case 'ask-bill': go('ask'); break;
    case 'listen-answer': await playSaathiSpeech(state.answer||'', 'answer_replayed'); break;
    case 'confirm-bill-manual': {
      const value=Number(document.querySelector('#manual-bill-amount')?.value);
      if(!Number.isFinite(value)||value<=0){notify('Enter the amount you can clearly read.');return;}
      state.payment.totalDue=Math.round(value); state.billRead='manual_confirmed'; log('bill_amount_manually_confirmed',{source:'manual_confirmation'}); go('billExplained'); break;
    }
    case 'export-session': exportSession(); break;
    case 'new-session': newSession(); break;
  }
});

root.addEventListener('change', (event) => {
  if (event.target.id === 'bill-photo') {
    const file = event.target.files?.[0];
    if (!file) return;
    if (state.photoUrl) URL.revokeObjectURL(state.photoUrl);
    state.photoUrl = URL.createObjectURL(file);
    log('bill_photo_captured',{note:file.type||'image'}); render(); return;
  }
  const taskIndex = event.target.dataset.taskIndex;
  if (taskIndex !== undefined) {
    state.research.tasks[Number(taskIndex)] = event.target.checked;
    saveResearch(); return;
  }
  const field = event.target.dataset.researchField;
  if (field) {
    state.research[field] = event.target.type==='checkbox' ? event.target.checked : event.target.value;
    saveResearch();
  }
});
root.addEventListener('change', (event) => {
  const field=event.target.dataset.privacy;
  if (['voice','research'].includes(field)) { state.privacyDraft ??= {...state.privacy}; state.privacyDraft[field]=event.target.checked; }
});
root.addEventListener('input', (event) => {
  const field = event.target.dataset.researchField;
  if (field && event.target.tagName==='TEXTAREA') { state.research[field]=event.target.value; saveResearch(); }
});

function saveResearch(){ if(!readPrivacy(localStorage).research) return; try{localStorage.setItem(`saathi:research:${state.session.id}`,JSON.stringify(state.research));}catch{} }
function historyBack(){
  if (state.screen === 'voice') {
    state.conversationRun += 1;
    stopActiveCapture();
    stopSpeech();
    state.listening = false;
    state.speaking = false;
  }
  const fallbacks={privacy:'trust',settings:'home',deleteData:'settings',trust:'language',voice:'home',confirm:'home',guidance:'home',billCapture:'home',billExplained:'billCapture',uncertain:'billCapture',offline:'home'};
  go(fallbacks[state.screen]||'home');
}
function downloadJson(value, filename) {
  const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));
  const a=document.createElement('a'); a.href=url; a.download=filename; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function exportSession(){
  if (!readPrivacy(localStorage).research) { notify(pc('researchTitle')); return; }
  const text=serializeSession({session:{...state.session,mode:state.mode,language:state.language,research:state.research},events:state.events});
  const blob=new Blob([text],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`svanidhi-saathi-${state.session.id}.json`; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000); log('session_exported'); notify('Research session exported.');
}
function newSession(){
  if(!confirm('Start a new participant session? Current data remains in the browser and can be exported first.')) return;
  resetVoiceConversation(); state.session={id:newSessionId(),startedAt:new Date().toISOString()}; state.events=[]; state.research={tasks:Array(9).fill(false),helpNeeded:false,trustConcern:'',wouldUseAgain:'',quote:'',notes:''}; state.researchOpen=false; state.screen='language'; state.listening=false; state.speaking=false; state.voiceIntroduced=false; state.transcript=''; state.parsed={sales:null,stock:null,confidence:'low',rawNumbers:[],requiresReview:true}; state.structuredReveal=0; state.photoUrl=null; state.billRead='none'; state.question=null; state.answer=null; render();
}

window.addEventListener('storage', (event) => {
  if (event.key === null || event.key.startsWith('saathi:')) {
    state.privacy=readPrivacy(localStorage);
    if (!state.privacy.acceptedAt || !state.privacy.voice) { state.conversationRun+=1; stopActiveCapture(); stopSpeech(); state.listening=false; state.speaking=false; state.voicePhase='idle'; }
    if (!state.privacy.acceptedAt) { state.privacyDraft=null; state.events=[]; state.researchOpen=false; state.screen='privacy'; }
    loadLocal(); render();
  }
});
window.addEventListener('online',()=>{state.online=true;log('network_changed',{online:true});render();});
window.addEventListener('offline',()=>{state.online=false;log('network_changed',{online:false});render();});

if ('serviceWorker' in navigator) navigator.serviceWorker.register('/service-worker.js').catch(()=>{});
log('session_started',{online:state.online,status:'prototype_v0.6'});
render();
