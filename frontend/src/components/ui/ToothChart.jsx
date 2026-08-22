import React from 'react';
import { X, Check } from 'lucide-react';

const upperRight = ['18', '17', '16', '15', '14', '13', '12', '11'];
const upperLeft = ['21', '22', '23', '24', '25', '26', '27', '28'];
const lowerRight = ['48', '47', '46', '45', '44', '43', '42', '41'];
const lowerLeft = ['31', '32', '33', '34', '35', '36', '37', '38'];

const ToothChart = ({ selectedTooth = '', onSelectTooth }) => {
  // Parse current selection into an array of teeth/labels
  const parseSelection = (val) => {
    if (!val) return [];
    if (Array.isArray(val)) return val.map(String);
    if (typeof val === 'string') {
      return val.split(',').map(s => s.trim()).filter(Boolean);
    }
    return [];
  };

  const selectedList = parseSelection(selectedTooth);

  const isToothSelected = (tooth) => {
    if (selectedList.includes(tooth)) return true;
    if (selectedList.includes('Full Mouth')) return true;
    if (selectedList.includes('Upper Arch') && (upperRight.includes(tooth) || upperLeft.includes(tooth))) return true;
    if (selectedList.includes('Lower Arch') && (lowerRight.includes(tooth) || lowerLeft.includes(tooth))) return true;
    return false;
  };

  const toggleTooth = (tooth) => {
    // If a preset was active, unpack it into individual teeth first
    let current = [...selectedList];
    if (current.includes('Full Mouth')) {
      current = [...upperRight, ...upperLeft, ...lowerRight, ...lowerLeft];
    } else if (current.includes('Upper Arch')) {
      current = [...upperRight, ...upperLeft];
    } else if (current.includes('Lower Arch')) {
      current = [...lowerRight, ...lowerLeft];
    }

    if (current.includes(tooth)) {
      current = current.filter(t => t !== tooth);
    } else {
      current.push(tooth);
    }

    // Sort teeth naturally
    current.sort((a, b) => Number(a) - Number(b));
    const resultString = current.join(', ');
    onSelectTooth(resultString);
  };

  const setPreset = (preset) => {
    if (selectedTooth === preset) {
      onSelectTooth('');
    } else {
      onSelectTooth(preset);
    }
  };

  const clearSelection = () => {
    onSelectTooth('');
  };

  const renderToothButton = (tooth) => {
    const isSelected = isToothSelected(tooth);
    return (
      <button
        key={tooth}
        type="button"
        onClick={() => toggleTooth(tooth)}
        className={`w-8 sm:w-9 h-11 flex flex-col items-center justify-between p-1 rounded-lg text-xs font-bold transition-all border shadow-2xs cursor-pointer ${
          isSelected
            ? 'bg-blue-600 text-white border-blue-700 ring-2 ring-blue-300 ring-offset-1 scale-105 z-10'
            : 'bg-white text-slate-700 border-slate-200 hover:bg-blue-50 hover:border-blue-300'
        }`}
        title={`Tooth ${tooth} (Click to toggle)`}
      >
        <span className="text-[10px] opacity-80 font-mono">{tooth}</span>
        <div className={`w-3.5 h-4 rounded-xs border transition-colors ${
          isSelected ? 'bg-white/40 border-white' : 'bg-slate-100 border-slate-300'
        }`} />
      </button>
    );
  };

  return (
    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-4">
      {/* Top Header & Presets */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-semibold text-slate-600">
        <div className="flex items-center gap-1.5">
          <span>FDI Dental Chart</span>
          <span className="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full font-bold border border-blue-100">
            Multi-Select Enabled
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {['Full Mouth', 'Upper Arch', 'Lower Arch'].map(option => (
            <button
              key={option}
              type="button"
              onClick={() => setPreset(option)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                selectedTooth === option
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {option}
            </button>
          ))}
          {selectedList.length > 0 && (
            <button
              type="button"
              onClick={clearSelection}
              className="px-2 py-1 rounded-lg text-[11px] font-bold bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 transition cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Maxillary / Upper Arch */}
      <div>
        <div className="text-[10px] font-bold text-center text-slate-400 uppercase tracking-widest mb-1.5">
          Upper Arch (Maxilla) • Q1 (Right) & Q2 (Left)
        </div>
        <div className="flex justify-center items-center gap-1 sm:gap-2">
          {/* Upper Right Quadrant 1 */}
          <div className="flex gap-1 bg-white p-1.5 rounded-xl border border-slate-100 shadow-2xs">
            {upperRight.map(renderToothButton)}
          </div>
          <div className="h-10 w-px bg-slate-300 mx-1" />
          {/* Upper Left Quadrant 2 */}
          <div className="flex gap-1 bg-white p-1.5 rounded-xl border border-slate-100 shadow-2xs">
            {upperLeft.map(renderToothButton)}
          </div>
        </div>
      </div>

      {/* Mandibular / Lower Arch */}
      <div>
        <div className="flex justify-center items-center gap-1 sm:gap-2">
          {/* Lower Right Quadrant 4 */}
          <div className="flex gap-1 bg-white p-1.5 rounded-xl border border-slate-100 shadow-2xs">
            {lowerRight.map(renderToothButton)}
          </div>
          <div className="h-10 w-px bg-slate-300 mx-1" />
          {/* Lower Left Quadrant 3 */}
          <div className="flex gap-1 bg-white p-1.5 rounded-xl border border-slate-100 shadow-2xs">
            {lowerLeft.map(renderToothButton)}
          </div>
        </div>
        <div className="text-[10px] font-bold text-center text-slate-400 uppercase tracking-widest mt-1.5">
          Lower Arch (Mandible) • Q4 (Right) & Q3 (Left)
        </div>
      </div>

      {/* Selected Target Badges & Summary */}
      {selectedList.length > 0 ? (
        <div className="p-2.5 bg-blue-50/80 rounded-xl border border-blue-100 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-blue-900">
              Selected Target Teeth ({selectedList.length}):
            </span>
            <span className="text-[11px] text-blue-600 font-medium">Click teeth to toggle</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {selectedList.map(t => (
              <span
                key={t}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-white text-blue-700 border border-blue-200 rounded-lg text-xs font-mono font-bold shadow-2xs"
              >
                Tooth {t}
                <button
                  type="button"
                  onClick={() => toggleTooth(t)}
                  className="hover:text-rose-600 transition"
                  title="Remove tooth"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center text-xs text-slate-400 py-1">
          Click one or more teeth above to target procedures (e.g. 11, 12, 13, or choose Full Mouth / Arch).
        </div>
      )}
    </div>
  );
};

export default ToothChart;

