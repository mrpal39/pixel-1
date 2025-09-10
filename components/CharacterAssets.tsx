/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';

// Each component represents a single layer/part of the character.
// They accept a `color` prop to allow dynamic coloring.
// They return SVG `<g>` (group) elements, which can be layered inside a single parent `<svg>`.

export const Body: React.FC<{ color: string }> = ({ color }) => (
  <g fill={color}>
    <path d="M50 35 C 40 35, 35 40, 35 50 L 35 85 C 35 95, 40 100, 50 100 C 60 100, 65 95, 65 85 L 65 50 C 65 40, 60 35, 50 35 Z" />
    <circle cx="50" cy="25" r="15" />
  </g>
);

export const Hair = {
    'Spiky': ({ color }: { color: string }) => (
        <g fill={color}>
            <path d="M50,10 L40,20 L45,15 L35,25 L40,20 L30,30 L50,22 L70,30 L60,20 L65,25 L55,15 L60,20 Z" />
        </g>
    ),
    'Wavy': ({ color }: { color: string }) => (
        <g fill={color}>
            <path d="M35 15 C 25 10, 25 30, 35 30 L 65 30 C 75 30, 75 10, 65 15 L 50 25 Z" />
        </g>
    ),
    'Bun': ({ color }: { color: string }) => (
        <g fill={color}>
            <path d="M38 18 C 35 15, 35 28, 40 28 L 60 28 C 65 28, 65 15, 62 18" />
            <circle cx="62" cy="15" r="5" />
        </g>
    ),
};

export const Eyes = {
    'Narrow': () => (
        <g fill="#000">
            <rect x="40" y="22" width="5" height="2" rx="1" />
            <rect x="55" y="22" width="5" height="2" rx="1" />
        </g>
    ),
    'Wide': () => (
        <g fill="#000">
            <circle cx="42" cy="24" r="2" />
            <circle cx="58" cy="24" r="2" />
        </g>
    ),
     'Cute': () => (
        <g stroke="#000" strokeWidth="0.5" fill="none">
            <path d="M40 23 C 41 25, 43 25, 44 23" />
            <path d="M56 23 C 57 25, 59 25, 60 23" />
        </g>
    ),
};

export const Mouth = {
    'Smile': () => (
        <g stroke="#000" strokeWidth="0.5" fill="none">
            <path d="M47 31 C 48 33, 52 33, 53 31" />
        </g>
    ),
    'Frown': () => (
        <g stroke="#000" strokeWidth="0.5" fill="none">
            <path d="M47 33 C 48 31, 52 31, 53 33" />
        </g>
    ),
    'Neutral': () => (
        <g fill="#000">
            <rect x="48" y="32" width="4" height="0.5" />
        </g>
    ),
};
