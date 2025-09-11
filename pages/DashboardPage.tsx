/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { setNfts } from '../store/nftsSlice';
import NftCard from '../components/NftCard';
import { MagicWandIcon, SearchIcon, SortIcon } from '../components/icons';
import { MintedNft } from '../App';

type SortOption = 'date-desc' | 'date-asc' | 'name-asc' | 'name-desc' | 'custom';

const DashboardPage: React.FC = () => {
    const dispatch: AppDispatch = useDispatch();
    const { myNfts: nfts } = useSelector((state: RootState) => state.nfts);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState<SortOption>('date-desc');
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

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

        // If sort is 'custom', we don't sort, preserving the manual drag-and-drop order
        if (sortBy === 'custom') {
            return processedNfts;
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

    const handleDragStart = (e: React.DragEvent<HTMLAnchorElement>, index: number) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent<HTMLAnchorElement>) => {
        e.preventDefault(); // Necessary to allow dropping
    };

    const handleDrop = (e: React.DragEvent<HTMLAnchorElement>, dropIndex: number) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === dropIndex) {
            setDraggedIndex(null);
            return;
        }

        const reorderedNfts = [...filteredAndSortedNfts];
        const [draggedItem] = reorderedNfts.splice(draggedIndex, 1);
        reorderedNfts.splice(dropIndex, 0, draggedItem);
        
        // Strip the 'originalIndex' property before dispatching to match the MintedNft type
        const nftsToDispatch: MintedNft[] = reorderedNfts.map(({ originalIndex, ...rest }) => rest);

        dispatch(setNfts(nftsToDispatch));
        setSortBy('custom'); // Set sorting to custom to reflect the new order
        setDraggedIndex(null);
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
    };


    return (
        <div className="w-full max-w-7xl mx-auto flex flex-col items-center gap-6 animate-fade-in">
            <div className="w-full flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="text-center sm:text-left">
                    <h1 className="text-4xl font-bold text-white">My Creations</h1>
                    <p className="text-lg text-gray-400 mt-1">A gallery of your minted NFTs.</p>
                </div>
                 <Link
                    to="/"
                    className="flex items-center justify-center bg-gradient-to-br from-blue-600 to-blue-500 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-px active:scale-95"
                >
                    <MagicWandIcon className="w-5 h-5 mr-2" />
                    Create New NFT
                </Link>
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
                            value={sortBy === 'custom' ? 'date-desc' : sortBy} // Show a default if custom sorted
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
                    {filteredAndSortedNfts.map((nft, index) => (
                        <Link 
                            key={nft.mintDate} 
                            to={`/nft/${nft.originalIndex}`}
                            draggable={!searchTerm} // Disable drag-and-drop when a search is active
                            onDragStart={(e) => handleDragStart(e, index)}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, index)}
                            onDragEnd={handleDragEnd}
                            className={`transition-opacity duration-300 ${draggedIndex === index ? 'opacity-30' : 'opacity-100'}`}
                            aria-label={`View details for ${nft.title}`}
                        >
                            <NftCard nft={nft} />
                        </Link>
                    ))}
                </div>
            ) : (
                <div className="text-center bg-gray-800/50 border border-gray-700/80 p-12 rounded-lg mt-8 flex flex-col items-center gap-4 w-full">
                    <h2 className="text-2xl font-bold text-gray-200">
                      {searchTerm ? 'No Results Found' : 'Your collection is empty.'}
                    </h2>
                    <p className="text-gray-400">
                      {searchTerm ? 'Try a different search term.' : 'Upload your first item and mint an NFT to get started!'}
                    </p>
                    {!searchTerm && (
                      <Link
                          to="/"
                          className="mt-4 flex items-center justify-center bg-gradient-to-br from-blue-600 to-blue-500 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-px active:scale-95"
                      >
                          <MagicWandIcon className="w-5 h-5 mr-2" />
                          Create New NFT
                      </Link>
                    )}
                </div>
            )}
        </div>
    );
};

export default DashboardPage;