import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';

export interface SelectOption {
    id: string;
    label: string;
    group?: string;
}

interface Props {
    label: string;
    options: SelectOption[];
    selected: string[];
    onChange: (selected: string[]) => void;
    maxDisplayItems?: number;
}

export const MultiSelect: React.FC<Props> = ({ label, options, selected, onChange, maxDisplayItems = 2 }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filtered = options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()));
    const allSelected = selected.length === options.length;

    const toggleAll = () => {
        onChange(allSelected ? [] : options.map(o => o.id));
    };

    const toggleItem = (id: string) => {
        onChange(selected.includes(id) ? selected.filter(s => s !== id) : [...selected, id]);
    };

    const displayText = () => {
        if (allSelected || selected.length === 0) return `All ${label}`;
        if (selected.length <= maxDisplayItems) {
            return selected.map(id => options.find(o => o.id === id)?.label || id).join(', ');
        }
        return `${selected.length} ${label} selected`;
    };

    // Group options
    const groups = new Map<string, SelectOption[]>();
    filtered.forEach(o => {
        const g = o.group || '';
        if (!groups.has(g)) groups.set(g, []);
        groups.get(g)!.push(o);
    });

    return (
        <div ref={ref} style={{ position: 'relative' }}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '8px 14px', borderRadius: '8px',
                    backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)',
                    color: 'var(--text-primary)', fontSize: '0.85rem', cursor: 'pointer',
                    maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}
            >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayText()}</span>
                <ChevronDown size={14} style={{ flexShrink: 0 }} />
            </button>

            {isOpen && (
                <div style={{
                    position: 'absolute', top: '100%', left: 0, marginTop: '6px', zIndex: 50,
                    backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border)',
                    borderRadius: '12px', boxShadow: 'var(--shadow-lg)',
                    padding: '12px', minWidth: '260px', maxHeight: '360px', display: 'flex', flexDirection: 'column',
                }}>
                    {/* Search */}
                    <div style={{ position: 'relative', marginBottom: '8px' }}>
                        <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                        <input
                            type="text"
                            placeholder={`Search ${label}...`}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            style={{
                                width: '100%', padding: '8px 10px 8px 32px', fontSize: '0.8rem',
                                borderRadius: '6px', backgroundColor: 'var(--bg-surface)',
                                border: '1px solid var(--border)', color: 'var(--text-primary)',
                            }}
                        />
                    </div>

                    {/* Select All */}
                    <button
                        onClick={toggleAll}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            padding: '6px 8px', borderRadius: '4px', fontSize: '0.8rem',
                            color: 'var(--primary)', cursor: 'pointer', marginBottom: '4px',
                            fontWeight: '500',
                        }}
                    >
                        {allSelected ? 'Deselect All' : 'Select All'}
                    </button>

                    {/* Options */}
                    <div style={{ overflowY: 'auto', flex: 1 }}>
                        {[...groups].map(([group, items]) => (
                            <div key={group}>
                                {group && (
                                    <p style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', padding: '6px 8px 2px', letterSpacing: '0.05em' }}>{group}</p>
                                )}
                                {items.map(opt => {
                                    const isChecked = selected.includes(opt.id);
                                    return (
                                        <button
                                            key={opt.id}
                                            onClick={() => toggleItem(opt.id)}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '8px', width: '100%',
                                                padding: '6px 8px', borderRadius: '4px', fontSize: '0.8rem',
                                                cursor: 'pointer', textAlign: 'left',
                                                color: isChecked ? 'var(--text-primary)' : 'var(--text-secondary)',
                                                backgroundColor: isChecked ? 'rgba(94,92,230,0.08)' : 'transparent',
                                            }}
                                        >
                                            <div style={{
                                                width: '16px', height: '16px', borderRadius: '3px', flexShrink: 0,
                                                border: isChecked ? 'none' : '1px solid var(--border)',
                                                backgroundColor: isChecked ? 'var(--primary)' : 'transparent',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            }}>
                                                {isChecked && <Check size={11} color="white" />}
                                            </div>
                                            {opt.label}
                                        </button>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
