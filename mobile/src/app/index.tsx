// Home: pick how to start, see today's calories.
import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Btn, Callout, Eyebrow, H1, Icon, IconButton, Meter, Muted, Screen, Surface, TimerBanner, type IconName } from '@/components/ui';
import { checkServer } from '@/lib/ai';
import { eatenToday, useStore } from '@/lib/store';
import { radius, useColors } from '@/lib/theme';
import type { Mode } from '@/lib/types';
import { dayKey } from '@/lib/util';

export default function Home() {
  const c = useColors();
  const { profile, days, recipe, themeMode, setTheme, startRequest } = useStore();
  const [server, setServer] = useState<{ ok: boolean; message?: string } | null>(null);

  useEffect(() => { checkServer().then(setServer); }, []);

  if (!profile) return <Redirect href="/profile?first=1" />;

  const eaten = eatenToday(days);
  const target = profile.kcal;
  const latest = (days.find(d => d.date === dayKey())?.entries ?? []).slice(-3).reverse();
  const dark = c.isDark;

  const start = (mode: Mode) => { startRequest(mode); router.push(`/plan/${mode}`); };

  return (
    <Screen
      header={
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8, minHeight: 56 }}>
          <Text style={{ flex: 1, fontSize: 26, fontWeight: '900', letterSpacing: -0.8, color: c.fg }}>
            Ladle<Text style={{ color: c.accent }}>.</Text>
          </Text>
          <IconButton name={dark ? 'sunny-outline' : 'moon-outline'} label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            onPress={() => setTheme(dark ? 'light' : 'dark')} />
          <IconButton name="stats-chart-outline" label="Calorie tracker" onPress={() => router.push('/tracker')} />
          <IconButton name="person-outline" label="Your taste profile" onPress={() => router.push('/profile')} />
        </View>
      }>
      <TimerBanner />
      {server && !server.ok && <Callout kind="warn">{server.message}</Callout>}

      <View style={{ gap: 6 }}>
        <H1>What are we cooking?</H1>
        <Muted style={{ fontSize: 15 }}>Something new every time, built around your tastes and your pocket.</Muted>
      </View>

      <View style={{ gap: 10 }}>
        <Entry icon="wallet-outline" title="I have a budget" desc="Tell me your rand and your mood. I plan the meal and the shopping." onPress={() => start('budget')} />
        <Entry icon="restaurant-outline" title="I want to make something" desc="Describe it or snap a photo. I tell you what to buy and what it costs." onPress={() => start('dish')} />
        <Entry icon="basket-outline" title="I have ingredients" desc="Tell me or show me what's in the kitchen. We work out what to make." onPress={() => start('pantry')} />
      </View>

      <Pressable onPress={() => router.push('/tracker')} accessibilityRole="button">
        <Surface>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Eyebrow>Calories today</Eyebrow>
            <Muted style={{ fontSize: 13 }}>{target ? (target - eaten >= 0 ? `${target - eaten} kcal left` : `${eaten - target} kcal over`) : 'Open tracker'}</Muted>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
            <Text style={{ fontSize: 34, fontWeight: '800', color: c.fg, fontVariant: ['tabular-nums'] }}>{eaten}</Text>
            <Muted>{target ? `/ ${target} kcal` : 'kcal'}</Muted>
          </View>
          {!!target && <Meter pct={(eaten / target) * 100} over={eaten > target} />}
          <Muted style={{ fontSize: 13 }}>{latest.length ? `Latest: ${latest.map(e => e.name).join(', ')}` : 'Nothing logged yet today.'}</Muted>
        </Surface>
      </Pressable>

      {recipe && <Btn icon="flame-outline" label={`Back to ${recipe.name}`} onPress={() => router.push('/kitchen')} />}
      {themeMode !== 'system' && <Muted style={{ textAlign: 'center', fontSize: 12.5 }}>Appearance is set to {themeMode}. Change it in your profile.</Muted>}
    </Screen>
  );
}

function Entry({ icon, title, desc, onPress }: { icon: IconName; title: string; desc: string; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable accessibilityRole="button" onPress={onPress}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: radius.lg, borderWidth: 1, borderColor: c.line, backgroundColor: pressed ? c.surface : c.bg })}>
      <View style={{ width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: c.accentSoft }}>
        <Icon name={icon} size={24} color={c.accentSoftFg} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontSize: 17.5, fontWeight: '800', color: c.fg }}>{title}</Text>
        <Muted>{desc}</Muted>
      </View>
      <Icon name="chevron-forward" size={18} color={c.muted} />
    </Pressable>
  );
}
