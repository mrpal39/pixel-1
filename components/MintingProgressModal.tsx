/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import Spinner from './Spinner';

interface MintingProgressModalProps {
  total: number;
  completed: number;
  errors: number;
  currentAction: string;
  successfulMints: { tokenId: string, txHash: string }[];
  failedMints: { tokenId: string, error: string }[];
  onClose: () => void;
  isFinished: boolean;
}

const MintingProgressModal: React.FC<MintingProgressModalProps> = ({
  total,
  completed,
  errors,
  currentAction,
  successfulMints,
  failedMints,
  onClose,
  isFinished,
}) => {
  const progressPercent = total > 0 ? ((completed + errors) / total) * 100 : 0;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
      <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-700">
          <h2 className="text-2xl font-bold text-white">
            {isFinished ? 'Batch Minting Complete' : 'Batch Minting in Progress...'}
          </h2>
          {!isFinished && <p className="text-sm text-gray-400 mt-1">Please do not close this window. You will need to approve each transaction.</p>}
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          {/* Progress Bar */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-medium text-gray-300">Overall Progress</span>
              <span className="text-sm font-medium text-gray-400">{completed + errors} / {total}</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2.5">
              <div
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>

          {/* Current Status */}
          <div className="bg-gray-900/50 p-4 rounded-lg text-center">
            {isFinished ? (
              <p className="text-lg font-semibold text-green-400">Finished!</p>
            ) : (
              <>
                <p className="text-sm text-gray-400">Current Action</p>
                <div className="flex items-center justify-center gap-2 mt-1">
                  <Spinner />
                  <p className="text-md text-gray-200">{currentAction}</p>
                </div>
              </>
            )}
          </div>
          
          {/* Results */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Successes */}
              <div>
                  <h3 className="font-semibold text-green-400 mb-2">Successful Mints ({successfulMints.length})</h3>
                  <div className="bg-gray-900/50 rounded-lg p-2 space-y-1 max-h-40 overflow-y-auto">
                      {successfulMints.map(item => (
                          <div key={item.tokenId} className="text-xs flex justify-between items-center bg-gray-800 p-1.5 rounded">
                              <span className="text-gray-300">Token ID: <span className="font-bold">{item.tokenId}</span></span>
                              {/* In a real app, you would make this a link to a block explorer */}
                              <span className="font-mono text-gray-500">{item.txHash.substring(0, 10)}...</span>
                          </div>
                      ))}
                      {successfulMints.length === 0 && <p className="text-xs text-center text-gray-500 p-2">No successful mints yet.</p>}
                  </div>
              </div>
              {/* Failures */}
              <div>
                  <h3 className="font-semibold text-red-400 mb-2">Failed Mints ({failedMints.length})</h3>
                   <div className="bg-gray-900/50 rounded-lg p-2 space-y-1 max-h-40 overflow-y-auto">
                      {failedMints.map(item => (
                          <div key={item.tokenId} className="text-xs bg-red-800/20 p-1.5 rounded">
                              <p className="text-red-300">Token ID: <span className="font-bold">{item.tokenId}</span></p>
                              <p className="text-red-400 truncate">Error: {item.error}</p>
                          </div>
                      ))}
                       {failedMints.length === 0 && <p className="text-xs text-center text-gray-500 p-2">No failed mints yet.</p>}
                  </div>
              </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-700 mt-auto">
          <button
            onClick={onClose}
            disabled={!isFinished}
            className="w-full bg-gray-600 text-white font-bold py-3 px-5 rounded-md hover:bg-gray-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isFinished ? 'Close' : 'Minting in Progress...'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MintingProgressModal;