// The three ways in: budget, a dish (words or photo), or ingredients you have.
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { choosePhoto } from '@/components/photo';
import { Btn, Chip, ChipGroup, Cols, Eyebrow, Field, H3, Icon, Input, Muted, Row, Screen, Toggle } from '@/components/ui';
import { OPT } from '@/lib/options';
import { useStore } from '@/lib/store';
import { radius, useColors } from '@/lib/theme';
import type { Mode, Req } from '@/lib/types';
import { num, portionsFor } from '@/lib/util';

const TITLES: Record<Mode, [string, string]> = {
  budget: ['Cook to a budget', 'A new meal planned around your rand'],
  dish: ['Price a meal', 'Describe it or show me a photo'],
  pantry: ['Cook with what you have', 'Ladle works out what to make'],
};

export default function Plan() {
  const { mode: raw } = useLocalSearchParams<{ mode: string }>();
  const mode: Mode = raw === 'dish' || raw === 'pantry' ? raw : 'budget';
  const c = useColors();
  const { req, startRequest, updateReq, runIdeas, scanning, scanFridge, toast } = useStore();
  const [haveText, setHaveText] = useState('');

  useEffect(() => { if (!req || req.mode !== mode) startRequest(mode); }, [mode, req, startRequest]);
  if (!req || req.mode !== mode) return null;

  const up = (patch: Partial<Req>) => updateReq(patch);
  const addHave = (v: string) => {
    const items = v.split(',').map(s => s.trim()).filter(Boolean);
    const have = [...req.have];
    items.forEach(x => { if (!have.some(h => h.toLowerCase() === x.toLowerCase())) have.push(x); });
    up({ have }); setHaveText('');
  };

  const submit = () => {
    if (mode === 'budget' && num(req.budget) < 10) return toast('Set a budget of at least R10.');
    if (mode === 'pantry' && req.have.length < 2) return toast('Add at least two ingredients.');
    if (mode === 'dish' && !req.want.trim() && !req.photo) return toast('Add a photo or describe what you want to make.');
    up({ identified: null, meals: String(Math.min(14, Math.max(2, Math.round(num(req.meals, 5))))) });
    runIdeas(true);
    router.push('/ideas');
  };

  const people = <Field label="People"><Input value={req.people} onChangeText={people => up({ people })} keyboardType="number-pad" /></Field>;
  const mealPick = <Field label="Which meal?"><ChipGroup options={OPT.meal} value={req.meal} onChange={meal => up({ meal })} /></Field>;
  const bulk = (
    <View style={{ gap: 10 }}>
      <Toggle title="Cook in bulk" desc="Cook once, eat for days. Buys bigger packs when they're cheaper per kg." value={req.bulk} onChange={b => up({ bulk: b })} />
      {req.bulk && (
        <Field label="How many meals should it last?" hint={`That's ${portionsFor(req.people, true, req.meals)} portions in total.`}>
          <Input value={req.meals} onChangeText={meals => up({ meals })} keyboardType="number-pad" />
        </Field>
      )}
    </View>
  );

  const [title, subtitle] = TITLES[mode];
  const cta = mode === 'budget' ? 'Show me 3 meals' : mode === 'dish' ? 'Show me what it costs' : 'What can I make?';

  return (
    <Screen title={title} subtitle={subtitle} back footer={<Btn kind="primary" label={cta} onPress={submit} />}>
      {mode === 'budget' && (
        <>
          <Cols>
            <Field label="Budget (R)"><Input value={req.budget} onChangeText={budget => up({ budget })} keyboardType="decimal-pad" /></Field>
            {people}
          </Cols>
          {mealPick}
          <Field label="How are you feeling?">
            <ChipGroup options={OPT.moods} value={req.moods} onChange={moods => up({ moods })} />
            <Input value={req.feeling} onChangeText={feeling => up({ feeling })} placeholder="In your words, e.g. tired, want something warm" />
          </Field>
          <Field label="What do you feel like eating? (optional)" hint="Leave it blank and Ladle will surprise you.">
            <Input value={req.want} onChangeText={want => up({ want })} placeholder="e.g. something with pap, a saucy stew" />
          </Field>
          <Field label="Already at home (optional)" hint="Free stuff Ladle can use, so your budget goes further.">
            <Input value={req.pantry} onChangeText={pantry => up({ pantry })} placeholder="e.g. rice, curry powder, an onion" />
          </Field>
          {bulk}
        </>
      )}

      {mode === 'dish' && (
        <>
          <Field label="Seen something you want to cook?">
            {req.photo ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderWidth: 1, borderColor: c.line, borderRadius: radius.lg }}>
                <Image source={{ uri: req.photo.uri }} style={{ width: 76, height: 76, borderRadius: 12 }} contentFit="cover" accessibilityLabel="The dish you want to make" />
                <View style={{ flex: 1, gap: 2 }}>
                  <H3>Photo added</H3>
                  <Muted>Chef will work out what the dish is and how to make it at home.</Muted>
                </View>
                <Chip label="Remove" onPress={() => up({ photo: null, identified: null })} />
              </View>
            ) : (
              <PhotoDrop title="Add a photo of the dish" desc="From a restaurant, TikTok, Instagram or a friend's plate."
                onPress={async () => { const p = await choosePhoto('Photo of the dish'); if (p) up({ photo: p, identified: null }); }} />
            )}
          </Field>
          <Field label={req.photo ? 'Anything to add? (optional)' : 'Or describe what you want to make'}
            hint={req.photo ? 'e.g. "without the mushrooms" or "make it spicier".' : 'Be as loose or as exact as you like.'}>
            <Input multiline value={req.want} onChangeText={want => up({ want })}
              placeholder={req.photo ? 'e.g. I think it is a chicken stir-fry' : 'e.g. chicken curry with rice, or gizzards with pap and tomato gravy'} />
          </Field>
          <Cols>
            {people}
            <Field label="Max spend (optional)"><Input value={req.budget} onChangeText={budget => up({ budget })} keyboardType="decimal-pad" placeholder="No limit" /></Field>
          </Cols>
          {mealPick}
          <Field label="Already at home (optional)" hint="So you only pay for what you're missing.">
            <Input value={req.pantry} onChangeText={pantry => up({ pantry })} placeholder="e.g. rice, onions, curry powder" />
          </Field>
          {bulk}
          <Muted>{"You'll get 3 versions at different prices: a cheap one, a standard one and an upgraded one."}</Muted>
        </>
      )}

      {mode === 'pantry' && (
        <>
          {scanning ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: radius.lg, backgroundColor: c.surface }}>
              <ActivityIndicator color={c.accent} />
              <View style={{ flex: 1 }}><H3>Looking at your photo…</H3><Muted>Spotting the ingredients. This takes a few seconds.</Muted></View>
            </View>
          ) : (
            <PhotoDrop title="Snap your fridge or cupboard" desc="Chef spots the ingredients and adds them for you."
              onPress={async () => { const p = await choosePhoto('Photo of your fridge or cupboard'); if (p) scanFridge(p); }} />
          )}
          <Field label="Or type what you have">
            <Row>
              <Input style={{ flex: 1 }} value={haveText} onChangeText={setHaveText} placeholder="e.g. gizzards" returnKeyType="done" onSubmitEditing={() => addHave(haveText)} />
              <Btn kind="primary" label="Add" onPress={() => addHave(haveText)} />
            </Row>
            {req.have.length ? (
              <Row wrap>{req.have.map((h, i) => <Chip key={h + i} label={h} icon="close" onPress={() => up({ have: req.have.filter((_, k) => k !== i) })} />)}</Row>
            ) : <Muted>Add at least two things.</Muted>}
            <Eyebrow style={{ marginTop: 4 }}>Quick add</Eyebrow>
            <Row wrap>{OPT.pantryQuick.filter(q => !req.have.includes(q)).map(q => <Chip key={q} label={`+ ${q}`} onPress={() => addHave(q)} />)}</Row>
          </Field>
          <Field label="Something you want to make? (optional)">
            <Input value={req.want} onChangeText={want => up({ want })} placeholder="e.g. a stew, something like a curry" />
          </Field>
          <Cols>
            <Field label="Extra spend (R)"><Input value={req.budget} onChangeText={budget => up({ budget })} keyboardType="decimal-pad" /></Field>
            {people}
          </Cols>
          {mealPick}
          <Field label="Mood (optional)"><ChipGroup options={OPT.moods} value={req.moods} onChange={moods => up({ moods })} /></Field>
          {bulk}
        </>
      )}
    </Screen>
  );
}

function PhotoDrop({ title, desc, onPress }: { title: string; desc: string; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable accessibilityRole="button" onPress={onPress}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: radius.lg, borderWidth: 1.5, borderStyle: 'dashed', borderColor: pressed ? c.accent : c.line, backgroundColor: c.surface })}>
      <Icon name="camera-outline" size={28} color={c.accent} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontSize: 16, fontWeight: '700', color: c.fg }}>{title}</Text>
        <Muted>{desc}</Muted>
      </View>
    </Pressable>
  );
}
