import React, { useState } from 'react';
import {
    Modal, View, Text, TouchableOpacity,
    ScrollView, StyleSheet, Dimensions,
} from 'react-native';
import { Colors } from '../constants/theme';
import { ChevronLeft, ChevronRight, X, Calendar as CalendarIcon } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height: SCREEN_H } = Dimensions.get('window');
// Fixed height so flex:1 on the content area has a determined parent
const SHEET_H = Math.round(SCREEN_H * 0.83);
const PAD = 24;
const CONTENT_W = width - PAD * 2;
const GRID_CELL_W = Math.floor((CONTENT_W - 24) / 3);
const CAL_CELL = Math.floor((CONTENT_W - 24) / 7);

const MS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MF = ['January','February','March','April','May','June','July',
            'August','September','October','November','December'];
const DH = ['S','M','T','W','T','F','S'];

const _today = new Date();
_today.setHours(0, 0, 0, 0);
const TODAY_MS = _today.getTime();

// ─── helpers ─────────────────────────────────────────────────────────────────
const sameDay = (a, b) =>
    a && b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

const between = (d, lo, hi) =>
    lo && hi && d.getTime() > lo.getTime() && d.getTime() < hi.getTime();

const buildCells = (year, month) => {
    const dim  = new Date(year, month + 1, 0).getDate();
    const fd   = new Date(year, month, 1).getDay();
    const pdim = new Date(year, month, 0).getDate();
    const cells = [];
    for (let i = fd - 1; i >= 0; i--)
        cells.push({ day: pdim - i, inMonth: false, date: new Date(year, month - 1, pdim - i) });
    for (let d = 1; d <= dim; d++)
        cells.push({ day: d, inMonth: true, date: new Date(year, month, d) });
    const rem = 42 - cells.length;
    for (let d = 1; d <= rem; d++)
        cells.push({ day: d, inMonth: false, date: new Date(year, month + 1, d) });
    return cells;
};

