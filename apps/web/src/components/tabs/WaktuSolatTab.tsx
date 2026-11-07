"use client";

import React, { useEffect, useState, useRef } from "react";

interface ZoneItem {
  jakimCode: string;
  negeri: string;
  daerah: string;
}

interface PrayerDayData {
  date: string;
  fajr: string;
  syuruk: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
}

interface PrayerTimeSlot {
  name: string;
  timeStr: string;
  timeInMinutes: number;
}

export const WaktuSolatTab: React.FC = () => {
  const [zones, setZones] = useState<ZoneItem[]>([]);
  const [selectedZone, setSelectedZone] = useState<string>("SGR01"); // Default to SGR01
  const [prayerTimes, setPrayerTimes] = useState<PrayerDayData[]>([]);
  
  const [loadingZones, setLoadingZones] = useState<boolean>(true);
  const [loadingTimes, setLoadingTimes] = useState<boolean>(false);

  // Dropdown states
  const [zoneDropdownOpen, setZoneDropdownOpen] = useState<boolean>(false);
  const [zoneSearchQuery, setZoneSearchQuery] = useState<string>("");
  const zoneMenuRef = useRef<HTMLDivElement>(null);

  // Qibla Compass state
  const [qiblaHeading, setQiblaHeading] = useState<number | null>(null);
  const [locationStatus, setLocationStatus] = useState<string>("Tekan butang untuk cari arah kiblat GPS");

  // Live timer tick
  const [currentTimeMinutes, setCurrentTimeMinutes] = useState<number>(
    new Date().getHours() * 60 + new Date().getMinutes()
  );

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTimeMinutes(now.getHours() * 60 + now.getMinutes());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // Load saved zone from localStorage on mount (fallback to SGR01)
  useEffect(() => {
    const savedZone = localStorage.getItem("jakim_zone");
    if (savedZone) {
      setSelectedZone(savedZone);
    }
  }, []);

  // Close zone dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (zoneMenuRef.current && !zoneMenuRef.current.contains(event.target as Node)) {
        setZoneDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 1. Fetch Zones List from JAKIM wrapper API
  useEffect(() => {
    fetch("https://api.waktusolat.online/api/zones")
      .then((res) => res.json())
      .then((data) => {
        setZones(data || []);
        setLoadingZones(false);
      })
      .catch((err) => {
        console.error("Failed to load JAKIM zones:", err);
        setLoadingZones(false);
      });
  }, []);

  // 2. Fetch Prayer Times whenever selectedZone changes
  useEffect(() => {
    if (!selectedZone) return;

    setLoadingTimes(true);
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    fetch(`https://api.waktusolat.online/api/solat/${selectedZone}?month=${month}&year=${year}`)
      .then((res) => res.json())
      .then((data) => {
        setPrayerTimes(data.prayerTime || []);
        setLoadingTimes(false);
      })
      .catch((err) => {
        console.error("Failed to load prayer times:", err);
        setLoadingTimes(false);
      });

    localStorage.setItem("jakim_zone", selectedZone);
  }, [selectedZone]);

  // Filter zones for search input suggestions
  const filteredZones = zones.filter((z) => {
    const query = zoneSearchQuery.toLowerCase();
    return (
      z.jakimCode.toLowerCase().includes(query) ||
      z.negeri.toLowerCase().includes(query) ||
      z.daerah.toLowerCase().includes(query)
    );
  });

  // Calculate Qibla Bearing from user's current GPS coordinates
  const calculateQibla = () => {
    if (!navigator.geolocation) {
      setLocationStatus("Geolocation tidak disokong oleh pelayar anda.");
      return;
    }

    setLocationStatus("Mengesan lokasi GPS...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        const kaabaLat = 21.4225;
        const kaabaLng = 39.8262;

        const phi1 = (lat * Math.PI) / 180;
        const phi2 = (kaabaLat * Math.PI) / 180;
        const deltaLambda = ((kaabaLng - lng) * Math.PI) / 180;

        const y = Math.sin(deltaLambda) * Math.cos(phi2);
        const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);
        
        let bearing = (Math.atan2(y, x) * 180) / Math.PI;
        bearing = (bearing + 360) % 360;

        setQiblaHeading(Math.round(bearing * 10) / 10);
        setLocationStatus(`Lokasi berjaya dikesan (${lat.toFixed(2)}°, ${lng.toFixed(2)}°)`);
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setLocationStatus("Permintaan GPS dibatalkan atau ditolak.");
        } else {
          setLocationStatus("Gagal mendapatkan lokasi GPS.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Format API date (e.g. "01-Nov-2026") into full month name without dashes ("01 November 2026")
  const formatFullDate = (dateStr: string) => {
    if (!dateStr) return "";
    try {
      const parts = dateStr.split("-");
      if (parts.length !== 3) return dateStr;
      const day = parts[0];
      const monthAbbr = parts[1]?.toLowerCase();
      const year = parts[2];

      const monthMap: { [key: string]: string } = {
        jan: "January",
        feb: "February",
        mar: "March",
        apr: "April",
        may: "May",
        jun: "June",
        jul: "July",
        aug: "August",
        sep: "September",
        oct: "October",
        nov: "November",
        dec: "December",
      };

      const fullMonth = monthMap[monthAbbr || ""] || parts[1];
      return `${day} ${fullMonth} ${year}`;
    } catch {
      return dateStr;
    }
  };

  // Find today's prayer schedule matching API date format
  const getTodayFormattedApi = () => {
    const d = new Date();
    const day = String(d.getDate()).padStart(2, "0");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthStr = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day}-${monthStr}-${year}`;
  };

  const todayStrApi = getTodayFormattedApi();
  const todayPrayer = prayerTimes.find((p) => p.date.toLowerCase() === todayStrApi.toLowerCase()) || prayerTimes[0];

  const currentZoneObj = zones.find((z) => z.jakimCode === selectedZone);

  // Helper to normalize any time format into clean AM/PM and calculate minutes
  const formatToAmPm = (timeStr: string) => {
    if (!timeStr) return { display: "-", minutes: 0 };
    try {
      let hours = 0;
      let minutes = 0;

      if (timeStr.includes("AM") || timeStr.includes("PM")) {
        const parts = timeStr.split(" ");
        const tParts = (parts[0] || "0:0").split(":");
        hours = parseInt(tParts[0] || "0", 10);
        minutes = parseInt(tParts[1] || "0", 10);
        const modifier = parts[1];
        if (modifier === "PM" && hours < 12) hours += 12;
        if (modifier === "AM" && hours === 12) hours = 0;
      } else {
        const tParts = timeStr.split(":");
        hours = parseInt(tParts[0] || "0", 10);
        minutes = parseInt(tParts[1] || "0", 10);
      }

      const totalMins = hours * 60 + minutes;
      const ampm = hours >= 12 ? "PM" : "AM";
      let displayH = hours % 12;
      displayH = displayH ? displayH : 12;
      const formattedDisplay = `${String(displayH).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${ampm}`;

      return { display: formattedDisplay, minutes: totalMins };
    } catch {
      return { display: timeStr, minutes: 0 };
    }
  };

  // Estimate Imsak (-10 mins before Fajr)
  const getImsakTime = (fajrStr: string) => {
    const res = formatToAmPm(fajrStr);
    const imsakMins = res.minutes - 10;
    const h = Math.floor(imsakMins / 60);
    const m = imsakMins % 60;
    const ampm = h >= 12 ? "PM" : "AM";
    let displayH = h % 12;
    displayH = displayH ? displayH : 12;
    return {
      display: `${String(displayH).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ampm}`,
      minutes: imsakMins
    };
  };

  const imsakData = todayPrayer?.fajr ? getImsakTime(todayPrayer.fajr) : { display: "-", minutes: 0 };
  const subuhData = formatToAmPm(todayPrayer?.fajr || "");
  const syurukData = formatToAmPm(todayPrayer?.syuruk || "");
  const zohorData = formatToAmPm(todayPrayer?.dhuhr || "");
  const asrData = formatToAmPm(todayPrayer?.asr || "");
  const maghribData = formatToAmPm(todayPrayer?.maghrib || "");
  const ishaData = formatToAmPm(todayPrayer?.isha || "");

  const slots: PrayerTimeSlot[] = todayPrayer ? [
    { name: "Imsak", timeStr: imsakData.display, timeInMinutes: imsakData.minutes },
    { name: "Subuh", timeStr: subuhData.display, timeInMinutes: subuhData.minutes },
    { name: "Syuruk", timeStr: syurukData.display, timeInMinutes: syurukData.minutes },
    { name: "Zohor", timeStr: zohorData.display, timeInMinutes: zohorData.minutes },
    { name: "Asar", timeStr: asrData.display, timeInMinutes: asrData.minutes },
    { name: "Maghrib", timeStr: maghribData.display, timeInMinutes: maghribData.minutes },
    { name: "Isyak", timeStr: ishaData.display, timeInMinutes: ishaData.minutes },
  ] : [];

  // Determine active slot index
  let activeIndex = slots.findIndex((slot) => currentTimeMinutes < slot.timeInMinutes);
  if (activeIndex === -1 && slots.length > 0) activeIndex = 0;

  const activeSlot = slots[activeIndex];
  const diffMinutes = activeSlot ? activeSlot.timeInMinutes - currentTimeMinutes : 0;

  const formatCountdown = (diff: number) => {
    if (diff <= 0) return "Sedang berlangsung";
    const h = Math.floor(diff / 60);
    const m = diff % 60;
    if (h > 0) {
      return `${h} jam ${m} minit lagi`;
    }
    return `${m} minit lagi`;
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12 relative">
      {/* Header & Searchable Zone Selector Card */}
      <div className="p-6 rounded-2xl neu-flat space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Waktu Solat & Kiblat</h2>
          <span className="text-xs font-semibold px-3 py-1.5 rounded-xl neu-pressed text-emerald-600 dark:text-emerald-400">
            {currentZoneObj ? `${currentZoneObj.negeri} (${currentZoneObj.jakimCode})` : `Selangor (${selectedZone})`}
          </span>
        </div>

        {/* Searchable Zone Dropdown with Typing Suggestions */}
        <div className="space-y-1 relative" ref={zoneMenuRef}>
          <label className="text-xs font-semibold opacity-70">Pilih / Taip Zon atau Daerah</label>
          <button
            onClick={() => {
              setZoneDropdownOpen(!zoneDropdownOpen);
              setZoneSearchQuery("");
            }}
            disabled={loadingZones}
            className="w-full px-4 py-3 rounded-xl neu-pressed text-xs font-semibold flex items-center justify-between cursor-pointer disabled:opacity-50"
          >
            <span className="truncate pr-2 text-left">
              {currentZoneObj
                ? `${currentZoneObj.negeri} - ${currentZoneObj.daerah} (${currentZoneObj.jakimCode})`
                : loadingZones ? "Memuatkan zon..." : selectedZone}
            </span>
            <span className="text-xs opacity-75 shrink-0">▼</span>
          </button>

          {zoneDropdownOpen && (
            <div className="absolute left-0 right-0 mt-2 rounded-2xl neu-flat p-3 z-50 shadow-2xl bg-white dark:bg-[#1e1e24] space-y-2">
              <input
                type="text"
                placeholder="Taip untuk cari (cth: Selangor, Gombak)..."
                value={zoneSearchQuery}
                onChange={(e) => setZoneSearchQuery(e.target.value)}
                autoFocus
                className="w-full px-3 py-2.5 rounded-xl neu-pressed text-xs font-semibold bg-transparent outline-none"
              />

              <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
                {filteredZones.length > 0 ? (
                  filteredZones.map((z) => (
                    <button
                      key={z.jakimCode}
                      onClick={() => {
                        setSelectedZone(z.jakimCode);
                        setZoneDropdownOpen(false);
                        setZoneSearchQuery("");
                      }}
                      className={`w-full text-left px-3 py-2.5 text-xs rounded-xl transition-colors cursor-pointer flex flex-col gap-0.5 ${
                        selectedZone === z.jakimCode
                          ? "neu-pressed text-emerald-600 dark:text-emerald-400 font-bold"
                          : "hover:bg-black/5 dark:hover:bg-white/5 opacity-80"
                      }`}
                    >
                      <div className="flex justify-between font-bold">
                        <span>{z.negeri} - {z.daerah}</span>
                      </div>
                      <div className="opacity-75 text-[11px] truncate">Kod Zon: {z.jakimCode}</div>
                    </button>
                  ))
                ) : (
                  <div className="text-center py-4 text-xs opacity-50">
                    Tiada zon dijumpai
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Today's Highlighted Prayer Box */}
      {loadingTimes ? (
        <div className="p-8 rounded-2xl neu-pressed text-center text-sm opacity-75">
          Memuatkan waktu solat...
        </div>
      ) : todayPrayer ? (
        <div className="p-6 rounded-2xl neu-flat space-y-4">
          <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-3">
            <div>
              <h3 className="text-sm font-bold text-emerald-600 dark:text-emerald-400">Waktu Solat</h3>
              <p className="text-xs opacity-75">{formatFullDate(todayPrayer.date)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {slots.map((item, idx) => {
              const isCurrentActive = idx === activeIndex;

              return (
                <div 
                  key={idx} 
                  className={`p-3.5 rounded-xl flex flex-col items-center justify-center text-center space-y-1 transition-all ${
                    isCurrentActive ? "neu-pressed text-emerald-600 dark:text-emerald-400 shadow-inner scale-[0.98]" : "neu-flat opacity-85"
                  }`}
                >
                  <span className="text-xs font-semibold">{item.name}</span>
                  <span className="text-sm sm:text-base font-bold">
                    {item.timeStr}
                  </span>
                  {isCurrentActive && (
                    <span className="text-[10px] opacity-75 font-medium leading-tight">
                      {formatCountdown(diffMinutes)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Attribution Note */}
          <div className="pt-2 border-t border-black/5 dark:border-white/5 text-center">
            <p className="text-[11px] opacity-65 leading-relaxed">
              Sumber data rasmi diperolehi terus daripada portal e-Solat Jabatan Kemajuan Islam Malaysia (JAKIM).
            </p>
          </div>
        </div>
      ) : (
        <div className="p-6 rounded-2xl neu-pressed text-center text-xs opacity-75">
          Tiada data waktu solat dijumpai untuk zon ini.
        </div>
      )}

      {/* Qibla Compass Card */}
      <div className="p-6 rounded-2xl neu-flat space-y-4 text-center">
        <h3 className="text-sm font-bold text-left">Kompas Arah Kiblat</h3>
        <p className="text-xs opacity-75 text-left">{locationStatus}</p>

        <div className="flex flex-col items-center justify-center py-4">
          <div className="relative w-40 h-40 rounded-full neu-pressed flex items-center justify-center shadow-inner">
            <div 
              className="absolute w-full h-full flex items-center justify-center transition-transform duration-700 ease-out"
              style={{ transform: `rotate(${qiblaHeading !== null ? qiblaHeading : 0}deg)` }}
            >
              <div className="w-2 h-16 bg-emerald-600 dark:bg-emerald-400 rounded-full absolute top-3 shadow-md flex items-start justify-center pt-1">
                <span className="text-[9px] font-black text-white">Kaabah</span>
              </div>
            </div>
            <div className="w-3 h-3 bg-gray-500 rounded-full z-10"></div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="text-xs text-left">
            <span>Sudut Kiblat: </span>
            <strong className="text-emerald-600 dark:text-emerald-400 font-bold">
              {qiblaHeading !== null ? `${qiblaHeading}° dari Utara` : "Belum dihitung"}
            </strong>
          </div>
          <button
            onClick={calculateQibla}
            className="px-4 py-2.5 rounded-xl neu-flat text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:opacity-80 transition-opacity cursor-pointer"
          >
            Kira Arah Kiblat GPS
          </button>
        </div>
      </div>
    </div>
  );
};