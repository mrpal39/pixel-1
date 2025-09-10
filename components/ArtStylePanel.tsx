/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import Tooltip from './Tooltip';

interface StylePresetPanelProps {
  onApplyArtStyle: (prompt: string) => void;
  onReset: () => void;
  isLoading: boolean;
  originalImageUrl: string | null;
}

const StylePresetPanel: React.FC<StylePresetPanelProps> = ({ onApplyArtStyle, onReset, isLoading, originalImageUrl }) => {

  const presets = [
    {
      name: 'Synthwave',
      prompt: 'Apply a vibrant 80s synthwave aesthetic with neon magenta and cyan glows, and subtle scan lines.',
      thumbnailUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9InN5bnRod2F2ZUJnIiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj48c3RvcCBvZmZzZXQ9IjAlIiBzdHlsZT0ic3RvcC1jb2xvcjojMGQwMjIxO3N0b3Atb3BhY2l0eToxIiAvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3R5bGU9InN0b3AtY29sb3I6IzI2MTQ0NztzdG9wLW9wYWNpdHk6MSIgLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0idXJsKCNzeW50aHdhdmVCZykiIC8+PGxpbmUgeDE9IjAiIHkxPSI2MCIgeDI9IjEwMCIgeTI9IjQwIiBzdHJva2U9IiNmMGUiIHN0cm9rZS1widthPSIzIiAvPjxsaW5lIHgxPSIwIiB5MT0iNzAiIHgyPSIxMDAiIHkyPSI1MCIgc3Ryb2tlPSIjMGZmIiBzdHJva2Utd2lkdGg9IjIiIC8+PGNpcmNsZSBjeD0iNTAiIGN5PSIyNSIgcj0iMTUiIHN0cm9rZT0iI2ZmOGMwMCIgc3Ryb2tlLXdpZHRoPSIzIiBmaWxsPSJub25lIiAvPjwvc3ZnPg==',
    },
    {
      name: 'Lomo',
      prompt: 'Apply a Lomography-style cross-processing film effect with high-contrast, oversaturated colors, and dark vignetting.',
      thumbnailUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cmFkaWFsR3JhZGllbnQgaWQ9InZpZ25ldHRlIiBjeD0iNTAlIiBjeT0iNTAlIiByPSI3MCUiIGZ4PSI1MCUiIGZ5PSI1MCUiPjxzdG9wIG9mZnNldD0iNjAlIiBzdG9wLWNvbG9yPSJ3aGl0ZSIgc3RvcC1vcGFjaXR5PSIwIiAvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iYmxhY2siIHN0b3Atb3BhY2l0eT0iMC42IiAvPjwvcmFkaWFsR3JhZGllbnQ+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjODBkMGQwIiAvPjxjaXJjbGUgY3g9IjUwIiBjeT0iMzAiIHI9IjE1IiBmaWxsPSIjZmZkNzAwIiAvPjxyZWN0IHg9IjAiIHk9IjcwIiB3aWR0aD0iMTAwIiBoZWlnaHQ9IjMwIiBmaWxsPSIjNDY4MmI0IiAvPjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSJ1cmwoI3ZpZ25ldHRlKSIgLz48L3N2Zz4=',
    },
    {
      name: 'Anime',
      prompt: 'Give the image a vibrant Japanese anime style, with bold outlines, cel-shading, and saturated colors.',
      thumbnailUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNIDIwLDgwIEMgMjAsNDAgODAsNDAgODAsODAgWiIgZmlsbD0iI2ZmYzBjYiIgc3Ryb2tlPSJibGFjayIgc3Ryb2tlLXdpZHRoPSIyIi8+PGNpcmNsZSBjeD0iNDAiIGN5PSI1MCIgcj0iMTAiIGZpbGw9IndoaXRlIiBzdHJva2U9ImJsYWNrIiBzdHJva2Utd2lkdGg9IjEiLz48Y2lyY2xlIGN4PSI0MiIgY3k9IjUyIiByPSI1IiBmaWxsPSJibGFjayIvPjxjaXJjbGUgY3g9IjQwIiBjeT0iNTAiIHI9IjIiIGZpbGw9IndoaXRlIi8+PGNpcmNsZSBjeD0iNjAiIGN5PSI1MCIgcj0iMTAiIGZpbGw9IndoaXRlIiBzdHJva2U9ImJsYWNrIiBzdHJva2Utd2lkdGg9IjEiLz48Y2lyY2xlIGN4PSI2MiIgY3k9IjUyIiByPSI1IiBmaWxsPSJibGFjayIvPjxjaXJjbGUgY3g9IjYwIiBjeT0iNTAiIHI9IjIiIGZpbGw9IndoaXRlIi8+PHBhdGggZD0iTSA0NSw2NSBRIDUwLDcwIDU1LDY1IiBzdHJva2U9ImJsYWNrIiBzdHJva2Utd2lkdGg9IjIiIGZpbGw9Im5vbmUiLz48L3N2Zz4=',
    },
    {
      name: 'Sketch',
      prompt: 'Redraw the image as a detailed pencil sketch, with cross-hatching for shading and clean outlines.',
      thumbnailUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48ZmlsdGVyIGlkPSJza2V0Y2h5Ij48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iMC43IiBudW1PY3RhdmVzPSIxIiByZXN1bHQ9InR1cmJ1bGVuY2UiLz48ZmVEaXNwbGFjZW1lbnRNYXAgaW4yPSJ0dXJidWxlbmNlIiBpbj0iU291cmNlR3JhcGhpYyIgc2NhbGU9IjIiLz48L2ZpbHRlcj48cGF0dGVybiBpZD0iaGF0Y2giIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxwYXRoIGQ9Ik0tMSwxIGwyLC0yIE0wLDQgbDQsLTQgTTMsNSBsMiwtMiIgc3R5bGU9InN0cm9rZTpncmF5OyBzdHJva2Utd2lkdGg6MC41IiAvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiNmMGYwZjAiLz48ZyBmaWx0ZXI9InVybCgjc2tldGNoeSkiIHN0cm9rZT0iYmxhY2siIHN0cm9rZS1widthPSIxLjUiIGZpbGw9Im5vbmUiPjxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjMwIiBmaWxsPSJ1cmwoI2hhdGNoKSIgc3Ryb2tlLW9wYWNpdHk9IjAuNyIvPjxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjMwIi8+PC9nPjwvc3ZnPg==',
    },
    { name: 'Fantasy', prompt: 'Give the image a high-fantasy art style, with glowing magical effects, ethereal lighting, and ornate details.' },
    { name: 'Pixel Art', prompt: 'Convert the image into detailed 16-bit pixel art, reminiscent of classic video games.' },
    { name: 'Pop Art', prompt: 'Apply a vibrant, bold Pop Art style, with dot patterns, saturated colors, and heavy black outlines, similar to the work of Roy Lichtenstein.' },
    { name: 'Watercolor', prompt: 'Transform the image into a delicate watercolor painting with soft, bleeding colors and a paper texture.' },
  ];

  const renderPresetButton = (
    name: string, 
    imageUrl: string | null, 
    onClick: () => void, 
    tooltip: string
  ) => (
    <div key={name} className="flex flex-col items-center gap-2">
      <Tooltip text={tooltip}>
        <button
          onClick={onClick}
          disabled={isLoading || !imageUrl}
          className="w-full aspect-square bg-gray-900 rounded-lg overflow-hidden border-2 border-gray-700/80 hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-blue-400 transition-all duration-200 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed disabled:border-gray-700/80 group"
        >
          {imageUrl ? (
            <img src={imageUrl} alt={`${name} preset`} className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105" />
          ) : (
            <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                <span className="text-xs text-gray-400">{name}</span>
            </div>
          )}
        </button>
      </Tooltip>
      <span className="text-sm font-medium text-gray-300">{name}</span>
    </div>
  );

  return (
    <div className="w-full bg-gray-800/50 border border-gray-700 rounded-lg p-4 flex flex-col gap-4 animate-fade-in backdrop-blur-sm">
      <h3 className="text-lg font-semibold text-center text-gray-300">Apply a Style Preset</h3>
      
      <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
        {renderPresetButton("None", originalImageUrl, onReset, "Revert to the original image.")}
        {presets.map(preset => renderPresetButton(preset.name, preset.thumbnailUrl || null, () => onApplyArtStyle(preset.prompt), preset.prompt))}
      </div>
    </div>
  );
};

export default StylePresetPanel;
