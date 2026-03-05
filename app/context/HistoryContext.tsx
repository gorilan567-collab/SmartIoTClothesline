import React, { createContext, useState, ReactNode } from 'react';

type HistoryEvent = {
    id: string;
    time: string;
    event: string;
    temp: number;
    light: number;
    fanOn: boolean;
};

type HistoryContextType = {
    history: HistoryEvent[];
    addHistoryEvent: (event: string, temp: number, light: number, fanOn: boolean) => void;
    clearHistory: () => void;
};

export const HistoryContext = createContext<HistoryContextType | undefined>(undefined);

// Helper info to get current time string
const getTimeString = () => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
};

export const HistoryProvider = ({ children }: { children: ReactNode }) => {
    const [history, setHistory] = useState<HistoryEvent[]>([]);

    const addHistoryEvent = (event: string, temp: number, light: number, fanOn: boolean) => {
        setHistory(prevHistory => {
            const newEntry = {
                id: Math.random().toString(36).substring(7),
                time: getTimeString(),
                event: event,
                temp: temp,
                light: light,
                fanOn: fanOn
            };
            return [newEntry, ...prevHistory].slice(0, 10);
        });
    };

    const clearHistory = () => {
        setHistory([]);
    };

    return (
        <HistoryContext.Provider value={{ history, addHistoryEvent, clearHistory }}>
            {children}
        </HistoryContext.Provider>
    );
};
