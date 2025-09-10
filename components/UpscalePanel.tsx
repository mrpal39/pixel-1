/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState } from 'react';
import Tooltip from './Tooltip';

interface UpscalePanelProps {
  onApplyUpscale: (scaleFactor: number) => void;
  isLoading: boolean;
}

const UpscalePanel: React.FC<UpscalePanelProps> = ({ onApplyUpscale, isLoading }) => {
    const [scaleFactor, setScaleFactor] = useState<number>(2);

    const handleApply = () => {
        onApplyUpscale(scaleFactor);
    };

    const scaleOptions = [2, 4];

    return (
        <div className="w-full bg-gray-800/50 border border-gray-700 rounded-lg p-4 flex flex-col items-center gap-4 animate-fade-in backdrop-blur-sm">
            <h3 className="text-lg font-semibold text-gray-300">Upscale Image</h3>
            <p className="text-sm text-gray-400 -mt-2">Increase resolution and enhance details.</p>

            <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-400">Scale Factor:</span>
                {scaleOptions.map((factor) => (
                    <Tooltip key={factor} text={`Increase image resolution by ${factor} times.`}>
                        <button
                            onClick={() => setScaleFactor(factor)}
                            disabled={isLoading}
                            className={`px-4 py-2 rounded-md text-base font-semibold transition-all duration-200 active:scale-95 disabled:opacity-50 ${
                                scaleFactor === factor
                                ? 'bg-gradient-to-br from-blue-600 to-blue-500 text-white shadow-md shadow-blue-500/20'
                                : 'bg-white/10 hover:bg-white/20 text-gray-200'
                            }`}
                        >
                            {factor}x
                        </button>
                    </Tooltip>
                ))}
            </div>

            <Tooltip text="Increase the image resolution and add AI-enhanced details.">
                <button
                    onClick={handleApply}
                    disabled={isLoading}
                    className="w-full max-w-xs mt-2 bg-gradient-to-br from-green-600 to-green-500 text-white font-bold py-4 px-6 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-green-500/20 hover:shadow-xl hover:shadow-green-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-base disabled:from-green-800 disabled:to-green-700 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
                >
                    Apply {scaleFactor}x Upscale
                </button>
            </Tooltip>
        </div>
    );
};

export default UpscalePanel;
