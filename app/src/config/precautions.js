/* Precautions aimed at whoever is actually falling ill in a flagged area.
 *
 * WHY THIS EXISTS
 *
 * "More diarrhoea than usual here" is true and almost useless. A parent needs
 * to know to keep feeding the child, that ORS is free, and which symptom means
 * go now — advice a general notice never gives, because it is written for
 * everybody and therefore for nobody. People act on advice that is about them.
 *
 * WHO GETS TARGETED
 *
 * Only the under-fives and the over-sixties. Those are the groups whose advice
 * genuinely differs — for a healthy adult the standing guidance already covers
 * it, and inventing a special notice for the majority group would be noise. If
 * no group stands out, no card is shown at all.
 *
 * WHAT IS DELIBERATELY ABSENT
 *
 * Numbers. Saying "children are most affected here" is a reason to be careful;
 * saying "forty children" is a reason to leave, and crowd movement is what
 * kills at these events. Every entry ends in an instruction, because an
 * instruction calms and a bare warning does not.
 *
 * STATUS: the wording follows standard public-health messaging (oral
 * rehydration, continued feeding, the usual danger signs), but it has NOT been
 * reviewed by a clinician and the Hindi and Marathi have NOT been checked by a
 * native speaker. Both are required before this is shown to a real pilgrim.
 */

export const AGE_GROUPS = {
  child: {
    bands: ['0-5'],
    en: 'Small children', hi: 'छोटे बच्चे', mr: 'लहान मुले',
  },
  elder: {
    bands: ['60+'],
    en: 'Older people', hi: 'बुज़ुर्ग', mr: 'ज्येष्ठ नागरिक',
  },
}

/* PRECAUTIONS[syndrome][group] — absent means "no targeted advice", and the
   page then shows nothing rather than something invented. */
