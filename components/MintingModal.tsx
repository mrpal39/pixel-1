/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState } from 'react';
import Spinner from './Spinner';
import Tooltip from './Tooltip';
import { MintingStatus, Trait } from '../App';
import { ExternalLinkIcon } from './icons';

interface MintingModalProps {
  imageUrl: string;
  onClose: () => void;
  onMint: (metadata: { title: string, description: string, properties: Trait[] }, setStatus: (status: MintingStatus) => void) => void;
  initialProperties?: Trait[];
}

const MintingModal: React.FC<MintingModalProps> = ({ imageUrl, onClose, onMint, initialProperties }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [properties, setProperties] = useState<Trait[]>(initialProperties || []);
  const [status, setStatus] = useState<MintingStatus>({ step: 'idle', message: '' });

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
      // The onMint function is now responsible for the entire async process
      // and will update the status via the setStatus callback.
      onMint({ title, description, properties }, setStatus);
  }

  const renderContent = () => {
    switch (status.step) {
      case 'network':
      case 'uploading':
      case 'confirming':
      case 'minting':
        return (
          <div className="absolute inset-0 bg-gray-800/90 z-30 flex flex-col items-center justify-center gap-4 animate-fade-in rounded-xl text-center p-4">
              <Spinner />
              <p className="text-gray-200 text-lg font-semibold capitalize">{status.step}...</p>
              <p className="text-gray-400 text-sm max-w-sm break-words">{status.message}</p>
          </div>
        );
      
      case 'success':
        return (
          <div className="absolute inset-0 bg-gray-800/90 z-30 flex flex-col items-center justify-center gap-4 animate-fade-in rounded-xl text-center p-6">
              <h2 className="text-3xl font-bold text-green-400">Mint Successful!</h2>
              <p className="text-gray-300">{status.message}</p>
              {status.txHash && (
                <a 
                  href={`https://mumbai.polygonscan.com/tx/${status.txHash}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="mt-2 flex items-center gap-2 bg-blue-500/20 text-blue-300 font-semibold py-2 px-4 rounded-lg hover:bg-blue-500/40 transition-colors"
                >
                  View on PolygonScan <ExternalLinkIcon className="w-4 h-4" />
                </a>
              )}
              <button onClick={onClose} className="mt-4 bg-gray-600 text-white font-bold py-2 px-6 rounded-md hover:bg-gray-500 transition-colors">
                Close
              </button>
          </div>
        );
        
      case 'error':
        return (
          <div className="absolute inset-0 bg-gray-800/90 z-30 flex flex-col items-center justify-center gap-4 animate-fade-in rounded-xl text-center p-6">
              <h2 className="text-3xl font-bold text-red-400">Minting Failed</h2>
              <p className="text-red-300 max-w-md">{status.message}</p>
              <button onClick={() => setStatus({ step: 'idle', message: '' })} className="mt-4 bg-gray-600 text-white font-bold py-2 px-6 rounded-md hover:bg-gray-500 transition-colors">
                Try Again
              </button>
          </div>
        );

      case 'idle':
      default:
        return (
        <>
            {/* Left Side: Image Preview */}
            <div className="w-full md:w-1/2 flex-shrink-0">
              <h2 className="text-2xl font-bold text-white mb-4">Mint Your NFT</h2>
              <img src={imageUrl} alt="Artwork to mint" className="w-full rounded-lg aspect-square object-cover bg-gray-900" />
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
                <div className="space-y-2 max-h-32 overflow-y-auto pr-2">
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
                        <button type="button" onClick={() => handleRemoveProperty(index)} className="text-red-400 hover:text-red-300 p-1 font-mono text-xl leading-none flex-shrink-0">&times;</button>
                      </Tooltip>
                    </div>
                  ))}
                </div>
                <Tooltip text="Add a custom trait to your NFT's metadata (e.g., 'Background: Blue').">
                    <button type="button" onClick={handleAddProperty} className="text-sm text-indigo-400 hover:text-indigo-300 mt-2">+ Add Property</button>
                </Tooltip>
              </div>

              <div className="flex-grow"></div>

              <div className="flex items-center justify-end gap-3 mt-4">
                <button type="button" onClick={onClose} className="bg-gray-600 text-white font-bold py-3 px-5 rounded-md hover:bg-gray-500 transition-colors">
                  Cancel
                </button>
                <Tooltip text="This will initiate a transaction in your wallet to mint the NFT.">
                    <button
                      type="submit"
                      disabled={!title.trim()}
                      className="bg-gradient-to-br from-purple-600 to-indigo-500 text-white font-bold py-3 px-6 rounded-md transition-all duration-300 ease-in-out shadow-lg shadow-indigo-500/20 hover:shadow-xl hover:shadow-indigo-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner disabled:from-indigo-800 disabled:to-indigo-700 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
                    >
                      Mint NFT
                    </button>
                </Tooltip>
              </div>
            </form>
        </>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" onClick={status.step === 'idle' ? onClose : undefined}>
      <div 
        className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col md:flex-row gap-6 p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {renderContent()}
      </div>
    </div>
  );
};

export default MintingModal;
