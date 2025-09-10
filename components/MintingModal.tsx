/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState } from 'react';
import Spinner from './Spinner';
import Tooltip from './Tooltip';

interface Trait {
  trait_type: string;
  value: string;
}

interface MintingModalProps {
  imageUrl: string;
  onClose: () => void;
  onMint: (metadata: { title: string, description: string, properties: Trait[], royalties: number }) => void;
  isLoading: boolean;
  initialProperties?: Trait[];
}

const MintingModal: React.FC<MintingModalProps> = ({ imageUrl, onClose, onMint, isLoading, initialProperties }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [properties, setProperties] = useState<Trait[]>(initialProperties || []);
  const [royalties, setRoyalties] = useState(5);

  const handleAddProperty = () => {
    setProperties([...properties, { trait_type: '', value: '' }]);
  };

  const handleRemoveProperty = (index: number) => {
    const newProperties = properties.filter((_, i) => i !== index);
    setProperties(newProperties);
  };

  const handlePropertyChange = (index: number, field: 'trait_type' | 'value', text: string) => {
    const newProperties = [...properties];
    newProperties[index][field] = text;
    setProperties(newProperties);
  };
  
  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      onMint({ title, description, properties, royalties });
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div 
        className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col md:flex-row gap-6 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {isLoading && (
            <div className="absolute inset-0 bg-gray-800/80 z-30 flex flex-col items-center justify-center gap-4 animate-fade-in rounded-xl">
                <Spinner />
                <p className="text-gray-300 text-lg">Minting your NFT...</p>
                <p className="text-gray-400 text-sm">Please confirm the transaction in your wallet.</p>
            </div>
        )}

        {/* Left Side: Image Preview */}
        <div className="w-full md:w-1/2 flex-shrink-0">
          <h2 className="text-2xl font-bold text-white mb-4">Mint Your NFT</h2>
          <img src={imageUrl} alt="Artwork to mint" className="w-full rounded-lg aspect-square object-cover" />
        </div>

        {/* Right Side: Metadata Form */}
        <form onSubmit={handleSubmit} className="w-full md:w-1/2 flex flex-col gap-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-1">Title</label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., 'Cybernetic Sunset'"
              className="w-full bg-gray-900 border border-gray-600 rounded-md p-2 text-white focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-1">Description</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="A brief description of your artwork."
              className="w-full bg-gray-900 border border-gray-600 rounded-md p-2 text-white focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Properties / Traits</label>
            <div className="space-y-2">
              {properties.map((prop, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={prop.trait_type}
                    onChange={(e) => handlePropertyChange(index, 'trait_type', e.target.value)}
                    placeholder="Trait Name"
                    className="w-1/2 bg-gray-700 border border-gray-600 rounded-md p-2 text-white text-sm"
                  />
                  <input
                    type="text"
                    value={prop.value}
                    onChange={(e) => handlePropertyChange(index, 'value', e.target.value)}
                    placeholder="Value"
                    className="w-1/2 bg-gray-700 border border-gray-600 rounded-md p-2 text-white text-sm"
                  />
                  <Tooltip text="Remove this property">
                    <button type="button" onClick={() => handleRemoveProperty(index)} className="text-red-400 hover:text-red-300 p-1 font-mono text-xl leading-none">&times;</button>
                  </Tooltip>
                </div>
              ))}
            </div>
            <Tooltip text="Add a custom trait to your NFT's metadata (e.g., 'Background: Blue').">
                <button type="button" onClick={handleAddProperty} className="text-sm text-indigo-400 hover:text-indigo-300 mt-2">+ Add Property</button>
            </Tooltip>
          </div>

          <div>
            <label htmlFor="royalties" className="block text-sm font-medium text-gray-300 mb-1">
              Creator Royalties ({royalties}%)
            </label>
            <Tooltip text="Set the percentage you'll earn from secondary sales of this NFT.">
                <input
                  type="range"
                  id="royalties"
                  min="0"
                  max="15"
                  step="1"
                  value={royalties}
                  onChange={(e) => setRoyalties(Number(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
            </Tooltip>
          </div>

          <div className="flex-grow"></div>

          <div className="flex items-center justify-end gap-3 mt-4">
            <button type="button" onClick={onClose} className="bg-gray-600 text-white font-bold py-2 px-4 rounded-md hover:bg-gray-500 transition-colors">
              Cancel
            </button>
            <Tooltip text="This will initiate a transaction in your wallet to mint the NFT.">
                <button
                  type="submit"
                  disabled={!title}
                  className="bg-gradient-to-br from-purple-600 to-indigo-500 text-white font-bold py-2 px-6 rounded-md transition-all duration-300 ease-in-out shadow-lg shadow-indigo-500/20 hover:shadow-xl hover:shadow-indigo-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner disabled:from-indigo-800 disabled:to-indigo-700 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
                >
                  Mint NFT
                </button>
            </Tooltip>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MintingModal;
