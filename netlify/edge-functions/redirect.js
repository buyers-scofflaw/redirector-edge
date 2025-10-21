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
  "203": {
    "url": "https://read.mdrntoday.com/careers/jobs-in-home-remodeling-opportunities-and-career-paths-es-us-2/?segment=rsoc.sc.mdrntoday.001&headline=Learn+about+home+remodeling+companies&forceKeyA=home+remodeling+contractors&forceKeyB=home+remodeling+companies+in+my+area&forceKeyC=painting+companies+in+my+area&forceKeyD=repair+contractors+in+{City}&forceKeyE=home+remodeling+companies+near+me&forceKeyF=&fbid=1786225912279573&fbland=PageView&fbserp=AddToCart&fbclick=Purchase&utm_source=facebook",
    "title": "Oportunidades laborales en la remodelaci?n del hogar en EE. UU.",
    "description": "Descubre las oportunidades y trayectorias profesionales en el sector de la remodelaci?n del hogar, incluyendo empresas y contratistas relevantes en tu ?rea.",
    "locale": "es_ES"
  },
  "342": {
    "url": "https://read.mdrntoday.com/education/government-funded-phlebotomy-training-can-change-your-future-en-us-2/?segment=rsoc.sc.mdrntoday.001&headline=learn+about+phlebotomy&forceKeyA=Paid+Phlebotomy+Training&forceKeyB=Phlebotomy+Training+Programs&forceKeyC=Free+Phlebotomy+Training&forceKeyD=4+Week+Phlebotomy+Classes&forceKeyE=Free+Phlebotomy+Training+Online&forceKeyF=Red+Cross+Phlebotomy+Training&fbid=1786225912279573&fbland=PageView&fbserp=AddToCart&fbclick=Purchase&utm_source=facebook",
    "title": "Transform Your Future with Government-Funded Phlebotomy Training",
    "description": "Explore how government-funded phlebotomy training can open new career opportunities and transform your future in the healthcare field.",
    "locale": "en_US"
  },
  "374": {
    "url": "https://read.mdrntoday.com/health/egg-donation-understanding-potential-benefits-and-compensation-en-us/?segment=rsoc.sc.mdrntoday.001&headline=Learn+How+Egg+Donation+Works&forceKeyA=donor+egg+for+ivf+in+{City}&forceKeyB=egg+donor+clinic+{State}&forceKeyC=paid+egg+donors+wanted+in+{City}&forceKeyD=best+egg+donor+banks+in+{City}&forceKeyE=get+paid+to+donate+eggs+near+me&forceKeyF=egg+donor+compensation+{State}+2025&fbid=1786225912279573&fbland=PageView&fbserp=AddToCart&fbclick=Purchase&utm_source=facebook",
    "title": "Understanding Egg Donation: Benefits and Compensation Insights",
    "description": "Explore the potential benefits and compensation associated with egg donation, along with a comprehensive understanding of the process and its implications.",
    "locale": "en_US"
  },
  "406": {
    "url": "https://read.investingfuel.com/finance/securing-your-future-the-benefits-of-including-gold-ira-kits-in-your-retirement-strategy-en-us-2/?segment=rsoc.sd.investingfuel.001&headline=gold+ira&forceKeyA=Get+Free+Gold+IRA+Kit+With+$10k&forceKeyB=Gold+Ira+Kits+[$0+Cost]&forceKeyC=Gold+Ira+Kit+[$0+Cost]&forceKeyD=Free+Gold+IRA+Kit+U2013+[no+Cost]&forceKeyE=Free+Gold+Ira+Kits+U2013+[no+Cost]&forceKeyF=Get+a+Gold+Ira+Kit&fbid=1786225912279573&fbland=PageView&fbserp=AddToCart&fbclick=Purchase&utm_source=facebook",
    "title": "\"Exploring the Advantages of Gold IRA Kits for Retirement Planning\"",
    "description": "Explore the advantages of incorporating gold IRA kits into your retirement strategy, highlighting how they can enhance your financial security and long-term planning.",
    "locale": "en_US"
  },
  "470": {
    "url": "https://read.mdrntoday.com/health/understanding-why-home-caregivers-are-in-high-demand-en-us/?segment=rsoc.sc.mdrntoday.001&headline=Learn+about+caregiving&forceKeyA=Caregiver+Needed+Immediately&forceKeyB=Care+Homes+in+My+Area&forceKeyC=Private+Caregiver+Nearby&forceKeyD=Care+Homes+in+Sacramento&forceKeyE=Caregiver+Jobs+Near+Me+Full+Time&forceKeyF=Private+Sitters+for+Elderly+Near+Me&fbid=1786225912279573&fbland=PageView&fbserp=AddToCart&fbclick=Purchase&utm_source=facebook",
    "title": "The Growing Need for Home Caregivers in Today's Society",
    "description": "Explore the rising demand for home caregivers, driven by an aging population and a preference for in-home support as a viable health care option.",
    "locale": "en_US"
  },
  "495": {
    "url": "https://read.investingfuel.com/health/how-participating-in-dental-implant-trials-can-save-you-money-and-improve-your-smile-en-us-8/?segment=rsoc.sd.investingfuel.001&headline=dental+implants+trial&forceKeyA=$1500+for+Dental+Implants+Participation&forceKeyB=Participate+in+Dental+Implants+Trial+sign+Up+Now&forceKeyC=No-fee+Dental+Implants&forceKeyD=Get+$1500+for+Dental+Implants+Participation&forceKeyE=$1950+for+Dental+Implants+Participation+search+Now&forceKeyF=Participate+in+Dental+Implants+Trial+Sign+Up+Now&fbid=1786225912279573&fbland=PageView&fbserp=AddToCart&fbclick=Purchase&utm_source=facebook",
    "title": "\"Exploring Dental Implant Trials: Cost Savings and Smile Benefits\"",
    "description": "Discover how participating in dental implant trials can reduce costs and enhance your smile, providing valuable insights into innovative dental solutions.",
    "locale": "en_US"
  },
  "517": {
    "url": "https://mdrnlocal.com/health/how-participating-in-dental-implant-trials-can-save-you-money-and-improve-your-smile-en-us-4/?segment=rsoc.sc.mdrnlocal.001&headline=dental+implants+trial&forceKeyA=$1500+for+Dental+Implants+Participation&forceKeyB=Participate+in+Dental+Implants+Trial+[sign+Up+Now]&forceKeyC=No-fee+Dental+Implants&forceKeyD=Get+$1500+for+Dental+Implants+Participation&forceKeyE=$1950+for+Dental+Implants+Participation+[search+Now]&forceKeyF=Participate+in+Dental+Implants+Trial+Sign+Up+Now&fbid=1786225912279573&fbland=PageView&fbserp=AddToCart&fbclick=Purchase&utm_source=facebook",
    "title": "Saving on Dental Implants: Benefits of Participating in Clinical Trials",
    "description": "Discover how participating in dental implant trials can reduce costs and enhance your smile while contributing to important dental research.",
    "locale": "en_US"
  },
  "522": {
    "url": "https://mdrnlocal.com/health/how-to-join-paid-sleep-apnea-trials-en-us/?segment=rsoc.sc.mdrnlocal.001&headline=sleep+apnea&forceKeyA=join+sleep+apnea+studies+near+me+{State}&forceKeyB=see+paid+sleep+apnea+studies+in+{State}&forceKeyC={State}+paid+sleep+apnea+studies+near+me&forceKeyD=join+paid+sleep+apnea+studies+in+{City}&forceKeyE=join+paid+sleep+apnea+studies+near+me&forceKeyF=join+sleep+apnea+studies+near++{State}&fbid=1786225912279573&fbland=PageView&fbserp=AddToCart&fbclick=Purchase&utm_source=facebook",
    "title": "How to Participate in Paid Sleep Apnea Research Trials",
    "description": "Explore how to participate in paid sleep apnea trials, including eligibility criteria and potential benefits for those seeking treatment options.",
    "locale": "en_US"
  },
  "569": {
    "url": "https://read.investingfuel.com/health/how-participating-in-dental-implant-trials-can-save-you-money-and-improve-your-smile-en-us-15/?segment=rsoc.sd.investingfuel.001&headline=dental+implants+trial&forceKeyA=$1500+for+Dental+Implants+Participation&forceKeyB=Participate+in+Dental+Implants+Trial+[sign+Up+Now]&forceKeyC=No-fee+Dental+Implants&forceKeyD=Get+$1500+for+Dental+Implants+Participation&forceKeyE=$1950+for+Dental+Implants+Participation+[search+Now]&forceKeyF=Participate+in+Dental+Implants+Trial+Sign+Up+Now&fbid=1786225912279573&fbland=PageView&fbserp=AddToCart&fbclick=Purchase&utm_source=facebook",
    "title": "\"Exploring Dental Implant Trials: Cost Savings and Smile Benefits\"",
    "description": "Discover how participating in dental implant trials can reduce costs and enhance your smile, offering a unique opportunity for dental care improvement.",
    "locale": "en_US"
  },
  "575": {
    "url": "https://read.investingfuel.com/education/choosing-online-schools-that-provide-computers-en-us-5/?segment=rsoc.sd.investingfuel.001&headline=online+high+school+with+laptop&forceKeyA=free+online+high+school&forceKeyB=apply+for+online+school+high+school+that+gives+you+a+computer+now&forceKeyC=apply+for+online+highschool+that+gives+you+$+and+a+laptop+today+no+cost&forceKeyD=apply+for+online+school+high+school+that+gives+you+a+computer&forceKeyE=apply+for+online+school+high+school+that+give+you+a+computer+now&forceKeyF=free+online+high+school+{state}&fbid=1786225912279573&fbland=PageView&fbserp=AddToCart&fbclick=Purchase&utm_source=facebook",
    "title": "Choosing Online Schools That Provide Computers for Students",
    "description": "Explore key factors for selecting online schools that provide computers, ensuring a comprehensive educational experience for students.",
    "locale": "en_US"
  },
  "593": {
    "url": "https://mdrnlocal.com/health/understanding-why-home-caregivers-are-in-high-demand-en-us/?segment=rsoc.sc.mdrnlocal.001&headline=Learn+about+caregiving&forceKeyA=Caregiver+Needed+Immediately&forceKeyB=Care+Homes+in+My+Area&forceKeyC=Private+Caregiver+Nearby&forceKeyD=Care+Homes+in+{City}&forceKeyE=Caregiver+Jobs+Near+Me+Full+Time&forceKeyF=Private+Sitters+for+Elderly+Near+Me&fbid=1786225912279573&fbland=PageView&fbserp=AddToCart&fbclick=Purchase&utm_source=facebook",
    "title": "The Rising Demand for Home Caregivers: Key Insights and Trends",
    "description": "Explore the growing demand for home caregivers, driven by an aging population and the need for personalized care in familiar environments.",
    "locale": "en_US"
  },
  "604": {
    "url": "https://read.mdrntoday.com/general/understanding-delivery-driving-in-the-hvac-industry-en-us/?segment=rsoc.sc.mdrntoday.001&headline=learn+about+HVAC+delivery&forceKeyA=Air+Conditioning+Companies+in+{City}&forceKeyB=HVAC+Companies+Near+Me&forceKeyC=HVAC+Companies+in+{City}&forceKeyD=Local+HVAC+Companies&forceKeyE=Heating+and+Air+Conditioning+Companies&forceKeyF=HVAC+Services+Near+Me&fbid=1786225912279573&fbland=PageView&fbserp=AddToCart&fbclick=Purchase&utm_source=facebook",
    "title": "Understanding Delivery Driving in the HVAC Sector",
    "description": "Explore the role of delivery driving in the HVAC industry, including its challenges and importance in ensuring timely service and customer satisfaction.",
    "locale": "en_US"
  },
  "630": {
    "url": "https://read.mdrntoday.com/general/understanding-delivery-driving-in-the-hvac-industry-en-us/?segment=rsoc.sc.mdrntoday.001&headline=learn+about+HVAC+delivery&forceKeyA=Air+Conditioning+Companies+in+{City}&forceKeyB=HVAC+Companies+Near+Me&forceKeyC=HVAC+Companies+in+{City}&forceKeyD=Local+HVAC+Companies&forceKeyE=Heating+and+Air+Conditioning+Companies&forceKeyF=HVAC+Services+Near+Me&fbid=1786225912279573&fbland=PageView&fbserp=AddToCart&fbclick=Purchase&utm_source=facebook",
    "title": "Understanding Delivery Driving in the HVAC Sector",
    "description": "Explore the role of delivery driving in the HVAC industry, including its challenges and the importance of timely service in maintaining customer satisfaction.",
    "locale": "en_US"
  },
  "632": {
    "url": "https://read.mdrntoday.com/health/understanding-why-home-caregivers-are-in-high-demand-en-us-3/?segment=rsoc.sc.mdrntoday.001&headline=Learn+about+caregiving&forceKeyA=Caregiver+Needed+Immediately&forceKeyB=Care+Homes+in+My+Area&forceKeyC=Private+Caregiver+Nearby&forceKeyD=Care+Homes+in+{City}&forceKeyE=Caregiver+Jobs+Near+Me+Full+Time&forceKeyF=Private+Sitters+for+Elderly+Near+Me&fbid=1786225912279573&fbland=PageView&fbserp=AddToCart&fbclick=Purchase&utm_source=facebook",
    "title": "Understanding the Rising Demand for Home Caregivers",
    "description": "Explore the factors driving the increasing demand for home caregivers, highlighting the vital role they play in supporting individuals and families.",
    "locale": "en_US"
  },
  "645": {
    "url": "https://read.investingfuel.com/health/understanding-why-home-caregivers-are-in-high-demand-en-us-4/?segment=rsoc.sd.investingfuel.001&headline=Learn+about+caregiving&forceKeyA=Caregiver+Needed+Immediately&forceKeyB=Care+Homes+in+My+Area&forceKeyC=Private+Caregiver+Nearby&forceKeyD=Care+Homes+in+{City}&forceKeyE=Caregiver+Jobs+Near+Me+Full+Time&forceKeyF=Private+Sitters+for+Elderly+Near+Me&fbid=1786225912279573&fbland=PageView&fbserp=AddToCart&fbclick=Purchase&utm_source=facebook",
    "title": "The Rising Demand for Home Caregivers: Key Insights Explained",
    "description": "Explore the factors driving the increasing demand for home caregivers, highlighting the essential role they play in providing support and care for individuals.",
    "locale": "en_US"
  },
  "646": {
    "url": "https://read.investingfuel.com/health/how-participating-in-dental-implant-trials-can-save-you-money-and-improve-your-smile-en-us-12/?segment=rsoc.sd.investingfuel.001&headline=dental+implants+trial&forceKeyA=$1500+for+Dental+Implants+Participation&forceKeyB=Participate+in+Dental+Implants+Trial+[sign+Up+Now]&forceKeyC=No-fee+Dental+Implants&forceKeyD=Get+$1500+for+Dental+Implants+Participation&forceKeyE=$1950+for+Dental+Implants+Participation+[search+Now]&forceKeyF=Participate+in+Dental+Implants+Trial+Sign+Up+Now&fbid=1786225912279573&fbland=PageView&fbserp=AddToCart&fbclick=Purchase&utm_source=facebook",
    "title": "\"How Dental Implant Trials Can Enhance Your Smile and Save Costs\"",
    "description": "Learn how participating in dental implant trials can reduce costs and enhance your smile, offering potential savings and access to advanced dental solutions.",
    "locale": "en_US"
  },
  "647": {
    "url": "https://read.investingfuel.com/health/how-participating-in-dental-implant-trials-can-save-you-money-and-improve-your-smile-en-us-15/?segment=rsoc.sd.investingfuel.001&headline=dental+implants+trial&forceKeyA=$1500+for+Dental+Implants+Participation&forceKeyB=Participate+in+Dental+Implants+Trial+[sign+Up+Now]&forceKeyC=No-fee+Dental+Implants&forceKeyD=Get+$1500+for+Dental+Implants+Participation&forceKeyE=$1950+for+Dental+Implants+Participation+[search+Now]&forceKeyF=Participate+in+Dental+Implants+Trial+Sign+Up+Now&fbid=1786225912279573&fbland=PageView&fbserp=AddToCart&fbclick=Purchase&utm_source=facebook",
    "title": "\"Exploring Dental Implant Trials: Cost Savings and Enhanced Smiles\"",
    "description": "Explore how participating in dental implant trials can lead to significant savings and enhance your smile through innovative treatments and research opportunities.",
    "locale": "en_US"
  },
  "648": {
    "url": "https://read.investingfuel.com/health/how-participating-in-dental-implant-trials-can-save-you-money-and-improve-your-smile-en-us-12/?segment=rsoc.sd.investingfuel.001&headline=dental+implants+trial&forceKeyA=$1500+for+Dental+Implants+Participation&forceKeyB=Participate+in+Dental+Implants+Trial+[sign+Up+Now]&forceKeyC=No-fee+Dental+Implants&forceKeyD=Get+$1500+for+Dental+Implants+Participation&forceKeyE=$1950+for+Dental+Implants+Participation+[search+Now]&forceKeyF=Participate+in+Dental+Implants+Trial+Sign+Up+Now&fbid=1786225912279573&fbland=PageView&fbserp=AddToCart&fbclick=Purchase&utm_source=facebook",
    "title": "\"Saving on Dental Implants: Benefits of Joining Clinical Trials\"",
    "description": "Discover how participating in dental implant trials can provide cost savings and enhance your smile through innovative treatments and research opportunities.",
    "locale": "en_US"
  },
  "649": {
    "url": "https://read.investingfuel.com/health/how-participating-in-dental-implant-trials-can-save-you-money-and-improve-your-smile-en-us-15/?segment=rsoc.sd.investingfuel.001&headline=dental+implants+trial&forceKeyA=$1500+for+Dental+Implants+Participation&forceKeyB=Participate+in+Dental+Implants+Trial+[sign+Up+Now]&forceKeyC=No-fee+Dental+Implants&forceKeyD=Get+$1500+for+Dental+Implants+Participation&forceKeyE=$1950+for+Dental+Implants+Participation+[search+Now]&forceKeyF=Participate+in+Dental+Implants+Trial+Sign+Up+Now&fbid=1786225912279573&fbland=PageView&fbserp=AddToCart&fbclick=Purchase&utm_source=facebook",
    "title": "\"Exploring Dental Implant Trials: Cost Savings and Smile Enhancements\"",
    "description": "Discover how participating in dental implant trials can enhance your smile and potentially reduce costs associated with dental procedures.",
    "locale": "en_US"
  },
  "650": {
    "url": "https://read.investingfuel.com/health/botox-pricing-explained-what-you-need-to-know-before-you-pay-en-us/?segment=rsoc.sd.investingfuel.001&headline=botox+deals+and+pricing&forceKeyA=Get+$149+Botox+Doctor+Near+Me+Full+Botox&forceKeyB=Best+Botox+Injector+Near+Me&forceKeyC=$119+Botox+Doctor+Near+Me+Full+Botox&forceKeyD=See+$119+Botox+Doctor+Near+Me+Full+Botox&forceKeyE=Get+$119+Botox+Doctor+Near+{City}+Full+Botox&forceKeyF=Get+$119+Botox+Doctor+Near+{City}+Full+Botox&fbid=1786225912279573&fbland=PageView&fbserp=AddToCart&fbclick=Purchase&utm_source=facebook",
    "title": "Understanding Botox Pricing: Key Factors to Consider",
    "description": "Explore the factors influencing Botox pricing, including treatment costs, factors affecting price variations, and what to consider before your appointment.",
    "locale": "en_US"
  },
  "651": {
    "url": "https://read.mdrntoday.com/health/how-participating-in-dental-implant-trials-can-save-you-money-and-improve-your-smile-en-us-8/?segment=rsoc.sc.mdrntoday.001&headline=dental+implants+trial&forceKeyA=$1500+for+Dental+Implants+Participation&forceKeyB=Participate+in+Dental+Implants+Trial+[sign+Up+Now]&forceKeyC=No-fee+Dental+Implants&forceKeyD=Get+$1500+for+Dental+Implants+Participation&forceKeyE=$1950+for+Dental+Implants+Participation+[search+Now]&forceKeyF=Participate+in+Dental+Implants+Trial+Sign+Up+Now&fbid=1786225912279573&fbland=PageView&fbserp=AddToCart&fbclick=Purchase&utm_source=facebook",
    "title": "Saving on Dental Implants: Benefits of Participating in Trials",
    "description": "Explore how participating in dental implant trials can enhance your smile and provide financial benefits, offering an innovative approach to dental care.",
    "locale": "en_US"
  },
  "652": {
    "url": "https://read.mdrntoday.com/health/how-participating-in-dental-implant-trials-can-save-you-money-and-improve-your-smile-en-us-9/?segment=rsoc.sc.mdrntoday.001&headline=dental+implants+trial&forceKeyA=$1500+for+Dental+Implants+Participation&forceKeyB=Participate+in+Dental+Implants+Trial+[sign+Up+Now]&forceKeyC=No-fee+Dental+Implants&forceKeyD=Get+$1500+for+Dental+Implants+Participation&forceKeyE=$1950+for+Dental+Implants+Participation+[search+Now]&forceKeyF=Participate+in+Dental+Implants+Trial+Sign+Up+Now&fbid=1786225912279573&fbland=PageView&fbserp=AddToCart&fbclick=Purchase&utm_source=facebook",
    "title": "\"Exploring the Benefits of Dental Implant Trials for Cost Savings\"",
    "description": "Discover how participating in dental implant trials can lower costs while enhancing your smile, providing valuable insights into the latest dental advancements.",
    "locale": "en_US"
  },
  "653": {
    "url": "https://read.mdrntoday.com/health/how-participating-in-dental-implant-trials-can-save-you-money-and-improve-your-smile-en-us-8/?segment=rsoc.sc.mdrntoday.001&headline=dental+implants+trial&forceKeyA=$1500+for+Dental+Implants+Participation&forceKeyB=Participate+in+Dental+Implants+Trial+[sign+Up+Now]&forceKeyC=No-fee+Dental+Implants&forceKeyD=Get+$1500+for+Dental+Implants+Participation&forceKeyE=$1950+for+Dental+Implants+Participation+[search+Now]&forceKeyF=Participate+in+Dental+Implants+Trial+Sign+Up+Now&fbid=1786225912279573&fbland=PageView&fbserp=AddToCart&fbclick=Purchase&utm_source=facebook",
    "title": "Participating in Dental Implant Trials: Benefits and Savings",
    "description": "Explore how participating in dental implant trials can enhance your smile while providing a cost-effective solution for dental care.",
    "locale": "en_US"
  },
  "654": {
    "url": "https://read.mdrntoday.com/health/how-participating-in-dental-implant-trials-can-save-you-money-and-improve-your-smile-en-us-9/?segment=rsoc.sc.mdrntoday.001&headline=dental+implants+trial&forceKeyA=$1500+for+Dental+Implants+Participation&forceKeyB=Participate+in+Dental+Implants+Trial+[sign+Up+Now]&forceKeyC=No-fee+Dental+Implants&forceKeyD=Get+$1500+for+Dental+Implants+Participation&forceKeyE=$1950+for+Dental+Implants+Participation+[search+Now]&forceKeyF=Participate+in+Dental+Implants+Trial+Sign+Up+Now&fbid=1786225912279573&fbland=PageView&fbserp=AddToCart&fbclick=Purchase&utm_source=facebook",
    "title": "\"Exploring the Benefits of Dental Implant Trials for Your Smile\"",
    "description": "Explore how participating in dental implant trials can lead to significant savings and enhance your smile, while contributing to dental research advancements.",
    "locale": "en_US"
  },
  "655": {
    "url": "https://read.mdrntoday.com/health/botox-pricing-explained-what-you-need-to-know-before-you-pay-en-us/?segment=rsoc.sc.mdrntoday.001&headline=botox+deals+and+pricing&forceKeyA=Get+$149+Botox+Doctor+Near+Me+Full+Botox&forceKeyB=Best+Botox+Injector+Near+Me&forceKeyC=$119+Botox+Doctor+Near+Me+Full+Botox&forceKeyD=See+$119+Botox+Doctor+Near+Me+Full+Botox&forceKeyE=Get+$119+Botox+Doctor+Near+{City}+Full+Botox&forceKeyF=Get+$119+Botox+Doctor+Near+{City}+Full+Botox&fbid=1786225912279573&fbland=PageView&fbserp=AddToCart&fbclick=Purchase&utm_source=facebook",
    "title": "Understanding Botox Pricing: Key Insights Before You Decide",
    "description": "Explore the essential factors influencing Botox pricing, including treatment costs, factors affecting price variations, and what to consider before your appointment.",
    "locale": "en_US"
  },
  "656": {
    "url": "https://read.investingfuel.com/careers/explore-lucrative-careers-in-power-washing-en-us-4/?segment=rsoc.sd.investingfuel.001&headline=power+washing&forceKeyA=pressure+cleaning+near+me&forceKeyB=100%+accepted+|+power+washing+deals+in+{City}&forceKeyC=find+pressure+washing+services+in+{State}&forceKeyD=pressure+cleaning+companies+near+me&forceKeyE=pressure+washing+companies+near+me&forceKeyF=pressure+cleaning+near+{state}&fbid=1786225912279573&fbland=PageView&fbserp=AddToCart&fbclick=Purchase&utm_source=facebook",
    "title": "Exploring Profitable Opportunities in Power Washing Careers",
    "description": "Discover lucrative career opportunities in power washing, exploring the benefits and potential earnings in this growing industry.",
    "locale": "en_US"
  },
  "657": {
    "url": "https://read.mdrntoday.com/health/earn-by-joining-diabetes-clinical-trials-en-us-4/?segment=rsoc.sc.mdrntoday.001&headline=diabetes+clinical+trials&forceKeyA=Diabetes+Clinical+Studies+Testing+New+Treatments+$13675+Near+Me&forceKeyB=Diabetes+Studies+Testing+New+Medications+$1500+Near+Me&forceKeyC=Clinical+Studies+for+Diabetes&forceKeyD=Participate+in+Diabetes+Research+Trial+Sign+Up+Today&forceKeyE=Diabetes+Studies+Testing+New+Medication&forceKeyF=Type+2+Diabetes+Advancements&fbid=1786225912279573&fbland=PageView&fbserp=AddToCart&fbclick=Purchase&utm_source=facebook",
    "title": "Exploring Opportunities in Diabetes Clinical Trials",
    "description": "Explore opportunities to participate in diabetes clinical trials, where individuals can contribute to research on new treatments while potentially earning compensation.",
    "locale": "en_US"
  },
  "658": {
    "url": "https://read.mdrntoday.com/real-estate/senior-apartments-a-perfect-blend-of-independence-and-community-for-older-adults-en-us-2/?segment=rsoc.sc.mdrntoday.001&headline=55+and+older+apartments&forceKeyA=55+and+older+apartments+near+me&forceKeyB=55+and+older+apartment+near+me&forceKeyC=see+55+and+older+apartments+near+me&forceKeyD=find+55+and+older+apartments+near+me&forceKeyE=see+55+and+older+apartment+near+me&forceKeyF=55+and+older+apartments+near+me+{state}&fbid=1786225912279573&fbland=PageView&fbserp=AddToCart&fbclick=Purchase&utm_source=facebook",
    "title": "\"Senior Apartments: Balancing Independence and Community Living\"",
    "description": "Discover how senior apartments provide a harmonious blend of independence and community for older adults, promoting a fulfilling lifestyle.",
    "locale": "en_US"
  },
  "659": {
    "url": "https://read.mdrntoday.com/health/earn-by-joining-diabetes-clinical-trials-en-us-5/?segment=rsoc.sc.mdrntoday.001&headline=diabetes+clinical+trials&forceKeyA=Diabetes+Clinical+Studies+Testing+New+Treatments+$13675+Near+Me&forceKeyB=Diabetes+Studies+Testing+New+Medications+$1500+Near+Me&forceKeyC=Clinical+Studies+for+Diabetes&forceKeyD=Participate+in+Diabetes+Research+Trial+Sign+Up+Today&forceKeyE=Diabetes+Studies+Testing+New+Medication&forceKeyF=Type+2+Diabetes+Advancements&fbid=1786225912279573&fbland=PageView&fbserp=AddToCart&fbclick=Purchase&utm_source=facebook",
    "title": "\"Exploring Opportunities in Diabetes Clinical Trials\"",
    "description": "Explore the benefits and opportunities of participating in diabetes clinical trials, including potential earnings and advancements in treatment options.",
    "locale": "en_US"
  },
  "660": {
    "url": "https://read.investingfuel.com/careers/explore-lucrative-careers-in-power-washing-en-us-4/?segment=rsoc.sd.investingfuel.001&headline=power+washing&forceKeyA=pressure+cleaning+near+me&forceKeyB=100%+accepted+|+power+washing+deals+in+{City}&forceKeyC=find+pressure+washing+services+in+{State}&forceKeyD=pressure+cleaning+companies+near+me&forceKeyE=pressure+washing+companies+near+me&forceKeyF=pressure+cleaning+near+{state}&fbid=1786225912279573&fbland=PageView&fbserp=AddToCart&fbclick=Purchase&utm_source=facebook",
    "title": "Lucrative Career Opportunities in Power Washing Services",
    "description": "Discover the diverse and rewarding career opportunities in the power washing industry, highlighting the skills and benefits of becoming a professional in this field.",
    "locale": "en_US"
  },
  "661": {
    "url": "https://read.investingfuel.com/health/earn-by-joining-diabetes-clinical-trials-en-us-4/?segment=rsoc.sd.investingfuel.001&headline=diabetes+clinical+trials&forceKeyA=Diabetes+Clinical+Studies+Testing+New+Treatments+$13675+Near+Me&forceKeyB=Diabetes+Studies+Testing+New+Medications+$1500+Near+Me&forceKeyC=Clinical+Studies+for+Diabetes&forceKeyD=Participate+in+Diabetes+Research+Trial+Sign+Up+Today&forceKeyE=Diabetes+Studies+Testing+New+Medication&forceKeyF=Type+2+Diabetes+Advancements&fbid=1786225912279573&fbland=PageView&fbserp=AddToCart&fbclick=Purchase&utm_source=facebook",
    "title": "\"Exploring Opportunities in Diabetes Clinical Trials\"",
    "description": "Explore how participating in diabetes clinical trials can contribute to medical research while potentially providing financial compensation for your involvement.",
    "locale": "en_US"
  },
  "662": {
    "url": "https://read.investingfuel.com/real-estate/senior-apartments-a-perfect-blend-of-independence-and-community-for-older-adults-en-us-4/?segment=rsoc.sd.investingfuel.001&headline=55+and+older+apartments&forceKeyA=55+and+older+apartments+near+me&forceKeyB=55+and+older+apartment+near+me&forceKeyC=see+55+and+older+apartments+near+me&forceKeyD=find+55+and+older+apartments+near+me&forceKeyE=see+55+and+older+apartment+near+me&forceKeyF=55+and+older+apartments+near+me+{state}&fbid=1786225912279573&fbland=PageView&fbserp=AddToCart&fbclick=Purchase&utm_source=facebook",
    "title": "\"Senior Apartments: Balancing Independence and Community for Seniors\"",
    "description": "Discover the benefits of senior apartments, offering a harmonious blend of independence and community for older adults seeking a supportive living environment.",
    "locale": "en_US"
  },
  "663": {
    "url": "https://read.investingfuel.com/health/earn-by-joining-diabetes-clinical-trials-en-us-5/?segment=rsoc.sd.investingfuel.001&headline=diabetes+clinical+trials&forceKeyA=Diabetes+Clinical+Studies+Testing+New+Treatments+$13675+Near+Me&forceKeyB=Diabetes+Studies+Testing+New+Medications+$1500+Near+Me&forceKeyC=Clinical+Studies+for+Diabetes&forceKeyD=Participate+in+Diabetes+Research+Trial+Sign+Up+Today&forceKeyE=Diabetes+Studies+Testing+New+Medication&forceKeyF=Type+2+Diabetes+Advancements&fbid=1786225912279573&fbland=PageView&fbserp=AddToCart&fbclick=Purchase&utm_source=facebook",
    "title": "\"Exploring Opportunities in Diabetes Clinical Trials\"",
    "description": "Explore the potential benefits of participating in diabetes clinical trials, including access to new treatments and medications while contributing to medical research.",
    "locale": "en_US"
  },
  "664": {
    "url": "https://read.investingfuel.com/health/earn-by-joining-diabetes-clinical-trials-es-us-5/?segment=rsoc.sd.investingfuel.001&headline=diabetes+clinical+trials&forceKeyA=Diabetes+Clinical+Studies+Testing+New+Treatments+$13675+Near+Me&forceKeyB=Diabetes+Studies+Testing+New+Medications+$1500+Near+Me&forceKeyC=Clinical+Studies+for+Diabetes&forceKeyD=Participate+in+Diabetes+Research+Trial+Sign+Up+Today&forceKeyE=Diabetes+Studies+Testing+New+Medication&forceKeyF=Type+2+Diabetes+Advancements&fbid=1786225912279573&fbland=PageView&fbserp=AddToCart&fbclick=Purchase&utm_source=facebook",
    "title": "Participaci?n en ensayos cl?nicos para diabetes: una opci?n interesante",
    "description": "Descubre c?mo participar en ensayos cl?nicos sobre la diabetes puede ofrecer oportunidades de compensaci?n mientras contribuyes a la investigaci?n m?dica.",
    "locale": "es_ES"
  },
  "665": {
    "url": "https://mdrnlocal.com/careers/explore-promising-careers-in-truck-driving-en-us-3/?segment=rsoc.sc.mdrnlocal.001&headline=pickup+driver&forceKeyA=Independent+Work+as+Pickup+Driver&forceKeyB=Highest+Paying+Pickup+Truck+Driver+Jobs&forceKeyC=Small+Truck+Driver+Jobs&forceKeyD=Driver+Hiring&forceKeyE=Hiring+Drivers+Now&forceKeyF=Van+Driving+Jobs+Near+Me+Full+Time&fbid=1786225912279573&fbland=PageView&fbserp=AddToCart&fbclick=Purchase&utm_source=facebook",
    "title": "\"Exploring Career Opportunities in Truck Driving\"",
    "description": "Discover the diverse and rewarding opportunities in truck driving, including roles for independent and small truck drivers with competitive pay.",
    "locale": "en_US"
  },
  "666": {
    "url": "https://mdrnlocal.com/careers/why-pickup-driver-jobs-are-a-great-career-choice-en-us/?segment=rsoc.sc.mdrnlocal.001&headline=Learn+About+Working+As+A+Truck+Driver&forceKeyA=Highest+Paying+Pickup+Truck+Driver+Jobs&forceKeyB=Small+Truck+Delivery+Service&forceKeyC=Non+Cdl+Truck+Driving+Jobs&forceKeyD=Van+Driving+Jobs+Near+Me+Full+Time&forceKeyE=Small+Truck+Driver+Jobs&forceKeyF=Highest+Paying+Pickup+Truck+Driver+Jobs+{state}&fbid=1786225912279573&fbland=PageView&fbserp=AddToCart&fbclick=Purchase&utm_source=facebook",
    "title": "\"Exploring the Benefits of Pickup Driver Careers\"",
    "description": "Explore the benefits of pickup driver jobs, including competitive pay, flexible schedules, and opportunities for growth in the transportation industry.",
    "locale": "en_US"
  },
  "667": {
    "url": "https://mdrnlocal.com/health/how-to-join-paid-sleep-apnea-trials-en-us/?segment=rsoc.sc.mdrnlocal.001&headline=sleep+apnea&forceKeyA=join+sleep+apnea+studies+near+me+{State}&forceKeyB=see+paid+sleep+apnea+studies+in+{State}&forceKeyC={State}+paid+sleep+apnea+studies+near+me&forceKeyD=join+paid+sleep+apnea+studies+in+{City}&forceKeyE=join+paid+sleep+apnea+studies+near+me&forceKeyF=join+sleep+apnea+studies+near++{State}&fbid=1786225912279573&fbland=PageView&fbserp=AddToCart&fbclick=Purchase&utm_source=facebook",
    "title": "Joining Paid Sleep Apnea Trials: A Guide for Participants",
    "description": "Discover how to participate in paid sleep apnea trials, including eligibility criteria, benefits, and the research process involved in these studies.",
    "locale": "en_US"
  },
  "668": {
    "url": "https://mdrnlocal.com/careers/explore-promising-careers-in-truck-driving-en-us-3/?segment=rsoc.sc.mdrnlocal.001&headline=pickup+driver&forceKeyA=Independent+Work+as+Pickup+Driver&forceKeyB=Highest+Paying+Pickup+Truck+Driver+Jobs&forceKeyC=Small+Truck+Driver+Jobs&forceKeyD=Driver+Hiring&forceKeyE=Hiring+Drivers+Now&forceKeyF=Van+Driving+Jobs+Near+Me+Full+Time&fbid=1786225912279573&fbland=PageView&fbserp=AddToCart&fbclick=Purchase&utm_source=facebook",
    "title": "Exploring Career Opportunities in Truck Driving",
    "description": "Discover promising career opportunities in truck driving, including independent work and high-paying positions across various driving segments.",
    "locale": "en_US"
  },
  "669": {
    "url": "https://mdrnlocal.com/careers/why-pickup-driver-jobs-are-a-great-career-choice-en-us/?segment=rsoc.sc.mdrnlocal.001&headline=Learn+About+Working+As+A+Truck+Driver&forceKeyA=Highest+Paying+Pickup+Truck+Driver+Jobs&forceKeyB=Small+Truck+Delivery+Service&forceKeyC=Non+Cdl+Truck+Driving+Jobs&forceKeyD=Van+Driving+Jobs+Near+Me+Full+Time&forceKeyE=Small+Truck+Driver+Jobs&forceKeyF=Highest+Paying+Pickup+Truck+Driver+Jobs+{state}&fbid=1786225912279573&fbland=PageView&fbserp=AddToCart&fbclick=Purchase&utm_source=facebook",
    "title": "The Benefits of Choosing a Career as a Pickup Driver",
    "description": "Explore the benefits of pickup driver jobs, including competitive pay, flexible schedules, and opportunities in various delivery services.",
    "locale": "en_US"
  },
  "670": {
    "url": "https://mdrnlocal.com/health/how-to-join-paid-sleep-apnea-trials-en-us/?segment=rsoc.sc.mdrnlocal.001&headline=sleep+apnea&forceKeyA=join+sleep+apnea+studies+near+me+{State}&forceKeyB=see+paid+sleep+apnea+studies+in+{State}&forceKeyC={State}+paid+sleep+apnea+studies+near+me&forceKeyD=join+paid+sleep+apnea+studies+in+{City}&forceKeyE=join+paid+sleep+apnea+studies+near+me&forceKeyF=join+sleep+apnea+studies+near++{State}&fbid=1786225912279573&fbland=PageView&fbserp=AddToCart&fbclick=Purchase&utm_source=facebook",
    "title": "How to Participate in Paid Sleep Apnea Research Trials",
    "description": "Learn how to participate in paid sleep apnea trials, exploring eligibility requirements and potential benefits of joining these important studies.",
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
      const html = `
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
        </html>`;
      return new Response(html, {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" }
      });
    }
  }

  // 5) Normal redirect configuration
  const FALLBACK_URL = "https://www.msn.com";

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
          const r = (Math.random() * 16) | 0,
            v = c === "x" ? r : (r & 0x3) | 0x8;
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

  // 7) Inputs
  const uaHead = request.headers.get("user-agent") || "";
  const base = id ? redirectMap[id] : null;

  const inApp = isFbIgInApp(uaHead);
  const rawS1 = url.searchParams.get("s1pcid") || "";
  const s1ok = isValidS1pcid(rawS1);

  // 8) Handle unknown IDs
  if (!base) {
    console.log("Redirect", { id, inApp, s1ok, reason: "unknown id", dest: "https://google.com" });
    return redirectResponse("https://google.com");
  }

// 9) Build final destination (preserve most params)
const DROP = new Set([
  "utm_medium", "utm_id", "utm_content", "utm_term", "utm_campaign", "iab", "id"
]);

// base is now an object:  { url, title, description, locale }
if (!base || !base.url) {
  console.log("Redirect", { id, reason: "missing base.url", dest: "https://google.com" });
  return redirectResponse("https://google.com");
}

let dest;
try {
  dest = new URL(base.url);
} catch (err) {
  console.error("Invalid redirect URL", base, err);
  return redirectResponse("https://google.com");
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