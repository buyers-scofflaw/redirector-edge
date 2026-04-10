export default async (request, context) => {
  // 0) Let Netlify Functions handle their own paths (don't intercept /.netlify/functions/*)
  const reqUrl0 = new URL(request.url);
  if (reqUrl0.pathname.startsWith("/.netlify/functions/")) {
    return context.next();
  }

if (reqUrl0.pathname.startsWith("/api/")) {
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
    "title": "\"Exploring Google's Evolution and Impact on the Digital World\"",
    "description": "Google is a leading search engine that provides users with quick access to information, images, and news from across the web. Explore a vast array of content effortlessly.",
    "locale": "en_US"
  },
  "107": {
    "url": "https://etoptip.com/health/are-dental-implant-trials-a-viable-option-en-us/?segment=rsoc.sc.etoptip.001&headline=Dental+Implants+Clinical+Trial&forceKeyA=$1500+for+dental+implant+participation+search+now+near+me+{Month}+2026&forceKeyB=$1500+for+dental+implant+participation+near+me+{Month}+2026&forceKeyC=get+$1950+for+dental+implant+participation+near+me&forceKeyD=$1500+for+dental+implant+participation+search+now+near+me&forceKeyE=paid+clinical+trials+for+dental+implants+near+me&forceKeyF=$1500+for+dental+implant+participation+near+me&fbid=872536505175912&fbland=PageView&fbserp=AddToCart&fbclick=Purchase&s1pplacement={{site_source_name}}-{{placement}}",
    "title": "Evaluating the Viability of Dental Implant Trials",
    "description": "Explore the viability of dental implant trials as a treatment option, including potential participation benefits and financial incentives for participants.",
    "locale": "en_US"
  },
  "108": {
    "url": "https://etoptip.com/automotive/is-the-2026-rogue-the-right-suv-for-you-en-us-3/?segment=rsoc.sc.etoptip.001&headline=Crossover+SUVs+Nearby&forceKeyA=$100/month+-+rogue+2025+crossover+suvs+around+me&forceKeyB=$100/month+-+rogue+2026+crossover+suvs+nearby&forceKeyC=$100/month+-+rogue+2025+crossover+suvs+around+me+{Month}+2026&forceKeyD=for+seniors+2025+rogue+crossover+suvs+nearby+rogue+no+cost&forceKeyE=$100/month+rogue+2025+crossover+suvs+nearby&forceKeyF=car+payments+100+dollars+a+month&fbid=872536505175912&fbland=PageView&fbserp=AddToCart&fbclick=InitiateCheckout&s1pplacement={{site_source_name}}-{{placement}}",
    "title": "Is the 2026 Rogue the Ideal SUV for Your Needs?",
    "description": "Explore the features and specifications of the 2026 Nissan Rogue to determine if it's the ideal SUV for your needs and lifestyle.",
    "locale": "en_US"
  },
  "109": {
    "url": "https://etoptip.com/technology/programs-that-help-seniors-get-affordable-internet-en-us-3/?segment=rsoc.sc.etoptip.001&headline=Best+Internet+Providers&forceKeyA=internet+for+seniors+in+my+area&forceKeyB=no+cost+internet+for+seniors&forceKeyC=get+$0+internet+providers+in+my+zip+code+availability&forceKeyD=no+cost+internet+plans+by+zip+code+-+for+seniors&forceKeyE=get+senior+internet+plans+[at+no+cost]+(at+my+address)&forceKeyF=no+cost+internet+plans+by+zip+code+(for+seniors)&fbid=872536505175912&fbland=PageView&fbserp=AddToCart&fbclick=InitiateCheckout&s1pplacement={{site_source_name}}-{{placement}}",
    "title": "Affordable Internet Options for Seniors: Key Programs and Providers",
    "description": "Discover programs that provide affordable internet options for seniors, including no-cost plans based on your location and specific needs.",
    "locale": "en_US"
  },
  "110": {
    "url": "https://etoptip.com/finance/how-can-you-finance-your-next-cell-phone-en-us/?segment=rsoc.sc.etoptip.001&headline=Get+New+Phone&forceKeyA=get+new+phone+for+seniors+[at+no+cost]&forceKeyB=new+phone+for+seniors+[at+no+cost]&forceKeyC=100%+free+phones+for+seniors&forceKeyD=get+a+new+phone&forceKeyE=i+need+a+new+phone&forceKeyF=get+new+phones+for+seniors+[at+no+cost]&fbid=872536505175912&fbland=PageView&fbserp=AddToCart&fbclick=InitiateCheckout&s1pplacement={{site_source_name}}-{{placement}}",
    "title": "Financing Options for Your Next Cell Phone Purchase",
    "description": "Discover various financing options for your next cell phone, including programs tailored for seniors to acquire new devices at no cost.",
    "locale": "en_US"
  },
  "111": {
    "url": "https://etoptip.com/real-estate/affordable-housing-for-low-income-seniors-en-us-2/?segment=rsoc.sc.etoptip.001&headline=learn+more+about+55+and+older+apartments&forceKeyA=senior+apartments+for+$300+a+month+near+me&forceKeyB=apartments+for+senior+citizens+near+me&forceKeyC=apartments+55+and+older+near+me&forceKeyD=62+and+over+apartments+near+me&forceKeyE=seniors+residences+near+me&forceKeyF=55+and+older+communities+in+{State}&fbid=872536505175912&fbland=PageView&fbserp=AddToCart&fbclick=InitiateCheckout&s1pplacement={{site_source_name}}-{{placement}}",
    "title": "Affordable Housing Options for Low-Income Seniors",
    "description": "Discover affordable housing options tailored for low-income seniors, including 55 and older apartment communities designed for comfort and accessibility.",
    "locale": "en_US"
  },
  "112": {
    "url": "https://etoptip.com/health/latest-advances-in-weight-loss-clinical-trials-en-us-3/?segment=rsoc.sc.etoptip.001&headline=Weight+Loss&forceKeyA=$1500+for+fat+reduction+treatment+participation+near+me&forceKeyB=$6000+for+belly+fat+reduction+treatment+participation+near+my+zipcode+coolsculpting&forceKeyC=locate+$1500+for+belly+fat+reduction+treatment+participation+appointment+near+me&forceKeyD=get+$1500+for+belly+fat+reduction+treatment+participation+appointment&forceKeyE=$6000+for+belly+fat+reduction+treatment+participation+in+near+my+zipcode+coolsculpting&forceKeyF=$1500+for+belly+fat+reduction+treatments+participation+appointment&fbid=872536505175912&fbland=PageView&fbserp=AddToCart&fbclick=InitiateCheckout&s1pplacement={{site_source_name}}-{{placement}}",
    "title": "\"Recent Breakthroughs in Weight Loss Clinical Trials\"",
    "description": "Explore the latest advancements in weight loss clinical trials, focusing on innovative treatments and their effectiveness in fat reduction.",
    "locale": "en_US"
  },
  "113": {
    "url": "https://etoptip.com/health/how-do-diabetes-trials-shape-future-treatments-en-us-3/?segment=rsoc.sc.etoptip.001&headline=Diabetes+Clinical+Trials&forceKeyA=diabetes+study+testing+new+treatments+$26700+near+me&forceKeyB=best+diabetes+study+testing+new+treatments+$26700+near+me&forceKeyC=best+diabetes+study+testing+new+treatments+$26700&forceKeyD=best+diabetes+study+testing+new+treatments+$13675+near+me&forceKeyE=diabetes+clinical+studies+testing+new+treatments+$26700+near+me&forceKeyF=paid+clinical+trials+for+type+2+diabetes&fbid=872536505175912&fbland=PageView&fbserp=AddToCart&fbclick=InitiateCheckout&s1pplacement={{site_source_name}}-{{placement}}",
    "title": "The Impact of Diabetes Trials on Future Treatment Options",
    "description": "Explore how diabetes clinical trials contribute to the development of innovative treatments, shaping the future of diabetes care and management.",
    "locale": "en_US"
  },
  "114": {
    "url": "https://10toptips.com/education/choosing-online-schools-that-provide-computers-en-us-3/?segment=rsoc.sc.10toptips.002&headline=learn+more+about+online+high+school+with+laptop&forceKeyA=apply+for+online+school+that+gives+you+$+and+laptops+today+{Month}+2026&forceKeyB=apply+for+online+schools+that+give+you+$+and+laptops+today+{Month}+2026&forceKeyC=apply+for+online+school+high+school+that+gives+you+a+computer+now&forceKeyD=apply+for+online+schools+that+give+you+$+and+laptops+near+me&forceKeyE=best+apply+for+online+school+that+gives+you+$+and+laptops+today+{Month}+2026&forceKeyF=get+paid+to+go+back+to+school&fbid=872536505175912&fbland=PageView&fbserp=AddToCart&fbclick=InitiateCheckout&s1pplacement={{site_source_name}}-{{placement}}",
    "title": "\"Choosing Online Schools That Include Computers for Students\"",
    "description": "Discover how to choose online schools that provide laptops, enhancing your educational experience with essential technology for success.",
    "locale": "en_US"
  },
  "115": {
    "url": "https://etoptip.com/health/how-are-asthma-clinical-trials-transforming-care-en-us-2/?segment=rsoc.sc.etoptip.001&headline=Asthma+Clinical+Trials&forceKeyA=$6000+paid+for+asthma+treatments+participation+near+my+zipcode&forceKeyB=asthma+clinical+studies+$6000+near+my+zipcode&forceKeyC=$6000+for+asthma+treatments+participation+near+my+zipcode&forceKeyD=$6000+paid+for+best+asthma+treatments+participation+near+my+zipcode&forceKeyE=$6000+paid+for+verified+asthma+treatments+participation+near+my+zipcode&forceKeyF=adult+asthma&fbid=872536505175912&fbland=PageView&fbserp=AddToCart&fbclick=InitiateCheckout&s1pplacement={{site_source_name}}-{{placement}}",
    "title": "Transforming Asthma Care: The Impact of Clinical Trials",
    "description": "Explore how asthma clinical trials are revolutionizing patient care, offering innovative treatments and insights into managing this chronic condition.",
    "locale": "en_US"
  },
  "116": {
    "url": "https://etoptip.com/automotive/choosing-the-right-suv-for-seniors-en-us/?segment=rsoc.sc.etoptip.001&headline=Read+More+About+SUV+For+Seniors&forceKeyA=100+accepted+|+0+down+options+-+rogue+2025+crossover+suvs+nearby+(rogue)+(no+cost)&forceKeyB=100+accepted+|+$50/month+-+rogue+2025+crossover+suvs+nearby+[no+cost]&forceKeyC=100+accepted+|+0+down+options+-+rogue+2025+crossover+suvs+nearby+(rogue)+[no+cost]&forceKeyD=$100/month+-+rogue+2025+crossover+suvs+around+me&forceKeyE=$100/month+-+rogue+2025+crossover+suvs+around+me+{Month}+2026&forceKeyF=$100/month+-+rogue+2025+crossover+suvs+nearby&fbid=872536505175912&fbland=PageView&fbserp=AddToCart&fbclick=InitiateCheckout&s1pplacement={{site_source_name}}-{{placement}}",
    "title": "Choosing the Best SUVs for Seniors: A Comprehensive Guide",
    "description": "Discover key considerations for selecting the perfect SUV for seniors, focusing on comfort, accessibility, and safety features tailored to their needs.",
    "locale": "en_US"
  },
  "117": {
    "url": "https://10toptips.com/health/how-dental-implant-trials-advance-oral-health-en-us-3/?segment=rsoc.sc.10toptips.002&headline=Learn+About+Studies+For+Dental+Implants&forceKeyA=$6000+for+dental+implants+participation+near+me+{State}&forceKeyB=$6000+for+dental+implants+participations+near+my+zipcode+{State}&forceKeyC=get+paid+to+get+dental+implants&forceKeyD=get+$1500+for+dental+implant+participation+in+{State}&forceKeyE=paid+clinical+trials+for+dental+implants+near+me&forceKeyF=join+$6000+hiv+clinical+study+{Month}+2026&fbid=872536505175912&fbland=PageView&fbserp=AddToCart&fbclick=InitiateCheckout&s1pplacement={{site_source_name}}-{{placement}}",
    "title": "Advancements in Oral Health Through Dental Implant Trials",
    "description": "Discover how dental implant trials contribute to advancements in oral health and the potential benefits for participants in these studies.",
    "locale": "en_US"
  },
  "118": {
    "url": "https://goatdealo.online/health/key-factors-in-joining-neuropathy-trials-en-us-2/?segment=rsoc.sc.goatdealoonline.001&headline=Neuropathy+Clinical+Trials&forceKeyA=neuropathy+compensation+near+me&forceKeyB=neuropathy+compensation+in+{State}&forceKeyC=neuropathy+compensation+{State}&forceKeyD=neurology+clinical+trials&forceKeyE=neuropathy+trial+eligibility&forceKeyF=neurological+clinical+trials&fbid=872536505175912&fbland=PageView&fbserp=AddToCart&fbclick=InitiateCheckout&s1pplacement={{site_source_name}}-{{placement}}",
    "title": "Key Factors to Consider When Joining Neuropathy Trials",
    "description": "Explore key factors to consider when joining neuropathy clinical trials, including eligibility, compensation, and the benefits of participation in research.",
    "locale": "en_US"
  },
  "119": {
    "url": "https://goatdealo.online/finance/how-to-maximize-your-earnings-with-bank-account-bonuses-en-us-2/?segment=rsoc.sc.goatdealoonline.001&headline=learn+more+about+bank+account+bonus&forceKeyA=start+bank+accounts+online+with+no+deposits+($1000+on+opening)&forceKeyB=start+a+bank+account+online+with+no+deposits+($1000+on+opening)&forceKeyC=start+a+bank+accounts+online+with+no+deposits+($1000+on+opening)&forceKeyD=start+a+bank+account+online+with+no+deposit+($1000+on+opening)&forceKeyE=opening+bank+accounts+for+free+money&forceKeyF=banks+that+pay+you+to+open+an+account+with+no+deposit&fbid=872536505175912&fbland=PageView&fbserp=AddToCart&fbclick=InitiateCheckout&s1pplacement={{site_source_name}}-{{placement}}",
    "title": "Maximizing Earnings Through Bank Account Bonuses Explained",
    "description": "Discover strategies to maximize your earnings through bank account bonuses, including options for accounts with no initial deposits.",
    "locale": "en_US"
  },
  "120": {
    "url": "https://goatdealo.online/health/understanding-type-2-diabetes-clinical-trials-what-to-know-about-eligibility-safety-and-compensation-en-us/?segment=rsoc.sc.goatdealoonline.001&headline=Diabetes+Clinical+Trials&forceKeyA=diabetes+study+testing+new+treatments+$26700+near+me&forceKeyB=diabetes+clinical+studies+testing+new+treatments+$26700+near+me&forceKeyC=diabetes+studies+near+me&forceKeyD=paid+clinical+trials+for+type+2+diabetes&forceKeyE=best+diabetes+study+testing+new+treatments+$26700+near+me&forceKeyF=type+2+diabetes+clinical+trials+near+me&fbid=872536505175912&fbland=PageView&fbserp=AddToCart&fbclick=InitiateCheckout&s1pplacement={{placement}}",
    "title": "Understanding Type 2 Diabetes: Insights on Clinical Trials and Safety",
    "description": "Explore key insights on type 2 diabetes clinical trials, including eligibility criteria, safety measures, and potential compensation for participants.",
    "locale": "en_US"
  },
  "121": {
    "url": "https://goatdealo.online/real-estate/affordable-housing-for-low-income-seniors-en-us-3/?segment=rsoc.sc.goatdealoonline.001&headline=learn+more+about+55+and+older+apartments&forceKeyA=senior+apartments+for+$300+a+month+near+me&forceKeyB=apartments+for+senior+citizens+near+me&forceKeyC=apartments+55+and+older+near+me&forceKeyD=55+and+older+communities+{State}&forceKeyE=62+and+older+apartments+near+me&forceKeyF=65+and+older+apartments+near+me&fbid=872536505175912&fbland=PageView&fbserp=AddToCart&fbclick=InitiateCheckout&s1pplacement={{placement}}",
    "title": "Affordable Housing Options for Low-Income Seniors",
    "description": "Discover affordable housing options for low-income seniors, including 55 and older apartments, tailored to meet the needs of older adults.",
    "locale": "en_US"
  },
  "122": {
    "url": "https://goatdealo.online/education/choosing-online-schools-that-provide-computers-en-us-4/?segment=rsoc.sc.goatdealoonline.001&headline=learn+more+about+online+high+school+with+laptop&forceKeyA=apply+for+online+school+that+gives+you+$+and+laptops+near+me&forceKeyB=apply+for+online+school+that+gives+you+$+and+laptops+today+{Month}+2026&forceKeyC=apply+for+online+school+high+school+that+gives+you+a+computer+now&forceKeyD=apply+for+online+schools+that+give+you+$+and+laptops+today+{Month}+2026&forceKeyE=online+schools+that+give+refund+checks+and+laptops&forceKeyF=$6000+grant+for+online+classes&fbid=872536505175912&fbland=PageView&fbserp=AddToCart&fbclick=InitiateCheckout&s1pplacement={{placement}}",
    "title": "Choosing Online Schools That Provide Computers and Support",
    "description": "Discover how to choose online schools that provide laptops, financial support, and quality education, making learning more accessible and convenient.",
    "locale": "en_US"
  },
  "123": {
    "url": "https://goatdealo.online/shopping/how-to-get-a-smartphone-at-no-cost-iphones-available-en-us-3/?segment=rsoc.sc.goatdealoonline.001&headline=Get+New+Phone&forceKeyA=apply+for+free+phones+for+seniors&forceKeyB=100%+free+phones+for+senior&forceKeyC=100%+free+phones+for+seniors&forceKeyD=100+free+phones+for+seniors&forceKeyE=100%+free+phones+for+senior+near+me&forceKeyF=get+new+phone+for+seniors+{Month}+2026&fbid=872536505175912&fbland=PageView&fbserp=AddToCart&fbclick=InitiateCheckout&s1pplacement={{placement}}",
    "title": "\"How to Obtain a Free Smartphone: Options for Seniors in the US\"",
    "description": "Discover options for obtaining smartphones at no cost, including available iPhones for seniors in the U.S., and learn about eligibility and application details.",
    "locale": "en_US"
  },
  "124": {
    "url": "https://goatdealo.online/finance/how-to-get-a-0-down-payment-and-an-affordable-payment-en-us/?segment=rsoc.sc.goatdealoonline.001&headline=Crossover+SUVs+Nearby&forceKeyA=best+$100/month+-+rogue+2025+crossover+suvs+around+me&forceKeyB=$100/month+best+rogue+2025+crossover+suvs+nearby&forceKeyC=$100/month+-+rogue+2026+crossover+suvs+nearby&forceKeyD=$100/month+-+rogue+2025+crossover+suvs+around+me&forceKeyE=$100/month+-+rogue+2025+crossover+suvs&forceKeyF=$100/month+rogue+2025+crossover+suvs+nearby&fbid=872536505175912&fbland=PageView&fbserp=AddToCart&fbclick=InitiateCheckout&s1pplacement={{placement}}",
    "title": "\"Securing a 0% Down Payment for Affordable Crossover SUVs\"",
    "description": "Explore how to secure a 0% down payment and manage affordable monthly payments for financing options on crossover SUVs.",
    "locale": "en_US"
  },
  "125": {
    "url": "https://goatdealo.online/health/how-are-asthma-clinical-trials-transforming-care-en-us-4/?segment=rsoc.sc.goatdealoonline.001&headline=Asthma+Clinical+Trials&forceKeyA=$6000+paid+for+asthma+treatments+participation+near+my+zipcode&forceKeyB=asthma+clinical+studies+$6000+near+my+zipcode&forceKeyC=$6000+for+asthma+treatments+participation+near+my+zipcode&forceKeyD=asthma+near+me&forceKeyE=$6000+asthma+treatments+participation+near+me&forceKeyF=paid+asthma+studies+near+me&fbid=872536505175912&fbland=PageView&fbserp=AddToCart&fbclick=InitiateCheckout&s1pplacement={{placement}}",
    "title": "Transforming Asthma Care: The Impact of Clinical Trials",
    "description": "Discover how asthma clinical trials are revolutionizing patient care and treatment options, offering new insights and advancements in management strategies.",
    "locale": "en_US"
  },
  "126": {
    "url": "https://goatdealo.online/health/how-participating-in-dental-implant-trials-can-save-you-money-and-improve-your-smile-en-us/?segment=rsoc.sc.goatdealoonline.001&headline=Dental+Implants+Clinical+Trial&forceKeyA=get+$1950+for+dental+implants+participations+near+me+{Month}+2026&forceKeyB=get+$1950+for+dental+implants+participations+near+me&forceKeyC=paid+clinical+trials+for+dental+implants+near+me&forceKeyD=free+dental+implants+clinical+trials+near+me+2026&forceKeyE=free+dental+implants+near+me&forceKeyF=access+$1500+for+dental+implant+participation+nearby+me&fbid=872536505175912&fbland=PageView&fbserp=AddToCart&fbclick=InitiateCheckout&s1pplacement={{placement}}",
    "title": "\"Saving Money and Enhancing Smiles: Dental Implant Trials Explained\"",
    "description": "Discover how participating in dental implant trials can provide significant savings and enhance your smile through innovative dental solutions.",
    "locale": "en_US"
  },
  "127": {
    "url": "https://etoptip.com/finance/future-proof-your-retirement-the-rise-of-gold-ira-kits-in-smart-investing-en-us/?segment=rsoc.sc.etoptip.001&headline=learn+more+about+gold+ira&forceKeyA=get+gold+ira+kits+[$0+cost]&forceKeyB=gold+ira+kits+[$0+cost]&forceKeyC=free+gold+ira+kit&forceKeyD=free+gold+ira+kit+u2013+no+cost&forceKeyE=physical+gold&forceKeyF=free+gold+ira+kit+with+free+gold+bar&fbid=872536505175912&fbland=PageView&fbserp=AddToCart&fbclick=InitiateCheckout&s1pplacement={{placement}}",
    "title": "\"Exploring Gold IRA Kits for a Secure Retirement Future\"",
    "description": "Explore the benefits of Gold IRA kits as a strategic option for securing your retirement, amid the growing interest in smart investing.",
    "locale": "en_US"
  },
  "128": {
    "url": "https://etoptip.com/health/understanding-type-2-diabetes-clinical-trials-what-to-know-about-eligibility-safety-and-compensation-en-us/?segment=rsoc.sc.etoptip.001&headline=Diabetes+Clinical+Trials&forceKeyA=diabetes+study+testing+new+treatments+$26700+near+me&forceKeyB=diabetes+clinical+studies+testing+new+treatments+$26700+near+me&forceKeyC=diabetes+studies+near+me&forceKeyD=paid+clinical+trials+for+type+2+diabetes&forceKeyE=best+diabetes+study+testing+new+treatments+$26700+near+me&forceKeyF=type+2+diabetes+clinical+trials+near+me&fbid=872536505175912&fbland=PageView&fbserp=AddToCart&fbclick=InitiateCheckout&s1pplacement={{placement}}",
    "title": "Understanding Type 2 Diabetes Clinical Trials: Eligibility and Safety",
    "description": "Explore key insights about eligibility, safety, and compensation in type 2 diabetes clinical trials, enhancing your understanding of new treatment options.",
    "locale": "en_US"
  },
  "129": {
    "url": "https://etoptip.com/real-estate/affordable-housing-for-low-income-seniors-en-us-3/?segment=rsoc.sc.etoptip.001&headline=learn+more+about+55+and+older+apartments&forceKeyA=senior+apartments+for+$300+a+month+near+me&forceKeyB=apartments+for+senior+citizens+near+me&forceKeyC=apartments+55+and+older+near+me&forceKeyD=55+and+older+communities+{State}&forceKeyE=62+and+older+apartments+near+me&forceKeyF=65+and+older+apartments+near+me&fbid=872536505175912&fbland=PageView&fbserp=AddToCart&fbclick=InitiateCheckout&s1pplacement={{placement}}",
    "title": "Affordable Housing Options for Low-Income Seniors 55+",
    "description": "Discover affordable housing options tailored for low-income seniors, including 55+ and 62+ communities, providing comfortable living at accessible prices.",
    "locale": "en_US"
  },
  "130": {
    "url": "https://etoptip.com/education/choosing-online-schools-that-provide-computers-en-us-4/?segment=rsoc.sc.etoptip.001&headline=learn+more+about+online+high+school+with+laptop&forceKeyA=apply+for+online+school+that+gives+you+$+and+laptops+near+me&forceKeyB=apply+for+online+school+that+gives+you+$+and+laptops+today+{Month}+2026&forceKeyC=apply+for+online+school+high+school+that+gives+you+a+computer+now&forceKeyD=apply+for+online+schools+that+give+you+$+and+laptops+today+{Month}+2026&forceKeyE=online+schools+that+give+refund+checks+and+laptops&forceKeyF=$6000+grant+for+online+classes&fbid=872536505175912&fbland=PageView&fbserp=AddToCart&fbclick=InitiateCheckout&s1pplacement={{placement}}",
    "title": "Choosing Online Schools That Provide Computers and Resources",
    "description": "Discover essential tips for choosing online schools that provide computers and financial support, enhancing your educational experience.",
    "locale": "en_US"
  },
  "131": {
    "url": "https://etoptip.com/shopping/how-to-get-a-smartphone-at-no-cost-iphones-available-en-us-2/?segment=rsoc.sc.etoptip.001&headline=Get+New+Phone&forceKeyA=apply+for+free+phones+for+seniors&forceKeyB=100%+free+phones+for+senior&forceKeyC=100%+free+phones+for+seniors&forceKeyD=100+free+phones+for+seniors&forceKeyE=100%+free+phones+for+senior+near+me&forceKeyF=get+new+phone+for+seniors+{Month}+2026&fbid=872536505175912&fbland=PageView&fbserp=AddToCart&fbclick=InitiateCheckout&s1pplacement={{placement}}",
    "title": "How to Obtain a Free Smartphone: iPhones Available in the U.S.",
    "description": "Discover how seniors in the U.S. can obtain smartphones at no cost, including options for iPhones, through various programs designed for assistance.",
    "locale": "en_US"
  },
  "132": {
    "url": "https://etoptip.com/automotive/is-the-2026-rogue-the-right-suv-for-you-en-us-3/?segment=rsoc.sc.etoptip.001&headline=Crossover+SUVs+Nearby&forceKeyA=best+$100/month+-+rogue+2025+crossover+suvs+around+me&forceKeyB=$100/month+best+rogue+2025+crossover+suvs+nearby&forceKeyC=$100/month+-+rogue+2026+crossover+suvs+nearby&forceKeyD=$100/month+-+rogue+2025+crossover+suvs+around+me&forceKeyE=$100/month+-+rogue+2025+crossover+suvs&forceKeyF=$100/month+rogue+2025+crossover+suvs+nearby&fbid=872536505175912&fbland=PageView&fbserp=AddToCart&fbclick=InitiateCheckout&s1pplacement={{placement}}",
    "title": "\"Exploring Zero Down Payment Options for Affordable SUV Financing\"",
    "description": "Explore options for obtaining a vehicle with zero down payment and manageable monthly payments, focusing on affordable crossover SUVs in your area.",
    "locale": "en_US"
  },
  "133": {
    "url": "https://etoptip.com/health/how-are-asthma-clinical-trials-transforming-care-en-us-4/?segment=rsoc.sc.etoptip.001&headline=Asthma+Clinical+Trials&forceKeyA=$6000+paid+for+asthma+treatments+participation+near+my+zipcode&forceKeyB=asthma+clinical+studies+$6000+near+my+zipcode&forceKeyC=$6000+for+asthma+treatments+participation+near+my+zipcode&forceKeyD=asthma+near+me&forceKeyE=$6000+asthma+treatments+participation+near+me&forceKeyF=paid+asthma+studies+near+me&fbid=872536505175912&fbland=PageView&fbserp=AddToCart&fbclick=InitiateCheckout&s1pplacement={{placement}}",
    "title": "Transforming Asthma Care Through Innovative Clinical Trials",
    "description": "Explore how asthma clinical trials are revolutionizing patient care and treatment options, offering insights into advancements in asthma management.",
    "locale": "en_US"
  },
  "134": {
    "url": "https://etoptip.com/health/how-participating-in-dental-implant-trials-can-save-you-money-and-improve-your-smile-en-us/?segment=rsoc.sc.etoptip.001&headline=Dental+Implants+Clinical+Trial&forceKeyA=get+$1950+for+dental+implants+participations+near+me+{Month}+2026&forceKeyB=get+$1950+for+dental+implants+participations+near+me&forceKeyC=paid+clinical+trials+for+dental+implants+near+me&forceKeyD=free+dental+implants+clinical+trials+near+me+2026&forceKeyE=free+dental+implants+near+me&forceKeyF=access+$1500+for+dental+implant+participation+nearby+me&fbid=872536505175912&fbland=PageView&fbserp=AddToCart&fbclick=InitiateCheckout&s1pplacement={{placement}}",
    "title": "\"How Dental Implant Trials Can Enhance Your Smile and Save You Money\"",
    "description": "Discover how participating in dental implant trials can enhance your smile while potentially saving you money on your dental care expenses.",
    "locale": "en_US"
  },
  "135": {
    "url": "https://etoptip.com/finance/future-proof-your-retirement-the-rise-of-gold-ira-kits-in-smart-investing-en-us/?segment=rsoc.sc.etoptip.001&headline=learn+more+about+gold+ira&forceKeyA=get+gold+ira+kits+[$0+cost]&forceKeyB=gold+ira+kits+[$0+cost]&forceKeyC=free+gold+ira+kit&forceKeyD=free+gold+ira+kit+u2013+no+cost&forceKeyE=physical+gold&forceKeyF=free+gold+ira+kit+with+free+gold+bar&fbid=872536505175912&fbland=PageView&fbserp=AddToCart&fbclick=InitiateCheckout&s1pplacement={{placement}}",
    "title": "\"Exploring Gold IRA Kits: A Smart Move for Retirement Planning\"",
    "description": "Discover how Gold IRA kits are becoming essential for smart investing and securing your retirement in an evolving financial landscape.",
    "locale": "en_US"
  },
  "136": {
    "url": "https://10toptips.com/health/understanding-type-2-diabetes-clinical-trials-what-to-know-about-eligibility-safety-and-compensation-en-us/?segment=rsoc.sc.10toptips.002&headline=Diabetes+Clinical+Trials&forceKeyA=diabetes+study+testing+new+treatments+$26700+near+me&forceKeyB=diabetes+clinical+studies+testing+new+treatments+$26700+near+me&forceKeyC=diabetes+studies+near+me&forceKeyD=paid+clinical+trials+for+type+2+diabetes&forceKeyE=best+diabetes+study+testing+new+treatments+$26700+near+me&forceKeyF=type+2+diabetes+clinical+trials+near+me&fbid=872536505175912&fbland=PageView&fbserp=AddToCart&fbclick=InitiateCheckout&s1pplacement={{placement}}",
    "title": "Understanding Type 2 Diabetes: Insights on Clinical Trials and Safety",
    "description": "Explore essential insights about type 2 diabetes clinical trials, including eligibility criteria, safety considerations, and potential compensation for participants.",
    "locale": "en_US"
  },
  "137": {
    "url": "https://10toptips.com/real-estate/affordable-housing-for-low-income-seniors-en-us-3/?segment=rsoc.sc.10toptips.002&headline=learn+more+about+55+and+older+apartments&forceKeyA=senior+apartments+for+$300+a+month+near+me&forceKeyB=apartments+for+senior+citizens+near+me&forceKeyC=apartments+55+and+older+near+me&forceKeyD=55+and+older+communities+{State}&forceKeyE=62+and+older+apartments+near+me&forceKeyF=65+and+older+apartments+near+me&fbid=872536505175912&fbland=PageView&fbserp=AddToCart&fbclick=InitiateCheckout&s1pplacement={{placement}}",
    "title": "Affordable Housing Options for Low-Income Seniors",
    "description": "Discover affordable housing options tailored for low-income seniors, focusing on 55 and older apartments and communities that meet diverse needs.",
    "locale": "en_US"
  },
  "138": {
    "url": "https://10toptips.com/education/choosing-online-schools-that-provide-computers-en-us-2/?segment=rsoc.sc.10toptips.002&headline=learn+more+about+online+high+school+with+laptop&forceKeyA=apply+for+online+school+that+gives+you+$+and+laptops+near+me&forceKeyB=apply+for+online+school+that+gives+you+$+and+laptops+today+{Month}+2026&forceKeyC=apply+for+online+school+high+school+that+gives+you+a+computer+now&forceKeyD=apply+for+online+schools+that+give+you+$+and+laptops+today+{Month}+2026&forceKeyE=online+schools+that+give+refund+checks+and+laptops&forceKeyF=$6000+grant+for+online+classes&fbid=872536505175912&fbland=PageView&fbserp=AddToCart&fbclick=InitiateCheckout&s1pplacement={{placement}}",
    "title": "\"Choosing Online Schools That Provide Computers for Students\"",
    "description": "Explore essential tips for selecting online schools that offer computers, ensuring a supportive learning environment for students in the digital age.",
    "locale": "en_US"
  },
  "139": {
    "url": "https://10toptips.com/shopping/how-to-get-a-smartphone-at-no-cost-iphones-available-en-us-3/?segment=rsoc.sc.10toptips.002&headline=Get+New+Phone&forceKeyA=apply+for+free+phones+for+seniors&forceKeyB=100%+free+phones+for+senior&forceKeyC=100%+free+phones+for+seniors&forceKeyD=100+free+phones+for+seniors&forceKeyE=100%+free+phones+for+senior+near+me&forceKeyF=get+new+phone+for+seniors+{Month}+2026&fbid=872536505175912&fbland=PageView&fbserp=AddToCart&fbclick=InitiateCheckout&s1pplacement={{placement}}",
    "title": "\"How to Obtain a Free Smartphone: Options for Seniors in the U.S.\"",
    "description": "Discover how seniors in the U.S. can obtain a smartphone at no cost, including options for iPhones, through various available programs and resources.",
    "locale": "en_US"
  },
  "140": {
    "url": "https://10toptips.com/finance/how-to-get-a-0-down-payment-and-an-affordable-payment-en-us/?segment=rsoc.sc.10toptips.002&headline=Crossover+SUVs+Nearby&forceKeyA=best+$100/month+-+rogue+2025+crossover+suvs+around+me&forceKeyB=$100/month+best+rogue+2025+crossover+suvs+nearby&forceKeyC=$100/month+-+rogue+2026+crossover+suvs+nearby&forceKeyD=$100/month+-+rogue+2025+crossover+suvs+around+me&forceKeyE=$100/month+-+rogue+2025+crossover+suvs&forceKeyF=$100/month+rogue+2025+crossover+suvs+nearby&fbid=872536505175912&fbland=PageView&fbserp=AddToCart&fbclick=InitiateCheckout&s1pplacement={{placement}}",
    "title": "\"Exploring Zero Down Payment Options for Affordable SUV Financing\"",
    "description": "Discover strategies for securing a 0% down payment and managing affordable monthly payments for your next vehicle purchase.",
    "locale": "en_US"
  },
  "141": {
    "url": "https://10toptips.com/health/how-are-asthma-clinical-trials-transforming-care-en-us-3/?segment=rsoc.sc.10toptips.002&headline=Asthma+Clinical+Trials&forceKeyA=$6000+paid+for+asthma+treatments+participation+near+my+zipcode&forceKeyB=asthma+clinical+studies+$6000+near+my+zipcode&forceKeyC=$6000+for+asthma+treatments+participation+near+my+zipcode&forceKeyD=asthma+near+me&forceKeyE=$6000+asthma+treatments+participation+near+me&forceKeyF=paid+asthma+studies+near+me&fbid=872536505175912&fbland=PageView&fbserp=AddToCart&fbclick=InitiateCheckout&s1pplacement={{placement}}",
    "title": "Transforming Asthma Care: The Impact of Clinical Trials",
    "description": "Explore how asthma clinical trials are reshaping treatment approaches and improving patient outcomes in respiratory care. Discover the latest advancements in asthma research.",
    "locale": "en_US"
  },
  "142": {
    "url": "https://10toptips.com/health/how-participating-in-dental-implant-trials-can-save-you-money-and-improve-your-smile-en-us/?segment=rsoc.sc.10toptips.002&headline=Dental+Implants+Clinical+Trial&forceKeyA=get+$1950+for+dental+implants+participations+near+me+{Month}+2026&forceKeyB=get+$1950+for+dental+implants+participations+near+me&forceKeyC=paid+clinical+trials+for+dental+implants+near+me&forceKeyD=free+dental+implants+clinical+trials+near+me+2026&forceKeyE=free+dental+implants+near+me&forceKeyF=access+$1500+for+dental+implant+participation+nearby+me&fbid=872536505175912&fbland=PageView&fbserp=AddToCart&fbclick=InitiateCheckout&s1pplacement={{placement}}",
    "title": "\"How Dental Implant Trials Can Enhance Your Smile and Save You Money\"",
    "description": "Discover how participating in dental implant trials can help you save money while enhancing your smile through innovative treatments and research opportunities.",
    "locale": "en_US"
  },
  "143": {
    "url": "https://etoptip.com/finance/future-proof-your-retirement-the-rise-of-gold-ira-kits-in-smart-investing-en-us/?segment=rsoc.sc.etoptip.001&headline=learn+more+about+gold+ira&forceKeyA=get+gold+ira+kits+[$0+cost]&forceKeyB=gold+ira+kits+[$0+cost]&forceKeyC=free+gold+ira+kit&forceKeyD=free+gold+ira+kit+u2013+no+cost&forceKeyE=physical+gold&forceKeyF=free+gold+ira+kit+with+free+gold+bar&fbid=872536505175912&fbland=PageView&fbserp=AddToCart&fbclick=InitiateCheckout&s1pplacement={{placement}}",
    "title": "\"Understanding Gold IRA Kits for a Secure Retirement Future\"",
    "description": "Discover the growing trend of Gold IRA kits as a secure investment strategy to enhance your retirement portfolio and safeguard your financial future.",
    "locale": "en_US"
  },
  "144": {
    "url": "https://goatdealo.online/real-estate/affordable-housing-for-low-income-seniors-en-us-6/?segment=rsoc.sc.goatdealoonline.001&headline=learn+more+about+55+and+older+apartments&forceKeyA=55+and+older+apartments+near+me&forceKeyB=55+and+older+apartment+near+me&forceKeyC=see+55+and+older+apartments+near+me&forceKeyD=find+55+and+older+apartments+near+me&forceKeyE=see+55+and+older+apartment+near+me&forceKeyF=&fbid=872536505175912&fbland=PageView&fbserp=AddToCart&fbclick=InitiateCheckout&s1pplacement={{placement}}",
    "title": "Affordable Housing Options for Seniors 55 and Older",
    "description": "Discover affordable housing options for low-income seniors aged 55 and older, featuring a range of apartments tailored to meet their needs.",
    "locale": "en_US"
  },
  "145": {
    "url": "https://goatdealo.online/education/choosing-online-schools-that-provide-computers-en-us-6/?segment=rsoc.sc.goatdealoonline.001&headline=learn+more+about+online+high+school+with+laptop&forceKeyA=Apply+for+Online+School+High+School+that+Gives+You+a+Computer+Now&forceKeyB=Apply+for+Online+School+High+School+that+Give+You+a+Computer+Now&forceKeyC=Apply+for+Online+School+High+School+that+Gives+You+a+Computer&forceKeyD=Apply+for+Online+School+High+Schools+that+Give+You+a+Computer&forceKeyE=Apply+for+Online+School+High+School+that+Give+You+a+Computer&forceKeyF=Apply+for+Online+School+High+Schools+that+Gives+You+a+Computer&fbid=872536505175912&fbland=PageView&fbserp=AddToCart&fbclick=InitiateCheckout&s1pplacement={{placement}}",
    "title": "\"Choosing Online Schools That Provide Computers for Students\"",
    "description": "Explore the benefits of choosing online schools that provide computers, enhancing your educational experience and access to resources.",
    "locale": "en_US"
  },
  "146": {
    "url": "https://goatdealo.online/health/how-dental-implant-trials-can-save-you-money-and-improve-your-smile-en-us-6/?segment=rsoc.sc.goatdealoonline.001&headline=learn+more+about+dental+implants+trial&forceKeyA=$1500+for+Dental+Implants+Participation&forceKeyB=Participate+in+Dental+Implants+Trial+[sign+Up+Now]&forceKeyC=No-fee+Dental+Implants&forceKeyD=Get+$1500+for+Dental+Implants+Participation&forceKeyE=$1950+for+Dental+Implants+Participation+[search+Now]&forceKeyF=Participate+in+Dental+Implants+Trial+Sign+Up+Now&fbid=872536505175912&fbland=PageView&fbserp=AddToCart&fbclick=InitiateCheckout&s1pplacement={{placement}}",
    "title": "\"Exploring Dental Implant Trials: Save Money and Enhance Your Smile\"",
    "description": "Discover how participating in dental implant trials can enhance your smile while saving you money, offering an innovative solution for dental care.",
    "locale": "en_US"
  },
  "147": {
    "url": "https://goatdealo.online/real-estate/where-can-seniors-find-affordable-housing-es-us/?segment=rsoc.sc.goatdealoonline.001&headline=learn+more+about+55+and+older+apartments&forceKeyA=55+and+older+apartments+near+me&forceKeyB=55+and+older+apartment+near+me&forceKeyC=see+55+and+older+apartments+near+me&forceKeyD=find+55+and+older+apartments+near+me&forceKeyE=see+55+and+older+apartment+near+me&forceKeyF=&fbid=872536505175912&fbland=PageView&fbserp=AddToCart&fbclick=InitiateCheckout&s1pplacement={{placement}}",
    "title": "Opciones de vivienda asequible para mayores de 55 a?os en EE. UU.",
    "description": "Descubre opciones de vivienda asequible para personas mayores de 55 a?os en EE. UU., con informaci?n sobre apartamentos y recursos disponibles.",
    "locale": "es_ES"
  },
  "148": {
    "url": "https://goatdealo.online/health/juvederm-non-surgical-facelift-studies-explained/?segment=rsoc.sc.goatdealoonline.001&headline=Learn+About+Trials+on+Facial+Aesthetic+Care&forceKeyA=juv?derm+clinic+near+me&forceKeyB=find+juv?derm+clinic+near+me+{Month}+2026&forceKeyC=find+juv?derm+clinics+near+me&forceKeyD=juv?derm+clinics+near+me&forceKeyE=find+juv?derm+clinic+near+me&forceKeyF=&fbid=872536505175912&fbland=PageView&fbserp=AddToCart&fbclick=InitiateCheckout&s1pplacement={{placement}}",
    "title": "\"Exploring Studies on Juvederm for Non-Surgical Facelifts\"",
    "description": "Explore comprehensive studies on Juv?derm and its effectiveness as a non-surgical facelift, highlighting advancements in facial aesthetic care.",
    "locale": "en_US"
  },
  "149": {
    "url": "https://goatdealo.online/finance/future-proof-your-retirement-the-rise-of-gold-ira-kits-in-smart-investing-en-us-2/?segment=rsoc.sc.goatdealoonline.001&headline=learn+more+about+gold+ira&forceKeyA=Get+Free+Gold+IRA+Kit+With+$10k&forceKeyB=Gold+Ira+Kits+[$0+Cost]&forceKeyC=Gold+Ira+Kit+[$0+Cost]&forceKeyD=Free+Gold+IRA+Kit+U2013+No+Cost&forceKeyE=Free+Gold+Ira+Kits+U2013+no+Cost&forceKeyF=Get+a+Gold+Ira+Kit&fbid=872536505175912&fbland=PageView&fbserp=AddToCart&fbclick=InitiateCheckout&s1pplacement={{placement}}",
    "title": "\"Exploring Gold IRA Kits for a Secure Retirement Investment\"",
    "description": "Explore the benefits of Gold IRA kits as a smart investment strategy to secure your retirement future, highlighting their rising popularity and advantages.",
    "locale": "en_US"
  },
  "150": {
    "url": "https://goatdealo.online/automotive/senior-car-insurance-what-you-need-to-know-en-us-5/?segment=rsoc.sc.goatdealoonline.001&headline=Senior+car+insurance+options&forceKeyA=State+Farm+Auto+Insurance+for+Seniors&forceKeyB=Senior+Car+Insurance+Near+Me&forceKeyC=Best+Car+Insurance+for+Seniors&forceKeyD=Cheapest+Car+Insurance+for+Seniors&forceKeyE=Cheapest+Auto+Insurance+Quote&forceKeyF=&fbid=872536505175912&fbland=PageView&fbserp=AddToCart&fbclick=InitiateCheckout&s1pplacement={{placement}}",
    "title": "Essential Guide to Senior Car Insurance Options",
    "description": "Explore essential insights on senior car insurance, covering options, affordability, and top providers tailored for older drivers.",
    "locale": "en_US"
  },
  "151": {
    "url": "https://goatdealo.online/health/does-medicare-cover-your-glucose-monitor-en-us-6/?segment=rsoc.sc.goatdealoonline.001&headline=learn+more+about+glucose+monitors&forceKeyA=Medicare+Glucose+Monitor+Coverage&forceKeyB=Diabetes+Monitors+Medicare+Coverage&forceKeyC=Blood+Sugar+Monitors+Covered+by+Medicare&forceKeyD=Continuous+Glucose+Monitors+Covered+by+Medicare&forceKeyE=Diabetes+Monitors+Covered+by+Medicare&forceKeyF=Diabetes+Monitors+with+Medicare+Coverage&fbid=872536505175912&fbland=PageView&fbserp=AddToCart&fbclick=InitiateCheckout&s1pplacement={{placement}}",
    "title": "Medicare Coverage for Glucose Monitors: What You Need to Know",
    "description": "Discover how Medicare covers glucose monitors, including options for diabetes management and continuous monitoring, to support your health needs.",
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
  "https://click-collector-583868590168.us-central1.run.app/collect",
  "https://www.everything-today.com/.netlify/functions/log-click"
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

// ?? S1 Postback URL Injection ??????????????????????????????
  // click_track_url: fires immediately on monetization (no revenue)
  const postbackBase = `https://${url.hostname}/api/s1-postback`;
  const clickTrackUrl = `${postbackBase}?click_id=${uid}&type=click`;
  dest.searchParams.set("click_track_url", clickTrackUrl);
  // rev_click_track_url: fires ~6hrs later with estimated revenue
  const revClickTrackUrl = `${postbackBase}?click_id=${uid}&type=revenue&revenue=ESTIMATED_CONVERSION_VALUE`;
  dest.searchParams.set("rev_click_track_url", revClickTrackUrl);
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
      dest: finalLocation
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