// ─── CalGrid – standalone so it never remounts ───────────────────────────────
function CalGrid({ cells, onPress, selDay, from, to }) {
    const hasRange = from && to && !sameDay(from, to);
    return (
        <>
            {Array.from({ length: 6 }, (_, r) => (
                <View key={r} style={st.calRow}>
                    {cells.slice(r * 7, r * 7 + 7).map((cell, i) => {
                        const isToday    = cell.date.getTime() === TODAY_MS;
                        const isSel      = !from && selDay && sameDay(cell.date, selDay);
                        const isFrom     = from && sameDay(cell.date, from);
                        const isTo       = to   && sameDay(cell.date, to);
                        const isEndpoint = isFrom || isTo;
                        const isMid      = hasRange && between(cell.date, from, to);
                        const showStrip  = isMid || (hasRange && isEndpoint);
                        return (
                            <TouchableOpacity key={i} style={st.calCell} onPress={() => onPress(cell.date)} activeOpacity={0.7}>
                                {showStrip && (
                                    <View style={[st.rStrip, isFrom && st.rStripR, isTo && st.rStripL]} />
                                )}
                                {(isSel || isEndpoint) && <View style={st.selCircle} />}
                                <Text style={[
                                    st.dayTxt,
                                    !cell.inMonth            && st.dayOut,
                                    isToday && !isSel && !isEndpoint && st.dayToday,
                                    (isSel || isEndpoint)    && st.daySelTxt,
                                ]}>
                                    {cell.day}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            ))}
        </>
    );
}

// ─── CalView – standalone ────────────────────────────────────────────────────
function CalView({ year, month, onPrev, onNext, onPress, selDay, from, to }) {
    const cells = buildCells(year, month);
    return (
        <View style={st.calBox}>
            <View style={st.calHead}>
                <Text style={st.calHeadTxt}>{MF[month]} {year}</Text>
                <View style={st.calNavRow}>
                    <TouchableOpacity style={st.calNavBtn} onPress={onPrev}>
                        <ChevronLeft size={15} color="#64748B" />
                    </TouchableOpacity>
                    <TouchableOpacity style={st.calNavBtn} onPress={onNext}>
                        <ChevronRight size={15} color="#64748B" />
                    </TouchableOpacity>
                </View>
            </View>
            <View style={st.dayHeaders}>
                {DH.map((d, i) => <Text key={i} style={st.dayHeader}>{d}</Text>)}
            </View>
            <CalGrid cells={cells} onPress={onPress} selDay={selDay} from={from} to={to} />
        </View>
    );
}

// ─── DashboardFilterModal ─────────────────────────────────────────────────────
export default function DashboardFilterModal({ visible, onClose, onApply }) {
    const insets = useSafeAreaInsets();
    const today  = new Date(_today);

    const [tab, setTab] = useState('daily');

    // Daily
    const [dQuick, setDQuick] = useState('today');
    const [dDate,  setDDate]  = useState(new Date(today));
    const [dCY,    setDCY]    = useState(today.getFullYear());
    const [dCM,    setDCM]    = useState(today.getMonth());

    // Monthly
    const [mQuick, setMQuick] = useState('thisMonth');
    const [mYear,  setMYear]  = useState(today.getFullYear());
    const [mMonth, setMMonth] = useState(today.getMonth());

    // Yearly
    const [yQuick, setYQuick] = useState('thisYear');
    const [selYr,  setSelYr]  = useState(today.getFullYear());
    const [yrBase, setYrBase] = useState(Math.floor((today.getFullYear() - 2020) / 9) * 9 + 2020);

    // Custom
    const [cQuick,   setCQuick]   = useState('last30');
    const [cFrom,    setCFrom]    = useState(() => { const d = new Date(today); d.setDate(d.getDate() - 29); return d; });
    const [cTo,      setCTo]      = useState(new Date(today));
    const [pickFrom, setPickFrom] = useState(true);
    const [cCY,      setCCY]      = useState(today.getFullYear());
    const [cCM,      setCCM]      = useState(today.getMonth());

    // ── month nav ─────────────────────────────────────────────────────────────
    const prevM = (m, setM, setY) => {
        if (m === 0) { setM(11); setY(y => y - 1); } else setM(v => v - 1);
    };
    const nextM = (m, setM, setY) => {
        if (m === 11) { setM(0); setY(y => y + 1); } else setM(v => v + 1);
    };

    // ── quick handlers ────────────────────────────────────────────────────────
    const applyDQ = q => {
        setDQuick(q);
        const d = new Date(today);
        if (q === 'yesterday') d.setDate(d.getDate() - 1);
        else if (q === 'last7') d.setDate(d.getDate() - 6);
        setDDate(d); setDCY(d.getFullYear()); setDCM(d.getMonth());
    };

    const applyMQ = q => {
        setMQuick(q);
        if (q === 'thisMonth') { setMMonth(today.getMonth()); setMYear(today.getFullYear()); }
        else if (q === 'lastMonth') {
            const d = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            setMMonth(d.getMonth()); setMYear(d.getFullYear());
        } else {
            const d = new Date(today.getFullYear(), today.getMonth() - 2, 1);
            setMMonth(d.getMonth()); setMYear(d.getFullYear());
        }
    };

    const applyYQ = q => {
        setYQuick(q);
        setSelYr(q === 'thisYear' ? today.getFullYear() : today.getFullYear() - 1);
    };

    const applyCQ = q => {
        setCQuick(q);
        const to = new Date(today), from = new Date(today);
        if      (q === 'last7')  from.setDate(from.getDate() - 6);
        else if (q === 'last30') from.setDate(from.getDate() - 29);
        else if (q === 'last90') from.setDate(from.getDate() - 89);
        else { from.setMonth(0); from.setDate(1); }
        setCFrom(from); setCTo(to); setCCY(to.getFullYear()); setCCM(to.getMonth());
    };

    const handleCustomDay = d => {
        const day = new Date(d); day.setHours(0, 0, 0, 0);
        setCQuick(null);
        if (pickFrom) { setCFrom(day); setPickFrom(false); }
        else {
            if (day < cFrom) { setCTo(new Date(cFrom)); setCFrom(day); }
            else setCTo(day);
            setPickFrom(true);
        }
    };

    const reset = () => {
        setTab('daily');
        setDQuick('today'); setDDate(new Date(today)); setDCY(today.getFullYear()); setDCM(today.getMonth());
        setMQuick('thisMonth'); setMYear(today.getFullYear()); setMMonth(today.getMonth());
        setYQuick('thisYear'); setSelYr(today.getFullYear());
        setYrBase(Math.floor((today.getFullYear() - 2020) / 9) * 9 + 2020);
        setCQuick('last30');
        const f = new Date(today); f.setDate(f.getDate() - 29);
        setCFrom(f); setCTo(new Date(today)); setPickFrom(true);
        setCCY(today.getFullYear()); setCCM(today.getMonth());
    };

    const applyLabel = () => {
        if (tab === 'daily')
            return `Apply · ${MS[dDate.getMonth()]} ${dDate.getDate()}, ${dDate.getFullYear()}`;
        if (tab === 'monthly') return `Apply · ${MS[mMonth]} ${mYear}`;
        if (tab === 'yearly')  return `Apply · Year ${selYr}`;
        const days = Math.round(Math.abs(cTo - cFrom) / 86400000) + 1;
        return `Apply · ${days} days`;
    };

    const handleApply = () => {
        let filter;
        if (tab === 'daily')        filter = { type: 'daily',   date: new Date(dDate) };
        else if (tab === 'monthly') filter = { type: 'monthly', month: mMonth, year: mYear };
        else if (tab === 'yearly')  filter = { type: 'yearly',  year: selYr };
        else filter = { type: 'custom', from: new Date(cFrom), to: new Date(cTo) };
        onApply(filter);
    };

    // ── reusable pill row (plain function, not component) ─────────────────────
    const renderPills = (items, active, onPress) => (
        <View style={st.quickRow}>
            {items.map(([q, lbl]) => (
                <TouchableOpacity key={q} style={[st.pill, active === q && st.pillActive]} onPress={() => onPress(q)}>
                    <Text style={[st.pillTxt, active === q && st.pillTxtActive]}>{lbl}</Text>
                </TouchableOpacity>
            ))}
        </View>
    );

    // ── tab renders (plain functions, NOT React components) ───────────────────
    const renderDaily = () => (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={st.tabPad}>
            <Text style={st.secLbl}>QUICK SELECT</Text>
            {renderPills(
                [['today','Today'],['yesterday','Yesterday']],
                dQuick, applyDQ
            )}
            <Text style={st.secLbl}>PICK A DATE</Text>
            <CalView
                year={dCY} month={dCM}
                onPrev={() => prevM(dCM, setDCM, setDCY)}
                onNext={() => nextM(dCM, setDCM, setDCY)}
                onPress={d => { setDQuick(null); setDDate(new Date(d)); }}
                selDay={dDate}
            />
        </ScrollView>
    );

    const renderMonthly = () => (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={st.tabPad}>
            <Text style={st.secLbl}>QUICK SELECT</Text>
            {renderPills(
                [['thisMonth','This Month'],['lastMonth','Last Month']],
                mQuick, applyMQ
            )}
            <Text style={st.secLbl}>PICK MONTH & YEAR</Text>
            <View style={st.navBox}>
                <TouchableOpacity style={st.navBtn} onPress={() => setMYear(y => y - 1)}>
                    <ChevronLeft size={18} color="#64748B" />
                </TouchableOpacity>
                <Text style={st.navTxt}>{mYear}</Text>
                <TouchableOpacity style={st.navBtn} onPress={() => { if (mYear < today.getFullYear()) setMYear(y => y + 1); }}>
                    <ChevronRight size={18} color={mYear >= today.getFullYear() ? '#CBD5E1' : '#64748B'} />
                </TouchableOpacity>
            </View>
            <View style={st.grid3}>
                {MS.map((m, idx) => {
                    const future = mYear > today.getFullYear() ||
                        (mYear === today.getFullYear() && idx > today.getMonth());
                    const sel = idx === mMonth;
                    return (
                        <TouchableOpacity key={m} disabled={future}
                            style={[st.gCell, sel && st.gCellSel, future && st.gCellDis]}
                            onPress={() => { setMMonth(idx); setMQuick(null); }}>
                            <Text style={[st.gTxt, sel && st.gTxtSel, future && st.gTxtDis]}>{m}</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </ScrollView>
    );

    const renderYearly = () => {
        const years = Array.from({ length: 9 }, (_, i) => yrBase + i);
        return (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={st.tabPad}>
                <Text style={st.secLbl}>QUICK SELECT</Text>
                {renderPills(
                    [['thisYear','This Year'],['lastYear','Last Year']],
                    yQuick, applyYQ
                )}
                <Text style={st.secLbl}>PICK A YEAR</Text>
                <View style={st.navBox}>
                    <TouchableOpacity style={st.navBtn} onPress={() => setYrBase(v => v - 9)}>
                        <ChevronLeft size={18} color="#64748B" />
                    </TouchableOpacity>
                    <Text style={st.navTxt}>{yrBase} – {yrBase + 8}</Text>
                    <TouchableOpacity style={st.navBtn} onPress={() => { if (yrBase + 9 <= today.getFullYear()) setYrBase(v => v + 9); }}>
                        <ChevronRight size={18} color={yrBase + 9 > today.getFullYear() ? '#CBD5E1' : '#64748B'} />
                    </TouchableOpacity>
                </View>
                <View style={st.grid3}>
                    {years.map(y => {
                        const future = y > today.getFullYear();
                        const sel = y === selYr;
                        return (
                            <TouchableOpacity key={y} disabled={future}
                                style={[st.gCell, sel && st.gCellSel, future && st.gCellDis]}
                                onPress={() => { setSelYr(y); setYQuick(null); }}>
                                <Text style={[st.gTxt, sel && st.gTxtSel, future && st.gTxtDis]}>{y}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </ScrollView>
        );
    };

    const renderCustom = () => (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={st.tabPad}>
            <Text style={st.secLbl}>QUICK SELECT</Text>
            {renderPills(
                [['last7','Last 7 Days'],['last30','Last 30 Days'],['last90','Last 90 Days']],
                cQuick, applyCQ
            )}
            <Text style={st.secLbl}>DATE RANGE</Text>
            <View style={st.drRow}>
                <TouchableOpacity style={[st.drBox, pickFrom && st.drBoxActive]} onPress={() => setPickFrom(true)}>
                    <Text style={st.drLabel}>FROM</Text>
                    <View style={st.drInner}>
                        <CalendarIcon size={13} color={pickFrom ? Colors.primary : '#64748B'} />
                        <Text style={[st.drVal, pickFrom && st.drValActive]}>
                            {MS[cFrom.getMonth()]} {cFrom.getDate()}, {cFrom.getFullYear()}
                        </Text>
                    </View>
                </TouchableOpacity>
                <ChevronRight size={15} color="#94A3B8" style={{ marginTop: 14 }} />
                <TouchableOpacity style={[st.drBox, !pickFrom && st.drBoxActive]} onPress={() => setPickFrom(false)}>
                    <Text style={st.drLabel}>TO</Text>
                    <View style={st.drInner}>
                        <CalendarIcon size={13} color={!pickFrom ? Colors.primary : '#64748B'} />
                        <Text style={[st.drVal, !pickFrom && st.drValActive]}>
                            {MS[cTo.getMonth()]} {cTo.getDate()}, {cTo.getFullYear()}
                        </Text>
                    </View>
                </TouchableOpacity>
            </View>
            <CalView
                year={cCY} month={cCM}
                onPrev={() => prevM(cCM, setCCM, setCCY)}
                onNext={() => nextM(cCM, setCCM, setCCY)}
                onPress={handleCustomDay}
                from={cFrom} to={cTo}
            />
        </ScrollView>
    );

    // ── render ────────────────────────────────────────────────────────────────
    return (
        <Modal visible={visible} animationType="slide" transparent statusBarTranslucent onRequestClose={onClose}>
            <View style={st.overlay}>
                <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={onClose} />
                <View style={[st.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>

                    {/* drag handle */}
                    <View style={st.handle} />

                    {/* header */}
                    <View style={st.header}>
                        <Text style={st.title}>Filter Dashboard</Text>
                        <TouchableOpacity style={st.closeBtn} onPress={onClose}>
                            <X size={17} color="#64748B" />
                        </TouchableOpacity>
                    </View>

                    {/* tab bar */}
                    <View style={st.tabBar}>
                        {['daily','monthly','yearly','custom'].map(t => (
                            <TouchableOpacity key={t} style={[st.tabItem, tab === t && st.tabActive]} onPress={() => setTab(t)}>
                                <Text style={[st.tabTxt, tab === t && st.tabTxtActive]}>
                                    {t.charAt(0).toUpperCase() + t.slice(1)}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* scrollable content – flex:1 works because sheet has fixed height */}
                    <View style={st.content}>
                        {tab === 'daily'   && renderDaily()}
                        {tab === 'monthly' && renderMonthly()}
                        {tab === 'yearly'  && renderYearly()}
                        {tab === 'custom'  && renderCustom()}
                    </View>

                    {/* footer */}
                    <View style={st.footer}>
                        <TouchableOpacity style={st.resetBtn} onPress={reset}>
                            <Text style={st.resetTxt}>Reset</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={st.applyBtn} onPress={handleApply}>
                            <Text style={st.applyTxt}>{applyLabel()}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ─── styles ───────────────────────────────────────────────────────────────────
const st = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.45)',
    },
    // Fixed height so flex:1 on content works correctly
    sheet: {
        height: SHEET_H,
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingHorizontal: PAD,
    },
    handle: {
        width: 40, height: 5,
        borderRadius: 3,
        backgroundColor: '#D1D5DB',
        alignSelf: 'center',
        marginTop: 10, marginBottom: 2,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 14,
    },
    title: {
        fontFamily: 'Inter-Bold',
        fontSize: 22,
        color: '#0F172A',
    },
    closeBtn: {
        width: 34, height: 34,
        borderRadius: 17,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
    },
    // ── tab bar ──
    tabBar: {
        flexDirection: 'row',
        backgroundColor: '#F1F5F9',
        borderRadius: 14,
        padding: 4,
        marginBottom: 16,
    },
    tabItem: {
        flex: 1,
        paddingVertical: 9,
        alignItems: 'center',
        borderRadius: 11,
    },
    tabActive: {
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
    },
    tabTxt: {
        fontFamily: 'Inter-Medium',
        fontSize: 13,
        color: '#94A3B8',
    },
    tabTxtActive: {
        fontFamily: 'Inter-SemiBold',
        color: Colors.primary,
    },
    // ── content (flex:1 fills space between tabBar and footer) ──
    content: {
        flex: 1,
    },
    tabPad: {
        paddingBottom: 12,
    },
    // ── section label ──
    secLbl: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 11,
        color: '#94A3B8',
        letterSpacing: 0.8,
        marginBottom: 10,
        marginTop: 4,
    },
    // ── quick pills ──
    quickRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 18,
    },
    pill: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#D1D5DB',
        backgroundColor: '#FFFFFF',
    },
    pillActive: {
        backgroundColor: '#EEF2FF',
        borderColor: Colors.primary,
    },
    pillTxt: {
        fontFamily: 'Inter-Medium',
        fontSize: 14,
        color: '#374151',
    },
    pillTxtActive: {
        fontFamily: 'Inter-SemiBold',
        color: Colors.primary,
    },
    // ── year/month nav box ──
    navBox: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 14,
        paddingVertical: 14,
        paddingHorizontal: 16,
        marginBottom: 16,
    },
    navBtn: { padding: 4 },
    navTxt: {
        fontFamily: 'Inter-Bold',
        fontSize: 16,
        color: '#0F172A',
    },
    // ── 3-col grid ──
    grid3: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 8,
    },
    gCell: {
        width: GRID_CELL_W,
        paddingVertical: 16,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
    },
    gCellSel: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    gCellDis: { backgroundColor: '#F8FAFC', borderColor: '#F1F5F9' },
    gTxt: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 15,
        color: '#0F172A',
    },
    gTxtSel: { color: '#FFFFFF' },
    gTxtDis: { color: '#CBD5E1' },
    // ── custom date range ──
    drRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        marginBottom: 16,
    },
    drBox: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 14,
        padding: 12,
        backgroundColor: '#FFFFFF',
    },
    drBoxActive: {
        borderColor: Colors.primary,
        backgroundColor: '#F5F3FF',
    },
    drLabel: {
        fontFamily: 'Inter-Bold',
        fontSize: 10,
        color: Colors.primary,
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    drInner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    drVal: {
        fontFamily: 'Inter-Medium',
        fontSize: 13,
        color: '#374151',
    },
    drValActive: {
        fontFamily: 'Inter-SemiBold',
        color: Colors.primary,
    },
    // ── calendar ──
    calBox: {
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 16,
        paddingHorizontal: 12,
        paddingTop: 14,
        paddingBottom: 8,
        backgroundColor: '#FFFFFF',
        marginBottom: 4,
    },
    calHead: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    calHeadTxt: {
        fontFamily: 'Inter-Bold',
        fontSize: 16,
        color: '#0F172A',
    },
    calNavRow: { flexDirection: 'row', gap: 6 },
    calNavBtn: {
        width: 30, height: 30,
        borderRadius: 15,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
    },
    dayHeaders: {
        flexDirection: 'row',
        marginBottom: 4,
    },
    dayHeader: {
        width: CAL_CELL,
        textAlign: 'center',
        fontFamily: 'Inter-Medium',
        fontSize: 12,
        color: '#94A3B8',
        paddingVertical: 4,
    },
    calRow: { flexDirection: 'row' },
    calCell: {
        width: CAL_CELL,
        height: CAL_CELL,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rStrip: {
        position: 'absolute',
        top: 3, bottom: 3, left: 0, right: 0,
        backgroundColor: '#EEF2FF',
    },
    rStripR: { left: '50%' },
    rStripL: { right: '50%' },
    selCircle: {
        position: 'absolute',
        width: CAL_CELL - 8,
        height: CAL_CELL - 8,
        borderRadius: (CAL_CELL - 8) / 2,
        backgroundColor: Colors.primary,
    },
    dayTxt: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 14,
        color: '#0F172A',
    },
    dayOut:    { color: '#CBD5E1' },
    dayToday:  { color: Colors.primary },
    daySelTxt: { color: '#FFFFFF' },
    // ── footer ──
    footer: {
        flexDirection: 'row',
        gap: 12,
        paddingTop: 12,
        paddingBottom: 4,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    resetBtn: {
        flex: 1,
        paddingVertical: 16,
        borderRadius: 16,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
    },
    resetTxt: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 15,
        color: '#374151',
    },
    applyBtn: {
        flex: 2,
        paddingVertical: 16,
        borderRadius: 16,
        backgroundColor: Colors.primary,
        alignItems: 'center',
    },
    applyTxt: {
        fontFamily: 'Inter-Bold',
        fontSize: 15,
        color: '#FFFFFF',
    },
});