export const PRECAUTIONS = {
  gi: {
    child: {
      lead: { en: 'Small children are most affected here',
              hi: 'यहाँ छोटे बच्चे सबसे अधिक प्रभावित हैं',
              mr: 'इथे लहान मुले सर्वाधिक बाधित आहेत' },
      steps: [
        { en: 'Give ORS after every loose motion — free at any clinic',
          hi: 'हर दस्त के बाद ओआरएस दें — हर क्लिनिक पर मुफ़्त',
          mr: 'प्रत्येक जुलाबानंतर ओआरएस द्या — दवाखान्यात मोफत' },
        { en: 'Keep feeding and breastfeeding — do not stop',
          hi: 'दूध और खाना बंद न करें',
          mr: 'दूध व अन्न बंद करू नका' },
        { en: 'Sealed or boiled water only, also for mixing food',
          hi: 'केवल सीलबंद या उबला पानी, खाना बनाने में भी',
          mr: 'फक्त सीलबंद किंवा उकळलेले पाणी, अन्नासाठीही' },
        { en: 'Wash hands before feeding and after cleaning the child',
          hi: 'खिलाने से पहले और सफ़ाई के बाद हाथ धोएँ',
          mr: 'भरवण्यापूर्वी व स्वच्छतेनंतर हात धुवा' },
      ],
      now: { en: 'Go to a clinic now if the child passes no urine for hours, has sunken eyes, or is too sleepy to drink.',
             hi: 'यदि बच्चा घंटों पेशाब न करे, आँखें धँसी हों, या पीने लायक न जागे — तुरंत क्लिनिक जाएँ।',
             mr: 'मूल तासभर लघवी करत नसेल, डोळे खोल गेले असतील, किंवा पिण्याइतके जागे नसेल — लगेच दवाखान्यात जा.' },
    },
    elder: {
      lead: { en: 'Older people are most affected here',
              hi: 'यहाँ बुज़ुर्ग सबसे अधिक प्रभावित हैं',
              mr: 'इथे ज्येष्ठ नागरिक सर्वाधिक बाधित आहेत' },
      steps: [
        { en: 'Start ORS at the first loose motion — dehydration comes faster at this age',
          hi: 'पहले दस्त पर ही ओआरएस शुरू करें — इस उम्र में पानी की कमी जल्दी होती है',
          mr: 'पहिल्या जुलाबालाच ओआरएस सुरू करा — या वयात निर्जलीकरण लवकर होते' },
        { en: 'Treated or sealed water only',
          hi: 'केवल शुद्ध या सीलबंद पानी',
          mr: 'फक्त शुद्ध किंवा सीलबंद पाणी' },
        { en: 'Do not wait to see if it settles',
          hi: 'ठीक होने का इंतज़ार न करें',
          mr: 'बरे होण्याची वाट पाहू नका' },
      ],
      now: { en: 'Go to a clinic now if they are dizzy standing up, passing very little urine, or confused.',
             hi: 'खड़े होने पर चक्कर, बहुत कम पेशाब, या भ्रम हो — तुरंत क्लिनिक जाएँ।',
             mr: 'उभे राहताना चक्कर, खूप कमी लघवी, किंवा गोंधळ — लगेच दवाखान्यात जा.' },
    },
  },

  respiratory: {
    child: {
      lead: { en: 'Small children are most affected here',
              hi: 'यहाँ छोटे बच्चे सबसे अधिक प्रभावित हैं',
              mr: 'इथे लहान मुले सर्वाधिक बाधित आहेत' },
      steps: [
        { en: 'Keep away from crowded closed spaces where you can',
          hi: 'भीड़ भरी बंद जगहों से बचें',
          mr: 'गर्दीच्या बंद जागा टाळा' },
        { en: 'Cover coughs and wash hands often',
          hi: 'खाँसते समय मुँह ढकें, हाथ धोते रहें',
          mr: 'खोकताना तोंड झाका, हात धुवा' },
        { en: 'Keep fluids going',
          hi: 'तरल पदार्थ देते रहें',
          mr: 'द्रव पदार्थ देत राहा' },
      ],
      now: { en: 'Go to a clinic now if breathing is fast or difficult, the chest pulls in, or the child cannot feed.',
             hi: 'साँस तेज़ या कठिन हो, छाती अंदर धँसे, या बच्चा दूध न पिए — तुरंत क्लिनिक जाएँ।',
             mr: 'श्वास जलद वा कठीण, छाती आत ओढली जात असेल, किंवा मूल पीत नसेल — लगेच दवाखान्यात जा.' },
    },
    elder: {
      lead: { en: 'Older people are most affected here',
              hi: 'यहाँ बुज़ुर्ग सबसे अधिक प्रभावित हैं',
              mr: 'इथे ज्येष्ठ नागरिक सर्वाधिक बाधित आहेत' },
      steps: [
        { en: 'Rest, fluids, and avoid smoke and crowds',
          hi: 'आराम, तरल पदार्थ, धुएँ और भीड़ से बचें',
          mr: 'विश्रांती, द्रव पदार्थ, धूर व गर्दी टाळा' },
        { en: 'Keep any regular medicines going',
          hi: 'नियमित दवाएँ जारी रखें',
          mr: 'नियमित औषधे चालू ठेवा' },
      ],
      now: { en: 'Go to a clinic now if they are breathless at rest, the lips look blue, or they seem confused.',
             hi: 'आराम में भी साँस फूले, होंठ नीले पड़ें, या भ्रम हो — तुरंत क्लिनिक जाएँ।',
             mr: 'विश्रांतीतही धाप लागल्यास, ओठ निळे पडल्यास, किंवा गोंधळ — लगेच दवाखान्यात जा.' },
    },
  },

  heat: {
    child: {
      lead: { en: 'Small children are most affected here',
              hi: 'यहाँ छोटे बच्चे सबसे अधिक प्रभावित हैं',
              mr: 'इथे लहान मुले सर्वाधिक बाधित आहेत' },
      steps: [
        { en: 'Shade and small drinks often, not one big drink',
          hi: 'छाँव में रखें, थोड़ा-थोड़ा पानी बार-बार',
          mr: 'सावलीत ठेवा, थोडे थोडे पाणी वारंवार' },
        { en: 'Light loose clothing',
          hi: 'हल्के ढीले कपड़े',
          mr: 'हलके सैल कपडे' },
        { en: 'Never leave a child in a closed vehicle or tent',
          hi: 'बच्चे को बंद गाड़ी या तंबू में अकेला न छोड़ें',
          mr: 'मुलाला बंद गाडीत वा तंबूत एकटे ठेवू नका' },
      ],
      now: { en: 'Go to a clinic now if the skin is hot and dry, the child vomits, or is unusually drowsy.',
             hi: 'त्वचा गर्म-सूखी हो, उल्टी हो, या बच्चा असामान्य रूप से सुस्त हो — तुरंत क्लिनिक जाएँ।',
             mr: 'त्वचा गरम-कोरडी, उलटी, किंवा मूल असामान्य सुस्त — लगेच दवाखान्यात जा.' },
    },
    elder: {
      lead: { en: 'Older people are most affected here',
              hi: 'यहाँ बुज़ुर्ग सबसे अधिक प्रभावित हैं',
              mr: 'इथे ज्येष्ठ नागरिक सर्वाधिक बाधित आहेत' },
      steps: [
        { en: 'Drink before you feel thirsty',
          hi: 'प्यास लगने से पहले पानी पिएँ',
          mr: 'तहान लागण्यापूर्वी पाणी प्या' },
        { en: 'Rest in shade, avoid walking in the midday sun',
          hi: 'छाँव में आराम करें, दोपहर की धूप में न चलें',
          mr: 'सावलीत विश्रांती, दुपारच्या उन्हात चालू नका' },
      ],
      now: { en: 'Go to a clinic now if they stop sweating, seem confused, or faint.',
             hi: 'पसीना आना बंद हो, भ्रम हो, या बेहोशी — तुरंत क्लिनिक जाएँ।',
             mr: 'घाम येणे थांबल्यास, गोंधळ, किंवा बेशुद्धी — लगेच दवाखान्यात जा.' },
    },
  },

  fever: {
    child: {
      lead: { en: 'Small children are most affected here',
              hi: 'यहाँ छोटे बच्चे सबसे अधिक प्रभावित हैं',
              mr: 'इथे लहान मुले सर्वाधिक बाधित आहेत' },
      steps: [
        { en: 'Keep fluids going and dress the child lightly',
          hi: 'तरल पदार्थ देते रहें, हल्के कपड़े पहनाएँ',
          mr: 'द्रव पदार्थ देत राहा, हलके कपडे घाला' },
        { en: 'Any clinic will check the child free',
          hi: 'हर क्लिनिक पर जाँच मुफ़्त है',
          mr: 'कोणत्याही दवाखान्यात तपासणी मोफत' },
      ],
      now: { en: 'Go to a clinic now if there is a fit, a rash with the fever, or the child will not drink.',
             hi: 'दौरा पड़े, बुखार के साथ चकत्ते हों, या बच्चा पिए नहीं — तुरंत क्लिनिक जाएँ।',
             mr: 'झटके, तापासोबत पुरळ, किंवा मूल पीत नसेल — लगेच दवाखान्यात जा.' },
    },
    elder: {
      lead: { en: 'Older people are most affected here',
              hi: 'यहाँ बुज़ुर्ग सबसे अधिक प्रभावित हैं',
              mr: 'इथे ज्येष्ठ नागरिक सर्वाधिक बाधित आहेत' },
      steps: [
        { en: 'Fluids and rest; do not wait more than a day to be seen',
          hi: 'तरल पदार्थ और आराम; एक दिन से ज़्यादा इंतज़ार न करें',
          mr: 'द्रव पदार्थ व विश्रांती; एक दिवसापेक्षा जास्त वाट पाहू नका' },
      ],
      now: { en: 'Go to a clinic now if they are confused, breathless, or cannot keep fluids down.',
             hi: 'भ्रम, साँस फूलना, या कुछ भी पेट में न रुके — तुरंत क्लिनिक जाएँ।',
             mr: 'गोंधळ, धाप, किंवा काहीही पोटात राहत नसेल — लगेच दवाखान्यात जा.' },
    },
  },
}

