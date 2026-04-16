import React, { useState } from 'react';

const PlotEssentials = () => {
  const [localInstructions, setLocalInstructions] = useState('You are an elite hacker in Neo-Tokyo.');
  const [localPlot, setLocalPlot] = useState('Target: Arasaka Tower Data Fortress.');
  const [localSummary, setLocalSummary] = useState('We have bypassed the outer ICE. Security is alerted.');
  const [authorsNote, setAuthorsNote] = useState('Maintain suspense. Use technical jargon.');

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0a0a0a] overflow-hidden p-6 space-y-8 overflow-y-auto custom-scrollbar">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase text-blue-400 tracking-[0.2em]">Instructions</span>
          <span className="text-[8px] font-mono text-gray-600">Context.instructions</span>
        </div>
        <textarea
          value={localInstructions}
          onChange={(e) => setLocalInstructions(e.target.value)}
          className="w-full h-32 bg-[#111] border border-white/5 rounded-lg p-4 text-sm text-blue-200 font-mono focus:border-blue-500 outline-none resize-none"
        />
      </div>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase text-purple-400 tracking-[0.2em]">Plot Essentials</span>
          <span className="text-[8px] font-mono text-gray-600">Context.plot</span>
        </div>
        <textarea
          value={localPlot}
          onChange={(e) => setLocalPlot(e.target.value)}
          className="w-full h-32 bg-[#111] border border-white/5 rounded-lg p-4 text-sm text-gray-200 focus:border-purple-500 outline-none resize-none"
        />
      </div>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase text-orange-400 tracking-[0.2em]">Summary</span>
          <span className="text-[8px] font-mono text-gray-600">Context.summary</span>
        </div>
        <textarea
          value={localSummary}
          onChange={(e) => setLocalSummary(e.target.value)}
          className="w-full h-32 bg-[#111] border border-white/5 rounded-lg p-4 text-sm text-orange-200 italic focus:border-orange-500 outline-none resize-none"
        />
      </div>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em]">Author's Note</span>
          <span className="text-[8px] font-mono text-gray-600">Context.notes</span>
        </div>
        <textarea
          value={authorsNote}
          onChange={(e) => setAuthorsNote(e.target.value)}
          className="w-full h-32 bg-[#111] border border-white/5 rounded-lg p-4 text-sm text-gray-300 focus:border-gray-500 outline-none resize-none"
        />
      </div>
    </div>
  );
};

export default PlotEssentials;
