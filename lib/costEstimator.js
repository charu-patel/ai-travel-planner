import axios from "axios";

const options = {
  method: 'GET',
  url: 'https://hotels-com-provider.p.rapidapi.com/v1/hotels/search',
  params: {
    query: 'Delhi',
    checkin_date: '2026-05-10',
    checkout_date: '2026-05-12',
    adults_number: '2',
    room_number: '1',
    locale: 'en_US',
    currency: 'INR'
  },
  headers: {
    'X-RapidAPI-Key': process.env.RAPID_API_KEY,
    'X-RapidAPI-Host': 'hotels-com-provider.p.rapidapi.com'
  }
};
axios.request(options)
  .then(res => console.log(res.data))
  .catch(err => console.error(err.response?.data || err));

const COST_OF_LIVING_INDEX = {
  gurugram: 29.8,
  gurgaon: 24.3, // covering variations
  nellore: 27.6,
  guwahati: 26.9,
  ludhiana: 26.6,
  jodhpur: 26.5,
  jalandhar: 26.4,
  thane: 26.4,
  gandhinagar: 26.3,
  rajkot: 26.3,
  bengaluru: 26.2,
  bangalore: 26.2,
  "navi mumbai": 26.1,
  agartala: 26.0,
  goa: 26.0,
  panaji: 24.5,
  faridabad: 25.8,
  amritsar: 25.7,
  chennai: 25.7,
  ghaziabad: 25.6,
  mumbai: 25.4,
  jhansi: 25.3,
  jammu: 25.2,
  jamnagar: 25.1,
  dibrugarh: 25.0,
  ernakulam: 25.0,
  kalyan: 24.9,
  tumakuru: 24.8,
  nagpur: 24.5,
  patna: 24.3,
  tirupati: 24.2,
  meerut: 24.1,
  ranchi: 24.1
};

const INDIA_BASELINE_AVG = 22.0;

export function estimateTripCost(days, budget, distance, travelAdvice, hotels, people, destination, purpose) {
  const totalDays = parseInt(days) || 3;
  const totalPeople = parseInt(people) || 1;
  const budgetTier = (budget || "medium").toLowerCase();
  const cityInput = (destination || "").toLowerCase().trim();
  const travelPurpose = (purpose || "leisure").toLowerCase();

  // 2. 🔍 SCAN AND NORMALIZE THE LCI WEIGHT
  let rawIndex = INDIA_BASELINE_AVG; // Default fallback to average if not found
  
  // Find matching city key from our dataset lookup
  const matchedCity = Object.keys(COST_OF_LIVING_INDEX).find(key => cityInput.includes(key));
  if (matchedCity) {
    rawIndex = COST_OF_LIVING_INDEX[matchedCity];
  }

  // Normalize weight relative to baseline average (e.g., 26.2 / 22 = 1.19x weight multiplier)
  const livingCostIndexWeight = rawIndex / INDIA_BASELINE_AVG;

  // 3. 🏕️ APPLY TRIPS PURPOSE MULTIPLIERS
  let purposeStayMultiplier = 1.0;
  let purposeActivityBuffer = 1.0;

  if (travelPurpose.includes("history") || travelPurpose.includes("heritage")) {
    purposeStayMultiplier = 1.25; 
    purposeActivityBuffer = 1.4; 
  } else if (travelPurpose.includes("nature") || travelPurpose.includes("adventure")) {
    purposeStayMultiplier = 1.0; 
    purposeActivityBuffer = 1.15;
  } else if (travelPurpose.includes("religious") || travelPurpose.includes("spiritual")) {
    purposeStayMultiplier = 0.9;
    purposeActivityBuffer = 0.75;
  }

  // 4. BASE PER-DAY MATRIX VALUES
  let hotelRatePerNight = 2500;
  let foodRatePerDay = 800;
  let localTransitPerDay = 400;

  if (budgetTier === "low") {
    hotelRatePerNight = 1400;
    foodRatePerDay = 500;
    localTransitPerDay = 250;
  } else if (budgetTier === "high") {
    hotelRatePerNight = 8000; 
    foodRatePerDay = 2000;
    localTransitPerDay = 900;
   
  }

  // 5. MATH ENGINE COMPUTATION
  // Accommodation applies the dataset-derived LCI and purpose weights!
 const adjustedHotelRate = hotelRatePerNight * livingCostIndexWeight * purposeStayMultiplier;
  const roomsNeeded = Math.ceil(totalPeople / 2);
  const stayCost = adjustedHotelRate * (totalDays - 1) * roomsNeeded;

  const foodCost = foodRatePerDay * totalDays * totalPeople;
  const localTransport = localTransitPerDay * totalDays * totalPeople * purposeActivityBuffer;
  const validDistance = parseFloat(distance) || 2000; // Fallback if distance is missing
  let interCityTransitBase = 0;

  if (budgetTier === "low") {
    // Sleeper Class logic (~₹0.5 per km, minimum ₹200 baseline)
    interCityTransitBase = Math.max(1000, validDistance * 1.5);
  } else if (budgetTier === "medium") {
    // 3rd AC Class logic (~₹1.25 per km, minimum ₹600 baseline)
    interCityTransitBase = Math.max(2000, validDistance * 3);
  } else {
    // 2nd AC / Luxury Flight logic (~₹2.5 per km or direct premier flat)
    interCityTransitBase = Math.max(4000, validDistance * 5);
  }

  // Multiply by total travelers
  const travelCost = interCityTransitBase * totalPeople;

  const total = travelCost + stayCost + foodCost + localTransport;

  return {
    total: Math.round(total),
    travelCost: Math.round(travelCost),
    stayCost: Math.round(stayCost),
    foodCost: Math.round(foodCost),
    localTransport: Math.round(localTransport),
    adjustedHotelRate: Math.round(adjustedHotelRate)
  };
}