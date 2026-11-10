// The kitchen: Plan (cost, shopping, ingredients), Cook (steps), Ask Chef (chat).
import { Image } from 'expo-image';
import { Redirect, router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Share, Text, View, type ScrollViewInstance } from 'react-native';
import { choosePhoto } from '@/components/photo';
import {
  Body, Btn, Callout, Card, Chip, Cols, Divider, Eyebrow, H3, Icon, IconButton, Input, Loading, Meter, Muted, Row, Screen, Segmented, Surface, TimerBanner,
} from '@/components/ui';
import { allergyHits } from '@/lib/prompts';
import { eatenToday, useStore } from '@/lib/store';
import { useColors } from '@/lib/theme';
import type { Photo, Recipe } from '@/lib/types';
import { num, R } from '@/lib/util';

const TABS = [{ key: 'plan', label: 'Plan' }, { key: 'cook', label: 'Cook' }, { key: 'chef', label: 'Ask Chef' }] as const;

export default function Kitchen() {
  const s = useStore();
  const { recipe, job, kitchenTab, setKitchenTab, idea, runRecipe, cancelJob } = s;
  const scrollRef = useRef<ScrollViewInstance>(null);

  const loading = job?.kind === 'recipe' && !job.error;
  const error = job?.kind === 'recipe' ? job.error : undefined;

  useEffect(() => {
    if (kitchenTab === 'chef') setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  }, [kitchenTab, s.chat.length, s.chatBusy]);

  const back = () => {
    if (loading) cancelJob();
    if (router.canGoBack()) router.back(); else router.replace('/');
  };

  if (loading) {
    return (
      <Screen title="Ladle" back onBack={back}>
        <Loading title={job!.label} onStop={back} message="Pricing the shopping, working out calories and writing why each step matters. This can take up to a minute." />
      </Screen>
    );
  }
  if (error) {
    return (
      <Screen title="Ladle" back onBack={back}>
        <Callout kind="warn">{error}</Callout>
        {idea && <Btn kind="primary" icon="refresh" label="Try again" onPress={() => runRecipe(idea)} />}
      </Screen>
    );
  }
  if (!recipe) return <Redirect href="/" />;

  const total = recipe.shopping.reduce((a, x) => a + num(x.price), 0);

  return (
    <Screen
      back onBack={() => router.dismissTo('/')}
      title={recipe.name}
      subtitle={`${R(total)} · ${recipe.nutrition.kcal} kcal a portion · serves ${recipe.servings}`}
      below={<Segmented options={[...TABS]} value={kitchenTab} onChange={setKitchenTab} />}
      scrollRef={scrollRef}
      footer={kitchenTab === 'chef' ? <ChefComposer /> : kitchenTab === 'plan' ? <AteButton recipe={recipe} /> : undefined}>
      <TimerBanner />
      {kitchenTab === 'plan' && <PlanTab recipe={recipe} total={total} />}
      {kitchenTab === 'cook' && <CookTab recipe={recipe} />}
      {kitchenTab === 'chef' && <ChefTab recipe={recipe} />}
    </Screen>
  );
}

function AteButton({ recipe }: { recipe: Recipe }) {
  const { logFood, toast, profile, days } = useStore();
  return (
    <Btn kind="primary" icon="add" label={`I ate a portion (+${recipe.nutrition.kcal} kcal)`} onPress={() => {
      logFood(recipe.name, recipe.nutrition.kcal, recipe.nutrition);
      const eaten = eatenToday(days) + recipe.nutrition.kcal;
      toast(profile?.kcal ? `Logged. ${profile.kcal - eaten} kcal left today.` : `Logged. ${eaten} kcal today.`);
    }} />
  );
}

