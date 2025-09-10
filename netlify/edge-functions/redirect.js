export default async (request, context) => {
  // 0) Let Netlify Functions handle their own paths (don't intercept /log-click etc.)
  const reqUrl0 = new URL(request.url);
  if (reqUrl0.pathname.startsWith("/.netlify/functions/")) {
    return context.next();
  }

  // ===== V2 redirect with logging + click capture + Meta-crawler bypass =====

  const url = new URL(request.url);

  // 1) Redirect map (injected by your Sheet push)
  const redirectMap = {
  "100": "https://google.com",
  "101": "https://read.mdrntoday.com/careers/explore-lucrative-careers-in-power-washing-en-us-4/?segment=rsoc.sc.mdrntoday.001&headline=power+washing&forceKeyA=Pressure+Cleaning+Near+Me&forceKeyB=Pressure+Cleaning+Companies+Near+Me&forceKeyC=Pressure+Cleaning+Nearby&forceKeyD=Pressure+Washing+Companies+Near+{City}&forceKeyE=Pressure+Washing+Companies+{City}&forceKeyF=Pressure+Washing+Company+Nearby&fbid=1786225912279573&fbland=PageView&fbserp=AddToCart&fbclick=Purchase&utm_source=facebook",
  "102": "https://read.mdrntoday.com/health/explore-paid-dental-implant-trial-benefits-en-us-10/?segment=rsoc.sc.mdrntoday.001&headline=dental+implants+trial&forceKeyA=$1500+for+Dental+Implants+Participation&forceKeyB=Participate+in+Dental+Implants+Trial+sign+Up+Now&forceKeyC=No-fee+Dental+Implants&forceKeyD=Get+$1500+for+Dental+Implants+Participation&forceKeyE=$1950+for+Dental+Implants+Participation+search+Now&forceKeyF=Participate+in+Dental+Implants+Trial+Sign+Up+Now&fbid=1786225912279573&fbland=PageView&fbserp=AddToCart&fbclick=Purchase&utm_source=facebook",
  "103": "https://read.mdrntoday.com/finance/securing-your-future-the-benefits-of-including-gold-ira-kits-in-your-retirement-strategy-en-us-10/?segment=rsoc.sc.mdrntoday.001&headline=gold+ira&forceKeyA=Get+Free+Gold+IRA+Kit+With+$10k&forceKeyB=Gold+Ira+Kits+$0+Cost&forceKeyC=Gold+Ira+Kit+$0+Cost&forceKeyD=Free+Gold+IRA+Kit+U2013+No+Cost&forceKeyE=Free+Gold+Ira+Kits+U2013+no+Cost&forceKeyF=Get+a+Gold+Ira+Kit&fbid=1786225912279573&fbland=PageView&fbserp=AddToCart&fbclick=Purchase&utm_source=facebook",
  "104": "https://read.mdrntoday.com/finance/securing-your-future-the-benefits-of-including-gold-ira-kits-in-your-retirement-strategy-en-us-9/?segment=rsoc.sc.mdrntoday.001&headline=gold+ira&forceKeyA=Get+Free+Gold+IRA+Kit+With+$10k&forceKeyB=Gold+Ira+Kits+$0+Cost&forceKeyC=Gold+Ira+Kit+$0+Cost&forceKeyD=Free+Gold+IRA+Kit+U2013+No+Cost&forceKeyE=Free+Gold+Ira+Kits+U2013+no+Cost&forceKeyF=Get+a+Gold+Ira+Kit&fbid=1786225912279573&fbland=PageView&fbserp=AddToCart&fbclick=Purchase&utm_source=facebook",
  "105": "https://read.mdrntoday.com/automotive/2025-nissan-rogue-pricing-what-to-expect-and-how-it-stacks-up-en-us-5/?segment=rsoc.sc.mdrntoday.001&headline=nissan+rogue+suv&forceKeyA=For+Seniors:+2024+Rogue+Crossover+Suvs+Nearby+(rogue)+no+Cost&forceKeyB=100+Accepted+|+0+Down+Options+-+Rogue+2024+Crossover+Suvs+Nearby+(rogue)+no+Cost&forceKeyC=Nearby+Rogue+-+Zero+Down+100+Accepted+Suvs&forceKeyD=100+Accepted+|+2024+Rogue+Crossover+Suvs+Nearby+(rogue)+no+Cost+Payment&forceKeyE=100+Accepted+-+0+Down+Options+-+Rogue+Crossover+Suvs+Nearby+-+Rogue&forceKeyF=100+Accepted+|+0+Down+Dealerships+-+Leftover+Crossover+Suvs+Nearby+no+Cost+(rogue)&fbid=1786225912279573&fbland=PageView&fbserp=AddToCart&fbclick=Purchase&utm_source=facebook",
  "106": "https://read.mdrntoday.com/careers/explore-promising-careers-in-truck-driving-en-us/?segment=rsoc.sc.mdrntoday.001&headline=pickup+driver&forceKeyA=Independent+Work+as+Pickup+Driver&forceKeyB=Highest+Paying+Pickup+Truck+Driver+Jobs&forceKeyC=Small+Truck+Driver+Jobs&forceKeyD=Driver+Hiring&forceKeyE=Hiring+Drivers+Now&forceKeyF=Van+Driving+Jobs+Near+Me+Full+Time&fbid=1786225912279573&fbland=PageView&fbserp=AddToCart&fbclick=Purchase&utm_source=facebook",
  "107": "https://read.mdrntoday.com/automotive/2025-nissan-rogue-pricing-what-to-expect-and-how-it-stacks-up-en-us-3/?segment=rsoc.sc.mdrntoday.001&headline=nissan+rogue+suv&forceKeyA=For+Seniors:+2024+Rogue+Crossover+Suvs+Nearby+(rogue)+no+Cost&forceKeyB=100+Accepted+|+0+Down+Options+-+Rogue+2024+Crossover+Suvs+Nearby+(rogue)+no+Cost&forceKeyC=Nearby+Rogue+-+Zero+Down+100+Accepted+Suvs&forceKeyD=100+Accepted+|+2024+Rogue+Crossover+Suvs+Nearby+(rogue)+no+Cost+Payment&forceKeyE=100+Accepted+-+0+Down+Options+-+Rogue+Crossover+Suvs+Nearby+-+Rogue&forceKeyF=100+Accepted+|+0+Down+Dealerships+-+Leftover+Crossover+Suvs+Nearby+no+Cost+(rogue)&fbid=1786225912279573&fbland=PageView&fbserp=AddToCart&fbclick=Purchase&utm_source=facebook",
  "108": "https://read.mdrntoday.com/health/explore-paid-dental-implant-trial-benefits-en-us-9/?segment=rsoc.sc.mdrntoday.001&headline=dental+implants+trial&forceKeyA=$1500+for+Dental+Implants+Participation&forceKeyB=Participate+in+Dental+Implants+Trial+sign+Up+Now&forceKeyC=No-fee+Dental+Implants&forceKeyD=Get+$1500+for+Dental+Implants+Participation&forceKeyE=$1950+for+Dental+Implants+Participation+search+Now&forceKeyF=Participate+in+Dental+Implants+Trial+Sign+Up+Now&fbid=1786225912279573&fbland=PageView&fbserp=AddToCart&fbclick=Purchase&utm_source=facebook",
  "109": "https://mdrnlocal.com/careers/promising-careers-in-pressure-washing-es-us/?segment=rsoc.sc.mdrnlocal.001&headline=power+washing&forceKeyA=pressure+cleaning+near+me&forceKeyB=pressure+cleaning+companies+near+me&forceKeyC=100%+accepted+pressure+washing+options+in+{State}&forceKeyD=pressure+washing+companies+near+me&forceKeyE=pressure+washing+near+me&forceKeyF=pressure+cleaning+near+me&fbid=1786225912279573&fbland=PageView&fbserp=AddToCart&fbclick=Purchase&utm_source=facebook",
  "110": "https://read.mdrntoday.com/education/choosing-online-schools-that-provide-computers-en-us-5/?segment=rsoc.sc.mdrntoday.001&headline=online+high+school+with+laptop&forceKeyA=Apply+for+Online+School+High+School+that+Gives+You+a+Computer+Now&forceKeyB=Apply+for+Online+School+High+School+that+Give+You+a+Computer+Now&forceKeyC=Apply+for+Online+School+High+School+that+Gives+You+a+Computer&forceKeyD=Apply+for+Online+School+High+Schools+that+Give+You+a+Computer&forceKeyE=Apply+for+Online+School+High+School+that+Give+You+a+Computer&forceKeyF=Apply+for+Online+School+High+Schools+that+Gives+You+a+Computer&fbid=1786225912279573&fbland=PageView&fbserp=AddToCart&fbclick=Purchase&utm_source=facebook",
  "111": "https://read.mdrntoday.com/education/choosing-online-schools-that-provide-computers-en-us-6/?segment=rsoc.sc.mdrntoday.001&headline=online+high+school+with+laptop&forceKeyA=Apply+for+Online+School+High+School+that+Gives+You+a+Computer+Now&forceKeyB=Apply+for+Online+School+High+School+that+Give+You+a+Computer+Now&forceKeyC=Apply+for+Online+School+High+School+that+Gives+You+a+Computer&forceKeyD=Apply+for+Online+School+High+Schools+that+Give+You+a+Computer&forceKeyE=Apply+for+Online+School+High+School+that+Give+You+a+Computer&forceKeyF=Apply+for+Online+School+High+Schools+that+Gives+You+a+Computer&fbid=1786225912279573&fbland=PageView&fbserp=AddToCart&fbclick=Purchase&utm_source=facebook",
  "112": "https://mdrnlocal.com/careers/explore-lucrative-careers-in-power-washing-en-us-4/?segment=rsoc.sc.mdrnlocal.001&headline=power+washing&forceKeyA=Pressure+Cleaning+Near+Me&forceKeyB=Pressure+Cleaning+Companies+Near+Me&forceKeyC=Pressure+Cleaning+Nearby&forceKeyD=Pressure+Washing+Companies+Near+{City}&forceKeyE=Pressure+Washing+Companies+{City}&forceKeyF=Pressure+Washing+Company+Nearby&fbid=1786225912279573&fbland=PageView&fbserp=AddToCart&fbclick=Purchase&utm_source=facebook",
  "113": "https://mdrnlocal.com/health/explore-paid-dental-implant-trial-benefits-en-us-6/?segment=rsoc.sc.mdrnlocal.001&headline=dental+implants+trial&forceKeyA=$1500+for+Dental+Implants+Participation&forceKeyB=Participate+in+Dental+Implants+Trial+sign+Up+Now&forceKeyC=No-fee+Dental+Implants&forceKeyD=Get+$1500+for+Dental+Implants+Participation&forceKeyE=$1950+for+Dental+Implants+Participation+search+Now&forceKeyF=Participate+in+Dental+Implants+Trial+Sign+Up+Now&fbid=1786225912279573&fbland=PageView&fbserp=AddToCart&fbclick=Purchase&utm_source=facebook",
  "114": "https://mdrnlocal.com/finance/securing-your-future-the-benefits-of-including-gold-ira-kits-in-your-retirement-strategy-en-us-9/?segment=rsoc.sc.mdrnlocal.001&headline=gold+ira&forceKeyA=Get+Free+Gold+IRA+Kit+With+$10k&forceKeyB=Gold+Ira+Kits+$0+Cost&forceKeyC=Gold+Ira+Kit+$0+Cost&forceKeyD=Free+Gold+IRA+Kit+U2013+No+Cost&forceKeyE=Free+Gold+Ira+Kits+U2013+no+Cost&forceKeyF=Get+a+Gold+Ira+Kit&fbid=1786225912279573&fbland=PageView&fbserp=AddToCart&fbclick=Purchase&utm_source=facebook",
  "115": "https://mdrnlocal.com/finance/securing-your-future-the-benefits-of-including-gold-ira-kits-in-your-retirement-strategy-en-us-7/?segment=rsoc.sc.mdrnlocal.001&headline=gold+ira&forceKeyA=Get+Free+Gold+IRA+Kit+With+$10k&forceKeyB=Gold+Ira+Kits+$0+Cost&forceKeyC=Gold+Ira+Kit+$0+Cost&forceKeyD=Free+Gold+IRA+Kit+U2013+No+Cost&forceKeyE=Free+Gold+Ira+Kits+U2013+no+Cost&forceKeyF=Get+a+Gold+Ira+Kit&fbid=1786225912279573&fbland=PageView&fbserp=AddToCart&fbclick=Purchase&utm_source=facebook",
  "116": "https://mdrnlocal.com/automotive/2025-nissan-rogue-pricing-what-to-expect-and-how-it-stacks-up-en-us-4/?segment=rsoc.sc.mdrnlocal.001&headline=nissan+rogue+suv&forceKeyA=For+Seniors:+2024+Rogue+Crossover+Suvs+Nearby+(rogue)+no+Cost&forceKeyB=100+Accepted+|+0+Down+Options+-+Rogue+2024+Crossover+Suvs+Nearby+(rogue)+no+Cost&forceKeyC=Nearby+Rogue+-+Zero+Down+100+Accepted+Suvs&forceKeyD=100+Accepted+|+2024+Rogue+Crossover+Suvs+Nearby+(rogue)+no+Cost+Payment&forceKeyE=100+Accepted+-+0+Down+Options+-+Rogue+Crossover+Suvs+Nearby+-+Rogue&forceKeyF=100+Accepted+|+0+Down+Dealerships+-+Leftover+Crossover+Suvs+Nearby+no+Cost+(rogue)&fbid=1786225912279573&fbland=PageView&fbserp=AddToCart&fbclick=Purchase&utm_source=facebook",
  "117": "https://mdrnlocal.com/careers/explore-promising-careers-in-truck-driving-en-us/?segment=rsoc.sc.mdrnlocal.001&headline=pickup+driver&forceKeyA=Independent+Work+as+Pickup+Driver&forceKeyB=Highest+Paying+Pickup+Truck+Driver+Jobs&forceKeyC=Small+Truck+Driver+Jobs&forceKeyD=Driver+Hiring&forceKeyE=Hiring+Drivers+Now&forceKeyF=Van+Driving+Jobs+Near+Me+Full+Time&fbid=1786225912279573&fbland=PageView&fbserp=AddToCart&fbclick=Purchase&utm_source=facebook",
  "118": "https://mdrnlocal.com/automotive/2025-nissan-rogue-pricing-what-to-expect-and-how-it-stacks-up-en-us-6/?segment=rsoc.sc.mdrnlocal.001&headline=nissan+rogue+suv&forceKeyA=For+Seniors:+2024+Rogue+Crossover+Suvs+Nearby+(rogue)+no+Cost&forceKeyB=100+Accepted+|+0+Down+Options+-+Rogue+2024+Crossover+Suvs+Nearby+(rogue)+no+Cost&forceKeyC=Nearby+Rogue+-+Zero+Down+100+Accepted+Suvs&forceKeyD=100+Accepted+|+2024+Rogue+Crossover+Suvs+Nearby+(rogue)+no+Cost+Payment&forceKeyE=100+Accepted+-+0+Down+Options+-+Rogue+Crossover+Suvs+Nearby+-+Rogue&forceKeyF=100+Accepted+|+0+Down+Dealerships+-+Leftover+Crossover+Suvs+Nearby+no+Cost+(rogue)&fbid=1786225912279573&fbland=PageView&fbserp=AddToCart&fbclick=Purchase&utm_source=facebook",
  "119": "https://mdrnlocal.com/health/explore-paid-dental-implant-trial-benefits-en-us-3/?segment=rsoc.sc.mdrnlocal.001&headline=dental+implants+trial&forceKeyA=$1500+for+Dental+Implants+Participation&forceKeyB=Participate+in+Dental+Implants+Trial+sign+Up+Now&forceKeyC=No-fee+Dental+Implants&forceKeyD=Get+$1500+for+Dental+Implants+Participation&forceKeyE=$1950+for+Dental+Implants+Participation+search+Now&forceKeyF=Participate+in+Dental+Implants+Trial+Sign+Up+Now&fbid=1786225912279573&fbland=PageView&fbserp=AddToCart&fbclick=Purchase&utm_source=facebook",
  "120": "https://mdrnlocal.com/careers/promising-careers-in-pressure-washing-es-us/?segment=rsoc.sc.mdrnlocal.001&headline=power+washing&forceKeyA=pressure+cleaning+near+me&forceKeyB=pressure+cleaning+companies+near+me&forceKeyC=100%+accepted+pressure+washing+options+in+{State}&forceKeyD=pressure+washing+companies+near+me&forceKeyE=pressure+washing+near+me&forceKeyF=pressure+cleaning+near+me&fbid=1786225912279573&fbland=PageView&fbserp=AddToCart&fbclick=Purchase&utm_source=facebook",
  "121": "https://mdrnlocal.com/education/choosing-online-schools-that-provide-computers-en-us-3/?segment=rsoc.sc.mdrnlocal.001&headline=online+high+school+with+laptop&forceKeyA=Apply+for+Online+School+High+School+that+Gives+You+a+Computer+Now&forceKeyB=Apply+for+Online+School+High+School+that+Give+You+a+Computer+Now&forceKeyC=Apply+for+Online+School+High+School+that+Gives+You+a+Computer&forceKeyD=Apply+for+Online+School+High+Schools+that+Give+You+a+Computer&forceKeyE=Apply+for+Online+School+High+School+that+Give+You+a+Computer&forceKeyF=Apply+for+Online+School+High+Schools+that+Gives+You+a+Computer&fbid=1786225912279573&fbland=PageView&fbserp=AddToCart&fbclick=Purchase&utm_source=facebook",
  "122": "https://mdrnlocal.com/education/choosing-online-schools-that-provide-computers-en-us-2/?segment=rsoc.sc.mdrnlocal.001&headline=online+high+school+with+laptop&forceKeyA=Apply+for+Online+School+High+School+that+Gives+You+a+Computer+Now&forceKeyB=Apply+for+Online+School+High+School+that+Give+You+a+Computer+Now&forceKeyC=Apply+for+Online+School+High+School+that+Gives+You+a+Computer&forceKeyD=Apply+for+Online+School+High+Schools+that+Give+You+a+Computer&forceKeyE=Apply+for+Online+School+High+School+that+Give+You+a+Computer&forceKeyF=Apply+for+Online+School+High+Schools+that+Gives+You+a+Computer&fbid=1786225912279573&fbland=PageView&fbserp=AddToCart&fbclick=Purchase&utm_source=facebook",
  "1010": "https://read.mdrntoday.com/health/how-participating-in-dental-implant-trials-can-save-you-money-and-improve-your-smile-en-us-2/?segment=rsoc.sc.mdrntoday.001&headline=dental+implants+trial&forceKeyA=Participate+in+Dental+Implants+Trial+Search+Now&forceKeyB=Participate+in+Dental+Implants+Trial&forceKeyC=Participate+in+Dental+Implants+Trials&forceKeyD=Dental+Implant+Clinical+Trials+Near+Me&forceKeyE=Participate+in+Dental+Implants+Trials+search+Now&forceKeyF=Participate+in+Dental+Implants+Trial+Search+Now&fbid=1786225912279573&&utm_source=facebook&fbland=PageView&fbserp=AddToCart&fbclick=Purchase",
  "1022": "https://10toptips.com/finance/securing-your-future-the-benefits-of-including-gold-ira-kits-in-your-retirement-strategy-en-us-5/?segment=rsoc.sc.10toptips.001&headline=gold+ira&forceKeyA=Get+Free+Gold+IRA+Kit+With+$10k&forceKeyB=Gold+Ira+Kits+$0+Cost&forceKeyC=Gold+Ira+Kit+$0+Cost&forceKeyD=Free+Gold+IRA+Kit+U2013+No+Cost&forceKeyE=Free+Gold+Ira+Kits+U2013+no+Cost&forceKeyF=Get+a+Gold+Ira+Kit&fbid=1786225912279573&&utm_source=facebook&fbland=PageView&fbserp=AddToCart&fbclick=Purchase",
  "1025": "https://10toptips.com/health/how-to-navigate-medicare-coverage-for-mobility-scooters-en-us-3/?segment=rsoc.sc.10toptips.001&headline=medicare+mobility+scooters&forceKeyA=medicare+health+insurance+quote+with+100+mobility+scooter+coverage&forceKeyB=get+a+mobility+scooter+from+medicare&forceKeyC=applying+for+medicare-covered+mobility+scooters+asap+-+100+coverage&forceKeyD=applying+for+medicare-covered+mobility+scooters+right+now&forceKeyE=applying+for+medicare-covered+mobility+scooters+fast+near+me+for+seniors&forceKeyF=applying+for+medicare-covered+mobility+scooters+(100+coverage)&fbid=1786225912279573&&utm_source=facebook&fbland=PageView&fbserp=AddToCart&fbclick=Purchase",
  "1110": "https://read.mdrntoday.com/health/what-benefits-do-clinical-trials-of-dental-implants-offer-es-us/?segment=rsoc.sc.mdrntoday.001&headline=Ms+informacin+sobre+los+ensayos+dentales&forceKeyA=$1500+for+Dental+Implants+Participation&forceKeyB=$1950+for+Dental+Implants+Participation+search+Now&forceKeyC=Participate+in+Dental+Implants+Trial+Sign+Up+Now&forceKeyD=Participate+in+Dental+Implants+Trial+sign+Up+Now&forceKeyE=Participate+in+Dental+Implants+Trial+Apply+Now&forceKeyF=Free+Dental+Implants+Clinical+Trials&fbid=1786225912279573&fbland=PageView&fbserp=AddToCart&utm_source=facebook&fbclick=Purchase",
  "1128": "https://10toptips.com/careers/why-consider-a-career-in-plumbing-es-us/?segment=rsoc.sc.10toptips.001&headline=Explore+Plumbing+Jobs&forceKeyA=Plumbing+Companies+in+My+Area&forceKeyB=Plumbing+Contractors+in+My+Area&forceKeyC=Plumbing+Jobs+in+my+area&forceKeyD=plumbing+service+near+me&forceKeyE=plumbing+companies+in+{City}&forceKeyF=Plumbers+hiring+in+my+area&fbid=1786225912279573&fbland=PageView&fbserp=AddToCart&utm_source=facebook&fbclick=Purchase",
  "1141": "https://search-ace.com/automotive/2025-nissan-rogue-pricing-what-to-expect-and-how-it-stacks-up-en-us-2/?segment=rsoc.sc.searchace.001&headline=nissan+rogue+suv&forceKeyA=For+Seniors:+2024+Rogue+Crossover+Suvs+Nearby+(rogue)+no+Cost&forceKeyB=100+Accepted+|+0+Down+Options+-+Rogue+2024+Crossover+Suvs+Nearby+(rogue)+no+Cost&forceKeyC=Nearby+Rogue+-+Zero+Down+100+Accepted+Suvs&forceKeyD=100+Accepted+|+2024+Rogue+Crossover+Suvs+Nearby+(rogue)+no+Cost+Payment&forceKeyE=100+Accepted+-+0+Down+Options+-+Rogue+Crossover+Suvs+Nearby+-+Rogue&forceKeyF=100+Accepted+|+0+Down+Dealerships+-+Leftover+Crossover+Suvs+Nearby+no+Cost+(rogue)&fbid=1786225912279573&fbland=PageView&fbserp=AddToCart&utm_source=facebook&fbclick=Purchase",
  "1143": "https://search-ace.com/health/botox-pricing-explained-what-you-need-to-know-before-you-pay-en-us-4/?segment=rsoc.sc.searchace.001&headline=botox+deals+and+pricing&forceKeyA=Get+$119+Botox+Doctor+Near+Me+Full+Botox&forceKeyB=Get+$149+Botox+Doctor+Near+Me+Full+Botox&forceKeyC=Botox+for+Forehead+Wrinkles+Near+Me+-+$149+Full+Botox&forceKeyD=$119+Botox+Doctor+Near+Me+Full+Botox&forceKeyE=Get+$119+Botox+Doctor+Near+{State}+Full+Botox&forceKeyF=See+$119+Botox+Doctor+Near+Me+Full+Botox&fbid=1786225912279573&fbland=PageView&fbserp=AddToCart&utm_source=facebook&fbclick=Purchase",
  "1146": "https://mdrnlocal.com/careers/opportunities-in-pharmaceutical-packaging-es-us/?segment=rsoc.sc.mdrnlocal.001&headline=Empaque+Farmac%c3%a9utico+en+Miami&forceKeyA=Pharmaceutical+Packaging+Companies+in+{City}&forceKeyB=Capsule+Pharmaceutical+Packaging+in+{City}&forceKeyC=Pharmaceutical+Packaging+in+{City}&forceKeyD=Pharmaceutical+Packaging+Company+in+{City}&forceKeyE=Packaging+Company+Near+Me+in+{City}&forceKeyF=Packing+Companies+Nearby+in+{City}&fbid=1786225912279573&fbland=PageView&fbserp=AddToCart&utm_source=facebook&fbclick=Purchase",
  "1153": "https://mdrnlocal.com/automotive/2025-nissan-rogue-pricing-what-to-expect-and-how-it-stacks-up-en-us-2/?segment=rsoc.sc.mdrnlocal.001&headline=nissan+rogue+suv&forceKeyA=For+Seniors:+2024+Rogue+Crossover+Suvs+Nearby+(rogue)+no+Cost&forceKeyB=100+Accepted+|+0+Down+Options+-+Rogue+2024+Crossover+Suvs+Nearby+(rogue)+no+Cost&forceKeyC=Nearby+Rogue+-+Zero+Down+100+Accepted+Suvs&forceKeyD=100+Accepted+|+2024+Rogue+Crossover+Suvs+Nearby+(rogue)+no+Cost+Payment&forceKeyE=100+Accepted+-+0+Down+Options+-+Rogue+Crossover+Suvs+Nearby+-+Rogue&forceKeyF=100+Accepted+|+0+Down+Dealerships+-+Leftover+Crossover+Suvs+Nearby+no+Cost+(rogue)&fbid=1786225912279573&fbland=PageView&fbserp=AddToCart&utm_source=facebook&fbclick=Purchase",
  "1154": "https://mdrnlocal.com/finance/securing-your-future-the-benefits-of-including-gold-ira-kits-in-your-retirement-strategy-en-us-6/?segment=rsoc.sc.mdrnlocal.001&headline=gold+ira&forceKeyA=Get+Free+Gold+IRA+Kit+With+$10k&forceKeyB=Gold+Ira+Kits+$0+Cost&forceKeyC=Gold+Ira+Kit+$0+Cost&forceKeyD=Free+Gold+IRA+Kit+U2013+No+Cost&forceKeyE=Free+Gold+Ira+Kits+U2013+no+Cost&forceKeyF=Get+a+Gold+Ira+Kit&fbid=1786225912279573&fbland=PageView&fbserp=AddToCart&utm_source=facebook&fbclick=Purchase",
  "1165": "https://read.mdrntoday.com/automotive/2025-nissan-rogue-pricing-what-to-expect-and-how-it-stacks-up-en-us-2/?segment=rsoc.sc.mdrntoday.001&headline=nissan+rogue+suv&forceKeyA=For+Seniors:+2024+Rogue+Crossover+Suvs+Nearby+(rogue)+no+Cost&forceKeyB=100+Accepted+|+0+Down+Options+-+Rogue+2024+Crossover+Suvs+Nearby+(rogue)+no+Cost&forceKeyC=Nearby+Rogue+-+Zero+Down+100+Accepted+Suvs&forceKeyD=100+Accepted+|+2024+Rogue+Crossover+Suvs+Nearby+(rogue)+no+Cost+Payment&forceKeyE=100+Accepted+-+0+Down+Options+-+Rogue+Crossover+Suvs+Nearby+-+Rogue&forceKeyF=100+Accepted+|+0+Down+Dealerships+-+Leftover+Crossover+Suvs+Nearby+no+Cost+(rogue)&fbid=1786225912279573&fbland=PageView&fbserp=AddToCart&utm_source=facebook&fbclick=Purchase"
};

  // 2) Config
  const FALLBACK_URL = "https://www.msn.com";
  const COLLECT_URL  = "https://script.google.com/macros/s/AKfycbwSQ-lPe5_A1c8mZ4DinBmK33xsvOdvdvLFD3fWdFI9oVDQ98IdKEv04ALvutxdK7iu/exec";

  // 3) Helpers
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
    const ts = Math.floor(Date.now()/1000);
    return `fb.1.${ts}.${fbclid}`;
  }
  function makeFbp() {
    const ts = Math.floor(Date.now()/1000);
    const rand = Math.random().toString(36).slice(2);
    return `fb.1.${ts}.${rand}`;
  }
  function uuidv4() {
    return crypto.randomUUID
      ? crypto.randomUUID()
      : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
          const r = (Math.random()*16)|0, v = c==="x" ? r : (r&0x3)|0x8;
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
    if (extraHeaders) for (const [k,v] of extraHeaders.entries()) h.append(k, v);
    return new Response(null, { status: 302, headers: h });
  }

  // 4) Early bypass for Meta crawlers (no logging, no cookies, no s1padid, no params)
  const uaHead = request.headers.get("user-agent") || "";

  // 5) Resolve base destination
  const id   = url.searchParams.get("id");
  const base = id ? redirectMap[id] : null;

  const ua    = uaHead;
  const inApp = isFbIgInApp(ua);

  const rawS1  = url.searchParams.get("s1pcid") || "";
  const s1pcid = rawS1.length > 64 ? rawS1.slice(0,64) + "?" : rawS1;
  const s1ok   = isValidS1pcid(rawS1);

  if (!base) {
    console.log("Redirect", { id, inApp, s1pcid, s1ok, reason: "unknown id", dest: "https://google.com" });
    return redirectResponse("https://google.com");
  }

  // 6) Build destination: drop ONLY these params, preserve everything else (except id)
  const DROP = new Set(["utm_medium","utm_id","utm_content","utm_term","utm_campaign","iab","id"]);
  const dest = new URL(base);
  url.searchParams.forEach((value, key) => {
    if (!DROP.has(key)) dest.searchParams.set(key, value);
  });

  // 7) Click capture
  const now = Math.floor(Date.now()/1000);
  const uid = uuidv4();

  // ALWAYS add s1padid={uid}
  dest.searchParams.set("s1padid", uid);

  // If s1pcid invalid, strip it from outgoing URL
  if (!s1ok) dest.searchParams.delete("s1pcid");

  // Cookies in
  const rawCookie = request.headers.get("cookie") || "";
  const cookieMap = Object.fromEntries(
    rawCookie.split(/;\s*/).filter(Boolean).map(c => {
      const i = c.indexOf("="); return i === -1 ? [c, ""] : [c.slice(0, i), decodeURIComponent(c.slice(i + 1))];
    })
  );
  const fbclid = url.searchParams.get("fbclid") || null;
  let fbc = cookieMap._fbc || makeFbcFromFbclid(fbclid);
  let fbp = cookieMap._fbp || makeFbp();

  // Best-effort client IP
  const ipHeader =
    request.headers.get("x-forwarded-for") ||
    request.headers.get("x-real-ip") ||
    request.headers.get("x-nf-client-connection-ip") || "";
  const client_ip = ipHeader.split(",")[0].trim();

  // 8) Decide final location AFTER all mutations (so logged dest is exact)
  const isFallback    = (!inApp && !s1ok);
  const finalLocation = isFallback ? FALLBACK_URL : dest.href;

  // 9) Fire-and-forget POST to collector (includes client_ip)
  try {
    fetch(COLLECT_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        uid, fbclid, fbc, fbp, id,
        s1pcid: rawS1 || null,
        inApp,
        client_ip,
        event_time: now,
        event_source_url: request.url,
        ua,
        dest: finalLocation
      })
    }).catch(() => {});
  } catch {}

  // 10) Set cookies and log
  const cookieHeaders = new Headers();
  appendCookie(cookieHeaders, "_fbc", fbc);
  appendCookie(cookieHeaders, "_fbp", fbp);
  appendCookie(cookieHeaders, "uid", uid);

  if (isFallback) {
    console.log("Redirect", { id, inApp, s1pcid, s1ok, reason: "fallback msn (non-in-app invalid s1pcid)", dest: finalLocation });
  } else {
    console.log("Redirect", { id, inApp, s1pcid, s1ok, reason: "pass", dest: finalLocation });
  }

  // 11) Redirect
  return redirectResponse(finalLocation, cookieHeaders);
};