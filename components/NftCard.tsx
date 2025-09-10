/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';

type Trait = { trait_type: string; value: string };

interface NftCardProps {
    nft: {
        imageUrl: string;
        title: string;
        properties: Trait[];
    };
}

const NftCard: React.FC<NftCardProps> = ({ nft }) => {
    return (
        <div className="bg-gray-800/50 rounded-lg overflow-hidden border border-gray-700/80 transition-all duration-300 hover:border-blue-500 hover:shadow-2xl hover:shadow-blue-500/20 hover:-translate-y-1">
            <img src={nft.imageUrl} alt={nft.title} className="w-full aspect-square object-cover" />
            <div className="p-4">
                <h3 className="font-bold text-lg text-white truncate">{nft.title}</h3>
                {nft.properties.length > 0 && (
                     <div className="mt-2 text-xs text-gray-400 space-y-1">
                        {nft.properties.slice(0, 2).map(prop => (
                            <div key={prop.trait_type} className="flex justify-between">
                                <span className="font-semibold capitalize">{prop.trait_type}:</span>
                                <span>{prop.value}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default NftCard;