// ---------------- Plan ----------------
function PlanTab({ recipe: r, total }: { recipe: Recipe; total: number }) {
  const c = useColors();
  const { req, profile, days, checked, toggleCheck, askChef, setKitchenTab } = useStore();
  const [open, setOpen] = useState<number | null>(null);
  const budget = num(req?.budget);
  const hits = profile ? allergyHits(r, profile) : [];
  const target = profile?.kcal ?? null;
  const left = target ? target - eatenToday(days) : null;
  const upTotal = r.upgrades.reduce((a, u) => a + num(u.price), 0);

  const share = () => Share.share({
    message: `Shopping list: ${r.name}\n${r.shopping.map(s => `- ${s.item}${s.qty ? ` (${s.qty})` : ''}: ${R(s.price)}`).join('\n')}\nTotal: about ${R(total)}`,
  }).catch(() => {});

  return (
    <>
      {hits.length > 0 && <Callout kind="warn">Check this: the recipe mentions {hits.join(', ')}, which is on your allergy list. Ask Chef for a swap before you cook.</Callout>}
      <Body>{r.summary}</Body>

      <Cols>
        <Surface>
          <Eyebrow>Cost</Eyebrow>
          <Text style={{ fontSize: 26, fontWeight: '800', color: c.fg }}>{R(total)}</Text>
          {budget > 0 && <Meter pct={(total / budget) * 100} over={total > budget} />}
          {budget > 0 && <Muted style={{ fontSize: 12.5 }}>{total <= budget ? `${R(budget - total)} under your R${budget}` : `${R(total - budget)} over your R${budget}`}</Muted>}
          <Muted style={{ fontSize: 12.5 }}>{R(total / Math.max(1, r.servings))} a portion</Muted>
        </Surface>
        <Surface>
          <Eyebrow>Per portion</Eyebrow>
          <Text style={{ fontSize: 26, fontWeight: '800', color: c.fg }}>{r.nutrition.kcal}<Text style={{ fontSize: 13, color: c.muted, fontWeight: '500' }}> kcal</Text></Text>
          {left !== null && <Meter pct={left > 0 ? (r.nutrition.kcal / left) * 100 : 100} over={r.nutrition.kcal > left} />}
          <Muted style={{ fontSize: 12.5 }}>{left !== null ? (left > 0 ? `${left} kcal left today` : "Over today's target") : `P ${r.nutrition.protein} g · C ${r.nutrition.carbs} g · F ${r.nutrition.fat} g`}</Muted>
        </Surface>
      </Cols>
      {!!r.healthNote && <Callout kind="good">{r.healthNote}</Callout>}

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <H3>Shopping list · {R(total)}</H3>
          {r.shopping.length > 0 && <Btn small icon="share-outline" label="Share" onPress={share} />}
        </Row>
        {r.shopping.length ? r.shopping.map((s, i) => (
          <Pressable key={s.item + i} onPress={() => toggleCheck(i)} accessibilityRole="checkbox" accessibilityState={{ checked: !!checked[i] }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 46 }}>
            <Icon name={checked[i] ? 'checkbox' : 'square-outline'} size={22} color={checked[i] ? c.accent : c.muted} />
            <Text style={{ flex: 1, fontSize: 15, color: checked[i] ? c.muted : c.fg, textDecorationLine: checked[i] ? 'line-through' : 'none' }}>
              {s.item}{s.qty ? <Text style={{ color: c.muted, fontSize: 13 }}> · {s.qty}</Text> : null}
            </Text>
            <Text style={{ fontWeight: '700', color: c.fg, fontVariant: ['tabular-nums'] }}>{R(s.price)}</Text>
          </Pressable>
        )) : <Muted>Nothing to buy. You have everything.</Muted>}
        {r.pantry.length > 0 && <Muted>From your kitchen: {r.pantry.join(', ')}</Muted>}
        <Muted style={{ fontSize: 12.5 }}>Estimated prices. Check the shelf.</Muted>
      </Card>

      {r.upgrades.length > 0 && (
        <Card>
          <Row style={{ justifyContent: 'space-between' }}><H3>Worth buying to level it up</H3><Muted>+{R(upTotal)}</Muted></Row>
          {r.upgrades.map((u, i) => (
            <View key={u.item + i} style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}><Text style={{ fontWeight: '700', color: c.fg }}>{u.item}</Text><Muted>{u.effect}</Muted></View>
              <Text style={{ fontWeight: '700', color: c.fg }}>+{R(u.price)}</Text>
            </View>
          ))}
        </Card>
      )}

      {r.bulk && (
        <Card>
          <H3>Bulk cooking plan</H3>
          <Info title="Storing it" text={r.bulk.storage} />
          <Info title="Reheating" text={r.bulk.reheat} />
          {!!r.bulk.tip && <Info title="Keep it interesting" text={r.bulk.tip} />}
        </Card>
      )}

      <Card>
        <H3>Ingredients <Text style={{ fontWeight: '500', color: c.muted, fontSize: 13 }}>· tap one to ask about it</Text></H3>
        {r.ingredients.map((g, i) => {
          const isOpen = open === i;
          return (
            <View key={g.name + i}>
              {i > 0 && <Divider />}
              <Pressable onPress={() => setOpen(isOpen ? null : i)} accessibilityRole="button" accessibilityState={{ expanded: isOpen }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 50, paddingVertical: 6 }}>
                <View style={{ flex: 1 }}><Text style={{ fontWeight: '700', color: c.fg, fontSize: 15 }}>{g.name}</Text><Muted>{g.amount}</Muted></View>
                <Icon name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color={c.muted} />
              </Pressable>
              {isOpen && (
                <View style={{ gap: 10, paddingBottom: 12 }}>
                  <View style={{ backgroundColor: c.surface, borderRadius: 12, padding: 12 }}>
                    <Text style={{ color: c.fg, lineHeight: 20 }}><Text style={{ fontWeight: '700' }}>What it does: </Text>{g.role}</Text>
                  </View>
                  <Row wrap>
                    <Chip label="What if I leave it out?" onPress={() => askChef(`If I leave out the ${g.name}, what happens to the taste, texture, cost and calories?`)} />
                    <Chip label="What can I swap it for?" onPress={() => askChef(`What can I swap the ${g.name} for, and how will that change the dish?`)} />
                    <Chip label="What if I double it?" onPress={() => askChef(`What happens if I double the ${g.name}?`)} />
                    <Chip label="More flavour from it" onPress={() => askChef(`How do I get the most flavour out of the ${g.name} in this dish?`)} />
                  </Row>
                </View>
              )}
            </View>
          );
        })}
      </Card>

      <Card>
        <H3>Change the taste</H3>
        {r.tweaks.map((t, i) => (
          <View key={t.goal + i} style={{ gap: 3 }}>
            {i > 0 && <Divider />}
            <Text style={{ fontWeight: '700', color: c.fg, marginTop: i > 0 ? 10 : 0 }}>{t.goal}</Text>
            <Body style={{ fontSize: 14 }}>{t.change}</Body>
            <Muted>{t.why}</Muted>
          </View>
        ))}
        <Btn small icon="chatbubble-ellipses-outline" label="Ask Chef for something else" onPress={() => setKitchenTab('chef')} />
      </Card>
    </>
  );
}

