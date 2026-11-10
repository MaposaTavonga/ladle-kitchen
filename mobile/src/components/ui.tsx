// Building blocks shared by every screen.
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useEffect, useState, type ComponentProps, type ReactNode } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput,
  View, type ScrollViewInstance, type StyleProp, type TextInputProps, type TextStyle, type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '@/lib/store';
import { radius, space, useColors } from '@/lib/theme';
import { fmtTime } from '@/lib/util';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export function Icon({ name, size = 20, color }: { name: IconName; size?: number; color?: string }) {
  const c = useColors();
  return <Ionicons name={name} size={size} color={color ?? c.fg} />;
}

// ---------- text ----------
type TP = { children: ReactNode; style?: StyleProp<TextStyle>; numberOfLines?: number };
export function H1({ children, style }: TP) { const c = useColors(); return <Text style={[{ fontSize: 28, lineHeight: 33, fontWeight: '800', color: c.fg, letterSpacing: -0.4 }, style]}>{children}</Text>; }
export function H2({ children, style }: TP) { const c = useColors(); return <Text style={[{ fontSize: 21, lineHeight: 26, fontWeight: '800', color: c.fg, letterSpacing: -0.2 }, style]}>{children}</Text>; }
export function H3({ children, style }: TP) { const c = useColors(); return <Text style={[{ fontSize: 16.5, fontWeight: '700', color: c.fg }, style]}>{children}</Text>; }
export function Body({ children, style, numberOfLines }: TP) { const c = useColors(); return <Text numberOfLines={numberOfLines} style={[{ fontSize: 15, lineHeight: 22, color: c.fg }, style]}>{children}</Text>; }
export function Muted({ children, style, numberOfLines }: TP) { const c = useColors(); return <Text numberOfLines={numberOfLines} style={[{ fontSize: 13.5, lineHeight: 19, color: c.muted }, style]}>{children}</Text>; }
export function Eyebrow({ children, style }: TP) { const c = useColors(); return <Text style={[{ fontSize: 12, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', color: c.muted }, style]}>{children}</Text>; }

// ---------- screen shell ----------
type ScreenProps = {
  title?: string;
  subtitle?: string;
  back?: boolean;
  onBack?: () => void;
  right?: ReactNode;
  header?: ReactNode; // replaces the default title header
  below?: ReactNode; // under the header (e.g. tabs)
  footer?: ReactNode;
  scroll?: boolean;
  scrollRef?: React.RefObject<ScrollViewInstance | null>;
  children: ReactNode;
};

export function Screen({ title, subtitle, back, onBack, right, header, below, footer, scroll = true, scrollRef, children }: ScreenProps) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const goBack = onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/')));
  const body = <View style={{ gap: space.lg, paddingHorizontal: space.lg, paddingTop: space.lg, paddingBottom: space.xl + (footer ? 0 : insets.bottom) }}>{children}</View>;
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ paddingTop: insets.top, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.line, backgroundColor: c.bg }}>
        {header ?? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.sm, minHeight: 56 }}>
            {back && <IconButton name="chevron-back" label="Back" onPress={goBack} />}
            <View style={{ flex: 1, minWidth: 0 }}>
              {!!title && <Text numberOfLines={1} style={{ fontSize: 18, fontWeight: '800', color: c.fg }}>{title}</Text>}
              {!!subtitle && <Muted numberOfLines={1} style={{ fontSize: 12.5 }}>{subtitle}</Muted>}
            </View>
            {right}
          </View>
        )}
        {below}
      </View>
      {scroll ? <ScrollView ref={scrollRef} keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1 }}>{body}</ScrollView> : <View style={{ flex: 1 }}>{body}</View>}
      {footer && (
        <View style={{ borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.line, paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: Math.max(insets.bottom, space.md), gap: space.sm, backgroundColor: c.bg }}>
          {footer}
        </View>
      )}
      <Toast />
    </KeyboardAvoidingView>
  );
}

export function IconButton({ name, label, onPress, filled }: { name: IconName; label: string; onPress: () => void; filled?: boolean }) {
  const c = useColors();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={6}
      style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: filled ? 0 : 1, borderColor: c.line, backgroundColor: filled ? c.accent : pressed ? c.surface : c.bg })}>
      <Icon name={name} color={filled ? c.accentInk : c.fg} />
    </Pressable>
  );
}

