import React, { useState, useEffect, useMemo, useRef } from 'react';

// Components
import SustainabilityGaugeAdvanced from './fisheries/SustainabilityGaugeAdvanced';
import RiskHeatmap from './fisheries/RiskHeatmap';
import RiskDriversPanel from './fisheries/RiskDriversPanel';
import SmartAlertsPanel from './fisheries/SmartAlertsPanel';
import SpeciesTable from './fisheries/SpeciesTable';
import LoadingSpinner from './LoadingSpinner';
import RecommendedActions from './fisheries/RecommendedActions';
import TopBar from './fisheries/TopBar';
import KPIStrip from './fisheries/KPIStrip';
import useMultiBuoyData from '../hooks/useMultiBuoyData';

export default function FisheriesIntelligence() {
  const fisheriesRef = useRef(null);

  // MULTI-BUOY UPGRADE (Phase 4)
  const { getRegionalSummary } = useMultiBuoyData();

  // Base State
  const [rawSpecies, setRawSpecies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeRegion, setActiveRegion] = useState('All Regions');

  // Simulation & Alert State (STEP 3)
  const [isSimulating, setIsSimulating] = useState(false);
  const [sstScenario, setSstScenario] = useState('normal'); // 'normal', 'low', 'high'
  const [showAlertSettings, setShowAlertSettings] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Thresholds
  const [critThreshold, setCritThreshold] = useState(50);
  const [highThreshold, setHighThreshold] = useState(65);
  const [msyAlertThreshold, setMsyAlertThreshold] = useState(90);
  const [collapseAlertThreshold, setCollapseAlertThreshold] = useState(75);

  // Notifications
  const [notifyInApp, setNotifyInApp] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState(false);
  const [notifySMS, setNotifySMS] = useState(false);

  // Initial Data Fetch
  useEffect(() => {
    const fetchCSV = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/fisheries');
        if (!response.ok) {
          throw new Error('API route not found');
        }
        const jsonData = await response.json();

        if (jsonData && jsonData.species) {
          setRawSpecies(jsonData.species);
        } else {
          throw new Error('Malformed API structure');
        }
        setLoading(false);
      } catch (err) {
        // Try alternate local path
        try {
          Papa.parse('/data/fisheries_indian_region_2023.csv', {
            download: true,
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            complete: (results) => {
              setRawSpecies(results.data);
              setLoading(false);
            },
            error: (e) => {
              setError('Failed to load CSV: ' + e.message);
              setLoading(false);
            }
          });
        } catch (e) {
          setError('Failed to fetch data');
          setLoading(false);
        }
      }
    };
    fetchCSV();
  }, []);

  // Extract dynamic regions and their counts from raw data for the TopBar
  const regionalData = useMemo(() => {
    if (!rawSpecies.length) return { regions: ['All Regions'], counts: {} };
    const r = new Set(rawSpecies.map(s => s.region).filter(Boolean));
    const regions = ['All Regions', ...Array.from(r)];
    const counts = {};

    // Count unique species overall for 'All Regions'
    const uniqueAll = Array.from(new Map(rawSpecies.map(sp => [sp.species, sp])).values());
    counts['All Regions'] = uniqueAll.length;

    // Count species per region
    r.forEach(regionName => {
      counts[regionName] = rawSpecies.filter(s => s.region === regionName).length;
    });

    return { regions, counts };
  }, [rawSpecies]);

  const dynamicRegions = regionalData.regions;
  const regionCounts = regionalData.counts;

  // Ensure activeRegion is valid if data reloads
  useEffect(() => {
    if (rawSpecies.length > 0 && activeRegion !== 'All Regions' && !dynamicRegions.includes(activeRegion)) {
      setActiveRegion('All Regions');
    }
  }, [dynamicRegions, activeRegion, rawSpecies]);

  // Base Filtered Species (by Region)
  const baseSpecies = useMemo(() => {
    if (activeRegion === 'All Regions') {
      return Array.from(new Map(rawSpecies.map(sp => [sp.species, sp])).values());
    }
    return rawSpecies.filter(s => s.region === activeRegion);
  }, [rawSpecies, activeRegion]);

  // DISPLAY SPECIES (STEP 3) - Computed from simulation + SST state
  const displaySpecies = useMemo(() => {
    let data = [...baseSpecies];

    if (isSimulating) {
      data = data.map(sp => {
        const newCatch = Math.round(sp.current_catch_tonnes * 0.90);
        const newMSY = Math.round((newCatch / sp.msy_tonnes) * 100);
        const healthBoost = sp.stock_health_percent < critThreshold
          ? sp.stock_health_percent * 1.12
          : sp.stock_health_percent * 1.05;
        return {
          ...sp,
          current_catch_tonnes: newCatch,
          stock_health_percent: Math.min(100, Math.round(healthBoost)),
          simulatedMSY: newMSY
        };
      });
    }

    if (sstScenario === 'low') {
      const warmWater = ['Yellowfin Tuna', 'Bigeye Tuna', 'Bluefin Tuna', 'Skipjack Tuna', 'Sailfish', 'Swordfish', 'Mahi Mahi'];
      const coralDep = ['Coral Trout', 'Parrotfish', 'Snapper', 'Grouper', 'Sea Bass'];
      data = data.map(sp => ({
        ...sp,
        stock_health_percent: Math.min(100, Math.max(0,
          warmWater.includes(sp.species)
            ? sp.stock_health_percent + 3
            : coralDep.includes(sp.species)
              ? sp.stock_health_percent - 5
              : sp.stock_health_percent
        ))
      }));
    }

    if (sstScenario === 'high') {
      const warmWater = ['Yellowfin Tuna', 'Bigeye Tuna', 'Bluefin Tuna', 'Skipjack Tuna', 'Sailfish', 'Swordfish', 'Mahi Mahi'];
      const coralDep = ['Coral Trout', 'Parrotfish', 'Snapper', 'Grouper', 'Sea Bass'];
      data = data.map(sp => ({
        ...sp,
        stock_health_percent: Math.min(100, Math.max(0,
          warmWater.includes(sp.species)
            ? sp.stock_health_percent - 4
            : coralDep.includes(sp.species)
              ? sp.stock_health_percent - 8
              : sp.stock_health_percent - 2
        )),
        current_catch_tonnes: warmWater.includes(sp.species)
          ? Math.round(sp.current_catch_tonnes * 1.03)
          : sp.current_catch_tonnes
      }));
    }

    // Sort ascending by health for rendering consistency
    return data.sort((a, b) => a.stock_health_percent - b.stock_health_percent);
  }, [baseSpecies, isSimulating, sstScenario, critThreshold]);

  // COMPUTED VALUES (STEP 2)
  const msyUtilization = (sp) => {
    // If simulated, use simulatedMSY if it exists, otherwise compute
    if (sp.simulatedMSY !== undefined) return sp.simulatedMSY;
    return Math.round((sp.current_catch_tonnes / sp.msy_tonnes) * 100) || 0;
  };

  const sustainabilityIndex = useMemo(() => {
    if (!displaySpecies.length) return 0;
    return Math.round(
      displaySpecies.reduce((s, sp) => s + sp.stock_health_percent, 0) / displaySpecies.length
    );
  }, [displaySpecies]);

  const collapseRisk = useMemo(() => {
    if (!displaySpecies.length) return 0;
    return Math.round(
      (displaySpecies.filter(sp =>
        sp.stock_health_percent < critThreshold || msyUtilization(sp) > 95
      ).length / displaySpecies.length) * 100
    );
  }, [displaySpecies, critThreshold]);

  const atRiskCount = useMemo(() => {
    return displaySpecies.filter(sp =>
      sp.stock_health_percent < highThreshold || sp.trend === 'Declining' || sp.trend === 'Critical'
    ).length;
  }, [displaySpecies, highThreshold]);

  const criticalCount = useMemo(() => {
    return displaySpecies.filter(sp =>
      sp.stock_health_percent < critThreshold || sp.trend === 'Critical'
    ).length;
  }, [displaySpecies, critThreshold]);

  const sixMonthProjection = useMemo(() => {
    return Math.max(0, sustainabilityIndex - 2);
  }, [sustainabilityIndex]);

  const totalAlerts = useMemo(() => {
    return displaySpecies.filter(sp =>
      sp.stock_health_percent < collapseAlertThreshold || msyUtilization(sp) > msyAlertThreshold - 10 // generic buffer
    ).length;
  }, [displaySpecies, collapseAlertThreshold, msyAlertThreshold]);

  // Handle Export
  const handleExportPDF = () => {
    setIsExporting(true);
    setTimeout(() => setIsExporting(false), 2000);
  };

  if (loading) return <LoadingSpinner message="Parsing Fishery Telemetry..." />;
  if (error) {
    return (
      <div className="bg-[#0a1628] rounded-xl p-12 text-center flex flex-col items-center border border-slate-800">
        <h2 className="text-red-400 font-bold mb-2">Data Engine Failure</h2>
        <p className="text-slate-400">{error}</p>
      </div>
    );
  }
  if (!displaySpecies.length) return null;

  // Simulation Stats
  const originalTotal = baseSpecies.reduce((s, sp) => s + sp.current_catch_tonnes, 0);
  const simulatedTotal = displaySpecies.reduce((s, sp) => s + sp.current_catch_tonnes, 0);
  const improvingCount = displaySpecies.filter((sp, i) => {
    // Find original species by ID assuming ID matches
    const orig = baseSpecies.find(b => b.id === sp.id);
    return orig && sp.stock_health_percent > orig.stock_health_percent;
  }).length;

  const affectedCount = baseSpecies.length; // Simplified for high SST

  // MULTI-BUOY UPGRADE (Phase 4)
  const buoySummary = getRegionalSummary();
  const regionalAvgSST = buoySummary?.avgSST || 28;
  const regionalMaxSST = buoySummary?.hottestBuoy?.sst || 29;

  const currentRegionalSST = sstScenario === 'high' ? regionalMaxSST + 1 : sstScenario === 'low' ? regionalAvgSST - 0.5 : regionalAvgSST;

  return (
    <div
      ref={fisheriesRef}
      className="flex flex-col animate-in fade-in duration-700 bg-[#060f1e] text-slate-200 p-4 lg:p-6"
      style={{ minHeight: '100vh', margin: '-2rem -2.5rem', padding: '2rem 2.5rem' }}
    >
      <style dangerouslySetInnerHTML={{ __html: `@keyframes zpulse { 0%,100%{opacity:1; transform:scale(1)} 50%{opacity:.4; transform:scale(1.4)} }` }} />

      {/* STEP 5: TOP BAR */}
      <TopBar
        activeRegion={activeRegion}
        setActiveRegion={setActiveRegion}
        regions={dynamicRegions}
        regionCounts={regionCounts}
        isSimulating={isSimulating}
        setIsSimulating={setIsSimulating}
        sstScenario={sstScenario}
        setSstScenario={setSstScenario}
        showAlertSettings={showAlertSettings}
        setShowAlertSettings={setShowAlertSettings}
        isExporting={isExporting}
        handleExportPDF={handleExportPDF}
      />

      {/* STEP 6: CONDITIONAL BANNERS */}
      {isSimulating && (
        <div className="bg-cyan-950 border border-cyan-800 rounded-lg px-4 py-2 mb-3 flex items-center justify-between">
          <span className="text-xs text-cyan-400">
            SIMULATION ACTIVE — 10% fishing reduction applied. Total catch: {originalTotal.toLocaleString()}t → {simulatedTotal.toLocaleString()}t ({improvingCount} species recovering)
          </span>
          <button
            onClick={() => setIsSimulating(false)}
            className="bg-cyan-900 border border-cyan-700 text-cyan-300 text-xs px-3 py-1 rounded-lg hover:bg-cyan-800 transition-colors cursor-pointer"
          >
            Exit Simulation
          </button>
        </div>
      )}

      {sstScenario === 'low' && (
        <div className="bg-blue-950 border border-blue-800 text-blue-400 rounded-lg px-4 py-2 mb-3 text-xs leading-relaxed">
          <strong>SST SCENARIO: {currentRegionalSST.toFixed(1)}°C (Regional Avg).</strong> Coral species under thermal stress. Warm-water species slightly benefited.
        </div>
      )}

      {sstScenario === 'high' && (
        <div className="bg-red-950 border border-red-800 text-red-400 rounded-lg px-4 py-2 mb-3 text-xs leading-relaxed">
          <strong>SST SCENARIO: {currentRegionalSST.toFixed(1)}°C (Regional Max + 1°C).</strong> Thermal stress detected across {affectedCount} species. Coral bleaching risk elevated.
        </div>
      )}

      {showAlertSettings && (
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 mb-4 relative animate-in slide-in-from-top-4 duration-300">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-semibold text-white">Alert Settings</h3>
            <button onClick={() => setShowAlertSettings(false)} className="text-slate-500 hover:text-white cursor-pointer px-2">✕</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Section A */}
            <div>
              <div className="text-xs text-slate-500 uppercase tracking-wider mb-4 border-b border-slate-800 pb-2">Alert Thresholds</div>

              <div className="mb-4">
                <div className="text-xs text-slate-300 flex justify-between mb-1">
                  <span>Critical health threshold</span>
                  <span className="font-bold text-cyan-400">{critThreshold}%</span>
                </div>
                <input type="range" min="10" max="60" step="1" value={critThreshold} onChange={(e) => setCritThreshold(Number(e.target.value))} className="w-full accent-cyan-400" />
                <div className="text-xs text-slate-600 mt-1">Species below {critThreshold}% trigger CRITICAL</div>
              </div>

              <div className="mb-4">
                <div className="text-xs text-slate-300 flex justify-between mb-1">
                  <span>High risk threshold</span>
                  <span className="font-bold text-cyan-400">{highThreshold}%</span>
                </div>
                <input type="range" min="50" max="80" step="1" value={highThreshold} onChange={(e) => setHighThreshold(Number(e.target.value))} className="w-full accent-cyan-400" />
                <div className="text-xs text-slate-600 mt-1">Species below {highThreshold}% trigger HIGH</div>
              </div>

              <div className="mb-4">
                <div className="text-xs text-slate-300 flex justify-between mb-1">
                  <span>MSY warning level</span>
                  <span className="font-bold text-cyan-400">{msyAlertThreshold}%</span>
                </div>
                <input type="range" min="70" max="99" step="1" value={msyAlertThreshold} onChange={(e) => setMsyAlertThreshold(Number(e.target.value))} className="w-full accent-cyan-400" />
                <div className="text-xs text-slate-600 mt-1">MSY above {msyAlertThreshold}% triggers warning</div>
              </div>

              <div className="mb-4">
                <div className="text-xs text-slate-300 flex justify-between mb-1">
                  <span>Collapse risk warning</span>
                  <span className="font-bold text-cyan-400">{collapseAlertThreshold}%</span>
                </div>
                <input type="range" min="50" max="95" step="5" value={collapseAlertThreshold} onChange={(e) => setCollapseAlertThreshold(Number(e.target.value))} className="w-full accent-cyan-400" />
              </div>
            </div>

            {/* Section B */}
            <div>
              <div className="text-xs text-slate-500 uppercase tracking-wider mb-4 border-b border-slate-800 pb-2">Notification Channels</div>

              <div className="flex items-center justify-between py-2 border-slate-800">
                <span className="text-xs text-slate-300">In-app alerts</span>
                <div onClick={() => setNotifyInApp(!notifyInApp)} className={`w-[32px] h-[18px] rounded-full relative cursor-pointer transition-colors ${notifyInApp ? 'bg-cyan-500' : 'bg-slate-700'}`}>
                  <div className={`absolute top-[2px] w-[14px] h-[14px] bg-white rounded-full transition-all ${notifyInApp ? 'left-[16px]' : 'left-[2px]'}`} />
                </div>
              </div>

              <div className="flex items-center justify-between py-2 border-t border-slate-800">
                <span className="text-xs text-slate-300">Email digest (daily)</span>
                <div onClick={() => setNotifyEmail(!notifyEmail)} className={`w-[32px] h-[18px] rounded-full relative cursor-pointer transition-colors ${notifyEmail ? 'bg-cyan-500' : 'bg-slate-700'}`}>
                  <div className={`absolute top-[2px] w-[14px] h-[14px] bg-white rounded-full transition-all ${notifyEmail ? 'left-[16px]' : 'left-[2px]'}`} />
                </div>
              </div>

              <div className="flex items-center justify-between py-2 border-t border-slate-800">
                <span className="text-xs text-slate-300">SMS for critical only</span>
                <div onClick={() => setNotifySMS(!notifySMS)} className={`w-[32px] h-[18px] rounded-full relative cursor-pointer transition-colors ${notifySMS ? 'bg-cyan-500' : 'bg-slate-700'}`}>
                  <div className={`absolute top-[2px] w-[14px] h-[14px] bg-white rounded-full transition-all ${notifySMS ? 'left-[16px]' : 'left-[2px]'}`} />
                </div>
              </div>

              <button onClick={() => setShowAlertSettings(false)} className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold text-sm px-6 py-2 rounded-lg mt-6 w-full cursor-pointer transition-colors">
                Apply Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 7: KPI STRIP */}
      <KPIStrip
        sustainabilityIndex={sustainabilityIndex}
        collapseRisk={collapseRisk}
        atRiskCount={atRiskCount}
        totalSpecies={displaySpecies.length}
        sixMonthProjection={sixMonthProjection}
        alertCount={totalAlerts}
        criticalAlertCount={criticalCount}
      />

      {/* ROW 2: Triple Ring Gauge & Species Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-3 items-start">
        {/* STEP 8: 1fr Triple-Ring Gauge */}
        <div className="col-span-1 h-fit">
          <SustainabilityGaugeAdvanced
            sustainabilityIndex={sustainabilityIndex}
            sixMonthProjection={sixMonthProjection}
            modelConfidence={85} // static for now
            displaySpecies={displaySpecies}
            msyUtilization={msyUtilization}
          />
        </div>
        {/* 2fr Species Table */}
        <div className="col-span-2 h-fit overflow-hidden">
          <SpeciesTable
            species={displaySpecies}
            msyUtilizationFn={msyUtilization}
            critThreshold={critThreshold}
            highThreshold={highThreshold}
          />
        </div>
      </div>

      {/* ROW 3: Smart Alerts & Risk Drivers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3">
        <SmartAlertsPanel
          species={displaySpecies}
          msyUtilizationFn={msyUtilization}
          critThreshold={critThreshold}
          highThreshold={highThreshold}
          msyAlertThreshold={msyAlertThreshold}
        />

        <RiskDriversPanel
          displaySpecies={displaySpecies}
          msyUtilizationFn={msyUtilization}
          sstScenario={sstScenario}
        />
      </div>

      {/* ROW 4: Heatmap */}
      <div className="mb-3 flex flex-col">
        <RiskHeatmap
          species={displaySpecies}
          msyUtilizationFn={msyUtilization}
        />
      </div>

      {/* ROW 5: Recommended Actions */}
      <div className="mb-3 flex flex-col">
        <RecommendedActions
          species={displaySpecies}
          msyUtilizationFn={msyUtilization}
          critThreshold={critThreshold}
          highThreshold={highThreshold}
        />
      </div>

    </div>
  );
}