function Info({ title, text }: { title: string; text: string }) {
  const c = useColors();
  return <View style={{ gap: 2 }}><Text style={{ fontWeight: '700', color: c.fg }}>{title}</Text><Body style={{ fontSize: 14 }}>{text}</Body></View>;
}

// ---------------- Cook ----------------
function CookTab({ recipe: r }: { recipe: Recipe }) {
  const c = useColors();
  const { startTimer, askChef } = useStore();
  return (
    <>
      <Btn kind="primary" icon="play" label="Step-by-step mode" onPress={() => router.push('/cook')} />
      {r.steps.map((s, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: c.fg, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: c.bg, fontWeight: '800' }}>{i + 1}</Text>
          </View>
          <View style={{ flex: 1, gap: 8, paddingBottom: 14, borderBottomWidth: i < r.steps.length - 1 ? 1 : 0, borderBottomColor: c.line }}>
            <Text style={{ fontSize: 16, fontWeight: '600', lineHeight: 22, color: c.fg }}>{s.text}</Text>
            {!!s.why && <Text style={{ color: c.muted, lineHeight: 20 }}><Text style={{ color: c.accent, fontWeight: '800', fontSize: 12 }}>WHY  </Text>{s.why}</Text>}
            <Row wrap>
              {s.minutes ? <Chip label={`${s.minutes} min timer`} icon="timer-outline" onPress={() => startTimer(s.minutes!, `Step ${i + 1}: ${s.text.slice(0, 36)}${s.text.length > 36 ? '…' : ''}`)} /> : null}
              <Chip label="Ask about this step" icon="chatbubble-outline" onPress={() => askChef(`About step ${i + 1} ("${s.text}"): what is the most common mistake here, and how do I know I'm doing it right?`)} />
            </Row>
          </View>
        </View>
      ))}
      <Row wrap>
        <Chip label="How do I know it's done?" onPress={() => askChef('How do I know when this dish is properly cooked?')} />
        <Chip label="Something went wrong" onPress={() => askChef('Something went wrong while cooking. How do I rescue it?')} />
      </Row>
    </>
  );
}

