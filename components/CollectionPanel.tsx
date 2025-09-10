/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useMemo } from 'react';
import JSZip from 'jszip';
import { Hair, Eyes, Mouth } from './CharacterAssets';
import CharacterThumbnail from './CharacterThumbnail';
import Spinner from './Spinner';

// --- Type Definitions ---
type Trait = { trait_type: string; value: string };
type CharacterConfig = {
    skinColor: string;
    hairStyle: string;
    hairColor: string;
    eyesStyle: string;
    mouthStyle: string;
};
type GeneratedCharacter = {
    id: number;
    config: CharacterConfig;
    traits: Trait[];
};
type RarityData = {
    [traitType: string]: {
        [value: string]: number;
    };
};

// --- Trait and Color Options ---
const hairOptions = Object.keys(Hair);
const eyesOptions = Object.keys(Eyes);
const mouthOptions = Object.keys(Mouth);
const skinColors = ['#f2d5a3', '#e0ac69', '#c68642', '#8d5524', '#5a3825', '#3c241e'];
const hairColors = ['#090806', '#2c1e14', '#59382e', '#a36e4f', '#f9d3a0', '#dcdcdc', '#e4032fff'];

// --- Helper Functions ---
const getRandomElement = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const generateCharacterConfig = (): CharacterConfig => ({
    skinColor: getRandomElement(skinColors),
    hairStyle: getRandomElement(hairOptions),
    hairColor: getRandomElement(hairColors),
    eyesStyle: getRandomElement(eyesOptions),
    mouthStyle: getRandomElement(mouthOptions),
});

const configToTraits = (config: CharacterConfig): Trait[] => [
    { trait_type: 'Hair Style', value: config.hairStyle },
    { trait_type: 'Hair Color', value: config.hairColor },
    { trait_type: 'Skin Color', value: config.skinColor },
    { trait_type: 'Eyes', value: config.eyesStyle },
    { trait_type: 'Mouth', value: config.mouthStyle },
];

const CollectionPanel: React.FC = () => {
    const [collectionSize, setCollectionSize] = useState(10);
    const [collection, setCollection] = useState<GeneratedCharacter[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [collectionName, setCollectionName] = useState('Pixshop Characters');

    const handleGenerateCollection = () => {
        setIsLoading(true);
        // Use a timeout to allow the loading spinner to render before the blocking generation loop
        setTimeout(() => {
            const newCollection: GeneratedCharacter[] = [];
            for (let i = 1; i <= collectionSize; i++) {
                const config = generateCharacterConfig();
                const traits = configToTraits(config);
                newCollection.push({ id: i, config, traits });
            }
            setCollection(newCollection);
            setIsLoading(false);
        }, 50);
    };

    const rarityData: RarityData = useMemo(() => {
        if (collection.length === 0) return {};
        const counts: RarityData = {};
        collection.forEach(char => {
            char.traits.forEach(trait => {
                if (!counts[trait.trait_type]) {
                    counts[trait.trait_type] = {};
                }
                if (!counts[trait.trait_type][trait.value]) {
                    counts[trait.trait_type][trait.value] = 0;
                }
                counts[trait.trait_type][trait.value]++;
            });
        });
        return counts;
    }, [collection]);

    const handleExportMetadata = async () => {
        const zip = new JSZip();
        
        collection.forEach(character => {
            const metadata = {
                name: `${collectionName} #${character.id}`,
                description: `A unique character from the ${collectionName} collection.`,
                image: `ipfs://YOUR_IMAGE_CID_HERE/${character.id}.png`, // Placeholder
                attributes: character.traits,
            };
            zip.file(`${character.id}.json`, JSON.stringify(metadata, null, 2));
        });

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(zipBlob);
        link.download = `${collectionName.replace(/\s+/g, '_')}_metadata.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    };

    return (
        <div className="w-full bg-gray-800/50 border border-gray-700 rounded-lg p-6 flex flex-col items-center gap-6 animate-fade-in backdrop-blur-sm">
            <h3 className="text-2xl font-bold text-gray-100">NFT Collection Generator</h3>

            {/* --- Generation Controls --- */}
            <div className="w-full max-w-2xl bg-gray-900/40 p-4 rounded-lg flex flex-col md:flex-row items-center gap-4">
                <div className="flex-1 w-full">
                    <label htmlFor="collectionName" className="block text-sm font-medium text-gray-300 mb-1">Collection Name</label>
                    <input
                        type="text"
                        id="collectionName"
                        value={collectionName}
                        onChange={(e) => setCollectionName(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-600 rounded-md p-2 text-white focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
                 <div className="flex-1 w-full">
                    <label htmlFor="collectionSize" className="block text-sm font-medium text-gray-300 mb-1">Collection Size</label>
                    <input
                        type="number"
                        id="collectionSize"
                        value={collectionSize}
                        onChange={(e) => setCollectionSize(Math.max(1, parseInt(e.target.value, 10)) || 1)}
                        className="w-full bg-gray-800 border border-gray-600 rounded-md p-2 text-white focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
                <button
                    onClick={handleGenerateCollection}
                    disabled={isLoading}
                    className="w-full md:w-auto mt-2 md:mt-0 md:self-end bg-gradient-to-br from-blue-600 to-blue-500 text-white font-bold py-2 px-6 rounded-md transition-all duration-300 ease-in-out shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/40 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {isLoading ? <Spinner/> : 'Generate Collection'}
                </button>
            </div>

            {/* --- Results Display --- */}
            {isLoading && (
                 <div className="flex flex-col items-center justify-center gap-4 py-16">
                    <Spinner />
                    <p className="text-gray-300">Generating {collectionSize} characters...</p>
                </div>
            )}
            
            {!isLoading && collection.length > 0 && (
                <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
                    {/* Character Grid */}
                    <div className="lg:col-span-2 bg-gray-900/40 p-4 rounded-lg">
                        <h4 className="text-xl font-semibold text-white mb-4">Generated Characters ({collection.length})</h4>
                        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 max-h-[60vh] overflow-y-auto pr-2">
                            {collection.map(char => (
                                <CharacterThumbnail key={char.id} config={char.config} />
                            ))}
                        </div>
                    </div>

                    {/* Rarity Report */}
                    <div className="lg:col-span-1 bg-gray-900/40 p-4 rounded-lg">
                         <h4 className="text-xl font-semibold text-white mb-4">Rarity Report</h4>
                         <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                             {Object.entries(rarityData).map(([traitType, values]) => (
                                 <div key={traitType}>
                                     <h5 className="font-bold text-gray-200">{traitType}</h5>
                                     <ul className="text-sm space-y-1 mt-1">
                                         {Object.entries(values).sort(([, a], [, b]) => a - b).map(([value, count]) => (
                                             <li key={value} className="flex justify-between items-center bg-gray-800/50 px-2 py-1 rounded">
                                                 <span className="text-gray-300">{value}</span>
                                                 <span className="font-mono text-gray-400">{count} ({(count / collection.length * 100).toFixed(1)}%)</span>
                                             </li>
                                         ))}
                                     </ul>
                                 </div>
                             ))}
                         </div>
                         <button
                            onClick={handleExportMetadata}
                            className="w-full mt-6 bg-gradient-to-br from-green-600 to-green-500 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-green-500/20 hover:shadow-xl hover:shadow-green-500/40 active:scale-95"
                         >
                            Export Metadata (.zip)
                         </button>
                    </div>
                </div>
            )}

        </div>
    );
};

export default CollectionPanel;
