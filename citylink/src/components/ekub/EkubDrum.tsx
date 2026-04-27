import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  Easing,
  runOnJS,
  withSequence,
  FadeIn,
} from 'react-native-reanimated';
import { Fonts, Colors } from '../../theme';
import { GlassView } from '../GlassView';

const { width } = Dimensions.get('window');

interface EkubDrumProps {
  members: string[];
  winnerIndex: number;
  onFinished?: () => void;
  isSpinning: boolean;
}

export const EkubDrum: React.FC<EkubDrumProps> = ({
  members,
  winnerIndex,
  onFinished,
  isSpinning,
}) => {
  const rotation = useSharedValue(0);
  const [displayWinner, setDisplayWinner] = useState(false);
  const [prevIsSpinning, setPrevIsSpinning] = useState(isSpinning);

  useEffect(() => {
    if (isSpinning !== prevIsSpinning) {
      setPrevIsSpinning(isSpinning);
      setDisplayWinner(false);
    }
  }, [isSpinning, prevIsSpinning]);

  useEffect(() => {
    if (isSpinning) {
      // 1. Initial fast spin
      rotation.value = 0;
      rotation.value = withSequence(
        // Fast spin for 3 seconds
        withTiming(10, { duration: 3000, easing: Easing.inOut(Easing.quad) }),
        // Slow down to land on winner
        // Each index is 360 / members.length
        withTiming(
          20 + winnerIndex / members.length,
          {
            duration: 2000,
            easing: Easing.out(Easing.back(1.5)),
          },
          (finished) => {
            if (finished) {
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

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotation.value * 360}deg` }],
    };
  });

  return (
    <View style={styles.container}>
      <GlassView intensity={20} style={styles.drumOuter}>
        <Animated.View style={[styles.drumInner, animatedStyle]}>
          {members.map((name, i) => {
            const angle = (i / members.length) * 2 * Math.PI;
            const x = Math.cos(angle) * 100;
            const y = Math.sin(angle) * 100;

            return (
              <View
                key={i}
                style={[
                  styles.memberSlot,
                  {
                    left: 120 + x,
                    top: 120 + y,
                    transform: [{ rotate: `${(i / members.length) * 360 + 90}deg` }],
                  },
                ]}
              >
                <Text style={styles.memberName} numberOfLines={1}>
                  {name}
                </Text>
              </View>
            );
          })}
        </Animated.View>

        {/* Needle/Indicator */}
        <View style={styles.indicator} />
      </GlassView>

      {displayWinner && (
        <Animated.View entering={FadeIn.delay(500)} style={styles.winnerPopup}>
          <Text style={styles.winnerText}>WINNER</Text>
          <Text style={styles.winnerName}>{members[winnerIndex]}</Text>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 40,
  },
  drumOuter: {
    width: 280,
    height: 280,
    borderRadius: 140,
    borderWidth: 8,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  drumInner: {
    width: 250,
    height: 250,
    borderRadius: 125,
    position: 'relative',
  },
  memberSlot: {
    position: 'absolute',
    width: 80,
    alignItems: 'center',
  },
  memberName: {
    color: '#FFF',
    fontSize: 10,
    fontFamily: Fonts.bold,
    textAlign: 'center',
  },
  indicator: {
    position: 'absolute',
    top: -15,
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 15,
    borderRightWidth: 15,
    borderTopWidth: 30,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#22C97A', // Primary Green
    zIndex: 10,
  },
  winnerPopup: {
    marginTop: 30,
    alignItems: 'center',
  },
  winnerText: {
    color: '#22C97A',
    fontSize: 14,
    fontFamily: Fonts.black,
    letterSpacing: 4,
  },
  winnerName: {
    color: '#FFF',
    fontSize: 32,
    fontFamily: Fonts.headline,
    marginTop: 8,
  },
});
