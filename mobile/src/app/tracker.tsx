// Calorie tracker: today's food, an optional target, and the last 7 days.
import { useState } from 'react';
import { Text, View } from 'react-native';
import { Btn, Card, Eyebrow, H3, IconButton, Input, Meter, Muted, Pill, Row, Screen, Surface } from '@/components/ui';
import { eatenToday, useStore } from '@/lib/store';
import { useColors } from '@/lib/theme';
import { dayKey, num } from '@/lib/util';

export default function Tracker() {
  const c = useColors();
  const { profile, days, logFood, removeFood, setTarget, estimateKcal, toast } = useStore();
  const target = profile?.kcal ?? null;
  const eaten = eatenToday(days);
  const todayEntries = days.find(d => d.date === dayKey())?.entries ?? [];
  const macros = todayEntries.reduce((a, e) => ({ p: a.p + num(e.protein), c: a.c + num(e.carbs), f: a.f + num(e.fat) }), { p: 0, c: 0, f: 0 });

  const [targetText, setTargetText] = useState(target ? String(target) : '');
  const [food, setFood] = useState('');
  const [kcal, setKcal] = useState('');
  const [estimating, setEstimating] = useState(false);

  const week = Array.from({ length: 7 }, (_, k) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - k));
    const rec = days.find(x => x.date === dayKey(d));
    return { label: k === 6 ? 'Today' : d.toLocaleDateString('en-ZA', { weekday: 'short' }), kcal: rec ? rec.entries.reduce((a, e) => a + num(e.kcal), 0) : 0 };
  });
  const max = Math.max(target ? target * 1.25 : 1, ...week.map(w => w.kcal));

  const saveTarget = () => {
    const k = Math.round(num(targetText));
    if (k && (k < 1200 || k > 4500)) return toast('Pick a target between 1200 and 4500 kcal.');
    setTarget(k || null);
    toast(k ? `Daily target set to ${k} kcal.` : 'Target removed.');
  };
  const estimate = async () => {
    if (!food.trim()) return toast('Type the food first.');
    setEstimating(true);
    const r = await estimateKcal(food.trim());
    setEstimating(false);
    if (r) { setKcal(String(r.kcal)); toast(r.note ? `Estimated for ${r.note}` : 'Estimated. Adjust if needed.'); }
  };
  const add = () => {
    const k = Math.round(num(kcal));
    if (!food.trim() || !k) return toast('Add a food and its calories.');
    logFood(food.trim(), k); setFood(''); setKcal(''); toast(`Added ${k} kcal.`);
  };

  return (
    <Screen title="Calorie tracker" subtitle={target ? `Target ${target} kcal a day` : 'Keep an eye on what you eat'} back>
      <Surface>
        <Eyebrow>Today</Eyebrow>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
          <Text style={{ fontSize: 34, fontWeight: '800', color: c.fg, fontVariant: ['tabular-nums'] }}>{eaten}</Text>
          <Muted>{target ? `/ ${target} kcal` : 'kcal'}</Muted>
        </View>
        {!!target && <Meter pct={(eaten / target) * 100} over={eaten > target} />}
        {!!target && <Text style={{ color: eaten > target ? c.accent : c.muted, fontWeight: eaten > target ? '700' : '400' }}>{eaten <= target ? `${target - eaten} kcal left` : `${eaten - target} kcal over target`}</Text>}
        {(macros.p > 0 || macros.c > 0 || macros.f > 0) && (
          <Row wrap gap={6}><Pill text={`Protein ${macros.p} g`} /><Pill text={`Carbs ${macros.c} g`} /><Pill text={`Fat ${macros.f} g`} /></Row>
        )}
        <Row style={{ marginTop: 4 }}>
          <Input style={{ flex: 1 }} value={targetText} onChangeText={setTargetText} keyboardType="number-pad" placeholder="Daily target (optional)" />
          <Btn small label={target ? 'Update' : 'Set target'} onPress={saveTarget} />
        </Row>
      </Surface>

      <Card>
        <H3>Eaten today</H3>
        {todayEntries.length ? todayEntries.map((e, i) => (
          <View key={e.at + '-' + i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: c.fg, fontSize: 15 }}>{e.name}</Text>
              <Muted style={{ fontSize: 12.5 }}>{new Date(e.at).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}</Muted>
            </View>
            <Text style={{ color: c.fg, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{num(e.kcal)} kcal</Text>
            <IconButton name="close" label={`Remove ${e.name}`} onPress={() => removeFood(i)} />
          </View>
        )) : <Muted>{'Nothing yet. Meals you cook land here when you tap "I ate a portion".'}</Muted>}

        <View style={{ gap: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: c.line }}>
          <H3 style={{ fontSize: 14.5 }}>Add something else</H3>
          <Input value={food} onChangeText={setFood} placeholder="e.g. 2 slices brown bread with peanut butter" />
          <Row>
            <Input style={{ width: 96 }} value={kcal} onChangeText={setKcal} keyboardType="number-pad" placeholder="kcal" />
            <Btn small label={estimating ? 'Estimating…' : 'Estimate'} loading={estimating} onPress={estimate} style={{ flex: 1 }} />
            <Btn small kind="primary" label="Add" onPress={add} />
          </Row>
        </View>
      </Card>

      <Card>
        <H3>Last 7 days</H3>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 140 }}>
          {week.map(w => (
            <View key={w.label} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%', gap: 4 }}>
              <Text style={{ fontSize: 10.5, color: c.muted, fontVariant: ['tabular-nums'] }}>{w.kcal || ''}</Text>
              <View style={{ width: '100%', maxWidth: 30, borderRadius: 6, height: w.kcal ? `${Math.max(4, (w.kcal / max) * 75)}%` : 3,
                backgroundColor: w.kcal ? (target && w.kcal > target ? c.accent : c.good) : c.line }} />
              <Text style={{ fontSize: 11, color: c.muted }}>{w.label}</Text>
            </View>
          ))}
        </View>
        <Muted>{target ? `Red days went over your ${target} kcal target.` : 'Set a daily target above to see which days went over.'}</Muted>
      </Card>
    </Screen>
  );
}
