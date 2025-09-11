/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import { Link } from 'react-router-dom';
import { MintedNft } from '../App';
import { ArrowLeftIcon, ExternalLinkIcon } from '../components/icons';

interface NftDetailPageProps {
  nft: MintedNft;
}

const NftDetailPage: React.FC<NftDetailPageProps> = ({ nft }) => {
    
    const formattedDate = new Date(nft.mintDate).toLocaleString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });

    return (
        <div className="w-full max-w-6xl mx-auto flex flex-col items-start gap-6 animate-fade-in">
            <Link
                to="/dashboard"
                className="flex items-center justify-center text-center bg-white/10 border border-white/20 text-gray-200 font-semibold py-2 px-4 rounded-md transition-all duration-200 ease-in-out hover:bg-white/20 hover:border-white/30 active:scale-95 text-base"
            >
                <ArrowLeftIcon className="w-5 h-5 mr-2" />
                Back to Dashboard
            </Link>
            <div 
                className="w-full bg-gray-800/50 border border-gray-700/80 rounded-xl shadow-2xl flex flex-col md:flex-row gap-8 p-8"
            >
                {/* Left Side: Image Preview */}
                <div className="w-full md:w-1/2 flex-shrink-0">
                    <img src={nft.imageUrl} alt={nft.title} className="w-full rounded-lg aspect-square object-contain bg-gray-900" />
                </div>

                {/* Right Side: Metadata */}
                <div className="w-full md:w-1/2 flex flex-col gap-4">
                    <h1 className="text-4xl lg:text-5xl font-bold text-white break-words">{nft.title}</h1>
                    
                    <div className="text-sm text-gray-400">
                        <span className="font-semibold">Minted on:</span> {formattedDate}
                    </div>

                    {nft.transactionHash && (
                        <div>
                             <a 
                                href={`https://polygonscan.com/tx/${nft.transactionHash}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-sm bg-blue-500/10 text-blue-300 font-semibold py-2 px-3 rounded-lg hover:bg-blue-500/20 transition-colors border border-blue-500/20"
                              >
                                View on PolygonScan <ExternalLinkIcon className="w-4 h-4" />
                              </a>
                        </div>
                    )}

                    {nft.description && (
                        <div>
                            <h2 className="text-lg font-semibold text-gray-200 mb-1">Description</h2>
                            <p className="text-gray-300 whitespace-pre-wrap">{nft.description}</p>
                        </div>
                    )}

                    {nft.properties && nft.properties.length > 0 && (
                        <div>
                             <h2 className="text-lg font-semibold text-gray-200 mb-2">Properties</h2>
                             <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                                {nft.properties.map((prop, index) => (
                                    <div key={index} className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-md text-center">
                                        <p className="text-xs text-blue-300 uppercase tracking-wider">{prop.trait_type}</p>
                                        <p className="font-bold text-white text-md break-words">{prop.value}</p>
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

export default NftDetailPage;