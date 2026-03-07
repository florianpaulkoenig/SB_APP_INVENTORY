// ---------------------------------------------------------------------------
// Static geocoding lookup for major art market locations
// Avoids external API calls — covers ~80 countries + key cities
// ---------------------------------------------------------------------------

interface Coords {
  lat: number;
  lng: number;
}

const COUNTRY_COORDS: Record<string, Coords> = {
  Switzerland: { lat: 46.8182, lng: 8.2275 },
  Germany: { lat: 51.1657, lng: 10.4515 },
  Austria: { lat: 47.5162, lng: 14.5501 },
  France: { lat: 46.6034, lng: 1.8883 },
  Italy: { lat: 41.8719, lng: 12.5674 },
  Spain: { lat: 40.4637, lng: -3.7492 },
  'United Kingdom': { lat: 51.5074, lng: -0.1278 },
  UK: { lat: 51.5074, lng: -0.1278 },
  'United States': { lat: 39.8283, lng: -98.5795 },
  USA: { lat: 39.8283, lng: -98.5795 },
  US: { lat: 39.8283, lng: -98.5795 },
  Netherlands: { lat: 52.1326, lng: 5.2913 },
  Belgium: { lat: 50.8503, lng: 4.3517 },
  Luxembourg: { lat: 49.8153, lng: 6.1296 },
  Denmark: { lat: 56.2639, lng: 9.5018 },
  Sweden: { lat: 60.1282, lng: 18.6435 },
  Norway: { lat: 60.472, lng: 8.4689 },
  Finland: { lat: 61.9241, lng: 25.7482 },
  Portugal: { lat: 39.3999, lng: -8.2245 },
  Greece: { lat: 39.0742, lng: 21.8243 },
  Poland: { lat: 51.9194, lng: 19.1451 },
  'Czech Republic': { lat: 49.8175, lng: 15.473 },
  Hungary: { lat: 47.1625, lng: 19.5033 },
  Romania: { lat: 45.9432, lng: 24.9668 },
  Ireland: { lat: 53.1424, lng: -7.6921 },
  China: { lat: 35.8617, lng: 104.1954 },
  Japan: { lat: 36.2048, lng: 138.2529 },
  'South Korea': { lat: 35.9078, lng: 127.7669 },
  'Hong Kong': { lat: 22.3193, lng: 114.1694 },
  Singapore: { lat: 1.3521, lng: 103.8198 },
  Taiwan: { lat: 23.6978, lng: 120.9605 },
  India: { lat: 20.5937, lng: 78.9629 },
  'United Arab Emirates': { lat: 23.4241, lng: 53.8478 },
  UAE: { lat: 23.4241, lng: 53.8478 },
  Qatar: { lat: 25.3548, lng: 51.1839 },
  'Saudi Arabia': { lat: 23.8859, lng: 45.0792 },
  Israel: { lat: 31.0461, lng: 34.8516 },
  Turkey: { lat: 38.9637, lng: 35.2433 },
  Russia: { lat: 61.524, lng: 105.3188 },
  Canada: { lat: 56.1304, lng: -106.3468 },
  Mexico: { lat: 23.6345, lng: -102.5528 },
  Brazil: { lat: -14.235, lng: -51.9253 },
  Argentina: { lat: -38.4161, lng: -63.6167 },
  Colombia: { lat: 4.5709, lng: -74.2973 },
  Australia: { lat: -25.2744, lng: 133.7751 },
  'New Zealand': { lat: -40.9006, lng: 174.886 },
  'South Africa': { lat: -30.5595, lng: 22.9375 },
  Nigeria: { lat: 9.082, lng: 8.6753 },
  Egypt: { lat: 26.8206, lng: 30.8025 },
  Morocco: { lat: 31.7917, lng: -7.0926 },
  Monaco: { lat: 43.7384, lng: 7.4246 },
  Liechtenstein: { lat: 47.166, lng: 9.5554 },
  Croatia: { lat: 45.1, lng: 15.2 },
  Thailand: { lat: 15.87, lng: 100.9925 },
  Indonesia: { lat: -0.7893, lng: 113.9213 },
  Philippines: { lat: 12.8797, lng: 121.774 },
  Malaysia: { lat: 4.2105, lng: 101.9758 },
  Vietnam: { lat: 14.0583, lng: 108.2772 },
  Chile: { lat: -35.6751, lng: -71.543 },
  Peru: { lat: -9.19, lng: -75.0152 },
  Lebanon: { lat: 33.8547, lng: 35.8623 },
  Kuwait: { lat: 29.3117, lng: 47.4818 },
  Bahrain: { lat: 26.0667, lng: 50.5577 },
};

