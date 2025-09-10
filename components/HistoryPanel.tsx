/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import Tooltip from './Tooltip';

interface HistoryPanelProps {
  historyUrls: string[];
  currentIndex: number;
  onNavigate: (index: number) => void;
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({ historyUrls, currentIndex, onNavigate }) => {
  return (
    <div className="w-full bg-gray-800/50 border border-gray-700 rounded-lg p-4 animate-fade-in backdrop-blur-sm">
      <h3 className="text-lg font-semibold text-center text-gray-300 mb-3">History</h3>
      <div className="flex overflow-x-auto space-x-3 pb-2">
        {historyUrls.map((url, index) => (
          <div key={`${url}-${index}`} className="flex-shrink-0 flex flex-col items-center gap-1">
            <Tooltip text={`Click to go back to this step.`}>
                <button
                  onClick={() => onNavigate(index)}
                  className={`relative rounded-md overflow-hidden transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-blue-400 ${
                    currentIndex === index ? 'ring-2 ring-blue-500' : 'ring-1 ring-gray-600 hover:ring-blue-500'
                  }`}
                  aria-label={`Go to step ${index === 0 ? 'Original' : index}`}
                >
                  <img
                    src={url}
                    alt={index === 0 ? 'Original image' : `Edit step ${index}`}
                    className="h-20 w-auto object-cover bg-gray-900"
                  />
                </button>
            </Tooltip>
            <span className={`text-xs font-medium ${currentIndex === index ? 'text-blue-400' : 'text-gray-400'}`}>
              {index === 0 ? 'Original' : `Edit ${index}`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HistoryPanel;
