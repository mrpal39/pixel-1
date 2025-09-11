/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import * as polygonService from '../../services/polygonService';
import Tooltip from '../Tooltip';
import MintingProgressModal from '../MintingProgressModal';

type CsvData = {
    tokenId: string;
    metadataUrl: string;
};

type MintResult = {
    tokenId: string;
    txHash: string;
};

type MintError = {
    tokenId: string;
    error: string;
};

const CollectionMinter: React.FC = () => {
    const { walletAddress } = useSelector((state: RootState) => state.wallet);
    const [contractAddress, setContractAddress] = useState('');
    // Fix: Explicitly type the network state to match expected values.
    const [network, setNetwork] = useState<'polygon-mainnet' | 'polygon-mumbai'>('polygon-mainnet');
    const [parsedData, setParsedData] = useState<CsvData[]>([]);
    const [fileName, setFileName] = useState('');
    const [error, setError] = useState<string | null>(null);

    // Minting Progress State
    const [isMinting, setIsMinting] = useState(false);
    const [isFinished, setIsFinished] = useState(false);
    const [mintingProgress, setMintingProgress] = useState({
        total: 0,
        completed: 0,
        errors: 0,
        currentAction: '',
        successfulMints: [] as MintResult[],
        failedMints: [] as MintError[],
    });

    useEffect(() => {
        const savedContract = localStorage.getItem('pixshop-contract-address');
        const savedNetwork = localStorage.getItem('pixshop-network');
        if (savedContract) setContractAddress(savedContract);
        // Fix: Validate the saved network from localStorage before setting state.
        if (savedNetwork === 'polygon-mainnet' || savedNetwork === 'polygon-mumbai') {
            setNetwork(savedNetwork);
        }
    }, []);

    const handleContractChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setContractAddress(e.target.value);
        localStorage.setItem('pixshop-contract-address', e.target.value);
    };

    const handleNetworkChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newNetwork = e.target.value;
        // Fix: Validate the network from the select input before setting state.
        if (newNetwork === 'polygon-mainnet' || newNetwork === 'polygon-mumbai') {
            setNetwork(newNetwork);
            localStorage.setItem('pixshop-network', newNetwork);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setError(null);
        setParsedData([]);
        setFileName(file.name);

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const text = event.target?.result as string;
                const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
                if (lines.length < 2) throw new Error("CSV must have a header and at least one data row.");
                
                const header = lines[0].split(',').map(h => h.trim().toLowerCase());
                const tokenIdIndex = header.indexOf('token_id');
                const metadataUrlIndex = header.indexOf('metadata_url');

                if (tokenIdIndex === -1 || metadataUrlIndex === -1) {
                    throw new Error("CSV header must contain 'token_id' and 'metadata_url' columns.");
                }

                const data = lines.slice(1).map((line, i) => {
                    const values = line.split(',');
                    const tokenId = values[tokenIdIndex]?.trim();
                    const metadataUrl = values[metadataUrlIndex]?.trim();
                    if (!tokenId || !metadataUrl) {
                        throw new Error(`Invalid data on row ${i + 2}. Both token_id and metadata_url are required.`);
                    }
                    return { tokenId, metadataUrl };
                });

                setParsedData(data);
            } catch (err: any) {
                setError(err.message);
                setFileName('');
            }
        };
        reader.readAsText(file);
    };

    const handleMintCollection = async () => {
        if (!parsedData.length || !contractAddress || !network || !walletAddress) {
            setError("Please ensure wallet is connected, contract is set, and a valid CSV is loaded.");
            return;
        }

        if (!confirm(`You are about to mint ${parsedData.length} NFTs. This will require you to approve ${parsedData.length} separate transactions in your wallet. Do you want to proceed?`)) {
            return;
        }

        setIsMinting(true);
        setIsFinished(false);
        setMintingProgress({
            total: parsedData.length,
            completed: 0,
            errors: 0,
            currentAction: 'Starting...',
            successfulMints: [],
            failedMints: [],
        });

        for (const item of parsedData) {
            try {
                setMintingProgress(prev => ({ ...prev, currentAction: `Minting Token ID: ${item.tokenId}...` }));
                
                const receipt = await polygonService.mintFromMetadataUrl({
                    contractAddress,
                    networkName: network,
                    toAddress: walletAddress,
                    metadataUrl: item.metadataUrl,
                });
                
                if (!receipt || !receipt.hash) throw new Error("Transaction failed or hash not found.");

                setMintingProgress(prev => ({
                    ...prev,
                    completed: prev.completed + 1,
                    successfulMints: [...prev.successfulMints, { tokenId: item.tokenId, txHash: receipt.hash }],
                }));

            } catch (err: any) {
                console.error(`Failed to mint Token ID ${item.tokenId}:`, err);
                setMintingProgress(prev => ({
                    ...prev,
                    errors: prev.errors + 1,
                    failedMints: [...prev.failedMints, { tokenId: item.tokenId, error: err.message || 'Unknown error' }],
                }));
            }
        }
        
        setMintingProgress(prev => ({ ...prev, currentAction: 'All transactions processed.' }));
        setIsFinished(true);
    };

    return (
        <div className="w-full bg-gray-800/50 border border-gray-700 rounded-lg p-6 flex flex-col items-center gap-6 animate-fade-in backdrop-blur-sm">
            <h3 className="text-lg font-semibold text-gray-300">Collection Minter & Configuration</h3>
            <p className="text-sm text-gray-400 -mt-4 max-w-2xl text-center">
                Configure your smart contract and network for single mints, or use the batch minter to launch an entire collection from a CSV file.
            </p>

            {/* --- Configuration --- */}
            <div className="w-full max-w-2xl grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                    <label htmlFor="contract" className="block text-sm font-medium text-gray-300 mb-1">Contract Address</label>
                    <input
                      id="contract"
                      type="text"
                      value={contractAddress}
                      onChange={handleContractChange}
                      placeholder="0x..."
                      className="w-full bg-gray-800 border border-gray-600 rounded-md p-2 text-white focus:ring-2 focus:ring-indigo-500"
                    />
                 </div>
                 <div>
                    <label htmlFor="network" className="block text-sm font-medium text-gray-300 mb-1">Network</label>
                    <select
                        id="network"
                        value={network}
                        onChange={handleNetworkChange}
                        className="w-full bg-gray-800 border border-gray-600 rounded-md p-2 text-white focus:ring-2 focus:ring-indigo-500 appearance-none"
                    >
                        <option value="polygon-mainnet">Polygon Mainnet</option>
                        <option value="polygon-mumbai">Polygon Mumbai (Testnet)</option>
                    </select>
                </div>
            </div>

            <div className="relative flex py-3 items-center w-full max-w-2xl">
                <div className="flex-grow border-t border-gray-600"></div>
                <span className="flex-shrink mx-4 text-gray-400 text-sm">BATCH MINTING</span>
                <div className="flex-grow border-t border-gray-600"></div>
            </div>

            {/* --- CSV Uploader --- */}
            <div className="w-full max-w-2xl">
                <label htmlFor="csv-upload" className="block text-sm font-medium text-gray-300 mb-1">Upload Minting Data</label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-600 border-dashed rounded-md">
                    <div className="space-y-1 text-center">
                        <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true"><path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        <div className="flex text-sm text-gray-500">
                            <label htmlFor="csv-upload" className="relative cursor-pointer bg-gray-800 rounded-md font-medium text-indigo-400 hover:text-indigo-300 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-offset-gray-900 focus-within:ring-indigo-500 px-1">
                                <span>Upload a file</span>
                                <input id="csv-upload" name="csv-upload" type="file" className="sr-only" accept=".csv" onChange={handleFileChange} />
                            </label>
                            <p className="pl-1">or drag and drop</p>
                        </div>
                        <p className="text-xs text-gray-500">CSV file with 'token_id' and 'metadata_url' headers</p>
                        {fileName && <p className="text-xs text-green-400 mt-2">{fileName}</p>}
                    </div>
                </div>
            </div>
            
            {/* --- Data Preview & Mint Button --- */}
            {error && <p className="text-red-400 text-sm max-w-2xl text-center">{error}</p>}

            {parsedData.length > 0 && (
                <div className="w-full max-w-2xl flex flex-col items-center gap-4">
                    <div className="w-full bg-gray-900/40 p-3 rounded-lg max-h-60 overflow-y-auto">
                        <table className="w-full text-sm text-left">
                           <thead className="text-xs text-gray-300 uppercase bg-gray-700/50">
                                <tr>
                                    <th className="px-4 py-2">Token ID</th>
                                    <th className="px-4 py-2">Metadata URL</th>
                                </tr>
                           </thead>
                           <tbody>
                                {parsedData.map(row => (
                                    <tr key={row.tokenId} className="border-b border-gray-700">
                                        <td className="px-4 py-2 font-mono text-white">{row.tokenId}</td>
                                        <td className="px-4 py-2 font-mono text-cyan-400 truncate max-w-xs">{row.metadataUrl}</td>
                                    </tr>
                                ))}
                           </tbody>
                        </table>
                    </div>
                    <Tooltip text="This will initiate one transaction per row in your CSV file.">
                        <button 
                            onClick={handleMintCollection}
                            disabled={!walletAddress || !contractAddress || parsedData.length === 0}
                            className="w-full max-w-md bg-gradient-to-br from-purple-600 to-indigo-500 text-white font-bold py-3 px-6 rounded-md transition-all duration-300 ease-in-out shadow-lg shadow-indigo-500/20 hover:shadow-xl hover:shadow-indigo-500/40 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                        >
                            {walletAddress ? `Mint ${parsedData.length} NFTs` : 'Connect Wallet to Mint'}
                        </button>
                    </Tooltip>
                </div>
            )}
            
            {isMinting && (
                <MintingProgressModal 
                    {...mintingProgress}
                    onClose={() => setIsMinting(false)}
                    isFinished={isFinished}
                />
            )}
        </div>
    );
};

export default CollectionMinter;