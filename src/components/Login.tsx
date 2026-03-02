import React, { useState } from 'react';
import { useYNAB } from '../contexts/YNABContext';
import { KeyRound, ArrowRight } from 'lucide-react';

export const Login: React.FC = () => {
    const { login, isLoading, error } = useYNAB();
    const [token, setToken] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (token.trim()) {
            await login(token.trim());
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
            <div className="glass-panel p-8 max-w-md w-full relative overflow-hidden">
                {/* Decorative background glow */}
                <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary opacity-20 rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-secondary opacity-20 rounded-full blur-3xl pointer-events-none"></div>

                <div className="relative z-10">
                    <div className="flex justify-center mb-6">
                        <div className="p-4 bg-primary/20 text-primary rounded-2xl">
                            <KeyRound size={32} />
                        </div>
                    </div>
                    <h1 className="text-3xl font-bold text-center mb-2">YNAB Analytics</h1>
                    <p className="text-secondary text-center mb-8">
                        Connect your YNAB account using a Personal Access Token to view your financial insights.
                    </p>

                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <div className="flex flex-col gap-2">
                            <label htmlFor="token" className="text-sm font-medium text-text-secondary">
                                Personal Access Token
                            </label>
                            <input
                                id="token"
                                type="password"
                                placeholder="Enter your token..."
                                value={token}
                                onChange={(e) => setToken(e.target.value)}
                                required
                                className="w-full"
                                autoComplete="off"
                            />
                        </div>

                        {error && (
                            <div className="p-3 bg-error/10 border border-error/20 text-error rounded-lg text-sm">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading || !token}
                            className="btn btn-primary mt-4 py-3 text-lg relative overflow-hidden group"
                        >
                            {isLoading ? (
                                <div className="spinner"></div>
                            ) : (
                                <>
                                    Connect Accont
                                    <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center text-xs text-text-tertiary">
                        Your token is stored safely in your browser's local storage and used only to fetch data from the official YNAB API.
                        <br />
                        <a href="https://app.youneedabudget.com/settings/developer" target="_blank" rel="noopener noreferrer" className="inline-block mt-2 hover:underline">
                            Get your token from YNAB Developer Settings
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};
