/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { configureStore } from '@reduxjs/toolkit';
import editorReducer from './editorSlice';
import walletReducer from './walletSlice';
import nftsReducer from './nftsSlice';
import uiReducer from './uiSlice';

export const store = configureStore({
  reducer: {
    editor: editorReducer,
    wallet: walletReducer,
    nfts: nftsReducer,
    ui: uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      // We are storing File objects in the editor history, which are non-serializable.
      // This is generally not recommended, but we are handling it carefully.
      serializableCheck: false,
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
