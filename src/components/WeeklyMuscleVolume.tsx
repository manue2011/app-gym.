import { useState } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';

import { muscleLabel } from '../data/muscles';
import type { WeeklyMuscleSets } from '../db/repositories/records';
import { MIN_WEEKLY_SETS } from '../science/rules';
import { useColors } from '../theme';
import { Card, Chip, Muted, Title } from './ui';
import { WhyLink } from './WhyLink';

const weekLabel = (week: string) => {
  const [, m, d] = week.split('-');
  return `${Number(d)}/${Number(m)}`;
};

/** Sets actually done per week for one muscle, against the evidence-based minimum. */
export function WeeklyMuscleVolume({ data }: { data: WeeklyMuscleSets[] }) {
  const c = useColors();
  const { width } = useWindowDimensions();
  const [muscle, setMuscle] = useState<string | null>(null);

  if (data.length === 0) {
    return (
      <Card>
        <Title>Series por músculo</Title>
        <Muted>Aún no hay series registradas en las últimas semanas.</Muted>
      </Card>
    );
  }

  const selected = data.find((d) => d.muscle === muscle) ?? data[0];
  const current = selected.weeks[selected.weeks.length - 1].sets;
  const max = Math.max(MIN_WEEKLY_SETS + 4, ...selected.weeks.map((w) => w.sets));
  const chartWidth = width - 32 - 28 - 36;
  const barWidth = Math.max(14, chartWidth / selected.weeks.length - 14);

  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}>
        {data.map((d) => (
          <Chip
            key={d.muscle}
            label={muscleLabel(d.muscle)}
            selected={d.muscle === selected.muscle}
            onPress={() => setMuscle(d.muscle)}
          />
        ))}
      </ScrollView>
      <Card>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Title>{muscleLabel(selected.muscle)}</Title>
          </View>
          <WhyLink rule="volume" />
        </View>
        <Text style={[styles.big, { color: current >= MIN_WEEKLY_SETS ? c.text : c.primary }]}>
          {current} series esta semana
        </Text>
        <BarChart
          key={selected.muscle}
          data={selected.weeks.map((w) => ({
            value: w.sets,
            label: weekLabel(w.week),
            frontColor: w.sets >= MIN_WEEKLY_SETS ? c.primary : c.muted,
            topLabelComponent: () => (
              <Text style={{ color: c.text, fontSize: 11, marginBottom: 2 }}>{w.sets || ''}</Text>
            ),
          }))}
          width={chartWidth}
          height={180}
          barWidth={barWidth}
          spacing={14}
          initialSpacing={10}
          barBorderTopLeftRadius={6}
          barBorderTopRightRadius={6}
          maxValue={max}
          noOfSections={4}
          yAxisLabelWidth={28}
          yAxisTextStyle={{ color: c.muted, fontSize: 11 }}
          xAxisLabelTextStyle={{ color: c.muted, fontSize: 10 }}
          yAxisColor={c.border}
          xAxisColor={c.border}
          rulesColor={c.border}
          rulesType="solid"
          showReferenceLine1
          referenceLine1Position={MIN_WEEKLY_SETS}
          referenceLine1Config={{ color: c.primary, dashWidth: 6, dashGap: 4, thickness: 1.5 }}
          disableScroll
        />
        <Muted>
          Series registradas por semana (empieza el lunes) en ejercicios donde este es el músculo
          principal. La línea marca {MIN_WEEKLY_SETS} series, el mínimo recomendado para ganar
          músculo.
        </Muted>
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  header: { flexDirection: 'row', alignItems: 'center' },
  big: { fontSize: 20, fontWeight: '700' },
});
