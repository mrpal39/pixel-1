/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import { PaintBrushIcon } from './icons';
import Tooltip from './Tooltip';

interface MagicEraserPanelProps {
  onMagicErase: () => void;
  onClearMask: () => void;
  isLoading: boolean;
  isMasked: boolean;
  brushSize: number;
  onBrushSizeChange: (size: number) => void;
}

const MagicEraserPanel: React.FC<MagicEraserPanelProps> = ({ 
  onMagicErase, 
  onClearMask, 
  isLoading, 
  isMasked,
  brushSize,
  onBrushSizeChange
}) => {
  return (
    <div className="w-full bg-gray-800/50 border border-gray-700 rounded-lg p-4 flex flex-col items-center gap-4 animate-fade-in backdrop-blur-sm">
      <h3 className="text-lg font-semibold text-gray-300">Magic Eraser</h3>
      <p className="text-sm text-gray-400 -mt-2">Paint over any unwanted objects to remove them.</p>

      <div className="w-full max-w-sm flex items-center gap-4">
        <Tooltip text="Brush Size">
            <PaintBrushIcon className="w-6 h-6 text-gray-400"/>
        </Tooltip>
        <input
          type="range"
          min="5"
          max="100"
          value={brushSize}
          onChange={(e) => onBrushSizeChange(Number(e.target.value))}
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
          disabled={isLoading}
        />
        <span className="text-sm font-medium text-gray-300 w-10 text-right">{brushSize}px</span>
      </div>

      <div className="w-full flex flex-col sm:flex-row items-center gap-2 mt-2">
        <Tooltip text="Erase the entire painted mask and start over.">
            <button
              onClick={onClearMask}
              disabled={isLoading || !isMasked}
              className="w-full sm:w-auto flex-grow text-center bg-white/10 border border-white/20 text-gray-200 font-semibold py-4 px-6 rounded-lg transition-all duration-200 ease-in-out hover:bg-white/20 hover:border-white/30 active:scale-95 text-base disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-transparent"
            >
                Clear Mask
            </button>
        </Tooltip>
        <Tooltip text="Remove the masked object and fill the background.">
            <button
              onClick={onMagicErase}
              disabled={isLoading || !isMasked}
              className="w-full sm:w-auto flex-grow bg-gradient-to-br from-blue-600 to-blue-500 text-white font-bold py-4 px-6 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-base disabled:from-blue-800 disabled:to-blue-700 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
            >
              Remove Object
            </button>
        </Tooltip>
      </div>
    </div>
  );
};

export default MagicEraserPanel;
