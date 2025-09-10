/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import { Body, Hair, Eyes, Mouth } from './CharacterAssets';

type CharacterConfig = {
    skinColor: string;
    hairStyle: string;
    hairColor: string;
    eyesStyle: string;
    mouthStyle: string;
};

interface CharacterThumbnailProps {
    config: CharacterConfig;
}

const CharacterThumbnail: React.FC<CharacterThumbnailProps> = ({ config }) => {
    const HairComponent = Hair[config.hairStyle as keyof typeof Hair];
    const EyesComponent = Eyes[config.eyesStyle as keyof typeof Eyes];
    const MouthComponent = Mouth[config.mouthStyle as keyof typeof Mouth];

    return (
        <div className="w-full aspect-square bg-gray-800 rounded-md overflow-hidden border-2 border-transparent hover:border-blue-500 transition-colors">
            <svg width="100%" height="100%" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                <Body color={config.skinColor} />
                <HairComponent color={config.hairColor} />
                <EyesComponent />
                <MouthComponent />
            </svg>
        </div>
    );
};

// Memoize the component to prevent unnecessary re-renders in large collections
export default React.memo(CharacterThumbnail);
