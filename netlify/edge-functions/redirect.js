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

  // ===== V2 redirect with logging + click capture =====
  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  // 1) Redirect map (injected by your Sheet push)
  const redirectMap = {
  "100": {
    "url": "https://google.com",
    "title": "\"Exploring the Evolution and Impact of Google Search\"",
    "description": "Google is a powerful search engine that provides quick access to information, images, and services across the web, connecting users with diverse content effortlessly.",
    "locale": "en_US"
  },
  "107": {
    "url": "https://read.mdrntoday.com/automotive/2025-nissan-rogue-pricing-what-to-expect-and-how-it-stacks-up-en-us-3/?segment=rsoc.sc.mdrntoday.001&headline=nissan+rogue+suv&forceKeyA=For+Seniors:+2024+Rogue+Crossover+Suvs+Nearby+(rogue)+no+Cost&forceKeyB=100+Accepted+|+0+Down+Options+-+Rogue+2024+Crossover+Suvs+Nearby+(rogue)+no+Cost&forceKeyC=Nearby+Rogue+-+Zero+Down+100+Accepted+Suvs&forceKeyD=100+Accepted+|+2024+Rogue+Crossover+Suvs+Nearby+(rogue)+no+Cost+Payment&forceKeyE=100+Accepted+-+0+Down+Options+-+Rogue+Crossover+Suvs+Nearby+-+Rogue&forceKeyF=100+Accepted+|+0+Down+Dealerships+-+Leftover+Crossover+Suvs+Nearby+no+Cost+(rogue)&fbid=1786225912279573&fbland=PageView&fbserp=AddToCart&fbclick=Purchase&utm_source=facebook",
    "title": "2025 Nissan Rogue Pricing: Key Insights and Comparisons",
    "description": "Explore the pricing and features of the 2025 Nissan Rogue, examining how it compares to competitors and what to anticipate in the upcoming model.",
    "locale": "en_US"
  },
  "108": {
    "url": "https://economicminds.com/health/how-are-affordable-dental-implants-changing-smiles-en-us/?segment=rsoc.sc.economicminds.003&headline=Dental+Implants+Participation&forceKeyA=$1500+for+Dental+Implants+Participation+Near+Me&forceKeyB=$1500+for+Dental+Implants+Participation+in+{City}&forceKeyC=Get+$1500+for+Dental+Implants+Participation&forceKeyD=$1500+for+Dental+Implants+Participation+{month}+{year}&forceKeyE=No-Fee+Dental+Implants&forceKeyF=$1500+for+Dental+Implants+Participation+[search+Now]&fbid=872536505175912&fbland=PageView&fbserp=AddToCart&fbclick=Purchase&utm_source=facebook",
    "title": "Affordable Options for Dental Implants: What You Need to Know",
    "description": "Explore affordable dental implant options, including cost-effective solutions and key considerations for enhancing your dental health without breaking the bank.",
    "locale": "en_US"
  },
  "109": {
    "url": "https://your-moneylife.com/health/how-are-dental-implant-trials-transforming-care-en-us/?segment=rsoc.sc.yourmoneylife.002&headline=Dental+Implants+Participation&forceKeyA=$1500+for+Dental+Implants+Participation+Near+Me&forceKeyB=$1500+for+Dental+Implants+Participation+in+{City}&forceKeyC=Get+$1500+for+Dental+Implants+Participation&forceKeyD=$1500+for+Dental+Implants+Participation+{month}+{year}&forceKeyE=No-Fee+Dental+Implants&forceKeyF=$1500+for+Dental+Implants+Participation+[search+Now]&fbid=872536505175912&fbland=PageView&fbserp=AddToCart&fbclick=Purchase&utm_source=facebook",
    "title": "\"Exploring the Impact of Dental Implant Trials on Oral Health\"",
    "description": "Explore how dental implant trials contribute to improved oral health, examining their benefits, processes, and impact on dental care advancements.",
    "locale": "en_US"
  },
  "110": {
    "url": "https://insightfinds.com/health/how-can-dental-implant-trials-save-you-money-en-us-2/?segment=rsoc.sc.insightfinds.003&headline=dental+implants+trial&forceKeyA=get+$1950+for+dental+implant+participation+near+me&forceKeyB=free+dental+implants+near+me&forceKeyC=get+$1950+for+dental+implant+participation+nearby&forceKeyD=free+dental+implants+nearby&forceKeyE=get+$1950+for+dental+implants+participation+near+me&forceKeyF=free+dental+implant+near+me&fbid=872536505175912&fbland=PageView&fbserp=AddToCart&fbclick=InitiateCheckout",
    "title": "\"Exploring the Cost Benefits of Dental Implant Trials\"",
    "description": "Explore how dental implant trials can provide cost-saving opportunities, offering insights into potential financial benefits and innovative dental solutions.",
    "locale": "en_US"
  },
  "111": {
    "url": "https://insightfinds.com/health/affordable-dental-implant-solutions-explored-en-us-1/?segment=rsoc.sc.insightfinds.003&headline=dental+implants+trial&forceKeyA=get+$1950+for+dental+implant+participation+near+me&forceKeyB=free+dental+implants+near+me&forceKeyC=get+$1950+for+dental+implant+participation+nearby&forceKeyD=free+dental+implants+nearby&forceKeyE=get+$1950+for+dental+implants+participation+near+me&forceKeyF=free+dental+implant+near+me&fbid=872536505175912&fbland=PageView&fbserp=AddToCart&fbclick=InitiateCheckout",
    "title": "Exploring Affordable Options for Dental Implants",
    "description": "Explore various affordable dental implant solutions, focusing on accessible options and innovative approaches to enhance dental health without breaking the bank.",
    "locale": "en_US"
  },
  "112": {
    "url": "https://insightfinds.com/health/how-can-dental-implant-trials-save-you-money-en-us/?segment=rsoc.sc.insightfinds.003&headline=dental+implants+trial&forceKeyA=get+$1950+for+dental+implant+participation+near+me&forceKeyB=free+dental+implants+near+me&forceKeyC=no-fee+dental+implants&forceKeyD=participate+in+dental+implants+trial+[sign+up+now]&forceKeyE=no+fee+dental+implant&forceKeyF=participate+in+dental+implants+trial+sign+up+now&fbid=872536505175912&fbland=PageView&fbserp=AddToCart&fbclick=InitiateCheckout",
    "title": "Saving Money Through Dental Implant Trials: A Practical Guide",
    "description": "Discover how participating in dental implant trials can reduce costs and provide access to innovative treatments while contributing to dental research.",
    "locale": "en_US"
  },
  "113": {
    "url": "https://insightfinds.com/health/affordable-dental-implant-solutions-explored-en-us/?segment=rsoc.sc.insightfinds.003&headline=dental+implants+trial&forceKeyA=free+dental+implants+near+me&forceKeyB=no+fee+dental+implant&forceKeyC=no-fee+dental+implants&forceKeyD=participate+in+dental+implants+trial+[sign+up+now]&forceKeyE=participate+in+dental+implants+trial+sign+up+now&forceKeyF=get+$1950+for+dental+implant+participation+near+me&fbid=872536505175912&fbland=PageView&fbserp=AddToCart&fbclick=InitiateCheckout",
    "title": "Exploring Affordable Solutions for Dental Implants",
    "description": "Explore various affordable dental implant solutions, examining options and innovations that make dental care more accessible and cost-effective.",
    "locale": "en_US"
  },
  "114": {
    "url": "https://insightfinds.com/automotive/what-makes-the-2026-nissan-rogue-a-smart-buy-en-us-2/?segment=rsoc.sc.insightfinds.003&headline=nissan+rogue+suv&forceKeyA=for+seniors:+2025+rogue+crossover+suvs+nearby+(rogue)+no+cost&forceKeyB=100+accepted+|+$50/month+-+rogue+2025+crossover+suvs+nearby+[no+cost]&forceKeyC=100+accepted+|+0+down+dealerships+-+leftover+crossover+suvs+nearby+no+cost+(rogue)&forceKeyD=for+seniors:+2024+rogue+crossover+suvs+nearby+(rogue)+[no+cost]&forceKeyE=for+seniors+2025+rogue+crossover+suv+nearby+rogue+no+cost&forceKeyF=nissan+rogue+lease+deals+$0+down&fbid=872536505175912&fbland=PageView&fbserp=AddToCart&fbclick=InitiateCheckout",
    "title": "\"Exploring the Benefits of the 2026 Nissan Rogue SUV\"",
    "description": "Discover the features and advantages of the 2026 Nissan Rogue, highlighting its practicality and innovative technology for modern drivers.",
    "locale": "en_US"
  },
  "115": {
    "url": "https://insightfinds.com/real-estate/choosing-senior-apartments-for-independent-living-en-us/?segment=rsoc.sc.insightfinds.003&headline=55+and+older+apartments&forceKeyA=senior+apartments+for+$300+a+month+near+me&forceKeyB=apartments+55+and+older+near+me&forceKeyC=see+55+and+older+apartment+near+me&forceKeyD=over+62+apartments+near+me&forceKeyE=62+and+over+apartments+near+me&forceKeyF=see+55+and+older+apartment+near+me+{state}&fbid=872536505175912&fbland=PageView&fbserp=AddToCart&fbclick=InitiateCheckout",
    "title": "Choosing Senior Apartments for Independent Living: Key Considerations",
    "description": "Explore essential considerations for choosing senior apartments designed for independent living, focusing on affordability, amenities, and community features.",
    "locale": "en_US"
  },
  "116": {
    "url": "https://insightfinds.com/automotive/how-does-the-2026-nissan-rogue-compare-en-us/?segment=rsoc.sc.insightfinds.003&headline=nissan+rogue+suv&forceKeyA=for+seniors:+2025+rogue+crossover+suvs+nearby+(rogue)+no+cost&forceKeyB=for+seniors+2025+rogue+crossover+suvs+nearby+rogue+no+cost&forceKeyC=100+accepted+|+$50/month+-+rogue+2025+crossover+suvs+nearby+[no+cost]&forceKeyD=for+seniors:+2025+rogue+crossover+suv+nearby+(rogue)+no+cost&forceKeyE=100+accepted+|+0+down+dealerships+-+leftover+crossover+suvs+nearby+no+cost+(rogue)&forceKeyF=for+seniors+2025+rogue+crossover+suvs+nearby+rogue+no+cost+january+2026&fbid=872536505175912&fbland=PageView&fbserp=AddToCart&fbclick=InitiateCheckout",
    "title": "Comparing Features of the 2026 Nissan Rogue SUV",
    "description": "Explore the features and specifications of the 2026 Nissan Rogue, comparing it with previous models and its competitors in the SUV market.",
    "locale": "en_US"
  },
  "117": {
    "url": "https://insightfinds.com/health/how-do-diabetes-trials-shape-future-care-en-us/?segment=rsoc.sc.insightfinds.003&headline=diabetes+clinical+trials&forceKeyA=best+diabetes+study+testing+new+treatments+$26700+near+me&forceKeyB=best+diabetes+study+testing+new+treatments+$26700&forceKeyC=best+diabetes+study+testing+new+treatments+$26700+near+{state}&forceKeyD=diabetes+clinical+studies+testing+new+treatments+$13675+near+me&forceKeyE=paid+clinical+trials+for+type+2+diabetes&forceKeyF=best+diabetes+study+testing+new+treatments+$13675+near+me&fbid=872536505175912&fbland=PageView&fbserp=AddToCart&fbclick=InitiateCheckout",
    "title": "The Impact of Diabetes Trials on Future Treatment Approaches",
    "description": "Explore how diabetes clinical trials are shaping future treatments and patient care, highlighting their impact on medical advancements and healthcare strategies.",
    "locale": "en_US"
  },
  "118": {
    "url": "https://your-moneylife.com/health/how-can-dental-implant-trials-save-you-money-en-us/?segment=rsoc.sc.yourmoneylife.002&headline=dental+implants+trial&forceKeyA=get+$1950+for+dental+implant+participation+near+me&forceKeyB=get+$1950+for+dental+implants+participation+near+me&forceKeyC=no-fee+dental+implants&forceKeyD=free+dental+implants+near+me&forceKeyE=get+paid+to+get+dental+implants&forceKeyF=participate+in+dental+implants+trial+sign+up+now&fbid=872536505175912&fbland=PageView&fbserp=AddToCart&fbclick=InitiateCheckout&s1pplacement=fbk&s1pcid={trackingField3}&subid={campaign_id}&nonrevsubid={cf_click_id}&impression_track_url=https%3A%2F%2Ftk.todays-last-call.com%2Fcf%2Fcv%3Fclick_id%3D{cf_click_id}%26ct%3Dland&search_track_url=https%3A%2F%2Ftk.todays-last-call.com%2Fcf%2Fcv%3Fclick_id%3D{cf_click_id}%26ct%3Dsearch&click_track_url=https%3A%2F%2Ftk.todays-last-call.com%2Fcf%2Fcv%3Fclick_id%3D{cf_click_id}%26ct%3Dconversion",
    "title": "\"Saving on Dental Implants: The Benefits of Trial Participation\"",
    "description": "Discover how participating in dental implant trials can offer significant savings on dental care, potentially covering costs while contributing to groundbreaking research.",
    "locale": "en_US"
  },
  "119": {
    "url": "https://economicminds.com/health/affordable-dental-implant-solutions-explored-en-us/?segment=rsoc.sc.economicminds.002&headline=dental+implants+trial&forceKeyA=get+$1950+for+dental+implant+participation+near+me&forceKeyB=free+dental+implants+near+me&forceKeyC=get+paid+to+get+dental+implants&forceKeyD=no+fee+dental+implant&forceKeyE=dental+assistant+program+near+me+{month}+2026&forceKeyF=participate+in+dental+implants+trial+sign+up+now&fbid=872536505175912&fbland=PageView&fbserp=AddToCart&fbclick=InitiateCheckout&s1pplacement=fbk&s1pcid={trackingField3}&subid={campaign_id}&nonrevsubid={cf_click_id}&impression_track_url=https%3A%2F%2Ftk.todays-last-call.com%2Fcf%2Fcv%3Fclick_id%3D{cf_click_id}%26ct%3Dland&search_track_url=https%3A%2F%2Ftk.todays-last-call.com%2Fcf%2Fcv%3Fclick_id%3D{cf_click_id}%26ct%3Dsearch&click_track_url=https%3A%2F%2Ftk.todays-last-call.com%2Fcf%2Fcv%3Fclick_id%3D{cf_click_id}%26ct%3Dconversion",
    "title": "Exploring Affordable Solutions for Dental Implants",
    "description": "Explore various affordable dental implant solutions, including options for trials and financial assistance, to help you achieve a healthier smile.",
    "locale": "en_US"
  },
  "120": {
    "url": "https://economicminds.com/health/finding-cost-effective-dental-implants-en-us-4/?segment=rsoc.sc.economicminds.002&headline=dental+implants+trial&forceKeyA=free+dental+implants+near+me&forceKeyB=get+paid+to+get+dental+implants&forceKeyC=paid+clinical+trials+for+dental+implants+near+me&forceKeyD=free+dental+implants+for+seniors&forceKeyE=no+cost+dental+implants&forceKeyF=free+dental+implants+clinical+trials+near+me+2026&fbid=872536505175912&fbland=PageView&fbserp=AddToCart&fbclick=InitiateCheckout&s1pplacement=fbk&s1pcid={trackingField3}&subid={campaign_id}&nonrevsubid={cf_click_id}&impression_track_url=https%3A%2F%2Ftk.todays-last-call.com%2Fcf%2Fcv%3Fclick_id%3D{cf_click_id}%26ct%3Dland&search_track_url=https%3A%2F%2Ftk.todays-last-call.com%2Fcf%2Fcv%3Fclick_id%3D{cf_click_id}%26ct%3Dsearch&click_track_url=https%3A%2F%2Ftk.todays-last-call.com%2Fcf%2Fcv%3Fclick_id%3D{cf_click_id}%26ct%3Dconversion",
    "title": "Cost-Effective Options for Dental Implants in the U.S.",
    "description": "Explore strategies for finding affordable dental implants in the U.S., including options for clinical trials and cost-effective solutions for various needs.",
    "locale": "en_US"
  },
  "121": {
    "url": "https://your-moneylife.com/health/affordable-dental-implant-solutions-explored-en-us/?segment=rsoc.sc.yourmoneylife.002&headline=dental+implants+trial&forceKeyA=get+$1950+for+dental+implant+participation+near+me&forceKeyB=free+dental+implants+near+me&forceKeyC=get+paid+to+get+dental+implants&forceKeyD=no+fee+dental+implant&forceKeyE=dental+assistant+program+near+me+{month}+2026&forceKeyF=participate+in+dental+implants+trial+sign+up+now&fbid=872536505175912&fbland=PageView&fbserp=AddToCart&fbclick=InitiateCheckout&s1pplacement=fbk&s1pcid={trackingField3}&subid={campaign_id}&nonrevsubid={cf_click_id}&impression_track_url=https%3A%2F%2Ftk.todays-last-call.com%2Fcf%2Fcv%3Fclick_id%3D{cf_click_id}%26ct%3Dland&search_track_url=https%3A%2F%2Ftk.todays-last-call.com%2Fcf%2Fcv%3Fclick_id%3D{cf_click_id}%26ct%3Dsearch&click_track_url=https%3A%2F%2Ftk.todays-last-call.com%2Fcf%2Fcv%3Fclick_id%3D{cf_click_id}%26ct%3Dconversion",
    "title": "Exploring Affordable Dental Implant Options and Solutions",
    "description": "Explore affordable dental implant solutions, including innovative programs and trials that may provide cost-effective options for those in need of dental care.",
    "locale": "en_US"
  },
  "122": {
    "url": "https://your-moneylife.com/health/finding-cost-effective-dental-implants-en-us-3/?segment=rsoc.sc.yourmoneylife.002&headline=dental+implants+trial&forceKeyA=free+dental+implants+near+me&forceKeyB=get+paid+to+get+dental+implants&forceKeyC=paid+clinical+trials+for+dental+implants+near+me&forceKeyD=free+dental+implants+for+seniors&forceKeyE=no+cost+dental+implants&forceKeyF=free+dental+implants+clinical+trials+near+me+2026&fbid=872536505175912&fbland=PageView&fbserp=AddToCart&fbclick=InitiateCheckout&s1pplacement=fbk&s1pcid={trackingField3}&subid={campaign_id}&nonrevsubid={cf_click_id}&impression_track_url=https%3A%2F%2Ftk.todays-last-call.com%2Fcf%2Fcv%3Fclick_id%3D{cf_click_id}%26ct%3Dland&search_track_url=https%3A%2F%2Ftk.todays-last-call.com%2Fcf%2Fcv%3Fclick_id%3D{cf_click_id}%26ct%3Dsearch&click_track_url=https%3A%2F%2Ftk.todays-last-call.com%2Fcf%2Fcv%3Fclick_id%3D{cf_click_id}%26ct%3Dconversion",
    "title": "Exploring Affordable Options for Dental Implants in the U.S.",
    "description": "Discover cost-effective options for dental implants, including potential trials and programs that may reduce expenses for those seeking dental solutions.",
    "locale": "en_US"
  },
  "123": {
    "url": "https://your-moneylife.com/health/how-can-dental-implant-trials-save-you-money-en-us/?segment=rsoc.sc.yourmoneylife.002&headline=dental+implants+trial&forceKeyA=get+$1950+for+dental+implant+participation+near+me&forceKeyB=free+dental+implants+near+me&forceKeyC=get+$1950+for+dental+implant+participation+nearby&forceKeyD=free+dental+implants+nearby&forceKeyE=get+$1950+for+dental+implants+participation+near+me&forceKeyF=free+dental+implant+near+me&fbid=872536505175912&fbland=PageView&fbserp=AddToCart&fbclick=InitiateCheckout",
    "title": "\"Exploring How Dental Implant Trials Can Reduce Costs\"",
    "description": "Explore how participating in dental implant trials can lead to significant savings on dental care while contributing to valuable research in oral health.",
    "locale": "en_US"
  },
  "124": {
    "url": "https://your-moneylife.com/health/affordable-dental-implant-solutions-explored-en-us/?segment=rsoc.sc.yourmoneylife.002&headline=dental+implants+trial&forceKeyA=get+$1950+for+dental+implant+participation+near+me&forceKeyB=free+dental+implants+near+me&forceKeyC=get+$1950+for+dental+implant+participation+nearby&forceKeyD=free+dental+implants+nearby&forceKeyE=get+$1950+for+dental+implants+participation+near+me&forceKeyF=free+dental+implant+near+me&fbid=872536505175912&fbland=PageView&fbserp=AddToCart&fbclick=InitiateCheckout",
    "title": "Exploring Affordable Solutions for Dental Implants",
    "description": "Explore various affordable solutions for dental implants, including innovative programs and financial options to enhance your oral health.",
    "locale": "en_US"
  },
  "125": {
    "url": "https://your-moneylife.com/health/how-can-dental-implant-trials-save-you-money-en-us/?segment=rsoc.sc.yourmoneylife.002&headline=dental+implants+trial&forceKeyA=get+$1950+for+dental+implant+participation+near+me&forceKeyB=free+dental+implants+near+me&forceKeyC=no-fee+dental+implants&forceKeyD=participate+in+dental+implants+trial+[sign+up+now]&forceKeyE=no+fee+dental+implant&forceKeyF=participate+in+dental+implants+trial+sign+up+now&fbid=872536505175912&fbland=PageView&fbserp=AddToCart&fbclick=InitiateCheckout",
    "title": "\"Exploring Cost-Saving Benefits of Dental Implant Trials\"",
    "description": "Explore how participating in dental implant trials can provide significant cost savings while contributing to advancements in dental care and technology.",
    "locale": "en_US"
  },
  "126": {
    "url": "https://your-moneylife.com/health/affordable-dental-implant-solutions-explored-en-us/?segment=rsoc.sc.yourmoneylife.002&headline=dental+implants+trial&forceKeyA=free+dental+implants+near+me&forceKeyB=no+fee+dental+implant&forceKeyC=no-fee+dental+implants&forceKeyD=participate+in+dental+implants+trial+[sign+up+now]&forceKeyE=participate+in+dental+implants+trial+sign+up+now&forceKeyF=get+$1950+for+dental+implant+participation+near+me&fbid=872536505175912&fbland=PageView&fbserp=AddToCart&fbclick=InitiateCheckout",
    "title": "Exploring Affordable Solutions for Dental Implants",
    "description": "Explore various affordable dental implant solutions, focusing on options that reduce costs and improve access to dental care for those in need.",
    "locale": "en_US"
  },
  "127": {
    "url": "https://economicminds.com/automotive/what-makes-the-2026-nissan-rogue-a-smart-buy-en-us/?segment=rsoc.sc.economicminds.002&headline=nissan+rogue+suv&forceKeyA=for+seniors:+2025+rogue+crossover+suvs+nearby+(rogue)+no+cost&forceKeyB=100+accepted+|+$50/month+-+rogue+2025+crossover+suvs+nearby+[no+cost]&forceKeyC=100+accepted+|+0+down+dealerships+-+leftover+crossover+suvs+nearby+no+cost+(rogue)&forceKeyD=for+seniors:+2024+rogue+crossover+suvs+nearby+(rogue)+[no+cost]&forceKeyE=for+seniors+2025+rogue+crossover+suv+nearby+rogue+no+cost&forceKeyF=nissan+rogue+lease+deals+$0+down&fbid=872536505175912&fbland=PageView&fbserp=AddToCart&fbclick=InitiateCheckout",
    "title": "\"Exploring the 2026 Nissan Rogue: Key Features and Benefits\"",
    "description": "Discover the key features and advantages of the 2026 Nissan Rogue, exploring why it stands out as a practical choice in today's automotive market.",
    "locale": "en_US"
  },
  "128": {
    "url": "https://economicminds.com/real-estate/choosing-senior-apartments-for-independent-living-en-us/?segment=rsoc.sc.economicminds.002&headline=55+and+older+apartments&forceKeyA=senior+apartments+for+$300+a+month+near+me&forceKeyB=apartments+55+and+older+near+me&forceKeyC=see+55+and+older+apartment+near+me&forceKeyD=over+62+apartments+near+me&forceKeyE=62+and+over+apartments+near+me&forceKeyF=see+55+and+older+apartment+near+me+{state}&fbid=872536505175912&fbland=PageView&fbserp=AddToCart&fbclick=InitiateCheckout",
    "title": "Choosing the Right Senior Apartments for Independent Living",
    "description": "Explore the key considerations for selecting senior apartments designed for independent living, focusing on affordability, amenities, and community features.",
    "locale": "en_US"
  },
  "129": {
    "url": "https://economicminds.com/automotive/how-does-the-2025-nissan-rogue-compare-en-us/?segment=rsoc.sc.economicminds.002&headline=nissan+rogue+suv&forceKeyA=for+seniors:+2025+rogue+crossover+suvs+nearby+(rogue)+no+cost&forceKeyB=for+seniors+2025+rogue+crossover+suvs+nearby+rogue+no+cost&forceKeyC=100+accepted+|+$50/month+-+rogue+2025+crossover+suvs+nearby+[no+cost]&forceKeyD=for+seniors:+2025+rogue+crossover+suv+nearby+(rogue)+no+cost&forceKeyE=100+accepted+|+0+down+dealerships+-+leftover+crossover+suvs+nearby+no+cost+(rogue)&forceKeyF=for+seniors+2025+rogue+crossover+suvs+nearby+rogue+no+cost+january+2026&fbid=872536505175912&fbland=PageView&fbserp=AddToCart&fbclick=InitiateCheckout",
    "title": "Comparing Features of the 2025 Nissan Rogue SUV",
    "description": "Explore the features and updates of the 2025 Nissan Rogue, comparing its performance, design, and technology to its predecessors in the SUV market.",
    "locale": "en_US"
  },
  "130": {
    "url": "https://economicminds.com/health/how-do-diabetes-trials-shape-future-treatments-en-us/?segment=rsoc.sc.economicminds.002&headline=diabetes+clinical+trials&forceKeyA=best+diabetes+study+testing+new+treatments+$26700+near+me&forceKeyB=best+diabetes+study+testing+new+treatments+$26700&forceKeyC=best+diabetes+study+testing+new+treatments+$26700+near+{state}&forceKeyD=diabetes+clinical+studies+testing+new+treatments+$13675+near+me&forceKeyE=paid+clinical+trials+for+type+2+diabetes&forceKeyF=best+diabetes+study+testing+new+treatments+$13675+near+me&fbid=872536505175912&fbland=PageView&fbserp=AddToCart&fbclick=InitiateCheckout",
    "title": "\"How Diabetes Trials Influence Future Treatment Developments\"",
    "description": "Explore how diabetes clinical trials influence the development of future treatments, highlighting their role in advancing medical research and patient care.",
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
  const isCrawler = /(facebookexternalhit|facebot|twitterbot|linkedinbot|slackbot|discordbot|embedly|whatsapp|telegram|preview)/i.test(ua);

  // 4) If it's a crawler, serve OG metadata directly (no redirect)
  if (isCrawler) {
    const host = reqUrl0.hostname.replace(/^www\./, "");
    const meta = ogMetaMap["https://" + host] || ogMetaMap[host];

    if (meta) {
      const html = 
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="utf-8">
            <title>${meta.site_name}</title>
            <meta property="og:url" content="${request.url}">
            <meta property="og:type" content="${meta.type}">
            <meta property="og:title" content="${redirectMap[id]?.title || meta.site_name}">
            <meta property="og:description" content="${redirectMap[id]?.description || meta.image_alt}">
            <meta property="og:image" content="${meta.image}">
            <meta property="og:image:alt" content="${meta.image_alt}">
            <meta property="og:site_name" content="${meta.site_name}">
            <meta property="og:locale" content="${redirectMap[id]?.locale || 'en_US'}">
            <meta property="og:updated_time" content="${Math.floor(Date.now() / 1000)}">
          </head>
          <body>
            <p>Preview for ${meta.site_name}</p>
          </body>
        </html>;
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
    // Existing Sheets collector (commented out)
    //"https://script.google.com/macros/s/AKfycbwSQ-lPe5_A1c8mZ4DinBmK33xsvOdvdvLFD3fWdFI9oVDQ98IdKEv04ALvutxdK7iu/exec",
    // Cloud Run ? BigQuery collector
    "https://click-collector-583868590168.us-central1.run.app/collect"
  ];

  // 6) Helpers
  function isFbIgInApp(ua) {
    const u = (ua || "").toLowerCase();
    return u.includes("fban") || u.includes("fbav") || u.includes("fb_iab") || u.includes("instagram");
  }
  function isValidS1pcid(v) {
    if (!v) return false;
    const t = v.trim();
    if (t.startsWith("{")) return false;
    return /^[0-9]{6,}$/.test(t);
  }
  function makeFbcFromFbclid(fbclid) {
    if (!fbclid) return null;
    const ts = Math.floor(Date.now() / 1000);
    return fb.1.${ts}.${fbclid};
  }
  function makeFbp() {
    const ts = Math.floor(Date.now() / 1000);
    const rand = Math.random().toString(36).slice(2);
    return fb.1.${ts}.${rand};
  }
  function uuidv4() {
    return crypto.randomUUID
      ? crypto.randomUUID()
      : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
          const r = (Math.random() * 16) | 0,
            v = c === "x" ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        });
  }
  function appendCookie(h, name, value, maxAgeDays = 90) {
    if (!value) return;
    const maxAge = maxAgeDays * 24 * 3600;
    h.append("Set-Cookie", ${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax);
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

// base is now an object:  { url, title, description, locale }
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

  const rawCookie = request.headers.get("cookie") || "";
  const cookieMap = Object.fromEntries(
    rawCookie.split(/;\s*/).filter(Boolean).map(c => {
      const i = c.indexOf("=");
      return i === -1 ? [c, ""] : [c.slice(0, i), decodeURIComponent(c.slice(i + 1))];
    })
  );
  const fbclid = url.searchParams.get("fbclid") || null;
  let fbc = cookieMap._fbc || makeFbcFromFbclid(fbclid);
  let fbp = cookieMap._fbp || makeFbp();

  const ipHeader =
    request.headers.get("x-forwarded-for") ||
    request.headers.get("x-real-ip") ||
    request.headers.get("x-nf-client-connection-ip") ||
    "";
  const client_ip = ipHeader.split(",")[0].trim();

  const isFallback = !inApp && !s1ok;
  const finalLocation = isFallback ? FALLBACK_URL : dest.href;

  // 11) Log to collectors
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
      event_source_url: request.url,
      ua: uaHead,
      dest: finalLocation
    }, context);
  } catch {}

  // 12) Set cookies + redirect
  const cookieHeaders = new Headers();
  appendCookie(cookieHeaders, "_fbc", fbc);
  appendCookie(cookieHeaders, "_fbp", fbp);
  appendCookie(cookieHeaders, "uid", uid);

  console.log("Redirect", { id, inApp, s1ok, dest: finalLocation });
  return redirectResponse(finalLocation, cookieHeaders);
};