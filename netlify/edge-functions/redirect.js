export default async (request, context) => {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  const fbclid = url.searchParams.get("fbclid");

  // Require fbclid only ? block everything else
  if (!fbclid) {
    return Response.redirect("https://yahoo.com", 302);
  }

  const redirectMap = {
  "100": "https://google.com",
  "263": "https://read.investingfuel.com/shopping/nissan-rogue-suv-deals-where-to-get-the-most-savings-en-us-2/?segment=rsoc.sd.investingfuel.001&headline=Nissan+Rogue+2025+SUV&forceKeyA=100+Accepted+|+2024s+Rogue+Crossover+Suvs+Nearby+(rogue)+(no+Cost)&forceKeyB=100+Accepted+|+$150/month+-+Rogue+2024+Crossover+Suvs+Nearby+no+Cost&forceKeyC=$100/month+-+Rogue+2024+Crossover+Suvs+Nearby&forceKeyD=100+Accepted+|+0+Down+Options+-+Rogue+2024+Crossover+Suvs+Nearby+(rogue)+(no+Cost)&forceKeyE=For+Seniors:+2024+Rogue+Crossover+Suvs+Nearby+(rogue)+no+Cost&forceKeyF=100+Accepted+|+2024s+Rogue+Crossover+Suvs+Nearby+(no+Cost)&fbid=1154354255815807&fbclick=Purchase&utm_source=facebook",
  "283": "https://10toptips.com/careers/exploring-jobs-in-landscaping-benefits-and-roles-es-us/?segment=rsoc.sc.10toptips.001&headline=Learn+Landscaping+in+Your+City&forceKeyA=landscaping+companies+in+{city}&forceKeyB=landscaping+companies+near+me&forceKeyC=landscaping+company+hiring+now+in+{city}&forceKeyD=landscaping+contractors+needed+near+me&forceKeyE=lawn+maintenance+services+near+me&forceKeyF=landscaping+contractors+in+{city}&fbid=3184190241890375&fbclick=Purchase&utm_source=facebook",
  "345": "https://read.investingfuel.com/health/how-dental-implant-trials-advance-patient-care-en-us-7/?segment=rsoc.sd.investingfuel.001&headline=Dental+Implant+Trials+And+Benefits&forceKeyA=$1500+for+Dental+Implants+Trial+Participation&forceKeyB=Participate+in+Dental+Implants+Trial+search+Now&forceKeyC=Participate+in+Dental+Implants+Trial&forceKeyD=$1500+for+Dental+Implants+Participation&forceKeyE=Participate+in+Dental+Implants+Trial+sign+Up+Now&forceKeyF=Participate+in+Dental+Implants+Trial+apply+Now&fbid=1154354255815807&fbclick=Purchase&utm_source=facebook",
  "438": "https://read.investingfuel.com/health/join-belly-fat-removal-trials-for-perks-en-us-2/?segment=rsoc.sd.investingfuel.001&headline=Belly+Fat+Removal+Clinical+Trials&forceKeyA=$1500+for+Tummy+Tuck+Participation+{state}&forceKeyB=$1500+for+Non-invasive+Fat+Reduction+Research+{state}&forceKeyC=$1500+for+Cryolipolysis+Belly+Fat+Reduction+Study+{state}&forceKeyD=$1500+for+Non-surgical+Liposuction+Clinical+Trial+{state}&forceKeyE=$1500+for+Belly+Fat+Removal+Without+Surgery+Participation+{state}&forceKeyF=$1500+for+Tummy+Tuck+Participations+{state}&fbid=1154354255815807&fbclick=Purchase&utm_source=facebook",
  "626": "https://read.investingfuel.com/health/compensation-and-care-in-neuropathy-trials-en-us/?segment=rsoc.sd.investingfuel.001&headline=Join%20Neuropathy%20Trials%20for%20Perks&forceKeyA=Peripheral+Neuropathy+Treatment+Centers+Near+Me&forceKeyB=Neuropathy+Clinical+Trials+in+{State}&forceKeyC=Neuropathy+Treatment+Trials&forceKeyD=Doctors+who+Specialize+in+Peripheral+Neuropathy+Near+Me&forceKeyE=Paid+Clinical+Trials+for+Neuropathy+{State}&forceKeyF=Peripheral+Neuropathy+Paid+Research+{State}&fbid=1154354255815807&fbclick=Purchase&utm_source=facebook",
  "656": "https://read.investingfuel.com/real-estate/senior-apartments-a-perfect-blend-of-independence-and-community-for-older-adults-en-us-2/?segment=rsoc.sd.investingfuel.001&headline=55+and+older+apartments&forceKeyA=55+and+older+apartments+near+me&forceKeyB=55+and+older+apartment+near+me&forceKeyC=see+55+and+older+apartments+near+me&forceKeyD=find+55+and+older+apartments+near+me&forceKeyE=see+55+and+older+apartment+near+me&forceKeyF=55+and+older+apartments+near+{city}&fbid=1154354255815807&fbclick=Purchase&utm_source=facebook",
  "672": "https://read.investingfuel.com/careers/oportunidades-en-el-empaque-farmaceutico-en-us-3/?segment=rsoc.sd.investingfuel.001&headline=Empaque+Farmac%c3%a9utico+en+{City}&forceKeyA=Pharmaceutical+Packaging+Companies+in+{City}&forceKeyB=Capsule+Pharmaceutical+Packaging+in+{City}&forceKeyC=Pharmaceutical+Packaging+in+{City}&forceKeyD=Pharmaceutical+Packaging+Company+in+{City}&forceKeyE=Packaging+Company+Near+Me+in+{City}&forceKeyF=Packing+Companies+Nearby+in+{City}&fbid=3184190241890375&fbclick=Purchase&utm_source=facebook",
  "682": "https://read.mdrntoday.com/health/how-to-earn-money-by-donating-eggs-en-us-3/?segment=rsoc.sc.mdrntoday.001&headline=Learn+How+Egg+Donation+Works&forceKeyA=donor+egg+for+ivf+in+{City}&forceKeyB=egg+donor+clinic+{State}&forceKeyC=paid+egg+donors+wanted+in+{City}&forceKeyD=best+egg+donor+banks+in+{City}&forceKeyE=get+paid+to+donate+eggs+near+me&forceKeyF=egg+donor+compensation+{State}+2025&fbid=1154354255815807&fbclick=Purchase&utm_source=facebook",
  "690": "https://mdrnlocal.com/health/tips-for-securing-medicare-coverage-for-mobility-scooters-en-us-2/?segment=rsoc.sc.mdrnlocal.001&headline=medicare+mobility+scooters&forceKeyA=medicare+health+insurance+quote+with+100+mobility+scooter+coverage&forceKeyB=get+a+mobility+scooter+from+medicare&forceKeyC=applying+for+medicare-covered+mobility+scooters+asap+-+100+coverage&forceKeyD=applying+for+medicare-covered+mobility+scooters+right+now&forceKeyE=applying+for+medicare-covered+mobility+scooters+fast+near+me+for+seniors&forceKeyF=applying+for+medicare-covered+mobility+scooters+(100+coverage)&fbid=1154354255815807&fbclick=Purchase&utm_source=facebook",
  "752": "https://10toptips.com/health/how-to-earn-money-by-donating-eggs-en-us-4/?segment=rsoc.sc.10toptips.001&headline=Learn+How+Egg+Donation+Works&forceKeyA=donor+egg+for+ivf+in+{City}&forceKeyB=egg+donor+clinic+{State}&forceKeyC=paid+egg+donors+wanted+in+{City}&forceKeyD=best+egg+donor+banks+in+{City}&forceKeyE=get+paid+to+donate+eggs+near+me&forceKeyF=egg+donor+compensation+{State}+2025&fbid=1154354255815807&fbclick=Purchase&utm_source=facebook"
};

  const baseUrl = redirectMap[id];

  if (!id || !baseUrl) {
    return new Response(null, {
      status: 302,
      headers: {
        Location: "https://google.com"
      }
    });
  }

  const redirectUrl = new URL(baseUrl);

  url.searchParams.forEach((value, key) => {
    if (key !== "id") {
      redirectUrl.searchParams.set(key, value);
    }
  });

  return new Response(null, {
    status: 302,
    headers: {
      Location: redirectUrl.href
    }
  });
};