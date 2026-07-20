export default async (request, context) => {
  // 0) Let Netlify Functions handle their own paths (don't intercept /.netlify/functions/*)
  const reqUrl0 = new URL(request.url);
  if (reqUrl0.pathname.startsWith("/.netlify/functions/")) {
    return context.next();
  }

  // 0a) Bypass redirects for static assets (images, CSS, etc.)
  if (reqUrl0.pathname.startsWith("/assets/")) {
    return context.next();
  }

  // 0b) Bypass redirects for API endpoints (S1 postback receivers live here).
  // Without this, a postback ping like /api/s1-impression?click_id=XXX would
  // be treated as a redirect request, fail the redirectMap lookup, and 302
  // the request to facebook.com before the receiver ever runs.
  if (reqUrl0.pathname.startsWith("/api/")) {
    return context.next();
  }

  // ===== V2 redirect with logging + click capture =====
  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  // 1) Redirect map (injected by your Sheet push)
  const redirectMap = {
  "100": {
    "url": "https://google.com",
    "title": "\"Exploring Google's Evolution and Impact on the Digital World\"",
    "description": "Google is a leading search engine that provides users with quick access to information, images, and news from across the web. Explore a vast array of content effortlessly.",
    "locale": "en_US"
  },
  "226": {
    "url": "https://goatdealo.online/technology/free-phone-programs-for-seniors-explore-your-options-en-us/?segment=rsoc.sc.goatdealoonline.001&headline=learn+about+phones+for+seniors&forceKeyA=100%+free+phones+for+senior&forceKeyB=100%+free+phones+for+senior&forceKeyC=apply+for+free+phones+for+seniors&forceKeyD=100%+free+phone+for+seniors&forceKeyE=100+free+phones+for+seniors&forceKeyF=free+phones+for+seniors&s1pplacement={{placement}}",
    "title": "Free Phone Programs for Seniors: A Guide to Your Options",
    "description": "Discover various programs that provide free phones for seniors, helping them stay connected with loved ones and access essential services.",
    "locale": "en_US"
  },
  "227": {
    "url": "https://goatdealo.online/health/how-clinical-trials-are-advancing-dental-implants-en-us/?segment=rsoc.sc.goatdealoonline.001&headline=Dental+Implants+Clinical+Trial&forceKeyA=get+$1500+for+dental+implant+participation+near+me&forceKeyB=$1500+for+dental+implants+participation+in+{city}&forceKeyC=get+$1500+for+dental+implant+participation+near+me&forceKeyD=get+$1500+for+dental+implants+participations+in+{city}&forceKeyE=get+$1950+for+dental+implants+participations+in+{city}&forceKeyF=&s1pplacement={{placement}}",
    "title": "Advancements in Dental Implants Through Clinical Trials",
    "description": "Discover how clinical trials are pushing the boundaries of dental implant technology, enhancing patient outcomes and treatment options.",
    "locale": "en_US"
  },
  "228": {
    "url": "https://goatdealo.online/careers/how-online-courses-boost-career-growth-en-us/?segment=rsoc.sc.goatdealoonline.001&headline=Learn+more+about+Apply+for+Online+School+that+Gives+You+%24+and+Laptops+Today&forceKeyA=apply+for+online+school+that+gives+you+$+and+laptops+today&forceKeyB=apply+for+online+school+that+gives+you+$+and+laptops+today&forceKeyC=apply+for+online+school+that+gives+you+$+and+laptops+today+summer+2026&forceKeyD=apply+for+online+school+that+gives+you+$+and+laptops+today+{month}+2026&forceKeyE=online+colleges+that+give+you+a+computer&forceKeyF=online+colleges+that+give+you+a+computer+{state}&s1pplacement={{placement}}",
    "title": "\"How Online Courses Enhance Career Opportunities and Growth\"",
    "description": "Discover how online courses can enhance your career growth by providing flexible learning opportunities and valuable skills for the modern job market.",
    "locale": "en_US"
  },
  "229": {
    "url": "https://goatdealo.online/education/how-to-earn-a-high-school-diploma-online-en-us/?segment=rsoc.sc.goatdealoonline.001&headline=What%20to%20Know%20About%20Graduating%20Online&forceKeyA=apply+for+online+school+that+gives+you+$+and+laptops+today+{month}+2026&forceKeyB=apply+for+online+school+that+gives+you+$+and+laptops+near+me&forceKeyC=apply+for+online+school+high+school+that+gives+you+a+computer+now&forceKeyD=apply+for+online+school+that+gives+you+$+and+laptops+today+{month}+2026&forceKeyE=apply+for+online+school+that+gives+you+$+and+laptops+in+{city}&forceKeyF=&s1pplacement={{placement}}",
    "title": "Earning Your High School Diploma Online: Key Insights",
    "description": "Discover essential information about earning a high school diploma online, including program options, benefits, and tips for success in your educational journey.",
    "locale": "en_US"
  },
  "230": {
    "url": "https://goatdealo.online/health/how-dental-implant-trials-advance-care-en-us-2/?segment=rsoc.sc.goatdealoonline.001&headline=How+Do+Dental+Implant+Trials+Enhance+Care&forceKeyA=dental+implant+clinic+near+me&forceKeyB=get+$1950+for+dental+implants+participation+near+me&forceKeyC=$1500+for+dental+implants+participations+in+vista&forceKeyD=get+$1500+for+dental+implants+participation+near+me&forceKeyE=best+get+$1950+for+dental+implants+participation+near+me&forceKeyF=$1500+for+dental+implants+participations+in+vista&s1pplacement={{placement}}",
    "title": "Advancements in Dental Care Through Implant Trials",
    "description": "Explore how dental implant trials are transforming patient care by advancing techniques and improving outcomes in oral health.",
    "locale": "en_US"
  },
  "231": {
    "url": "https://goatdealo.online/education/how-to-earn-a-high-school-diploma-online-en-us-2/?segment=rsoc.sc.goatdealoonline.001&headline=What%20to%20Know%20About%20Graduating%20Online&forceKeyA=apply+for+online+school+high+school+that+gives+you+a+computer+now&forceKeyB=apply+for+online+school+that+gives+you+$+and+laptops+near+me&forceKeyC=apply+for+online+school+high+school+that+gives+you+a+computer+now&forceKeyD=apply+for+online+school+that+gives+you+$+and+laptops+today+{month}+2026&forceKeyE=apply+for+online+school+that+gives+you+$+and+laptops+in+{city}&forceKeyF=&s1pplacement={{placement}}",
    "title": "\"Essential Insights for Earning Your High School Diploma Online\"",
    "description": "Discover essential information about earning a high school diploma online, including options, benefits, and what to expect from the process.",
    "locale": "en_US"
  },
  "232": {
    "url": "https://goatdealo.online/health/how-dental-implant-trials-advance-care-en-us/?segment=rsoc.sc.goatdealoonline.001&headline=How+Do+Dental+Implant+Trials+Enhance+Care&forceKeyA=free+dental+implants+near+me&forceKeyB=get+$1950+for+dental+implants+participation+near+me&forceKeyC=$1500+for+dental+implants+participations+in+{city}&forceKeyD=get+$1500+for+dental+implants+participation+near+me&forceKeyE=best+get+$1950+for+dental+implants+participation+near+me&forceKeyF=$1500+for+dental+implants+participations+in+{city}&s1pplacement={{placement}}",
    "title": "Advancements in Dental Implant Trials and Patient Care",
    "description": "Discover how dental implant trials are transforming patient care and advancing innovative treatment options in oral health.",
    "locale": "en_US"
  },
  "233": {
    "url": "https://goatdealo.online/health/diabetes-studies-show-better-treatment-results-en-us/?segment=rsoc.sc.goatdealoonline.001&headline=diabetes+treatment+trial&forceKeyA=diabetes+management+programs&forceKeyB=diabetes+studies+testing+new+treatments+$3000+near+me&forceKeyC=diabetes+study+testing+new+treatments&forceKeyD=diabetes+study+testing+new+medications+$3000+near+{state}&forceKeyE=diabetes+study+testing+new+treatments+$3000+near+me&forceKeyF=diabetes+studies+using+new+treatments+$3000+near+me&s1pplacement={{placement}}",
    "title": "\"New Diabetes Studies Reveal Promising Treatment Outcomes\"",
    "description": "Explore recent diabetes studies showcasing improved treatment results and innovations in diabetes management for better health outcomes.",
    "locale": "en_US"
  },
  "234": {
    "url": "https://goatdealo.online/health/benefits-of-joining-dental-implant-trials-en-us-2/?segment=rsoc.sc.goatdealoonline.001&headline=Dental%20Implant%20Participation&forceKeyA=dental+implant+trials+near+me&forceKeyB=get+$1500+for+dental+implant+participation+near+{city}&forceKeyC=get+$1950+for+dental+implants+participations+in+{city}&forceKeyD=teeth+fixing+near+me&forceKeyE=get+$1500+for+dental+implants+participation+near+{city}&forceKeyF=dental+implant+trials+in+{city}&s1pplacement={{placement}}",
    "title": "Exploring the Advantages of Dental Implant Trials",
    "description": "Discover the advantages of participating in dental implant trials, including financial incentives and access to cutting-edge dental care options.",
    "locale": "en_US"
  },
  "235": {
    "url": "https://goatdealo.online/automotive/what-makes-full-size-pickup-trucks-versatile-en-us/?segment=rsoc.sc.goatdealoonline.001&headline=Learn+About+Top+Pickup+Models&forceKeyA=100+accepted+0+down+new+f150+and+ram+trucks+near+me+apply+now&forceKeyB=100+accepted+0+down+options+new+f150+and+ram+trucks+near+me+[at+low+cost]+apply+now&forceKeyC=100+accepted+0+down+options+new+f150+and+ram+trucks+-+near+me+apply+now&forceKeyD=100%+accepted+0+down+options+-+new+f150+and+ram+trucks+near+me+apply+now&forceKeyE=100+accepted+0+down+new+f150+and+ram+trucks+near+me+apply+now&forceKeyF=100%+accepted+-+0+down+options+-+new+f150+and+ram+trucks+near+me&s1pplacement={{placement}}",
    "title": "The Versatility of Full-Size Pickup Trucks Explained",
    "description": "Discover the versatility of full-size pickup trucks, highlighting their features, capabilities, and the top models that excel in various driving conditions.",
    "locale": "en_US"
  },
  "236": {
    "url": "https://goatdealo.online/technology/how-do-major-internet-providers-compare-en-us/?segment=rsoc.sc.goatdealoonline.001&headline=Learn+About+Affordable+Internet+Plans&forceKeyA=senior+internet+program+(available+at+my+address)&forceKeyB=10+internet+in+my+zip+code&forceKeyC=what+is+the+best+internet+service+for+seniors+(see+prices)&forceKeyD=low+cost+internet+plans+by+zip+code+-+for+seniors&forceKeyE=10+internet+providers+in+my+zip+code&forceKeyF=high-speed+internet+for+seniors&s1pplacement={{placement}}",
    "title": "Comparing Major Internet Providers: A Guide for Seniors in the U.S.",
    "description": "Discover how major internet providers stack up against each other, focusing on affordable plans and options tailored for seniors in your area.",
    "locale": "en_US"
  },
  "237": {
    "url": "https://goatdealo.online/health/what-drives-the-surge-in-body-contouring-en-us/?segment=rsoc.sc.goatdealoonline.001&headline=Learn+About+Fat+Removal+Clinical+Research&forceKeyA=1500+for+belly+fat+reduction+treatment+participation+near+me&forceKeyB=1500+for+belly+fat+reduction+treatment+participation+near+my+zipcode+[+coolsculpting+]&forceKeyC=1500+for+belly+fat+removal+without+surgery+participation+[coolsculpting+zepbound]&forceKeyD=1500+for+belly+fat+removal+without+surgery+participation&forceKeyE=1500+for+belly+fat+reduction+treatment+participation+near+me+[+coolsculpting+]&forceKeyF=1500+for+belly+fat+reduction+treatment+participation&s1pplacement={{placement}}",
    "title": "\"Exploring the Rise of Body Contouring Treatments and Technologies\"",
    "description": "Explore the factors contributing to the increasing popularity of body contouring procedures, including the latest advancements in fat removal techniques.",
    "locale": "en_US"
  },
  "238": {
    "url": "https://goatdealo.online/education/why-choose-online-high-school-for-your-diploma-en-us/?segment=rsoc.sc.goatdealoonline.001&headline=Online%20School&forceKeyA=apply+for+online+school+that+gives+you+cash+and+laptops+today&forceKeyB=apply+for+online+school+that+gives+you+cash+and+laptops+today&forceKeyC=apply+for+online+school+that+gives+you+$+and+laptops+in+{city}&forceKeyD=apply+for+online+school+that+gives+you+$+and+laptops+today+{month}+2026&forceKeyE=best+online+school+that+gives+you+$+and+laptops+in+{city}&forceKeyF=apply+for+online+schools+that+give+you+$+and+laptops+in+{city}&s1pplacement={{placement}}",
    "title": "Benefits of Choosing Online High School for Your Diploma",
    "description": "Discover the benefits of choosing an online high school for your diploma, including flexibility, personalized learning, and access to valuable resources.",
    "locale": "en_US"
  },
  "239": {
    "url": "https://goatdealo.online/health/why-asthma-clinical-trials-matter-en-us/?segment=rsoc.sc.goatdealoonline.001&headline=asthma+study&forceKeyA=best+$6000+for+asthma+treatments+participation+near+my+zipcode&forceKeyB=$6000+in+[state]+for+asthma+treatment+participation+near+my+zipcode&forceKeyC=$6000+for+asthma+treatments+participation+near+my+zipcode&forceKeyD=$6000+in+[city]+for+asthma+treatment+participation+near+my+zipcode&forceKeyE=$6000+for+asthma+treatment+participation+in+[city]&forceKeyF=$6000+paid+for+asthma+treatments+participation+near+my+zipcode&s1pplacement={{placement}}",
    "title": "The Importance of Asthma Clinical Trials in Advancing Treatments",
    "description": "Explore the significance of asthma clinical trials and their impact on treatment advancements, as well as potential participation opportunities in your area.",
    "locale": "en_US"
  },
  "240": {
    "url": "https://goatdealo.online/health/how-dental-implant-trials-advance-patient-care-en-us/?segment=rsoc.sc.goatdealoonline.001&headline=How+Do+Dental+Implant+Trials+Enhance+Care&forceKeyA=dental+implant+trial+participation&forceKeyB=get+$1950+for+dental+implants+participation+near+me&forceKeyC=$1500+for+dental+implants+participations+in+{city}&forceKeyD=get+$1500+for+dental+implants+participation+near+me&forceKeyE=best+get+$1950+for+dental+implants+participation+near+me&forceKeyF=$1500+for+dental+implants+participations+in+{city}&s1pplacement={{placement}}",
    "title": "Advancements in Patient Care Through Dental Implant Trials",
    "description": "Explore how dental implant trials contribute to improved patient care and the advancement of dental health practices in this informative article.",
    "locale": "en_US"
  },
  "241": {
    "url": "https://goatdealo.online/lifestyle/how-do-senior-apartments-enhance-well-being-en-us/?segment=rsoc.sc.goatdealoonline.001&headline=Learn+More+About+Senior+Housing+Apartments+Today&forceKeyA=seniors+residence+near+me&forceKeyB=62+and+older+apartments+near+me&forceKeyC=apartments+55+and+older+near+me&forceKeyD=see+55+and+older+apartments+near+me&forceKeyE=55+and+older+apartment+near+me&forceKeyF=55+and+older+apartments+near+me&s1pplacement={{placement}}",
    "title": "\"How Senior Apartments Improve Quality of Life for Older Adults\"",
    "description": "Discover how senior apartments can enhance well-being through tailored amenities, social activities, and supportive environments designed for older adults.",
    "locale": "en_US"
  },
  "242": {
    "url": "https://goatdealo.online/health/how-to-find-affordable-botox-without-compromising-safety/?segment=rsoc.sc.goatdealoonline.001&headline=Learn+More+About+Botox+and+Juvederm&forceKeyA=botox+special+near+me&forceKeyB=get+$99+botox+doctor+near+me+full+botox&forceKeyC=botox+special+near+me&forceKeyD=botox+clinics+near+me&forceKeyE=cosmetic+injections+near+me&forceKeyF=best+botox+injector+near+me&s1pplacement={{placement}}",
    "title": "Finding Affordable Botox: Safety Tips and Insights",
    "description": "Discover how to find affordable Botox options while ensuring safety and quality, with insights on clinics and injectors near you.",
    "locale": "en_US"
  },
  "243": {
    "url": "https://goatdealo.online/health/affordable-juvederm-options-and-trials/?segment=rsoc.sc.goatdealoonline.001&headline=Botox+Treatments&forceKeyA=$1500+botox+participation+near+me&forceKeyB=$1500+in+[state]+for+botox+participation+near+my+zipcode&forceKeyC=$1500+for+botox+participation+near+my+zipcode&forceKeyD=$1500+in+[city]+for+botox+participation+near+my+zipcode&forceKeyE=$1500+for+botox+participation+in+[city]&forceKeyF=$1500+paid+for+botox+participation+near+my+zipcode&s1pplacement={{placement}}",
    "title": "Affordable Juvederm Options and Clinical Trials Explained",
    "description": "Discover affordable options and trials for Juvederm treatments, focusing on budget-friendly solutions for enhancing your beauty without breaking the bank.",
    "locale": "en_US"
  },
  "244": {
    "url": "https://etoptip.com/health/how-clinical-trials-are-transforming-dental-implants-en-us/?segment=rsoc.sc.etoptip.001&headline=Dental+Implants+Clinical+Trial&forceKeyA=get+$1500+for+dental+implant+participation+near+me&forceKeyB=$1500+for+dental+implants+participation+in+{city}&forceKeyC=get+$1500+for+dental+implant+participation+near+me&forceKeyD=get+$1500+for+dental+implants+participations+in+{city}&forceKeyE=get+$1950+for+dental+implants+participations+in+{city}&forceKeyF=&s1pplacement={{placement}}",
    "title": "\"Advancements in Dental Implants Through Clinical Trials\"",
    "description": "Explore how clinical trials are advancing dental implant technology and improving patient outcomes in the field of dentistry.",
    "locale": "en_US"
  },
  "245": {
    "url": "https://findfact.net/health/how-clinical-trials-are-transforming-dental-implants-en-us/?segment=rsoc.sc.findfact.001&headline=Dental+Implants+Clinical+Trial&forceKeyA=get+$1500+for+dental+implant+participation+near+me&forceKeyB=$1500+for+dental+implants+participation+in+{city}&forceKeyC=get+$1500+for+dental+implant+participation+near+me&forceKeyD=get+$1500+for+dental+implants+participations+in+{city}&forceKeyE=get+$1950+for+dental+implants+participations+in+{city}&forceKeyF=&s1pplacement={{placement}}",
    "title": "\"How Clinical Trials Are Innovating Dental Implant Solutions\"",
    "description": "Explore how clinical trials are revolutionizing dental implants, enhancing effectiveness and patient outcomes in the field of dentistry.",
    "locale": "en_US"
  },
  "246": {
    "url": "https://etoptip.com/education/how-online-courses-boost-career-growth-en-us/?segment=rsoc.sc.etoptip.002&headline=Learn+more+about+Apply+for+Online+School+that+Gives+You+%24+and+Laptops+Today&forceKeyA=apply+for+online+school+that+gives+you+$+and+laptops+today&forceKeyB=apply+for+online+school+that+gives+you+$+and+laptops+today&forceKeyC=apply+for+online+school+that+gives+you+$+and+laptops+today+summer+2026&forceKeyD=apply+for+online+school+that+gives+you+$+and+laptops+today+{month}+2026&forceKeyE=online+colleges+that+give+you+a+computer&forceKeyF=online+colleges+that+give+you+a+computer+{state}&s1pplacement={{placement}}",
    "title": "How Online Courses Enhance Career Advancement Opportunities",
    "description": "Discover how online courses can enhance your career prospects and provide valuable skills for professional growth in today's competitive job market.",
    "locale": "en_US"
  },
  "247": {
    "url": "https://etoptip.com/education/how-to-earn-a-high-school-diploma-online-en-us-2/?segment=rsoc.sc.etoptip.002&headline=What%20to%20Know%20About%20Graduating%20Online&forceKeyA=apply+for+online+school+that+gives+you+$+and+laptops+today+{month}+2026&forceKeyB=apply+for+online+school+that+gives+you+$+and+laptops+near+me&forceKeyC=apply+for+online+school+high+school+that+gives+you+a+computer+now&forceKeyD=apply+for+online+school+that+gives+you+$+and+laptops+today+{month}+2026&forceKeyE=apply+for+online+school+that+gives+you+$+and+laptops+in+{city}&forceKeyF=&s1pplacement={{placement}}",
    "title": "Earning Your High School Diploma Online: Key Information",
    "description": "Discover essential information on earning a high school diploma online, including program options, benefits, and tips for success.",
    "locale": "en_US"
  },
  "248": {
    "url": "https://etoptip.com/health/how-dental-implant-trials-advance-care-en-us/?segment=rsoc.sc.etoptip.002&headline=How+Do+Dental+Implant+Trials+Enhance+Care&forceKeyA=dental+implant+clinic+near+me&forceKeyB=get+$1950+for+dental+implants+participation+near+me&forceKeyC=$1500+for+dental+implants+participations+in+vista&forceKeyD=get+$1500+for+dental+implants+participation+near+me&forceKeyE=best+get+$1950+for+dental+implants+participation+near+me&forceKeyF=$1500+for+dental+implants+participations+in+vista&s1pplacement={{placement}}",
    "title": "Advancements in Dental Implant Trials and Patient Care",
    "description": "Discover how dental implant trials are improving patient care and advancing treatment options in the field of dentistry.",
    "locale": "en_US"
  },
  "249": {
    "url": "https://etoptip.com/education/how-to-earn-a-high-school-diploma-online-en-us/?segment=rsoc.sc.etoptip.002&headline=What%20to%20Know%20About%20Graduating%20Online&forceKeyA=apply+for+online+school+high+school+that+gives+you+a+computer+now&forceKeyB=apply+for+online+school+that+gives+you+$+and+laptops+near+me&forceKeyC=apply+for+online+school+high+school+that+gives+you+a+computer+now&forceKeyD=apply+for+online+school+that+gives+you+$+and+laptops+today+{month}+2026&forceKeyE=apply+for+online+school+that+gives+you+$+and+laptops+in+{city}&forceKeyF=&s1pplacement={{placement}}",
    "title": "Earning Your High School Diploma Online: Key Insights and Tips",
    "description": "Discover essential information about earning a high school diploma online, including options, requirements, and benefits for a flexible educational path.",
    "locale": "en_US"
  },
  "250": {
    "url": "https://etoptip.com/health/how-are-dental-implant-trials-advancing-care-en-us/?segment=rsoc.sc.etoptip.002&headline=How+Do+Dental+Implant+Trials+Enhance+Care&forceKeyA=free+dental+implants+near+me&forceKeyB=get+$1950+for+dental+implants+participation+near+me&forceKeyC=$1500+for+dental+implants+participations+in+{city}&forceKeyD=get+$1500+for+dental+implants+participation+near+me&forceKeyE=best+get+$1950+for+dental+implants+participation+near+me&forceKeyF=$1500+for+dental+implants+participations+in+{city}&s1pplacement={{placement}}",
    "title": "Advancements in Dental Implant Trials and Patient Care",
    "description": "Explore how dental implant trials are advancing patient care and improving outcomes in dental health, highlighting innovative approaches and research developments.",
    "locale": "en_US"
  },
  "251": {
    "url": "https://etoptip.com/health/are-diabetes-studies-improving-treatment-en-us/?segment=rsoc.sc.etoptip.002&headline=diabetes+treatment+trial&forceKeyA=diabetes+management+programs&forceKeyB=diabetes+studies+testing+new+treatments+$3000+near+me&forceKeyC=diabetes+study+testing+new+treatments&forceKeyD=diabetes+study+testing+new+medications+$3000+near+{state}&forceKeyE=diabetes+study+testing+new+treatments+$3000+near+me&forceKeyF=diabetes+studies+using+new+treatments+$3000+near+me&s1pplacement={{placement}}",
    "title": "Advancements in Diabetes Studies: Enhancing Treatment Options",
    "description": "Explore the latest advancements in diabetes studies and how they are enhancing treatment options for better management of the condition.",
    "locale": "en_US"
  },
  "252": {
    "url": "https://etoptip.com/health/benefits-of-joining-dental-implant-trials-en-us-2/?segment=rsoc.sc.etoptip.002&headline=Dental%20Implant%20Participation&forceKeyA=dental+implant+trials+near+me&forceKeyB=get+$1500+for+dental+implant+participation+near+{city}&forceKeyC=get+$1950+for+dental+implants+participations+in+{city}&forceKeyD=teeth+fixing+near+me&forceKeyE=get+$1500+for+dental+implants+participation+near+{city}&forceKeyF=dental+implant+trials+in+{city}&s1pplacement={{placement}}",
    "title": "\"Exploring the Benefits of Dental Implant Trials\"",
    "description": "Discover the advantages of participating in dental implant trials, including potential financial incentives and access to innovative treatments for oral health.",
    "locale": "en_US"
  },
  "253": {
    "url": "https://etoptip.com/automotive/what-makes-full-size-pickup-trucks-versatile-en-us/?segment=rsoc.sc.etoptip.002&headline=Learn+About+Top+Pickup+Models&forceKeyA=100+accepted+0+down+new+f150+and+ram+trucks+near+me+apply+now&forceKeyB=100+accepted+0+down+options+new+f150+and+ram+trucks+near+me+[at+low+cost]+apply+now&forceKeyC=100+accepted+0+down+options+new+f150+and+ram+trucks+-+near+me+apply+now&forceKeyD=100%+accepted+0+down+options+-+new+f150+and+ram+trucks+near+me+apply+now&forceKeyE=100+accepted+0+down+new+f150+and+ram+trucks+near+me+apply+now&forceKeyF=100%+accepted+-+0+down+options+-+new+f150+and+ram+trucks+near+me&s1pplacement={{placement}}",
    "title": "The Versatility of Full-Size Pickup Trucks Explained",
    "description": "Discover the factors that contribute to the versatility of full-size pickup trucks, highlighting their capabilities, features, and top models in the market.",
    "locale": "en_US"
  },
  "254": {
    "url": "https://etoptip.com/technology/how-do-major-internet-providers-compare-en-us/?segment=rsoc.sc.etoptip.002&headline=Learn+About+Affordable+Internet+Plans&forceKeyA=senior+internet+program+(available+at+my+address)&forceKeyB=10+internet+in+my+zip+code&forceKeyC=what+is+the+best+internet+service+for+seniors+(see+prices)&forceKeyD=low+cost+internet+plans+by+zip+code+-+for+seniors&forceKeyE=10+internet+providers+in+my+zip+code&forceKeyF=high-speed+internet+for+seniors&s1pplacement={{placement}}",
    "title": "Comparing Major Internet Providers: Options for Seniors",
    "description": "Discover how major internet providers compare in the U.S., focusing on affordability and options tailored for seniors and specific zip codes.",
    "locale": "en_US"
  },
  "255": {
    "url": "https://etoptip.com/health/what-drives-the-surge-in-body-contouring-en-us/?segment=rsoc.sc.etoptip.002&headline=Learn+About+Fat+Removal+Clinical+Research&forceKeyA=1500+for+belly+fat+reduction+treatment+participation+near+me&forceKeyB=1500+for+belly+fat+reduction+treatment+participation+near+my+zipcode+[+coolsculpting+]&forceKeyC=1500+for+belly+fat+removal+without+surgery+participation+[coolsculpting+zepbound]&forceKeyD=1500+for+belly+fat+removal+without+surgery+participation&forceKeyE=1500+for+belly+fat+reduction+treatment+participation+near+me+[+coolsculpting+]&forceKeyF=1500+for+belly+fat+reduction+treatment+participation&s1pplacement={{placement}}",
    "title": "\"Exploring the Rise of Body Contouring Trends and Technologies\"",
    "description": "Explore the factors driving the rise in body contouring, including innovative fat removal techniques and the latest clinical research findings.",
    "locale": "en_US"
  },
  "256": {
    "url": "https://etoptip.com/education/why-choose-online-high-school-for-your-diploma-en-us/?segment=rsoc.sc.etoptip.002&headline=Online%20School&forceKeyA=apply+for+online+school+that+gives+you+cash+and+laptops+today&forceKeyB=apply+for+online+school+that+gives+you+cash+and+laptops+today&forceKeyC=apply+for+online+school+that+gives+you+$+and+laptops+in+{city}&forceKeyD=apply+for+online+school+that+gives+you+$+and+laptops+today+{month}+2026&forceKeyE=best+online+school+that+gives+you+$+and+laptops+in+{city}&forceKeyF=apply+for+online+schools+that+give+you+$+and+laptops+in+{city}&s1pplacement={{placement}}",
    "title": "Benefits of Choosing Online High School for Your Diploma",
    "description": "Discover the benefits of choosing an online high school for your diploma, including flexibility, personalized learning, and access to resources tailored to your needs.",
    "locale": "en_US"
  },
  "257": {
    "url": "https://etoptip.com/health/why-asthma-clinical-trials-matter-en-us/?segment=rsoc.sc.etoptip.002&headline=asthma+study&forceKeyA=best+$6000+for+asthma+treatments+participation+near+my+zipcode&forceKeyB=$6000+in+[state]+for+asthma+treatment+participation+near+my+zipcode&forceKeyC=$6000+for+asthma+treatments+participation+near+my+zipcode&forceKeyD=$6000+in+[city]+for+asthma+treatment+participation+near+my+zipcode&forceKeyE=$6000+for+asthma+treatment+participation+in+[city]&forceKeyF=$6000+paid+for+asthma+treatments+participation+near+my+zipcode&s1pplacement={{placement}}",
    "title": "The Importance of Asthma Clinical Trials in Advancing Treatments",
    "description": "Discover the importance of asthma clinical trials and how they contribute to advancing treatment options and improving patient outcomes.",
    "locale": "en_US"
  },
  "258": {
    "url": "https://etoptip.com/lifestyle/how-senior-apartments-enhance-well-being-en-us/?segment=rsoc.sc.etoptip.002&headline=Learn+More+About+Senior+Housing+Apartments+Today&forceKeyA=seniors+residence+near+me&forceKeyB=62+and+older+apartments+near+me&forceKeyC=apartments+55+and+older+near+me&forceKeyD=see+55+and+older+apartments+near+me&forceKeyE=55+and+older+apartment+near+me&forceKeyF=55+and+older+apartments+near+me&s1pplacement={{placement}}",
    "title": "\"How Senior Apartments Promote Enhanced Well-Being\"",
    "description": "Discover how senior apartments can improve well-being and foster a vibrant lifestyle for older adults, promoting community and independence.",
    "locale": "en_US"
  },
  "259": {
    "url": "https://etoptip.com/health/botox-pricing-explained-what-you-need-to-know-before-you-pay/?segment=rsoc.sc.etoptip.002&headline=Learn+More+About+Botox+and+Juvederm&forceKeyA=botox+special+near+me&forceKeyB=get+$99+botox+doctor+near+me+full+botox&forceKeyC=botox+special+near+me&forceKeyD=botox+clinics+near+me&forceKeyE=cosmetic+injections+near+me&forceKeyF=best+botox+injector+near+me&s1pplacement={{placement}}",
    "title": "Understanding Botox Pricing: Key Factors to Consider",
    "description": "Explore essential insights on Botox pricing, including factors that influence costs and what to consider before your treatment.",
    "locale": "en_US"
  }
};

  // 2) OG metadata map (injected from your domain_settings tab)
  const ogMetaMap = {
  "https://health-helpers.com": {
    "site_name": "Health Helpers",
    "image": "https://health-helpers.com/assets/wellnessauthority-og.png",
    "image_alt": "Smiling healthcare professional providing guidance and support.",
    "type": "article"
  },
  "https://vitals-nest.com": {
    "site_name": "VitalsNest",
    "image": "https://vitals-nest.com/assets/vitalsnest-og.png",
    "image_alt": "Calm and modern design representing health and wellness balance.",
    "type": "article"
  },
  "https://wellness-authority.com": {
    "site_name": "Wellness Authority",
    "image": "https://wellness-authority.com/assets/healthhelpers-og.png",
    "image_alt": "Peaceful wellness setting with natural light and greenery.",
    "type": "article"
  },
  "https://wheel-home.com": {
    "site_name": "WheelHome",
    "image": "https://wheel-home.com/assets/wheelhome-og.png",
    "image_alt": "A modern car exterior with a connected lifestyle vibe.",
    "type": "article"
  },
  "https://consciousconsumerinfo.com": {
    "site_name": "ConsciousConsumer",
    "image": "https://consciousconsumerinfo.com/assets/consciousconsumer-og.png",
    "image_alt": "Eco-friendly products and sustainable lifestyle imagery.",
    "type": "article"
  },
  "https://insiderconsumers.com": {
    "site_name": "InsiderConsumer",
    "image": "https://insiderconsumers.com/assets/insiderconsumer-og.png",
    "image_alt": "Consumer trends displayed on digital screens and analytics charts.",
    "type": "article"
  },
  "https://trending-genius.com": {
    "site_name": "TrendingGenius",
    "image": "https://trending-genius.com/assets/trendinggenius-og.png",
    "image_alt": "Abstract brain and idea visuals symbolizing innovation.",
    "type": "article"
  },
  "https://trendy-review.com": {
    "site_name": "TrendyReview",
    "image": "https://trendy-review.com/assets/trendyreview-og.png",
    "image_alt": "Hands typing product reviews on a laptop with a coffee cup.",
    "type": "article"
  },
  "https://trending-briefs.com": {
    "site_name": "TrendingBriefs",
    "image": "https://trending-briefs.com/assets/trendingbriefs-og.png",
    "image_alt": "Modern digital feed showing trending news headlines.",
    "type": "article"
  },
  "https://techfuelus.com": {
    "site_name": "TechFuel",
    "image": "https://techfuelus.com/assets/techfuel-og.png",
    "image_alt": "Futuristic tech background with circuits and glowing lights.",
    "type": "article"
  },
  "https://trendyfuel.com": {
    "site_name": "TrendyFuel",
    "image": "https://trendyfuel.com/assets/trendyfuel-og.png",
    "image_alt": "Dynamic energy burst graphic representing innovation and growth.",
    "type": "article"
  },
  "https://insight-bulletin.com": {
    "site_name": "Insight Bulletin",
    "image": "https://insight-bulletin.com/assets/insightbulletin-og.png",
    "image_alt": "Clean editorial layout showing charts and business articles.",
    "type": "article"
  },
  "https://top-mind-grid.com": {
    "site_name": "MindGrid",
    "image": "https://top-mind-grid.com/assets/mindgrid-og.png",
    "image_alt": "Stylized digital grid symbolizing modern ideas and trends.",
    "type": "article"
  },
  "https://the-clarity-central.com": {
    "site_name": "Clarity Central",
    "image": "https://the-clarity-central.com/assets/claritycentral-og.png",
    "image_alt": "Minimalist design with clear glass elements and modern type.",
    "type": "article"
  },
  "https://the-buzz-lens.com": {
    "site_name": "Buzz Lens",
    "image": "https://the-buzz-lens.com/assets/buzzlens-og.png",
    "image_alt": "Close-up camera lens reflecting trending social content.",
    "type": "article"
  },
  "https://savvy-scope.com": {
    "site_name": "SavvyScope",
    "image": "https://savvy-scope.com/assets/savvyscope-og.png",
    "image_alt": "A magnifying glass highlighting insights and discoveries.",
    "type": "article"
  },
  "https://last-call-tech.com": {
    "site_name": "Last Call Tech",
    "image": "https://last-call-tech.com/assets/lastcalltech-og.png",
    "image_alt": "Dark tech illustration symbolizing late-night automation, systems, and infrastructure.",
    "type": "article"
  },
  "https://everything-today.com": {
    "site_name": "Everything Today",
    "image": "https://everything-today.com/assets/everythingtoday-og.jpg",
    "image_alt": "Glowing systems illustrate automation, productivity, and interconnected technology working continuously.",
    "type": "article"
  }
};

  // 3) Detect if this is a crawler (Facebook, Twitter, Slack, etc.)
  const ua = (request.headers.get("user-agent") || "").toLowerCase();
  const isCrawler =
    /(facebookexternalhit|facebot|twitterbot|linkedinbot|slackbot|discordbot|embedly|whatsapp|telegram|preview)/i.test(ua);

  // 4) If it's a crawler, serve OG metadata directly (no redirect)
  if (isCrawler) {
    const host = reqUrl0.hostname.replace(/^www\./, "");
    const meta = ogMetaMap["https://" + host] || ogMetaMap[host];

    if (meta) {
      const row = redirectMap && id ? redirectMap[id] : null;

      const html = `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="utf-8">
            <title>${meta.site_name}</title>
            <meta property="og:url" content="${request.url}">
            <meta property="og:type" content="${meta.type}">
            <meta property="og:title" content="${(row && row.title) ? row.title : meta.site_name}">
            <meta property="og:description" content="${(row && row.description) ? row.description : meta.image_alt}">
            <meta property="og:image" content="${meta.image}">
            <meta property="og:image:alt" content="${meta.image_alt}">
            <meta property="og:site_name" content="${meta.site_name}">
            <meta property="og:locale" content="${(row && row.locale) ? row.locale : "en_US"}">
            <meta property="og:updated_time" content="${Math.floor(Date.now() / 1000)}">
          </head>
          <body>
            <p>Preview for ${meta.site_name}</p>
          </body>
        </html>`;

      return new Response(html, {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" }
      });
    }
  }

  // 5) Normal redirect configuration
  const FALLBACK_URL = "https://www.facebook.com";

  // Post to MULTIPLE collectors (existing Apps Script + Cloud Run)
  const COLLECTORS = [
    "https://click-collector-583868590168.us-central1.run.app/collect"
  ];

  // 6) Helpers
  function isFbIgInApp(uaStr) {
    const u = (uaStr || "").toLowerCase();
    return u.includes("fban") || u.includes("fbav") || u.includes("fb_iab") || u.includes("instagram");
  }

  function isValidS1pcid(v) {
    if (!v) return false;
    const t = String(v).trim();
    if (t.startsWith("{")) return false;
    return /^[0-9]{6,}$/.test(t);
  }

  function makeFbcFromFbclid(fbclid) {
    if (!fbclid) return null;
    const ts = Math.floor(Date.now() / 1000);
    return `fb.1.${ts}.${fbclid}`;
  }

  function makeFbp() {
    const ts = Math.floor(Date.now() / 1000);
    const rand = Math.random().toString(36).slice(2);
    return `fb.1.${ts}.${rand}`;
  }

  function uuidv4() {
    return crypto.randomUUID
      ? crypto.randomUUID()
      : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
          const r = (Math.random() * 16) | 0;
          const v = c === "x" ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        });
  }

  function appendCookie(h, name, value, maxAgeDays = 90) {
    if (!value) return;
    const maxAge = maxAgeDays * 24 * 3600;
    h.append("Set-Cookie", `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax`);
  }

  function redirectResponse(locationUrl, extraHeaders) {
    const h = new Headers({ Location: locationUrl });
    if (extraHeaders) for (const [k, v] of extraHeaders.entries()) h.append(k, v);
    return new Response(null, { status: 302, headers: h });
  }

  // Fire-and-forget POSTs (we don?t wait for them)
  function postToCollectors(payload, context) {
    for (const endpoint of COLLECTORS) {
      const controller = new AbortController();
      const kill = setTimeout(() => controller.abort(), 1500);

      context.waitUntil(
        fetch(endpoint, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
          keepalive: true,
          redirect: "manual",
          signal: controller.signal
        })
          .catch(() => {})
          .finally(() => clearTimeout(kill))
      );
    }
  }

  // ? NEW: derive event_source_url from destination domain (search.<root>.com)
  function deriveEventSourceUrl(destUrl) {
    try {
      const parts = new URL(destUrl).hostname.replace(/^www\./, "").split(".");
      if (!parts || parts.length < 2) return null;
      return "https://search." + parts[parts.length - 2] + ".com/";
    } catch {
      return null;
    }
  }

  // 7) Inputs
  const uaHead = request.headers.get("user-agent") || "";
  const base = id ? redirectMap[id] : null;

  const inApp = isFbIgInApp(uaHead);
  const rawS1 = url.searchParams.get("s1pcid") || "";
  const s1ok = isValidS1pcid(rawS1);

  // 8) Handle unknown IDs
  if (!base) {
    console.log("Redirect", { id, inApp, s1ok, reason: "unknown id", dest: "https://facebook.com" });
    return redirectResponse("https://facebook.com");
  }

  // 9) Build final destination (preserve most params)
  const DROP = new Set([
    "utm_medium", "utm_id", "utm_content", "utm_term", "utm_campaign", "iab", "id"
  ]);

  if (!base || !base.url) {
    console.log("Redirect", { id, reason: "missing base.url", dest: "https://facebook.com" });
    return redirectResponse("https://facebook.com");
  }

  let dest;
  try {
    dest = new URL(base.url);
  } catch (err) {
    console.error("Invalid redirect URL", base, err);
    return redirectResponse("https://facebook.com");
  }

  // copy through allowed params
  url.searchParams.forEach((value, key) => {
    if (!DROP.has(key)) dest.searchParams.set(key, value);
  });

  // 10) Capture event
  const now = Math.floor(Date.now() / 1000);
  const uid = uuidv4();

  dest.searchParams.set("s1padid", uid);
  if (!s1ok) dest.searchParams.delete("s1pcid");

  // ?? S1 placement tracking ??????????????????????????????????
  // Meta substitutes {{site_source_name}} and {{placement}} macros into the
  // ad URL at click time, so they arrive as regular query params. We combine
  // them into a single s1pplacement value so S1 can attribute performance
  // back to specific placements (Facebook/Instagram feed, stories, reels, etc).
  // If either is missing (direct traffic, link-preview crawlers, etc.) we use
  // "unknown" so S1 still has a categorizable value instead of a blank.
  const siteSourceName = url.searchParams.get("site_source_name") || "unknown";
  const placement = url.searchParams.get("placement") || "unknown";
  const s1pplacement = `${siteSourceName}-${placement}`;
  dest.searchParams.set("s1pplacement", s1pplacement);

  // ?? Audience Network detection ?????????????????????????????
  // Meta's {{site_source_name}} macro returns "an" for Audience Network
  // placements (rewarded video, interstitials in third-party apps, etc.).
  // AN traffic converts poorly on RSOC ? users tap through game rewards
  // with zero search intent. We STILL redirect AN users to the article
  // (they can still generate revenue) but we do NOT inject upper-funnel
  // postback URLs. Without those URLs, S1 never pings our CAPI receivers,
  // so Meta never sees PageView/Search/Lead events from AN traffic.
  // This starves Meta's algorithm of positive signal from AN and pushes
  // spend toward Feed, Reels, and Stories where intent is higher.
  // Purchase (rev_click_track_url) is ALWAYS injected so revenue
  // attribution remains complete regardless of placement.
  const isAudienceNetwork = siteSourceName.toLowerCase() === "an";

  // ?? S1 Postback URL Injection ??????????????????????????????
  // Upper-funnel events fire instantly via dedicated endpoints;
  // each receiver fires the corresponding Meta CAPI event within ~300ms
  // of the postback. Purchase (revenue) still uses the 15-min batch cron.
  const originBase = `https://${url.hostname}`;

  // content_category for Lead CAPI events. Pull from the redirectMap row so
  // each campaign's vertical (insurance/loans/solar/etc.) is stamped on the
  // Lead fire. Falls back to the campaign id if the row has no category.
  const leadCategory = encodeURIComponent(
    (base && base.category) ? base.category : (id || "unknown")
  );

  // Upper-funnel postback URLs: only injected for non-AN placements.
  // AN traffic still reaches the article and can earn revenue, but Meta
  // won't receive optimization signal from these low-intent clicks.
  if (!isAudienceNetwork) {
    // impression_track_url: fires when the widget loads (Meta "PageView")
    dest.searchParams.set(
      "impression_track_url",
      `${originBase}/api/s1-impression?click_id=${uid}`
    );

    // search_track_url: fires when the user searches (Meta "Search").
    // &q=OMKEYWORD is an S1 macro ? S1 replaces OMKEYWORD with the actual
    // search query at fire time, and our receiver forwards it to Meta as
    // custom_data.search_string.
    dest.searchParams.set(
      "search_track_url",
      `${originBase}/api/s1-search?click_id=${uid}&q=OMKEYWORD`
    );

    // click_track_url: fires when the user clicks a monetized result (Meta "Lead").
    // This is the instant-fire event campaigns will optimize on.
    // &cat=... carries the ad vertical through to custom_data.content_category.
    dest.searchParams.set(
      "click_track_url",
      `${originBase}/api/s1-lead?click_id=${uid}&cat=${leadCategory}`
    );
  }

  // rev_click_track_url: ALWAYS injected (even for AN) ? revenue attribution
  // must remain complete. Purchase events still flow through the batch cron.
  dest.searchParams.set(
    "rev_click_track_url",
    `${originBase}/api/s1-postback?click_id=${uid}&type=revenue&revenue=ESTIMATED_CONVERSION_VALUE`
  );
  // ?? End S1 Postback URL Injection ??????????????????????????

  const rawCookie = request.headers.get("cookie") || "";
  const cookieMap = Object.fromEntries(
    rawCookie.split(/;\s*/).filter(Boolean).map(c => {
      const i = c.indexOf("=");
      return i === -1 ? [c, ""] : [c.slice(0, i), decodeURIComponent(c.slice(i + 1))];
    })
  );

  const fbclid = url.searchParams.get("fbclid") || null;
  const fbc = cookieMap._fbc || makeFbcFromFbclid(fbclid);
  const fbp = cookieMap._fbp || makeFbp();

  const ipHeader =
    request.headers.get("x-forwarded-for") ||
    request.headers.get("x-real-ip") ||
    request.headers.get("x-nf-client-connection-ip") ||
    "";
  const client_ip = ipHeader.split(",")[0].trim();

  // ?? Geo capture from Netlify edge context ?????????????????
  // context.geo is populated by Netlify's edge runtime from the IP
  // (MaxMind under the hood). Free, no extra API call. Used to enrich
  // Meta CAPI user_data with city/state/zip/country to lift event
  // match quality. Fields default to null when geo lookup fails
  // (rare ? usually only on private/unroutable IPs).
  const geo = (context && context.geo) || {};
  const geo_city = geo.city || null;
  const geo_region = (geo.subdivision && geo.subdivision.code) || null;       // ISO 3166-2 subdivision (e.g. "CA")
  const geo_postal_code = geo.postalCode || null;
  const geo_country = (geo.country && geo.country.code) || null;              // ISO 3166-1 alpha-2 (e.g. "US")

  const isFallback = !inApp && !s1ok;
  const finalLocation = isFallback ? FALLBACK_URL : dest.href;

  // ? ONLY CHANGE vs source-of-truth: event_source_url value
  const event_source_url = deriveEventSourceUrl(finalLocation) || request.url;

  // 10b) Send click data to collector(s) for BigQuery ingestion
  try {
    postToCollectors({
      uid,
      fbclid,
      fbc,
      fbp,
      id,
      s1pcid: rawS1 || null,
      inApp,
      client_ip,
      event_time: now,
      event_source_url,
      ua: uaHead,
      dest: finalLocation,
      placement: s1pplacement,
      // Geo (from context.geo) ? enriches Meta CAPI user_data for EMQ
      geo_city,
      geo_region,
      geo_postal_code,
      geo_country
    }, context);
  } catch {}

  // 11) Log fallback reason for users not sent to article
  if (isFallback) {
    const failure_reason =
      !id ? "missing_id" :
      !redirectMap[id] ? "unknown_id" :
      (!inApp && !s1ok) ? "not_in_app_and_invalid_s1pcid" :
      !inApp ? "not_in_app" :
      !s1ok ? "invalid_s1pcid" :
      "other";

    console.log("FallbackDecision", {
      id,
      failure_reason,
      inApp,
      s1ok,
      has_fbclid: !!fbclid,
      has_fbc: !!fbc,
      has_fbp: !!fbp,
      host: url.hostname,
      path: url.pathname,
      event_source_url
    });
  }

  // 12) Set cookies + redirect
  const cookieHeaders = new Headers();
  appendCookie(cookieHeaders, "_fbc", fbc);
  appendCookie(cookieHeaders, "_fbp", fbp);
  appendCookie(cookieHeaders, "uid", uid);

  console.log("Redirect", { id, inApp, s1ok, isFallback, dest: finalLocation });
  return redirectResponse(finalLocation, cookieHeaders);
};