/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useMemo } from 'react';
import NftCard from '../components/NftCard';
import { MagicWandIcon, SearchIcon, SortIcon } from '../components/icons';
import { MintedNft } from '../App';

interface DashboardPageProps {
  nfts: MintedNft[];
  onCreateNew: () => void;
  onViewNftDetail: (nftIndex: number) => void;
}

type SortOption = 'date-desc' | 'date-asc' | 'name-asc' | 'name-desc';

const DashboardPage: React.FC<DashboardPageProps> = ({ nfts, onCreateNew, onViewNftDetail }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState<SortOption>('date-desc');

    const filteredAndSortedNfts = useMemo(() => {
        const nftsWithOriginalIndex = nfts.map((nft, index) => ({
            ...nft,
            originalIndex: index,
        }));

        let processedNfts = nftsWithOriginalIndex;

        // Filter by search term (case-insensitive)
        if (searchTerm) {
            processedNfts = processedNfts.filter(nft => 
                nft.title.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Sort based on the selected option
        processedNfts.sort((a, b) => {
            switch (sortBy) {
                case 'date-desc':
                    return b.mintDate - a.mintDate;
                case 'date-asc':
                    return a.mintDate - b.mintDate;
                case 'name-asc':
                    return a.title.localeCompare(b.title);
                case 'name-desc':
                    return b.title.localeCompare(a.title);
                default:
                    return 0;
            }
        });
        
        return processedNfts;
    }, [nfts, searchTerm, sortBy]);

    return (
        <div className="w-full max-w-7xl mx-auto flex flex-col items-center gap-6 animate-fade-in">
            <div className="w-full flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="text-center sm:text-left">
                    <h1 className="text-4xl font-bold text-white">My Creations</h1>
                    <p className="text-lg text-gray-400 mt-1">A gallery of your minted NFTs.</p>
                </div>
                 <button
                    onClick={onCreateNew}
                    className="flex items-center justify-center bg-gradient-to-br from-blue-600 to-blue-500 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-px active:scale-95"
                >
                    <MagicWandIcon className="w-5 h-5 mr-2" />
                    Create New NFT
                </button>
            </div>

            {/* Search and Filter Controls */}
            {nfts.length > 0 && (
                <div className="w-full flex flex-col sm:flex-row gap-4 bg-gray-800/50 border border-gray-700/80 p-3 rounded-lg backdrop-blur-sm">
                    <div className="relative flex-grow">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                        <input 
                            type="text"
                            placeholder="Search by name..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full bg-gray-900/50 border border-gray-600 rounded-md p-2 pl-10 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                    </div>
                    <div className="relative">
                         <SortIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                         <select
                            value={sortBy}
                            onChange={e => setSortBy(e.target.value as SortOption)}
                            className="w-full sm:w-auto bg-gray-900/50 border border-gray-600 rounded-md p-2 pl-10 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none appearance-none"
                         >
                            <option value="date-desc">Newest First</option>
                            <option value="date-asc">Oldest First</option>
                            <option value="name-asc">Name (A-Z)</option>
                            <option value="name-desc">Name (Z-A)</option>
                         </select>
                    </div>
                </div>
            )}


            {filteredAndSortedNfts.length > 0 ? (
                <div className="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {filteredAndSortedNfts.map(nft => (
                        <NftCard key={nft.mintDate} nft={nft} onClick={() => onViewNftDetail(nft.originalIndex)} />
                    ))}
                </div>
            ) : (
                <div className="text-center bg-gray-800/50 border border-gray-700/80 p-12 rounded-lg mt-8 flex flex-col items-center gap-4 w-full">
                    <h2 className="text-2xl font-bold text-gray-200">
                      {searchTerm ? 'No Results Found' : 'Your collection is empty.'}
                    </h2>
                    <p className="text-gray-400">
                      {searchTerm ? 'Try a different search term.' : 'Start creating to see your NFTs appear here.'}
                    </p>
                    {!searchTerm && (
                      <button
                          onClick={onCreateNew}
                          className="mt-4 flex items-center justify-center bg-gradient-to-br from-blue-600 to-blue-500 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-px active:scale-95"
                      >
                          <MagicWandIcon className="w-5 h-5 mr-2" />
                          Create New NFT
                      </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default DashboardPage;