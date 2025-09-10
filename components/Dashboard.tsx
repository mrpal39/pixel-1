/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import NftCard from './NftCard';
import { MagicWandIcon } from './icons';

type Trait = { trait_type: string; value: string };
type MintedNft = {
  title: string;
  description: string;
  properties: Trait[];
  imageUrl: string;
};

interface DashboardProps {
  nfts: MintedNft[];
  onCreateNew: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ nfts, onCreateNew }) => {
    return (
        <div className="w-full max-w-6xl mx-auto flex flex-col items-center gap-6 animate-fade-in">
            <div className="text-center">
                <h1 className="text-4xl font-bold text-white">My Creations</h1>
                <p className="text-lg text-gray-400 mt-2">A gallery of your minted NFTs.</p>
            </div>

            {nfts.length > 0 ? (
                <div className="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {nfts.map((nft, index) => (
                        <NftCard key={`${nft.title}-${index}`} nft={nft} />
                    ))}
                </div>
            ) : (
                <div className="text-center bg-gray-800/50 border border-gray-700/80 p-12 rounded-lg mt-8 flex flex-col items-center gap-4">
                    <h2 className="text-2xl font-bold text-gray-200">Your collection is empty.</h2>
                    <p className="text-gray-400">Start creating to see your NFTs appear here.</p>
                    <button
                        onClick={onCreateNew}
                        className="mt-4 flex items-center justify-center bg-gradient-to-br from-blue-600 to-blue-500 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-px active:scale-95"
                    >
                        <MagicWandIcon className="w-5 h-5 mr-2" />
                        Create New NFT
                    </button>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
