/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { setIsLoading, setError, setHistoryState } from '../store/editorSlice';
import { setNftTraits } from '../store/uiSlice';
import * as geminiService from '../services/geminiService';

import StartScreen from '../components/StartScreen';
import GeneratePanel from '../components/home/GeneratePanel';
import CharacterCreator from '../components/home/CharacterCreator';
import CollectionPanel from '../components/home/CollectionPanel';
import CollectionMinter from '../components/home/CollectionMinter';
import { Trait, dataURLtoFile } from '../App';

type Tab = 'generate' | 'character' | 'collection' | 'minter';

const HomePage: React.FC = () => {
    const dispatch: AppDispatch = useDispatch();
    const navigate = useNavigate();
    const { isLoading } = useSelector((state: RootState) => state.editor);

    const [activeTab, setActiveTab] = useState<Tab>('generate');
    const startTabs: Tab[] = ['generate', 'character', 'collection', 'minter'];

    const handleFileSelect = useCallback((files: FileList | null) => {
      if (files && files[0]) {
          const file = files[0];
          dispatch(setHistoryState({ history: [file], historyIndex: 0 }));
          navigate('/editor');
      }
    }, [dispatch, navigate]);

    const handleGenerateImage = useCallback(async (prompt: string) => {
        dispatch(setIsLoading(true));
        dispatch(setError(null));
        try {
            const generatedImageUrl = await geminiService.generateImageFromText(prompt);
            const newImageFile = dataURLtoFile(generatedImageUrl, `generated-${Date.now()}.png`);
            dispatch(setHistoryState({ history: [newImageFile], historyIndex: 0 }));
            navigate('/editor');
        } catch (err) {
            dispatch(setError(err instanceof Error ? err.message : 'An unknown error occurred.'));
        } finally {
            dispatch(setIsLoading(false));
        }
    }, [dispatch, navigate]);

    const handleCharacterFinalized = useCallback((imageFile: File, traits: Trait[]) => {
      dispatch(setNftTraits(traits));
      dispatch(setHistoryState({ history: [imageFile], historyIndex: 0 }));
      navigate('/editor');
    }, [dispatch, navigate]);

    return (
        <div className="w-full max-w-4xl mx-auto flex flex-col items-center gap-6 animate-fade-in">
            <StartScreen onFileSelect={handleFileSelect} />
            <div className="w-full bg-gray-800/80 border border-gray-700/80 rounded-lg p-2 grid grid-cols-2 md:grid-cols-4 items-center justify-center gap-2 backdrop-blur-sm">
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
            {activeTab === 'generate' && <GeneratePanel onGenerate={handleGenerateImage} isLoading={isLoading} />}
            {activeTab === 'character' && <CharacterCreator onFinalize={handleCharacterFinalized} />}
            {activeTab === 'collection' && <CollectionPanel />}
            {activeTab === 'minter' && <CollectionMinter />}
        </div>
    );
};

export default HomePage;