// ---------- buttons ----------
type BtnProps = { label: string; onPress: () => void; kind?: 'primary' | 'default'; icon?: IconName; disabled?: boolean; small?: boolean; loading?: boolean; style?: StyleProp<ViewStyle> };
export function Btn({ label, onPress, kind = 'default', icon, disabled, small, loading, style }: BtnProps) {
  const c = useColors();
  const primary = kind === 'primary';
  const fg = primary ? c.accentInk : c.fg;
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: !!disabled }} disabled={disabled || loading} onPress={onPress}
      style={({ pressed }) => [{
        minHeight: small ? 40 : 50, paddingHorizontal: small ? 12 : 16, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        backgroundColor: primary ? c.accent : pressed ? c.surface : c.bg, borderWidth: primary ? 0 : 1, borderColor: c.line, opacity: disabled ? 0.45 : pressed && primary ? 0.85 : 1,
      }, style]}>
      {loading ? <ActivityIndicator color={fg} /> : icon ? <Icon name={icon} size={small ? 17 : 19} color={fg} /> : null}
      <Text style={{ color: fg, fontWeight: '700', fontSize: small ? 14 : 15.5 }}>{label}</Text>
    </Pressable>
  );
}

export function Row({ children, gap = space.sm, wrap, style }: { children: ReactNode; gap?: number; wrap?: boolean; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', gap, flexWrap: wrap ? 'wrap' : 'nowrap', alignItems: 'center' }, style]}>{children}</View>;
}

/** Two equal columns. */
export function Cols({ children }: { children: ReactNode }) {
  return <View style={{ flexDirection: 'row', gap: space.sm }}>{Array.isArray(children) ? children.map((ch, i) => <View key={i} style={{ flex: 1 }}>{ch}</View>) : children}</View>;
}

// ---------- chips ----------
export function Chip({ label, selected, onPress, icon }: { label: string; selected?: boolean; onPress: () => void; icon?: IconName }) {
  const c = useColors();
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: !!selected }} onPress={onPress}
      style={({ pressed }) => ({ minHeight: 40, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 6,
        borderColor: selected ? c.fg : c.line, backgroundColor: selected ? c.fg : pressed ? c.surface : c.bg })}>
      <Text style={{ fontSize: 14, fontWeight: '600', color: selected ? c.bg : c.fg }}>{label}</Text>
      {icon && <Icon name={icon} size={14} color={selected ? c.bg : c.muted} />}
    </Pressable>
  );
}

export function ChipGroup({ options, value, onChange }: { options: string[]; value: string | string[]; onChange: (v: any) => void }) {
  const multi = Array.isArray(value);
  return (
    <Row wrap>
      {options.map(o => {
        const on = multi ? value.includes(o) : value === o;
        return <Chip key={o} label={o} selected={on} onPress={() => onChange(multi ? (on ? value.filter(x => x !== o) : [...value, o]) : o)} />;
      })}
    </Row>
  );
}

// ---------- form fields ----------
export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <H3 style={{ fontSize: 15 }}>{label}</H3>
      {!!hint && <Muted style={{ marginTop: -4 }}>{hint}</Muted>}
      {children}
    </View>
  );
}

export function Input(props: TextInputProps & { style?: StyleProp<TextStyle> }) {
  const c = useColors();
  return (
    <TextInput placeholderTextColor={c.muted} {...props}
      style={[{ minWidth: 0, minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: c.line, backgroundColor: c.bg, color: c.fg, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15.5 },
        props.multiline ? { minHeight: 84, textAlignVertical: 'top' } : null, props.style]} />
  );
}

export function Toggle({ title, desc, value, onChange }: { title: string; desc?: string; value: boolean; onChange: (v: boolean) => void }) {
  const c = useColors();
  return (
    <Pressable onPress={() => onChange(!value)} accessibilityRole="switch" accessibilityState={{ checked: value }}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderWidth: 1, borderColor: c.line, borderRadius: radius.md }}>
      <View style={{ flex: 1 }}>
        <H3 style={{ fontSize: 15 }}>{title}</H3>
        {!!desc && <Muted>{desc}</Muted>}
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: c.accent, false: c.line }} thumbColor="#FFFFFF" />
    </Pressable>
  );
}

// ---------- containers ----------
export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const c = useColors();
  return <View style={[{ borderWidth: 1, borderColor: c.line, borderRadius: radius.lg, padding: space.lg, gap: space.md }, style]}>{children}</View>;
}
export function Surface({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const c = useColors();
  return <View style={[{ backgroundColor: c.surface, borderRadius: radius.lg, padding: space.lg, gap: 8 }, style]}>{children}</View>;
}

export function Pill({ text, icon, strong }: { text: string; icon?: IconName; strong?: boolean }) {
  const c = useColors();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill, backgroundColor: c.surface }}>
      {icon && <Icon name={icon} size={14} color={c.fg} />}
      <Text style={{ fontSize: 13, fontWeight: strong ? '700' : '500', color: c.fg, fontVariant: ['tabular-nums'] }}>{text}</Text>
    </View>
  );
}

