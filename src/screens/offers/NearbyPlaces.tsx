import { useState } from 'react';
import { Linking, View } from 'react-native';

import { Button, Chip, IconButton, Tile, Txt, type IconName } from '@/components/kit';
import { RowDir, Rule, Spacing, themed } from '@/constants/theme';
import { formatSar } from '@/domain/budget';
import { DEFAULT_RADIUS_KM, directionsUrl, type NearbyPlace } from '@/domain/places';
import { judgeTrip } from '@/domain/trip';
import { useStore } from '@/store/store';
import { currentPosition } from '@/sync/location';
import { findPlaces, isSyncConfigured } from '@/sync/sync';

const DIRECTIONS_ICON: IconName = { ios: 'arrow.triangle.turn.up.right.diamond', android: 'directions', web: 'directions' };
const KINDS = ['سوبر ماركت', 'خضار وفاكهة', 'سوق جملة'];
const RADII_KM = [3, 5, DEFAULT_RADIUS_KM];

type SearchState =
  | { status: 'idle' }
  | { status: 'busy' }
  | { status: 'done'; places: readonly NearbyPlace[] }
  | { status: 'failed'; message: string };

function openLine(place: NearbyPlace): string {
  return place.openNow === null ? 'المواعيد مش معروفة' : place.openNow ? 'فاتح دلوقتي' : 'قافل دلوقتي';
}

/** "Search around me": shops near the phone, how far each is in traffic, and whether it is open. */
export function NearbyPlaces() {
  const car = useStore((state) => state.car);
  const styles = useStyles();
  const [kind, setKind] = useState(KINDS[0]);
  const [radiusKm, setRadiusKm] = useState(DEFAULT_RADIUS_KM);
  const [state, setState] = useState<SearchState>({ status: 'idle' });

  if (!isSyncConfigured()) {
    return (
      <Tile>
        <Txt kind="title">دوّر حواليا</Txt>
        <Txt>البحث عن الأماكن القريبة بيشتغل من خادم البيت وخرائط جوجل. هيتفعّل لما يتضاف مفتاح Supabase ومفتاح خرائط جوجل.</Txt>
      </Tile>
    );
  }

  const isBusy = state.status === 'busy';
  const handleSearch = async (): Promise<void> => {
    if (isBusy) return;
    setState({ status: 'busy' });
    try {
      const origin = await currentPosition();
      setState({ status: 'done', places: await findPlaces(origin, radiusKm, kind) });
    } catch (caught: unknown) {
      setState({ status: 'failed', message: caught instanceof Error ? caught.message : 'حصل خطأ غير متوقع' });
    }
  };

  /** The round trip to this place costed with the family's own fuel and time figures. */
  const tripLine = (place: NearbyPlace): string => {
    if (place.km === null) return 'المسافة مش معروفة';
    const minutes = place.minutes === null ? '' : `، ${place.minutes} دقيقة بالزحمة`;
    if (car === null) return `${formatSar(place.km)} كم${minutes}`;
    const trip = judgeTrip({ saving: 0, extraKm: place.km * 2, extraMinutes: (place.minutes ?? 0) * 2 }, car);
    return `${formatSar(place.km)} كم${minutes}. المشوار رايح جاي بيكلّف ${formatSar(trip.fuelCost + trip.timeCost)} ريال`;
  };

  return (
    <Tile>
      <Txt kind="title">دوّر حواليا</Txt>
      <View style={styles.chips}>
        {KINDS.map((each) => (
          <Chip key={each} label={each} selected={kind === each} onPress={() => setKind(each)} />
        ))}
      </View>
      <View style={styles.chips}>
        {RADII_KM.map((each) => (
          <Chip key={each} label={`${each} كم`} selected={radiusKm === each} onPress={() => setRadiusKm(each)} />
        ))}
      </View>
      <Button kind="primary" label={isBusy ? 'بيدوّر…' : 'دوّر حواليا'} disabled={isBusy} onPress={() => void handleSearch()} />
      <Txt kind="label">موقعك بيتاخد وقت البحث بس، وما بيتخزنش.</Txt>

      {state.status === 'failed' && (
        <Txt kind="label" tone="over">
          {state.message}
        </Txt>
      )}
      {state.status === 'done' && state.places.length === 0 && <Txt>ما لقيناش أماكن في المحيط ده. كبّر المحيط وجرّب تاني.</Txt>}
      {state.status === 'done' &&
        state.places.map((place) => (
          <View key={place.placeId} style={styles.place}>
            <View style={styles.grow}>
              <Txt kind="strong">{place.name}</Txt>
              <Txt kind="label" tone={place.openNow === false ? 'over' : undefined}>
                {openLine(place)}
              </Txt>
              <Txt kind="label">{tripLine(place)}</Txt>
            </View>
            <IconButton
              icon={DIRECTIONS_ICON}
              label={`وصّلني لـ ${place.name}`}
              onPress={() => void Linking.openURL(directionsUrl(place))}
            />
          </View>
        ))}
      {state.status === 'done' && state.places.length > 0 && <Txt kind="label">المصدر: Google Maps</Txt>}
    </Tile>
  );
}

const useStyles = themed((c) => ({
  chips: { flexDirection: RowDir, flexWrap: 'wrap', gap: Spacing.two },
  place: {
    flexDirection: RowDir,
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderBottomWidth: Rule.hair,
    borderBottomColor: c.rule,
  },
  grow: { flex: 1 },
}));
