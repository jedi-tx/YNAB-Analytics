import React, { useState, useRef, useEffect } from 'react';
import { format, subDays, subMonths, startOfMonth, endOfMonth, startOfYear } from 'date-fns';
import { Calendar } from 'lucide-react';

export interface DateRange {
    startDate: Date;
    endDate: Date;
    label: string;
}

interface Props {
    value: DateRange;
    onChange: (range: DateRange) => void;
}

const PRESETS: { label: string; getRange: () => Omit<DateRange, 'label'> }[] = [
    { label: 'Last 7 Days', getRange: () => ({ startDate: subDays(new Date(), 7), endDate: new Date() }) },
    { label: 'Last 30 Days', getRange: () => ({ startDate: subDays(new Date(), 30), endDate: new Date() }) },
    { label: 'Last 90 Days', getRange: () => ({ startDate: subDays(new Date(), 90), endDate: new Date() }) },
    { label: 'This Month', getRange: () => ({ startDate: startOfMonth(new Date()), endDate: new Date() }) },
    { label: 'Last Month', getRange: () => ({ startDate: startOfMonth(subMonths(new Date(), 1)), endDate: endOfMonth(subMonths(new Date(), 1)) }) },
    { label: 'Year to Date', getRange: () => ({ startDate: startOfYear(new Date()), endDate: new Date() }) },
    { label: 'Last 12 Months', getRange: () => ({ startDate: subMonths(new Date(), 12), endDate: new Date() }) },
];

export const DateRangePicker: React.FC<Props> = ({ value, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [customStart, setCustomStart] = useState(format(value.startDate, 'yyyy-MM-dd'));
    const [customEnd, setCustomEnd] = useState(format(value.endDate, 'yyyy-MM-dd'));
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectPreset = (preset: typeof PRESETS[0]) => {
        const range = preset.getRange();
        onChange({ ...range, label: preset.label });
        setCustomStart(format(range.startDate, 'yyyy-MM-dd'));
        setCustomEnd(format(range.endDate, 'yyyy-MM-dd'));
        setIsOpen(false);
    };

    const applyCustom = () => {
        const start = new Date(customStart);
        const end = new Date(customEnd);
        if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && start <= end) {
            onChange({
                startDate: start,
                endDate: end,
                label: `${format(start, 'MMM d, yyyy')} – ${format(end, 'MMM d, yyyy')}`
            });
            setIsOpen(false);
        }
    };

    return (
        <div ref={ref} style={{ position: 'relative' }}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '8px 14px', borderRadius: '8px',
                    backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)',
                    color: 'var(--text-primary)', fontSize: '0.85rem', cursor: 'pointer',
                    transition: 'border-color 0.2s',
                }}
            >
                <Calendar size={16} />
                {value.label}
            </button>

            {isOpen && (
                <div style={{
                    position: 'absolute', top: '100%', left: 0, marginTop: '6px', zIndex: 50,
                    backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border)',
                    borderRadius: '12px', boxShadow: 'var(--shadow-lg)',
                    padding: '16px', minWidth: '280px',
                }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em' }}>Presets</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: '16px' }}>
                        {PRESETS.map((p) => (
                            <button
                                key={p.label}
                                onClick={() => selectPreset(p)}
                                style={{
                                    padding: '8px 12px', borderRadius: '6px', textAlign: 'left',
                                    fontSize: '0.85rem', cursor: 'pointer',
                                    backgroundColor: value.label === p.label ? 'rgba(94,92,230,0.15)' : 'transparent',
                                    color: value.label === p.label ? 'var(--primary)' : 'var(--text-secondary)',
                                    fontWeight: value.label === p.label ? '600' : '400',
                                }}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>

                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em' }}>Custom Range</p>
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                            <input
                                type="date"
                                value={customStart}
                                onChange={(e) => setCustomStart(e.target.value)}
                                style={{ flex: 1, padding: '6px 8px', fontSize: '0.8rem', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                            />
                            <input
                                type="date"
                                value={customEnd}
                                onChange={(e) => setCustomEnd(e.target.value)}
                                style={{ flex: 1, padding: '6px 8px', fontSize: '0.8rem', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                            />
                        </div>
                        <button
                            onClick={applyCustom}
                            style={{
                                width: '100%', padding: '8px', borderRadius: '6px',
                                backgroundColor: 'var(--primary)', color: 'white',
                                fontSize: '0.85rem', fontWeight: '500', cursor: 'pointer',
                            }}
                        >
                            Apply
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
