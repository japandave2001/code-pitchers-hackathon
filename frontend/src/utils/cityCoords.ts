export const cityCoords: Record<string, [number, number]> = {
  mumbai: [19.0760, 72.8777], delhi: [28.6139, 77.2090],
  bangalore: [12.9716, 77.5946], chennai: [13.0827, 80.2707],
  pune: [18.5204, 73.8567], hyderabad: [17.3850, 78.4867],
  kolkata: [22.5726, 88.3639], 'new delhi': [28.6139, 77.2090],
  noida: [28.5355, 77.3910], gurgaon: [28.4595, 77.0266],
  jaipur: [26.9124, 75.7873], lucknow: [26.8467, 80.9462],
  ahmedabad: [23.0225, 72.5714], indore: [22.7196, 75.8577],
  patna: [25.5941, 85.1376], guwahati: [26.1445, 91.7362],
  shimla: [31.1048, 77.1734], gangtok: [27.3389, 88.6065],
  vizag: [17.6868, 83.2185], kochi: [9.9312, 76.2673],
  surat: [21.1702, 72.8311], varanasi: [25.3176, 82.9739],
  tirupur: [11.1085, 77.3411], panipat: [29.3909, 76.9635],
  'navi mumbai': [19.0330, 73.0297],
  nashik: [19.9975, 73.7898], aurangabad: [19.8762, 75.3433],
  mysore: [12.2958, 76.6394], hubli: [15.3647, 75.1240],
  coimbatore: [11.0168, 76.9558], agra: [27.1767, 78.0081],
}

const CENTER_OF_INDIA: [number, number] = [20.5937, 78.9629]

export function getCoords(city: string | null | undefined): [number, number] {
  if (!city) return CENTER_OF_INDIA
  const key = Object.keys(cityCoords).find((k) => city.toLowerCase().includes(k))
  return key ? cityCoords[key] : CENTER_OF_INDIA
}
