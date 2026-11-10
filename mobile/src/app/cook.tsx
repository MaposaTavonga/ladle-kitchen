// Step-by-step cooking: one big step at a time, screen stays on.
import * as Haptics from 'expo-haptics';
import { Redirect, router } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { Btn, Callout, Cols, IconButton, Screen, TimerBanner } from '@/components/ui';
import { useStore } from '@/lib/store';
import { useColors } from '@/lib/theme';

export default function Cook() {
  useKeepAwake(); // stop the phone sleeping while you cook
  const c = useColors();
  const { recipe, startTimer, askChef, toast } = useStore();
  const [i, setI] = useState(0);
  if (!recipe) return <Redirect href="/" />;

  const s = recipe.steps[i];
  const last = i === recipe.steps.length - 1;
  const close = () => router.back();
  const next = () => {
    Haptics.selectionAsync().catch(() => {});
    if (last) { toast('All steps done. Enjoy!'); close(); } else setI(i + 1);
  };

  return (
    <Screen
      header={
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 8, minHeight: 56 }}>
          <IconButton name="close" label="Leave step-by-step mode" onPress={close} />
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={{ fontSize: 17, fontWeight: '800', color: c.fg }}>{recipe.name}</Text>
            <Text style={{ fontSize: 12.5, color: c.muted }}>Step {i + 1} of {recipe.steps.length}</Text>
          </View>
        </View>
      }
      footer={
        <Cols>
          <Btn label="Back" onPress={() => setI(i - 1)} disabled={i === 0} />
          <Btn kind="primary" label={last ? 'Finish' : 'Next step'} onPress={next} />
        </Cols>
      }>
      <View style={{ flexDirection: 'row', gap: 4 }}>
        {recipe.steps.map((_, k) => <View key={k} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: k <= i ? c.accent : c.line }} />)}
      </View>
      <TimerBanner />
      <Text style={{ fontSize: 30, lineHeight: 38, fontWeight: '800', color: c.fg, letterSpacing: -0.3 }}>{s.text}</Text>
      {!!s.why && <Callout icon="bulb-outline">{`Why: ${s.why}`}</Callout>}
      <View style={{ gap: 10 }}>
        {s.minutes ? <Btn icon="timer-outline" label={`Start ${s.minutes} min timer`} onPress={() => startTimer(s.minutes!, `Step ${i + 1}: ${s.text.slice(0, 36)}${s.text.length > 36 ? '…' : ''}`)} /> : null}
        <Btn icon="chatbubble-ellipses-outline" label="Ask Chef about this step" onPress={() => {
          close();
          askChef(`About step ${i + 1} ("${s.text}"): what is the most common mistake here, and how do I know I'm doing it right?`);
        }} />
      </View>
    </Screen>
  );
}