export function Tag({ text }: { text: string }) {
  const c = useColors();
  return <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: c.accentSoft, alignSelf: 'flex-start' }}><Text style={{ fontSize: 12, fontWeight: '700', color: c.accentSoftFg }}>{text}</Text></View>;
}

export function Meter({ pct, over }: { pct: number; over?: boolean }) {
  const c = useColors();
  return (
    <View style={{ height: 10, borderRadius: 5, backgroundColor: c.line, overflow: 'hidden' }}>
      <View style={{ width: `${Math.max(0, Math.min(100, pct))}%`, height: '100%', borderRadius: 5, backgroundColor: over ? c.accent : c.good }} />
    </View>
  );
}

export function Callout({ kind = 'note', icon, children }: { kind?: 'note' | 'warn' | 'good'; icon?: IconName; children: ReactNode }) {
  const c = useColors();
  const bg = kind === 'warn' ? c.warnBg : kind === 'good' ? c.goodSoft : c.accentSoft;
  const fg = kind === 'warn' ? c.warnFg : kind === 'good' ? c.good : c.accentSoftFg;
  return (
    <View style={{ flexDirection: 'row', gap: 10, padding: 14, borderRadius: radius.md, backgroundColor: bg }}>
      <Icon name={icon ?? (kind === 'warn' ? 'warning-outline' : kind === 'good' ? 'leaf-outline' : 'restaurant-outline')} size={20} color={fg} />
      <Text style={{ flex: 1, fontSize: 14, lineHeight: 20, color: fg }}>{children}</Text>
    </View>
  );
}

export function Segmented<T extends string>({ options, value, onChange }: { options: { key: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  const c = useColors();
  return (
    <View style={{ flexDirection: 'row', gap: 4, padding: 4, borderRadius: 12, backgroundColor: c.surface, marginHorizontal: space.lg, marginBottom: space.sm }}>
      {options.map(o => {
        const on = o.key === value;
        return (
          <Pressable key={o.key} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => onChange(o.key)}
            style={{ flex: 1, minHeight: 40, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? c.bg : 'transparent' }}>
            <Text style={{ fontWeight: '700', fontSize: 14, color: on ? c.fg : c.muted }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Divider() {
  const c = useColors();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.line }} />;
}

/** Spinning pot + message, for AI requests in progress. */
export function Loading({ title, message, onStop }: { title: string; message: string; onStop?: () => void }) {
  const c = useColors();
  return (
    <View style={{ alignItems: 'center', gap: 14, paddingVertical: 56 }}>
      <ActivityIndicator size="large" color={c.accent} />
      <H2 style={{ textAlign: 'center' }}>{title}</H2>
      <Muted style={{ textAlign: 'center', maxWidth: 300 }}>{message}</Muted>
      {onStop && <Btn small label="Stop" icon="stop" onPress={onStop} />}
    </View>
  );
}

// ---------- timer + toast ----------
export function TimerBanner() {
  const c = useColors();
  const { timer, stopTimer } = useStore();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!timer) return;
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, [timer]);
  if (!timer) return null;
  const left = Math.max(0, Math.round((timer.endsAt - now) / 1000));
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, backgroundColor: c.accentSoft }}>
      <Icon name="timer-outline" color={c.accentSoftFg} />
      <Text numberOfLines={1} style={{ flex: 1, color: c.accentSoftFg, fontWeight: '600' }}>{timer.label}</Text>
      <Text style={{ color: c.accentSoftFg, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{fmtTime(left)}</Text>
      <Pressable onPress={stopTimer} hitSlop={8} accessibilityRole="button"><Text style={{ color: c.accentSoftFg, fontWeight: '800' }}>Stop</Text></Pressable>
    </View>
  );
}

function Toast() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { toastMsg } = useStore();
  if (!toastMsg) return null;
  return (
    <View pointerEvents="none" accessibilityLiveRegion="polite" style={{ position: 'absolute', left: 16, right: 16, bottom: insets.bottom + 90, alignItems: 'center' }}>
      <View style={{ backgroundColor: c.fg, paddingHorizontal: 16, paddingVertical: 11, borderRadius: 12, maxWidth: 420 }}>
        <Text style={{ color: c.bg, fontWeight: '600', fontSize: 14 }}>{toastMsg}</Text>
      </View>
    </View>
  );
}
