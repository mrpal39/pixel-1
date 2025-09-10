/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState } from 'react';
import StartScreen from '../components/StartScreen';
import GeneratePanel from '../components/home/GeneratePanel';
import CharacterCreator from '../components/home/CharacterCreator';
import CollectionPanel from '../components/home/CollectionPanel';
import { Trait } from '../App';

type Tab = 'generate' | 'character' | 'collection';

interface HomePageProps {
    onFileSelect: (files: FileList | null) => void;
    onGenerateImage: (prompt: string) => void;
    onCharacterFinalized: (imageFile: File, traits: Trait[]) => void;
    isLoading: boolean;
}

const HomePage: React.FC<HomePageProps> = ({
    onFileSelect,
    onGenerateImage,
    onCharacterFinalized,
    isLoading
}) => {
    const [activeTab, setActiveTab] = useState<Tab>('generate');
    const startTabs: Tab[] = ['generate', 'character', 'collection'];

    return (
        <div className="w-full max-w-4xl mx-auto flex flex-col items-center gap-6 animate-fade-in">
            <StartScreen onFileSelect={onFileSelect} />
            <div className="w-full bg-gray-800/80 border border-gray-700/80 rounded-lg p-2 grid grid-cols-3 items-center justify-center gap-2 backdrop-blur-sm">
            {startTabs.map(tab => (
                    <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`w-full capitalize font-semibold py-3 px-2 md:px-5 rounded-md transition-all duration-200 text-sm md:text-base ${
                        activeTab === tab 
                        ? 'bg-gradient-to-br from-blue-500 to-cyan-400 text-white shadow-lg shadow-cyan-500/40' 
                        : 'text-gray-300 hover:text-white hover:bg-white/10'
                    }`}
                >
                    {tab}
                </button>
            ))}
            </div>
            {activeTab === 'generate' && <GeneratePanel onGenerate={onGenerateImage} isLoading={isLoading} />}
            {activeTab === 'character' && <CharacterCreator onFinalize={onCharacterFinalized} />}
            {activeTab === 'collection' && <CollectionPanel />}
        </div>
    );
};

export default HomePage;