// ---------------- Ask Chef ----------------
function ChefTab({ recipe: r }: { recipe: Recipe }) {
  const c = useColors();
  const { chat, chatBusy, askChef } = useStore();
  const starters = ['Make it spicier', 'Make it richer', 'Make it cheaper', 'Make it lighter', 'What can I add to make it more filling?'];
  return (
    <>
      {chat.length === 0 && <Callout>{`Ask me anything about this ${r.name.toLowerCase()}. Try "If I add peanut butter, what happens?" or send a photo of your pot.`}</Callout>}
      {chat.map((t, i) => {
        const me = t.role === 'user';
        return (
          <View key={i} style={{ alignItems: me ? 'flex-end' : 'flex-start', gap: 6 }}>
            {t.photoUri && <Image source={{ uri: t.photoUri }} style={{ width: 160, height: 160, borderRadius: 12 }} contentFit="cover" accessibilityLabel="Photo you sent" />}
            <View style={{ maxWidth: '88%', paddingHorizontal: 14, paddingVertical: 11, borderRadius: 18, borderBottomRightRadius: me ? 4 : 18, borderBottomLeftRadius: me ? 18 : 4, backgroundColor: me ? c.meBg : c.surface }}>
              <Text selectable style={{ color: me ? c.meFg : c.fg, fontSize: 15, lineHeight: 21 }}>{t.content.replace(/\n\[The cook attached a photo\.\]$/, '')}</Text>
            </View>
          </View>
        );
      })}
      {chatBusy && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 11, borderRadius: 18, backgroundColor: c.surface }}>
          <ActivityIndicator size="small" color={c.muted} /><Muted>Chef is thinking…</Muted>
        </View>
      )}
      {!chatBusy && <Row wrap>{starters.map(q => <Chip key={q} label={q} onPress={() => askChef(q)} />)}</Row>}
    </>
  );
}

function ChefComposer() {
  const c = useColors();
  const { chatBusy, askChef, stopChat } = useStore();
  const [text, setText] = useState('');
  const [photo, setPhoto] = useState<Photo | null>(null);
  const send = () => { const q = text; setText(''); const p = photo; setPhoto(null); askChef(q, p); };
  return (
    <>
      {photo && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Image source={{ uri: photo.uri }} style={{ width: 44, height: 44, borderRadius: 10 }} contentFit="cover" />
          <Muted style={{ flex: 1 }}>Photo attached. Say what Chef should look at.</Muted>
          <Chip label="Remove" onPress={() => setPhoto(null)} />
        </View>
      )}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {!chatBusy && <IconButton name="camera-outline" label="Send Chef a photo of your food" onPress={async () => { const p = await choosePhoto('Show Chef your food'); if (p) setPhoto(p); }} />}
        <Input style={{ flex: 1, borderRadius: 22 }} value={text} onChangeText={setText} editable={!chatBusy}
          placeholder={photo ? 'e.g. Is this browned enough?' : 'If I add…, what happens?'} returnKeyType="send" onSubmitEditing={send} />
        {chatBusy
          ? <IconButton name="stop" label="Stop the answer" onPress={stopChat} />
          : <Pressable accessibilityRole="button" accessibilityLabel="Send" onPress={send}
              style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="arrow-up" color={c.accentInk} />
            </Pressable>}
      </View>
    </>
  );
}