/* What each illness looks like, in the words a pilgrim would use.
 *
 * WHY THIS IS SEPARATE FROM PRECAUTIONS
 *
 * Precautions tell a specific group what to do. This tells anyone what to
 * watch for. "More diarrhoea here" only helps if you can recognise diarrhoea
 * starting in the person next to you — and most people do not know that
 * sunken eyes or no urine is the line between unwell and dangerous.
 *
 * `spreads` exists so the advice is not arbitrary. Told only "boil your
 * water", people boil water once. Told "this passes through water and unwashed
 * hands", they keep doing it, because now they know what they are stopping.
 *
 * Same caveat as the rest of this file: standard public-health wording, NOT
 * clinician-reviewed, translations NOT native-speaker verified.
 */
export const DISEASE_INFO = {
  gi: {
    name: { en: 'Stomach illness', hi: 'पेट की बीमारी', mr: 'पोटाचा आजार' },
    looks: [
      { en: 'Loose motions, often several times', hi: 'बार-बार दस्त', mr: 'वारंवार जुलाब' },
      { en: 'Vomiting, or feeling sick', hi: 'उल्टी या जी मिचलाना', mr: 'उलटी किंवा मळमळ' },
      { en: 'Stomach cramps', hi: 'पेट में मरोड़', mr: 'पोटात मुरडा' },
      { en: 'Weakness, dry mouth, very little urine', hi: 'कमज़ोरी, मुँह सूखना, कम पेशाब', mr: 'अशक्तपणा, तोंड कोरडे, कमी लघवी' },
    ],
    spreads: { en: 'Through water and food, and through hands that were not washed. This is why the water points matter.',
               hi: 'पानी, खाने और बिना धुले हाथों से फैलता है। इसीलिए पानी के स्थान महत्वपूर्ण हैं।',
               mr: 'पाणी, अन्न व न धुतलेल्या हातांतून पसरतो. म्हणूनच पाण्याची ठिकाणे महत्त्वाची.' },
  },

  respiratory: {
    name: { en: 'Cough and cold illness', hi: 'खाँसी-ज़ुकाम', mr: 'खोकला-सर्दी' },
    looks: [
      { en: 'Cough, sore throat, blocked nose', hi: 'खाँसी, गला ख़राब, नाक बंद', mr: 'खोकला, घसा दुखणे, नाक चोंदणे' },
      { en: 'Fever with body ache', hi: 'बुखार के साथ बदन दर्द', mr: 'ताप व अंगदुखी' },
      { en: 'Getting breathless more easily than usual', hi: 'सामान्य से जल्दी साँस फूलना', mr: 'नेहमीपेक्षा लवकर धाप लागणे' },
    ],
    spreads: { en: 'Through coughs and sneezes in close crowds. Covering your mouth genuinely stops it.',
               hi: 'भीड़ में खाँसने-छींकने से फैलता है। मुँह ढकने से सच में रुकता है।',
               mr: 'गर्दीत खोकल्या-शिंकेतून पसरतो. तोंड झाकल्याने खरोखर थांबतो.' },
  },

  heat: {
    name: { en: 'Heat illness', hi: 'गर्मी का असर', mr: 'उष्णतेचा त्रास' },
    looks: [
      { en: 'Headache and dizziness', hi: 'सिरदर्द और चक्कर', mr: 'डोकेदुखी व चक्कर' },
      { en: 'Heavy sweating, then no sweating at all', hi: 'बहुत पसीना, फिर पसीना बिल्कुल बंद', mr: 'खूप घाम, नंतर घाम पूर्ण बंद' },
      { en: 'Cramps in the legs, feeling faint', hi: 'पैरों में ऐंठन, बेहोशी जैसा', mr: 'पायात पेटके, बेशुद्धीसारखे' },
    ],
    spreads: { en: 'It does not spread between people. It comes from sun, walking distance, and not drinking enough.',
               hi: 'यह एक-दूसरे से नहीं फैलता। यह धूप, चलने और कम पानी पीने से होता है।',
               mr: 'हा एकमेकांत पसरत नाही. ऊन, चालणे व कमी पाणी यामुळे होतो.' },
  },

  fever: {
    name: { en: 'Fever illness', hi: 'बुखार', mr: 'ताप' },
    looks: [
      { en: 'Fever with chills or shivering', hi: 'ठंड लगकर बुखार', mr: 'थंडी वाजून ताप' },
      { en: 'Headache and body ache', hi: 'सिरदर्द और बदन दर्द', mr: 'डोकेदुखी व अंगदुखी' },
      { en: 'Tiredness that does not lift with rest', hi: 'आराम से भी न जाने वाली थकान', mr: 'विश्रांतीनेही न जाणारा थकवा' },
    ],
    spreads: { en: 'Fever has many causes — mosquitoes, water, or close contact. A clinic can tell which; guessing cannot.',
               hi: 'बुखार के कई कारण हैं — मच्छर, पानी, या नज़दीकी संपर्क। क्लिनिक ही बता सकता है।',
               mr: 'तापाची अनेक कारणे — डास, पाणी, किंवा जवळचा संपर्क. दवाखानाच सांगू शकतो.' },
  },

  injury: {
    name: { en: 'Injuries', hi: 'चोटें', mr: 'जखमा' },
    looks: [
      { en: 'Cuts, sprains, and falls', hi: 'कटना, मोच, गिरना', mr: 'कापणे, मुरगळणे, पडणे' },
      { en: 'Burns from lamps and stoves', hi: 'दीपक और चूल्हे से जलना', mr: 'दिवे व चुलीमुळे भाजणे' },
    ],
    spreads: { en: 'Not an infection. It follows wet steps, dark paths, and crowd pressure at the ghats.',
               hi: 'यह संक्रमण नहीं है। गीली सीढ़ियाँ, अँधेरे रास्ते और घाट की भीड़ इसका कारण हैं।',
               mr: 'हा संसर्ग नाही. ओल्या पायऱ्या, अंधारे रस्ते व घाटावरची गर्दी हे कारण.' },
  },

  other: {
    name: { en: 'Other illness', hi: 'अन्य बीमारी', mr: 'इतर आजार' },
    looks: [
      { en: 'Nothing specific to watch for yet', hi: 'अभी कुछ विशेष देखने को नहीं', mr: 'अजून विशेष काही नाही' },
    ],
    spreads: { en: 'A team is checking. Follow the usual advice until they say more.',
               hi: 'दल जाँच कर रहा है। तब तक सामान्य सलाह मानें।',
               mr: 'पथक तपासत आहे. तोपर्यंत नेहमीचा सल्ला पाळा.' },
  },
}
