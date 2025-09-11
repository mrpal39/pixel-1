/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface EditorState {
  history: File[];
  historyIndex: number;
  isLoading: boolean;
  error: string | null;
}

const initialState: EditorState = {
  history: [],
  historyIndex: -1,
  isLoading: true, // App starts in a loading state to check for sessions/wallet
  error: null,
};

const editorSlice = createSlice({
  name: 'editor',
  initialState,
  reducers: {
    setHistoryState(state, action: PayloadAction<{ history: File[], historyIndex: number }>) {
        state.history = action.payload.history;
        state.historyIndex = action.payload.historyIndex;
    },
    setHistory(state, action: PayloadAction<File[]>) {
        state.history = action.payload;
    },
    setHistoryIndex(state, action: PayloadAction<number>) {
        state.historyIndex = action.payload;
    },
    addImageToHistory(state, action: PayloadAction<File>) {
        const newHistory = state.history.slice(0, state.historyIndex + 1);
        newHistory.push(action.payload);
        state.history = newHistory;
        state.historyIndex = newHistory.length - 1;
    },
    resetHistory(state) {
        state.history = [];
        state.historyIndex = -1;
    },
    setIsLoading(state, action: PayloadAction<boolean>) {
        state.isLoading = action.payload;
    },
    setError(state, action: PayloadAction<string | null>) {
        state.error = action.payload;
    },
  },
});

export const { 
    setHistoryState, 
    setHistory, 
    setHistoryIndex, 
    addImageToHistory, 
    resetHistory, 
    setIsLoading, 
    setError 
} = editorSlice.actions;

export default editorSlice.reducer;
