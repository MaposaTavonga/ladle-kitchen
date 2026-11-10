// Three meal ideas to pick from.
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { View } from 'react-native';
import { Body, Btn, Callout, Card, Eyebrow, H2, H3, Loading, Muted, Pill, Row, Screen } from '@/components/ui';
import { portions } from '@/lib/prompts';
import { useStore } from '@/lib/store';
import { radius, useColors } from '@/lib/theme';
import { num, R } from '@/lib/util';

export default function Ideas() {
  const c = useColors();
  const { req, ideas, job, runIdeas, runRecipe, cancelJob } = useStore();
  if (!req) return null;

  const loading = job?.kind === 'ideas' && !job.error;
  const error = job?.kind === 'ideas' ? job.error : undefined;
  const bulk = req.bulk ? ` · bulk, ${portions(req)} portions` : '';
  const people = Math.max(1, Math.round(num(req.people, 1)));
  const subtitle = req.mode === 'budget'
    ? `R${num(req.budget)} · ${people} ${people > 1 ? 'people' : 'person'}${bulk}`
    : req.mode === 'dish' ? `${req.identified?.dish || req.want.trim() || 'Your dish'}${bulk}`
    : `${req.have.length} ingredients · +R${num(req.budget)} extra${bulk}`;

  const back = () => { cancelJob(); router.back(); };

  if (loading) {
    const fromPhoto = req.mode === 'dish' && req.photo && !req.identified;
    return (
      <Screen title="Ladle" back onBack={back}>
        <Loading title={job!.label} onStop={back}
          message={fromPhoto ? 'Working out what the dish in your photo is, then pricing 3 ways to make it at home.' : 'Matching your budget, mood and taste profile.'} />
      </Screen>
    );
  }
  if (error) {
    return (
      <Screen title="Ladle" back onBack={back}>
        <Callout kind="warn">{error}</Callout>
        <Btn kind="primary" icon="refresh" label="Try again" onPress={() => runIdeas(true)} />
      </Screen>
    );
  }

  const pick = (i: number) => { runRecipe(ideas[i]); router.push('/kitchen'); };

  return (
    <Screen title={req.mode === 'dish' ? 'Pick a version' : 'Pick a meal'} subtitle={subtitle} back onBack={back}>
      {req.mode === 'dish' && req.identified && (
        <>
          <View style={{ flexDirection: 'row', gap: 12, padding: 12, borderWidth: 1, borderColor: c.line, borderRadius: radius.lg }}>
            {req.photo && <Image source={{ uri: req.photo.uri }} style={{ width: 76, height: 76, borderRadius: 12 }} contentFit="cover" accessibilityLabel="Your photo" />}
            <View style={{ flex: 1, gap: 3 }}>
              <Eyebrow>Looks like</Eyebrow>
              <H3 style={{ fontSize: 18 }}>{req.identified.dish}</H3>
              <Muted>{req.identified.description}</Muted>
            </View>
          </View>
          {!!req.identified.conflicts && <Callout kind="warn">{req.identified.conflicts} The versions below work around it.</Callout>}
          <Muted>Not right? Go back, add a note, and try again.</Muted>
        </>
      )}

      {ideas.map((x, i) => (
        <Card key={x.name + i}>
          <H2>{x.name}</H2>
          <Body>{x.pitch}</Body>
          <Row wrap gap={6}>
            <Pill strong text={`${R(x.estCost)}${req.mode === 'pantry' ? ' extra' : ' total'}`} />
            {x.costPerPortion > 0 && <Pill text={`${R(x.costPerPortion)} a portion`} />}
            <Pill icon="flame-outline" text={`${x.kcalPerServing} kcal`} />
            <Pill icon="time-outline" text={`${x.minutes} min`} />
          </Row>
          {x.keyIngredients.length > 0 && <Muted>{x.keyIngredients.join(' · ')}</Muted>}
          <Btn kind="primary" label="Cook this" onPress={() => pick(i)} />
        </Card>
      ))}

      <Btn icon="refresh" label={req.mode === 'dish' ? 'Show me 3 other ways' : 'Show me 3 different meals'} onPress={() => runIdeas(false)} />
      <Muted>{"Prices are estimates for South African supermarkets. Check your store's shelf price."}</Muted>
    </Screen>
  );
}
