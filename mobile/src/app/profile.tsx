// Taste profile: shown first on a new install, editable any time.
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Btn, ChipGroup, Field, H1, Input, Muted, Screen } from '@/components/ui';
import { newProfile, OPT } from '@/lib/options';
import { useStore } from '@/lib/store';
import type { Profile, ThemeMode } from '@/lib/types';

const THEMES: { key: ThemeMode; label: string }[] = [
  { key: 'system', label: 'System' }, { key: 'light', label: 'Light' }, { key: 'dark', label: 'Dark' },
];

export default function ProfileScreen() {
  const { first } = useLocalSearchParams<{ first?: string }>();
  const isFirst = first === '1';
  const { profile, saveProfile, themeMode, setTheme, toast } = useStore();
  const [d, setD] = useState<Profile>(() => newProfile(profile));
  const up = (patch: Partial<Profile>) => setD(prev => ({ ...prev, ...patch }));

  const save = () => {
    saveProfile({ ...d, kcal: profile?.kcal ?? null });
    toast(isFirst ? "Profile saved. Let's cook." : 'Profile updated.');
    if (isFirst || !router.canGoBack()) router.replace('/'); else router.back();
  };

  const themeLabel = THEMES.find(t => t.key === themeMode)!.label;

  return (
    <Screen title={isFirst ? 'Welcome to Ladle' : 'Your taste profile'} subtitle={isFirst ? undefined : 'Ladle plans every meal around this'} back={!isFirst}
      footer={<Btn kind="primary" label={isFirst ? 'Start cooking' : 'Save profile'} onPress={save} />}>
      {isFirst && (
        <View style={{ gap: 8 }}>
          <H1>{"Let's learn how you eat."}</H1>
          <Muted style={{ fontSize: 15 }}>Ladle builds a new meal for you every time, so it needs to know what you love and what to avoid. Takes a minute.</Muted>
        </View>
      )}
      <Field label="Flavours you love"><ChipGroup options={OPT.flavours} value={d.likes} onChange={likes => up({ likes })} /></Field>
      <Field label="Foods you enjoy">
        <ChipGroup options={OPT.foods} value={d.likes} onChange={likes => up({ likes })} />
        <Input value={d.likesOther} onChangeText={likesOther => up({ likesOther })} placeholder="Anything else? e.g. chakalaka, curry" />
      </Field>
      <Field label="Dislikes" hint="Ladle won't cook with these.">
        <ChipGroup options={OPT.dislikes} value={d.dislikes} onChange={dislikes => up({ dislikes })} />
        <Input value={d.dislikesOther} onChangeText={dislikesOther => up({ dislikesOther })} placeholder="Other dislikes, separated by commas" />
      </Field>
      <Field label="Allergies" hint="Never used, including hidden sources like stock powders.">
        <ChipGroup options={OPT.allergies} value={d.allergies} onChange={allergies => up({ allergies })} />
        <Input value={d.allergiesOther} onChangeText={allergiesOther => up({ allergiesOther })} placeholder="Other allergies, separated by commas" />
      </Field>
      <Field label="Diet"><ChipGroup options={OPT.diets} value={d.diet} onChange={diet => up({ diet })} /></Field>
      <Field label="How much chilli can you take?"><ChipGroup options={OPT.spice} value={d.spice} onChange={spice => up({ spice })} /></Field>
      <Field label="Cooking experience"><ChipGroup options={OPT.skill} value={d.skill} onChange={skill => up({ skill })} /></Field>
      <Field label="What you cook with"><ChipGroup options={OPT.equipment} value={d.equipment} onChange={equipment => up({ equipment })} /></Field>
      <Field label="Where you usually shop" hint="Prices are estimated for this store."><ChipGroup options={OPT.stores} value={d.store} onChange={store => up({ store })} /></Field>
      <Field label="Appearance">
        <ChipGroup options={THEMES.map(t => t.label)} value={themeLabel} onChange={(label: string) => setTheme(THEMES.find(t => t.label === label)!.key)} />
      </Field>
      <Muted>Saved on this phone.</Muted>
    </Screen>
  );
}
