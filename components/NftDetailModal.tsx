/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import { MintedNft } from '../App';

interface NftDetailModalProps {
  nft: MintedNft;
  onClose: () => void;
}

const NftDetailModal: React.FC<NftDetailModalProps> = ({ nft, onClose }) => {
    
    const formattedDate = new Date(nft.mintDate).toLocaleString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });

    return (
        <div 
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" 
            onClick={onClose}
        >
            <div 
                className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto flex flex-col md:flex-row gap-6 p-6 relative"
                onClick={(e) => e.stopPropagation()}
            >
                <button 
                    onClick={onClose} 
                    className="absolute top-4 right-4 text-gray-400 hover:text-white text-3xl font-mono"
                    aria-label="Close NFT details"
                >
                    &times;
                </button>
                
                {/* Left Side: Image Preview */}
                <div className="w-full md:w-1/2 flex-shrink-0">
                    <img src={nft.imageUrl} alt={nft.title} className="w-full rounded-lg aspect-square object-contain bg-gray-900" />
                </div>

                {/* Right Side: Metadata */}
                <div className="w-full md:w-1/2 flex flex-col gap-4">
                    <h2 className="text-4xl font-bold text-white break-words">{nft.title}</h2>
                    
                    <div className="text-sm text-gray-400">
                        <span className="font-semibold">Minted on:</span> {formattedDate}
                    </div>

                    {nft.description && (
                        <div>
                            <h3 className="text-lg font-semibold text-gray-200 mb-1">Description</h3>
                            <p className="text-gray-300 whitespace-pre-wrap">{nft.description}</p>
                        </div>
                    )}

                    {nft.properties && nft.properties.length > 0 && (
                        <div>
                             <h3 className="text-lg font-semibold text-gray-200 mb-2">Properties</h3>
                             <div className="grid grid-cols-2 gap-3">
                                {nft.properties.map((prop, index) => (
                                    <div key={index} className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-md text-center">
                                        <p className="text-xs text-blue-300 uppercase tracking-wider">{prop.trait_type}</p>
                                        <p className="font-bold text-white text-md">{prop.value}</p>
                                    </div>
                                ))}
                             </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default NftDetailModal;