const CITY_COORDS: Record<string, Coords> = {
  // Switzerland
  Zurich: { lat: 47.3769, lng: 8.5417 },
  Basel: { lat: 47.5596, lng: 7.5886 },
  Geneva: { lat: 46.2044, lng: 6.1432 },
  Bern: { lat: 46.948, lng: 7.4474 },
  Lucerne: { lat: 47.0502, lng: 8.3093 },
  // Germany
  Berlin: { lat: 52.52, lng: 13.405 },
  Munich: { lat: 48.1351, lng: 11.582 },
  Hamburg: { lat: 53.5511, lng: 9.9937 },
  Frankfurt: { lat: 50.1109, lng: 8.6821 },
  Cologne: { lat: 50.9375, lng: 6.9603 },
  Düsseldorf: { lat: 51.2277, lng: 6.7735 },
  // France
  Paris: { lat: 48.8566, lng: 2.3522 },
  Lyon: { lat: 45.764, lng: 4.8357 },
  Nice: { lat: 43.7102, lng: 7.262 },
  Marseille: { lat: 43.2965, lng: 5.3698 },
  // UK
  London: { lat: 51.5074, lng: -0.1278 },
  Edinburgh: { lat: 55.9533, lng: -3.1883 },
  Manchester: { lat: 53.4808, lng: -2.2426 },
  // USA
  'New York': { lat: 40.7128, lng: -74.006 },
  'Los Angeles': { lat: 34.0522, lng: -118.2437 },
  Chicago: { lat: 41.8781, lng: -87.6298 },
  Miami: { lat: 25.7617, lng: -80.1918 },
  'San Francisco': { lat: 37.7749, lng: -122.4194 },
  Houston: { lat: 29.7604, lng: -95.3698 },
  Dallas: { lat: 32.7767, lng: -96.797 },
  // Italy
  Milan: { lat: 45.4642, lng: 9.19 },
  Rome: { lat: 41.9028, lng: 12.4964 },
  Venice: { lat: 45.4408, lng: 12.3155 },
  Florence: { lat: 43.7696, lng: 11.2558 },
  Turin: { lat: 45.0703, lng: 7.6869 },
  // Spain
  Madrid: { lat: 40.4168, lng: -3.7038 },
  Barcelona: { lat: 41.3851, lng: 2.1734 },
  // Austria
  Vienna: { lat: 48.2082, lng: 16.3738 },
  Salzburg: { lat: 47.8095, lng: 13.055 },
  // Netherlands
  Amsterdam: { lat: 52.3676, lng: 4.9041 },
  Rotterdam: { lat: 51.9244, lng: 4.4777 },
  // Belgium
  Brussels: { lat: 50.8503, lng: 4.3517 },
  Antwerp: { lat: 51.2194, lng: 4.4025 },
  // Asia
  Tokyo: { lat: 35.6762, lng: 139.6503 },
  Beijing: { lat: 39.9042, lng: 116.4074 },
  Shanghai: { lat: 31.2304, lng: 121.4737 },
  Seoul: { lat: 37.5665, lng: 126.978 },
  'Hong Kong': { lat: 22.3193, lng: 114.1694 },
  Singapore: { lat: 1.3521, lng: 103.8198 },
  Mumbai: { lat: 19.076, lng: 72.8777 },
  Dubai: { lat: 25.2048, lng: 55.2708 },
  'Abu Dhabi': { lat: 24.4539, lng: 54.3773 },
  Doha: { lat: 25.2854, lng: 51.531 },
  Istanbul: { lat: 41.0082, lng: 28.9784 },
  'Tel Aviv': { lat: 32.0853, lng: 34.7818 },
  Taipei: { lat: 25.033, lng: 121.5654 },
  // Americas
  Toronto: { lat: 43.6532, lng: -79.3832 },
  'Mexico City': { lat: 19.4326, lng: -99.1332 },
  'São Paulo': { lat: -23.5505, lng: -46.6333 },
  'Buenos Aires': { lat: -34.6037, lng: -58.3816 },
  'Rio de Janeiro': { lat: -22.9068, lng: -43.1729 },
  Bogota: { lat: 4.711, lng: -74.0721 },
  Lima: { lat: -12.0464, lng: -77.0428 },
  Santiago: { lat: -33.4489, lng: -70.6693 },
  // Oceania
  Sydney: { lat: -33.8688, lng: 151.2093 },
  Melbourne: { lat: -37.8136, lng: 144.9631 },
  // Other key art cities
  Copenhagen: { lat: 55.6761, lng: 12.5683 },
  Stockholm: { lat: 59.3293, lng: 18.0686 },
  Oslo: { lat: 59.9139, lng: 10.7522 },
  Helsinki: { lat: 60.1699, lng: 24.9384 },
  Lisbon: { lat: 38.7223, lng: -9.1393 },
  Prague: { lat: 50.0755, lng: 14.4378 },
  Budapest: { lat: 47.4979, lng: 19.0402 },
  Warsaw: { lat: 52.2297, lng: 21.0122 },
  Athens: { lat: 37.9838, lng: 23.7275 },
  Moscow: { lat: 55.7558, lng: 37.6173 },
  'St. Petersburg': { lat: 59.9343, lng: 30.3351 },
  Monaco: { lat: 43.7384, lng: 7.4246 },
  'Cape Town': { lat: -33.9249, lng: 18.4241 },
  Johannesburg: { lat: -26.2041, lng: 28.0473 },
  Lagos: { lat: 6.5244, lng: 3.3792 },
  Marrakech: { lat: 31.6295, lng: -7.9811 },
  Beirut: { lat: 33.8938, lng: 35.5018 },
  Bangkok: { lat: 13.7563, lng: 100.5018 },
};

/**
 * Get coordinates for a city/country combination.
 * Tries city first (more precise), falls back to country.
 */
export function getCoordinates(
  city?: string | null,
  country?: string | null,
): Coords | null {
  if (city) {
    const c = CITY_COORDS[city];
    if (c) return c;
  }
  if (country) {
    const c = COUNTRY_COORDS[country];
    if (c) return c;
  }
  return null;
}
