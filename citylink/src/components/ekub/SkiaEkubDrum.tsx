import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import {
  Canvas,
  Group,
  Text as SkiaText,
  LinearGradient,
  vec,
  Rect,
  Skia,
} from '@shopify/react-native-skia';
import Animated, {
  useSharedValue,
  useDerivedValue,
  withTiming,
  Easing,
  runOnJS,
  withSequence,
  FadeIn,
} from 'react-native-reanimated';
import { Fonts, DarkColors as C } from '../../theme';

const { width } = Dimensions.get('window');
const DRUM_WIDTH = 280;
const DRUM_HEIGHT = 320;

interface SkiaEkubDrumProps {
  members: string[];
  winnerIndex: number;
  onFinished?: () => void;
  isSpinning: boolean;
}

export const SkiaEkubDrum: React.FC<SkiaEkubDrumProps> = ({
  members,
  winnerIndex,
  onFinished,
  isSpinning,
}) => {
  const rotation = useSharedValue(0);
  const [displayWinner, setDisplayWinner] = React.useState(false);

  // Use Skia Typeface for high-performance text
  const font = React.useMemo(() => {
    // @ts-ignore
    const typeface = Skia.Typeface.makeFromName('Inter', Skia.FontStyle.Bold);
    // @ts-ignore
    return typeface ? new Skia.Font(typeface, 14) : null;
  }, []);

  React.useEffect(() => {
    if (isSpinning) {
      setDisplayWinner(false);
      rotation.value = 0;

      const totalSpins = 15; // 15 full rotations
      const targetRotation = totalSpins + winnerIndex / members.length;

      rotation.value = withSequence(
        // Ramp up
        withTiming(targetRotation * 0.8, {
          duration: 3500,
          easing: Easing.in(Easing.quad),
        }),
        // Land precisely
        withTiming(
          targetRotation,
          {
            duration: 2500,
            easing: Easing.out(Easing.back(1.2)),
          },
          (isDone) => {
            if (isDone) {
              runOnJS(setDisplayWinner)(true);
              if (onFinished) runOnJS(onFinished)();
            }
          }
        )
      );
    } else {
      rotation.value = 0;
    }
  }, [isSpinning, winnerIndex, members.length]);

  return (
    <View style={styles.container}>
      <View style={styles.drumContainer}>
        {/* The Skia Canvas */}
        <Canvas style={{ width: DRUM_WIDTH, height: DRUM_HEIGHT }}>
          {/* Drum Background / Body */}
          <Rect x={40} y={0} width={DRUM_WIDTH - 80} height={DRUM_HEIGHT} color={C.surface}>
            <LinearGradient
              start={vec(40, 0)}
              end={vec(DRUM_WIDTH - 40, 0)}
              colors={['#1a1a1a', '#333333', '#1a1a1a']}
            />
          </Rect>

          {/* Members Mapping */}
          {members.map((name, index) => (
            <MemberItem
              key={index}
              index={index}
              name={name}
              total={members.length}
              rotation={rotation}
              font={font}
            />
          ))}

          {/* Glass Overlay / Lighting Highlights */}
          <Rect x={40} y={0} width={DRUM_WIDTH - 80} height={DRUM_HEIGHT} opacity={0.3}>
            <LinearGradient
              start={vec(40, 0)}
              end={vec(40, DRUM_HEIGHT)}
              colors={['#000', 'transparent', 'transparent', '#000']}
              positions={[0, 0.2, 0.8, 1]}
            />
          </Rect>

          {/* Center Highlight */}
          <Rect x={40} y={DRUM_HEIGHT / 2 - 25} width={DRUM_WIDTH - 80} height={50} opacity={0.1}>
            <LinearGradient
              start={vec(40, 0)}
              end={vec(40, 50)}
              colors={['transparent', '#fff', 'transparent']}
            />
          </Rect>
        </Canvas>

        {/* Physical-looking Frame Overlay (Using standard View for Glassmorphism) */}
        <View style={styles.frameLeft} />
        <View style={styles.frameRight} />
        <View style={styles.indicatorContainer}>
          <View style={styles.indicator} />
        </View>
      </View>

      {displayWinner && (
        <Animated.View entering={FadeIn.duration(800)} style={styles.winnerPopup}>
          <Text style={styles.winnerText}>CONGRATULATIONS</Text>
          <Text style={styles.winnerName}>{members[winnerIndex]}</Text>
          <View style={styles.winnerBadge}>
            <Text style={styles.badgeText}>EKUB WINNER</Text>
          </View>
        </Animated.View>
      )}
    </View>
  );
};

const MemberItem = ({ index, name, total, rotation, font }: any) => {
  const itemRotation = useDerivedValue(() => {
    // Current angle in the cylinder (0 to 1)
    const offset = index / total;
    const currentPos = (rotation.value + offset) % 1;

    // Convert to radians for perspective calculation
    const angle = currentPos * 2 * Math.PI;

    // Calculate Y position (-1 to 1)
    const y = -Math.sin(angle);
    // Calculate Z depth (0 to 1, where 1 is closest)
    const z = Math.cos(angle);

    return { y, z, angle };
  });

  const opacity = useDerivedValue(() => {
    // Only show if it's on the "front" of the drum
    return itemRotation.value.z > 0 ? itemRotation.value.z ** 2 : 0;
  });

  const scale = useDerivedValue(() => {
    return 0.8 + itemRotation.value.z * 0.4;
  });

  const translateY = useDerivedValue(() => {
    return DRUM_HEIGHT / 2 + itemRotation.value.y * (DRUM_HEIGHT / 2 - 40);
  });

  if (!font) return null;

  return (
    <Group opacity={opacity}>
      <SkiaText
        x={DRUM_WIDTH / 2 - name.length * 4} // Crude centering
        y={translateY}
        text={name}
        font={font}
        color="#fff"
      />
    </Group>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  drumContainer: {
    width: DRUM_WIDTH,
    height: DRUM_HEIGHT,
    backgroundColor: '#000',
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    position: 'relative',
  },
  frameLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 40,
    backgroundColor: '#111',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.05)',
  },
  frameRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 40,
    backgroundColor: '#111',
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.05)',
  },
  indicatorContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 25,
    justifyContent: 'center',
    zIndex: 20,
  },
  indicator: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderTopWidth: 10,
    borderBottomWidth: 10,
    borderRightWidth: 15,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderRightColor: C.primary,
  },
  winnerPopup: {
    marginTop: 40,
    alignItems: 'center',
  },
  winnerText: {
    color: C.primary,
    fontSize: 12,
    fontFamily: Fonts.black,
    letterSpacing: 4,
    opacity: 0.8,
  },
  winnerName: {
    color: '#FFF',
    fontSize: 42,
    fontFamily: Fonts.headline,
    marginTop: 4,
    textAlign: 'center',
  },
  winnerBadge: {
    backgroundColor: C.primary + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.primary + '40',
    marginTop: 16,
  },
  badgeText: {
    color: C.primary,
    fontSize: 10,
    fontFamily: Fonts.bold,
    letterSpacing: 1,
  },
});
