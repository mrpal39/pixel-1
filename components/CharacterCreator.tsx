/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useRef, useCallback } from 'react';
import { Body, Hair, Eyes, Mouth } from '../CharacterAssets';
import { dataURLtoFile } from '../../App';
import Spinner from '../Spinner';

type Trait = { trait_type: string; value: string };

interface CharacterCreatorProps {
    onFinalize: (imageFile: File, traits: Trait[]) => void;
}

const hairOptions = Object.keys(Hair);
const eyesOptions = Object.keys(Eyes);
const mouthOptions = Object.keys(Mouth);

const CharacterCreator: React.FC<CharacterCreatorProps> = ({ onFinalize }) => {
    const [config, setConfig] = useState({
        skinColor: '#e0ac69',
        hairStyle: 'Spiky',
        hairColor: '#2c1e14',
        eyesStyle: 'Wide',
        mouthStyle: 'Smile',
    });
    const [isLoading, setIsLoading] = useState(false);
    const svgRef = useRef<SVGSVGElement>(null);

    const handleFinalize = useCallback(async () => {
        const svgNode = svgRef.current;
        if (!svgNode) return;

        setIsLoading(true);
        await new Promise(resolve => setTimeout(resolve, 100)); // Allow UI to update

        try {
            const svgData = new XMLSerializer().serializeToString(svgNode);
            const canvas = document.createElement('canvas');
            const size = 512;
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error("Could not get canvas context");
            
            const img = new Image();
            img.onload = () => {
                ctx.drawImage(img, 0, 0);
                URL.revokeObjectURL(img.src);
                const pngUrl = canvas.toDataURL('image/png');
                const file = dataURLtoFile(pngUrl, `character-${Date.now()}.png`);
                
                const traits: Trait[] = [
                    { trait_type: 'Hair Style', value: config.hairStyle },
                    { trait_type: 'Hair Color', value: config.hairColor },
                    { trait_type: 'Skin Color', value: config.skinColor },
                    { trait_type: 'Eyes', value: config.eyesStyle },
                    { trait_type: 'Mouth', value: config.mouthStyle },
                ];
                
                onFinalize(file, traits);
                setIsLoading(false);
            };
            img.onerror = (err) => {
                console.error("Failed to load SVG image for canvas conversion", err);
                setIsLoading(false);
            };
            // Use btoa for Base64 encoding. Handle potential special characters.
            const svgBase64 = btoa(unescape(encodeURIComponent(svgData)));
            img.src = `data:image/svg+xml;base64,${svgBase64}`;
        } catch (error) {
            console.error("Error finalizing character:", error);
            setIsLoading(false);
        }
    }, [config, onFinalize]);

    const HairComponent = Hair[config.hairStyle as keyof typeof Hair];
    const EyesComponent = Eyes[config.eyesStyle as keyof typeof Eyes];
    const MouthComponent = Mouth[config.mouthStyle as keyof typeof Mouth];

    const OptionButton: React.FC<{ name: string, options: string[], active: string, setter: (val: string) => void }> = 
        ({ name, options, active, setter }) => (
        <div className="mb-4">
            <h4 className="font-semibold text-gray-300 mb-2">{name}</h4>
            <div className="grid grid-cols-3 gap-2">
                {options.map(opt => (
                    <button key={opt} onClick={() => setter(opt)} className={`w-full text-center text-sm bg-white/10 border text-gray-200 font-semibold py-2 px-3 rounded-md transition-all duration-200 ease-in-out hover:bg-white/20 active:scale-95 ${active === opt ? 'border-blue-400' : 'border-transparent'}`}>
                        {opt}
                    </button>
                ))}
            </div>
        </div>
    );
    
    const ColorPicker: React.FC<{ name: string, color: string, setter: (val: string) => void }> =
        ({ name, color, setter }) => (
        <div className="mb-4">
            <h4 className="font-semibold text-gray-300 mb-2">{name}</h4>
            <input type="color" value={color} onChange={e => setter(e.target.value)} className="w-full h-10 p-1 bg-gray-700 border border-gray-600 rounded-md cursor-pointer"/>
        </div>
    );

    return (
        <div className="w-full bg-gray-800/50 border border-gray-700 rounded-lg p-4 flex flex-col md:flex-row items-start gap-6 animate-fade-in backdrop-blur-sm">
            {/* Left Side: Preview */}
            <div className="w-full md:w-1/2 flex flex-col items-center justify-center bg-gray-900/50 rounded-lg p-4 aspect-square">
                <svg ref={svgRef} width="100%" height="100%" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                    <Body color={config.skinColor} />
                    <HairComponent color={config.hairColor} />
                    <EyesComponent />
                    <MouthComponent />
                </svg>
            </div>

            {/* Right Side: Controls */}
            <div className="w-full md:w-1/2">
                <h3 className="text-lg font-bold text-center text-gray-200 mb-4">Character Customization</h3>
                <OptionButton name="Hair Style" options={hairOptions} active={config.hairStyle} setter={val => setConfig(c => ({...c, hairStyle: val}))} />
                <ColorPicker name="Hair Color" color={config.hairColor} setter={val => setConfig(c => ({...c, hairColor: val}))} />
                <ColorPicker name="Skin Color" color={config.skinColor} setter={val => setConfig(c => ({...c, skinColor: val}))} />
                <OptionButton name="Eyes" options={eyesOptions} active={config.eyesStyle} setter={val => setConfig(c => ({...c, eyesStyle: val}))} />
                <OptionButton name="Mouth" options={mouthOptions} active={config.mouthStyle} setter={val => setConfig(c => ({...c, mouthStyle: val}))} />
            </div>

            {/* Bottom: Finalize button */}
            <div className="w-full md:absolute md:bottom-4 md:right-4 md:w-auto">
                 <button 
                    onClick={handleFinalize}
                    disabled={isLoading}
                    className="w-full bg-gradient-to-br from-green-600 to-green-500 text-white font-bold py-4 px-8 text-lg rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-green-500/20 hover:shadow-xl hover:shadow-green-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner disabled:from-green-800 disabled:to-green-700 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
                >
                    {isLoading ? <><Spinner /> Finalizing...</> : 'Finalize Character'}
                </button>
            </div>
        </div>
    );
};

export default CharacterCreator;